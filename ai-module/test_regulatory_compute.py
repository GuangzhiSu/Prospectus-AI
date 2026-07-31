"""Unit tests for the Task-D regulatory computed fields (compute_module.py).

Covers: the 扣非前后孰低 lower-of rule; the three incompatible R&D-ratio
definitions (CN vs HK denominator); revenue aggregates / CAGR / YoY booleans;
deal-parameter derivations; and -- above all -- strict null discipline: any
missing input propagates None, never a fabricated 0. No real-company data.
"""
import importlib.util
import os
import unittest

_HERE = os.path.dirname(__file__)
_spec = importlib.util.spec_from_file_location(
    "compute_module", os.path.join(_HERE, "compute_module.py"))
cm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cm)

P = ["FY2022", "FY2023", "FY2024"]


def _issuer(rows):
    return {"financials": {"income_statement": rows}}


def _row(period, **kw):
    r = {"period": period}
    r.update({k: {"value": v, "unit": "CNY million"} for k, v in kw.items()})
    return r


class NetProfitRegulatoryCn(unittest.TestCase):
    def test_lower_of_before_after(self):
        self.assertEqual(cm.net_profit_regulatory_cn(120, 100), 100)
        self.assertEqual(cm.net_profit_regulatory_cn(80, 100), 80)

    def test_none_if_either_side_missing(self):
        self.assertIsNone(cm.net_profit_regulatory_cn(None, 100))
        self.assertIsNone(cm.net_profit_regulatory_cn(120, None))

    def test_aggregate_and_latest_and_min(self):
        rows = [_row("FY2022", net_profit_before_nonrecurring=90, net_profit_after_nonrecurring=80),
                _row("FY2023", net_profit_before_nonrecurring=110, net_profit_after_nonrecurring=120),
                _row("FY2024", net_profit_before_nonrecurring=150, net_profit_after_nonrecurring=140)]
        root = _issuer(rows)
        # 孰低 series = [80, 110, 140]
        self.assertEqual(cm.net_profit_regulatory_cn_aggregate(root, P)["value"], 330)
        self.assertEqual(cm.net_profit_regulatory_cn_latest(root, P)["value"], 140)
        self.assertEqual(cm.net_profit_regulatory_cn_min(root, P)["value"], 80)
        self.assertTrue(cm.net_profit_positive_each_year(root, P))

    def test_positive_each_year_false_and_null(self):
        rows = [_row("FY2022", net_profit_before_nonrecurring=-5, net_profit_after_nonrecurring=10),
                _row("FY2023", net_profit_before_nonrecurring=110, net_profit_after_nonrecurring=120),
                _row("FY2024", net_profit_before_nonrecurring=150, net_profit_after_nonrecurring=140)]
        self.assertFalse(cm.net_profit_positive_each_year(_issuer(rows), P))
        # missing a period row -> None (never a fabricated aggregate)
        self.assertIsNone(cm.net_profit_regulatory_cn_aggregate(_issuer(rows[:2]), P))
        self.assertIsNone(cm.net_profit_positive_each_year(_issuer(rows[:2]), P))


class RdRatiosNotAliased(unittest.TestCase):
    def test_cn_denominator_is_revenue(self):
        rows = [_row(p, rd_expenditure=rd, revenue=rev, total_operating_expenditure=opex)
                for p, rd, rev, opex in
                [("FY2022", 10, 100, 50), ("FY2023", 20, 200, 80), ("FY2024", 30, 300, 120)]]
        root = _issuer(rows)
        # CN: sum(rd)=60 / sum(rev)=600 = 10%
        self.assertAlmostEqual(cm.rd_ratio_cn(root, P)["value"], 10.0)
        self.assertEqual(cm.rd_agg_cn(root, P)["value"], 60)

    def test_hk_denominator_is_opex(self):
        rows = [_row(p, rd_expenditure=rd, revenue=rev, total_operating_expenditure=opex)
                for p, rd, rev, opex in
                [("FY2023", 20, 200, 80), ("FY2024", 30, 300, 120)]]
        root = _issuer(rows)
        # HK per-FY: 20/80=25%, 30/120=25% -> min 25% (opex denominator, NOT revenue)
        self.assertAlmostEqual(cm.rd_ratio_per_fy_hk_min(root, ["FY2023", "FY2024"])["value"], 25.0)
        self.assertEqual(cm.rd_agg_hk(root, ["FY2023", "FY2024"])["value"], 50)

    def test_cn_and_hk_differ_on_same_inputs(self):
        rows = [_row(p, rd_expenditure=rd, revenue=rev, total_operating_expenditure=opex)
                for p, rd, rev, opex in
                [("FY2023", 20, 200, 80), ("FY2024", 30, 300, 120)]]
        root = _issuer(rows)
        cn = cm.rd_ratio_cn(root, ["FY2023", "FY2024"])["value"]        # 50/500 = 10%
        hk = cm.rd_ratio_per_fy_hk_min(root, ["FY2023", "FY2024"])["value"]  # min(25%,25%)
        self.assertNotAlmostEqual(cn, hk)

    def test_null_discipline(self):
        rows = [_row("FY2023", rd_expenditure=20, revenue=200),  # opex missing
                _row("FY2024", rd_expenditure=30, revenue=300, total_operating_expenditure=120)]
        self.assertIsNone(cm.rd_ratio_per_fy_hk_min(_issuer(rows), ["FY2023", "FY2024"]))
        # zero revenue -> None, not division error
        z = [_row("FY2023", rd_expenditure=20, revenue=0),
             _row("FY2024", rd_expenditure=30, revenue=0)]
        self.assertIsNone(cm.rd_ratio_cn(_issuer(z), ["FY2023", "FY2024"]))


class RevenueGrowth(unittest.TestCase):
    def _rev(self, *vals):
        return _issuer([_row(f"FY{2022+i}", revenue=v) for i, v in enumerate(vals)])

    def test_cagr(self):
        # 100 -> 200 over 2 steps: (200/100)^(1/2)-1 = 41.42%
        self.assertAlmostEqual(cm.revenue_cagr(self._rev(100, 150, 200), P)["value"], 41.4213, places=3)

    def test_cagr_none_if_first_year_nonpositive(self):
        self.assertIsNone(cm.revenue_cagr(self._rev(0, 150, 200), P))

    def test_yoy_latest_and_each(self):
        r = self._rev(100, 150, 180)
        self.assertAlmostEqual(cm.revenue_yoy_growth_latest(r, P)["value"], 20.0)
        self.assertTrue(cm.revenue_yoy_growth_each_of(r, P))
        self.assertFalse(cm.revenue_yoy_growth_each_of(self._rev(100, 90, 180), P))

    def test_aggregate_and_avg(self):
        r = self._rev(100, 200)
        self.assertEqual(cm.revenue_aggregate(r, ["FY2022", "FY2023"])["value"], 300)
        self.assertEqual(cm.revenue_avg(r, ["FY2022", "FY2023"])["value"], 150)


class DealParams(unittest.TestCase):
    def test_expected_market_cap(self):
        self.assertEqual(cm.expected_market_cap_at_listing(10.0, 500.0)["value"], 5000)
        self.assertIsNone(cm.expected_market_cap_at_listing(None, 500.0))
        self.assertIsNone(cm.expected_market_cap_at_listing(10.0, None))

    def test_public_float_pct(self):
        self.assertAlmostEqual(cm.public_float_pct(30.0, 120.0)["value"], 25.0)
        self.assertIsNone(cm.public_float_pct(30.0, 0))
        self.assertIsNone(cm.public_float_pct(None, 120.0))

    def test_pe_ratio_informational(self):
        self.assertAlmostEqual(cm.pe_ratio_at_issue(20.0, 2.0)["value"], 10.0)
        self.assertEqual(cm.pe_ratio_at_issue(20.0, 2.0)["unit"], "x")
        self.assertIsNone(cm.pe_ratio_at_issue(20.0, 0))


class RegistryOneEntryPerDefinition(unittest.TestCase):
    def test_registry_callables(self):
        for name, (fn, doc) in cm.REGULATORY_COMPUTED_FIELDS.items():
            self.assertTrue(callable(fn), name)
            self.assertTrue(doc)
        self.assertIn("pe_ratio_at_issue", cm.REGULATORY_COMPUTED_FIELDS)


if __name__ == "__main__":
    unittest.main()
