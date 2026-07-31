"""Information extraction agent for eligibility (standalone).

Reads uploaded documents, extracts quantifiable fields and narrative excerpts
via LLM (or a deterministic offline stub), and returns a structured package
suitable for human confirmation before hard-gate evaluation.

Does not import ai-module / Agent1. Extraction discipline mirrors the
prospectus drafting pipeline (no invention, provenance, confidence).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from ..common.llm import chat_json, stub_mode
from ..common.types import EXTRACTED, HARD_ENTERED, ExtractedField
from .documents import DocumentBundle, load_documents
from .chapter_deterministic import extract_from_chapter_json_paths
from .schema import NARRATIVE_TOPICS, field_ids_quantifiable

_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _load_prompt(name: str) -> str:
    return (_PROMPTS_DIR / name).read_text(encoding="utf-8")


def _extraction_rules() -> str:
    return (_PROMPTS_DIR / "extraction_rules.md").read_text(encoding="utf-8")


def _render_prompt(template: str, **kwargs: str) -> tuple[str, str]:
    """Split ``System:`` / ``User:`` sections and substitute placeholders."""
    text = template
    for key, value in kwargs.items():
        text = text.replace("{{" + key + "}}", value)
    system = ""
    user = text
    if text.startswith("System:"):
        parts = text.split("\nUser:", 1)
        system = parts[0].replace("System:", "", 1).strip()
        user = parts[1].strip() if len(parts) > 1 else ""
    return system, user


def _stub_extraction(bundle: DocumentBundle) -> dict[str, Any]:
    """Offline extraction: no invented numbers; surface document presence only."""
    return {
        "quantifiable": [],
        "narrative": [
            {
                "field_id": "document_inventory",
                "text": (
                    f"Loaded {len(bundle.blocks)} text block(s) from "
                    f"{len({b.source_file for b in bundle.blocks})} file(s). "
                    "LLM stub mode — no field values invented."
                ),
                "topic": "business_model",
                "span_preview": "",
                "page_start": None,
                "page_end": None,
                "confidence": 1.0,
            }
        ],
        "missing_fields": field_ids_quantifiable(),
        "notes": [
            "ELIGIBILITY_LLM_STUB or missing API key: extraction returned no "
            "quantifiable values. Provide a confirmed issuer JSON or enable LLM."
        ],
        "stub": True,
    }


def _normalize_quantifiable(raw: list[dict], source_file: str) -> list[ExtractedField]:
    out: list[ExtractedField] = []
    for item in raw or []:
        field_id = str(item.get("field_id") or "").strip()
        if not field_id:
            continue
        out.append(
            {
                "field_id": field_id,
                "value": item.get("value"),
                "unit": item.get("unit"),
                "kind": "quantifiable",
                "confirmation_status": EXTRACTED,
                "provenance": {
                    "source_file": source_file,
                    "page_start": item.get("page_start"),
                    "page_end": item.get("page_end"),
                    "span_preview": (item.get("span_preview") or "")[:200],
                    "confidence": float(item.get("confidence") or 0.0),
                },
                "null_reason": item.get("null_reason"),
            }
        )
    return out


def _normalize_narrative(raw: list[dict], source_file: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for item in raw or []:
        text = (item.get("text") or "").strip()
        if not text:
            continue
        topic = item.get("topic") or "business_model"
        if topic not in NARRATIVE_TOPICS and topic != "business_model":
            # keep unknown topics; analyzer can still use them
            pass
        out.append(
            {
                "field_id": item.get("field_id") or topic,
                "text": text,
                "topic": topic,
                "kind": "narrative",
                "confirmation_status": EXTRACTED,
                "provenance": {
                    "source_file": source_file,
                    "page_start": item.get("page_start"),
                    "page_end": item.get("page_end"),
                    "span_preview": (item.get("span_preview") or "")[:200],
                    "confidence": float(item.get("confidence") or 0.0),
                },
            }
        )
    return out


def extract_from_bundle(
    bundle: DocumentBundle,
    *,
    market_hint: str = "",
    source_name: str = "upload",
    auto_confirm: bool = False,
    fallback_quantifiable: list[ExtractedField] | None = None,
    fallback_notes: list[str] | None = None,
) -> dict[str, Any]:
    """Run extraction over a document bundle.

    Returns a package::

        {
          "quantifiable": [ExtractedField, ...],
          "narrative": [...],
          "missing_fields": [...],
          "notes": [...],
          "errors": [...],
          "llm_stub": bool,
        }

    When ``auto_confirm`` is True (CLI / trusted issuer JSON path), extracted
    non-null quantifiable values are marked ``confirmed`` so the hard engine can
    consume them. Default Mode B leaves them as ``extracted`` pending UI confirm.
    """
    if bundle.errors and not bundle.blocks:
        return {
            "quantifiable": list(fallback_quantifiable or []),
            "narrative": [],
            "missing_fields": field_ids_quantifiable(),
            "notes": list(fallback_notes or []),
            "errors": list(bundle.errors),
            "llm_stub": stub_mode(),
        }

    stub_payload = _stub_extraction(bundle)
    if fallback_quantifiable:
        stub_payload = {
            **stub_payload,
            "quantifiable": [
                {
                    "field_id": q.get("field_id"),
                    "value": q.get("value"),
                    "unit": q.get("unit"),
                    "span_preview": (q.get("provenance") or {}).get("span_preview"),
                    "page_start": None,
                    "page_end": None,
                    "confidence": (q.get("provenance") or {}).get("confidence") or 0.9,
                    "null_reason": None,
                }
                for q in fallback_quantifiable
            ],
            "notes": list(fallback_notes or [])
            + [
                "Fallback package seeded from deterministic chapter JSON "
                "(used if the LLM returns non-JSON / empty content)."
            ],
            "missing_fields": [
                fid
                for fid in field_ids_quantifiable()
                if fid not in {q.get("field_id") for q in fallback_quantifiable}
            ],
        }

    if stub_mode():
        raw = stub_payload if fallback_quantifiable else _stub_extraction(bundle)
    else:
        template = _load_prompt("extract_fields.txt")
        system, user = _render_prompt(
            template,
            extraction_rules=_extraction_rules(),
            market_hint=market_hint or "unspecified",
            source_name=source_name,
            # Keep prompt bounded for cloud APIs (DeepSeek empty replies on huge inputs).
            document_text=bundle.combined_text(max_chars=24_000),
        )
        # Strong JSON discipline — DeepSeek often replies with analysis prose.
        system = (
            system
            + "\n\nCRITICAL: Reply with a single JSON object only. "
            "No markdown, no analysis, no preamble."
        )
        raw = chat_json(
            system,
            user,
            stub_payload=stub_payload,
            max_tokens=2048,
        )

    quant = _normalize_quantifiable(raw.get("quantifiable") or [], source_name)
    narr = _normalize_narrative(raw.get("narrative") or [], source_name)

    if auto_confirm:
        for item in quant:
            if item.get("value") is not None:
                item["confirmation_status"] = "confirmed"

    return {
        "quantifiable": quant,
        "narrative": narr,
        "missing_fields": raw.get("missing_fields") or [],
        "notes": raw.get("notes") or [],
        "errors": list(bundle.errors),
        "llm_stub": bool(raw.get("stub")) or stub_mode(),
    }


def extract_from_paths(
    paths: list[str | Path],
    *,
    market_hint: str = "",
    auto_confirm: bool = False,
) -> dict[str, Any]:
    """Load documents from disk and extract."""
    # Prefer deterministic chapter-JSON lift when Agent1 dumps are present.
    deterministic = extract_from_chapter_json_paths(paths)
    det_quant = list(deterministic.get("quantifiable") or [])
    det_ids = {q.get("field_id") for q in det_quant if q.get("value") is not None}
    # If chapter JSON already has core financials, skip the LLM extract call.
    # DeepSeek often returns analysis prose (non-JSON) which previously wiped
    # the scorecard into an empty stub.
    core = {"revenue", "profit_attributable_to_owners", "operating_cash_flow", "total_assets"}
    if len(det_ids & core) >= 2:
        package = {
            "quantifiable": det_quant,
            "narrative": list(deterministic.get("narrative") or []),
            "missing_fields": [
                fid for fid in field_ids_quantifiable() if fid not in det_ids
            ],
            "notes": list(deterministic.get("notes") or [])
            + [
                "Skipped LLM field extraction — used deterministic values from "
                "Agent1/Agent2 chapter JSON."
            ],
            "errors": [],
            "llm_stub": False,
            "deterministic": True,
            "path_vars": deterministic.get("path_vars") or {},
            "profile_patch": deterministic.get("profile_patch") or {},
            "issuer_patch": deterministic.get("issuer_patch") or {},
        }
        if auto_confirm:
            for item in package["quantifiable"]:
                if item.get("value") is not None:
                    item["confirmation_status"] = "confirmed"
        return package

    bundle = load_documents(paths)
    package = extract_from_bundle(
        bundle,
        market_hint=market_hint,
        source_name=",".join(Path(p).name for p in paths) or "upload",
        auto_confirm=False,
        fallback_quantifiable=det_quant,
        fallback_notes=list(deterministic.get("notes") or []),
    )

    # Carry deterministic issuer/profile patches even when LLM also ran.
    for key in ("path_vars", "profile_patch", "issuer_patch"):
        if deterministic.get(key) and not package.get(key):
            package[key] = deterministic[key]

    # If LLM returned empty/stub but deterministic found numbers, prefer those.
    llm_quant = [
        q
        for q in (package.get("quantifiable") or [])
        if q.get("value") is not None
    ]
    if det_quant and (package.get("llm_stub") or not llm_quant):
        package["quantifiable"] = det_quant
        package["notes"] = list(
            dict.fromkeys(
                list(deterministic.get("notes") or [])
                + list(package.get("notes") or [])
                + [
                    "Used deterministic chapter-JSON values because the LLM "
                    "response was empty, stubbed, or non-JSON."
                ]
            )
        )
        package["llm_stub"] = False
        package["deterministic"] = True
        package["missing_fields"] = [
            fid
            for fid in field_ids_quantifiable()
            if fid not in {q.get("field_id") for q in det_quant}
        ]
        for key in ("path_vars", "profile_patch", "issuer_patch"):
            if deterministic.get(key):
                package[key] = deterministic[key]

    if auto_confirm:
        for item in package.get("quantifiable") or []:
            if item.get("value") is not None:
                item["confirmation_status"] = "confirmed"
    return package


def merge_deal_params(profile: dict[str, Any]) -> list[ExtractedField]:
    """Lift hard-entered deal parameters from the run profile."""
    out: list[ExtractedField] = []
    mapping = {
        "offer_price": profile.get("offer_price"),
        "post_offering_total_shares": profile.get("post_offering_total_shares"),
        "expected_market_cap": profile.get("expected_market_cap"),
        "intended_application_date": profile.get("intended_application_date"),
        "expected_listing_date": profile.get("expected_listing_date"),
        "fx_rate_to_hkd": profile.get("fx_rate_to_hkd"),
    }
    for field_id, value in mapping.items():
        if value is None:
            continue
        out.append(
            {
                "field_id": field_id,
                "value": value,
                "unit": None,
                "kind": "deal_param",
                "confirmation_status": HARD_ENTERED,
                "provenance": {
                    "source_file": "run_profile",
                    "span_preview": "hard-entered deal parameter",
                    "confidence": 1.0,
                },
                "null_reason": None,
            }
        )
    return out


def confirm_fields(
    package: dict[str, Any],
    confirmed_ids: list[str] | None = None,
    rejected_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Apply human confirmation / rejection to extracted quantifiable fields."""
    confirmed = set(confirmed_ids or [])
    rejected = set(rejected_ids or [])
    for item in package.get("quantifiable") or []:
        fid = item.get("field_id")
        if fid in rejected:
            item["confirmation_status"] = "rejected"
        elif fid in confirmed or confirmed_ids is None and os.environ.get(
            "ELIGIBILITY_AUTO_CONFIRM", ""
        ).strip() in ("1", "true", "yes"):
            if item.get("value") is not None:
                item["confirmation_status"] = "confirmed"
    return package
