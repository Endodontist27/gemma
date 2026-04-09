from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "if",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "why",
    "with",
}

SOURCE_PRIORITY = {
    "glossary_term": 3,
    "material_chunk": 2,
    "transcript_entry": 1,
}


@dataclass(frozen=True)
class EvidenceMatch:
    source_type: str
    source_id: str
    label: str
    excerpt: str
    score: float
    priority: int
    order_index: int


def load_pack(pack_path: Path) -> dict:
    with pack_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_text(value: str) -> str:
    return " ".join(tokenize(value))


def tokenize(value: str) -> list[str]:
    return [
        token
        for token in TOKEN_PATTERN.findall(value.lower())
        if token not in STOP_WORDS
    ]


def _overlap_score(query_tokens: set[str], candidate_tokens: set[str]) -> float:
    if not query_tokens or not candidate_tokens:
        return 0.0

    overlap = query_tokens.intersection(candidate_tokens)
    if not overlap:
        return 0.0

    coverage = len(overlap) / len(query_tokens)
    density = len(overlap) / len(candidate_tokens)
    return round((coverage * 0.7) + (density * 0.3), 4)


def _material_candidates(pack: dict) -> list[EvidenceMatch]:
    candidates: list[EvidenceMatch] = []
    for material in pack.get("materials", []):
        material_title = material["title"]
        for chunk in material.get("chunks", []):
            candidates.append(
                EvidenceMatch(
                    source_type="material_chunk",
                    source_id=chunk["id"],
                    label=f"{material_title} - {chunk['heading']}",
                    excerpt=chunk["text"],
                    score=0.0,
                    priority=SOURCE_PRIORITY["material_chunk"],
                    order_index=int(chunk["orderIndex"]),
                )
            )
    return candidates


def _glossary_candidates(pack: dict) -> list[EvidenceMatch]:
    candidates: list[EvidenceMatch] = []
    for term in pack.get("glossary", []):
        aliases = term.get("aliases", [])
        alias_text = f" Aliases: {', '.join(aliases)}." if aliases else ""
        candidates.append(
            EvidenceMatch(
                source_type="glossary_term",
                source_id=term["id"],
                label=term["term"],
                excerpt=f"{term['definition']}{alias_text}".strip(),
                score=0.0,
                priority=SOURCE_PRIORITY["glossary_term"],
                order_index=int(term["orderIndex"]),
            )
        )
    return candidates


def _transcript_candidates(pack: dict) -> list[EvidenceMatch]:
    candidates: list[EvidenceMatch] = []
    for entry in pack.get("transcript", []):
        candidates.append(
            EvidenceMatch(
                source_type="transcript_entry",
                source_id=entry["id"],
                label=f"{entry['speakerLabel']} @ {entry['startedAtSeconds']}s",
                excerpt=entry["text"],
                score=0.0,
                priority=SOURCE_PRIORITY["transcript_entry"],
                order_index=int(entry["orderIndex"]),
            )
        )
    return candidates


def retrieve_grounded_matches(
    pack: dict,
    question_text: str,
    limit: int = 3,
    minimum_score: float = 0.08,
) -> list[EvidenceMatch]:
    query_tokens = set(tokenize(question_text))
    ranked: list[EvidenceMatch] = []

    for candidate in (
        _glossary_candidates(pack)
        + _material_candidates(pack)
        + _transcript_candidates(pack)
    ):
        candidate_tokens = set(tokenize(f"{candidate.label} {candidate.excerpt}"))
        lexical_score = _overlap_score(query_tokens, candidate_tokens)
        if lexical_score <= 0:
            continue

        ranked.append(
            EvidenceMatch(
                source_type=candidate.source_type,
                source_id=candidate.source_id,
                label=candidate.label,
                excerpt=candidate.excerpt,
                score=round((candidate.priority * 0.25) + lexical_score, 4),
                priority=candidate.priority,
                order_index=candidate.order_index,
            )
        )

    ranked.sort(
        key=lambda item: (-item.priority, -item.score, item.order_index, item.label.lower())
    )
    filtered = [item for item in ranked if item.score >= minimum_score]
    return filtered[:limit]


def build_summary_evidence(pack: dict, limit: int = 4) -> list[str]:
    evidence: list[str] = []

    for term in sorted(pack.get("glossary", []), key=lambda item: item["orderIndex"]):
        evidence.append(f"{term['term']}: {term['definition']}")
        if len(evidence) >= limit:
            return evidence

    for material in sorted(pack.get("materials", []), key=lambda item: item["orderIndex"]):
        for chunk in sorted(material.get("chunks", []), key=lambda item: item["orderIndex"]):
            evidence.append(f"{material['title']} - {chunk['heading']}: {chunk['text']}")
            if len(evidence) >= limit:
                return evidence

    for entry in sorted(pack.get("transcript", []), key=lambda item: item["orderIndex"]):
        evidence.append(f"{entry['speakerLabel']}: {entry['text']}")
        if len(evidence) >= limit:
            return evidence

    return evidence


def format_answer_evidence(matches: list[EvidenceMatch]) -> list[str]:
    return [f"{match.label}: {match.excerpt}" for match in matches]
