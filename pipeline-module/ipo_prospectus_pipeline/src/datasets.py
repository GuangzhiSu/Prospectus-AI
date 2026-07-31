"""Build section-level, subsection-level, and data-to-text JSONL datasets."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import structlog

from .config import PipelineConfig
from .extraction import (
    extract_section_structured,
    extract_financial_narrative,
    extract_risk_narrative,
)
from .client_factory import create_pipeline_llm_client
from .schemas import (
    SectionDatasetRow,
    SubsectionDatasetRow,
    DataToTextDatasetRow,
)

logger = structlog.get_logger()


def _evidence_list(parsed: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Convert extraction evidence to list of dicts."""
    if not parsed or "evidence" not in parsed:
        return []
    return [
        {"field_name": e.get("field_name"), "snippet": e.get("snippet"), "page": e.get("page")}
        for e in parsed["evidence"]
    ]


def build_section_dataset_row(
    document_id: str,
    section_name: str,
    section_text: str,
    source_pages: list[int],
    structured_facts: dict[str, Any] | None,
    document_metadata: dict[str, Any] | None,
) -> SectionDatasetRow:
    """Build one section-level dataset row."""
    input_obj = {
        "document_metadata": document_metadata or {},
        "structured_facts": structured_facts or {},
    }
    return SectionDatasetRow(
        document_id=document_id,
        section_name=section_name,
        input=input_obj,
        output_text=section_text,
        source_pages=source_pages,
    )


def build_subsection_dataset_row(
    document_id: str,
    section_name: str,
    subsection_name: str,
    subsection_text: str,
    source_pages: list[int],
    structured_facts: dict[str, Any] | None,
) -> SubsectionDatasetRow:
    """Build one subsection-level dataset row."""
    return SubsectionDatasetRow(
        document_id=document_id,
        section_name=section_name,
        subsection_name=subsection_name,
        input={"structured_facts": structured_facts or {}},
        output_text=subsection_text,
        source_pages=source_pages,
    )


def build_data_to_text_row(
    document_id: str,
    task_type: str,
    input_data: dict[str, Any],
    target_text: str,
    evidence: list[dict[str, Any]] | None = None,
) -> DataToTextDatasetRow:
    """Build one data-to-text dataset row."""
    return DataToTextDatasetRow(
        document_id=document_id,
        task_type=task_type,
        input_data=input_data,
        target_text=target_text,
        evidence=evidence or [],
    )


def run_build_datasets(
    sections_dir: Path,
    subsections_dir: Path,
    output_dir: Path,
    config: PipelineConfig,
) -> tuple[Path, Path, Path]:
    """
    Load sections and subsections, run extraction where needed, write the three JSONL files.
    Returns paths to section_dataset.jsonl, subsection_dataset.jsonl, data_to_text_dataset.jsonl.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    section_path = output_dir / "section_dataset.jsonl"
    subsection_path = output_dir / "subsection_dataset.jsonl"
    data_to_text_path = output_dir / "data_to_text_dataset.jsonl"

    client = create_pipeline_llm_client(
        config,
        save_raw_dir=output_dir / "raw_responses",
    )

    section_rows: list[SectionDatasetRow] = []
    subsection_rows: list[SubsectionDatasetRow] = []
    data_to_text_rows: list[DataToTextDatasetRow] = []

    # Load subsection data per doc (doc_id -> list of subsection dicts)
    subsections_by_doc: dict[str, list[dict]] = {}
    for path in subsections_dir.glob("*.json"):
        if path.name.startswith("raw_"):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            doc_id = data.get("document_id", path.stem)
            subsections_by_doc[doc_id] = data.get("subsections", [])
        except Exception as e:
            logger.warning("load_subsections_failed", path=str(path), error=str(e))

    for path in sorted(sections_dir.glob("*.json")):
        if path.name.startswith("raw_"):
            continue
        doc_id = path.stem
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            sections = data.get("sections", [])
        except Exception as e:
            logger.warning("load_sections_failed", path=str(path), error=str(e))
            continue

        doc_meta = {"document_id": doc_id}
        subsections_list = subsections_by_doc.get(doc_id, [])

        for sec in sections:
            sec_name = sec.get("section_name_canonical") or sec.get("section_name_raw", "")
            sec_text = sec.get("text", "")
            start = sec.get("start_page", 0)
            end = sec.get("end_page", 0)
            source_pages = list(range(start, end + 1)) if start and end else []

            # Structured extraction for this section (for section-level and data-to-text)
            structured = extract_section_structured(
                sec_name,
                sec_text,
                config,
                client=client,
                save_id=f"{doc_id}_{sec_name.replace(' ', '_')}"[:80],
            )

            # Section-level row
            section_rows.append(
                build_section_dataset_row(
                    document_id=doc_id,
                    section_name=sec_name,
                    section_text=sec_text,
                    source_pages=source_pages,
                    structured_facts=structured,
                    document_metadata=doc_meta,
                )
            )

            # Data-to-text rows by section type
            if sec_name == "Financial Information" and structured:
                data_to_text_rows.append(
                    build_data_to_text_row(
                        document_id=doc_id,
                        task_type="financial_narrative",
                        input_data=structured,
                        target_text=sec_text[:8000],
                        evidence=_evidence_list(structured),
                    )
                )
            elif sec_name == "Risk Factors" and structured:
                data_to_text_rows.append(
                    build_data_to_text_row(
                        document_id=doc_id,
                        task_type="risk_narrative",
                        input_data=structured,
                        target_text=sec_text[:8000],
                        evidence=_evidence_list(structured),
                    )
                )
            elif sec_name == "Business" and structured:
                data_to_text_rows.append(
                    build_data_to_text_row(
                        document_id=doc_id,
                        task_type="business_description",
                        input_data=structured,
                        target_text=sec_text[:8000],
                        evidence=_evidence_list(structured),
                    )
                )

            # Subsection-level rows for this section
            section_subs = [s for s in subsections_list if s.get("section_name") == sec_name]
            for sub in section_subs:
                sub_name = sub.get("subsection_name", "")
                sub_text = sub.get("text", "")
                sp = sub.get("start_page", start)
                ep = sub.get("end_page", end)
                sub_pages = list(range(sp, ep + 1)) if sp and ep else source_pages
                # Optional: run subsection-level extraction; here we use section-level facts for input
                sub_structured = structured
                subsection_rows.append(
                    build_subsection_dataset_row(
                        document_id=doc_id,
                        section_name=sec_name,
                        subsection_name=sub_name,
                        subsection_text=sub_text,
                        source_pages=sub_pages,
                        structured_facts=sub_structured,
                    )
                )

    # Write JSONL
    with open(section_path, "w", encoding="utf-8") as f:
        for row in section_rows:
            f.write(row.model_dump_json() + "\n")
    with open(subsection_path, "w", encoding="utf-8") as f:
        for row in subsection_rows:
            f.write(row.model_dump_json() + "\n")
    with open(data_to_text_path, "w", encoding="utf-8") as f:
        for row in data_to_text_rows:
            f.write(row.model_dump_json() + "\n")

    logger.info(
        "datasets_written",
        section_rows=len(section_rows),
        subsection_rows=len(subsection_rows),
        data_to_text_rows=len(data_to_text_rows),
        paths=[str(section_path), str(subsection_path), str(data_to_text_path)],
    )
    return section_path, subsection_path, data_to_text_path
