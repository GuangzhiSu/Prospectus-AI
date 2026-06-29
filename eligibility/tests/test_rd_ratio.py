"""Tests for the Chapter 18C tiered R&D expenditure-ratio gate (Rule 18C.04).

The gate selects a tier from company_type (+ revenue band for pre-commercial) and
passes only when the tier ratio is met for >= 2 of 3 years AND on aggregate. The
per-year ratios and aggregate are READ-ONLY resolved inputs -- the engine never
computes them. No real-company data is used.
"""
import unittest

from eligibility.engine import (
    EvalContext,
    INDETERMINATE,
    MISSING_INPUT,
    PASS,
    SHORTFALL,
    eval_check,
)
from eligibility.loader import load_all


def _rd_check():
    rs = next(r for r in load_all()
              if r["ruleset"] == "HKEX_Chapter_18C_Specialist_Technology")
    gate = next(g for g in rs["gates"] if g["id"] == "ch18c_rd_expenditure_ratio")
    return gate["requirement"]["all_of"][0]["check"]


def _years(*vals):
    return [{"period": f"FY{i}", "value": {"value": v, "unit": "%"}}
            for i, v in enumerate(vals)]


def _issuer(by_year, aggregate, revenue=None):
    rd = {}
    if by_year is not None:
        rd["rd_ratio_by_year"] = by_year
    if aggregate is not None:
        rd["rd_ratio_3y_aggregate"] = {"value": aggregate, "unit": "%"}
    issuer = {"rd_ip": rd}
    if revenue is not None:
        issuer["financials"] = {"income_statement": [
            {"period": "FY2024", "revenue": revenue}]}
    return issuer


PATH_VARS = {"latest_audited_fy": "FY2024"}


class RdRatioTiered(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.check = _rd_check()

    def _eval(self, issuer, profile, fx=None):
        return eval_check(self.check,
                          EvalContext(issuer, fx=fx, path_vars=PATH_VARS, profile=profile))

    # --- commercial tier (15%) ---
    def test_commercial_pass(self):
        r = self._eval(_issuer(_years(18, 16, 12), 15.5),
                       {"company_type": "commercial"})
        self.assertEqual(r.status, PASS)  # 2 of 3 >= 15 and aggregate 15.5 >= 15

    def test_commercial_shortfall_too_few_years(self):
        r = self._eval(_issuer(_years(18, 12, 12), 14.0),
                       {"company_type": "commercial"})
        self.assertEqual(r.status, SHORTFALL)  # only 1 year >= 15

    def test_commercial_shortfall_aggregate_below(self):
        r = self._eval(_issuer(_years(18, 16, 11), 14.0),
                       {"company_type": "commercial"})
        self.assertEqual(r.status, SHORTFALL)  # 2 years meet, but aggregate < 15

    # --- pre-commercial tiers (50% low band, 30% mid band) ---
    def test_precommercial_low_band_50(self):
        issuer = _issuer(_years(55, 52, 48), 51.0,
                         revenue={"value": 100, "unit": "HKD million"})
        r = self._eval(issuer, {"company_type": "pre_commercial"})
        self.assertEqual(r.status, PASS)
        self.assertIn("50%", r.required)

    def test_precommercial_mid_band_30(self):
        issuer = _issuer(_years(35, 32, 20), 31.0,
                         revenue={"value": 200, "unit": "HKD million"})
        r = self._eval(issuer, {"company_type": "pre_commercial"})
        self.assertEqual(r.status, PASS)
        self.assertIn("30%", r.required)

    def test_precommercial_band_needs_fx(self):
        # revenue in RMB, no FX -> cannot determine band -> INDETERMINATE
        issuer = _issuer(_years(55, 52, 48), 51.0,
                         revenue={"value": 100, "unit": "RMB million"})
        r = self._eval(issuer, {"company_type": "pre_commercial"}, fx=None)
        self.assertEqual(r.status, INDETERMINATE)

    # --- read-only / missing-input discipline ---
    def test_missing_by_year_is_missing_input(self):
        r = self._eval(_issuer(None, 15.5), {"company_type": "commercial"})
        self.assertEqual(r.status, MISSING_INPUT)
        self.assertIn("never computes", r.note)

    def test_missing_company_type_is_missing_input(self):
        r = self._eval(_issuer(_years(18, 16, 12), 15.5), {})
        self.assertEqual(r.status, MISSING_INPUT)
        self.assertIn("company_type", r.note)


if __name__ == "__main__":
    unittest.main()
