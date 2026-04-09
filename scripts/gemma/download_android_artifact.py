from __future__ import annotations

import argparse
import shutil

from _common import (
    ANDROID_DIR,
    ARTIFACT_PATH,
    ARTIFACT_REPO_FILENAME,
    ARTIFACT_REPO_ID,
    MODEL_ID,
    ensure_directories,
    fail,
    load_manifest,
    require_exact_model_id,
    save_manifest,
    update_android_manifest,
    update_source_manifest,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download the Android GGUF artifact for google/gemma-4-E2B-it into the repo-local models directory."
    )
    parser.add_argument("--model-id", default=MODEL_ID)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    require_exact_model_id(args.model_id)
    ensure_directories()

    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        fail(
            "huggingface_hub is required. Install script dependencies first, for example: "
            "python -m pip install -r scripts/gemma/requirements.txt"
        )

    if ARTIFACT_PATH.exists() and not args.force:
        manifest = load_manifest()
        manifest = update_source_manifest(manifest)
        manifest = update_android_manifest(manifest, prepared=True)
        save_manifest(manifest)
        print(f"Android runtime artifact already present at {ARTIFACT_PATH}")
        return

    try:
        downloaded_path = hf_hub_download(
            repo_id=ARTIFACT_REPO_ID,
            filename=ARTIFACT_REPO_FILENAME,
            local_dir=str(ANDROID_DIR),
            force_download=args.force,
        )
    except Exception as error:  # pragma: no cover - exercised manually
        fail(
            "Failed to download the Android GGUF artifact for "
            f"{MODEL_ID} from {ARTIFACT_REPO_ID}: {error}"
        )

    downloaded_artifact = ANDROID_DIR / ARTIFACT_REPO_FILENAME
    if not downloaded_artifact.exists():
        downloaded_artifact = ARTIFACT_PATH if ARTIFACT_PATH.exists() else None

    if downloaded_artifact is None or not downloaded_artifact.exists():
        fail(
            "The GGUF artifact download completed, but the repo-local Android artifact "
            "could not be found."
        )

    if downloaded_artifact.resolve() != ARTIFACT_PATH.resolve():
        if ARTIFACT_PATH.exists():
            ARTIFACT_PATH.unlink()
        shutil.move(str(downloaded_artifact), str(ARTIFACT_PATH))

    manifest = load_manifest()
    manifest = update_source_manifest(manifest)
    manifest = update_android_manifest(manifest, prepared=True)
    save_manifest(manifest)
    print(
        "Downloaded the Android GGUF artifact for "
        f"{MODEL_ID} into {ARTIFACT_PATH} from {ARTIFACT_REPO_ID}."
    )
    print(f"Hugging Face cache path: {downloaded_path}")


if __name__ == "__main__":
    main()
