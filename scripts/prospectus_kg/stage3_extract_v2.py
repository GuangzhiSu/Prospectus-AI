"""
Stage 3b v2: per-(document × section) reverse-engineering of issuer input records.

The v1 approach (single LLM call per doc, asking for the whole schema) produced mostly
null fields because the meta-schema ("registration certificate", etc.) describes
drafting-process source documents that rarely surface verbatim in a published prospectus.

v2 uses the content-grounded schema built in ``input_schema_sections.json`` (aggregated
from Stage 2 section cards) and extracts one small JSON object per (doc, section) pair,
then merges them into a per-doc record.

Outputs
-------
  prospectus_kg_output/inputs/input_records/<doc>/<section>.json   -- per-(doc, section)
  prospectus_kg_output/inputs/records/<doc>.json                   -- merged per-doc record
  prospectus_kg_output/inputs/input_dataset.jsonl                  -- aggregated dataset
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
sys.path.insert(0, str(_REPO_ROOT / "ipo_prospectus_pipeline" / "src"))

log = structlog.get_logger()


MIN_SECTION_CHARS = 300
MAX_SECTION_CHARS_DEFAULT = 6000

# Sections that historically under-filled (<40% in records/). Extra alias lines
# are injected into the prompt so the model can recognise paraphrases.
_UNDERFILLED_SECTIONS = {
    "Contractual_Arrangements_VIE",
    "Cover",
    "Financial_Information",
    "Regulatory_Overview",
    "Business",
    "Prospectus_and_Global_Offering_Information",
}

# Per-field alias lists. Keys are exact Schema B short `field_name`s; values are
# synonyms / regulatory phrasings that often appear verbatim in HK prospectuses.
_FIELD_ALIASES: dict[str, list[str]] = {
    # Cover ----------------------------------------------------------------
    "Corporate Structure": [
        "incorporated in the Cayman Islands with limited liability",
        "a company controlled through weighted voting rights",
        "redomiciled from",
        "exempted company",
    ],
    "Offering Type": [
        "Global Offering",
        "Hong Kong Public Offering",
        "International Offering",
        "Placing",
    ],
    "Issuer Name": ["Company Name", "the Company", "the Issuer", "Legal Name"],
    "Stock Exchange": ["listing on the Main Board of the Stock Exchange of Hong Kong Limited"],
    "Joint Sponsors": ["Sole Sponsor", "Sponsor", "Joint Sponsors", "Overall Coordinator"],
    # Financial Information ------------------------------------------------
    "Revenue": ["turnover", "total revenue", "net revenues", "sales", "revenues"],
    "Gross Profit Margin": ["gross margin", "gross margin percentage", "GP margin"],
    "Operating Income": ["operating profit", "profit from operations", "EBIT"],
    "Net Income": ["profit for the year", "profit attributable to owners", "net profit", "net earnings"],
    "Cash Flow": ["cash generated from operations", "net cash from operating activities", "free cash flow"],
    "Adjusted EBITDA": ["EBITDA", "Adjusted EBIT", "segment adjusted EBITDA"],
    "Debt Ratios": ["gearing ratio", "debt-to-equity", "current ratio", "quick ratio"],
    "Historical Financial Information": ["track record period", "three-year track record", "financial years ended"],
    # VIE ------------------------------------------------------------------
    "VIE Agreements": [
        "Contractual Arrangements", "Exclusive Business Cooperation Agreement",
        "Exclusive Option Agreement", "Equity Pledge Agreement", "Powers of Attorney",
        "Loan Agreement with the Registered Shareholders", "Spousal Consent Letters",
    ],
    "VIE Structure": [
        "WFOE", "Wholly Foreign-Owned Enterprise", "PRC Operating Entity",
        "Domestic Operating Company", "Variable Interest Entity", "contractual arrangements",
    ],
    "Registered Shareholders": ["Registered Shareholder", "PRC Shareholders", "Onshore Shareholders"],
    # Regulatory Overview --------------------------------------------------
    "Regulatory Bodies": [
        "CSRC", "SAMR", "MIIT", "CAC", "PBOC", "NDRC", "MOFCOM",
        "China Securities Regulatory Commission", "State Administration for Market Regulation",
        "Cyberspace Administration of China",
    ],
    "Licenses Required": [
        "ICP Licence", "Value-added Telecommunications Business Operating Licence",
        "Radio and Television Programme Production and Operation Permit",
        "Online Culture Operating Permit",
    ],
    "Compliance Requirements": [
        "Cybersecurity Law", "Personal Information Protection Law", "PIPL", "Data Security Law",
        "Measures for Cybersecurity Review",
    ],
    # Business -------------------------------------------------------------
    "Mission Statement": ["Our Mission", "Our Vision", "Our Purpose"],
    "Products Services": ["Our Products", "Principal Products", "Key Offerings", "Product Portfolio"],
    "Competitive Advantages": ["Our Strengths", "Competitive Strengths", "Key Strengths"],
    "Customers Markets": ["Our Customers", "Customer Base", "Target Markets", "End Customers"],
    "Growth Strategy": ["Our Strategies", "Growth Strategies", "Strategic Priorities"],
    # Prospectus & Global Offering Information -----------------------------
    "Offer Price Range": ["Offer Price", "Maximum Offer Price", "Indicative Offer Price"],
    "Number of Shares": ["Offer Shares", "Total Number of Shares being Offered", "Placing Shares"],
    "Use of Proceeds": ["Intended Use of Net Proceeds", "Application of Net Proceeds"],
    "Timetable": ["Expected Timetable", "Key Dates of the Global Offering", "Proposed Timetable"],
}

_FEWSHOT_EXAMPLES: list[dict[str, Any]] = [
    {
        "section_id": "Cover",
        "section_text_preview": (
            "SenseTime Group Inc. (a company controlled through weighted voting rights "
            "and incorporated in the Cayman Islands with limited liability). Stock code: 20. "
            "Sole Sponsor: China International Capital Corporation Hong Kong Securities Limited."
        ),
        "output": {
            "values": {
                "Issuer Name": {
                    "value": "SenseTime Group Inc.",
                    "span_preview": "SenseTime Group Inc. (a company controlled through weighted voting rights)",
                },
                "Corporate Structure": {
                    "value": "Incorporated in the Cayman Islands with limited liability; controlled through weighted voting rights.",
                    "span_preview": "a company controlled through weighted voting rights and incorporated in the Cayman Islands with limited liability",
                },
                "Joint Sponsors": {
                    "value": "China International Capital Corporation Hong Kong Securities Limited",
                    "span_preview": "Sole Sponsor: China International Capital Corporation Hong Kong Securities Limited",
                },
            },
            "null_reasons": {"Offering Type": "only 'Global Offering' stock code visible; no split between HK / International tranche in this excerpt"},
            "coverage_notes": "Cover page snapshot; further detail in Prospectus_and_Global_Offering_Information.",
        },
    }
]


def _load_section_schema(schema_path: Path) -> dict[str, list[dict[str, Any]]]:
    """Return {section_id: [field, ...]} from the per-section schema."""
    if not schema_path.exists():
        raise FileNotFoundError(f"Section schema not found: {schema_path}")
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    mapping: dict[str, list[dict[str, Any]]] = {}
    for cat in data.get("categories", []) or []:
        sid = (cat.get("maps_to_sections") or [cat.get("category_name")])[0]
        mapping[sid] = cat.get("fields") or []
    return mapping


def _section_prompt(
    doc_id: str,
    section_id: str,
    fields: list[dict[str, Any]],
    text: str,
) -> list[dict[str, Any]]:
    """Build a tight per-section extraction prompt.

    Emits a JSON envelope with explicit ``{value, span_preview}`` objects per
    field plus a ``null_reasons`` self-check. Callers are responsible for adding
    provenance (``source_file``, ``page_start``, ``page_end``) from section
    metadata after the call — the model cannot invent those.
    """
    field_lines = []
    short_names: list[str] = []
    for fld in fields:
        short = fld.get("field_name") or fld.get("field_id", "").split(".")[-1]
        short_names.append(short)
        desc = (fld.get("description") or "").replace("\n", " ").strip()
        if len(desc) > 120:
            desc = desc[:120] + "…"
        aliases = _FIELD_ALIASES.get(short) or []
        alias_str = f"  aliases: {aliases}" if aliases else ""
        field_lines.append(f"- {short}: {desc}{alias_str}")
    field_block = "\n".join(field_lines)

    is_underfilled = section_id in _UNDERFILLED_SECTIONS
    underfilled_hint = (
        "\nNote: this section is historically under-filled. Prefer to return a concrete "
        "value whenever the excerpt even paraphrases the field (see aliases). Only use "
        "null when the excerpt is genuinely silent."
        if is_underfilled
        else ""
    )

    example_block = json.dumps(_FEWSHOT_EXAMPLES[0]["output"], ensure_ascii=False, indent=2)

    system = (
        "You are an HKEX IPO analyst extracting structured inputs from a single prospectus "
        "section. For every field, either return a concrete value lifted from the text, or "
        "set it to null AND record why in `null_reasons`. Numbers and dates must be quoted "
        "verbatim. Aliases listed next to each field are the same concept in different words "
        "— treat them as triggers. Output one JSON object only."
    )
    user = (
        f"Document id: {doc_id}\n"
        f"Section: {section_id}\n"
        f"Underfilled-section mode: {is_underfilled}\n\n"
        "Fill each field below. Use the given field names as keys in `values`. "
        "Each non-null entry must be of shape {\"value\": <scalar or list>, "
        "\"span_preview\": <short quoted snippet, <=160 chars>}. "
        "If a field is truly absent, omit it from `values` and record `null_reasons[field] = "
        "<one-line reason>`. Do not invent additional keys.\n"
        f"{underfilled_hint}\n\n"
        "=== FIELDS (with aliases) ===\n"
        f"{field_block}\n\n"
        "=== SECTION TEXT ===\n"
        f"{text}\n\n"
        "=== EXAMPLE OUTPUT (illustrative only) ===\n"
        f"{example_block}\n\n"
        "Output shape:\n"
        "{\n"
        "  \"values\": {<field_name>: {\"value\": ..., \"span_preview\": \"...\"}, ...},\n"
        "  \"null_reasons\": {<field_name>: str},\n"
        "  \"coverage_notes\": str\n"
        "}\n"
        f"Field names must be exactly one of: {short_names}."
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _attach_provenance(
    parsed: dict[str, Any],
    sec: dict[str, Any],
) -> dict[str, Any]:
    """Attach ``source_file``, ``page_start``, ``page_end`` to every non-null entry.

    The model returns ``{value, span_preview}`` objects; this helper adds the
    deterministic provenance from section metadata so downstream consumers (Agent2,
    coverage matrix) can link every extracted value back to a PDF page range.
    """
    values = parsed.get("values")
    if not isinstance(values, dict):
        return parsed
    source_file = sec.get("source_file") or ""
    page_start = sec.get("page_start")
    page_end = sec.get("page_end")
    enriched: dict[str, Any] = {}
    for k, v in values.items():
        if v is None:
            enriched[k] = None
            continue
        if isinstance(v, dict):
            entry = {
                "value": v.get("value"),
                "source_file": source_file,
                "page_start": page_start,
                "page_end": page_end,
                "span_preview": (v.get("span_preview") or "")[:240],
            }
        else:
            entry = {
                "value": v,
                "source_file": source_file,
                "page_start": page_start,
                "page_end": page_end,
                "span_preview": "",
            }
        enriched[k] = entry
    parsed["values"] = enriched
    return parsed


def _merge_records(doc_id: str, per_section: dict[str, dict[str, Any]], section_fields: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Assemble a doc-level record keyed by ``section_<sid>`` / field_id.

    Values are passed through in whatever shape the extractor produced: either
    the new ``{value, source_file, page_start, page_end, span_preview}`` dict
    (preferred) or a legacy scalar (for back-compat with v1 caches).
    """
    record: dict[str, Any] = {}
    coverage: dict[str, str] = {}
    null_reasons: dict[str, dict[str, str]] = {}
    for sid, fields in section_fields.items():
        per_sec = per_section.get(sid) or {}
        values = per_sec.get("values") or {}
        notes = per_sec.get("coverage_notes") or ""
        reasons = per_sec.get("null_reasons") or {}
        sect_rec: dict[str, Any] = {}
        for fld in fields:
            short = fld.get("field_name") or fld.get("field_id", "").split(".")[-1]
            sect_rec[fld.get("field_id")] = (
                values.get(short) if isinstance(values, dict) else None
            )
        record[f"section_{sid}"] = sect_rec
        if notes:
            coverage[sid] = notes
        if reasons:
            null_reasons[sid] = reasons
    return {
        "document_id": doc_id,
        "record": record,
        "coverage_notes": coverage,
        "null_reasons": null_reasons,
    }


def _needs_reextraction(cached: dict[str, Any]) -> bool:
    """Return True if the cached entry pre-dates the evidence-pointer shape.

    Legacy caches stored bare scalars under ``values``; the new shape is always
    ``{value, source_file, page_start, page_end, span_preview}`` (or ``None``).
    When targeting under-filled sections we want to rerun legacy caches so they
    pick up both the wider aliases and the provenance pointers.
    """
    values = cached.get("values") if isinstance(cached, dict) else None
    if not isinstance(values, dict):
        return True
    for v in values.values():
        if v is None:
            continue
        if isinstance(v, dict) and "value" in v and "source_file" in v:
            continue
        return True
    return False


def _maybe_backup_records_dir(records_dir: Path) -> Path | None:
    """Before the first write of a rerun, snapshot ``records/`` beside itself.

    Returns the backup directory path (or ``None`` if there was nothing to
    back up). Idempotent: subsequent calls within the same run skip.
    """
    if not records_dir.exists():
        return None
    marker = records_dir.parent / f"{records_dir.name}.bak_stamp"
    if marker.exists():
        return None
    import shutil

    ts = int(time.time())
    backup = records_dir.parent / f"{records_dir.name}.bak_{ts}"
    shutil.copytree(records_dir, backup)
    marker.write_text(str(backup), encoding="utf-8")
    log.info("stage3b_v2_records_backed_up", backup=str(backup))
    return backup


def run(
    sections_dir: Path,
    schema_path: Path,
    out_dir: Path,
    *,
    resume: bool = True,
    only_doc: str | None = None,
    only_section: str | None = None,
    only_sections: list[str] | None = None,
    max_tokens: int = 1024,
    max_section_chars: int = MAX_SECTION_CHARS_DEFAULT,
    backup_records: bool = True,
) -> dict[str, Any]:
    from qwen_local_client import QwenLocalClient  # noqa: E402

    section_fields = _load_section_schema(schema_path)
    log.info("stage3b_v2_sections", count=len(section_fields))

    per_doc_section_dir = out_dir / "input_records"
    per_doc_section_dir.mkdir(parents=True, exist_ok=True)
    records_dir = out_dir / "records"
    records_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = out_dir / "qwen_raw_extract_v2"
    raw_dir.mkdir(parents=True, exist_ok=True)

    section_files = sorted([p for p in sections_dir.glob("*.json") if not p.name.startswith("_")])
    if only_doc:
        section_files = [f for f in section_files if f.stem == only_doc]

    # Combine the two section-filter knobs. Environment variable
    # STAGE3B_ONLY_SECTIONS may carry a comma-separated list for re-extraction
    # jobs targeting the under-filled sections.
    env_only = os.environ.get("STAGE3B_ONLY_SECTIONS", "").strip()
    section_filter: set[str] | None
    if only_sections:
        section_filter = set(only_sections)
    elif env_only:
        section_filter = {s.strip() for s in env_only.split(",") if s.strip()}
    elif only_section:
        section_filter = {only_section}
    else:
        section_filter = None

    if backup_records and section_filter is not None:
        # Only back up when we're about to write a targeted subset of sections
        # and the records dir already exists with legacy content.
        _maybe_backup_records_dir(records_dir)

    client = QwenLocalClient(
        max_tokens=max_tokens,
        temperature=0.0,
        save_raw_dir=raw_dir,
    )

    t0 = time.time()
    total_calls = 0
    cached_calls = 0
    failed_calls = 0

    for doc_idx, f in enumerate(section_files, 1):
        doc_id = f.stem
        try:
            doc = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            log.warning("stage3b_v2_doc_unreadable", doc=doc_id, error=str(exc))
            continue

        doc_section_dir = per_doc_section_dir / doc_id
        doc_section_dir.mkdir(parents=True, exist_ok=True)

        per_section: dict[str, dict[str, Any]] = {}
        t_doc = time.time()

        for sec in doc.get("sections", []):
            sid = sec.get("canonical_section")
            if not sid or sid not in section_fields:
                continue

            cache_path = doc_section_dir / f"{sid}.json"

            # Always load prior cache when present — this preserves values for
            # sections that sit outside ``section_filter`` during a targeted
            # re-extraction and would otherwise be wiped from the merged record.
            if cache_path.exists() and cache_path.stat().st_size > 0:
                try:
                    per_section[sid] = json.loads(cache_path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    pass

            if section_filter is not None and sid not in section_filter:
                if sid in per_section:
                    cached_calls += 1
                continue

            text = (sec.get("text") or "").strip()
            if len(text) < MIN_SECTION_CHARS:
                continue
            text = text[:max_section_chars]

            if resume and sid in per_section and not _needs_reextraction(per_section[sid]):
                cached_calls += 1
                continue

            messages = _section_prompt(doc_id, sid, section_fields[sid], text)
            try:
                resp = client.create_response(
                    messages=messages,
                    response_format={
                        "schema": {
                            "type": "object",
                            "required": ["values"],
                            "properties": {
                                "values": {"type": "object"},
                                "null_reasons": {"type": "object"},
                                "coverage_notes": {"type": "string"},
                            },
                        }
                    },
                    raw_save_id=f"{doc_id}__{sid}",
                )
            except Exception as exc:  # noqa: BLE001
                log.exception("stage3b_v2_call_failed", doc=doc_id, section=sid, error=str(exc))
                failed_calls += 1
                continue

            parsed = resp.get("parsed")
            if not isinstance(parsed, dict):
                parsed = {"values": {}, "null_reasons": {}, "coverage_notes": "parse_failed"}
            parsed = _attach_provenance(parsed, sec)
            cache_path.write_text(
                json.dumps(parsed, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            per_section[sid] = parsed
            total_calls += 1

        # Merge per-section into doc-level record.
        merged = _merge_records(doc_id, per_section, section_fields)
        (records_dir / f"{doc_id}.json").write_text(
            json.dumps(merged, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info(
            "stage3b_v2_doc_done",
            doc=doc_id,
            idx=doc_idx,
            total=len(section_files),
            sections=len(per_section),
            elapsed=round(time.time() - t_doc, 2),
        )

    # Aggregated dataset. Skip when a single-doc run is requested so that parallel
    # --only-doc workers don't race on the same output file.
    dataset_path = out_dir / "input_dataset.jsonl"
    if only_doc is None:
        with dataset_path.open("w", encoding="utf-8") as out_f:
            for rec_file in sorted(records_dir.glob("*.json")):
                try:
                    rec = json.loads(rec_file.read_text(encoding="utf-8"))
                    out_f.write(json.dumps(rec, ensure_ascii=False) + "\n")
                except json.JSONDecodeError:
                    continue

    summary = {
        "stage": "stage3b_extract_v2",
        "documents_processed": len(section_files),
        "llm_calls_new": total_calls,
        "llm_calls_cached": cached_calls,
        "llm_calls_failed": failed_calls,
        "dataset_path": str(dataset_path),
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (out_dir / "_extract_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 3b v2: per-(doc, section) input extraction.")
    ap.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    ap.add_argument(
        "--schema-path", type=Path,
        default=Path("prospectus_kg_output/inputs/input_schema_sections.json"),
    )
    ap.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/inputs"))
    ap.add_argument("--no-resume", action="store_true")
    ap.add_argument("--only-doc", type=str, default=None)
    ap.add_argument("--only-section", type=str, default=None)
    ap.add_argument(
        "--only-sections",
        type=str,
        default=None,
        help="Comma-separated list of canonical section ids to restrict re-extraction to.",
    )
    ap.add_argument("--max-tokens", type=int, default=1024)
    ap.add_argument("--max-section-chars", type=int, default=MAX_SECTION_CHARS_DEFAULT)
    ap.add_argument("--no-backup", action="store_true", help="Skip records/ backup on partial reruns.")
    args = ap.parse_args()

    only_sections = None
    if args.only_sections:
        only_sections = [s.strip() for s in args.only_sections.split(",") if s.strip()]

    summary = run(
        args.sections_dir,
        args.schema_path,
        args.out_dir,
        resume=not args.no_resume,
        only_doc=args.only_doc,
        only_section=args.only_section,
        only_sections=only_sections,
        max_tokens=args.max_tokens,
        max_section_chars=args.max_section_chars,
        backup_records=not args.no_backup,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
