from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from _common import (
    ARTIFACT_PATH,
    DEVICE_MODEL_PATH,
    MODEL_ID,
    ensure_directories,
    fail,
    load_android_package_name,
    load_manifest,
    require_exact_model_id,
)


def resolve_adb() -> str:
    candidates = []

    adb_on_path = shutil_which("adb")
    if adb_on_path:
        return adb_on_path

    for key in ("ANDROID_HOME",):
        value = env_get(key)
        if value:
            candidates.append(Path(value) / "platform-tools" / "adb.exe")
            candidates.append(Path(value) / "platform-tools" / "adb")

    local_app_data = env_get("LOCALAPPDATA")
    if local_app_data:
        candidates.append(Path(local_app_data) / "Android" / "Sdk" / "platform-tools" / "adb.exe")

    user_profile = env_get("USERPROFILE")
    if user_profile:
        candidates.append(
            Path(user_profile) / "AppData" / "Local" / "Android" / "Sdk" / "platform-tools" / "adb.exe"
        )

    for candidate in candidates:
        if candidate.exists():
            return str(candidate)

    fail("adb was not found on PATH and no Android SDK platform-tools directory could be resolved.")


def shutil_which(command: str) -> str | None:
    import shutil

    return shutil.which(command)


def env_get(key: str) -> str | None:
    import os

    return os.environ.get(key)


def run_checked(adb: str, args: list[str], *, capture_output: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [adb, *args],
        check=False,
        capture_output=capture_output,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else ""
        stdout = result.stdout.strip() if result.stdout else ""
        details = stderr or stdout or f"exit code {result.returncode}"
        fail(f"adb {' '.join(args)} failed: {details}")
    return result


def ensure_single_connected_device(adb: str) -> str:
    result = run_checked(adb, ["devices"], capture_output=True)
    device_lines = [
        line.split("\t", 1)[0]
        for line in result.stdout.splitlines()
        if "\tdevice" in line
    ]

    if not device_lines:
        fail("No Android device is connected. Connect a device or start an emulator before staging the Gemma model.")

    return device_lines[0]


def ensure_package_installed(adb: str, package_name: str) -> None:
    result = run_checked(adb, ["shell", "pm", "list", "packages", package_name], capture_output=True)
    if f"package:{package_name}" not in result.stdout:
        fail(
            f"The Android app package {package_name} is not installed on the connected device. "
            "Run npm run android:dev first so the dev build exists before staging the Gemma model."
        )


def stream_into_app_private_storage(adb: str, package_name: str, artifact_path: Path, relative_path: str) -> None:
    normalized_relative_path = relative_path.replace("\\", "/")
    relative_dir = normalized_relative_path.rsplit("/", 1)[0]
    shell_command = (
        f"mkdir -p files/{relative_dir} && "
        f"cat > files/{normalized_relative_path} && "
        f"ls -lh files/{normalized_relative_path}"
    )

    with artifact_path.open("rb") as handle:
        process = subprocess.Popen(
            [adb, "exec-in", "run-as", package_name, "sh", "-c", shell_command],
            stdin=handle,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=False,
        )
        stdout, stderr = process.communicate()

    if process.returncode != 0:
        details = (stderr or stdout or b"").decode("utf-8", errors="replace").strip()
        fail(
            "Failed to stream the Gemma model into the app-private Android storage path. "
            f"Details: {details or f'exit code {process.returncode}'}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Stage the repo-local Android GGUF artifact into the installed Android app sandbox."
    )
    parser.add_argument("--model-id", default=MODEL_ID)
    args = parser.parse_args()

    require_exact_model_id(args.model_id)
    ensure_directories()
    manifest = load_manifest()

    if not ARTIFACT_PATH.exists():
        fail(
            "Missing Android runtime artifact. Run npm run model:download:android first."
        )

    package_name = load_android_package_name()
    device_model_path = manifest["android"]["deviceModelPath"]
    if device_model_path != DEVICE_MODEL_PATH:
        fail(
            "Manifest device model path is out of sync with the staging script. "
            "Run npm run model:download:android again to refresh the manifest."
        )

    adb = resolve_adb()
    run_checked(adb, ["start-server"])
    device_id = ensure_single_connected_device(adb)
    ensure_package_installed(adb, package_name)
    stream_into_app_private_storage(adb, package_name, ARTIFACT_PATH, device_model_path)
    print(
        f"Staged {ARTIFACT_PATH} into the private files directory for {package_name} "
        f"on device {device_id} at files/{device_model_path}"
    )


if __name__ == "__main__":
    main()
