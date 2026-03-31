#!/usr/bin/env python3
"""
Demo Part 4: mocked corpus statistics (150 HKEX-style tech IPO filings) → refinement report.

No real PDF corpus is bundled; numbers are illustrative.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from prospectus_docgraph.mining import (
    CorpusMiner,
    MiningConfig,
    MinedCorpusSnapshot,
    SectionMinedStats,
    SubsectionMinedStats,
)


def build_mock_150_ipo_snapshot() -> MinedCorpusSnapshot:
    """Synthetic statistics as if 150 filings were ingested."""
    td = 150
    # Core sections appear in almost every document.
    core = [
        ("Summary", 148, 2.1),
        ("Risk_Factors", 149, 6.2),
        ("Business", 147, 14.0),
        ("Financial_Information", 146, 21.0),
        ("Future_Plans_and_Use_of_Proceeds", 145, 22.0),
    ]
    section_stats: dict[str, SectionMinedStats] = {}
    for sid, df, ao in core:
        section_stats[sid] = SectionMinedStats(
            section_id=sid,
            document_frequency=df,
            support_count=df,
            average_order_index=ao,
            average_token_length=3.0,
            predecessor_counts={},
            successor_counts={},
            mean_mapping_confidence=0.96,
            cooccurrence_counts={},
        )
    transitions = {
        ("Summary", "Risk_Factors"): 145,
        ("Risk_Factors", "Business"): 140,
        ("Business", "Financial_Information"): 138,
    }
    sub_stats: dict[str, dict[str, SubsectionMinedStats]] = {
        "Risk_Factors": {
            "sub:rf:general": SubsectionMinedStats(
                parent_section_id="Risk_Factors",
                subsection_id="sub:rf:general",
                document_frequency=120,
                support_count=200,
                average_order_index_within_parent=0.5,
                mean_mapping_confidence=0.93,
            ),
        },
    }
    return MinedCorpusSnapshot(
        total_documents=td,
        section_stats=section_stats,
        subsection_stats=sub_stats,
        section_transition_counts=transitions,
        low_confidence_events=[
            {
                "kind": "section",
                "canonical_id": "Industry_Overview",
                "raw_title": "Market overview",
                "normalized_title": "market overview",
                "confidence": 0.81,
                "match_method": "fuzzy",
                "document_id": "IPO-042",
            }
        ],
        unmatched_headings=[],
    )


def main() -> None:
    cfg = MiningConfig(
        mandatory_threshold=0.92,
        precedence_threshold=0.12,
        min_precedence_pair_count=5,
        alias_suggestion_threshold=0.88,
    )
    miner = CorpusMiner(cfg)
    snap = build_mock_150_ipo_snapshot()
    report = miner.mine_snapshot(snap)
    print(json.dumps(report.model_dump(), indent=2, ensure_ascii=False)[:8000])
    print("\n... (truncated) ...")


if __name__ == "__main__":
    main()
