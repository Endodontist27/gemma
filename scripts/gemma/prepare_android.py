from __future__ import annotations

import argparse

from _common import MODEL_ID, require_exact_model_id


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Explain the current Android GGUF preparation path for google/gemma-4-E2B-it."
    )
    parser.add_argument("--model-id", default=MODEL_ID)
    args = parser.parse_args()

    require_exact_model_id(args.model_id)
    raise SystemExit(
        "Repo-local Android preparation is now GGUF-first. Automated in-repo quantization for "
        "google/gemma-4-E2B-it is not scripted here yet, so use npm run model:download:android "
        "to fetch the repo-local GGUF artifact and then npm run model:stage:android."
    )


if __name__ == "__main__":
    main()
