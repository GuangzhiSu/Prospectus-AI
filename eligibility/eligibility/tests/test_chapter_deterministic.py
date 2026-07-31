"""Deterministic lift from Agent1 chapter JSON (no LLM)."""
from __future__ import annotations

import unittest
from pathlib import Path

from eligibility.extraction.chapter_deterministic import (
    extract_from_chapter_json_paths,
)
from eligibility.extraction.extract import extract_from_paths


ROOT = Path(__file__).resolve().parents[3]
SAMPLE = ROOT / "testing dataset" / "00020_global_offering_2"
SAMPLE_01300 = ROOT / "testing dataset" / "01300_global_offering_1"


@unittest.skipUnless(SAMPLE.is_dir(), "SenseTime chapter JSON sample not present")
class ChapterDeterministicTests(unittest.TestCase):
    def test_lifts_core_financials(self) -> None:
        paths = sorted(SAMPLE.glob("*.json"))
        package = extract_from_chapter_json_paths(paths)
        by_id = {
            q["field_id"]: q["value"]
            for q in package["quantifiable"]
            if q.get("value") is not None
        }
        self.assertIn("revenue", by_id)
        self.assertAlmostEqual(by_id["revenue"], 3446.2, places=1)
        self.assertIn("profit_attributable_to_owners", by_id)
        self.assertLess(by_id["profit_attributable_to_owners"], 0)
        self.assertIn("operating_cash_flow", by_id)
        self.assertIn("total_assets", by_id)
        # Prefer Dec year-end over June interim
        self.assertAlmostEqual(by_id["total_assets"], 38478.6, places=1)
        self.assertEqual(package["path_vars"]["latest_audited_fy"], "FY2020")
        self.assertIn(
            "profit_attributable_to_owners_aggregate_track_record",
            package["issuer_patch"]["financials"],
        )
        self.assertTrue(
            package["issuer_patch"]["company_legal_entity"]["dwvr"]["structure_effective"]
        )
        self.assertGreater(
            package["issuer_patch"]["offering_use_of_proceeds"][
                "market_capitalisation_at_listing"
            ]["value"],
            10000,
        )
        self.assertGreaterEqual(
            package["profile_patch"]["operating_track_record_years"], 3
        )

    def test_extract_from_paths_skips_llm_when_chapter_json_present(self) -> None:
        paths = sorted(SAMPLE.glob("*.json"))
        package = extract_from_paths(paths, auto_confirm=True)
        self.assertTrue(package.get("deterministic"))
        self.assertFalse(package.get("llm_stub"))
        self.assertGreaterEqual(len(package.get("quantifiable") or []), 4)
        for item in package["quantifiable"]:
            if item.get("value") is not None:
                self.assertEqual(item.get("confirmation_status"), "confirmed")

    @unittest.skipUnless(SAMPLE_01300.is_dir(), "01300 chapter JSON sample not present")
    def test_mines_sparse_01300_financials(self) -> None:
        paths = sorted(SAMPLE_01300.glob("*.json"))
        package = extract_from_chapter_json_paths(paths)
        by_id = {
            q["field_id"]: q["value"]
            for q in package["quantifiable"]
            if q.get("value") is not None
        }
        self.assertIn("revenue", by_id)
        self.assertGreater(by_id["revenue"], 1000)
        self.assertIn("profit_attributable_to_owners", by_id)
        self.assertGreater(by_id["profit_attributable_to_owners"], 0)
        self.assertEqual(package["path_vars"]["latest_audited_fy"], "FY2011")
        self.assertGreaterEqual(
            package["profile_patch"].get("operating_track_record_years") or 0, 3
        )


if __name__ == "__main__":
    unittest.main()
