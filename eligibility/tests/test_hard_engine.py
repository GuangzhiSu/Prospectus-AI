"""Regression tests for the deterministic hard engine.

The synthetic fixture is built so the HKEX Main Board and Chapter 8A rulesets
produce all four evaluation statuses, and so one revenue check flips from
INDETERMINATE to PASS once an FX rate is supplied. No real-company data is used.
"""
import json
import os
import unittest

from eligibility.engine import (
    EvalContext,
    INDETERMINATE,
    MISSING_INPUT,
    PASS,
    SHORTFALL,
    eval_gate,
)
from eligibility.loader import load_all, select_by_name

FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "synthetic_issuer.json")
PATH_VARS = {"latest_audited_fy": "FY2024", "prior_fy_1": "FY2023", "prior_fy_2": "FY2022"}
FX = {"value": 1.1, "from_currency": "RMB", "as_of_date": "2024-12-31",
      "source_ref": "synthetic test rate"}


def _load_issuer():
    with open(FIXTURE, encoding="utf-8") as handle:
        return json.load(handle)


def _gates_by_id(rulesets, ctx):
    meta_gates = {}
    for rs in rulesets:
        meta = {"ruleset": rs["ruleset"], "version": rs["version"]}
        for gate in rs["gates"]:
            meta_gates[gate["id"]] = eval_gate(gate, meta, ctx)
    return meta_gates


def _check(gate_result, check_id):
    for chk in gate_result.checks:
        if chk.check_id == check_id:
            return chk
    raise AssertionError(f"check {check_id} not found in gate {gate_result.gate_id}")


class HardEngineStatuses(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.issuer = _load_issuer()
        cls.rulesets = select_by_name(
            load_all(), ["HKEX_Main_Board", "HKEX_Chapter_8A_WVR"]
        )

    def _eval(self, fx):
        ctx = EvalContext(self.issuer, fx=fx, path_vars=PATH_VARS)
        return _gates_by_id(self.rulesets, ctx)

    def test_pass_status_without_fx(self):
        gates = self._eval(fx=None)
        self.assertEqual(
            _check(gates["mb_8051_profit_test"], "profit_three_year_aggregate").status,
            PASS,
        )
        self.assertEqual(
            _check(gates["wvr_beneficiary_economic_interest"],
                   "beneficiary_aggregate_ownership").status,
            PASS,
        )
        self.assertEqual(gates["wvr_structure_present"].status, PASS)

    def test_shortfall_status(self):
        gates = self._eval(fx=None)
        self.assertEqual(
            _check(gates["mb_8051_profit_test"], "profit_recent_year").status,
            SHORTFALL,
        )

    def test_missing_input_status(self):
        gates = self._eval(fx=None)
        # null market cap
        self.assertEqual(
            _check(gates["mb_8053_market_cap_revenue_test"],
                   "market_cap_at_listing").status,
            MISSING_INPUT,
        )
        # absent aggregate field
        self.assertEqual(
            _check(gates["mb_8051_profit_test"],
                   "profit_two_preceding_years").status,
            MISSING_INPUT,
        )

    def test_indeterminate_without_fx(self):
        gates = self._eval(fx=None)
        revenue = _check(gates["mb_8053_market_cap_revenue_test"], "revenue_recent_year")
        self.assertEqual(revenue.status, INDETERMINATE)
        self.assertIn("RMB->HKD", revenue.note)

    def test_revenue_passes_with_fx(self):
        gates = self._eval(fx=FX)
        revenue = _check(gates["mb_8053_market_cap_revenue_test"], "revenue_recent_year")
        # 600 RMB * 1.1 = 660 HKD >= 500
        self.assertEqual(revenue.status, PASS)
        self.assertIn("converted RMB->HKD", revenue.note)

    def test_all_four_statuses_present_without_fx(self):
        gates = self._eval(fx=None)
        seen = set()
        for gate in gates.values():
            for chk in gate.checks:
                seen.add(chk.status)
        for status in (PASS, SHORTFALL, MISSING_INPUT, INDETERMINATE):
            self.assertIn(status, seen, f"expected status {status} to appear")

    def test_no_verdict_anywhere(self):
        gates = self._eval(fx=FX)
        for gate in gates.values():
            self.assertIn(gate.status,
                          (PASS, SHORTFALL, MISSING_INPUT, INDETERMINATE, "NOT_EVALUATED"))

    def test_verification_provenance_flows_to_results(self):
        gates = self._eval(fx=None)
        chk = _check(gates["mb_8051_profit_test"], "profit_recent_year")
        self.assertTrue(chk.threshold_verified)
        self.assertTrue(chk.effective_from_verified)
        self.assertEqual(chk.verified_by, "cc_websearch")
        self.assertEqual(chk.verified_on, "2026-06-29")
        # human sign-off stays open on every gate, independent of verification
        for gate in gates.values():
            self.assertFalse(gate.human_signoff)
        # 8.05(2): value verified vs rulebook, but effective_from NOT verified
        g = gates["mb_8052_market_cap_revenue_cashflow_test"]
        self.assertTrue(g.threshold_verified)
        self.assertFalse(g.effective_from_verified)


class ContinuityHardGates(unittest.TestCase):
    """The 8.05 continuity limbs are bright-line HARD gates reading CompanyProfile."""

    @classmethod
    def setUpClass(cls):
        cls.issuer = _load_issuer()
        cls.main = select_by_name(load_all(), ["HKEX_Main_Board"])

    def _gates(self, profile):
        ctx = EvalContext(self.issuer, path_vars=PATH_VARS, profile=profile)
        return _gates_by_id(self.main, ctx)

    def test_management_continuity_pass_shortfall_missing(self):
        self.assertEqual(
            self._gates({"management_continuity_years": 3})["mb_management_continuity"].status,
            PASS)
        self.assertEqual(
            self._gates({"management_continuity_years": 2})["mb_management_continuity"].status,
            SHORTFALL)
        self.assertEqual(
            self._gates({})["mb_management_continuity"].status, MISSING_INPUT)

    def test_ownership_continuity_pass_shortfall_missing(self):
        self.assertEqual(
            self._gates({"ownership_continuity_recent_audited_fy": True})[
                "mb_ownership_continuity"].status, PASS)
        self.assertEqual(
            self._gates({"ownership_continuity_recent_audited_fy": False})[
                "mb_ownership_continuity"].status, SHORTFALL)
        self.assertEqual(
            self._gates({})["mb_ownership_continuity"].status, MISSING_INPUT)

    def test_continuity_gates_hard_evaluate_not_routed_to_soft(self):
        for gate in self._gates({"management_continuity_years": 3,
                                 "ownership_continuity_recent_audited_fy": True}).values():
            self.assertFalse(gate.requires_llm)


class StubRulesetsAreNotEvaluated(unittest.TestCase):
    def test_18c_18a_csrc_not_evaluated(self):
        issuer = _load_issuer()
        ctx = EvalContext(issuer, fx=None, path_vars=PATH_VARS)
        rulesets = select_by_name(
            load_all(),
            ["HKEX_Chapter_18C_Specialist_Technology", "HKEX_Chapter_18A_Biotech",
             "CSRC_Overseas_Listing_Filing"],
        )
        for rs in rulesets:
            meta = {"ruleset": rs["ruleset"], "version": rs["version"]}
            for gate in rs["gates"]:
                result = eval_gate(gate, meta, ctx)
                self.assertEqual(result.status, "NOT_EVALUATED")
            self.assertFalse(rs.get("in_regression_baseline", False))


if __name__ == "__main__":
    unittest.main()
