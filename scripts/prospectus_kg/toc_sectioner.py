"""Split Exchange prospectus PDFs into complete, auditable section ground truth.

The original splitter trusted only level-1 PDF bookmarks, copied whole pages, and
silently capped every section at 60,000 characters.  That lost large portions of
the corpus and duplicated content whenever two headings shared a page.

This implementation keeps the deterministic bookmark-based approach while:

* selecting the bookmark level that actually contains prospectus sections (some
  PDFs wrap the real outline below one or two container bookmarks);
* resolving each bookmark to the visible heading position inside the page;
* slicing at character offsets, so same-page boundaries neither overlap nor gap;
* retaining the complete extracted text without any character cap; and
* recording boundary provenance and extraction metrics for corpus-wide audits.

No LLM is used.  Ambiguous boundaries fall back to the bookmark page start and
are surfaced in metadata instead of being hidden.
"""

from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

import fitz  # PyMuPDF
import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
_KNOWLEDGE_MODULE = _REPO_ROOT / "knowledge-module"
if str(_KNOWLEDGE_MODULE) not in sys.path:
    sys.path.insert(0, str(_KNOWLEDGE_MODULE))

from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer  # noqa: E402

log = structlog.get_logger()

_SHIFTED_ASCII_FONT_PREFIXES = (
    "MicrosoftYaHeiUI-Bold",
    "MicrosoftYaHeiUI-GBK",
)
_CONTROL_ONLY_FONT_PREFIXES = ("MyriadConceptRoman",)
_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]+")
_DOT_LEADER_RE = re.compile(r"(?:\x02|\ufffd)+")


@dataclass(frozen=True)
class _TocEntry:
    toc_index: int
    level: int
    raw_title: str
    page: int


@dataclass(frozen=True, order=True)
class _Position:
    """Zero-based page and character offset in the extracted page text."""

    page_index: int
    char_offset: int


@dataclass(frozen=True)
class _Boundary:
    position: _Position
    method: str
    confidence: float
    bookmark_page: int
    matched_page: int


@dataclass
class _Subsec:
    raw_title: str
    toc_index: int
    bookmark_page: int
    boundary: _Boundary | None = None


@dataclass
class _Sec:
    raw_title: str
    toc_index: int
    bookmark_page: int
    canonical: str | None
    confidence: float
    match_method: str
    boundary: _Boundary | None = None
    subsections: list[_Subsec] = field(default_factory=list)


def _resolve(norm: TitleNormalizer, raw: str) -> tuple[str | None, float, str]:
    result = norm.match_section(raw)
    return result.canonical_name, float(result.confidence), result.match_method or "none"


def _valid_toc_entries(toc: list[list[Any]], total_pages: int) -> list[_TocEntry]:
    entries: list[_TocEntry] = []
    for index, item in enumerate(toc):
        if len(item) < 3:
            continue
        try:
            level = int(item[0])
            page = int(item[2])
        except (TypeError, ValueError):
            continue
        title = str(item[1] or "").strip()
        if title and level > 0 and 1 <= page <= total_pages:
            entries.append(_TocEntry(index, level, title, page))
    return entries


def _select_section_level(
    entries: list[_TocEntry], normalizer: TitleNormalizer
) -> int | None:
    """Choose the outline level containing the actual top-level prospectus sections.

    A PDF assembled from other PDFs can have container bookmarks at level 1 or 2,
    while COVER / SUMMARY / BUSINESS live at level 3.  The old level-1-only rule
    therefore returned zero sections for an otherwise valid 662-page prospectus.
    """

    scores: list[tuple[int, int, int, int]] = []
    for level in sorted({entry.level for entry in entries}):
        level_entries = [entry for entry in entries if entry.level == level]
        matches = [normalizer.match_section(entry.raw_title) for entry in level_entries]
        matched = [result for result in matches if result.canonical_name]
        distinct = len({result.canonical_name for result in matched})
        # Number of recognized headings dominates.  Distinct canonical sections
        # breaks ties in favor of a true chapter level over repeated subheadings.
        scores.append((len(matched), distinct, len(level_entries), -level))
    if not scores:
        return None
    best = max(scores)
    if best[0] < 3:
        return None
    return -best[3]


def _build_sections(
    toc: list[list[Any]], total_pages: int, norm: TitleNormalizer
) -> tuple[list[_Sec], int | None, list[_TocEntry]]:
    entries = _valid_toc_entries(toc, total_pages)
    section_level = _select_section_level(entries, norm)
    if section_level is None:
        return [], None, entries

    section_entries = [entry for entry in entries if entry.level == section_level]
    sections: list[_Sec] = []
    for index, entry in enumerate(section_entries):
        canonical, confidence, method = _resolve(norm, entry.raw_title)
        next_toc_index = (
            section_entries[index + 1].toc_index
            if index + 1 < len(section_entries)
            else len(toc)
        )
        descendants = [
            child
            for child in entries
            if entry.toc_index < child.toc_index < next_toc_index
            and child.level > section_level
        ]
        child_level = min((child.level for child in descendants), default=None)
        subsections = [
            _Subsec(child.raw_title, child.toc_index, child.page)
            for child in descendants
            if child.level == child_level
        ]
        sections.append(
            _Sec(
                raw_title=entry.raw_title,
                toc_index=entry.toc_index,
                bookmark_page=entry.page,
                canonical=canonical,
                confidence=confidence,
                match_method=method,
                subsections=subsections,
            )
        )
    return sections, section_level, entries


def _load_pages_from_extracted(extracted_json: Path) -> dict[int, str] | None:
    """Load page_number -> text from a previously extracted JSON when available."""

    try:
        data = json.loads(extracted_json.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    pages: dict[int, str] = {}
    for page in data.get("pages", []):
        page_number = page.get("page_number")
        if page_number is not None:
            pages[int(page_number)] = str(page.get("text") or "")
    return pages or None


def _sanitize_extracted_text(text: str) -> str:
    """Remove PDF layout glyph artifacts while retaining semantic text.

    Several Exchange PDFs encode table dot leaders as C0 control characters or
    U+FFFD.  They are layout, not missing prose, so normalize each run to a
    readable ellipsis and remove any remaining non-text control codes.
    """

    cleaned = _DOT_LEADER_RE.sub(" ... ", text)
    cleaned = _CONTROL_CHAR_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\n{4,}", "\n\n", cleaned)
    return cleaned


def _decode_shifted_ascii(text: str) -> str:
    """Decode a broken ToUnicode map used by two fonts in one HKEX filing.

    The embedded glyph codes are exactly 26 code points below their intended
    ASCII characters (``9KX\\U`` -> ``Servo``).  Whitespace and non-ASCII text
    are already correct and remain untouched.
    """

    decoded: list[str] = []
    for char in text:
        codepoint = ord(char)
        if char.isspace() or codepoint >= 128:
            decoded.append(char)
        else:
            decoded.append(chr(codepoint + 26))
    return "".join(decoded)


def _page_text_with_font_repairs(page: fitz.Page) -> tuple[str, dict[str, int]]:
    raw_text = page.get_text("text") or ""
    stats = {
        "raw_control_characters": sum(
            len(match.group(0)) for match in _CONTROL_CHAR_RE.finditer(raw_text)
        ),
        "raw_replacement_characters": raw_text.count("\ufffd"),
        "decoded_font_spans": 0,
        "omitted_control_font_spans": 0,
    }
    page_fonts = {font[3] for font in page.get_fonts(full=False)}
    needs_span_repair = any(
        any(prefix in font for prefix in _SHIFTED_ASCII_FONT_PREFIXES)
        for font in page_fonts
    ) or any(
        any(prefix in font for prefix in _CONTROL_ONLY_FONT_PREFIXES)
        for font in page_fonts
    )
    if not needs_span_repair:
        return _sanitize_extracted_text(raw_text), stats

    block_texts: list[str] = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type", 0) != 0:
            continue
        line_texts: list[str] = []
        for line in block.get("lines", []):
            span_texts: list[str] = []
            for span in line.get("spans", []):
                text = str(span.get("text") or "")
                font = str(span.get("font") or "")
                if any(
                    font.startswith(prefix) for prefix in _SHIFTED_ASCII_FONT_PREFIXES
                ):
                    text = _decode_shifted_ascii(text)
                    stats["decoded_font_spans"] += 1
                elif any(
                    font.startswith(prefix) for prefix in _CONTROL_ONLY_FONT_PREFIXES
                ):
                    visible = sum(
                        ord(char) >= 32 or char in "\n\r\t" for char in text
                    )
                    if text and visible / len(text) < 0.35:
                        stats["omitted_control_font_spans"] += 1
                        continue
                span_texts.append(text)
            line_texts.append("".join(span_texts))
        block_texts.append("\n".join(line_texts))
    return _sanitize_extracted_text("\n".join(block_texts)), stats


def extract_pdf_pages(pdf_path: Path) -> tuple[dict[int, str], dict[str, int]]:
    """Extract cleaned page text plus auditable font-repair counters."""

    document = fitz.open(pdf_path)
    try:
        pages: dict[int, str] = {}
        totals = {
            "raw_control_characters": 0,
            "raw_replacement_characters": 0,
            "decoded_font_spans": 0,
            "omitted_control_font_spans": 0,
        }
        for index in range(len(document)):
            text, stats = _page_text_with_font_repairs(document[index])
            pages[index + 1] = text
            for key, value in stats.items():
                totals[key] += value
        return pages, totals
    finally:
        document.close()


def _load_pages_from_pdf(pdf_path: Path) -> dict[int, str]:
    pages, _stats = extract_pdf_pages(pdf_path)
    return pages


def _compact_with_offsets(text: str) -> tuple[str, list[int]]:
    """Return an alphanumeric comparison string and source offset per character."""

    compact: list[str] = []
    offsets: list[int] = []
    for source_index, char in enumerate(text):
        normalized = unicodedata.normalize("NFKD", char).casefold()
        for normalized_char in normalized:
            if normalized_char.isalnum():
                compact.append(normalized_char)
                offsets.append(source_index)
    return "".join(compact), offsets


def _candidate_offsets(page_text: str, title: str) -> list[int]:
    title_compact, _ = _compact_with_offsets(title)
    if len(title_compact) < 3:
        return []

    # A bookmark title must resolve to a heading-shaped line (or a short group
    # of wrapped lines), never to the same words embedded in prose.  Searching
    # a fully compacted page previously made a one-word heading such as
    # ``BUSINESS`` match "business opportunities" midway through the first
    # paragraph and silently assigned the paragraph prefix to the prior section.
    lines = list(re.finditer(r"[^\n]+", page_text))
    normalized_title = unicodedata.normalize("NFKC", title).casefold().strip()
    line_parts: list[tuple[int, str, bool]] = []
    for line in lines:
        leading = len(line.group(0)) - len(line.group(0).lstrip())
        stripped = line.group(0).lstrip()
        compact, _ = _compact_with_offsets(stripped)
        normalized_line = unicodedata.normalize("NFKC", stripped).casefold()
        colon_prefixed = normalized_line.startswith(normalized_title) and (
            normalized_line[len(normalized_title) :].lstrip().startswith((":", "："))
        )
        line_parts.append((line.start() + leading, compact, colon_prefixed))
    found: list[int] = []
    max_window = min(8, max(1, len(_title_tokens(title)) + 1))
    for line_index, (offset, compact, colon_prefixed) in enumerate(line_parts):
        if colon_prefixed:
            found.append(offset)
            continue
        if not compact:
            continue
        candidate_compact = ""
        for width in range(1, max_window + 1):
            part_index = line_index + width - 1
            if part_index >= len(line_parts):
                break
            candidate_compact += line_parts[part_index][1]
            if candidate_compact == title_compact:
                found.append(offset)
                break
            if len(candidate_compact) > len(title_compact):
                break
    return found


_PAGE_NUMBER_LINE_RE = re.compile(
    r"^\s*[\-–—]?\s*(?:\d+|[ivxlcdm]+)\s*[\-–—]?\s*$", re.IGNORECASE
)


def _is_running_header_at_page_end(page_text: str, offset: int) -> bool:
    """Detect PDFs whose visual page header is extracted after the body.

    In these files the bookmark correctly targets the first page of a chapter,
    but PyMuPDF emits ``BUSINESS`` followed by ``– 140 –`` at the end of the
    text stream.  Starting there would discard the whole first page.  The page
    number immediately following a late standalone title distinguishes this
    layout from a real chapter heading near the bottom of a page.
    """

    if not page_text or offset < len(page_text) * 0.65:
        return False
    following_lines = [
        line.strip() for line in page_text[offset:].splitlines()[1:] if line.strip()
    ]
    return bool(
        following_lines
        and len(following_lines) <= 2
        and _PAGE_NUMBER_LINE_RE.fullmatch(following_lines[0])
    )


def _title_tokens(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKD", text).casefold()
    return re.findall(r"[a-z0-9]+", normalized)


def _fuzzy_heading_offset(page_text: str, title: str) -> tuple[int, float] | None:
    """Find a wrapped/slightly edited heading among the first page lines."""

    target = _title_tokens(title)
    if not target:
        return None
    lines = list(re.finditer(r"[^\n]+", page_text))[:80]
    best: tuple[float, int] | None = None
    max_window = min(6, max(1, len(target) + 1))
    for line_index in range(len(lines)):
        for width in range(1, max_window + 1):
            window = lines[line_index : line_index + width]
            if not window:
                continue
            candidate = _title_tokens(" ".join(match.group(0) for match in window))
            if not candidate:
                continue
            target_set = set(target)
            candidate_set = set(candidate)
            coverage = len(target_set & candidate_set) / len(target_set)
            excess = max(0, len(candidate) - len(target)) / max(1, len(target))
            sequence = " ".join(candidate)
            expected = " ".join(target)
            # A lightweight similarity measure without an optional dependency.
            import difflib

            ratio = difflib.SequenceMatcher(None, sequence, expected).ratio()
            score = (coverage * 0.55) + (ratio * 0.45) - min(0.25, excess * 0.08)
            if best is None or score > best[0]:
                best = (score, window[0].start())
    # Bookmark labels are sometimes abbreviated (for example omitting
    # "Registrar of Companies in Hong Kong") while the visible heading is
    # longer.  At the bookmarked page a 0.78 score remains conservative and
    # correctly resolves those official HKEX variants.
    if best and best[0] >= 0.78:
        return best[1], min(0.94, best[0])
    return None


def _resolve_heading_boundary(
    pages: dict[int, str],
    title: str,
    bookmark_page: int,
    total_pages: int,
    *,
    minimum: _Position | None = None,
) -> _Boundary:
    """Resolve a bookmark to its visible heading, searching at most one page away."""

    candidate_pages = [bookmark_page]
    if bookmark_page > 1:
        candidate_pages.append(bookmark_page - 1)
    if bookmark_page < total_pages:
        candidate_pages.append(bookmark_page + 1)

    exact: list[tuple[int, int, int]] = []
    for page_number in candidate_pages:
        page_text = pages.get(page_number, "")
        for offset in _candidate_offsets(page_text, title):
            position = _Position(page_number - 1, offset)
            if minimum is not None and position < minimum:
                continue
            page_distance = abs(page_number - bookmark_page)
            # Prefer the bookmark page, then an earlier occurrence on that page.
            exact.append((page_distance, offset, page_number))
    if exact:
        _distance, offset, page_number = min(exact)
        if page_number == bookmark_page and _is_running_header_at_page_end(
            pages.get(page_number, ""), offset
        ):
            return _Boundary(
                position=_Position(page_number - 1, 0),
                method="running_header_page_start",
                confidence=0.98,
                bookmark_page=bookmark_page,
                matched_page=page_number,
            )
        return _Boundary(
            position=_Position(page_number - 1, offset),
            method="heading_exact",
            confidence=1.0 if page_number == bookmark_page else 0.96,
            bookmark_page=bookmark_page,
            matched_page=page_number,
        )

    fuzzy: list[tuple[float, int, int, int]] = []
    for page_number in candidate_pages:
        match = _fuzzy_heading_offset(pages.get(page_number, ""), title)
        if match is None:
            continue
        offset, confidence = match
        position = _Position(page_number - 1, offset)
        if minimum is not None and position < minimum:
            continue
        fuzzy.append(
            (
                -confidence,
                abs(page_number - bookmark_page),
                offset,
                page_number,
            )
        )
    if fuzzy:
        neg_confidence, _distance, offset, page_number = min(fuzzy)
        return _Boundary(
            position=_Position(page_number - 1, offset),
            method="heading_fuzzy",
            confidence=round(-neg_confidence, 4),
            bookmark_page=bookmark_page,
            matched_page=page_number,
        )

    fallback = _Position(max(0, bookmark_page - 1), 0)
    if minimum is not None and fallback < minimum:
        fallback = minimum
    return _Boundary(
        position=fallback,
        method="bookmark_page_start",
        confidence=0.0,
        bookmark_page=bookmark_page,
        matched_page=fallback.page_index + 1,
    )


def _resolve_section_boundaries(
    sections: list[_Sec], pages: dict[int, str], total_pages: int
) -> None:
    previous: _Position | None = None
    for index, section in enumerate(sections):
        boundary = _resolve_heading_boundary(
            pages,
            section.raw_title,
            section.bookmark_page,
            total_pages,
            minimum=previous,
        )
        # Preserve all front matter before the first bookmark.  For normal PDFs
        # this is the cover; for reconstructed legacy PDFs it may be image-only.
        if index == 0:
            boundary = _Boundary(
                position=_Position(0, 0),
                method=(
                    "document_start+" + boundary.method
                    if boundary.position != _Position(0, 0)
                    else boundary.method
                ),
                confidence=boundary.confidence,
                bookmark_page=boundary.bookmark_page,
                matched_page=boundary.matched_page,
            )
        section.boundary = boundary
        previous = boundary.position


def _slice_pages(
    pages: dict[int, str], start: _Position, end: _Position, total_pages: int
) -> str:
    """Slice text from ``start`` (inclusive) to ``end`` (exclusive)."""

    if end < start:
        return ""
    if start.page_index == end.page_index:
        page_text = pages.get(start.page_index + 1, "")
        return page_text[start.char_offset : end.char_offset]

    parts: list[str] = []
    first_text = pages.get(start.page_index + 1, "")
    parts.append(first_text[start.char_offset :])
    final_page_index = min(end.page_index, total_pages)
    for page_index in range(start.page_index + 1, final_page_index):
        parts.append(pages.get(page_index + 1, ""))
    if end.page_index < total_pages and end.char_offset > 0:
        parts.append(pages.get(end.page_index + 1, "")[: end.char_offset])
    return "\n\n".join(parts)


def _page_end_for_span(end: _Position, total_pages: int) -> int:
    if end.page_index >= total_pages:
        return total_pages
    return end.page_index + (1 if end.char_offset > 0 else 0)


def _iter_all_boundaries(sections: Iterable[_Sec]) -> Iterable[_Boundary]:
    for section in sections:
        if section.boundary is not None:
            yield section.boundary
        for subsection in section.subsections:
            if subsection.boundary is not None:
                yield subsection.boundary


def split_document(
    pdf_path: Path,
    *,
    extracted_json: Path | None,
    normalizer: TitleNormalizer,
    max_chars_per_section: int | None = None,
    max_chars_per_subsection: int | None = None,
) -> dict[str, Any]:
    """Return a complete ParsedDocument-shaped dict for one PDF.

    ``max_chars_*`` are retained only for call compatibility and intentionally
    ignored.  Ground-truth text must never be truncated.
    """

    del max_chars_per_section, max_chars_per_subsection
    document = fitz.open(pdf_path)
    try:
        total_pages = len(document)
        toc = document.get_toc()
    finally:
        document.close()

    sections, section_level, _entries = _build_sections(toc, total_pages, normalizer)
    pages = _load_pages_from_extracted(extracted_json) if extracted_json else None
    extraction_stats = {
        "raw_control_characters": 0,
        "raw_replacement_characters": 0,
        "decoded_font_spans": 0,
        "omitted_control_font_spans": 0,
    }
    if pages is None or len(pages) != total_pages:
        pages, extraction_stats = extract_pdf_pages(pdf_path)
    else:
        raw_pages = pages
        extraction_stats["raw_control_characters"] = sum(
            sum(len(match.group(0)) for match in _CONTROL_CHAR_RE.finditer(text))
            for text in raw_pages.values()
        )
        extraction_stats["raw_replacement_characters"] = sum(
            text.count("\ufffd") for text in raw_pages.values()
        )
        pages = {
            page_number: _sanitize_extracted_text(text)
            for page_number, text in raw_pages.items()
        }

    _resolve_section_boundaries(sections, pages, total_pages)
    document_end = _Position(total_pages, 0)
    output_sections: list[dict[str, Any]] = []
    for order, section in enumerate(sections):
        assert section.boundary is not None
        next_boundary = (
            sections[order + 1].boundary
            if order + 1 < len(sections)
            else None
        )
        end = next_boundary.position if next_boundary is not None else document_end
        section_text = _slice_pages(pages, section.boundary.position, end, total_pages)

        subsection_output: list[dict[str, Any]] = []
        previous_subsection: _Position = section.boundary.position
        for subsection in section.subsections:
            subsection.boundary = _resolve_heading_boundary(
                pages,
                subsection.raw_title,
                subsection.bookmark_page,
                total_pages,
                minimum=previous_subsection,
            )
            if subsection.boundary.position > end:
                subsection.boundary = _Boundary(
                    position=end,
                    method="clamped_to_parent_end",
                    confidence=0.0,
                    bookmark_page=subsection.bookmark_page,
                    matched_page=end.page_index + 1,
                )
            previous_subsection = subsection.boundary.position

        for subsection_index, subsection in enumerate(section.subsections):
            assert subsection.boundary is not None
            subsection_end = (
                section.subsections[subsection_index + 1].boundary.position
                if subsection_index + 1 < len(section.subsections)
                and section.subsections[subsection_index + 1].boundary is not None
                else end
            )
            subsection_text = _slice_pages(
                pages, subsection.boundary.position, subsection_end, total_pages
            )
            subsection_output.append(
                {
                    "document_id": pdf_path.stem,
                    "source_file": pdf_path.name,
                    "raw_title": subsection.raw_title,
                    "normalized_title": normalizer.normalize_text(subsection.raw_title),
                    "canonical_section": None,
                    "canonical_subsection": None,
                    "level": (section_level or 1) + 1,
                    "page_start": subsection.boundary.position.page_index + 1,
                    "page_end": _page_end_for_span(subsection_end, total_pages),
                    "order_index": subsection_index,
                    "text": subsection_text,
                    "parent_title": section.raw_title,
                    "confidence": subsection.boundary.confidence,
                    "boundary_method": subsection.boundary.method,
                    "boundary_char_offset": subsection.boundary.position.char_offset,
                    "bookmark_page": subsection.bookmark_page,
                    "subsections": [],
                }
            )

        output_sections.append(
            {
                "document_id": pdf_path.stem,
                "source_file": pdf_path.name,
                "raw_title": section.raw_title,
                "normalized_title": normalizer.normalize_text(section.raw_title),
                "canonical_section": section.canonical,
                "canonical_subsection": None,
                "level": 1,
                "page_start": section.boundary.position.page_index + 1,
                "page_end": _page_end_for_span(end, total_pages),
                "order_index": order,
                "text": section_text,
                "parent_title": None,
                "confidence": section.confidence,
                "match_method": section.match_method,
                "boundary_method": section.boundary.method,
                "boundary_confidence": section.boundary.confidence,
                "boundary_char_offset": section.boundary.position.char_offset,
                "bookmark_page": section.bookmark_page,
                "matched_heading_page": section.boundary.matched_page,
                "subsections": subsection_output,
            }
        )

    boundaries = list(_iter_all_boundaries(sections))
    source_characters = sum(len(text) for text in pages.values())
    section_characters = sum(len(section["text"]) for section in output_sections)
    empty_pages = [number for number, text in pages.items() if not text.strip()]
    return {
        "document_id": pdf_path.stem,
        "source_file": pdf_path.name,
        "sections": output_sections,
        "chunks": [],
        "metadata": {
            "total_pages": total_pages,
            "toc_entries": len(toc),
            "toc_section_level": section_level,
            "toc_entries_level1": sum(1 for entry in toc if entry and entry[0] == 1),
            "toc_entries_level2": sum(1 for entry in toc if entry and entry[0] == 2),
            "splitter": "toc_v3_line_anchored_boundaries_full_text",
            "source_characters": source_characters,
            "section_characters": section_characters,
            "empty_pages": empty_pages,
            "boundary_exact": sum(
                boundary.method.endswith("heading_exact") for boundary in boundaries
            ),
            "boundary_fuzzy": sum(
                boundary.method.endswith("heading_fuzzy") for boundary in boundaries
            ),
            "boundary_fallback": sum(
                boundary.method == "bookmark_page_start" for boundary in boundaries
            ),
            "boundary_running_header": sum(
                boundary.method == "running_header_page_start"
                for boundary in boundaries
            ),
            "unmapped_sections": sum(
                section["canonical_section"] is None for section in output_sections
            ),
            "contains_truncation_marker": False,
            "text_extractor": "pymupdf_span_aware_v2",
            **extraction_stats,
        },
    }


def run(
    pdf_dir: Path,
    extracted_dir: Path | None,
    out_dir: Path,
    *,
    limit: int | None = None,
    resume: bool = True,
) -> dict[str, Any]:
    """Split every PDF in ``pdf_dir`` and write JSON files to ``out_dir``."""

    out_dir.mkdir(parents=True, exist_ok=True)
    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if limit:
        pdf_files = pdf_files[:limit]
    normalizer = TitleNormalizer(fuzzy_cutoff=0.78)

    written: list[str] = []
    skipped: list[str] = []
    failures: list[dict[str, Any]] = []
    documents_without_sections: list[str] = []
    total_sections = 0
    total_characters = 0

    started = time.time()
    for index, pdf_path in enumerate(pdf_files, 1):
        output_path = out_dir / f"{pdf_path.stem}.json"
        if resume and output_path.exists() and output_path.stat().st_size > 0:
            skipped.append(pdf_path.stem)
            continue
        extracted_json = (
            extracted_dir / f"{pdf_path.stem}.json" if extracted_dir else None
        )
        try:
            parsed = split_document(
                pdf_path,
                extracted_json=extracted_json,
                normalizer=normalizer,
            )
            output_path.write_text(
                json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            written.append(pdf_path.stem)
            total_sections += len(parsed["sections"])
            total_characters += int(parsed["metadata"]["section_characters"])
            if not parsed["sections"]:
                documents_without_sections.append(pdf_path.stem)
            log.info(
                "toc_sectioned",
                doc=pdf_path.stem,
                sections=len(parsed["sections"]),
                idx=index,
                total=len(pdf_files),
            )
        except Exception as exc:  # noqa: BLE001
            log.exception("toc_section_failed", doc=pdf_path.stem, error=str(exc))
            failures.append({"doc": pdf_path.stem, "error": str(exc)})

    summary = {
        "stage": "stage0_toc_sectioning_v3",
        "pdf_dir": str(pdf_dir),
        "out_dir": str(out_dir),
        "written": len(written),
        "skipped": len(skipped),
        "failures": failures,
        "documents_without_sections": documents_without_sections,
        "sections_written": total_sections,
        "characters_written": total_characters,
        "elapsed_seconds": round(time.time() - started, 2),
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return summary


def remap_existing(out_dir: Path) -> dict[str, Any]:
    """Refresh canonical mappings without repeating expensive PDF extraction."""

    normalizer = TitleNormalizer(fuzzy_cutoff=0.78)
    files = sorted(path for path in out_dir.glob("*.json") if not path.name.startswith("_"))
    changed_documents = 0
    changed_sections = 0
    remaining_unmapped = 0
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        document_changed = False
        for section in data.get("sections", []):
            result = normalizer.match_section(str(section.get("raw_title") or ""))
            before = (
                section.get("canonical_section"),
                section.get("confidence"),
                section.get("match_method"),
            )
            after = (
                result.canonical_name,
                float(result.confidence),
                result.match_method or "none",
            )
            if before != after:
                section["canonical_section"] = after[0]
                section["confidence"] = after[1]
                section["match_method"] = after[2]
                changed_sections += 1
                document_changed = True
            if result.canonical_name is None:
                remaining_unmapped += 1
        metadata = data.setdefault("metadata", {})
        metadata["unmapped_sections"] = sum(
            section.get("canonical_section") is None
            for section in data.get("sections", [])
        )
        if document_changed:
            changed_documents += 1
            path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
    return {
        "documents_scanned": len(files),
        "documents_changed": changed_documents,
        "sections_changed": changed_sections,
        "remaining_unmapped": remaining_unmapped,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Complete TOC-based prospectus sectioner with boundary audit metadata."
    )
    parser.add_argument("--pdf-dir", type=Path, default=Path("prospectus_corpus"))
    parser.add_argument(
        "--extracted-dir",
        type=Path,
        default=Path(
            "pipeline-module/ipo_prospectus_pipeline/outputs_prospectus_qwen/extracted"
        ),
    )
    parser.add_argument(
        "--out-dir", type=Path, default=Path("prospectus_kg_output/sections_toc")
    )
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument(
        "--remap-existing",
        action="store_true",
        help="Refresh canonical title mappings in --out-dir without re-reading PDFs.",
    )
    arguments = parser.parse_args()

    if arguments.remap_existing:
        result = remap_existing(arguments.out_dir)
    else:
        result = run(
            arguments.pdf_dir,
            arguments.extracted_dir if arguments.extracted_dir.exists() else None,
            arguments.out_dir,
            limit=arguments.limit,
            resume=not arguments.no_resume,
        )
    print(json.dumps(result, indent=2, ensure_ascii=False))
