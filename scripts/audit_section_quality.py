#!/usr/bin/env python3
"""Audit Agent2 section files for title-only / thin content."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agent2 import SECTIONS, _section_body_from_file  # noqa: E402
from section_quality import analyze_section_quality, quality_score  # noqa: E402


def _section_file(out_path: Path, section_id: str) -> Path | None:
    for path in out_path.glob("section_*.md"):
        if f"section_{section_id}_" in path.name:
            return path
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit section draft quality.")
    parser.add_argument("--output-dir", default="agent2_output")
    parser.add_argument("--rag-dir", default="agent1_output")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    args = parser.parse_args()

    out_path = (ROOT / args.output_dir).resolve()
    manifest_path = (ROOT / args.rag_dir / "manifest.json").resolve()

    reports = []
    failed_gen: list[str] = []
    failed_evidence: list[str] = []
    evidence_gap_ok: list[str] = []

    for sid, sname in SECTIONS:
        if sid == "Contents":
            continue
        path = _section_file(out_path, sid)
        if not path:
            rep = analyze_section_quality("", sid, manifest_path=manifest_path)
            rep.ok = False
            rep.fail_reasons.append("missing_file")
            rep.gap_kind = "GENERATION_GAP"
        else:
            body = _section_body_from_file(path.read_text(encoding="utf-8"))
            rep = analyze_section_quality(body, sid, manifest_path=manifest_path)
        reports.append(rep)
        if not rep.ok:
            if rep.gap_kind == "EVIDENCE_GAP":
                failed_evidence.append(sid)
            else:
                failed_gen.append(sid)
        elif rep.gap_kind == "EVIDENCE_GAP":
            evidence_gap_ok.append(sid)

    if args.json:
        print(
            json.dumps(
                {
                    "failed_generation": failed_gen,
                    "failed_evidence_gap": failed_evidence,
                    "sections": [r.to_dict() for r in reports],
                },
                indent=2,
            )
        )
    else:
        print(f"Manifest: {manifest_path}")
        print(f"Output:   {out_path}\n")
        for rep in reports:
            status = "OK" if rep.ok else "FAIL"
            gap = f" [{rep.gap_kind}]" if not rep.ok else ""
            reasons = ", ".join(rep.fail_reasons) if rep.fail_reasons else "-"
            print(
                f"{status:4} {rep.section_id:25} prose={rep.prose_line_count:3} "
                f"ph_ratio={rep.placeholder_ratio:.2f} empty_h2={rep.empty_h2_count} "
                f"thin_h2={rep.thin_h2_count} dup_h1={rep.duplicate_h1}{gap}  ({reasons})"
            )
        print()
        if failed_gen:
            print("Regenerate (GENERATION_GAP):", ", ".join(failed_gen))
        if failed_evidence:
            print("Evidence missing (EVIDENCE_GAP — add Agent1 data):", ", ".join(failed_evidence))
        if evidence_gap_ok:
            print(
                "Thin but acceptable (EVIDENCE_GAP — Agent1 Section E empty):",
                ", ".join(evidence_gap_ok),
            )
        if not failed_gen and not failed_evidence:
            print("All sections pass quality checks.")

    return 1 if failed_gen else 0


if __name__ == "__main__":
    raise SystemExit(main())
