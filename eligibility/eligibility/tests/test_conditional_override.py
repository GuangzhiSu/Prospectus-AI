"""Tests for the Chapter 18C conditional-override threshold and requires_llm.

The 2024 temporary reduction of the 18C market-cap thresholds is modelled as a
conditional override gated on two run-profile dates. These tests drive the
override directly via ``eval_check`` (the 18C gates are ``evaluated: false`` and
so are skipped by the report path, but the override logic must still be correct
and ready for when 18C is turned on). No real-company data is used.
"""
import unittest

from eligibility.engine import (
    EvalContext,
    INDETERMINATE,
    NOT_EVALUATED,
    PASS,
    SHORTFALL,
    eval_check,
    eval_gate,
)
from eligibility.loader import load_all


def _ch18c():
    return next(rs for rs in load_all()
                if rs["ruleset"] == "HKEX_Chapter_18C_Specialist_Technology")


def _gate(ruleset, gate_id):
    return next(g for g in ruleset["gates"] if g["id"] == gate_id)


def _check_of(gate):
    return gate["requirement"]["all_of"][0]["check"]


# market cap present at HK$5,000M: above the reduced (4,000M) bar, below base (6,000M)
ISSUER = {
    "offering_use_of_proceeds": {
        "market_capitalisation_at_listing": {"value": 5000, "unit": "HKD million"}
    }
}
IN_WINDOW = {"intended_application_date": "2025-01-01",
             "expected_listing_date": "2025-06-01"}
OUT_OF_WINDOW = {"intended_application_date": "2025-01-01",
                 "expected_listing_date": "2024-01-01"}  # before 2024-09-01
DATE_MISSING = {"intended_application_date": None,
                "expected_listing_date": "2025-06-01"}


class ConditionalOverride(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.check = _check_of(_gate(_ch18c(), "ch18c_commercial_market_cap"))

    def _eval(self, profile):
        return eval_check(self.check, EvalContext(ISSUER, profile=profile))

    def test_reduced_threshold_applies_in_window(self):
        result = self._eval(IN_WINDOW)
        # 5000 >= reduced 4000 -> PASS
        self.assertEqual(result.status, PASS)
        self.assertIn("4000", result.required)
        self.assertIn("temporarily-reduced", result.note)

    def test_base_threshold_outside_window(self):
        result = self._eval(OUT_OF_WINDOW)
        # 5000 < base 6000 -> SHORTFALL
        self.assertEqual(result.status, SHORTFALL)
        self.assertIn("6000", result.required)
        self.assertIn("base threshold", result.note)

    def test_indeterminate_when_a_date_is_missing(self):
        result = self._eval(DATE_MISSING)
        self.assertEqual(result.status, INDETERMINATE)
        self.assertIn("intended_application_date", result.note)
        self.assertIn("expected_listing_date", result.note)

    def test_indeterminate_when_profile_absent(self):
        result = eval_check(self.check, EvalContext(ISSUER, profile={}))
        self.assertEqual(result.status, INDETERMINATE)

    def test_precommercial_override_8000(self):
        check = _check_of(_gate(_ch18c(), "ch18c_precommercial_market_cap"))
        # market cap 9,000M: >= reduced 8,000M but < base 10,000M
        issuer = {"offering_use_of_proceeds": {
            "market_capitalisation_at_listing": {"value": 9000, "unit": "HKD million"}}}
        res_in = eval_check(check, EvalContext(issuer, profile=IN_WINDOW))
        self.assertEqual(res_in.status, PASS)
        res_out = eval_check(check, EvalContext(issuer, profile=OUT_OF_WINDOW))
        self.assertEqual(res_out.status, SHORTFALL)


class RequiresLlmRouting(unittest.TestCase):
    def test_requires_llm_gate_not_hard_evaluated(self):
        gate = _gate(_ch18c(), "ch18c_sophisticated_independent_investors")
        meta = {"ruleset": "HKEX_Chapter_18C_Specialist_Technology", "version": "x"}
        result = eval_gate(gate, meta, EvalContext({}, profile={}))
        self.assertEqual(result.status, NOT_EVALUATED)
        self.assertTrue(result.requires_llm)
        self.assertIn("soft engine", result.note)


if __name__ == "__main__":
    unittest.main()
