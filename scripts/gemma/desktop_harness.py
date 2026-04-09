from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _common import (
    DESKTOP_FALLBACK_QUANTIZATION,
    DESKTOP_MODEL_ID,
    DESKTOP_QUANTIZATION,
    DESKTOP_SOURCE_DIR,
    PROJECT_ROOT,
    require_exact_desktop_model_id,
)
from desktop_pack import (
    build_summary_evidence,
    format_answer_evidence,
    load_pack,
    retrieve_grounded_matches,
)
from desktop_runtime import (
    DesktopGemmaRunner,
    DesktopRuntimeConfig,
    build_doctor_payload,
    create_prompt,
)

DEFAULT_PACK_PATH = (
    PROJECT_ROOT
    / "test"
    / "fixtures"
    / "lecture-pack.fixture.json"
)

UNSUPPORTED_ANSWER = (
    "This question is not supported by the current local lecture evidence. "
    "Try asking about a term, slide topic, or transcript point that appears in the lecture pack."
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Desktop-local Gemma harness for google/gemma-4-E4B-it using repo-local weights."
    )
    parser.add_argument("--model-id", default=DESKTOP_MODEL_ID)

    subparsers = parser.add_subparsers(dest="command", required=True)

    doctor = subparsers.add_parser("doctor", help="Inspect local desktop Gemma runtime readiness.")
    doctor.add_argument("--json", action="store_true", help="Print machine-readable JSON output.")

    answer = subparsers.add_parser("answer", help="Ask a grounded question from a lecture pack.")
    _add_shared_generation_arguments(answer)
    answer.add_argument("--question", required=True, help="Grounded question text.")

    summary = subparsers.add_parser("summary", help="Generate a grounded summary from a lecture pack.")
    _add_shared_generation_arguments(summary)
    summary.add_argument(
        "--instruction",
        default="Summarize the lecture session using only the local evidence.",
        help="Optional summary instruction override.",
    )

    return parser


def _add_shared_generation_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--pack", default=str(DEFAULT_PACK_PATH), help="Path to a lecture-pack JSON file.")
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="cuda")
    parser.add_argument(
        "--quantization",
        choices=("none", "bnb-8bit", "bnb-4bit-nf4"),
        default=DESKTOP_QUANTIZATION,
        help=(
            "Desktop quantization profile. Defaults to bitsandbytes 4-bit NF4 because it is "
            "the most reliable high-quality fit for the RTX 3060 12 GB demo target."
        ),
    )
    parser.add_argument(
        "--dtype",
        choices=("auto", "float32", "float16", "bfloat16"),
        default="auto",
    )
    parser.add_argument("--max-new-tokens", type=int, default=1024)
    parser.add_argument("--temperature", type=float, default=0.2)
    parser.add_argument("--top-k", type=int, default=24)
    parser.add_argument("--top-p", type=float, default=0.9)
    parser.set_defaults(enable_thinking=True)
    parser.add_argument(
        "--enable-thinking",
        dest="enable_thinking",
        action="store_true",
        help="Enable Gemma thinking mode. Enabled by default for the desktop demo path.",
    )
    parser.add_argument(
        "--disable-thinking",
        dest="enable_thinking",
        action="store_false",
        help="Disable Gemma thinking mode for faster local testing.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the grounded prompt and selected evidence without loading the model.",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON output.")


def _build_runtime_config(args: argparse.Namespace) -> DesktopRuntimeConfig:
    return DesktopRuntimeConfig(
        model_path=DESKTOP_SOURCE_DIR,
        device=args.device,
        dtype=args.dtype,
        quantization=args.quantization,
        fallback_quantization=DESKTOP_FALLBACK_QUANTIZATION if args.quantization == "bnb-8bit" else None,
        max_new_tokens=args.max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
        top_p=args.top_p,
        enable_thinking=args.enable_thinking,
    )


def _print(payload: Any, as_json: bool) -> None:
    if as_json:
        print(json.dumps(payload, indent=2))
        return

    if isinstance(payload, dict):
        for key, value in payload.items():
            print(f"{key}: {value}")
        return

    print(payload)


def _run_doctor(args: argparse.Namespace) -> None:
    payload = build_doctor_payload(DESKTOP_SOURCE_DIR)
    payload["defaultPackPath"] = str(DEFAULT_PACK_PATH)
    _print(payload, args.json)


def _run_answer(args: argparse.Namespace) -> None:
    pack = load_pack(Path(args.pack))
    matches = retrieve_grounded_matches(pack, args.question, limit=12)

    result = {
        "modelId": DESKTOP_MODEL_ID,
        "packPath": str(Path(args.pack).resolve()),
        "supported": bool(matches),
        "question": args.question,
        "matches": [match.__dict__ for match in matches],
    }

    if not matches:
        result["answer"] = UNSUPPORTED_ANSWER
        _print(result, args.json)
        return

    evidence = format_answer_evidence(matches)
    prompt = create_prompt(
        "answer",
        "Answer the question using only the grounded lecture evidence. Keep the answer concise and specific.",
        evidence,
    )
    result["prompt"] = prompt

    if args.dry_run:
        _print(result, args.json)
        return

    runner = DesktopGemmaRunner(_build_runtime_config(args))
    answer = runner.generate(
        system_prompt="You are a grounded lecture assistant. Use only the provided lecture evidence.",
        user_prompt=prompt,
        mode="answer",
    )
    result["answer"] = answer
    _print(result, args.json)


def _run_summary(args: argparse.Namespace) -> None:
    pack = load_pack(Path(args.pack))
    evidence = build_summary_evidence(pack)
    prompt = create_prompt("summary", args.instruction, evidence)

    result = {
        "modelId": DESKTOP_MODEL_ID,
        "packPath": str(Path(args.pack).resolve()),
        "evidence": evidence,
        "prompt": prompt,
    }

    if args.dry_run:
        _print(result, args.json)
        return

    runner = DesktopGemmaRunner(_build_runtime_config(args))
    summary = runner.generate(
        system_prompt="You are a grounded lecture assistant. Use only the provided lecture evidence.",
        user_prompt=prompt,
        mode="summary",
    )
    result["summary"] = summary
    _print(result, args.json)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    require_exact_desktop_model_id(args.model_id)

    if args.command == "doctor":
        _run_doctor(args)
        return

    if args.command == "answer":
        _run_answer(args)
        return

    if args.command == "summary":
        _run_summary(args)
        return

    raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()
