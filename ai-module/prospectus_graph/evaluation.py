"""Deterministic prospectus-draft evaluation.

These checks intentionally separate input quality from output quality.  They do
not call an LLM and never expose the reference section to the Writer.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Iterable

from .execution_contract import normalize_identifier


AI_TAG_RE = re.compile(r"\[\[AI:[^\]]+\]\]", re.IGNORECASE)
TRAILING_AI_TAG_RE = re.compile(r"\s*\[\[AI:[^\]]*\Z", re.IGNORECASE)
VERIFICATION_BLOCK_RE = re.compile(
    r"(?:\n### Verification Notes\b.*|\n*---\s*\n*AI verification notes.*)\Z",
    re.IGNORECASE | re.DOTALL,
)
HTML_TABLE_RE = re.compile(r"<table\b[^>]*>.*?</table>", re.IGNORECASE | re.DOTALL)
HTML_ROW_RE = re.compile(r"<tr\b[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
HTML_CELL_RE = re.compile(
    r"<(th|td)\b[^>]*>(.*?)</\1>", re.IGNORECASE | re.DOTALL
)
PLACEHOLDER_RE = re.compile(
    r"(?:\[●[^\]]*\]|DATA_MISSING|Information not provided)", re.IGNORECASE
)
NUMBER_RE = re.compile(
    r"(?<![A-Za-z])(?:HK\$|RMB|US\$|USD|HKD)?\s*"
    r"(?:\(?-?\d[\d,]*(?:\.\d+)?\)?%?|20\d{2})(?![A-Za-z])",
    re.IGNORECASE,
)
DATE_RE = re.compile(
    r"\b(?:(?:January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+\d{1,2},?\s+20\d{2}|"
    r"\d{1,2}\s+(?:January|February|March|April|May|June|July|August|"
    r"September|October|November|December)\s+20\d{2})\b",
    re.IGNORECASE,
)
ENTITY_RE = re.compile(
    r"\b(?:[A-Z][A-Za-z&'’.-]+(?:\s+|,\s*)){1,8}"
    r"(?:Company|Co\.?|Limited|Ltd\.?|Inc\.?|Corporation|Holdings|Group|"
    r"Securities|Capital|Bank)\b"
)
HEADING_RE = re.compile(r"^#{1,6}\s+(.+?)\s*$", re.MULTILINE)
REFERENCE_HEADING_RE = re.compile(r"^[A-Z][A-Z0-9 &(),/\-'’]{2,100}$", re.MULTILINE)


def _html_cell_text(value: str) -> str:
    replacements = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'",
        "&#x27;": "'",
    }
    cleaned = re.sub(r"<br\s*/?\s*>", " ", value, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    for source, replacement in replacements.items():
        cleaned = re.sub(re.escape(source), replacement, cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", cleaned).strip().replace("|", r"\|")


def _normalize_simple_html_tables(text: str) -> str:
    def replace_table(match: re.Match[str]) -> str:
        rows: list[tuple[list[str], bool]] = []
        for row_match in HTML_ROW_RE.finditer(match.group(0)):
            cells = [
                _html_cell_text(cell.group(2))
                for cell in HTML_CELL_RE.finditer(row_match.group(1))
            ]
            if len(cells) >= 2 and any(cells):
                rows.append((cells, bool(re.search(r"<th\b", row_match.group(1), re.I))))
        if not rows:
            return match.group(0)
        width = max(len(cells) for cells, _ in rows)

        def row_line(cells: list[str]) -> str:
            padded = cells + [""] * (width - len(cells))
            return "| " + " | ".join(padded) + " |"

        lines = [row_line(cells) for cells, _ in rows]
        if rows[0][1]:
            lines.insert(1, row_line(["---"] * width))
        return "\n".join(lines)

    return HTML_TABLE_RE.sub(replace_table, text or "")


def clean_annotated_draft(text: str) -> str:
    """Return a filed-style view while preserving professional [●] blanks."""

    cleaned = _normalize_simple_html_tables(text or "")
    cleaned = VERIFICATION_BLOCK_RE.sub("", cleaned)
    cleaned = AI_TAG_RE.sub("", cleaned)
    cleaned = TRAILING_AI_TAG_RE.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _normalized_text(text: Any) -> str:
    return re.sub(r"[^a-z0-9%$]+", " ", str(text or "").casefold()).strip()


def _numeric_tokens(text: Any) -> set[str]:
    tokens: set[str] = set()
    for match in NUMBER_RE.finditer(str(text or "")):
        token = re.sub(r"\s+", "", match.group(0).casefold()).replace(",", "")
        token = token.strip()
        if token:
            tokens.add(token)
            without_currency = re.sub(r"^(?:hk\$|rmb|us\$|usd|hkd)", "", token)
            if without_currency and without_currency != token:
                tokens.add(without_currency)
    return tokens


def _date_tokens(text: Any) -> set[str]:
    return {
        re.sub(r"[\s,]+", "", match.group(0).casefold())
        for match in DATE_RE.finditer(str(text or ""))
    }


def _entity_tokens(text: Any) -> set[str]:
    return {
        re.sub(r"[^a-z0-9]+", "", match.group(0).casefold())
        for match in ENTITY_RE.finditer(str(text or ""))
    }


def _meaningful_leaf_values(value: Any) -> list[str]:
    values: list[str] = []
    if isinstance(value, dict):
        if "value" in value:
            values.extend(_meaningful_leaf_values(value.get("value")))
        else:
            for child in value.values():
                values.extend(_meaningful_leaf_values(child))
    elif isinstance(value, list):
        for child in value:
            values.extend(_meaningful_leaf_values(child))
    elif isinstance(value, (str, int, float)):
        text = str(value).strip()
        if len(text) >= 2:
            values.append(text)
    return values


def _prepared_value_map(prepared: dict[str, Any]) -> dict[str, Any]:
    source = prepared.get("contract_values") or prepared.get("contractValues")
    if not isinstance(source, dict):
        source = prepared.get("values")
    if not isinstance(source, dict):
        return {}
    return {normalize_identifier(key): value for key, value in source.items()}


def _field_value(
    prepared_map: dict[str, Any], field_item: dict[str, Any]
) -> Any | None:
    candidates = [field_item.get("fieldId"), field_item.get("label")]
    candidates.extend(field_item.get("aliases") or [])
    for candidate in candidates:
        key = normalize_identifier(str(candidate or ""))
        if key in prepared_map:
            raw = prepared_map[key]
            if isinstance(raw, dict) and "value" in raw:
                raw = raw.get("value")
            if raw not in (None, "", [], {}):
                return raw
    return None


def _field_entry(
    prepared_map: dict[str, Any], field_item: dict[str, Any]
) -> Any | None:
    candidates = [field_item.get("fieldId"), field_item.get("label")]
    candidates.extend(field_item.get("aliases") or [])
    for candidate in candidates:
        key = normalize_identifier(str(candidate or ""))
        if key in prepared_map:
            return prepared_map[key]
    return None


def _headings(text: str, *, reference: bool = False) -> list[str]:
    pattern = REFERENCE_HEADING_RE if reference else HEADING_RE
    rows = [match.group(1) if not reference else match.group(0) for match in pattern.finditer(text or "")]
    seen: set[str] = set()
    output: list[str] = []
    for row in rows:
        normalized = _normalized_text(row)
        if normalized and normalized not in seen:
            seen.add(normalized)
            output.append(normalized)
    return output


def _token_overlap(left: str, right: str) -> float:
    a = set(_normalized_text(left).split())
    b = set(_normalized_text(right).split())
    if not a or not b:
        return 0.0
    return len(a & b) / min(len(a), len(b))


def _lcs_length(left: list[str], right: list[str]) -> int:
    if not left or not right:
        return 0
    previous = [0] * (len(right) + 1)
    for a in left:
        current = [0]
        for index, b in enumerate(right, start=1):
            if _token_overlap(a, b) >= 0.5:
                current.append(previous[index - 1] + 1)
            else:
                current.append(max(previous[index], current[-1]))
        previous = current
    return previous[-1]


def _percent(numerator: float, denominator: float, default: float = 100.0) -> float:
    if denominator <= 0:
        return default
    return round(max(0.0, min(100.0, 100.0 * numerator / denominator)), 1)


def _length_score(clean_draft: str, reference_text: str) -> float:
    if not reference_text.strip():
        return 100.0
    ratio = len(clean_draft.strip()) / max(len(reference_text.strip()), 1)
    if 0.65 <= ratio <= 1.25:
        return 100.0
    if ratio < 0.65:
        return round(max(0.0, 100.0 * ratio / 0.65), 1)
    return round(max(0.0, 100.0 * 1.25 / ratio), 1)


def _contains_fact(draft_normalized: str, fact: str) -> bool:
    normalized = _normalized_text(fact)
    if not normalized:
        return True
    if normalized in draft_normalized:
        return True
    required_numbers = _numeric_tokens(fact)
    if required_numbers - _numeric_tokens(draft_normalized):
        return False
    fact_tokens = list(dict.fromkeys(token for token in normalized.split() if len(token) > 2))
    if len(fact_tokens) < 4:
        return False
    draft_tokens = set(draft_normalized.split())
    overlap = len(set(fact_tokens) & draft_tokens) / len(fact_tokens)
    return overlap >= (0.72 if len(fact_tokens) <= 12 else 0.60)


@dataclass
class DeterministicEvaluation:
    overall_score: float
    input_field_coverage: float
    required_fact_recall: float
    numeric_precision: float
    numeric_recall: float
    grounded_claim_precision: float
    structure_coverage: float
    outline_order_similarity: float
    reference_outline_similarity: float
    length_profile: float
    placeholder_integrity: float
    cross_section_consistency: float
    hard_failures: list[str] = field(default_factory=list)
    missing_fields: list[str] = field(default_factory=list)
    missing_facts: list[str] = field(default_factory=list)
    unsupported_numbers: list[str] = field(default_factory=list)
    unsupported_dates: list[str] = field(default_factory=list)
    unsupported_entities: list[str] = field(default_factory=list)
    root_cause: str = "model_limitation"

    def to_dict(self) -> dict[str, Any]:
        return {
            "overallScore": self.overall_score,
            "inputFieldCoverage": self.input_field_coverage,
            "requiredFactRecall": self.required_fact_recall,
            "numericFidelity": {
                "precision": self.numeric_precision,
                "recall": self.numeric_recall,
            },
            "groundedClaimPrecision": self.grounded_claim_precision,
            "structureCoverage": self.structure_coverage,
            "outlineOrderSimilarity": self.outline_order_similarity,
            "referenceOutlineSimilarity": self.reference_outline_similarity,
            "lengthProfile": self.length_profile,
            "placeholderIntegrity": self.placeholder_integrity,
            "crossSectionConsistency": self.cross_section_consistency,
            "hardFailures": self.hard_failures,
            "missingFields": self.missing_fields,
            "missingFacts": self.missing_facts,
            "unsupportedNumbers": self.unsupported_numbers,
            "unsupportedDates": self.unsupported_dates,
            "unsupportedEntities": self.unsupported_entities,
            "rootCause": self.root_cause,
        }


def evaluate_draft(
    *,
    contract: dict[str, Any],
    prepared_data: dict[str, Any],
    annotated_draft: str,
    clean_draft: str | None = None,
    reference_text: str = "",
    cross_section_consistency: float = 100.0,
) -> DeterministicEvaluation:
    """Evaluate one generated section without a judge-model call."""

    clean = clean_draft if clean_draft is not None else clean_annotated_draft(annotated_draft)
    prepared_map = _prepared_value_map(prepared_data)
    fields = list(contract.get("fields") or [])
    applicable_fields: list[dict[str, Any]] = []
    present_fields: list[tuple[dict[str, Any], Any]] = []
    missing_fields: list[str] = []
    for item in fields:
        entry = _field_entry(prepared_map, item)
        if isinstance(entry, dict) and (
            entry.get("applicable") is False
            or entry.get("evidence_status") == "not_applicable"
        ):
            continue
        applicable_fields.append(item)
        value = _field_value(prepared_map, item)
        if value is None:
            missing_fields.append(str(item.get("label") or item.get("fieldId")))
        else:
            present_fields.append((item, value))
    input_coverage = _percent(len(present_fields), len(applicable_fields))

    required_facts: list[str] = []
    for _, value in present_fields:
        required_facts.extend(_meaningful_leaf_values(value))
    # Atomic materials supplement narrow legacy schemas.  Only concise atoms are
    # scored as required facts; full source excerpts are never treated as targets.
    atoms = prepared_data.get("evidence_atoms") or prepared_data.get("evidenceAtoms") or []
    if isinstance(atoms, list):
        for atom in atoms:
            if not isinstance(atom, dict) or atom.get("priority") not in {"required", "high"}:
                continue
            value = atom.get("value") or atom.get("text")
            if isinstance(value, (str, int, float)) and 2 <= len(str(value).strip()) <= 500:
                required_facts.append(str(value).strip())
    required_facts = list(dict.fromkeys(required_facts))
    clean_normalized = _normalized_text(clean)
    missing_facts = [fact for fact in required_facts if not _contains_fact(clean_normalized, fact)]
    fact_recall = _percent(len(required_facts) - len(missing_facts), len(required_facts))

    evidence_text_parts = _meaningful_leaf_values(prepared_data.get("values") or {})
    evidence_text_parts.extend(_meaningful_leaf_values(prepared_data.get("contract_values") or {}))
    if isinstance(atoms, list):
        evidence_text_parts.extend(
            str(atom.get("value") or atom.get("text") or "")
            for atom in atoms
            if isinstance(atom, dict)
        )
    evidence_numbers = _numeric_tokens("\n".join(evidence_text_parts))
    evidence_dates = _date_tokens("\n".join(evidence_text_parts))
    evidence_entities = _entity_tokens("\n".join(evidence_text_parts))
    draft_numbers = _numeric_tokens(clean)
    draft_dates = _date_tokens(clean)
    draft_entities = _entity_tokens(clean)
    supported_entities = {
        entity
        for entity in draft_entities
        if any(
            entity in evidence_entity or evidence_entity in entity
            for evidence_entity in evidence_entities
        )
    }
    supported_numbers = draft_numbers & evidence_numbers
    unsupported_numbers = sorted(draft_numbers - evidence_numbers)
    numeric_precision = _percent(len(supported_numbers), len(draft_numbers))
    priority_numbers = _numeric_tokens("\n".join(required_facts))
    numeric_recall = _percent(len(priority_numbers & draft_numbers), len(priority_numbers))
    unsupported_dates = sorted(draft_dates - evidence_dates)
    unsupported_entities = sorted(draft_entities - supported_entities)

    unit_titles = [str(item.get("title") or "") for item in contract.get("units") or []]
    draft_headings = _headings(clean)
    matched_units = [
        title
        for title in unit_titles
        if any(_token_overlap(title, heading) >= 0.5 for heading in draft_headings)
        or _normalized_text(title) in clean_normalized
    ]
    structure_coverage = _percent(len(matched_units), len(unit_titles))
    unit_normalized = [_normalized_text(item) for item in unit_titles]
    order_similarity = _percent(
        _lcs_length(unit_normalized, draft_headings), len(unit_normalized)
    )

    reference_headings = _headings(reference_text, reference=True)
    reference_similarity = _percent(
        _lcs_length(reference_headings, draft_headings), len(reference_headings)
    ) if reference_headings else structure_coverage
    length_profile = _length_score(clean, reference_text)

    placeholder_count = len(PLACEHOLDER_RE.findall(clean))
    if missing_fields:
        placeholder_integrity = _percent(
            min(placeholder_count, len(missing_fields)), len(missing_fields)
        )
    else:
        placeholder_integrity = 100.0 if placeholder_count == 0 else 0.0

    grounded_supported = (
        len(supported_numbers)
        + len(draft_dates & evidence_dates)
        + len(supported_entities)
    )
    grounded_total = len(draft_numbers) + len(draft_dates) + len(draft_entities)
    grounded_precision = _percent(grounded_supported, grounded_total)
    structure_score = (structure_coverage + order_similarity + reference_similarity) / 3
    format_length_score = (length_profile + placeholder_integrity) / 2
    overall = round(
        fact_recall * 0.30
        + ((numeric_precision + numeric_recall) / 2) * 0.25
        + grounded_precision * 0.20
        + structure_score * 0.15
        + format_length_score * 0.10,
        1,
    )

    hard_failures: list[str] = []
    if unsupported_numbers:
        hard_failures.append("unsupported_numeric_claim")
    if unsupported_dates:
        hard_failures.append("unsupported_date_claim")
    if unsupported_entities:
        hard_failures.append("unsupported_entity_claim")
    if AI_TAG_RE.search(clean):
        hard_failures.append("clean_draft_contains_ai_tag")
    if cross_section_consistency < 100:
        hard_failures.append("cross_section_contradiction")
    if hard_failures:
        overall = min(overall, 49.0)

    if missing_fields:
        root_cause = "data_incomplete"
    elif fact_recall < 85 or structure_coverage < 90:
        root_cause = "prompt_or_workflow"
    else:
        root_cause = "model_limitation" if hard_failures else "none"

    return DeterministicEvaluation(
        overall_score=overall,
        input_field_coverage=input_coverage,
        required_fact_recall=fact_recall,
        numeric_precision=numeric_precision,
        numeric_recall=numeric_recall,
        grounded_claim_precision=grounded_precision,
        structure_coverage=structure_coverage,
        outline_order_similarity=order_similarity,
        reference_outline_similarity=reference_similarity,
        length_profile=length_profile,
        placeholder_integrity=placeholder_integrity,
        cross_section_consistency=cross_section_consistency,
        hard_failures=hard_failures,
        missing_fields=missing_fields[:50],
        missing_facts=missing_facts[:50],
        unsupported_numbers=unsupported_numbers[:50],
        unsupported_dates=unsupported_dates[:50],
        unsupported_entities=unsupported_entities[:50],
        root_cause=root_cause,
    )


__all__ = ["DeterministicEvaluation", "clean_annotated_draft", "evaluate_draft"]
