#!/usr/bin/env python3
"""Add dense section-source materials to reverse-engineered input records.

The per-section reverse extraction schema is intentionally narrow: it contains
only the fields required by the current writing cards. Long prospectus sections
therefore often collapse into a few values, even when the source section has
dozens of market figures, regulatory citations, financial movements, or product
facts. This deterministic enrichment pass keeps the schema values intact and
adds a parallel ``extracted_source_materials`` block mined from the already
segmented prospectus text.

No model/API is used. The output is designed to be consumed by source packages,
Agent1 JSON ingestion, and manual inspection.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
AI_MODULE = ROOT / "ai-module"
if str(AI_MODULE) not in sys.path:
    sys.path.insert(0, str(AI_MODULE))

from prospectus_graph.execution_contract import (  # noqa: E402
    compile_execution_contracts,
    normalize_identifier,
)


REQUIREMENTS_PATH = AI_MODULE / "prompts" / "sections" / "requirements.json"


NUMERIC_RE = re.compile(
    r"(?i)(?:HK\$|RMB|US\$|USD|HKD|million|billion|trillion|%|CAGR|year ended|"
    r"years ended|for the year|from 20\d{2}|to 20\d{2}|\b20\d{2}\b|\d[\d,]*(?:\.\d+)?)"
)
TERM_RE = re.compile(r"[\"“]([^\"”]{1,90})[\"”]\s+(.+?)(?=\s+[\"“][^\"”]{1,90}[\"”]\s+|$)")
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_\-./%]*")


SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Summary": (
        "overview", "competitive", "financial", "risk", "strategy", "offering",
        "market", "business model", "customer", "revenue",
    ),
    "Business": (
        "overview", "business model", "products", "services", "platform",
        "customer", "supplier", "sales", "marketing", "technology", "research",
        "development", "competitive", "strategy", "strengths", "operation",
    ),
    "Industry_Overview": (
        "market", "market size", "CAGR", "growth", "trend", "driver",
        "competitive", "ranking", "share", "penetration", "industry",
        "forecast", "independent consultant", "market research report",
    ),
    "Financial_Information": (
        "revenue", "gross profit", "margin", "profit", "loss", "cash",
        "assets", "liabilities", "working capital", "indebtedness", "liquidity",
        "capital expenditure", "year ended", "period",
    ),
    "Risk_Factors": (
        "risk", "may", "could", "adverse", "uncertain", "failure",
        "competition", "regulatory", "compliance", "depend", "material",
    ),
    "Regulatory_Overview": (
        "law", "regulation", "measures", "rules", "authority", "license",
        "permit", "approval", "compliance", "foreign investment", "cybersecurity",
        "data", "personal information", "MIIT", "MOFCOM", "SAMR", "CSRC",
    ),
    "Contractual_Arrangements_VIE": (
        "contractual arrangements", "exclusive", "option", "equity pledge",
        "power of attorney", "registered shareholders", "WFOE", "VIE",
        "control", "economic benefit",
    ),
    "Future_Plans_and_Use_of_Proceeds": (
        "net proceeds", "approximately", "HK$", "use", "upgrade", "enhance",
        "research", "development", "investment", "acquisition", "working capital",
    ),
    "Underwriting": (
        "underwriting", "underwriters", "commission", "lock-up", "stabilization",
        "over-allotment", "agreement", "termination", "indemnity",
    ),
    "Structure_of_the_Global_Offering": (
        "Hong Kong Public Offering", "International Offering", "reallocation",
        "offer shares", "over-allotment", "basis of allocation", "clawback",
    ),
    "How_to_Apply_for_Hong_Kong_Offer_Shares": (
        "apply", "application", "White Form", "Yellow Form", "eIPO",
        "CCASS", "payment", "refund", "deadline", "minimum",
    ),
    "Directors_and_Senior_Management": (
        "director", "executive", "independent", "senior management", "age",
        "experience", "appointed", "responsible", "degree", "qualification",
    ),
    "Substantial_Shareholders": (
        "shareholder", "interest", "shares", "voting rights", "percentage",
        "Class A", "Class B", "SFO", "deemed",
    ),
    "Connected_Transactions": (
        "connected transaction", "continuing", "annual cap", "waiver",
        "Listing Rules", "associate", "connected person", "agreement",
    ),
    "History_Reorganization_Corporate_Structure": (
        "incorporated", "established", "reorganization", "subsidiary",
        "acquisition", "transfer", "shareholding", "corporate structure",
    ),
    "Appendices": (
        "accountants", "report", "financial information", "note", "pro forma",
        "property valuation", "statutory", "documents", "available for inspection",
    ),
}


# General semantic anchors for maintained SectionSpec labels which intentionally
# use lawyer-friendly descriptions rather than the legacy snake_case field names.
# These are section-family rules, never issuer-specific branches.
FIELD_ANCHORS: tuple[tuple[re.Pattern[str], tuple[str, ...]], ...] = (
    (re.compile(r"company legal name|issuer name", re.I), ("company", "limited", "inc.", "ltd.")),
    (re.compile(r"incorporation|jurisdiction|limited liability", re.I), ("incorporated", "limited liability", "joint stock")),
    (re.compile(r"wvr|weighted voting", re.I), ("weighted voting", "wvr")),
    (re.compile(r"stock code", re.I), ("stock code",)),
    (re.compile(r"offering type|global offering label", re.I), ("global offering",)),
    (re.compile(r"number of .*shares|offer share numbers", re.I), ("offer shares", "hong kong offer shares", "international offer shares")),
    (re.compile(r"reallocation|over-allotment|adjustment option", re.I), ("reallocation", "over-allotment", "adjustment")),
    (re.compile(r"offer price", re.I), ("offer price", "price range")),
    (re.compile(r"brokerage|levy rates", re.I), ("brokerage", "transaction levy", "trading fee")),
    (re.compile(r"nominal value", re.I), ("nominal value",)),
    (re.compile(r"sponsor|coordinator|bookrunner|lead manager", re.I), ("sponsor", "coordinator", "bookrunner", "lead manager")),
    (re.compile(r"prospectus date|latest practicable date|date of report", re.I), ("prospectus", "date", "latest practicable date")),
    (re.compile(r"registered office", re.I), ("registered office",)),
    (re.compile(r"head office|principal place of business", re.I), ("head office", "principal place of business")),
    (re.compile(r"website", re.I), ("website", "www.", "http")),
    (re.compile(r"secretar", re.I), ("company secretary", "joint company secretaries")),
    (re.compile(r"audit committee", re.I), ("audit committee",)),
    (re.compile(r"remuneration committee", re.I), ("remuneration committee",)),
    (re.compile(r"nomination committee", re.I), ("nomination committee",)),
    (re.compile(r"compliance advis[eo]r", re.I), ("compliance adviser", "compliance advisor")),
    (re.compile(r"registrar", re.I), ("share registrar", "registrar")),
    (re.compile(r"banker|principal banks", re.I), ("principal bank", "banker")),
    (re.compile(r"share incentive", re.I), ("share incentive", "grantee", "option", "award")),
    (re.compile(r"contractual arrangement|vie", re.I), ("contractual arrangement", "vie", "exclusive agreement")),
)
PAGE_MARKER_RE = re.compile(r"\s+[—–-]\s*(\d{1,5})\s*[—–-]\s+")


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _normalize_ws(text: str) -> str:
    text = re.sub(r"\s+[–-]\s*\d+\s*[–-]\s+", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def _sentence_split(text: str) -> list[str]:
    if not (text or "").strip():
        return []
    # Retain the source's line/table boundaries before sentence splitting.  The
    # former whole-section whitespace normalization merged adjacent cover and
    # table fields into one pseudo-sentence, which made values non-atomic.
    raw_lines = [
        _normalize_ws(line)
        for line in re.sub(r"\s+[–-]\s*\d+\s*[–-]\s+", "\n", text or "").splitlines()
        if _normalize_ws(line)
    ]
    field_label = (
        r"Number of (?:Offer|Hong Kong Offer|International Offer) Shares|"
        r"Offer Price|Maximum Offer Price|Nominal Value|Stock Code|"
        r"Sole Sponsor|Joint Sponsors?|Overall Coordinators?|"
        r"Joint Global Coordinators?|Joint Bookrunners?|Joint Lead Managers?|"
        r"Registered Office|Head Office|Principal Place of Business|Company Website|"
        r"Audit Committee|Remuneration Committee|Nomination Committee|"
        r"Compliance Advis[eo]r|(?:Hong Kong |Principal )?Share Registrar|Principal Bank|"
        r"Revenue|Gross Profit|Profit for the (?:year|period)|Total Assets|"
        r"Total Liabilities|Net Cash(?: Flows?)?"
    )
    parts: list[str] = []
    for line in raw_lines:
        for sentence in re.split(
            r"(?<!Mr\.)(?<!Ms\.)(?<!Dr\.)(?<!Prof\.)(?<=[.!?])"
            r"\s+(?=(?:[A-Z0-9\"“'‘]|\())|\s*[;•]\s*",
            line,
        ):
            if len(sentence) < 80:
                parts.append(sentence)
            else:
                parts.extend(
                    item
                    for item in re.split(
                        rf"(?=\b(?:{field_label})\s*:?)", sentence, flags=re.I
                    )
                    if item.strip()
                )
    out: list[str] = []
    for part in parts:
        part = part.strip()
        # A short source line can be an issuer name, a professional party, an
        # address row, a committee member or a table label.  Discarding lines
        # merely because they are short silently removes exactly the atomic
        # facts the contract is intended to preserve.  Relevance filtering for
        # long narrative sections happens later, after unit assignment.
        while len(part) > 900:
            cut = part.rfind(" ", 500, 900)
            if cut < 0:
                cut = 850
            chunk, part = part[:cut].strip(), part[cut:].strip()
            if len(chunk) >= 35 or NUMERIC_RE.search(chunk):
                out.append(chunk)
        if part:
            out.append(part)
    return out


def _dedupe_keep_order(items: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = re.sub(r"\W+", " ", item.lower()).strip()[:180]
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def _score_sentence(section_id: str, sentence: str, position: int) -> float:
    lower = sentence.lower()
    keywords = SECTION_KEYWORDS.get(section_id, ())
    score = 0.0
    if NUMERIC_RE.search(sentence):
        score += 4.0
    score += sum(1.4 for kw in keywords if kw.lower() in lower)
    if "according to" in lower or "we are" in lower or "we believe" in lower:
        score += 0.8
    if len(sentence) > 220:
        score -= 0.4
    score -= position / 10000.0
    return score


def _extract_outline(text: str, limit: int = 36) -> list[str]:
    candidates: list[str] = []
    for raw in (text or "").splitlines():
        line = _normalize_ws(raw).strip(" .:-")
        if not (3 <= len(line) <= 120):
            continue
        letters = [c for c in line if c.isalpha()]
        if not letters:
            continue
        if re.fullmatch(r"(?i)(?:20\d{2}E?|HK\$[\d,.]+|RMB[\d,.]+|[\d.,%x ]+)", line):
            continue
        upper_ratio = sum(1 for c in letters if c.isupper()) / max(len(letters), 1)
        word_count = len(line.split())
        if upper_ratio >= 0.65 and word_count <= 12:
            candidates.append(line)
        elif (
            word_count <= 9
            and any(token in line.lower() for token in ("overview", "our ", "risk", "regulation", "financial", "market"))
            and not line.endswith(".")
        ):
            candidates.append(line)
    return _dedupe_keep_order(candidates, limit)


def _term_definitions(text: str, meta: dict[str, Any], limit: int = 5000) -> list[dict[str, Any]]:
    normalized = _normalize_ws(text)
    rows: list[dict[str, Any]] = []
    for match in TERM_RE.finditer(normalized):
        term = _normalize_ws(match.group(1))
        definition = _normalize_ws(match.group(2)).strip(" ;")
        if not term or not definition or len(definition) < 8:
            continue
        if len(definition) > 700:
            definition = definition[:697].rstrip() + "..."
        rows.append(
            {
                "term": term,
                "definition": definition,
                "source_file": meta.get("source_file"),
                "page_start": meta.get("page_start"),
                "page_end": meta.get("page_end"),
                "evidence_status": "section_traceable",
            }
        )
        if len(rows) >= limit:
            break
    return rows


def _unit_keywords(unit: dict[str, Any]) -> set[str]:
    text = f"{unit.get('title', '')} {unit.get('instruction', '')}".lower()
    return {
        token
        for token in re.findall(r"[a-z0-9]+", text)
        if len(token) > 2
        and token
        not in {
            "the", "and", "for", "with", "from", "this", "that", "where",
            "include", "required", "applicable", "supported", "section",
        }
    }


def _sentence_positions(text: str, sentences: list[str]) -> list[tuple[int, int]]:
    normalized = _normalize_ws(text)
    positions: list[tuple[int, int]] = []
    cursor = 0
    for sentence in sentences:
        start = normalized.find(sentence, cursor)
        if start < 0:
            start = normalized.find(sentence)
        if start < 0:
            start = cursor
        end = min(len(normalized), start + len(sentence))
        positions.append((start, end))
        cursor = max(cursor, end)
    return positions


def _sentence_pages(
    text: str,
    sentences: list[str],
    default_page: int | None,
    final_page: int | None,
) -> list[int | None]:
    """Map each normalized atom to the closest explicit filing page marker."""

    parts = PAGE_MARKER_RE.split(text or "")
    segments: list[tuple[int | None, str]] = []
    current_page = default_page
    if parts:
        segments.append((current_page, _normalize_ws(parts[0])))
    for index in range(1, len(parts), 2):
        try:
            current_page = int(parts[index])
        except (TypeError, ValueError):
            pass
        segment = parts[index + 1] if index + 1 < len(parts) else ""
        segments.append((current_page, _normalize_ws(segment)))
    if not segments:
        return [default_page] * len(sentences)

    pages: list[int | None] = []
    segment_index = 0
    for sentence in sentences:
        matched_index: int | None = None
        for candidate_index in range(segment_index, len(segments)):
            if sentence in segments[candidate_index][1]:
                matched_index = candidate_index
                break
        if matched_index is not None:
            segment_index = matched_index
        pages.append(segments[segment_index][0])
    return [
        max(default_page, min(page, final_page))
        if page is not None and default_page is not None and final_page is not None
        else page
        for page in pages
    ]


def _assign_sentences_to_units(
    sentences: list[str], units: list[dict[str, Any]]
) -> list[list[tuple[int, str, float]]]:
    if not units:
        return [[(index, sentence, 0.0) for index, sentence in enumerate(sentences)]]
    keyword_sets = [_unit_keywords(unit) for unit in units]
    assigned: list[list[tuple[int, str, float]]] = [[] for _ in units]
    total = max(len(sentences), 1)
    for index, sentence in enumerate(sentences):
        sentence_tokens = set(re.findall(r"[a-z0-9]+", sentence.lower()))
        scores = [
            len(sentence_tokens & keywords) / max(len(keywords), 1)
            for keywords in keyword_sets
        ]
        best_score = max(scores, default=0.0)
        if best_score > 0:
            unit_index = scores.index(best_score)
        else:
            # Position is a safer generic fallback than assigning every unmatched
            # sentence to the first unit.  It retains full-section coverage while
            # the contract headings provide the primary grouping signal.
            unit_index = min(len(units) - 1, int(index * len(units) / total))
        assigned[unit_index].append((index, sentence, best_score))
    return assigned


def _atom_id(
    document_id: str, section_id: str, sentence_index: int, kind: str, text: str
) -> str:
    digest = hashlib.sha256(
        f"{document_id}|{section_id}|{sentence_index}|{kind}|{text}".encode("utf-8")
    ).hexdigest()[:16]
    return f"ev_{digest}"


def _atom_unit(text: str) -> str | None:
    lowered = text.lower()
    if "hk$" in lowered or "hkd" in lowered:
        return "HKD"
    if "rmb" in lowered:
        return "RMB"
    if "us$" in lowered or "usd" in lowered:
        return "USD"
    if "%" in text:
        return "percent"
    if re.search(r"\bshares?\b", text, re.I):
        return "shares"
    return None


def _atom_period(text: str) -> str | None:
    match = re.search(
        r"\b(?:(?:three|six|nine|twelve) months? |financial year |year )?"
        r"(?:ended|ending|as at|as of|from)?\s*"
        r"(?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|"
        r"September|October|November|December)?\s*20\d{2}\b",
        text,
        re.I,
    )
    return _normalize_ws(match.group(0)) if match else None


def _atom_field_id(
    sentence: str,
    fields: list[dict[str, Any]],
    section_id: str,
    kind: str,
) -> str:
    lowered = sentence.lower()
    scored: list[tuple[int, str]] = []
    for field in fields:
        hits = sum(
            1 for anchor in _anchors_for_field(field) if anchor.lower() in lowered
        )
        if hits:
            scored.append((hits, str(field.get("fieldId") or "")))
    if scored:
        return max(scored)[1]
    return f"{section_id}.unmapped_{kind}"


def _build_evidence_units(
    *,
    document_id: str,
    section_id: str,
    text: str,
    meta: dict[str, Any],
    contract: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    sentences = _sentence_split(text)
    positions = _sentence_positions(text, sentences)
    pages = _sentence_pages(
        text, sentences, meta.get("page_start"), meta.get("page_end")
    )
    contract_units = list(contract.get("units") or [])
    if not contract_units:
        contract_units = [
            {
                "unitId": f"{section_id}:01",
                "order": 1,
                "title": section_id.replace("_", " "),
                "instruction": section_id.replace("_", " "),
                "requiredFieldIds": [],
                "tableRequirements": [],
                "targetCharacters": 6000,
            }
        ]
    assignments = _assign_sentences_to_units(sentences, contract_units)
    evidence_units: list[dict[str, Any]] = []
    all_atoms: list[dict[str, Any]] = []

    for unit, candidates in zip(contract_units, assignments):
        # There is intentionally no numeric or per-section ceiling. Every
        # sentence carrying a date, amount, percentage, period, rule citation or
        # table value is retained. Narrative evidence is filtered by the generic
        # section/unit vocabulary, then routed into bounded retrieval chunks by
        # Agent1; the full reference text is never sent to the Writer.
        numeric_candidates = [row for row in candidates if NUMERIC_RE.search(row[1])]
        narrative_candidates = [row for row in candidates if not NUMERIC_RE.search(row[1])]
        retain_all = not bool(contract.get("isLongSection"))
        numeric_selected = list(numeric_candidates)
        narrative_selected = (
            list(narrative_candidates)
            if retain_all
            else [
                row
                for row in narrative_candidates
                if row[2] > 0 or _score_sentence(section_id, row[1], row[0]) >= 1.4
            ]
        )
        required_field_ids = set(unit.get("requiredFieldIds") or [])
        unit_fields = [
            field
            for field in contract.get("fields") or []
            if field.get("fieldId") in required_field_ids
        ]
        required_candidates = []
        for row in candidates:
            lower = row[1].lower()
            if any(
                any(anchor.lower() in lower for anchor in _anchors_for_field(field))
                for field in unit_fields
            ):
                required_candidates.append(row)
        selected_keys = {
            (row[0], kind)
            for row, kind in (
                [(item, "numeric") for item in numeric_selected]
                + [(item, "narrative") for item in narrative_selected]
            )
        }
        for row in required_candidates:
            kind = "numeric" if NUMERIC_RE.search(row[1]) else "narrative"
            if (row[0], kind) not in selected_keys:
                if kind == "numeric":
                    numeric_selected.append(row)
                else:
                    narrative_selected.append(row)
                selected_keys.add((row[0], kind))
        selected = sorted(
            [(row, "numeric") for row in numeric_selected]
            + [(row, "narrative") for row in narrative_selected],
            key=lambda item: item[0][0],
        )
        unit_atoms: list[dict[str, Any]] = []
        for (sentence_index, sentence, relevance), kind in selected:
            start, end = positions[sentence_index]
            atom = {
                "id": _atom_id(document_id, section_id, sentence_index, kind, sentence),
                "kind": kind,
                "field_id": _atom_field_id(sentence, unit_fields, section_id, kind),
                "value": sentence,
                # Backward-compatible alias for private audit tooling. Runtime
                # consumers use ``value`` as the canonical EvidenceAtom field.
                "text": sentence,
                "unit": _atom_unit(sentence),
                "period": _atom_period(sentence),
                "unit_id": unit.get("unitId"),
                "source_file": meta.get("source_file"),
                "page_start": pages[sentence_index],
                "page_end": pages[sentence_index],
                "section_sentence_index": sentence_index,
                "char_start": start,
                "char_end": end,
                "priority": "high" if kind == "numeric" or relevance > 0 else "normal",
                "evidence_status": "section_traceable",
            }
            unit_atoms.append(atom)
            all_atoms.append(atom)
        evidence_units.append(
            {
                **unit,
                "evidenceAtomIds": [atom["id"] for atom in unit_atoms],
                "evidenceAtomCount": len(unit_atoms),
            }
        )
    return evidence_units, all_atoms


def _unwrapped_value(value: Any) -> Any:
    if isinstance(value, dict) and "value" in value:
        return value.get("value")
    return value


def _existing_value_for_field(
    values: dict[str, Any], field: dict[str, Any]
) -> tuple[Any, str] | None:
    normalized = {normalize_identifier(key): (key, value) for key, value in values.items()}
    candidates = [field.get("fieldId"), field.get("label")]
    candidates.extend(field.get("aliases") or [])
    for candidate in candidates:
        hit = normalized.get(normalize_identifier(str(candidate or "")))
        if not hit:
            continue
        key, wrapped = hit
        value = _unwrapped_value(wrapped)
        if value not in (None, "", [], {}):
            return wrapped, key
    return None


def _anchors_for_field(field: dict[str, Any]) -> tuple[str, ...]:
    label = str(field.get("label") or "")
    matched: list[str] = []
    for pattern, anchors in FIELD_ANCHORS:
        if pattern.search(label):
            matched.extend(anchors)
    if matched:
        return tuple(dict.fromkeys(matched))
    aliases = [label, *(field.get("aliases") or [])]
    tokens: list[str] = []
    for alias in aliases:
        tokens.extend(
            token
            for token in re.findall(r"[a-z0-9]+", str(alias).lower())
            if len(token) > 3 and token not in {"company", "details", "information"}
        )
    return tuple(dict.fromkeys(tokens))


def _atoms_for_field(
    field: dict[str, Any], atoms: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    label = str(field.get("label") or "")
    anchors = _anchors_for_field(field)
    if not anchors:
        return []
    ranked: list[tuple[float, int, dict[str, Any]]] = []
    for atom in atoms:
        text = str(atom.get("value") or "")
        lower = text.lower()
        date_field = bool(re.search(r"prospectus date|date of report", label, re.I))
        date_match = re.search(
            r"(?:January|February|March|April|May|June|July|August|September|"
            r"October|November|December)\s+\d{1,2},?\s+20\d{2}|"
            r"\d{1,2}\s+(?:January|February|March|April|May|June|July|August|"
            r"September|October|November|December)\s+20\d{2}",
            text,
            re.I,
        )
        if date_field and not date_match:
            continue
        hits = sum(1 for anchor in anchors if anchor.lower() in lower)
        if date_field and date_match:
            hits = max(hits, 3)
        if not hits:
            continue
        score = hits * 5 + (2 if atom.get("kind") == "numeric" else 0)
        score -= len(text) / 5000
        ranked.append((score, -int(atom.get("section_sentence_index") or 0), atom))
    if not ranked:
        return []
    ranked.sort(key=lambda item: (-item[0], -item[1]))
    label_lower = label.lower()
    compound = bool(
        re.search(r"names? of|number of .*(?:number of|and)|[,;/]|\band\b", label_lower)
    )
    if not compound:
        return [ranked[0][2]]

    # Compound SectionSpec fields (for example all offer-share tranches or all
    # coordinator roles) need one traceable atom per semantic anchor, not the
    # single best sentence that caused the old loss of facts.
    selected: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for anchor in anchors:
        candidate = next(
            (
                atom
                for _, _, atom in ranked
                if anchor.lower() in str(atom.get("value") or "").lower()
            ),
            None,
        )
        if candidate and candidate["id"] not in seen_ids:
            selected.append(candidate)
            seen_ids.add(candidate["id"])
    if not selected:
        selected.append(ranked[0][2])
    return selected[:8]


def _contract_values(
    values: dict[str, Any],
    contract: dict[str, Any],
    atoms: list[dict[str, Any]],
    term_definitions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    section_id = str(contract.get("sectionId") or "")
    term_definitions = term_definitions or []

    def is_conditional(field_label: str) -> bool:
        lowered = field_label.lower()
        if section_id == "Back_Cover":
            # Back-cover layouts vary from a full repeated transaction lock-up
            # page to a logo/website-only page. Applicability is evidenced by
            # the actual segmented reference, not assumed from a template.
            return True
        if section_id == "Cover":
            always_applicable = (
                "company legal name",
                "incorporation jurisdiction",
                "stock code",
                "offering type",
                "names of joint sponsors",
            )
            if any(token in lowered for token in always_applicable):
                return False
            # Filing vintages use materially different front-cover layouts;
            # price mechanics, levies, nominal value and dates apply only when
            # they are actually carried by the reference section.
            return True
        if re.search(r"\bif applicable\b|\bwhere applicable\b", lowered):
            return True
        if section_id == "Contents":
            return True
        if section_id == "Definitions" and any(
            token in lowered
            for token in ("acronym", "full name", "rounding", "cross-reference")
        ):
            return True
        if section_id == "Glossary_of_Technical_Terms" and any(
            token in lowered for token in ("context", "cross_reference", "cross-reference")
        ):
            return True
        return False

    result: dict[str, Any] = {}
    for field in contract.get("fields") or []:
        field_id = str(field.get("fieldId") or field.get("label") or "unknown")
        field_label = str(field.get("label") or "")
        field_key = normalize_identifier(field_label)
        if term_definitions and section_id in {
            "Definitions",
            "Glossary_of_Technical_Terms",
        }:
            definition_value: list[str] = []
            if field_key == "term":
                definition_value = [str(item["term"]) for item in term_definitions]
            elif field_key == "definition":
                definition_value = [str(item["definition"]) for item in term_definitions]
            elif field_key == "acronym":
                definition_value = [
                    str(item["term"])
                    for item in term_definitions
                    if re.fullmatch(r"[A-Z][A-Z0-9&.-]{1,15}", str(item["term"]))
                ]
            elif field_key == "fullname":
                definition_value = [
                    str(item["definition"])
                    for item in term_definitions
                    if re.fullmatch(r"[A-Z][A-Z0-9&.-]{1,15}", str(item["term"]))
                ]
            elif field_key in {"crossreference", "cross_reference"}:
                definition_value = [
                    f"{item['term']}: {item['definition']}"
                    for item in term_definitions
                    if re.search(r"\bsee\b|cross[- ]reference", str(item["definition"]), re.I)
                ]
            elif field_key == "roundingnote":
                definition_value = [
                    f"{item['term']}: {item['definition']}"
                    for item in term_definitions
                    if re.search(r"round(?:ed|ing)|approximation", str(item["definition"]), re.I)
                ]
            if definition_value:
                result[field_id] = {
                    "value": definition_value,
                    "source_file": term_definitions[0].get("source_file"),
                    "page_start": term_definitions[0].get("page_start"),
                    "page_end": term_definitions[0].get("page_end"),
                    "evidence_atom_ids": [
                        str(item.get("evidence_atom_id"))
                        for item in term_definitions
                        if item.get("evidence_atom_id")
                    ],
                    "extraction_method": "deterministic_definition_rows_v1",
                    "evidence_status": "section_traceable",
                }
                continue
        existing = _existing_value_for_field(values, field)
        if existing:
            wrapped, source_key = existing
            if isinstance(wrapped, dict):
                result[field_id] = {**wrapped, "contract_source_key": source_key}
            else:
                result[field_id] = {
                    "value": wrapped,
                    "contract_source_key": source_key,
                    "evidence_status": "legacy_traceable",
                }
            continue
        matched_atoms = _atoms_for_field(field, atoms)
        if matched_atoms:
            for atom in matched_atoms:
                atom["priority"] = "required"
                atom["field_id"] = field_id
            value: Any = [atom["value"] for atom in matched_atoms]
            if len(value) == 1:
                value = value[0]
            result[field_id] = {
                "value": value,
                "source_file": matched_atoms[0].get("source_file"),
                "page_start": min(atom.get("page_start") or 0 for atom in matched_atoms) or None,
                "page_end": max(atom.get("page_end") or 0 for atom in matched_atoms) or None,
                "char_start": min(atom.get("char_start") or 0 for atom in matched_atoms),
                "char_end": max(atom.get("char_end") or 0 for atom in matched_atoms),
                "evidence_atom_ids": [atom["id"] for atom in matched_atoms],
                "extraction_method": "deterministic_contract_anchor_v1",
                "evidence_status": "section_traceable",
            }
        else:
            conditional = is_conditional(field_label)
            result[field_id] = {
                "value": None,
                "applicable": False if conditional else None,
                "missing_reason": (
                    "Conditional field is not evidenced as applicable in this section."
                    if conditional
                    else "No section text matched the maintained field anchors."
                ),
                "evidence_status": "not_applicable" if conditional else "missing",
            }
    return result


def _build_materials(
    section: dict[str, Any], contract: dict[str, Any], document_id: str
) -> dict[str, Any]:
    section_id = str(section.get("canonical_section") or "")
    text = section.get("text") or ""
    meta = {
        "source_file": section.get("source_file"),
        "page_start": section.get("page_start"),
        "page_end": section.get("page_end"),
    }
    sentences = _sentence_split(text)
    outline = _extract_outline(text)
    evidence_units, evidence_atoms = _build_evidence_units(
        document_id=document_id,
        section_id=section_id,
        text=text,
        meta=meta,
        contract=contract,
    )
    term_definitions = (
        _term_definitions(text, meta)
        if section_id in {"Glossary_of_Technical_Terms", "Definitions"}
        else []
    )
    if term_definitions:
        default_unit_id = evidence_units[0].get("unitId") if evidence_units else f"{section_id}:01"
        normalized_text = _normalize_ws(text)
        for index, item in enumerate(term_definitions):
            value = f"{item['term']}: {item['definition']}"
            start = normalized_text.find(str(item["term"]))
            atom_id = _atom_id(document_id, section_id, index, "definition", value)
            atom = {
                "id": atom_id,
                "kind": "definition",
                "field_id": f"{section_id}.term_definition",
                "value": value,
                "unit": None,
                "period": None,
                "unit_id": default_unit_id,
                "source_file": meta.get("source_file"),
                "page_start": meta.get("page_start"),
                "page_end": meta.get("page_end"),
                "section_sentence_index": index,
                "char_start": max(start, 0),
                "char_end": max(start, 0) + len(value),
                "priority": "required",
                "evidence_status": "section_traceable",
            }
            item["evidence_atom_id"] = atom_id
            evidence_atoms.append(atom)
            if evidence_units:
                evidence_units[0].setdefault("evidenceAtomIds", []).append(atom_id)
                evidence_units[0]["evidenceAtomCount"] = len(
                    evidence_units[0]["evidenceAtomIds"]
                )
    numeric_atoms = [item for item in evidence_atoms if item["kind"] == "numeric"]
    narrative_atoms = [item for item in evidence_atoms if item["kind"] == "narrative"]
    materials: dict[str, Any] = {
        "schema_version": "section-source-materials/2.0",
        "contract_version": contract.get("version"),
        "contract_source_hash": contract.get("sourceHash"),
        "extraction_method": "deterministic_section_units_v2",
        "section_id": section_id,
        "source_file": section.get("source_file"),
        "page_start": section.get("page_start"),
        "page_end": section.get("page_end"),
        "char_count": len(text),
        "word_count": len(WORD_RE.findall(text)),
        "subsection_outline": outline,
        "key_numeric_facts": numeric_atoms,
        "key_narrative_points": narrative_atoms,
        "evidence_atoms": evidence_atoms,
        "source_excerpt_blocks": [],
        "section_units": evidence_units,
    }
    if term_definitions:
        materials["term_definitions"] = term_definitions

    materials["counts"] = {
        "sentences_seen": len(sentences),
        "outline_items": len(materials["subsection_outline"]),
        "numeric_facts": len(materials["key_numeric_facts"]),
        "narrative_points": len(materials["key_narrative_points"]),
        "evidence_atoms": len(evidence_atoms),
        "section_units": len(evidence_units),
        "excerpt_blocks": 0,
        "term_definitions": len(materials.get("term_definitions") or []),
    }
    return materials


def _toc_index(sections_dir: Path, doc_id: str) -> dict[str, dict[str, Any]]:
    data = _load_json(sections_dir / f"{doc_id}.json")
    out: dict[str, dict[str, Any]] = {}
    for section in data.get("sections", []) or []:
        sid = section.get("canonical_section")
        if sid and sid not in out:
            out[str(sid)] = section
    return out


def enrich_all(
    *,
    input_records_dir: Path,
    sections_dir: Path,
    only_doc: str | None = None,
    only_section: str | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    requirements = _load_json(REQUIREMENTS_PATH)
    contracts_document = compile_execution_contracts(requirements)
    contracts_by_section = {
        contract["sectionId"]: contract
        for contract in contracts_document.get("contracts", {}).values()
    }
    toc_paths = sorted(
        path for path in sections_dir.glob("*.json") if not path.name.startswith("_")
    )
    if only_doc:
        toc_paths = [sections_dir / f"{only_doc}.json"]

    totals = Counter()
    sample_low_density: list[dict[str, Any]] = []
    for toc_path in toc_paths:
        if not toc_path.exists():
            continue
        doc_id = toc_path.stem
        doc_dir = input_records_dir / doc_id
        toc = _toc_index(sections_dir, doc_id)
        for section_id, section in sorted(toc.items()):
            if only_section and section_id != only_section:
                continue
            path = doc_dir / f"{section_id}.json"
            record_exists = path.exists()
            record = _load_json(path)
            totals["files_seen"] += 1
            if not section or not section.get("text"):
                totals["missing_section_text"] += 1
                continue
            if not record_exists:
                record = {
                    "document_id": doc_id,
                    "section_id": section_id,
                    "values": {},
                    "extraction_status": "deterministic_source_materials_only",
                    "coverage_notes": (
                        "No model-extracted schema record was available. Traceable source "
                        "materials were deterministically recovered from the segmented filing."
                    ),
                }
                totals["files_created"] += 1
            contract = contracts_by_section.get(section_id)
            if not contract:
                totals["missing_contract"] += 1
                continue
            materials = _build_materials(section, contract, doc_id)
            values = record.get("values") if isinstance(record.get("values"), dict) else {}
            contract_values = _contract_values(
                values,
                contract,
                materials.get("evidence_atoms") or [],
                materials.get("term_definitions") or [],
            )
            filled = sum(
                1
                for value in contract_values.values()
                if _unwrapped_value(value) not in (None, "", [], {})
            )
            required = len(contract.get("fields") or [])
            if materials["word_count"] >= 1500 and filled <= 5:
                sample_low_density.append(
                    {
                        "document_id": doc_id,
                        "section_id": section_id,
                        "filled_values": filled,
                        "required_values": required,
                        "word_count": materials["word_count"],
                        "numeric_facts": materials["counts"]["numeric_facts"],
                        "narrative_points": materials["counts"]["narrative_points"],
                    }
                )

            evidence_atoms = materials.get("evidence_atoms") or []
            changed = any(
                (
                    record.get("extracted_source_materials") != materials,
                    record.get("contract_values") != contract_values,
                    record.get("evidence_atoms") != evidence_atoms,
                    record.get("section_units") != materials.get("section_units"),
                    record.get("execution_contract")
                    != {
                        "version": contract.get("version"),
                        "prompt_id": contract.get("promptId"),
                        "section_id": contract.get("sectionId"),
                        "source_hash": contract.get("sourceHash"),
                    },
                )
            )
            if changed:
                record["extracted_source_materials"] = materials
                record["contract_values"] = contract_values
                record["evidence_atoms"] = evidence_atoms
                record["section_units"] = materials.get("section_units") or []
                record["execution_contract"] = {
                    "version": contract.get("version"),
                    "prompt_id": contract.get("promptId"),
                    "section_id": contract.get("sectionId"),
                    "source_hash": contract.get("sourceHash"),
                }
                totals["files_enriched"] += 1
                totals["numeric_facts"] += materials["counts"]["numeric_facts"]
                totals["narrative_points"] += materials["counts"]["narrative_points"]
                totals["excerpt_blocks"] += materials["counts"]["excerpt_blocks"]
                totals["term_definitions"] += materials["counts"]["term_definitions"]
                totals["evidence_atoms"] += materials["counts"]["evidence_atoms"]
                totals["contract_fields"] += required
                totals["contract_fields_filled"] += filled
                if not dry_run:
                    doc_dir.mkdir(parents=True, exist_ok=True)
                    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            else:
                totals["unchanged"] += 1

    return {
        "input_records_dir": str(input_records_dir),
        "sections_dir": str(sections_dir),
        "counts": dict(totals),
        "sample_low_density_sections": sample_low_density[:50],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich input records with dense section source materials.")
    parser.add_argument("--input-records-dir", type=Path, default=Path("prospectus_kg_output/inputs/input_records"))
    parser.add_argument("--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc"))
    parser.add_argument("--only-doc")
    parser.add_argument("--only-section")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    report = enrich_all(
        input_records_dir=args.input_records_dir,
        sections_dir=args.sections_dir,
        only_doc=args.only_doc,
        only_section=args.only_section,
        dry_run=args.dry_run,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
