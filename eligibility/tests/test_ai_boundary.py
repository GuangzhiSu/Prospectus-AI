"""Tests for the diagnostic AI-boundary metadata.

The hard engine is intentionally AI-free, but the complete diagnostic workflow
still has AI at extraction time and later soft-signal review. Keep that boundary
machine-readable in reports so product copy and downstream UIs do not collapse
the whole module into ``engine.py``.
"""
import json
import os
import unittest

from eligibility.engine import EvalContext
from eligibility.loader import load_all, select_by_name
from eligibility.report import build_report

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "synthetic_issuer.json")
PATH_VARS = {"latest_audited_fy": "FY2024", "prior_fy_1": "FY2023", "prior_fy_2": "FY2022"}


class AiBoundaryMetadata(unittest.TestCase):
    def test_report_documents_ai_and_no_ai_boundaries(self):
        with open(FIXTURE, encoding="utf-8") as handle:
            issuer = json.load(handle)
        rulesets = select_by_name(load_all(), ["HKEX_Main_Board"])
        report = build_report(
            issuer_id=issuer["issuer_id"],
            rulesets=rulesets,
            ctx=EvalContext(issuer, path_vars=PATH_VARS),
            fx_profile=None,
            generated_at="2026-07-11T00:00:00",
        )

        boundary = report["ai_boundary"]
        self.assertFalse(boundary["structured_field_input"]["uses_ai"])
        self.assertTrue(boundary["document_table_extraction"]["uses_ai"])
        self.assertFalse(boundary["hard_threshold_engine"]["uses_ai"])
        self.assertEqual(boundary["hard_threshold_engine"]["component"], "eligibility.engine")
        self.assertTrue(boundary["soft_signal_layer"]["uses_ai"])
        self.assertEqual(len(boundary["soft_signal_layer"]["signals"]), 7)


if __name__ == "__main__":
    unittest.main()
