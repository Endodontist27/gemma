from __future__ import annotations

import argparse

from _common import (
    ARTIFACT_PATH,
    MANIFEST_PATH,
    MODEL_ID,
    compute_snapshot_sha256,
    fail,
    is_source_complete,
    list_source_files,
    load_manifest,
    require_exact_model_id,
    sha256_file,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the repo-local Gemma manifest for google/gemma-4-E2B-it.")
    parser.add_argument("--model-id", default=MODEL_ID)
    args = parser.parse_args()

    require_exact_model_id(args.model_id)
    manifest = load_manifest()

    if manifest.get("modelId") != MODEL_ID:
        fail(f"Manifest at {MANIFEST_PATH} does not target {MODEL_ID}.")

    source_files = list_source_files()
    source_present = is_source_complete(source_files)
    if not source_present:
        fail(
            "Required Hugging Face source files for google/gemma-4-E2B-it are missing from the repo-local source directory."
        )

    if source_present != manifest["source"]["present"]:
        fail("Source manifest presence does not match the repo-local source directory state.")

    snapshot_sha = compute_snapshot_sha256(source_files)
    if snapshot_sha != manifest["source"]["snapshotSha256"]:
        fail("Source snapshot SHA256 does not match the manifest.")

    artifact_present = ARTIFACT_PATH.exists()
    if not artifact_present:
        fail(
            "The Android GGUF artifact is missing. Run npm run model:download:android first."
        )

    if artifact_present != manifest["android"]["present"]:
        fail("Android artifact presence does not match the manifest.")

    artifact_sha = sha256_file(ARTIFACT_PATH) if artifact_present else None
    if artifact_sha != manifest["android"]["artifactSha256"]:
        fail("Android artifact SHA256 does not match the manifest.")

    print("Gemma manifest verified successfully.")


if __name__ == "__main__":
    main()
