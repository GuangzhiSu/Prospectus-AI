"""
Unified machine-parseable AI tag schema for HKEX working drafts.
Validators use these patterns; writers must not invent alternate tag syntax.
"""

from __future__ import annotations

import re
from typing import Any

# Primary tags (pipe-separated key=value inside brackets)
TAG_LINE_RE = re.compile(
    r"\[\[AI:(?P<kind>CITE|XREF|VERIFY|LPD|LOCKED)\|(?P<body>[^\]]+)\]\]",
    re.IGNORECASE,
)

# Relaxed: any [[AI:...|...]]
ANY_AI_TAG_RE = re.compile(r"\[\[AI:[^\]]+\]\]", re.IGNORECASE)

CITE_KV_RE = re.compile(
    r"(source|doc|page|section|scope|metric|period|confidence|evidence)\s*=\s*([^;|]+)",
    re.IGNORECASE,
)


def parse_ai_tags(text: str) -> list[dict[str, Any]]:
    """Extract structured tag records from draft text."""
    out: list[dict[str, Any]] = []
    for m in TAG_LINE_RE.finditer(text or ""):
        kind = m.group("kind").upper()
        body = m.group("body").strip()
        record: dict[str, Any] = {"kind": kind, "raw": m.group(0)}
        if kind == "CITE":
            for km in CITE_KV_RE.finditer(body):
                key = km.group(1).lower()
                record[key] = km.group(2).strip()
        elif kind == "XREF":
            if "to=" in body.lower():
                for part in body.split(";"):
                    part = part.strip()
                    if part.lower().startswith("to="):
                        record["to"] = part.split("=", 1)[1].strip()
        elif kind == "LOCKED":
            record["body"] = body
        else:
            record["body"] = body
        out.append(record)
    return out


def cite_tag_well_formed(tag_inner: str) -> bool:
    """CITE tags should include source= and at least one of doc/page/section for traceability."""
    lower = tag_inner.lower()
    if "source=" not in lower:
        return False
    return any(k in lower for k in ("doc=", "page=", "section="))


def find_malformed_cite_tags(text: str) -> list[str]:
    """Return raw tag strings that look like CITE but fail schema."""
    bad: list[str] = []
    for m in TAG_LINE_RE.finditer(text or ""):
        if m.group("kind").upper() != "CITE":
            continue
        inner = m.group("body")
        if not cite_tag_well_formed(inner):
            bad.append(m.group(0))
    return bad


def find_unresolved_xref_tags(text: str) -> list[str]:
    """XREF tags with empty or placeholder `to=` are blockers."""
    unresolved: list[str] = []
    for m in TAG_LINE_RE.finditer(text or ""):
        if m.group("kind").upper() != "XREF":
            continue
        body = m.group("body")
        to_val = None
        for part in body.split(";"):
            part = part.strip()
            if part.lower().startswith("to="):
                to_val = part.split("=", 1)[1].strip()
                break
        if not to_val or to_val in ("TBD", "tbd", "?", "…", "..."):
            unresolved.append(m.group(0))
    return unresolved
