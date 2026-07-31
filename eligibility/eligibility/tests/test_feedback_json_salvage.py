"""Feedback JSON salvage / structured fallback tests (no network)."""
from __future__ import annotations

import os
import unittest

from eligibility.common.llm import _extract_json_object, LLMError
from eligibility.feedback.generate import (
    _normalize_feedback,
    _stub_feedback,
    generate_feedback,
)


SAMPLE_REPORT = {
    "summary": {
        "status_counts": {
            "PASS": 8,
            "SHORTFALL": 2,
            "MISSING_INPUT": 0,
            "INDETERMINATE": 0,
            "NOT_EVALUATED": 3,
        }
    },
    "rulesets": [
        {
            "ruleset": "HKEX_Main_Board",
            "gates": [
                {
                    "gate_id": "mb_8051_profit_test",
                    "title": "Profit test",
                    "rule_ref": "Main Board Listing Rule 8.05(1)",
                    "status": "SHORTFALL",
                    "checks": [
                        {
                            "id": "profit_recent",
                            "metric": "Latest FY profit",
                            "status": "SHORTFALL",
                            "actual": "-100 RMB million",
                            "required": ">= 35 HKD million",
                            "note": "converted RMB->HKD at 1.08",
                        }
                    ],
                },
                {
                    "gate_id": "mb_trading_record",
                    "title": "Trading record",
                    "rule_ref": "8.05",
                    "status": "PASS",
                    "checks": [],
                },
            ],
        }
    ],
}


class JsonSalvageTests(unittest.TestCase):
    def test_extracts_json_after_thinking_prose(self):
        raw = (
            "We are asked to write a JSON response. Need to read inputs.\n"
            "Thinking Process:\n1. Analyze shortfalls\n\n"
            '{"readiness":"not_ready","headline":"Not ready yet.",'
            '"summary":"Profit shortfall remains.","gaps":[],'
            '"priority_actions":["Fix profit"],"strengths":["Trading record"],'
            '"disclaimer":"Diagnostic only."}'
        )
        obj = _extract_json_object(raw)
        self.assertEqual(obj["readiness"], "not_ready")
        self.assertIn("Profit", obj["summary"])

    def test_extracts_fenced_json(self):
        raw = 'Here you go:\n```json\n{"readiness":"ready_to_discuss","headline":"OK","summary":"Met."}\n```'
        obj = _extract_json_object(raw)
        self.assertEqual(obj["readiness"], "ready_to_discuss")

    def test_rejects_empty(self):
        with self.assertRaises(LLMError):
            _extract_json_object("   ")


class StructuredFeedbackTests(unittest.TestCase):
    def test_stub_includes_observed_vs_required(self):
        fb = _stub_feedback(SAMPLE_REPORT, [])
        self.assertEqual(fb["readiness"], "not_ready")
        self.assertTrue(fb["gaps"])
        detail = fb["gaps"][0]["detail"]
        self.assertIn("observed", detail)
        self.assertIn("required", detail)
        self.assertIn("Profit test", fb["summary"])

    def test_normalize_keeps_structured_on_llm_error(self):
        fb = _stub_feedback(SAMPLE_REPORT, [])
        out = _normalize_feedback(
            {"stub": True, "llm_error": "non-JSON thinking"}, fb
        )
        self.assertEqual(out["source"], "llm_fallback")
        self.assertTrue(out["gaps"])

    def test_generate_feedback_stub_mode(self):
        os.environ["ELIGIBILITY_LLM_STUB"] = "1"
        try:
            out = generate_feedback(SAMPLE_REPORT, market_hint="hkex_main_board")
            self.assertEqual(out["source"], "structured")
            self.assertGreaterEqual(len(out["priority_actions"]), 1)
        finally:
            os.environ.pop("ELIGIBILITY_LLM_STUB", None)


if __name__ == "__main__":
    unittest.main()
