from __future__ import annotations

import re

from prospectus_graph.state import VerificationIssue

BANNED_PROMOTIONAL_PATTERNS = [
    (r"\bworld[- ]class\b", "promotional_world_class"),
    (r"\bunmatched\b", "promotional_unmatched"),
    (r"\bbreakthrough\b", "promotional_breakthrough"),
    (r"\bgame[- ]changing\b", "promotional_game_changing"),
    (r"\bdisruptive\b", "promotional_disruptive"),
]

UNQUALIFIED_FORWARD_LOOKING_PATTERNS = [
    (r"\bwill\b", "future_will"),
    (r"\bshall\b", "future_shall"),
    (r"\bguarantee\b", "future_guarantee"),
    (r"\bensure\b", "future_ensure"),
    (r"\balways\b", "future_always"),
    (r"\bnever\b", "future_never"),
]

MARKET_CLAIM_PATTERNS = [
    (r"\bleading\b", "market_claim_leading"),
    (r"\blargest\b", "market_claim_largest"),
    (r"\branked\b", "market_claim_ranked"),
    (r"\bmarket share\b", "market_claim_share"),
    (r"\bcagr\b", "market_claim_cagr"),
    (r"\bcompound annual growth\b", "market_claim_cagr"),
]

PROFIT_FORECAST_PATTERNS = [
    (r"\bprofitability by \d{4}\b", "profit_forecast_profitability_by_year"),
    (r"\bnet margin will\b", "profit_forecast_margin"),
    (r"\bearnings will\b", "profit_forecast_earnings"),
    (r"\bwe expect net profit\b", "profit_forecast_expected_profit"),
    (r"\bwe expect net loss\b", "profit_forecast_expected_loss"),
]

NUMERIC_TOKEN_RE = re.compile(
    r"(?:(?:HK\$|US\$|RMB|\$)\s?)?\d[\d,]*(?:\.\d+)?%?"
)


def _normalize_number(token: str) -> str:
    return token.replace(",", "").replace(" ", "").lower()


def _collect_supported_numbers(context: str) -> set[str]:
    numbers = {_normalize_number(token) for token in NUMERIC_TOKEN_RE.findall(context or "")}
    # Ignore very short standalone digits because they are often list markers.
    return {value for value in numbers if len(value) >= 2}


def _collect_draft_numbers(text: str) -> set[str]:
    numbers = {_normalize_number(token) for token in NUMERIC_TOKEN_RE.findall(text or "")}
    return {
        value
        for value in numbers
        if len(value) >= 2 and not value.endswith(".")
    }


def verify_section_draft(
    *,
    section_id: str,
    draft_text: str,
    retrieval_context: str,
) -> tuple[list[VerificationIssue], bool]:
    issues: list[VerificationIssue] = []
    lower_text = (draft_text or "").lower()

    for pattern, code in BANNED_PROMOTIONAL_PATTERNS:
        if re.search(pattern, lower_text):
            issues.append(
                {
                    "severity": "medium",
                    "code": code,
                    "message": "Promotional wording detected; consider neutral sponsor-counsel phrasing.",
                }
            )

    if section_id != "ForwardLooking":
        for pattern, code in UNQUALIFIED_FORWARD_LOOKING_PATTERNS:
            if re.search(pattern, lower_text):
                issues.append(
                    {
                        "severity": "medium",
                        "code": code,
                        "message": "Potentially unqualified forward-looking wording detected outside the Forward-Looking Statements section.",
                    }
                )

    for pattern, code in PROFIT_FORECAST_PATTERNS:
        if re.search(pattern, lower_text):
            issues.append(
                {
                    "severity": "high",
                    "code": code,
                    "message": "Potential explicit or implicit profit-forecast wording detected.",
                }
            )

    if not draft_text.strip():
        issues.append(
            {
                "severity": "high",
                "code": "empty_draft",
                "message": "The writer node returned an empty draft.",
            }
        )

    needs_citation = any(re.search(pattern, lower_text) for pattern, _ in MARKET_CLAIM_PATTERNS)
    if needs_citation and "[[ai:cite|" not in lower_text:
        issues.append(
            {
                "severity": "high",
                "code": "missing_ai_cite",
                "message": "Market statistic, ranking, or leadership wording appears without an [[AI:CITE|...]] tag.",
            }
        )

    supported_numbers = _collect_supported_numbers(retrieval_context)
    draft_numbers = _collect_draft_numbers(draft_text)
    unsupported_numbers = sorted(
        number
        for number in draft_numbers
        if number not in supported_numbers
        and not re.fullmatch(r"\d{4}", number)  # common year references
    )
    if unsupported_numbers:
        preview = ", ".join(unsupported_numbers[:8])
        issues.append(
            {
                "severity": "medium",
                "code": "unsupported_numbers",
                "message": f"Numeric values found in the draft but not clearly located in retrieved evidence: {preview}.",
            }
        )

    if "[information not provided in the documents]" in lower_text and "[[ai:verify|" not in lower_text:
        issues.append(
            {
                "severity": "low",
                "code": "missing_verify_tags_for_gaps",
                "message": "Missing-information placeholders are present but no [[AI:VERIFY|...]] guidance tag was added.",
            }
        )

    passed = not any(issue["severity"] == "high" for issue in issues)
    return issues, passed


def append_verification_notes(
    draft_text: str,
    issues: list[VerificationIssue],
    *,
    passed: bool,
) -> str:
    if not issues:
        return draft_text.strip()

    status = "passed" if passed else "requires follow-up"
    notes = [
        "",
        "### Verification Notes",
        "",
        f"Verification status: {status}.",
        "",
    ]
    for issue in issues:
        notes.append(
            f"- [{issue['severity']}] {issue['code']}: {issue['message']}"
        )
    return draft_text.strip() + "\n" + "\n".join(notes).rstrip() + "\n"
