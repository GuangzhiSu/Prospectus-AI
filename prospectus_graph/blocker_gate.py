"""
Document-level blocker gate (post-build). Complements per-section verifier.
Blockers surface in validation_report.md; pipeline may still write drafts for counsel review.
"""

from __future__ import annotations

import re
from typing import Any

from prospectus_graph.ai_tag_schema import find_malformed_cite_tags, find_unresolved_xref_tags
from prospectus_graph.issuer_metadata import load_issuer_metadata

Issue = dict[str, Any]


def _use_of_proceeds_percent_sum_ok(text: str) -> tuple[bool, str | None]:
    """
    If Use of Proceeds section lists percentages, they should sum to ~100%.
    Heuristic: extract lines with % in the UseOfProceeds section only.
    """
    lower = text.lower()
    start = lower.find("future plans and use of proceeds")
    if start == -1:
        start = lower.find("use of proceeds")
    if start == -1:
        return True, None
    end = lower.find("underwriting", start)
    chunk = text[start : end if end != -1 else len(text)]
    percents: list[float] = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*%", chunk):
        try:
            percents.append(float(m.group(1)))
        except ValueError:
            continue
    if len(percents) < 2:
        return True, None
    s = sum(percents)
    if abs(s - 100.0) > 1.0:
        return False, f"Use of Proceeds percentage lines sum to ~{s:.1f}% (expected 100%)."
    return True, None


def run_document_blockers(
    combined_markdown: str,
    *,
    issuer_metadata_path: Any = None,
) -> list[Issue]:
    """
    Deterministic document-level checks. Returns issues with severity 'blocker' or 'high'.
    """
    from pathlib import Path

    meta = load_issuer_metadata(Path(issuer_metadata_path) if issuer_metadata_path else None)
    text = combined_markdown or ""
    lower = text.lower()
    issues: list[Issue] = []

    # Rule 11.20 / locked disclaimer presence (heuristic)
    if "11.20" not in lower and "[[ai:locked|" not in lower and "rule 11" not in lower:
        issues.append(
            {
                "severity": "blocker",
                "code": "rule_11_20_missing",
                "message": "No Rule 11.20 / responsibility disclaimer anchor detected (expect locked block or explicit 11.20 reference).",
                "category": "WRITING_ERROR",
            }
        )

    if meta.get("needs_how_to_apply"):
        if "how to apply" not in lower:
            issues.append(
                {
                    "severity": "blocker",
                    "code": "how_to_apply_missing",
                    "message": "Issuer metadata requires How to Apply; no 'How to Apply' disclosure found in combined draft.",
                    "category": "WRITING_ERROR",
                }
            )

    # Appendices in Contents
    if "contents" in lower:
        contents_idx = lower.find("contents")
        window = lower[contents_idx : contents_idx + 4000]
        if "appendix" not in window and "appendices" not in window:
            issues.append(
                {
                    "severity": "blocker",
                    "code": "appendices_missing_in_contents",
                    "message": "Contents section does not reference appendices (add entries or DATA_MISSING placeholders).",
                    "category": "WRITING_ERROR",
                }
            )

    for raw in find_unresolved_xref_tags(text):
        issues.append(
            {
                "severity": "blocker",
                "code": "unresolved_ai_xref",
                "message": f"Unresolved or empty [[AI:XREF|...]]: {raw[:120]}",
                "category": "WRITING_ERROR",
            }
        )

    for raw in find_malformed_cite_tags(text):
        issues.append(
            {
                "severity": "high",
                "code": "citation_schema",
                "message": f"CITE tag missing required fields (source + doc/page/section): {raw[:160]}",
                "category": "WRITING_ERROR",
            }
        )

    ok, msg = _use_of_proceeds_percent_sum_ok(text)
    if not ok and msg:
        issues.append(
            {
                "severity": "blocker",
                "code": "use_of_proceeds_percent_not_100",
                "message": msg,
                "category": "WRITING_ERROR",
            }
        )

    # Summary vs financial number consistency (lightweight)
    summary_nums = set(re.findall(r"\b\d[\d,]*(?:\.\d+)?\s*%", text[:8000]))
    fin_nums = set(re.findall(r"\b\d[\d,]*(?:\.\d+)?\s*%", text))
    if summary_nums and fin_nums and not (summary_nums & fin_nums):
        issues.append(
            {
                "severity": "medium",
                "code": "summary_financial_numbers_unreconciled",
                "message": "No overlapping % figures between opening sections and financial sections — verify Summary vs Financial Information consistency.",
                "category": "WRITING_ERROR",
            }
        )

    return issues


def merge_gate_issues(
    document_issues: list[Issue],
    per_section_unparseable: list[Issue],
) -> list[Issue]:
    """Combine document blockers with collected verifier unparseable issues."""
    return document_issues + per_section_unparseable
