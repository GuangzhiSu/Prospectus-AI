"""Strip model reasoning / thinking blocks from LLM output before saving or displaying."""

from __future__ import annotations

import re

# Qwen3 thinking delimiters (unicode escapes avoid markup parsing in tooling).
_END_REDACTED = "\u003c/redacted_thinking\u003e"
_END_THINKING = "\u003c/thinking\u003e"
_START_THINK = "\u003cthink"
_THINKING_END_TAGS = (_END_REDACTED, _END_THINKING)

_THINKING_PROCESS_HEADER_RE = re.compile(
    r"(?:^|\n)\s*Thinking Process:\s*\n",
    re.IGNORECASE,
)

_ORPHAN_END_TAG_LINE_RE = re.compile(
    rf"^\s*(?:{re.escape(_END_REDACTED)}|{re.escape(_END_THINKING)})\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Prospective section body starts (exclude Verification Notes meta blocks).
_PROSE_START_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"^#\s+\S", re.MULTILINE),
    re.compile(r"^##\s+(?!Verification Notes\b)", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^###\s+(?!Verification Notes\b)", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^\d+\s+[A-Za-z]", re.MULTILINE),
    re.compile(r"^##\s+\d+\s+\S", re.MULTILINE),
)

_THINKING_ONLY_PREFIX_RE = re.compile(
    r"^\s*(?:Thinking Process:|\d+\.\s+\*\*Analyze\b|"
    + re.escape(_START_THINK) + r")",
    re.IGNORECASE,
)


def _find_first_prose_start(text: str) -> int | None:
    """Index of the earliest line that looks like section prose, not meta-thinking."""
    best: int | None = None
    for pattern in _PROSE_START_PATTERNS:
        match = pattern.search(text)
        if match is not None and (best is None or match.start() < best):
            best = match.start()
    return best


def still_contains_thinking(text: str) -> bool:
    """True if text likely still contains model chain-of-thought."""
    if not text:
        return False
    if _THINKING_PROCESS_HEADER_RE.search(text):
        return True
    if _THINKING_ONLY_PREFIX_RE.match(text):
        return True
    lower = text.lower()
    return any(tag.lower() in lower for tag in _THINKING_END_TAGS)


def strip_model_reasoning(text: str) -> str:
    """Return only the post-reasoning answer portion of model output."""
    if not text:
        return ""

    cleaned = text.replace("\r\n", "\n")
    lower = cleaned.lower()

    # 1) XML-style thinking blocks: keep content after the last closing tag.
    for tag in _THINKING_END_TAGS:
        idx = lower.rfind(tag.lower())
        if idx >= 0:
            cleaned = cleaned[idx + len(tag) :]
            lower = cleaned.lower()

    cleaned = _ORPHAN_END_TAG_LINE_RE.sub("", cleaned)

    # 2) Prose "Thinking Process:" blocks (often without XML tags).
    tp = _THINKING_PROCESS_HEADER_RE.search(cleaned)
    if tp:
        after = cleaned[tp.end() :]
        prose_at = _find_first_prose_start(after)
        cleaned = after[prose_at:] if prose_at is not None else ""

    # 3) Other thinking-only prefixes without the explicit header.
    elif _THINKING_ONLY_PREFIX_RE.match(cleaned):
        prose_at = _find_first_prose_start(cleaned)
        if prose_at is not None and prose_at > 0:
            cleaned = cleaned[prose_at:]
        else:
            cleaned = ""

    return cleaned.lstrip()
