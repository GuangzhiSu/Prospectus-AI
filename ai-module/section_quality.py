"""Quality checks for Agent2 section bodies (detect title-only / thin drafts)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from llm_sanitize import still_contains_thinking
from prospectus_graph.output_bundle import strip_verification_notes

GapKind = Literal["none", "GENERATION_GAP", "EVIDENCE_GAP"]

_HEADING_RE = re.compile(r"^#{1,6}\s+")
_PLACEHOLDER_RE = re.compile(
    r"DATA_MISSING|Information not provided|\[Information not provided",
    re.IGNORECASE,
)
_AI_TAG_RE = re.compile(r"^\[\[AI:")
_TABLE_ROW_RE = re.compile(r"^\|")
_TABLE_SEP_RE = re.compile(r"^\|[\s:\-|]+\|$")
_AI_TAG_INLINE_RE = re.compile(r"\[\[AI:[^\]]*\]\]")

# Agent1 bucket E (Use of Proceeds) had zero chunks for sensetime run.
_EVIDENCE_GAP_SECTIONS = frozenset({"UseOfProceeds"})

# Template / auto sections skip prose-depth checks.
_EXEMPT_SECTIONS = frozenset({"Contents", "ExpectedTimetable"})

MIN_PROSE_LINES = 15
MAX_PLACEHOLDER_RATIO = 0.33
MAX_EMPTY_H2 = 2
MIN_H2_PROSE_CHARS = 80
MAX_THIN_H2 = 2


def _is_prose_line(line: str) -> bool:
    s = line.strip()
    if not s or s in ("---",):
        return False
    if _HEADING_RE.match(s):
        return False
    if _AI_TAG_RE.match(s):
        return False
    if _TABLE_ROW_RE.match(s):
        return False
    return True


def _is_content_line(line: str) -> bool:
    """Prose or markdown table data rows (excludes table separator lines)."""
    s = line.strip()
    if not s or s in ("---", "***", "**"):
        return False
    if _TABLE_SEP_RE.match(s):
        return False
    if _HEADING_RE.match(s):
        return False
    if _AI_TAG_RE.match(s):
        return False
    if _TABLE_ROW_RE.match(s):
        return True
    return True


def _is_placeholder_dominated_line(line: str) -> bool:
    """True when the line is essentially only a placeholder stub (no real prose)."""
    if not _PLACEHOLDER_RE.search(line):
        return False
    remainder = _AI_TAG_INLINE_RE.sub("", line)
    remainder = re.sub(r"\*\*DATA_MISSING\*\*\.?", "", remainder, flags=re.IGNORECASE)
    remainder = re.sub(
        r"Information not provided|\[Information not provided[^\]]*\]",
        "",
        remainder,
        flags=re.IGNORECASE,
    )
    return len(remainder.strip()) < MIN_H2_PROSE_CHARS // 2


def _substantive_h2_count(body: str) -> int:
    count = 0
    for _title, chunk in _h2_blocks(body):
        prose_in_chunk = [ln for ln in chunk if _is_prose_line(ln)]
        if sum(len(ln) for ln in prose_in_chunk) >= MIN_H2_PROSE_CHARS:
            count += 1
    return count


def _h2_blocks(body: str) -> list[tuple[str, list[str]]]:
    """Split body into (h2_title, lines_until_next_h2) including ### content."""
    lines = body.splitlines()
    blocks: list[tuple[str, list[str]]] = []
    i = 0
    while i < len(lines):
        m = re.match(r"^##\s+(.+)$", lines[i].strip())
        if not m:
            i += 1
            continue
        title = m.group(1).strip()
        j = i + 1
        chunk: list[str] = []
        while j < len(lines):
            if re.match(r"^##\s+", lines[j].strip()):
                break
            chunk.append(lines[j])
            j += 1
        blocks.append((title, chunk))
        i = j if j > i else i + 1
    return blocks


@dataclass
class SectionQualityReport:
    section_id: str
    prose_line_count: int = 0
    placeholder_ratio: float = 0.0
    empty_h2_count: int = 0
    thin_h2_count: int = 0
    duplicate_h1: bool = False
    fail_reasons: list[str] = field(default_factory=list)
    gap_kind: GapKind = "none"
    ok: bool = True

    def to_dict(self) -> dict:
        return {
            "section_id": self.section_id,
            "prose_line_count": self.prose_line_count,
            "placeholder_ratio": round(self.placeholder_ratio, 3),
            "empty_h2_count": self.empty_h2_count,
            "thin_h2_count": self.thin_h2_count,
            "duplicate_h1": self.duplicate_h1,
            "fail_reasons": self.fail_reasons,
            "gap_kind": self.gap_kind,
            "ok": self.ok,
        }


def detect_evidence_gap_sections(manifest_path: Path | None = None) -> frozenset[str]:
    """Sections likely thin due to missing Agent1 evidence (not fixable by regen alone)."""
    gaps = set(_EVIDENCE_GAP_SECTIONS)
    if manifest_path and manifest_path.is_file():
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            for sec in data.get("sections", []):
                if sec.get("id") == "E" and sec.get("chunk_count", 0) == 0:
                    gaps.add("UseOfProceeds")
                    gaps.add("ShareCapital")
        except (json.JSONDecodeError, OSError):
            pass
    return frozenset(gaps)


def analyze_section_quality(
    body: str,
    section_id: str,
    *,
    manifest_path: Path | None = None,
) -> SectionQualityReport:
    report = SectionQualityReport(section_id=section_id)
    raw = (body or "").strip()
    if not raw:
        report.ok = False
        report.fail_reasons.append("empty_body")
        report.gap_kind = "GENERATION_GAP"
        return report

    text = strip_verification_notes(raw).strip()

    if still_contains_thinking(text):
        report.ok = False
        report.fail_reasons.append("contains_thinking")
        report.gap_kind = "GENERATION_GAP"
        return report

    lines = [ln for ln in text.splitlines() if ln.strip()]
    prose_lines = [ln for ln in lines if _is_prose_line(ln)]
    content_lines = [ln for ln in lines if _is_content_line(ln)]
    placeholder_lines = [ln for ln in lines if _is_placeholder_dominated_line(ln)]

    report.prose_line_count = len(prose_lines)
    report.placeholder_ratio = len(placeholder_lines) / max(len(lines), 1)
    report.duplicate_h1 = bool(re.match(r"^#\s+[A-Z][A-Z0-9\s,&()\-/'\"]+$", text, re.M))

    empty_h2 = 0
    thin_h2 = 0
    for _title, chunk in _h2_blocks(text):
        prose_in_chunk = [ln for ln in chunk if _is_prose_line(ln)]
        if not prose_in_chunk:
            empty_h2 += 1
            continue
        # DATA_MISSING + explanation counts as substance (full line length).
        if sum(len(ln) for ln in prose_in_chunk) < MIN_H2_PROSE_CHARS:
            thin_h2 += 1
    report.empty_h2_count = empty_h2
    report.thin_h2_count = thin_h2

    if section_id in _EXEMPT_SECTIONS:
        return report

    evidence_gaps = detect_evidence_gap_sections(manifest_path)
    if section_id in evidence_gaps:
        report.gap_kind = "EVIDENCE_GAP"

    substantive_h2 = _substantive_h2_count(text)
    has_enough_content = (
        len(content_lines) >= MIN_PROSE_LINES
        or substantive_h2 >= MIN_PROSE_LINES
        or (
            substantive_h2 >= 6
            and len(content_lines) >= 10
            and report.thin_h2_count == 0
            and report.empty_h2_count == 0
        )
    )

    if not has_enough_content:
        report.fail_reasons.append(f"prose_line_count<{MIN_PROSE_LINES}")
    if report.placeholder_ratio > MAX_PLACEHOLDER_RATIO:
        report.fail_reasons.append(f"placeholder_ratio>{MAX_PLACEHOLDER_RATIO}")
    if report.empty_h2_count >= MAX_EMPTY_H2:
        report.fail_reasons.append(f"empty_h2_count>={MAX_EMPTY_H2}")
    if report.thin_h2_count >= MAX_THIN_H2:
        report.fail_reasons.append(f"thin_h2_count>={MAX_THIN_H2}")

    if report.fail_reasons:
        report.ok = False
        if report.gap_kind == "none":
            report.gap_kind = "GENERATION_GAP"

    return report


def section_quality_ok(
    body: str,
    section_id: str,
    *,
    manifest_path: Path | None = None,
) -> bool:
    return analyze_section_quality(body, section_id, manifest_path=manifest_path).ok


def quality_score(report: SectionQualityReport) -> float:
    """Higher is better (for comparing two drafts of the same section)."""
    if not (report.section_id in _EXEMPT_SECTIONS):
        if report.fail_reasons:
            return report.prose_line_count * (1.0 - report.placeholder_ratio)
    return report.prose_line_count + 1000.0
