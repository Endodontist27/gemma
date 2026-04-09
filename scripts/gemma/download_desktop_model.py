from __future__ import annotations

import argparse

from _common import (
    DESKTOP_MODEL_ID,
    DESKTOP_SOURCE_DIR,
    ensure_desktop_directories,
    fail,
    require_exact_desktop_model_id,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download google/gemma-4-E4B-it into the repo-local desktop demo model directory."
    )
    parser.add_argument("--model-id", default=DESKTOP_MODEL_ID)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    require_exact_desktop_model_id(args.model_id)
    ensure_desktop_directories()

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        fail(
            "huggingface_hub is required. Install script dependencies first, for example: "
            "python -m pip install -r scripts/gemma/requirements.txt"
        )

    try:
        snapshot_download(
            repo_id=DESKTOP_MODEL_ID,
            local_dir=str(DESKTOP_SOURCE_DIR),
            force_download=args.force,
        )
    except Exception as error:  # pragma: no cover - exercised manually
        fail(f"Failed to download {DESKTOP_MODEL_ID}: {error}")

    print(f"Downloaded {DESKTOP_MODEL_ID} into {DESKTOP_SOURCE_DIR}")


if __name__ == "__main__":
    main()
