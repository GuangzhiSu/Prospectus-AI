"""Smoke tests for the four-stage standalone pipeline (offline / stub LLM)."""
from __future__ import annotations

import json
import os
import unittest

from eligibility.extraction import extract_from_bundle, merge_deal_params
from eligibility.extraction.documents import issuer_json_as_bundle
from eligibility.feedback import generate_feedback
from eligibility.pipeline import run_hard_only
from eligibility.qualitative import SoftConditionEngine


FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "synthetic_issuer.json")


class PipelineStubTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["ELIGIBILITY_LLM_STUB"] = "1"
        with open(FIXTURE, encoding="utf-8") as handle:
            cls.issuer = json.load(handle)
        cls.profile = {
            "path_vars": {
                "latest_audited_fy": "FY2024",
                "prior_fy_1": "FY2023",
                "prior_fy_2": "FY2022",
            },
            "fx_rate_to_hkd": {
                "value": 1.1,
                "from_currency": "RMB",
                "as_of_date": "2024-12-31",
                "source_ref": "synthetic test rate",
            },
        }

    def test_extraction_stub_does_not_invent_numbers(self):
        bundle = issuer_json_as_bundle(self.issuer, "synthetic_issuer.json")
        package = extract_from_bundle(bundle, auto_confirm=False)
        self.assertTrue(package["llm_stub"])
        self.assertEqual(package["quantifiable"], [])

    def test_deal_params_are_hard_entered(self):
        fields = merge_deal_params(
            {"offer_price": 10.5, "expected_market_cap": {"value": 1000, "unit": "HKD million"}}
        )
        ids = {f["field_id"] for f in fields}
        self.assertIn("offer_price", ids)
        self.assertTrue(all(f["confirmation_status"] == "hard_entered" for f in fields))

    def test_qualitative_stub_not_evaluated(self):
        findings = SoftConditionEngine().evaluate_all(self.issuer, narrative=[])
        self.assertTrue(findings)
        self.assertTrue(all(f.status == "NOT_EVALUATED" for f in findings))

    def test_hard_plus_feedback_stub(self):
        report = run_hard_only(
            self.issuer,
            self.profile,
            ruleset_names=["HKEX_Main_Board"],
            include_feedback=True,
        )
        self.assertIn("feedback", report)
        self.assertIn(report["feedback"]["readiness"], {
            "ready_to_discuss",
            "not_ready",
            "unclear_missing_inputs",
        })
        fb = generate_feedback(report)
        self.assertTrue(fb.get("disclaimer"))


if __name__ == "__main__":
    unittest.main()
