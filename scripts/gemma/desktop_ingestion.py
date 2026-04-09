from __future__ import annotations

import base64
import hashlib
import io
import json
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from PIL import Image

from desktop_runtime import DesktopGemmaRunner

MAX_PDF_PAGES = 6
MAX_VIDEO_FRAMES = 8


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _clean_image(image: Image.Image, max_edge: int = 1280) -> Image.Image:
    normalized = image.convert("RGB")
    normalized.thumbnail((max_edge, max_edge))
    return normalized


def _image_to_preview_uri(
    image: Image.Image,
    *,
    max_edge: int = 384,
    quality: int = 60,
) -> str:
    preview = _clean_image(image, max_edge=max_edge)
    output = io.BytesIO()
    preview.save(output, format="JPEG", quality=quality, optimize=True)
    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _extract_json_object(value: str) -> dict[str, Any]:
    candidate = value.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`")
        if "\n" in candidate:
            candidate = candidate.split("\n", 1)[1]
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end <= start:
        return {}
    try:
        return json.loads(candidate[start : end + 1])
    except json.JSONDecodeError:
        return {}


def _to_unit_payload(payload: dict[str, Any], *, title_fallback: str, modality: str, frame_label: str | None = None, timestamp_start_seconds: int | None = None) -> dict[str, Any]:
    title = str(payload.get("title") or title_fallback).strip() or title_fallback
    content_text = str(payload.get("content_text") or payload.get("contentText") or payload.get("excerpt") or "").strip()
    excerpt = str(payload.get("excerpt") or content_text[:240]).strip() or content_text[:240]
    search_text = str(payload.get("search_text") or payload.get("searchText") or f"{title} {content_text}").strip()
    return {
        "title": title,
        "excerpt": excerpt,
        "contentText": content_text or excerpt or title,
        "searchText": search_text or f"{title} {excerpt}",
        "modality": modality,
        "pageNumber": payload.get("page_number"),
        "slideNumber": payload.get("slide_number"),
        "frameLabel": frame_label or payload.get("frame_label"),
        "timestampStartSeconds": timestamp_start_seconds if timestamp_start_seconds is not None else payload.get("timestamp_start_seconds"),
        "timestampEndSeconds": payload.get("timestamp_end_seconds"),
        "previewUri": None,
        "metadataJson": json.dumps(payload.get("metadata", {})) if payload.get("metadata") else None,
    }


def _generate_image_analysis(runner: DesktopGemmaRunner, image: Image.Image, prompt: str) -> dict[str, Any]:
    response = runner.generate_multimodal(
        system_prompt=(
            "You are indexing a grounded lecture asset. Extract visible text, charts, labels, and concise visual evidence. "
            "Return strict JSON with keys summary and evidence_units."
        ),
        user_prompt=(
            f"{prompt}\n"
            "Return JSON with this shape: "
            '{"summary":"...", "evidence_units":[{"title":"...", "excerpt":"...", "content_text":"...", "search_text":"..."}]}'
        ),
        images=[_clean_image(image)],
        mode="summary",
        max_new_tokens=384,
    )
    return _extract_json_object(response)


def _build_text_digest(runner: DesktopGemmaRunner, file_name: str, text_content: str) -> dict[str, Any] | None:
    trimmed = text_content.strip()
    if not trimmed:
        return None
    response = runner.generate(
        system_prompt="You create concise grounded study digests from local lecture content.",
        user_prompt=(
            f"Create a short grounded digest for the uploaded lecture asset '{file_name}'. "
            "Preserve important definitions, numbered steps, and any exam-relevant distinctions.\n\n"
            f"Lecture content:\n{trimmed[:8000]}"
        ),
        mode="summary",
    )
    return {
        "title": f"{file_name} digest",
        "text": response,
    }


def _extract_pptx_images(file_bytes: bytes) -> list[Image.Image]:
    images: list[Image.Image] = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        for name in archive.namelist():
            if not name.startswith("ppt/media/"):
                continue
            if not name.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                continue
            with archive.open(name) as handle:
                images.append(Image.open(io.BytesIO(handle.read())).copy())
            if len(images) >= 8:
                break
    return images


def _extract_pptx_embedded_videos(file_bytes: bytes) -> list[tuple[str, bytes]]:
    videos: list[tuple[str, bytes]] = []
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
        for name in archive.namelist():
            if not name.startswith("ppt/media/"):
                continue
            if not name.lower().endswith((".mp4", ".mov", ".m4v", ".avi", ".webm")):
                continue
            with archive.open(name) as handle:
                videos.append((name, handle.read()))
            if len(videos) >= 4:
                break
    return videos


def _extract_video_frames(file_bytes: bytes, suffix: str) -> list[tuple[int, Image.Image]]:
    frames: list[tuple[int, Image.Image]] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        video_path = temp_path / f"input{suffix}"
        video_path.write_bytes(file_bytes)
        output_pattern = temp_path / "frame_%03d.jpg"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(video_path),
                "-vf",
                "fps=1/8,scale=960:-2",
                "-frames:v",
                str(MAX_VIDEO_FRAMES),
                str(output_pattern),
            ],
            check=True,
            capture_output=True,
        )
        for index, frame_path in enumerate(sorted(temp_path.glob("frame_*.jpg"))):
            timestamp_seconds = index * 8
            frames.append((timestamp_seconds, Image.open(frame_path).copy()))
    return frames


def _extract_pdf_page_images(file_bytes: bytes) -> list[tuple[int, Image.Image]]:
    pages: list[tuple[int, Image.Image]] = []
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        pdf_path = temp_path / "input.pdf"
        pdf_path.write_bytes(file_bytes)
        output_prefix = temp_path / "page"
        subprocess.run(
            [
                "pdftoppm",
                "-jpeg",
                "-r",
                "144",
                "-f",
                "1",
                "-l",
                str(MAX_PDF_PAGES),
                str(pdf_path),
                str(output_prefix),
            ],
            check=True,
            capture_output=True,
        )

        for index, page_path in enumerate(sorted(temp_path.glob("page-*.jpg")), start=1):
            pages.append((index, Image.open(page_path).copy()))

    return pages


def ingest_asset_with_gemma(
    runner: DesktopGemmaRunner,
    *,
    file_name: str,
    extension: str,
    file_bytes: bytes,
    text_content: str | None,
) -> dict[str, Any]:
    checksum = _sha256_bytes(file_bytes)
    evidence_units: list[dict[str, Any]] = []
    digest = _build_text_digest(runner, file_name, text_content or "")

    if extension in {"png", "jpg", "jpeg", "webp"}:
        source_image = Image.open(io.BytesIO(file_bytes))
        preview_uri = _image_to_preview_uri(source_image)
        image_payload = _generate_image_analysis(
            runner,
            source_image,
            "Inspect this uploaded lecture image and extract grounded evidence.",
        )
        digest = digest or {
            "title": f"{file_name} digest",
            "text": str(image_payload.get("summary") or "").strip(),
        }
        evidence_units.extend(
            {
                **_to_unit_payload(
                    unit,
                    title_fallback=f"{file_name} visual evidence {index + 1}",
                    modality="image",
                ),
                "previewUri": preview_uri,
            }
            for index, unit in enumerate(image_payload.get("evidence_units", []))
        )

    elif extension in {"mp4", "mov", "m4v", "avi", "webm"}:
        frame_notes: list[str] = []
        for index, (timestamp_seconds, frame_image) in enumerate(_extract_video_frames(file_bytes, f".{extension}")):
            preview_uri = _image_to_preview_uri(frame_image)
            frame_payload = _generate_image_analysis(
                runner,
                frame_image,
                f"Inspect this sampled lecture video frame captured around {timestamp_seconds} seconds and extract grounded evidence.",
            )
            summary = str(frame_payload.get("summary") or "").strip()
            if summary:
                frame_notes.append(f"{timestamp_seconds}s: {summary}")
            evidence_units.extend(
                {
                    **_to_unit_payload(
                        unit,
                        title_fallback=f"{file_name} frame {index + 1}",
                        modality="video",
                        frame_label=f"Frame {index + 1}",
                        timestamp_start_seconds=timestamp_seconds,
                    ),
                    "previewUri": preview_uri,
                }
                for unit in frame_payload.get("evidence_units", [])
            )
        if frame_notes:
            digest = {
                "title": f"{file_name} digest",
                "text": "\n".join(frame_notes),
            }

    elif extension == "pdf":
        page_notes: list[str] = []
        for page_number, page_image in _extract_pdf_page_images(file_bytes):
            preview_uri = _image_to_preview_uri(page_image)
            page_payload = _generate_image_analysis(
                runner,
                page_image,
                f"Inspect this lecture PDF page {page_number} and extract visible evidence, diagrams, labels, and embedded text.",
            )
            summary = str(page_payload.get("summary") or "").strip()
            if summary:
                page_notes.append(f"Page {page_number}: {summary}")
            evidence_units.extend(
                {
                    **_to_unit_payload(
                        unit,
                        title_fallback=f"{file_name} page {page_number}",
                        modality="pdf",
                    ),
                    "pageNumber": unit.get("page_number") or page_number,
                    "previewUri": preview_uri,
                }
                for unit in page_payload.get("evidence_units", [])
            )
        if page_notes:
            visual_summary = "\n".join(page_notes)
            digest = (
                {
                    "title": digest["title"],
                    "text": f"{digest['text'].rstrip()}\n\nVisual page notes:\n{visual_summary}",
                }
                if digest
                else {
                    "title": f"{file_name} digest",
                    "text": visual_summary,
                }
            )

    elif extension == "pptx":
        images = _extract_pptx_images(file_bytes)
        visual_notes: list[str] = []
        for index, image in enumerate(images):
            preview_uri = _image_to_preview_uri(image)
            image_payload = _generate_image_analysis(
                runner,
                image,
                "Inspect this embedded lecture slide visual and extract grounded evidence.",
            )
            summary = str(image_payload.get("summary") or "").strip()
            if summary:
                visual_notes.append(f"Embedded visual {index + 1}: {summary}")
            evidence_units.extend(
                {
                    **_to_unit_payload(
                        unit,
                        title_fallback=f"{file_name} slide visual {index + 1}",
                        modality="slide",
                        frame_label=f"Embedded visual {index + 1}",
                    ),
                    "previewUri": preview_uri,
                }
                for unit in image_payload.get("evidence_units", [])
            )
        for media_index, (media_name, media_bytes) in enumerate(_extract_pptx_embedded_videos(file_bytes), start=1):
            video_suffix = Path(media_name).suffix or ".mp4"
            for frame_index, (timestamp_seconds, frame_image) in enumerate(
                _extract_video_frames(media_bytes, video_suffix),
                start=1,
            ):
                preview_uri = _image_to_preview_uri(frame_image)
                frame_payload = _generate_image_analysis(
                    runner,
                    frame_image,
                    "Inspect this embedded lecture slide video frame and extract grounded visual evidence.",
                )
                summary = str(frame_payload.get("summary") or "").strip()
                if summary:
                    visual_notes.append(
                        f"Embedded video {media_index} at {timestamp_seconds}s: {summary}"
                    )
                evidence_units.extend(
                    {
                        **_to_unit_payload(
                            unit,
                            title_fallback=f"{file_name} embedded video {media_index} frame {frame_index}",
                            modality="video",
                            frame_label=f"Embedded video {media_index} frame {frame_index}",
                            timestamp_start_seconds=timestamp_seconds,
                        ),
                        "previewUri": preview_uri,
                    }
                    for unit in frame_payload.get("evidence_units", [])
                )
        if visual_notes:
            visual_summary = "\n".join(visual_notes)
            digest = (
                {
                    "title": digest["title"],
                    "text": f"{digest['text'].rstrip()}\n\nSlide visual notes:\n{visual_summary}",
                }
                if digest
                else {
                    "title": f"{file_name} digest",
                    "text": visual_summary,
                }
            )

    return {
        "digest": {
            "title": digest["title"],
            "text": digest["text"],
            "checksum": checksum,
        }
        if digest
        else None,
        "units": evidence_units,
    }


def rerank_candidates_with_gemma(
    runner: DesktopGemmaRunner,
    *,
    question: str,
    candidates: list[dict[str, str]],
) -> list[dict[str, Any]]:
    if not candidates:
        return []

    prompt_lines = [
        f"{index + 1}. [{candidate['id']}] {candidate['title']}: {str(candidate['excerpt'])[:320].strip()}"
        for index, candidate in enumerate(candidates[:6])
    ]
    response = runner.generate(
        system_prompt="You rerank grounded lecture evidence for question answering.",
        user_prompt=(
            f"Question: {question}\n\n"
            "Return strict JSON with a single key `results` containing objects of the form "
            '{"id":"candidate-id","score":number}. Scores should be higher for more useful grounded evidence.\n\n'
            "Candidates:\n"
            + "\n".join(prompt_lines)
        ),
        mode="summary",
        max_new_tokens=192,
        temperature=0.0,
        top_k=8,
        top_p=0.9,
        enable_thinking=False,
    )
    payload = _extract_json_object(response)
    results = payload.get("results", [])
    if not isinstance(results, list):
        return []

    normalized: list[dict[str, Any]] = []
    for result in results:
        if not isinstance(result, dict):
            continue
        candidate_id = result.get("id")
        score = result.get("score")
        if not isinstance(candidate_id, str):
            continue
        try:
            normalized.append({"id": candidate_id, "score": float(score)})
        except (TypeError, ValueError):
            continue
    return normalized
