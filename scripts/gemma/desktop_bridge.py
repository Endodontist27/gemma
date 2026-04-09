from __future__ import annotations

import argparse
import base64
import cgi
import io
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from PIL import Image

from _common import (
    DESKTOP_FALLBACK_QUANTIZATION,
    DESKTOP_MODEL_ID,
    DESKTOP_QUANTIZATION,
    DESKTOP_SOURCE_DIR,
    require_exact_desktop_model_id,
)
from desktop_ingestion import ingest_asset_with_gemma, rerank_candidates_with_gemma
from desktop_runtime import DesktopGemmaRunner, DesktopRuntimeConfig, build_doctor_payload


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run a local desktop Gemma bridge for Android emulator demos."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7860)
    parser.add_argument("--model-id", default=DESKTOP_MODEL_ID)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="cuda")
    parser.add_argument(
        "--quantization",
        choices=("none", "bnb-8bit", "bnb-4bit-nf4"),
        default=DESKTOP_QUANTIZATION,
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
        help="Enable Gemma thinking mode. Enabled by default for the emulator demo bridge.",
    )
    parser.add_argument(
        "--disable-thinking",
        dest="enable_thinking",
        action="store_false",
        help="Disable Gemma thinking mode for faster bridge responses.",
    )
    return parser


class DesktopBridgeState:
    def __init__(self, runner: DesktopGemmaRunner, args: argparse.Namespace) -> None:
        self.runner = runner
        self.args = args
        self.last_error: str | None = None

    def status_payload(self, ok: bool, message: str) -> dict[str, Any]:
        doctor = build_doctor_payload(DESKTOP_SOURCE_DIR)
        return {
            "ok": ok,
            "modelId": DESKTOP_MODEL_ID,
            "sourcePresent": bool(doctor.get("modelPresent")),
            "artifactPresent": bool(doctor.get("modelPresent")),
            "bundledAssetPresent": False,
            "deviceModelPresent": False,
            "message": message,
            "quantization": self.args.quantization,
            "device": self.args.device,
        }


def build_runtime_config(args: argparse.Namespace) -> DesktopRuntimeConfig:
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


def make_handler(state: DesktopBridgeState):
    def decode_data_uri_images(image_data_uris: list[str]) -> list[Image.Image]:
        images: list[Image.Image] = []
        for image_data_uri in image_data_uris:
            if not isinstance(image_data_uri, str) or not image_data_uri.startswith("data:image/"):
                continue

            try:
                _, encoded = image_data_uri.split(",", 1)
                image_bytes = base64.b64decode(encoded)
                images.append(Image.open(io.BytesIO(image_bytes)).copy())
            except Exception:
                continue

        return images

    def is_retryable_generation_error(error: Exception) -> bool:
        message = str(error).lower()
        return (
            "out of gpu memory" in message
            or "out of memory" in message
            or "did not reach a final answer" in message
            or ("cuda" in message and "memory" in message)
        )

    def generate_with_adaptive_visual_fallback(
        *,
        mode: str,
        system_prompt: str,
        prompt: str,
        images: list[Image.Image],
        max_new_tokens: int,
        temperature: float,
        top_k: int,
        top_p: float,
    ) -> str:
        attempts: list[dict[str, Any]] = []

        if images:
            attempts.append(
                {
                    "images": images,
                    "max_new_tokens": max_new_tokens,
                    "temperature": temperature,
                    "top_k": top_k,
                    "top_p": top_p,
                    "enable_thinking": state.runner._config.enable_thinking,
                }
            )
            attempts.append(
                {
                    "images": images[:1],
                    "max_new_tokens": min(max_new_tokens, 768),
                    "temperature": temperature,
                    "top_k": top_k,
                    "top_p": top_p,
                    "enable_thinking": state.runner._config.enable_thinking,
                }
            )
            attempts.append(
                {
                    "images": images[:1],
                    "max_new_tokens": min(max_new_tokens, 448),
                    "temperature": max(temperature, 0.0),
                    "top_k": min(top_k, 24),
                    "top_p": top_p,
                    "enable_thinking": False,
                }
            )

        attempts.append(
            {
                "images": [],
                "max_new_tokens": min(max_new_tokens, 256),
                "temperature": temperature,
                "top_k": min(top_k, 24),
                "top_p": top_p,
                "enable_thinking": False,
            }
        )

        last_error: Exception | None = None
        for attempt in attempts:
            try:
                if attempt["images"]:
                    return state.runner.generate_multimodal(
                        system_prompt=system_prompt,
                        user_prompt=prompt,
                        images=attempt["images"],
                        mode=mode,
                        max_new_tokens=attempt["max_new_tokens"],
                        temperature=attempt["temperature"],
                        top_k=attempt["top_k"],
                        top_p=attempt["top_p"],
                        enable_thinking=attempt["enable_thinking"],
                    )

                return state.runner.generate(
                    system_prompt=system_prompt,
                    user_prompt=prompt,
                    mode=mode,
                    max_new_tokens=attempt["max_new_tokens"],
                    temperature=attempt["temperature"],
                    top_k=attempt["top_k"],
                    top_p=attempt["top_p"],
                    enable_thinking=attempt["enable_thinking"],
                )
            except Exception as error:  # noqa: BLE001
                last_error = error
                state.runner.clear_runtime_cache()
                if not is_retryable_generation_error(error):
                    raise
                continue

        assert last_error is not None
        raise last_error

    class DesktopBridgeHandler(BaseHTTPRequestHandler):
        server_version = "LectureCompanionDesktopBridge/1.0"

        def _send_json(self, payload: dict[str, Any], status: int = HTTPStatus.OK) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.close_connection = True

        def _read_json(self) -> dict[str, Any]:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length <= 0:
                return {}
            raw = self.rfile.read(content_length)
            return json.loads(raw.decode("utf-8"))

        def log_message(self, format: str, *args: Any) -> None:
            return

        def do_GET(self) -> None:
            if self.path != "/status":
                self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
                return

            if state.last_error:
                self._send_json(state.status_payload(False, state.last_error))
                return

            self._send_json(
                state.status_payload(
                    True,
                    f"Desktop E4B bridge is ready on {state.args.device} using {state.args.quantization}.",
                )
            )

        def do_POST(self) -> None:
            if self.path == "/warmup":
                try:
                    state.runner._load()
                    state.last_error = None
                    self._send_json(
                        state.status_payload(
                            True,
                            f"Desktop E4B bridge warmed successfully on {state.args.device} using {state.args.quantization}.",
                        )
                    )
                except Exception as error:  # noqa: BLE001
                    state.last_error = str(error)
                    self._send_json(
                        state.status_payload(False, state.last_error),
                        HTTPStatus.BAD_GATEWAY,
                    )
                return

            if self.path == "/generate":
                payload = self._read_json()
                mode = str(payload.get("mode", "answer"))
                prompt = str(payload.get("prompt", ""))
                system_prompt = str(payload.get("systemPrompt", "")).strip() or (
                    "You are a grounded lecture assistant. Use only the provided lecture evidence."
                )
                options = payload.get("options", {})
                images = decode_data_uri_images(payload.get("imageDataUris", []))

                original_values = {
                    "max_new_tokens": state.runner._config.max_new_tokens,
                    "temperature": state.runner._config.temperature,
                    "top_k": state.runner._config.top_k,
                    "top_p": state.runner._config.top_p,
                }

                state.runner._config.max_new_tokens = int(
                    options.get("maxTokens", original_values["max_new_tokens"])
                )
                state.runner._config.temperature = float(
                    options.get("temperature", original_values["temperature"])
                )
                state.runner._config.top_k = int(options.get("topK", original_values["top_k"]))
                state.runner._config.top_p = float(options.get("topP", original_values["top_p"]))

                try:
                    output = generate_with_adaptive_visual_fallback(
                        mode=mode,
                        system_prompt=system_prompt,
                        prompt=prompt,
                        images=images,
                        max_new_tokens=state.runner._config.max_new_tokens,
                        temperature=state.runner._config.temperature,
                        top_k=state.runner._config.top_k,
                        top_p=state.runner._config.top_p,
                    )
                    state.last_error = None
                    self._send_json({"output": output})
                except Exception as error:  # noqa: BLE001
                    state.last_error = str(error)
                    self._send_json({"error": state.last_error}, HTTPStatus.BAD_GATEWAY)
                finally:
                    state.runner._config.max_new_tokens = original_values["max_new_tokens"]
                    state.runner._config.temperature = original_values["temperature"]
                    state.runner._config.top_k = original_values["top_k"]
                    state.runner._config.top_p = original_values["top_p"]
                return

            if self.path == "/rerank":
                payload = self._read_json()
                question = str(payload.get("question", "")).strip()
                candidates = payload.get("candidates", [])

                try:
                    results = rerank_candidates_with_gemma(
                        state.runner,
                        question=question,
                        candidates=candidates if isinstance(candidates, list) else [],
                    )
                    state.last_error = None
                    self._send_json({"results": results})
                except Exception as error:  # noqa: BLE001
                    state.last_error = str(error)
                    self._send_json({"error": state.last_error}, HTTPStatus.BAD_GATEWAY)
                return

            if self.path == "/ingest-asset":
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        "REQUEST_METHOD": "POST",
                        "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                    },
                )
                uploaded_file = form["file"] if "file" in form else None
                file_name = str(form.getvalue("fileName", "")).strip()
                extension = str(form.getvalue("extension", "")).strip().lower()
                text_content = str(form.getvalue("textContent", "") or "")

                if uploaded_file is None or not getattr(uploaded_file, "file", None):
                    self._send_json({"error": "Missing file upload."}, HTTPStatus.BAD_REQUEST)
                    return

                try:
                    file_bytes = uploaded_file.file.read()
                    payload = ingest_asset_with_gemma(
                        state.runner,
                        file_name=file_name,
                        extension=extension,
                        file_bytes=file_bytes,
                        text_content=text_content,
                    )
                    state.last_error = None
                    self._send_json(payload)
                except Exception as error:  # noqa: BLE001
                    state.last_error = str(error)
                    self._send_json({"error": state.last_error}, HTTPStatus.BAD_GATEWAY)
                return

            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    return DesktopBridgeHandler


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    require_exact_desktop_model_id(args.model_id)

    runner = DesktopGemmaRunner(build_runtime_config(args))
    state = DesktopBridgeState(runner, args)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(state))

    print(
        json.dumps(
            {
                "event": "desktop_bridge_ready",
                "host": args.host,
                "port": args.port,
                "modelId": DESKTOP_MODEL_ID,
                "device": args.device,
                "quantization": args.quantization,
            }
        ),
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
