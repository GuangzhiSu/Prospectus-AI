"""Turn PDF-layout text into readable, token-preserving RCA reference text.

PDFs encode visual lines, columns, and table cells rather than paragraphs.  A
plain extraction can therefore produce one word per line even though the source
page shows a normal sentence.  These helpers remove only *soft* line breaks:
the non-whitespace character stream is kept unchanged and table-dense pages keep
their row layout.
"""

from __future__ import annotations

import re
from collections.abc import Iterable


PAGE_NUMBER_LINE = re.compile(
    r"^(?:[-–—]\s*)?(?:\d+|[ivxlcdm]+)(?:\s*[-–—])?$", re.IGNORECASE
)
LIST_ITEM_LINE = re.compile(
    r"^(?:\(?\d+[.)]|\(?[a-z][.)]|\(?[ivxlcdm]+[.)]|[-•▪◦])\s+",
    re.IGNORECASE,
)
QUOTE_START = ("“", "”", '"', "‘", "’")
CONNECTOR_END = re.compile(
    r"(?:\b(?:and|or|of|to|in|under|see|the|a|an|headed|section)|[-–—])\s*$",
    re.IGNORECASE,
)
TECHNICAL_SECTION_IDS = {"Definitions", "Glossary_of_Technical_Terms"}


def _clean_line(line: str) -> str:
    return re.sub(r"[\t ]+", " ", line).strip()


def _join_lines(lines: Iterable[str]) -> str:
    """Join visual lines without changing their non-whitespace characters."""

    result = ""
    for raw in lines:
        line = _clean_line(raw)
        if not line:
            continue
        if not result:
            result = line
        elif result.endswith(("-", "‐", "‑")) and re.match(r"^[A-Za-z]", line):
            result += line
        elif re.search(r"[\u3400-\u9fff]$", result) and re.match(
            r"^[\u3400-\u9fff]", line
        ):
            result += line
        else:
            result += " " + line
    return result


def _is_running_heading(line: str, section_id: str) -> bool:
    normalized = re.sub(r"[^A-Za-z]", "", line).casefold()
    expected = re.sub(r"[^A-Za-z]", "", section_id).casefold()
    if normalized and normalized == expected:
        return True
    return normalized in {"definitions", "glossaryoftechnicalterms"}


def _is_page_furniture(line: str, section_id: str) -> bool:
    return bool(PAGE_NUMBER_LINE.fullmatch(line)) or _is_running_heading(
        line, section_id
    )


def _looks_like_quote_entry(line: str, previous_value_line: str | None) -> bool:
    if not line.startswith(QUOTE_START) or len(line) > 180:
        return False
    if previous_value_line and (
        previous_value_line.endswith((",", ";", ":"))
        or CONNECTOR_END.search(previous_value_line)
    ):
        return False
    return True


def _quoted_terms_text(text: str, section_id: str) -> str:
    """Format quoted Definitions/Glossary rows as term + readable definition."""

    lines = [_clean_line(line) for line in text.splitlines() if _clean_line(line)]
    output: list[str] = []
    intro: list[str] = []
    term: list[str] = []
    value: list[str] = []

    def flush_intro() -> None:
        if intro:
            output.append(_join_lines(intro))
            intro.clear()

    def flush_entry() -> None:
        if term:
            output.append(_join_lines(term))
            if value:
                output.append(_join_lines(value))
            term.clear()
            value.clear()

    index = 0
    while index < len(lines):
        line = lines[index]
        if _is_page_furniture(line, section_id):
            flush_intro()
            flush_entry()
            output.append(line)
            index += 1
            continue

        previous_value = value[-1] if value else None
        if _looks_like_quote_entry(line, previous_value):
            flush_intro()
            flush_entry()
            term.append(line)
            while not term[-1].endswith(("”", '"', "’")) and index + 1 < len(lines):
                if _is_page_furniture(lines[index + 1], section_id):
                    break
                index += 1
                term.append(lines[index])
            index += 1
            continue

        if term:
            value.append(line)
        else:
            intro.append(line)
        index += 1

    flush_intro()
    flush_entry()
    return "\n\n".join(item for item in output if item).strip()


def _looks_like_glossary_term(line: str, previous: str | None) -> bool:
    if len(line) > 64 or line.endswith((".", ",", ";", ":")):
        return False
    if LIST_ITEM_LINE.match(line) or PAGE_NUMBER_LINE.fullmatch(line):
        return False
    uppercase = sum(char.isupper() for char in line)
    acronym_like = uppercase >= 2 and len(line.split()) <= 5
    follows_sentence = bool(previous and previous.endswith((".", "?", "!")))
    return acronym_like or follows_sentence


def _unquoted_glossary_text(text: str, section_id: str) -> str:
    """Reflow glossary prose while retaining short unquoted term labels."""

    output: list[str] = []
    paragraph: list[str] = []
    previous: str | None = None

    def flush() -> None:
        nonlocal previous
        if paragraph:
            joined = _join_lines(paragraph)
            output.append(joined)
            previous = joined
            paragraph.clear()

    for raw in text.splitlines():
        line = _clean_line(raw)
        if not line:
            continue
        if _is_page_furniture(line, section_id):
            flush()
            output.append(line)
            previous = line
        elif _looks_like_glossary_term(line, previous or (paragraph[-1] if paragraph else None)):
            flush()
            output.append(line)
            previous = line
        else:
            paragraph.append(line)
    flush()
    return "\n\n".join(output).strip()


def _is_table_dense(lines: list[str]) -> bool:
    nonempty = [line for line in lines if line]
    if len(nonempty) < 8:
        return False
    numeric = sum(
        bool(
            re.fullmatch(
                r"(?:HK\$|RMB|US\$)?\s*[()\-—–]?\d[\d,.%()\-—–]*",
                line,
                re.IGNORECASE,
            )
        )
        for line in nonempty
    )
    dot_leaders = sum(bool(re.search(r"\.{3,}", line)) for line in nonempty)
    return numeric >= max(5, int(len(nonempty) * 0.14)) or dot_leaders >= 4


def _is_hard_prose_line(line: str, section_id: str) -> bool:
    if _is_page_furniture(line, section_id) or LIST_ITEM_LINE.match(line):
        return True
    letters = "".join(char for char in line if char.isalpha())
    return bool(letters) and len(line) <= 120 and letters == letters.upper()


def _reflow_prose_page(page: str, section_id: str) -> str:
    lines = [_clean_line(line) for line in page.splitlines() if _clean_line(line)]
    if not lines:
        return ""
    if _is_table_dense(lines):
        return "\n".join(lines)

    output: list[str] = []
    paragraph: list[str] = []

    def flush() -> None:
        if paragraph:
            output.append(_join_lines(paragraph))
            paragraph.clear()

    for line in lines:
        if _is_hard_prose_line(line, section_id):
            flush()
            output.append(line)
        else:
            paragraph.append(line)
    flush()
    return "\n\n".join(output).strip()


def reflow_reference_text(text: str, section_id: str) -> str:
    """Return readable reference text while preserving all semantic characters."""

    text = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        return ""
    if section_id in TECHNICAL_SECTION_IDS:
        quote_entries = sum(
            _clean_line(line).startswith(QUOTE_START) for line in text.splitlines()
        )
        if quote_entries >= 3:
            return _quoted_terms_text(text, section_id)
        if section_id == "Glossary_of_Technical_Terms":
            return _unquoted_glossary_text(text, section_id)

    pages = re.split(r"\n{2,}", text)
    return "\n\n".join(
        normalized
        for page in pages
        if (normalized := _reflow_prose_page(page, section_id))
    ).strip()


def non_whitespace_text(text: str) -> str:
    """Comparison representation used by the lossless reflow gate."""

    return re.sub(r"\s+", "", text)


def fragmented_line_runs(text: str, *, ignore_tables: bool = True) -> int:
    """Count suspicious runs of four or more one/two-word visual lines."""

    count = 0
    for page in re.split(r"\n{2,}", text):
        lines = [_clean_line(line) for line in page.splitlines() if _clean_line(line)]
        if ignore_tables and _is_table_dense(lines):
            continue
        run = 0
        for line in lines:
            words = re.findall(r"[A-Za-z0-9]+", line)
            fragment = (
                bool(line)
                and len(words) <= 2
                and len(line) <= 28
                and not PAGE_NUMBER_LINE.fullmatch(line)
                and not (line.isupper() and len(line) > 3)
            )
            if fragment:
                run += 1
            else:
                if run >= 4:
                    count += 1
                run = 0
        if run >= 4:
            count += 1
    return count
