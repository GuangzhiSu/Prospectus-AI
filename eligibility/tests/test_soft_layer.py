"""Tests for the qualitative substantive (soft-layer) gates.

These gates are signals, not bright-line tests. They are loaded only via the soft
layer (never the hard engine), every one is requires_llm / evaluated:false, and
the soft engine emits flagged NOT_EVALUATED findings with severity and
provenance. No real-company data is used.
"""
import unittest

from eligibility.loader import load_all, load_soft_layer
from eligibility.report import _suitability_synthesis
from eligibility.soft import NOT_EVALUATED, SoftConditionEngine

EXPECTED_GATES = {
    "customer_concentration",
    "supplier_concentration",
    "connected_transactions_independence",
    "competing_business",
    "financial_internal_controls",
    "equity_clarity_wvr_preipo",
    "shell_company_pattern",
}


class SoftLayerLoading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.soft = load_soft_layer()

    def test_soft_ruleset_loads(self):
        self.assertEqual(len(self.soft), 1)
        rs = self.soft[0]
        self.assertEqual(rs["ruleset"], "HKEX_Qualitative_Substance")
        self.assertEqual(rs["layer"], "soft")
        self.assertEqual({g["id"] for g in rs["gates"]}, EXPECTED_GATES)

    def test_soft_ruleset_excluded_from_hard_load(self):
        hard_names = {rs["ruleset"] for rs in load_all()}
        self.assertNotIn("HKEX_Qualitative_Substance", hard_names)

    def test_all_gates_requires_llm_and_not_evaluated(self):
        for gate in self.soft[0]["gates"]:
            self.assertTrue(gate["requires_llm"], gate["id"])
            self.assertFalse(gate.get("evaluated", False), gate["id"])

    def test_provenance_and_signal_flags(self):
        flags = {g["id"]: (g["provenance_verified"], g["signal_level_verified"])
                 for g in self.soft[0]["gates"]}
        # provenance_verified: rule/GL anchor checked
        self.assertTrue(flags["customer_concentration"][0])
        self.assertTrue(flags["connected_transactions_independence"][0])
        self.assertFalse(flags["financial_internal_controls"][0])
        self.assertFalse(flags["equity_clarity_wvr_preipo"][0])
        # signal_level_verified: a rule (True) vs a heuristic probe (False)
        self.assertFalse(flags["customer_concentration"][1])   # 30% is a probe
        self.assertTrue(flags["competing_business"][1])        # presence check
        self.assertTrue(flags["financial_internal_controls"][1])


class SoftEngineFindings(unittest.TestCase):
    def test_emits_flagged_findings_no_verdict(self):
        findings = SoftConditionEngine().evaluate_all({})
        self.assertEqual({f.gate_id for f in findings}, EXPECTED_GATES)
        for f in findings:
            self.assertEqual(f.status, NOT_EVALUATED)
            self.assertTrue(f.requires_llm)
            self.assertTrue(f.severity)            # carries a severity
            self.assertTrue(f.substantive_concern)  # and the substantive concern

    def test_customer_concentration_carries_signal_and_guidance(self):
        finding = next(f for f in SoftConditionEngine().evaluate_all({})
                       if f.gate_id == "customer_concentration")
        self.assertEqual(finding.severity, "high")
        self.assertEqual(finding.trigger_signal["metric"], "single_customer_revenue_pct")
        self.assertEqual(finding.secondary_metric, "top5_customer_revenue_pct")
        self.assertIn("GL68-13", finding.rule_ref_guidance)

    def test_shell_company_pattern_is_multifactor_804_leaf(self):
        finding = next(f for f in SoftConditionEngine().evaluate_all({})
                       if f.gate_id == "shell_company_pattern")
        self.assertEqual(finding.rule_ref, "MB 8.04")
        self.assertEqual(finding.rule_ref_guidance, "HKEX-GL68-13A")
        self.assertFalse(finding.trigger_signal["bright_line"])
        self.assertTrue(finding.provenance_verified)
        self.assertFalse(finding.signal_level_verified)
        self.assertGreaterEqual(len(finding.factors), 5)  # multi-factor


class SuitabilitySynthesis(unittest.TestCase):
    def _findings(self):
        from dataclasses import asdict
        return [asdict(f) for f in SoftConditionEngine().evaluate_all({})]

    def test_not_assessed_when_no_signal_fired(self):
        # All signals are evaluated:false this phase -> nothing fires -> not_assessed.
        syn = _suitability_synthesis(self._findings())
        self.assertEqual(syn["concern_level"], "not_assessed")
        self.assertIsNone(syn["verdict"])
        self.assertEqual(syn["rule_ref"], "Main Board Listing Rule 8.04")

    def test_rolls_up_to_high_when_a_high_signal_fires(self):
        findings = self._findings()
        for f in findings:  # simulate the future probe firing a high-severity signal
            if f["gate_id"] == "customer_concentration":
                f["triggered"] = True
                f["status"] = "FLAGGED"
        syn = _suitability_synthesis(findings)
        self.assertEqual(syn["concern_level"], "high")
        self.assertIsNone(syn["verdict"])

    def test_rolls_up_to_elevated_for_medium_only(self):
        findings = self._findings()
        for f in findings:
            if f["gate_id"] == "supplier_concentration":  # severity medium
                f["triggered"] = True
                f["status"] = "FLAGGED"
        syn = _suitability_synthesis(findings)
        self.assertEqual(syn["concern_level"], "elevated")


if __name__ == "__main__":
    unittest.main()
