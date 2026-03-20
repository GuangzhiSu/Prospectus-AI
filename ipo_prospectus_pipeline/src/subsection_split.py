"""Subsection splitting for key sections: deterministic split by level-2 headings or LLM if needed."""

from __future__ import annotations

import json
import re
from pathlib import Path

import structlog

from .schemas import DocumentSections, SectionRecord, SubsectionRecord

logger = structlog.get_logger()

# Subsection heading patterns (level-2 style)
SUBSECTION_PATTERNS = [
    re.compile(r"^(\d+\.\d+)\s+(.+)$"),   # 1.1 Title
    re.compile(r"^([a-z]\))\s+(.+)$", re.IGNORECASE),  # a) Title
    re.compile(r"^\(([a-z])\)\s+(.+)$", re.IGNORECASE),
    re.compile(r"^([ivxlcdm]+)\)\s+(.+)$", re.IGNORECASE),
]


def _is_subsection_heading(line: str) -> bool:
    for pat in SUBSECTION_PATTERNS:
        if pat.match(line.strip()):
            return True
    return False


def split_section_into_subsections(
    section: SectionRecord,
    document_id: str,
    key_sections: list[str],
) -> list[SubsectionRecord]:
    """
    If section is in key_sections, split by subsection-style headings (deterministic).
    Otherwise return a single subsection with the full section text.
    """
    if section.section_name_canonical not in key_sections:
        return [
            SubsectionRecord(
                subsection_name=section.section_name_canonical,
                text=section.text,
                start_page=section.start_page,
                end_page=section.end_page,
            )
        ]

    lines = section.text.split("\n")
    subsections: list[SubsectionRecord] = []
    current_title = section.section_name_canonical
    current_lines: list[str] = []
    start_page = section.start_page
    end_page = section.start_page

    for line in lines:
        if _is_subsection_heading(line):
            if current_lines:
                text = "\n".join(current_lines).strip()
                if text:
                    subsections.append(
                        SubsectionRecord(
                            subsection_name=current_title,
                            text=text,
                            start_page=start_page,
                            end_page=end_page,
                        )
                    )
            # Parse new heading
            for pat in SUBSECTION_PATTERNS:
                m = pat.match(line.strip())
                if m:
                    current_title = m.group(2).strip() if m.lastindex >= 2 else line.strip()
                    break
            else:
                current_title = line.strip()
            current_lines = []
            start_page = section.start_page
            end_page = section.end_page
            continue
        current_lines.append(line)
        end_page = section.end_page

    if current_lines:
        text = "\n".join(current_lines).strip()
        if text:
            subsections.append(
                SubsectionRecord(
                    subsection_name=current_title,
                    text=text,
                    start_page=start_page,
                    end_page=end_page,
                )
            )

    if not subsections:
        subsections.append(
            SubsectionRecord(
                subsection_name=section.section_name_canonical,
                text=section.text,
                start_page=section.start_page,
                end_page=section.end_page,
            )
        )
    return subsections


def run_subsection_splitting(
    sections_dir: Path,
    subsections_dir: Path,
    key_sections: list[str],
) -> list[Path]:
    """Load section JSON per doc, split key sections into subsections, save to subsections_dir."""
    subsections_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for path in sorted(sections_dir.glob("*.json")):
        if path.name.startswith("raw_"):
            continue
        doc_id = path.stem
        out_path = subsections_dir / f"{doc_id}.json"
        if out_path.exists():
            logger.info("skip_subsections_exists", document_id=doc_id)
            written.append(out_path)
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            doc_sections = DocumentSections.model_validate(data)
        except Exception as e:
            logger.warning("load_sections_failed", path=str(path), error=str(e))
            continue
        all_subs: list[dict] = []
        for sec in doc_sections.sections:
            for sub in split_section_into_subsections(sec, doc_id, key_sections):
                all_subs.append({
                    "section_name": sec.section_name_canonical,
                    "subsection_name": sub.subsection_name,
                    "text": sub.text,
                    "start_page": sub.start_page,
                    "end_page": sub.end_page,
                })
        out_path.write_text(json.dumps({"document_id": doc_id, "subsections": all_subs}, indent=2), encoding="utf-8")
        written.append(out_path)
        logger.info("subsections_saved", document_id=doc_id, num_subsections=len(all_subs))
    return written
