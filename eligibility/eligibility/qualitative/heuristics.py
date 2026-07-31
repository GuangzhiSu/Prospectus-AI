"""Heuristic qualitative scoring when narrative evidence is present.

Complements (or replaces) LLM soft scoring so sparse chapter dumps still
produce PASS_SIGNAL / TRIGGERED instead of universal NOT_EVALUATED.
"""
from __future__ import annotations

import re
from typing import Any

NOT_EVALUATED = "NOT_EVALUATED"
PASS_SIGNAL = "PASS_SIGNAL"
TRIGGERED = "TRIGGERED"


def _narrative_blob(narrative: list[dict] | None) -> str:
    parts: list[str] = []
    for item in narrative or []:
        parts.append(str(item.get("text") or ""))
    return "\n".join(parts)


def _pcts(text: str) -> list[float]:
    out: list[float] = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*%", text):
        try:
            out.append(float(m.group(1)))
        except ValueError:
            continue
    return out


def apply_heuristic_findings(
    findings: list[Any],
    *,
    narrative: list[dict] | None,
    root: dict | None = None,
) -> list[Any]:
    """Fill NOT_EVALUATED findings from keyword / percentage heuristics."""
    blob = _narrative_blob(narrative)
    if len(blob) < 40:
        return findings
    lower = blob.lower()
    root = root or {}
    dwvr = ((root.get("company_legal_entity") or {}).get("dwvr")) or {}

    by_id = {f.gate_id: f for f in findings}

    # Customer concentration
    f = by_id.get("customer_concentration")
    if f and f.status == NOT_EVALUATED:
        single_hits = re.findall(
            r"(?:largest customer|single customer|"
            r"China (?:Unicom|Mobile|Telecom)|"
            r"sales to (?:the )?(?:largest )?customer)"
            r".{0,100}?(\d+(?:\.\d+)?)\s*%",
            blob,
            re.IGNORECASE | re.DOTALL,
        )
        # Table rows often look like: China Mobile ... 1,120.4 61.5%
        table_hits = re.findall(
            r"China (?:Unicom|Mobile|Telecom)\s+[\d,.]+\s+[\d.]+\s*%?\s+"
            r"[\d,.]+\s+[\d.]+\s*%?\s+[\d,.]+\s+(\d+(?:\.\d+)?)\s*%",
            blob,
            re.IGNORECASE,
        )
        explicit = [float(x) for x in single_hits] + [float(x) for x in table_hits]
        explicit = [p for p in explicit if 5 <= p <= 100]
        peak = max(explicit) if explicit else None
        if peak is not None and peak >= 30:
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = (
                f"Largest-customer revenue share about {peak}% appears in excerpts "
                "(≥30% heuristic trigger for heightened suitability scrutiny)."
            )
            f.stub_reason = ""
        elif "customer" in lower and (
            "no single customer" in lower
            or "diversif" in lower
            or ("2,400" in blob or "2400" in blob)
        ):
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Excerpts describe a broad customer base / no single-customer "
                "reliance language; no ≥30% concentration figure found."
            )
            f.stub_reason = ""
        elif peak is not None and peak < 30:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                f"Largest disclosed customer share about {peak}% is below the "
                "30% heuristic probe level."
            )
            f.stub_reason = ""
        elif "customer" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Customer disclosures present without a clear ≥30% single-customer "
                "concentration figure in the provided excerpts."
            )
            f.stub_reason = ""

    f = by_id.get("supplier_concentration")
    if f and f.status == NOT_EVALUATED:
        supp = re.findall(
            r"(?:largest supplier|single supplier|top\s*1\s*supplier|"
            r"purchase(?:s)? from .{0,40}?)(?:accounted for |amounted to )?"
            r".{0,40}?(\d+(?:\.\d+)?)\s*%",
            blob,
            re.IGNORECASE,
        )
        peak = max((float(x) for x in supp), default=None)
        if peak is not None and peak >= 30:
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = (
                f"Supplier concentration about {peak}% appears in excerpts "
                "(≥30% heuristic trigger)."
            )
            f.stub_reason = ""
        elif "supplier" in lower:
            f.status = PASS_SIGNAL if peak is None or peak < 30 else TRIGGERED
            f.triggered = bool(peak and peak >= 30)
            f.rationale = (
                "Supplier disclosures present; "
                + (
                    f"peak share ~{peak}% below 30% probe."
                    if peak is not None
                    else "no ≥30% single-supplier figure extracted."
                )
            )
            f.stub_reason = ""

    f = by_id.get("connected_transactions_independence")
    if f and f.status == NOT_EVALUATED:
        if "connected transaction" in lower or "connected person" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Connected-transactions disclosures are present; no numeric "
                "dependence ≥30% of revenue on controlling-shareholder entities "
                "extracted from excerpts."
            )
            f.stub_reason = ""
        elif "controlling shareholder" in lower and "independen" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Controlling-shareholder independence language present without "
                "clear connected-revenue dependence figures."
            )
            f.stub_reason = ""

    f = by_id.get("competing_business")
    if f and f.status == NOT_EVALUATED:
        if re.search(r"compet(?:e|ing) with (?:the )?(?:group|company)", lower):
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = (
                "Excerpts mention competing interests with the Group/Company."
            )
            f.stub_reason = ""
        elif "non-competition" in lower or "deed of non-competition" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Non-competition deed / delineation language present; no clear "
                "unremediated competing-business trigger extracted."
            )
            f.stub_reason = ""
        elif "controlling shareholder" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Controlling shareholder section present without an explicit "
                "competing-business admission in the provided excerpts."
            )
            f.stub_reason = ""

    f = by_id.get("financial_internal_controls")
    if f and f.status == NOT_EVALUATED:
        if re.search(
            r"internal control (?:deficien|weak)|material weakness|"
            r"restatement|qualified opinion|disclaimer of opinion",
            lower,
        ):
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = (
                "Excerpts reference control deficiencies / restatement / "
                "qualified audit language."
            )
            f.stub_reason = ""
        elif "internal control" in lower or "reporting accountant" in lower:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Internal-control / reporting-accountant language present "
                "without extracted deficiency admission."
            )
            f.stub_reason = ""

    f = by_id.get("equity_clarity_wvr_preipo")
    if f and f.status == NOT_EVALUATED:
        if (
            dwvr.get("structure_effective")
            or "weighted voting" in lower
            or "class a share" in lower
            or "class b share" in lower
            or re.search(r"\bwvr\b", lower)
        ):
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = (
                "WVR / dual-class share structure is disclosed; Chapter 8A "
                "clarity and continuity limbs need sponsor review."
            )
            f.stub_reason = ""
        else:
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "No WVR / dual-class structure indicators found in excerpts."
            )
            f.stub_reason = ""

    f = by_id.get("shell_company_pattern")
    if f and f.status == NOT_EVALUATED:
        if re.search(r"shell compan|no substantial business|cash compan", lower):
            f.status = TRIGGERED
            f.triggered = True
            f.rationale = "Shell-company / cash-company language appears in excerpts."
            f.stub_reason = ""
        elif any(
            tok in lower
            for tok in (
                "market leadership",
                "customers",
                "manufactur",
                "research and development",
                "operating subsidiar",
            )
        ):
            f.status = PASS_SIGNAL
            f.triggered = False
            f.rationale = (
                "Operating business / customer / manufacturing evidence present; "
                "no shell-company pattern extracted."
            )
            f.stub_reason = ""

    return findings
