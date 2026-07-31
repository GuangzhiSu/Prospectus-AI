"""
Expected Timetable: template render only. No LLM.

Strategy:
- If ipo_offering.timetable exists (application_open, application_close, allotment,
  results, trading_start): render a fixed-format table.
- Else: emit TODO placeholder. Never let LLM invent timetable content.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

TIMETABLE_KEYS = [
    "application_open",
    "application_close",
    "pricing",
    "allotment",
    "results",
    "trading_start",
]
TIMETABLE_LABELS = {
    "application_open": "Application opens",
    "application_close": "Application closes",
    "pricing": "Pricing",
    "allotment": "Allotment",
    "results": "Results and allotment announcement",
    "trading_start": "Expected trading commencement",
}


def _extract_timetable_from_facts(facts: list[dict[str, Any]]) -> dict[str, str]:
    """Build timetable dict from fact_store (ipo_offering.timetable.* or expected_listing_date)."""
    out: dict[str, str] = {}
    prefix = "ipo_offering.timetable."
    listing_date: str | None = None
    for f in facts:
        field = f.get("field", "")
        val = f.get("value")
        if val is None or not str(val).strip():
            continue
        if field == "ipo_offering.expected_listing_date":
            listing_date = str(val).strip()
        elif field.startswith(prefix):
            key = field[len(prefix) :].strip()
            if key in TIMETABLE_KEYS:
                out[key] = str(val).strip()
    if not out and listing_date:
        out["trading_start"] = listing_date
    return out


def _extract_timetable_from_json(data_dir: Path) -> dict[str, str]:
    """Load timetable from data/*.json ipo_offering.timetable or expected_listing_date."""
    out: dict[str, str] = {}
    listing_date: str | None = None
    for path in sorted(data_dir.glob("*.json")):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            continue
        ipo = data.get("ipo_offering")
        if not isinstance(ipo, dict):
            continue
        if not listing_date:
            v = ipo.get("expected_listing_date")
            if v is not None and str(v).strip():
                listing_date = str(v).strip()
        tt = ipo.get("timetable")
        if isinstance(tt, dict):
            for key in TIMETABLE_KEYS:
                v = tt.get(key)
                if v is not None and str(v).strip():
                    out[key] = str(v).strip()
    if not out and listing_date:
        out["trading_start"] = listing_date
    return out


def render_timetable_template(
    rag_dir: str | Path,
    *,
    data_dir: str | Path | None = None,
) -> str:
    """
    Render Expected Timetable section. Template only, no LLM.
    Returns markdown text for the section body.
    """
    rag_path = Path(rag_dir)
    timetable: dict[str, str] = {}

    # 1. Try fact_store
    fact_path = rag_path / "fact_store.jsonl"
    if fact_path.exists():
        facts: list[dict[str, Any]] = []
        with open(fact_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    facts.append(json.loads(line))
        timetable = _extract_timetable_from_facts(facts)

    # 2. Fallback: load from data/*.json if data_dir provided
    if not timetable and data_dir:
        timetable = _extract_timetable_from_json(Path(data_dir))

    # 3. No timetable data -> TODO placeholder
    if not timetable:
        return """[[AI:TODO|IPO timetable (application_open, application_close, allotment, results, trading_start) not provided in the documents. Obtain from offering documentation and render using template. Do not invent dates.]]"""

    # 4. Render table
    lines = [
        "The timetable below may be subject to change. The Company will publish any changes to the timetable in accordance with applicable requirements.",
        "",
        "| Event | Date / Time (Hong Kong time) |",
        "|-------|-----------------------------|",
    ]
    for key in TIMETABLE_KEYS:
        if key not in timetable:
            continue
        label = TIMETABLE_LABELS.get(key, key.replace("_", " ").title())
        val = timetable[key]
        lines.append(f"| {label} | {val} |")
    lines.extend([
        "",
        "All dates and times are Hong Kong time unless otherwise stated.",
    ])
    return "\n".join(lines)
