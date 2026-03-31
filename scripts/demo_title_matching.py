#!/usr/bin/env python3
"""
Demo: match 20 example raw TOC strings to canonical sections.

Run from repo root::

    python scripts/demo_title_matching.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

EXAMPLE_TITLES: list[str] = [
    "Our Business",
    "History and Development",
    "Operating and Financial Review",
    "Use of Proceeds",
    "Global Offering",
    "Regulations",
    "Industry",
    "3. Risk Factors",
    "SUMMARY",
    "Glossary of Technical Terms",
    "Forward-Looking Statements",
    "Chapter 5 — Financial Information",
    "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)",
    "Information about this Prospectus and the Global Offering",
    "Corporate Information",
    "Contractual Arrangements (VIE)",
    "How to Apply for Hong Kong Offer Shares",
    "Appendices",
    "Connected Transactions",
    "Structure of the Global Offering",
]


def main() -> None:
    from prospectus_docgraph.normalizer.title_normalizer import TitleNormalizer

    n = TitleNormalizer(fuzzy_cutoff=0.78)
    print("Raw title  ->  canonical_section  |  confidence  |  method\n")
    for raw in EXAMPLE_TITLES:
        r = n.match_section(raw)
        cn = r.canonical_name or "—"
        print(f"{raw[:48]:<48}  {cn:<42}  {r.confidence:5.2f}  {r.match_method}")


if __name__ == "__main__":
    main()
