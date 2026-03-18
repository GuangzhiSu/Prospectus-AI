from __future__ import annotations

import json
import re
from typing import Any

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

SEVERITY_ORDER = {"blocker": 4, "high": 3, "medium": 2, "low": 1}
VALID_SEVERITIES = set(SEVERITY_ORDER)


def _normalize_number(token: str) -> str:
    return token.replace(",", "").replace(" ", "").lower()


def _collect_supported_numbers(context: str) -> set[str]:
    numbers = {
        _normalize_number(token)
        for token in NUMERIC_TOKEN_RE.findall(context or "")
    }
    return {value for value in numbers if len(value) >= 2}


def _collect_draft_numbers(text: str) -> set[str]:
    numbers = {
        _normalize_number(token)
        for token in NUMERIC_TOKEN_RE.findall(text or "")
    }
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
    """Run deterministic checks before the verifier agent reviews the draft."""
    issues: list[VerificationIssue] = []
    lower_text = (draft_text or "").lower()

    for pattern, code in BANNED_PROMOTIONAL_PATTERNS:
        if re.search(pattern, lower_text):
            issues.append(
                {
                    "severity": "medium",
                    "code": code,
                    "message": "Promotional wording detected; consider neutral sponsor-counsel phrasing.",
                    "category": "WRITING_ERROR",
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
                        "category": "WRITING_ERROR",
                    }
                )

    for pattern, code in PROFIT_FORECAST_PATTERNS:
        if re.search(pattern, lower_text):
            issues.append(
                {
                    "severity": "high",
                    "code": code,
                    "message": "Potential explicit or implicit profit-forecast wording detected.",
                    "category": "WRITING_ERROR",
                }
            )

    if not draft_text.strip():
        issues.append(
            {
                "severity": "high",
                "code": "empty_draft",
                "message": "The writer agent returned an empty draft.",
                "category": "WRITING_ERROR",
            }
        )

    needs_citation = any(
        re.search(pattern, lower_text) for pattern, _ in MARKET_CLAIM_PATTERNS
    )
    if needs_citation and "[[ai:cite|" not in lower_text:
        issues.append(
            {
                "severity": "high",
                "code": "missing_ai_cite",
                "message": "Market statistic, ranking, or leadership wording appears without an [[AI:CITE|...]] tag.",
                "category": "WRITING_ERROR",
            }
        )

    supported_numbers = _collect_supported_numbers(retrieval_context)
    draft_numbers = _collect_draft_numbers(draft_text)
    unsupported_numbers = sorted(
        number
        for number in draft_numbers
        if number not in supported_numbers
        and not re.fullmatch(r"\d{4}", number)
    )
    if unsupported_numbers:
        preview = ", ".join(unsupported_numbers[:8])
        issues.append(
            {
                "severity": "medium",
                "code": "unsupported_numbers",
                "message": (
                    "Numeric values found in the draft but not clearly located in "
                    f"retrieved evidence: {preview}."
                ),
                "category": "WRITING_ERROR",
            }
        )

    if (
        "[information not provided in the documents]" in lower_text
        and "[[ai:verify|" not in lower_text
    ):
        issues.append(
            {
                "severity": "low",
                "code": "missing_verify_tags_for_gaps",
                "message": (
                    "Missing-information placeholders are present but no "
                    "[[AI:VERIFY|...]] guidance tag was added."
                ),
                "category": "WRITING_ERROR",
            }
        )

    passed = not any(
        issue["severity"] in {"blocker", "high"} for issue in issues
    )
    return issues, passed


def extract_json_payload(raw_output: str) -> dict[str, Any] | None:
    """
    Extract a JSON object from an LLM verifier response.

    The verifier agent is asked to return JSON only, but this helper tolerates
    fenced blocks or extra prose around the payload.
    """
    text = (raw_output or "").strip()
    if not text:
        return None

    candidates = [text]
    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fenced_match:
        candidates.insert(0, fenced_match.group(1))

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidates.append(text[first_brace : last_brace + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def parse_verifier_agent_output(
    raw_output: str,
) -> tuple[bool | None, str, list[VerificationIssue], list[str]]:
    """
    Parse the verifier-agent response.

    Expected shape:
    {
      "pass": true|false,
      "summary": "...",
      "issues": [{"severity": "...", "code": "...", "message": "..."}],
      "revision_instructions": ["...", "..."]
    }
    """
    payload = extract_json_payload(raw_output)
    if payload is None:
        return (
            None,
            "Verifier agent did not return parseable JSON.",
            [
                {
                    "severity": "high",
                    "code": "verifier_output_unparseable",
                    "message": "Verifier agent response could not be parsed into the required JSON format.",
                    "category": "WRITING_ERROR",
                }
            ],
            [
                "Re-review the draft and restate verification issues in the required structured format."
            ],
        )

    agent_pass = payload.get("pass")
    if not isinstance(agent_pass, bool):
        agent_pass = None

    summary = payload.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        summary = "Verifier agent did not provide a summary."

    VALID_CATEGORIES = {"DATA_MISSING", "WRITING_ERROR"}
    issues_payload = payload.get("issues", [])
    parsed_issues: list[VerificationIssue] = []
    if isinstance(issues_payload, list):
        for idx, item in enumerate(issues_payload):
            if not isinstance(item, dict):
                continue
            severity = str(item.get("severity", "medium")).lower().strip()
            if severity not in VALID_SEVERITIES:
                severity = "medium"
            code = str(item.get("code", f"verifier_issue_{idx + 1}")).strip() or f"verifier_issue_{idx + 1}"
            message = str(item.get("message", "")).strip() or "Verifier agent raised an issue without message."
            category = str(item.get("category", "WRITING_ERROR")).strip().upper()
            if category not in VALID_CATEGORIES:
                category = "WRITING_ERROR"
            parsed_issues.append(
                {
                    "severity": severity,
                    "code": code,
                    "message": message,
                    "category": category,
                }
            )

    revision_payload = payload.get("revision_instructions", [])
    revision_instructions: list[str] = []
    if isinstance(revision_payload, list):
        for item in revision_payload:
            if isinstance(item, str) and item.strip():
                revision_instructions.append(item.strip())
    elif isinstance(revision_payload, str) and revision_payload.strip():
        revision_instructions.append(revision_payload.strip())

    return agent_pass, summary, parsed_issues, revision_instructions


def merge_verification_issues(
    *issue_lists: list[VerificationIssue],
) -> list[VerificationIssue]:
    merged: list[VerificationIssue] = []
    seen: set[tuple[str, str]] = set()
    for issue_list in issue_lists:
        for issue in issue_list:
            key = (issue["code"], issue["message"])
            if key in seen:
                continue
            seen.add(key)
            merged.append(issue)
    merged.sort(
        key=lambda issue: (
            -SEVERITY_ORDER.get(issue["severity"], 0),
            issue["code"],
        )
    )
    return merged


def should_request_revision(
    *,
    issues: list[VerificationIssue],
    agent_pass: bool | None,
    revision_count: int,
    max_revision_loops: int,
) -> bool:
    """
    Request revision only for WRITING_ERROR issues. DATA_MISSING issues indicate
    source data gaps - the Writer cannot fix them, so we do not revise.
    """
    if revision_count >= max_revision_loops:
        return False

    # Only WRITING_ERROR issues can trigger revision; DATA_MISSING = data gap, not Writer fault
    revision_worthy = [
        i for i in issues
        if i.get("category", "WRITING_ERROR") == "WRITING_ERROR"
    ]

    for issue in revision_worthy:
        if issue["severity"] in {"blocker", "high"}:
            return True

    return False


def append_verification_notes(
    draft_text: str,
    issues: list[VerificationIssue],
    *,
    passed: bool,
    summary: str = "",
    revision_instructions: list[str] | None = None,
) -> str:
    revision_instructions = revision_instructions or []
    if not issues and not summary.strip():
        return draft_text.strip()

    status = "passed" if passed else "requires follow-up"
    notes = [
        "",
        "### Verification Notes",
        "",
        f"Verification status: {status}.",
    ]
    if summary.strip():
        notes.extend(["", f"Verifier summary: {summary.strip()}"])
    if issues:
        notes.append("")
        for issue in issues:
            cat = issue.get("category", "")
            suffix = f" [{cat}]" if cat else ""
            notes.append(
                f"- [{issue['severity']}]{suffix} {issue['code']}: {issue['message']}"
            )
    if revision_instructions:
        notes.extend(["", "Suggested revision actions:"])
        for item in revision_instructions:
            notes.append(f"- {item}")

    return draft_text.strip() + "\n" + "\n".join(notes).rstrip() + "\n"
