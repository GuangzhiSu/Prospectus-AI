"""Section splitting: deterministic candidate detection + LLM normalization."""

from __future__ import annotations

import json
from pathlib import Path

import structlog

from .client_factory import create_pipeline_llm_client
from .config import PipelineConfig
from .llm_protocol import PipelineLLMClient
from .pdf_extract import ExtractedDocument
from .prompts import load_prompt
from .schemas import DocumentSections, SectionRecord, HeadingNormalizationOutput

logger = structlog.get_logger()

# Max chars per section for LLM context (excerpt)
MAX_SECTION_CHARS = 24_000


def _get_heading_schema() -> dict:
    """JSON schema for heading normalization response."""
    s = HeadingNormalizationOutput.model_json_schema()
    return {"name": "heading_normalization", "strict": True, "schema": s}


def normalize_heading_with_llm(raw_heading: str, canonical_list: list[str], client: PipelineLLMClient) -> str:
    """Call LLM to map raw heading to canonical section name."""
    prompt = load_prompt(
        "heading_normalization",
        raw_heading=raw_heading,
        canonical_sections="\n".join(f"- {x}" for x in canonical_list),
    )
    messages = [{"role": "user", "content": prompt}]
    # Use response_format for structured output; OpenAI expects json_schema with specific shape
    schema = _get_heading_schema()
    try:
        resp = client.create_response(
            messages,
            response_format=schema,
            response_format_type="json_schema",
        )
    except Exception as e:
        logger.warning("heading_normalization_failed", raw=raw_heading, error=str(e))
        return "Other"
    parsed = resp.get("parsed")
    if not parsed:
        return "Other"
    name = parsed.get("section_name_canonical") or "Other"
    if name not in canonical_list:
        name = "Other"
    return name


def split_document_into_sections(
    doc: ExtractedDocument,
    config: PipelineConfig,
    client: PipelineLLMClient | None = None,
) -> DocumentSections:
    """
    Deterministic split using heading candidates and page text; LLM normalizes each heading to canonical name.
    """
    if doc.status == "failed" or not doc.pages:
        return DocumentSections(document_id=doc.document_id, sections=[])

    canonical = list(config.canonical_sections)
    if client is None:
        client = create_pipeline_llm_client(config)

    # Build (page, heading_text, level) for level-1 headings only (main sections)
    breakpoints: list[tuple[int, str]] = []  # (page_1_index, raw_heading)
    for i, page in enumerate(doc.pages):
        for h in page.heading_candidates:
            if h.level == 1:
                breakpoints.append((i, h.text.strip()))

    if not breakpoints:
        # Fallback: treat whole doc as one section
        full_text = "\n\n".join(p.text for p in doc.pages)
        return DocumentSections(
            document_id=doc.document_id,
            sections=[
                SectionRecord(
                    section_name_raw="Full Document",
                    section_name_canonical="Other",
                    start_page=doc.pages[0].page_number if doc.pages else 1,
                    end_page=doc.pages[-1].page_number if doc.pages else 1,
                    text=full_text[:MAX_SECTION_CHARS * 2],
                )
            ],
        )

    sections: list[SectionRecord] = []
    for idx, (page_idx, raw_heading) in enumerate(breakpoints):
        start_page = doc.pages[page_idx].page_number
        if idx + 1 < len(breakpoints):
            end_page_idx = breakpoints[idx + 1][0]
            end_page = doc.pages[end_page_idx].page_number
            # text from page_idx to end_page_idx - 1
            text_parts = [doc.pages[i].text for i in range(page_idx, end_page_idx)]
        else:
            end_page = doc.pages[-1].page_number
            text_parts = [doc.pages[i].text for i in range(page_idx, len(doc.pages))]
        text = "\n\n".join(text_parts)
        if len(text) > MAX_SECTION_CHARS:
            text = text[:MAX_SECTION_CHARS] + "\n\n[... truncated ...]"
        canonical_name = normalize_heading_with_llm(raw_heading, canonical, client)
        sections.append(
            SectionRecord(
                section_name_raw=raw_heading,
                section_name_canonical=canonical_name,
                start_page=start_page,
                end_page=end_page,
                text=text,
            )
        )

    return DocumentSections(document_id=doc.document_id, sections=sections)


def run_section_splitting(
    extracted_dir: Path,
    sections_dir: Path,
    config: PipelineConfig,
) -> list[Path]:
    """Load extracted JSON per doc, run section split, save to sections_dir. Returns list of written paths."""
    sections_dir.mkdir(parents=True, exist_ok=True)
    client = create_pipeline_llm_client(
        config,
        save_raw_dir=sections_dir / "raw_responses",
    )
    written: list[Path] = []
    for path in sorted(extracted_dir.glob("*.json")):
        doc_id = path.stem
        out_path = sections_dir / f"{doc_id}.json"
        if out_path.exists():
            logger.info("skip_sections_exists", document_id=doc_id)
            written.append(out_path)
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            doc = ExtractedDocument.model_validate(data)
        except Exception as e:
            logger.warning("load_extracted_failed", path=str(path), error=str(e))
            continue
        result = split_document_into_sections(doc, config, client)
        out_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        written.append(out_path)
        logger.info("sections_saved", document_id=doc_id, num_sections=len(result.sections))
    return written
