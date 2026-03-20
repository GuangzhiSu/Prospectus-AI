"""CLI entrypoint: run full pipeline or individual stages with checkpointing and resume."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import structlog

from .config import load_config, PipelineConfig
from .pdf_extract import extract_from_pdf
from .section_split import run_section_splitting
from .subsection_split import run_subsection_splitting
from .datasets import run_build_datasets

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)
logger = structlog.get_logger()

STAGES = ("extract_text", "split_sections", "split_subsections", "build_datasets")


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def run_extract_text(input_dir: Path, output_dir: Path) -> list[Path]:
    """Extract text from all PDFs; save per-doc JSON. Skip if output already exists (resume)."""
    extracted_dir = _ensure_dir(output_dir / "extracted")
    written: list[Path] = []
    for pdf_path in sorted(input_dir.glob("*.pdf")):
        out_path = extracted_dir / f"{pdf_path.stem}.json"
        if out_path.exists():
            logger.info("skip_extracted", path=str(out_path))
            written.append(out_path)
            continue
        doc = extract_from_pdf(pdf_path)
        out_path.write_text(doc.model_dump_json(indent=2), encoding="utf-8")
        written.append(out_path)
        logger.info("extracted", document_id=doc.document_id, status=doc.status, pages=doc.total_pages)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="IPO Prospectus Pipeline")
    parser.add_argument("--input", "-i", default=None, help="Input folder of PDFs")
    parser.add_argument("--output", "-o", default=None, help="Output folder")
    parser.add_argument("--config", "-c", default=None, help="Path to YAML config")
    parser.add_argument(
        "--stage",
        choices=STAGES,
        default=None,
        help="Run only this stage (default: all)",
    )
    args = parser.parse_args()

    overrides = {}
    if args.input is not None:
        overrides["input_folder"] = args.input
    if args.output is not None:
        overrides["output_folder"] = args.output

    config = load_config(config_path=args.config, overrides=overrides)
    input_dir = Path(config.input_folder)
    output_dir = Path(config.output_folder)

    if not input_dir.exists():
        logger.error("input_dir_not_found", path=str(input_dir))
        raise SystemExit(1)

    stages_to_run: list[str]
    if args.stage:
        stages_to_run = [args.stage]
    else:
        stages_to_run = list(STAGES)
        if config.sections_only:
            stages_to_run = ["extract_text", "split_sections"]
        elif config.subsections_only:
            stages_to_run = ["extract_text", "split_sections", "split_subsections"]

    for stage in stages_to_run:
        logger.info("stage_start", stage=stage)
        if stage == "extract_text":
            run_extract_text(input_dir, output_dir)
        elif stage == "split_sections":
            extracted_dir = output_dir / "extracted"
            if not extracted_dir.exists():
                _ensure_dir(extracted_dir)
            run_section_splitting(extracted_dir, output_dir / "sections", config)
        elif stage == "split_subsections":
            run_subsection_splitting(
                output_dir / "sections",
                output_dir / "subsections",
                config.subsection_sections,
            )
        elif stage == "build_datasets":
            run_build_datasets(
                output_dir / "sections",
                output_dir / "subsections",
                output_dir,
                config,
            )
        logger.info("stage_done", stage=stage)


if __name__ == "__main__":
    main()
