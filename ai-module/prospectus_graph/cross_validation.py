"""
Cross-section consistency validation (spec §37) and missing-input collection (spec §38).

Deterministic, heuristic checks that run after all sections are drafted.
They complement the per-section LLM verifier and the document blocker gate:
this module compares figures/entities ACROSS sections, which neither of the
other two layers does.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from prospectus_graph.config import SECTIONS
from prospectus_graph.issuer_metadata import load_issuer_metadata

Issue = dict[str, Any]

_PLACEHOLDER = "\u25cf"  # ●

_SECTION_NAME_BY_ID = dict(SECTIONS)


def split_sections(combined_markdown: str) -> dict[str, str]:
    """Split combined draft into {section_id: text} using '## <display name>' headings."""
    text = combined_markdown or ""
    positions: list[tuple[int, str]] = []
    for sid, name in SECTIONS:
        m = re.search(rf"^##\s+{re.escape(name)}\s*$", text, flags=re.MULTILINE)
        if m:
            positions.append((m.start(), sid))
    positions.sort()
    out: dict[str, str] = {}
    for i, (start, sid) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        out[sid] = text[start:end]
    return out


# ---------------------------------------------------------------------------
# Extraction helpers
# ---------------------------------------------------------------------------

_STOCK_CODE_RE = re.compile(r"[Ss]tock\s+[Cc]ode[:\s]+\(?([0-9]{3,5})\)?")
_PRICE_RANGE_RE = re.compile(
    r"HK\$\s*([\d,]+(?:\.\d+)?)\s*(?:to|and|[-\u2013\u2014])\s*HK\$\s*([\d,]+(?:\.\d+)?)"
)
_BIG_SHARE_NUM_RE = re.compile(r"\b(\d{1,3}(?:,\d{3}){2,})\s+(?:Offer\s+)?[Ss]hares\b")


def _stock_codes(text: str) -> set[str]:
    return set(_STOCK_CODE_RE.findall(text or ""))


def _price_ranges(text: str) -> set[tuple[str, str]]:
    return {
        (a.replace(",", ""), b.replace(",", ""))
        for a, b in _PRICE_RANGE_RE.findall(text or "")
    }


def _share_numbers(text: str) -> set[str]:
    return {m.replace(",", "") for m in _BIG_SHARE_NUM_RE.findall(text or "")}


def _content_words(line: str) -> set[str]:
    return {w.lower() for w in re.findall(r"[A-Za-z]{4,}", line)}


def _summary_risk_lines(summary_text: str) -> list[str]:
    """Bullet lines under a 'risk'-titled heading inside Summary."""
    lines = (summary_text or "").splitlines()
    out: list[str] = []
    in_risk = False
    for line in lines:
        if re.match(r"^#{2,4}\s", line):
            in_risk = "risk" in line.lower()
            continue
        if in_risk and re.match(r"^\s*[-*\u2022]\s+\S", line):
            stripped = re.sub(r"^\s*[-*\u2022]\s+", "", line).strip()
            if len(stripped) > 15 and "DATA_MISSING" not in stripped:
                out.append(stripped)
    return out


# ---------------------------------------------------------------------------
# Checks (spec §37)
# ---------------------------------------------------------------------------


def _check_stock_code(sections: dict[str, str], issues: list[Issue], passed: list[str]) -> None:
    codes: dict[str, set[str]] = {}
    for sid, text in sections.items():
        found = _stock_codes(text)
        if found:
            codes[sid] = found
    all_codes = set().union(*codes.values()) if codes else set()
    if len(all_codes) > 1:
        issues.append(
            {
                "severity": "blocker",
                "code": "stock_code_mismatch",
                "message": f"Multiple stock codes found across sections: {sorted(all_codes)} in {sorted(codes)}.",
                "category": "WRITING_ERROR",
            }
        )
    elif all_codes:
        passed.append("stock_code_consistent")


def _check_offer_price_range(
    sections: dict[str, str], issues: list[Issue], passed: list[str]
) -> None:
    target_ids = ["Cover", "GlobalOfferingStructure", "HowToApply", "UseOfProceeds", "ExpectedTimetable"]
    ranges: dict[str, set[tuple[str, str]]] = {}
    for sid in target_ids:
        found = _price_ranges(sections.get(sid, ""))
        if found:
            ranges[sid] = found
    if len(ranges) >= 2:
        union = set().union(*ranges.values())
        common = set.intersection(*ranges.values())
        if len(union) > 1 and not common:
            issues.append(
                {
                    "severity": "high",
                    "code": "offer_price_range_unreconciled",
                    "message": f"Offer price ranges differ across sections: { {k: sorted(v) for k, v in ranges.items()} }.",
                    "category": "WRITING_ERROR",
                }
            )
        else:
            passed.append("offer_price_range_consistent")


def _check_share_numbers(
    sections: dict[str, str], issues: list[Issue], passed: list[str]
) -> None:
    cover_nums = _share_numbers(sections.get("Cover", ""))
    structure_nums = _share_numbers(sections.get("GlobalOfferingStructure", ""))
    if cover_nums and structure_nums:
        if cover_nums & structure_nums:
            passed.append("offer_share_numbers_overlap")
        else:
            issues.append(
                {
                    "severity": "high",
                    "code": "offer_share_numbers_unreconciled",
                    "message": "No overlapping share counts between Cover and Structure of the Global Offering.",
                    "category": "WRITING_ERROR",
                }
            )


def _check_summary_risks(
    sections: dict[str, str], issues: list[Issue], passed: list[str]
) -> None:
    summary = sections.get("Summary", "")
    risk_factors = sections.get("RiskFactors", "")
    if not summary or not risk_factors:
        return
    risk_words = _content_words(risk_factors)
    missing: list[str] = []
    checked = 0
    for line in _summary_risk_lines(summary):
        words = _content_words(line)
        if not words:
            continue
        checked += 1
        overlap = len(words & risk_words) / len(words)
        if overlap < 0.5:
            missing.append(line[:120])
    if missing:
        issues.append(
            {
                "severity": "high",
                "code": "summary_risk_not_in_risk_factors",
                "message": "Summary key risks not clearly found in Risk Factors: " + " | ".join(missing[:5]),
                "category": "WRITING_ERROR",
            }
        )
    elif checked:
        passed.append("summary_risks_in_risk_factors")


def _check_regime_sections(
    sections: dict[str, str],
    meta: dict[str, Any],
    issues: list[Issue],
    passed: list[str],
) -> None:
    """Triggered-regime disclosures must appear in the linked sections (spec §37.5/§37.9)."""

    def _require(flag: str, phrase: str, section_ids: list[str], code: str) -> None:
        if not meta.get(flag):
            return
        missing = [
            sid
            for sid in section_ids
            if sections.get(sid) and phrase not in sections[sid].lower()
        ]
        if missing:
            issues.append(
                {
                    "severity": "high",
                    "code": code,
                    "message": f"{flag} is set but '{phrase}' not found in: {missing}.",
                    "category": "WRITING_ERROR",
                }
            )
        else:
            passed.append(code + "_ok")

    _require(
        "is_wr",
        "weighted voting rights",
        ["Summary", "RiskFactors", "ShareCapital"],
        "wvr_disclosure_linkage",
    )
    _require(
        "has_vie",
        "contractual arrangement",
        ["RiskFactors", "ContractualArrangements", "ConnectedTransactions"],
        "vie_disclosure_linkage",
    )
    _require(
        "is_18c",
        "specialist technology",
        ["Summary", "RiskFactors"],
        "chapter_18c_disclosure_linkage",
    )


# ---------------------------------------------------------------------------
# Missing-input collection (spec §38)
# ---------------------------------------------------------------------------


def collect_missing_inputs(sections: dict[str, str]) -> list[dict[str, Any]]:
    """Collect [●] / DATA_MISSING / COUNSEL_INPUT_REQUIRED items with severity."""
    out: list[dict[str, Any]] = []
    for sid, text in sections.items():
        name = _SECTION_NAME_BY_ID.get(sid, sid)
        for i, line in enumerate((text or "").splitlines()):
            u = line.upper()
            severity: str | None = None
            if "COUNSEL_INPUT_REQUIRED" in u:
                severity = "high"
            elif "DATA_MISSING" in u:
                severity = "medium"
            elif _PLACEHOLDER in line:
                severity = "medium"
            if severity:
                out.append(
                    {
                        "section": sid,
                        "section_name": name,
                        "field": line.strip()[:160],
                        "severity": severity,
                        "line_hint": i + 1,
                        "reason": "Unresolved placeholder in drafted output.",
                    }
                )
    return out


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def run_cross_section_validation(
    combined_markdown: str,
    *,
    issuer_metadata_path: Path | None = None,
) -> dict[str, Any]:
    """
    Run all deterministic cross-section checks.

    Returns: {passed_checks, warnings, errors, missing_inputs, suggested_fixes}
    (errors = blocker/high issues; warnings = medium/low issues).
    """
    meta = load_issuer_metadata(issuer_metadata_path)
    sections = split_sections(combined_markdown)

    issues: list[Issue] = []
    passed: list[str] = []

    _check_stock_code(sections, issues, passed)
    _check_offer_price_range(sections, issues, passed)
    _check_share_numbers(sections, issues, passed)
    _check_summary_risks(sections, issues, passed)
    _check_regime_sections(sections, meta, issues, passed)

    errors = [i for i in issues if i.get("severity") in ("blocker", "high")]
    warnings = [i for i in issues if i.get("severity") in ("medium", "low")]
    missing_inputs = collect_missing_inputs(sections)

    suggested_fixes = [
        f"[{i.get('code')}] Reconcile: {i.get('message', '')[:200]}" for i in errors
    ]

    return {
        "passed_checks": passed,
        "warnings": warnings,
        "errors": errors,
        "missing_inputs": missing_inputs,
        "suggested_fixes": suggested_fixes,
    }
