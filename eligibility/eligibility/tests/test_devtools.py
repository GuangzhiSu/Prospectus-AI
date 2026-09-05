"""Catalog / attribution / surgical YAML patch for the developer-tools workspace."""
from __future__ import annotations

import unittest
from pathlib import Path

from eligibility.devtools import (
    CAUSE_CRITERIA,
    CAUSE_DIAGNOSTIC,
    CAUSE_EXTRACTION,
    CAUSE_READY,
    build_catalog,
    build_trace,
    patch_gate,
    static_attribution,
)
from eligibility.hard_inspection.loader import RULES_DIR, load_ruleset


class DevtoolsCatalogTests(unittest.TestCase):
    def test_catalog_lists_markets_and_gates(self):
        catalog = build_catalog()
        self.assertGreaterEqual(catalog["summary"]["gateCount"], 40)
        self.assertTrue(catalog["markets"])
        self.assertTrue(catalog["gates"])
        self.assertTrue(any(doc["id"] == "csv" and doc["exists"] for doc in catalog["sourceDocs"]))
        causes = {gate["staticCause"] for gate in catalog["gates"]}
        self.assertIn(CAUSE_CRITERIA, causes)
        self.assertIn(CAUSE_DIAGNOSTIC, causes)
        self.assertIn(CAUSE_READY, causes)

    def test_opted_out_gate_is_criteria(self):
        catalog = build_catalog()
        gate = next(item for item in catalog["gates"] if item["id"] == "ch18c_commercial_revenue")
        self.assertEqual(gate["staticCause"], CAUSE_CRITERIA)
        self.assertFalse(gate["evaluated"])
        self.assertIn("evaluated: false", gate["staticReason"])

    def test_soft_gate_is_diagnostic(self):
        catalog = build_catalog()
        gate = next(item for item in catalog["gates"] if item["id"] == "customer_concentration")
        self.assertEqual(gate["staticCause"], CAUSE_DIAGNOSTIC)
        self.assertTrue(gate["requiresLlm"])


class DevtoolsTraceTests(unittest.TestCase):
    def test_missing_json_fields_are_extraction(self):
        issuer = {"issuer_id": "EMPTY_CO", "financials": {}, "offering_use_of_proceeds": {}}
        report = build_trace(
            issuer,
            profile={"path_vars": {"latest_audited_fy": "FY2024"}},
            market_key="hkex_main_board",
        )
        profit = next(item for item in report["gates"] if item["id"] == "mb_8051_profit_test")
        self.assertEqual(profit["status"], "MISSING_INPUT")
        self.assertEqual(profit["runtimeCause"], CAUSE_EXTRACTION)
        self.assertTrue(profit["missingInputs"])

    def test_opted_out_stays_criteria_even_with_json(self):
        issuer = {"issuer_id": "EMPTY_CO"}
        report = build_trace(issuer, market_key="hkex_18c")
        gate = next(item for item in report["gates"] if item["id"] == "ch18c_commercial_revenue")
        self.assertEqual(gate["status"], "NOT_EVALUATED")
        self.assertEqual(gate["runtimeCause"], CAUSE_CRITERIA)


class DevtoolsPatchTests(unittest.TestCase):
    def test_toggle_evaluated_round_trip(self):
        source = Path(RULES_DIR) / "hkex_ch18c.yaml"
        original = source.read_text(encoding="utf-8")
        self.addCleanup(source.write_text, original, "utf-8")
        before = load_ruleset(str(source))
        gate = next(item for item in before["gates"] if item["id"] == "ch18c_commercial_revenue")
        self.assertFalse(gate.get("evaluated", True))

        patched = patch_gate(
            "hkex_ch18c.yaml",
            "ch18c_commercial_revenue",
            {"evaluated": True, "stubReason": "opened from developer tools test"},
        )
        self.assertTrue(patched["gate"]["evaluated"])
        self.assertEqual(patched["gate"]["stubReason"], "opened from developer tools test")
        self.assertIn("# Complete, loadable ruleset", source.read_text(encoding="utf-8"))

        restored = patch_gate(
            "hkex_ch18c.yaml",
            "ch18c_commercial_revenue",
            {"evaluated": False, "stubReason": "no Chapter 18C fixture this phase"},
        )
        self.assertFalse(restored["gate"]["evaluated"])

    def test_static_attribution_helpers(self):
        self.assertEqual(static_attribution({"requires_llm": True})[0], CAUSE_DIAGNOSTIC)
        self.assertEqual(static_attribution({"evaluated": False})[0], CAUSE_CRITERIA)
        self.assertEqual(static_attribution({"evaluated": True})[0], CAUSE_READY)


if __name__ == "__main__":
    unittest.main()
