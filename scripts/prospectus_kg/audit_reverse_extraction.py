#!/usr/bin/env python3
"""Audit reverse-engineered prospectus input records.

The reverse-engineering pipeline is useful only if extracted values are
traceable and shaped like original data-room inputs. This script audits the
Stage 3 records for:

- field fill rates by section;
- legacy naked values that lack page/span provenance;
- values that should have been null_reasons ("not disclosed", "no explicit...");
- object/list/table coverage for schedule-heavy fields.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


BAD_VALUE_RE = re.compile(
    r"\b(no explicit|not explicitly|not disclosed|not provided|not mentioned|"
    r"does not contain|absent from|cannot be determined)\b",
    re.IGNORECASE,
)


def _empty(value: Any) -> bool:
    return value in (None, "", [], {})


def _is_traceable(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and "value" in value
        and bool(value.get("source_file"))
        and value.get("page_start") is not None
    )


def _shape(value: Any) -> str:
    if _empty(value):
        return "null"
    if isinstance(value, dict) and "value" in value:
        return f"traceable_{_shape(value.get('value'))}"
    if isinstance(value, list):
        if value and all(isinstance(x, dict) for x in value):
            return "table"
        return "list"
    if isinstance(value, dict):
        return "object"
    return "scalar"


def _bad_value(value: Any) -> bool:
    if isinstance(value, dict) and "value" in value:
        return _bad_value(value.get("value"))
    if isinstance(value, str):
        return bool(BAD_VALUE_RE.search(value))
    if isinstance(value, list):
        return any(_bad_value(v) for v in value)
    if isinstance(value, dict):
        return any(_bad_value(v) for v in value.values())
    return False


def _iter_section_values(record: dict[str, Any]):
    for section_key, fields in (record.get("record") or {}).items():
        if not isinstance(fields, dict):
            continue
        section = section_key.removeprefix("section_")
        for field_id, value in fields.items():
            yield section, field_id, value


def audit(records_dir: Path) -> dict[str, Any]:
    files = sorted(records_dir.glob("*.json"))
    section_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "docs": 0,
            "fields": 0,
            "filled": 0,
            "traceable": 0,
            "legacy": 0,
            "bad_value_patterns": 0,
            "shapes": Counter(),
            "examples": [],
        }
    )
    doc_stats: list[dict[str, Any]] = []
    totals = Counter()

    for path in files:
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        doc_counter = Counter()
        touched_sections: set[str] = set()
        for section, field_id, value in _iter_section_values(record):
            stats = section_stats[section]
            touched_sections.add(section)
            totals["fields"] += 1
            stats["fields"] += 1
            stats["shapes"][_shape(value)] += 1
            if not _empty(value):
                totals["filled"] += 1
                stats["filled"] += 1
                doc_counter["filled"] += 1
                if _is_traceable(value):
                    totals["traceable"] += 1
                    stats["traceable"] += 1
                else:
                    totals["legacy"] += 1
                    stats["legacy"] += 1
                    if len(stats["examples"]) < 5:
                        stats["examples"].append(
                            {
                                "doc_id": path.stem,
                                "field_id": field_id,
                                "issue": "legacy_no_page_span",
                                "value_preview": str(value)[:180],
                            }
                        )
                if _bad_value(value):
                    totals["bad_value_patterns"] += 1
                    stats["bad_value_patterns"] += 1
                    if len(stats["examples"]) < 5:
                        stats["examples"].append(
                            {
                                "doc_id": path.stem,
                                "field_id": field_id,
                                "issue": "absence_phrase_in_value",
                                "value_preview": str(value)[:180],
                            }
                        )
        for section in touched_sections:
            section_stats[section]["docs"] += 1
        doc_stats.append(
            {
                "doc_id": path.stem,
                "filled_fields": doc_counter["filled"],
            }
        )

    sections = []
    for section, stats in sorted(section_stats.items()):
        fields = stats["fields"] or 1
        filled = stats["filled"] or 0
        traceable = stats["traceable"] or 0
        sections.append(
            {
                "section": section,
                "docs": stats["docs"],
                "fields": stats["fields"],
                "filled": filled,
                "fill_rate": round(filled / fields, 4),
                "traceable": traceable,
                "traceable_rate_of_filled": round(traceable / max(filled, 1), 4),
                "legacy": stats["legacy"],
                "bad_value_patterns": stats["bad_value_patterns"],
                "shapes": dict(stats["shapes"]),
                "examples": stats["examples"],
            }
        )
    sections.sort(key=lambda item: (item["traceable_rate_of_filled"], item["fill_rate"]))

    return {
        "records_dir": str(records_dir),
        "documents": len(files),
        "totals": {
            "fields": totals["fields"],
            "filled": totals["filled"],
            "fill_rate": round(totals["filled"] / max(totals["fields"], 1), 4),
            "traceable": totals["traceable"],
            "traceable_rate_of_filled": round(totals["traceable"] / max(totals["filled"], 1), 4),
            "legacy": totals["legacy"],
            "bad_value_patterns": totals["bad_value_patterns"],
        },
        "sections": sections,
        "docs_lowest_filled": sorted(doc_stats, key=lambda d: d["filled_fields"])[:10],
    }


def render_markdown(report: dict[str, Any], *, limit: int = 20) -> str:
    totals = report["totals"]
    lines = [
        "# Reverse Extraction Audit",
        "",
        f"- Documents: {report['documents']}",
        f"- Filled fields: {totals['filled']} / {totals['fields']} ({totals['fill_rate']:.1%})",
        f"- Traceable filled values: {totals['traceable']} / {max(totals['filled'], 1)} ({totals['traceable_rate_of_filled']:.1%})",
        f"- Legacy values without page/span: {totals['legacy']}",
        f"- Suspicious absence phrases inside values: {totals['bad_value_patterns']}",
        "",
        "## Lowest-Quality Sections",
        "",
        "| Section | Fill rate | Traceable / filled | Legacy | Bad value patterns |",
        "| :--- | ---: | ---: | ---: | ---: |",
    ]
    for item in report["sections"][:limit]:
        lines.append(
            f"| {item['section']} | {item['fill_rate']:.1%} | "
            f"{item['traceable_rate_of_filled']:.1%} | {item['legacy']} | "
            f"{item['bad_value_patterns']} |"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit reverse-engineered input records.")
    parser.add_argument("--records-dir", type=Path, default=Path("prospectus_kg_output/inputs/records"))
    parser.add_argument("--json-out", type=Path, default=None)
    parser.add_argument("--md-out", type=Path, default=None)
    args = parser.parse_args()

    report = audit(args.records_dir)
    print(json.dumps(report["totals"], ensure_ascii=False, indent=2))
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.md_out:
        args.md_out.parent.mkdir(parents=True, exist_ok=True)
        args.md_out.write_text(render_markdown(report), encoding="utf-8")


if __name__ == "__main__":
    main()
