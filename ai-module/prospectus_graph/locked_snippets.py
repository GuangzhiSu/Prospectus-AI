"""Load counsel placeholder locked blocks; inject into prompts for InfoProspectus / cover-style sections."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from prospectus_graph.issuer_metadata import mandatory_warning_snippet_ids

_DEFAULT = Path(__file__).with_name("locked_snippets.json")


def load_locked_snippets(path: Path | None = None) -> dict[str, Any]:
    p = path or _DEFAULT
    if not p.exists():
        return {"snippets": []}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def format_locked_snippets_for_section(
    section_id: str,
    meta: dict[str, bool],
    *,
    snippets_path: Path | None = None,
) -> str:
    """Full verbatim blocks for sections that host mandatory notices."""
    data = load_locked_snippets(snippets_path)
    by_id = {s["id"]: s for s in data.get("snippets", []) if isinstance(s, dict) and "id" in s}
    ids = mandatory_warning_snippet_ids(meta)
    if section_id != "InfoProspectus":
        return ""
    lines = [
        "LOCKED REGULATORY SNIPPETS (verbatim inside [[AI:LOCKED|...]] wrappers; do not paraphrase or expand):",
        "",
    ]
    for sid in ids:
        s = by_id.get(sid)
        if s:
            lines.append(s.get("body", ""))
            lines.append("")
    return "\n".join(lines).strip()
