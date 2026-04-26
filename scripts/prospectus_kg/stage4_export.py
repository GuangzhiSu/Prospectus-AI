"""
Stage 4: emit agent-ready artifacts for fine-tuning / RAG.

Outputs (all under ``prospectus_kg_output/finetune/``):
  - ``data_to_text_dataset.jsonl``
        One example per (document, canonical section) with
          {
            "document_id": ...,
            "section_id": ...,
            "input_record": {...},        # from Stage 3b record
            "section_card": {...},        # from Stage 2 writing KG
            "reference_output": "..."     # the actual prospectus section text
          }
        Used to fine-tune the drafting LLM (input-record → section text).
  - ``section_card_retriever.jsonl``
        Flat index {section_id, function, purpose, writing_rules, required_input_fields}
        ready to be embedded and served by agent2's retriever.
  - ``agent2_section_requirements.json``
        Per-section list of required_input_fields, merged across all cards, suitable
        for wiring into ``agent2`` as a validation schema.

Stage 4 is LLM-free and runs in seconds.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

log = structlog.get_logger()


# Map Stage-2 canonical section IDs (snake_case, derived from TOC) to the
# CamelCase IDs used by the hand-authored ``agent2_section_requirements.json``.
# Sections that only exist in Stage 2 (e.g. Cornerstone_Investors) are added to
# agent2 with a generated CamelCase id; sections only in agent2 keep their
# existing requirements prose and simply gain no ``kg_*`` fields.
SECTION_ID_MAP: dict[str, str] = {
    "Business": "Business",
    "Connected_Transactions": "ConnectedTransactions",
    "Contents": "Contents",
    "Contractual_Arrangements_VIE": "ContractualArrangements",
    "Cornerstone_Investors": "CornerstoneInvestors",
    "Corporate_Information": "CorporateInfo",
    "Cover": "Cover",
    "Definitions": "Definitions",
    "Directors_and_Senior_Management": "DirectorsSeniorMgmt",
    "Expected_Timetable": "ExpectedTimetable",
    "Financial_Information": "FinancialInfo",
    "Forward_Looking_Statements": "ForwardLooking",
    "Future_Plans_and_Use_of_Proceeds": "UseOfProceeds",
    "Glossary_of_Technical_Terms": "Glossary",
    "History_Reorganization_Corporate_Structure": "HistoryReorg",
    "How_to_Apply_for_Hong_Kong_Offer_Shares": "HowToApply",
    "Important_Notice": "ImportantNotice",
    "Industry_Overview": "IndustryOverview",
    "Parties_Involved_in_the_Global_Offering": "DirectorsParties",
    "Prospectus_and_Global_Offering_Information": "InfoProspectus",
    "Regulatory_Overview": "Regulation",
    "Relationship_with_Controlling_Shareholders": "ControllingShareholders",
    "Risk_Factors": "RiskFactors",
    "Share_Capital": "ShareCapital",
    "Structure_of_the_Global_Offering": "GlobalOfferingStructure",
    "Substantial_Shareholders": "SubstantialShareholders",
    "Summary": "Summary",
    "Underwriting": "Underwriting",
    "Waivers_and_Exemptions": "Waivers",
    "Appendices": "Appendices",
    "Back_Cover": "BackCover",
}


def _load_section_cards(writing_dir: Path) -> dict[str, dict[str, Any]]:
    cards_dir = writing_dir / "section_cards"
    out: dict[str, dict[str, Any]] = {}
    if not cards_dir.exists():
        return out
    for f in sorted(cards_dir.glob("*.json")):
        try:
            c = json.loads(f.read_text(encoding="utf-8"))
            sid = c.get("section_id") or f.stem
            out[sid] = c
        except json.JSONDecodeError:
            continue
    return out


def _load_input_records(inputs_dir: Path) -> dict[str, dict[str, Any]]:
    """Load per-document input records from either the aggregated JSONL or per-doc
    JSON files. The per-doc directory is the source of truth when Stage 3b v2 runs
    in parallel (the aggregated dataset is only rebuilt on non-sharded runs)."""
    out: dict[str, dict[str, Any]] = {}
    records_dir = inputs_dir / "records"
    if records_dir.exists():
        for f in sorted(records_dir.glob("*.json")):
            try:
                obj = json.loads(f.read_text(encoding="utf-8"))
                did = obj.get("document_id") or f.stem
                out[did] = obj
            except json.JSONDecodeError:
                continue
    if out:
        return out
    dataset = inputs_dir / "input_dataset.jsonl"
    if dataset.exists():
        for line in dataset.read_text(encoding="utf-8").splitlines():
            try:
                obj = json.loads(line)
                did = obj.get("document_id")
                if did:
                    out[did] = obj
            except json.JSONDecodeError:
                continue
    return out


def _merge_into_agent2(
    section_cards: dict[str, dict[str, Any]],
    agent2_path: Path,
) -> dict[str, Any]:
    """Augment ``agent2_section_requirements.json`` in-place with ``kg_*`` fields
    from the Stage 2 section cards. Hand-authored ``name`` / ``requirements`` are
    never overwritten; only KG-derived keys are added or refreshed. A ``.bak``
    copy of the original file is kept on the first merge."""
    if not agent2_path.exists():
        log.warning("agent2_requirements_missing", path=str(agent2_path))
        return {"skipped": True}

    existing: dict[str, dict[str, Any]] = json.loads(
        agent2_path.read_text(encoding="utf-8")
    )

    backup = agent2_path.with_suffix(agent2_path.suffix + ".bak")
    if not backup.exists():
        backup.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        log.info("agent2_requirements_backup_written", path=str(backup))

    touched: list[str] = []
    added: list[str] = []
    for kg_id, card in section_cards.items():
        agent_id = SECTION_ID_MAP.get(kg_id, kg_id)
        entry = existing.get(agent_id)
        if entry is None:
            entry = {
                "name": kg_id.replace("_", " "),
                "requirements": (
                    "[KG-derived placeholder — refine manually] "
                    + (card.get("function") or "")
                ),
            }
            added.append(agent_id)
        entry["kg_section_id"] = kg_id
        entry["kg_function"] = card.get("function", "")
        entry["kg_purpose"] = card.get("purpose", "")
        entry["kg_typical_structure"] = card.get("typical_structure") or []
        entry["kg_writing_rules"] = card.get("writing_rules") or []
        entry["kg_required_input_fields"] = card.get("required_input_fields") or []
        entry["kg_evidence_types"] = card.get("evidence_types") or []
        entry["kg_common_pitfalls"] = card.get("common_pitfalls") or []
        existing[agent_id] = entry
        touched.append(agent_id)

    agent2_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log.info(
        "agent2_requirements_merged",
        path=str(agent2_path),
        sections=len(existing),
        touched=len(touched),
        added=added,
    )
    return {
        "path": str(agent2_path),
        "backup": str(backup),
        "total_sections": len(existing),
        "touched": touched,
        "added": added,
    }


def run(
    sections_dir: Path,
    writing_dir: Path,
    inputs_dir: Path,
    finetune_dir: Path,
    agent2_requirements_path: Path | None = None,
) -> dict[str, Any]:
    finetune_dir.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    section_cards = _load_section_cards(writing_dir)
    log.info("loaded_section_cards", count=len(section_cards))

    records = _load_input_records(inputs_dir)
    log.info("loaded_input_records", count=len(records))

    # 1. data-to-text dataset (even without records, emit section-only for LM pretraining).
    d2t_path = finetune_dir / "data_to_text_dataset.jsonl"
    n_examples = 0
    with d2t_path.open("w", encoding="utf-8") as out_f:
        for sec_file in sorted(sections_dir.glob("*.json")):
            if sec_file.name.startswith("_"):
                continue
            try:
                doc = json.loads(sec_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            did = doc.get("document_id") or sec_file.stem
            rec = records.get(did)
            for sec in doc.get("sections", []):
                sid = sec.get("canonical_section")
                ref = sec.get("text") or ""
                if not sid or len(ref.strip()) < 400:
                    continue
                example = {
                    "document_id": did,
                    "section_id": sid,
                    "raw_title": sec.get("raw_title"),
                    "input_record": rec.get("record") if rec else None,
                    "section_card": section_cards.get(sid),
                    "reference_output": ref,
                }
                out_f.write(json.dumps(example, ensure_ascii=False) + "\n")
                n_examples += 1
    log.info("wrote_data_to_text", examples=n_examples, path=str(d2t_path))

    # 2. retriever index
    retr_path = finetune_dir / "section_card_retriever.jsonl"
    with retr_path.open("w", encoding="utf-8") as f:
        for sid, card in sorted(section_cards.items()):
            rules = card.get("writing_rules") or []
            struct = card.get("typical_structure") or []
            fields = card.get("required_input_fields") or []
            entry = {
                "section_id": sid,
                "function": card.get("function", ""),
                "purpose": card.get("purpose", ""),
                "retrieval_text": "\n".join(
                    [
                        f"SECTION: {sid}",
                        f"FUNCTION: {card.get('function','')}",
                        f"PURPOSE: {card.get('purpose','')}",
                        "STRUCTURE:",
                        *[f"  - {s.get('subsection','')}: {s.get('description','')}" for s in struct],
                        "RULES:",
                        *[f"  - {r}" for r in rules],
                        "REQUIRED INPUTS:",
                        *[f"  - {fld.get('field')}: {fld.get('description')}" for fld in fields],
                    ]
                ),
                "writing_rules": rules,
                "required_input_fields": fields,
                "typical_structure": struct,
            }
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    log.info("wrote_retriever_index", path=str(retr_path))

    # 3. agent2 section requirements
    req_path = finetune_dir / "agent2_section_requirements.json"
    agent_req: dict[str, dict[str, Any]] = {}
    for sid, card in section_cards.items():
        agent_req[sid] = {
            "function": card.get("function", ""),
            "required_input_fields": card.get("required_input_fields") or [],
            "writing_rules": card.get("writing_rules") or [],
            "typical_structure": card.get("typical_structure") or [],
            "evidence_types": card.get("evidence_types") or [],
        }
    req_path.write_text(
        json.dumps(agent_req, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log.info("wrote_agent_requirements", path=str(req_path))

    # 4. Merge KG fields into the repo-root agent2_section_requirements.json so
    #    agent2.py picks up the content-grounded schema at runtime. Hand-authored
    #    ``requirements`` text is preserved untouched.
    merge_info: dict[str, Any] = {"skipped": True}
    if agent2_requirements_path is not None and section_cards:
        merge_info = _merge_into_agent2(section_cards, agent2_requirements_path)

    summary = {
        "stage": "stage4_export",
        "data_to_text_examples": n_examples,
        "retriever_entries": len(section_cards),
        "agent_requirement_sections": len(agent_req),
        "data_to_text_dataset": str(d2t_path),
        "retriever_index": str(retr_path),
        "agent_requirements": str(req_path),
        "agent2_merge": merge_info,
        "elapsed_seconds": round(time.time() - t0, 2),
    }
    (finetune_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 4: export fine-tune + retriever artifacts.")
    ap.add_argument(
        "--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc")
    )
    ap.add_argument(
        "--writing-dir", type=Path, default=Path("prospectus_kg_output/writing")
    )
    ap.add_argument(
        "--inputs-dir", type=Path, default=Path("prospectus_kg_output/inputs")
    )
    ap.add_argument(
        "--finetune-dir", type=Path, default=Path("prospectus_kg_output/finetune")
    )
    ap.add_argument(
        "--agent2-requirements",
        type=Path,
        default=Path("agent2_section_requirements.json"),
        help=(
            "Path to the hand-authored agent2 requirements file; KG-derived fields "
            "are merged in-place (a .bak copy is kept). Pass empty string to skip."
        ),
    )
    args = ap.parse_args()
    merge_path: Path | None = (
        args.agent2_requirements if str(args.agent2_requirements) else None
    )
    print(
        json.dumps(
            run(
                args.sections_dir,
                args.writing_dir,
                args.inputs_dir,
                args.finetune_dir,
                agent2_requirements_path=merge_path,
            ),
            indent=2,
            ensure_ascii=False,
        )
    )
