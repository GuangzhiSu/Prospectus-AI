"""Quality checks: empty sections, duplicates, invalid JSON, missing target text, coverage."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from collections import defaultdict


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").strip().split("\n"):
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            rows.append({"__parse_error": line[:100]})
    return rows


def validate_section_dataset(rows: list[dict]) -> dict:
    report = {"total": len(rows), "empty_sections": 0, "missing_output_text": 0, "duplicate_keys": [], "by_section": defaultdict(int)}
    seen = set()
    for i, r in enumerate(rows):
        if "__parse_error" in r:
            continue
        key = (r.get("document_id"), r.get("section_name"))
        if key in seen:
            report["duplicate_keys"].append((i, key))
        seen.add(key)
        if not (r.get("output_text") or "").strip():
            report["missing_output_text"] += 1
        report["by_section"][r.get("section_name", "?")] += 1
    report["by_section"] = dict(report["by_section"])
    return report


def validate_subsection_dataset(rows: list[dict]) -> dict:
    report = {"total": len(rows), "missing_output_text": 0, "invalid": 0, "by_section": defaultdict(int)}
    for r in rows:
        if "__parse_error" in r:
            report["invalid"] += 1
            continue
        if not (r.get("output_text") or "").strip():
            report["missing_output_text"] += 1
        report["by_section"][r.get("section_name", "?")] += 1
    report["by_section"] = dict(report["by_section"])
    return report


def validate_data_to_text_dataset(rows: list[dict]) -> dict:
    report = {"total": len(rows), "missing_target_text": 0, "task_types": defaultdict(int), "invalid": 0}
    for r in rows:
        if "__parse_error" in r:
            report["invalid"] += 1
            continue
        if not (r.get("target_text") or "").strip():
            report["missing_target_text"] += 1
        report["task_types"][r.get("task_type", "?")] += 1
    report["task_types"] = dict(report["task_types"])
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", "-o", default="./outputs", help="Output folder containing *_dataset.jsonl")
    args = ap.parse_args()
    out = Path(args.output)

    print("Validation report\n" + "=" * 50)
    for name, fn in [
        ("section_dataset.jsonl", validate_section_dataset),
        ("subsection_dataset.jsonl", validate_subsection_dataset),
        ("data_to_text_dataset.jsonl", validate_data_to_text_dataset),
    ]:
        path = out / name
        if not path.exists():
            print(f"\n{name}: file not found")
            continue
        rows = load_jsonl(path)
        report = fn(rows)
        print(f"\n{name}: total={report['total']}")
        for k, v in report.items():
            if k in ("total", "by_section", "task_types"):
                continue
            if v:
                print(f"  {k}: {v}")
        if "by_section" in report and report["by_section"]:
            print("  coverage by section:", report["by_section"])
        if "task_types" in report and report["task_types"]:
            print("  task_types:", report["task_types"])


if __name__ == "__main__":
    main()
