#!/usr/bin/env python
"""
End-to-end builder for the HKEX prospectus Knowledge Graph.

Stages
------
s0  Deterministic TOC-based sectioning of every PDF in ``hkex_prospectus/``.
s1  Structural KG: seed ontology + ingest instances + mine + refine + export ``docgraph.json``.
s2  Writing KG: generate per-canonical-section "section cards" (function / structure / rules /
    required input fields) via local Qwen; merge into graph.
s3a Input-schema KG: parse ``docs/IPO_Input_Report_CN.pdf`` into a structured schema.
s3b Input extraction: for every prospectus, reverse-engineer the input record implied by the
    schema and emit a dataset.
s4  Agent training artifacts: data_to_text_dataset.jsonl, section-card retriever index,
    updated agent2 section requirements.

Usage
-----
    python -m scripts.build_prospectus_kg --stages s0 s1 s2
    python -m scripts.build_prospectus_kg --stages all --resume
    python -m scripts.build_prospectus_kg --stages s2 --only-section Risk_Factors
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

log = structlog.get_logger()

ALL_STAGES = ["s0", "s1", "s2", "s3a", "s3b", "s4"]


def _stage0(args: argparse.Namespace) -> dict[str, Any]:
    from scripts.prospectus_kg.toc_sectioner import run as toc_run

    return toc_run(
        args.pdf_dir,
        args.extracted_dir if args.extracted_dir.exists() else None,
        args.sections_dir,
        limit=args.limit,
        resume=not args.no_resume,
    )


def _stage1(args: argparse.Namespace) -> dict[str, Any]:
    from scripts.prospectus_kg.stage1_structure import run as s1_run

    return s1_run(args.sections_dir, args.structure_dir)


def _stage2(args: argparse.Namespace) -> dict[str, Any]:
    from scripts.prospectus_kg.stage2_writing import run as s2_run

    return s2_run(
        args.sections_dir,
        args.structure_dir / "docgraph.json",
        args.writing_dir,
        samples_per_section=args.samples_per_section,
        chars_per_sample=args.chars_per_sample,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        resume=not args.no_resume,
        only_section=args.only_section,
    )


def _stage3a(args: argparse.Namespace) -> dict[str, Any]:
    from scripts.prospectus_kg.stage3_schema import run as s3a_run

    return s3a_run(args.input_report_pdf, args.inputs_dir)


def _stage3b(args: argparse.Namespace) -> dict[str, Any]:
    # Default to v2 (per-(doc, section) extraction against the section-grounded schema).
    # Set STAGE3B_VERSION=v1 to fall back to the single-call legacy path.
    version = os.environ.get("STAGE3B_VERSION", "v2").lower()
    if version == "v1":
        from scripts.prospectus_kg.stage3_extract import run as s3b_run

        return s3b_run(
            args.sections_dir,
            args.inputs_dir / "input_schema.json",
            args.inputs_dir,
            resume=not args.no_resume,
            only_doc=args.only_doc,
            max_tokens=args.max_tokens,
        )

    from scripts.prospectus_kg.stage3_extract_v2 import run as s3b_run

    return s3b_run(
        args.sections_dir,
        args.inputs_dir / "input_schema_sections.json",
        args.inputs_dir,
        resume=not args.no_resume,
        only_doc=args.only_doc,
        only_section=args.only_section,
        max_tokens=args.max_tokens,
    )


def _stage4(args: argparse.Namespace) -> dict[str, Any]:
    from scripts.prospectus_kg.stage4_export import run as s4_run

    agent2_path: Path | None = args.agent2_requirements
    if agent2_path is not None and str(agent2_path) in ("", "-"):
        agent2_path = None

    return s4_run(
        args.sections_dir,
        args.writing_dir,
        args.inputs_dir,
        args.finetune_dir,
        agent2_requirements_path=agent2_path,
    )


def _dispatch(stage: str, args: argparse.Namespace) -> dict[str, Any]:
    dispatch = {
        "s0": _stage0,
        "s1": _stage1,
        "s2": _stage2,
        "s3a": _stage3a,
        "s3b": _stage3b,
        "s4": _stage4,
    }
    fn = dispatch[stage]
    t0 = time.time()
    log.info("stage_start", stage=stage)
    try:
        result = fn(args)
    except FileNotFoundError as exc:
        log.error("stage_missing_input", stage=stage, error=str(exc))
        return {"stage": stage, "status": "missing_input", "error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        log.exception("stage_failed", stage=stage, error=str(exc))
        return {"stage": stage, "status": "error", "error": str(exc)}
    elapsed = round(time.time() - t0, 2)
    log.info("stage_done", stage=stage, elapsed=elapsed)
    return {"stage": stage, "status": "ok", "elapsed_seconds": elapsed, "detail": result}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument(
        "--stages", nargs="+", default=["all"],
        help=f"Subset of stages to run. Options: {ALL_STAGES + ['all']}",
    )
    ap.add_argument("--pdf-dir", type=Path, default=Path("hkex_prospectus"))
    ap.add_argument(
        "--extracted-dir", type=Path,
        default=Path("ipo_prospectus_pipeline/outputs_hkex_qwen/extracted"),
    )
    ap.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    ap.add_argument("--structure-dir", type=Path, default=Path("prospectus_kg_output/structure"))
    ap.add_argument("--writing-dir", type=Path, default=Path("prospectus_kg_output/writing"))
    ap.add_argument("--inputs-dir", type=Path, default=Path("prospectus_kg_output/inputs"))
    ap.add_argument("--finetune-dir", type=Path, default=Path("prospectus_kg_output/finetune"))
    ap.add_argument(
        "--input-report-pdf", type=Path,
        default=Path("docs/IPO_Input_Report_CN.pdf"),
        help="Path to the Chinese input-report PDF driving Stage 3a.",
    )
    ap.add_argument("--limit", type=int, default=None, help="Stage 0 PDF cap for quick runs.")
    ap.add_argument("--no-resume", action="store_true")
    ap.add_argument("--only-section", type=str, default=None, help="Stage 2 single-section run.")
    ap.add_argument("--only-doc", type=str, default=None, help="Stage 3b single-doc run.")
    ap.add_argument("--samples-per-section", type=int, default=3)
    ap.add_argument("--chars-per-sample", type=int, default=4500)
    ap.add_argument("--temperature", type=float, default=0.0)
    ap.add_argument("--max-tokens", type=int, default=4096)
    ap.add_argument(
        "--agent2-requirements",
        type=Path,
        default=Path("agent2_section_requirements.json"),
        help=(
            "Stage 4: path to the hand-authored agent2_section_requirements.json. "
            "KG-derived fields (kg_function, kg_required_input_fields, ...) are "
            "merged in-place; a .bak backup is kept. Pass '-' to skip."
        ),
    )
    args = ap.parse_args()

    stages = ALL_STAGES if args.stages == ["all"] else args.stages
    invalid = [s for s in stages if s not in ALL_STAGES]
    if invalid:
        raise SystemExit(f"Unknown stages: {invalid}. Valid: {ALL_STAGES}")

    results: list[dict[str, Any]] = []
    for stage in stages:
        results.append(_dispatch(stage, args))

    print(json.dumps({"orchestrator": "build_prospectus_kg", "runs": results}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
