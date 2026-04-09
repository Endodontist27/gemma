from __future__ import annotations

import argparse

from _common import (
    MODEL_ID,
    SOURCE_DIR,
    ensure_directories,
    fail,
    load_manifest,
    require_exact_model_id,
    save_manifest,
    update_android_manifest,
    update_source_manifest,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Download google/gemma-4-E2B-it into the repo-local models directory.")
    parser.add_argument("--model-id", default=MODEL_ID)
    args = parser.parse_args()

    require_exact_model_id(args.model_id)
    ensure_directories()

    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        fail(
            "huggingface_hub is required. Install script dependencies first, for example: "
            "python -m pip install -r scripts/gemma/requirements.txt"
        )

    try:
        snapshot_download(
            repo_id=MODEL_ID,
            local_dir=str(SOURCE_DIR),
        )
    except Exception as error:  # pragma: no cover - exercised manually
        fail(f"Failed to download {MODEL_ID}: {error}")

    manifest = load_manifest()
    manifest = update_source_manifest(manifest)
    manifest = update_android_manifest(manifest, prepared=False)
    save_manifest(manifest)
    print(f"Downloaded {MODEL_ID} into {SOURCE_DIR}")


if __name__ == "__main__":
    main()
