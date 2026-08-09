from __future__ import annotations

from prospectus_graph.retrievers import HybridRetriever


def test_schema_aware_fact_dedupe_accepts_nested_json_values() -> None:
    retriever = HybridRetriever.__new__(HybridRetriever)
    retriever.fact_limit = 20
    nested_value = [
        {"name": "Alpha", "details": ["中文", "non\u2011breaking"]},
        {"name": "Beta", "details": {"active": True}},
    ]
    facts = [
        {
            "field": "company_overview.other",
            "metric": "items",
            "value": nested_value,
            "metadata": {"section_hint": "A"},
        },
        {
            "field": "company_overview.other",
            "metric": "items",
            "value": nested_value,
            "metadata": {"section_hint": "A"},
        },
    ]

    selected = retriever._select_facts_schema_aware(
        facts,
        section_id="Summary",
        preferred_ids={"A"},
    )

    assert selected == [facts[0]]
