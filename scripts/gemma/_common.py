from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_CONFIG_JS_PATH = PROJECT_ROOT / "app.config.js"
APP_CONFIG_JSON_PATH = PROJECT_ROOT / "app.json"
MODEL_ID = "google/gemma-4-E2B-it"
MODEL_ROOT = PROJECT_ROOT / "models" / "google" / "gemma-4-E2B-it"
SOURCE_DIR = MODEL_ROOT / "source"
ANDROID_DIR = MODEL_ROOT / "android"
ARTIFACT_FILENAME = "gemma-4-E2B-it-Q3_K_S.gguf"
ARTIFACT_PATH = ANDROID_DIR / ARTIFACT_FILENAME
ARTIFACT_REPO_ID = "unsloth/gemma-4-E2B-it-GGUF"
ARTIFACT_REPO_FILENAME = ARTIFACT_FILENAME
MANIFEST_PATH = MODEL_ROOT / "manifest.json"
ANDROID_BACKEND = "llama-cpp-rn-cpu"
DESKTOP_MODEL_ID = "google/gemma-4-E4B-it"
DESKTOP_MODEL_ROOT = PROJECT_ROOT / "models" / "google" / "gemma-4-E4B-it"
DESKTOP_SOURCE_DIR = DESKTOP_MODEL_ROOT / "source"
DESKTOP_MANIFEST_PATH = DESKTOP_MODEL_ROOT / "manifest.json"
DESKTOP_QUANTIZATION = "bnb-4bit-nf4"
DESKTOP_FALLBACK_QUANTIZATION = "bnb-4bit-nf4"
DESKTOP_RECOMMENDED_GPU_MEMORY_BYTES = 12 * 1024 * 1024 * 1024
REQUIRED_SOURCE_FILENAMES = (
    ".gitattributes",
    "README.md",
    "chat_template.jinja",
    "config.json",
    "generation_config.json",
    "model.safetensors",
    "processor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
)


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def load_expo_app_config() -> dict[str, Any]:
    if APP_CONFIG_JS_PATH.exists():
        result = subprocess.run(
            [
                "node",
                "-e",
                (
                    "const loaded = require('./app.config.js');"
                    "const resolved = typeof loaded === 'function' ? loaded({ config: {} }) : loaded;"
                    "console.log(JSON.stringify(resolved));"
                ),
            ],
            cwd=PROJECT_ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            error_output = result.stderr.strip() or result.stdout.strip() or "unknown error"
            fail(f"Failed to evaluate {APP_CONFIG_JS_PATH}: {error_output}")

        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as error:
            fail(f"Failed to parse evaluated Expo config from {APP_CONFIG_JS_PATH}: {error}")

    if APP_CONFIG_JSON_PATH.exists():
        try:
            with APP_CONFIG_JSON_PATH.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except json.JSONDecodeError as error:
            fail(f"Failed to parse {APP_CONFIG_JSON_PATH}: {error}")

    fail(f"Missing Expo app config at {APP_CONFIG_JS_PATH} or {APP_CONFIG_JSON_PATH}")


def load_android_package_name() -> str:
    app_config = load_expo_app_config()
    expo_config = app_config.get("expo", app_config)
    android_package = expo_config.get("android", {}).get("package")
    if not android_package:
        fail("Missing expo.android.package in Expo app config")

    return android_package


ANDROID_PACKAGE = load_android_package_name()
DEVICE_MODEL_PATH = f"lecture-companion/{ARTIFACT_FILENAME}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def require_exact_model_id(model_id: str) -> None:
    if model_id != MODEL_ID:
        fail(f"Only {MODEL_ID} is supported. Received {model_id}.")


def require_exact_desktop_model_id(model_id: str) -> None:
    if model_id != DESKTOP_MODEL_ID:
        fail(f"Only {DESKTOP_MODEL_ID} is supported for the desktop demo profile. Received {model_id}.")


def ensure_directories() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    ANDROID_DIR.mkdir(parents=True, exist_ok=True)


def ensure_desktop_directories() -> None:
    DESKTOP_SOURCE_DIR.mkdir(parents=True, exist_ok=True)


def load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        fail(f"Missing manifest at {MANIFEST_PATH}")
    with MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_manifest(payload: dict[str, Any]) -> None:
    with MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def load_desktop_manifest() -> dict[str, Any]:
    if not DESKTOP_MANIFEST_PATH.exists():
        fail(f"Missing desktop model manifest at {DESKTOP_MANIFEST_PATH}")
    with DESKTOP_MANIFEST_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_desktop_manifest(payload: dict[str, Any]) -> None:
    with DESKTOP_MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def list_source_files() -> list[Path]:
    return [SOURCE_DIR / filename for filename in REQUIRED_SOURCE_FILENAMES if (SOURCE_DIR / filename).exists()]


def is_source_complete(paths: list[Path]) -> bool:
    discovered_filenames = {path.name for path in paths}
    return all(filename in discovered_filenames for filename in REQUIRED_SOURCE_FILENAMES)


def compute_snapshot_sha256(paths: list[Path]) -> str | None:
    if not paths or not is_source_complete(paths):
        return None

    digest = hashlib.sha256()
    for path in paths:
        relative_path = path.relative_to(SOURCE_DIR).as_posix()
        digest.update(relative_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(sha256_file(path).encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def resolve_package_version(module_name: str) -> str | None:
    try:
        module = __import__(module_name)
    except ImportError:
        return None

    return getattr(module, "__version__", None)


def resolve_node_package_version(package_name: str) -> str | None:
    package_json_path = PROJECT_ROOT / "node_modules" / package_name / "package.json"
    if not package_json_path.exists():
        return None

    try:
        with package_json_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None

    version = payload.get("version")
    return str(version) if version else None


def update_source_manifest(manifest: dict[str, Any]) -> dict[str, Any]:
    files = list_source_files()
    manifest["source"]["present"] = is_source_complete(files)
    manifest["source"]["files"] = [path.relative_to(SOURCE_DIR).as_posix() for path in files]
    manifest["source"]["snapshotSha256"] = compute_snapshot_sha256(files)
    manifest["source"]["downloadedAt"] = now_iso() if manifest["source"]["present"] else None
    return manifest


def update_android_manifest(manifest: dict[str, Any], prepared: bool) -> dict[str, Any]:
    manifest["android"]["present"] = ARTIFACT_PATH.exists()
    manifest["android"]["artifactSha256"] = (
        sha256_file(ARTIFACT_PATH) if ARTIFACT_PATH.exists() else None
    )
    manifest["android"]["artifactRepoId"] = ARTIFACT_REPO_ID
    manifest["android"]["artifactRepoFilename"] = ARTIFACT_REPO_FILENAME
    manifest["android"]["deviceModelPath"] = DEVICE_MODEL_PATH
    manifest["android"]["preparedAt"] = (
        now_iso() if prepared and ARTIFACT_PATH.exists() else manifest["android"]["preparedAt"]
    )
    manifest["android"]["conversionProfile"]["backend"] = ANDROID_BACKEND
    manifest["android"]["conversionProfile"]["artifactFormat"] = "gguf"
    manifest["android"]["conversionProfile"]["quantization"] = "q3_k_s"
    manifest["android"]["toolVersions"]["huggingfaceHub"] = resolve_package_version("huggingface_hub")
    manifest["android"]["toolVersions"]["llamaRn"] = resolve_node_package_version("llama.rn")
    manifest["android"]["toolVersions"]["llamaCpp"] = None
    return manifest


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2))
