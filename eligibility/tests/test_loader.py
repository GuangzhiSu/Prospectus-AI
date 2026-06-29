"""Tests for rule-config loading, the split verification schema, and provenance."""
import unittest

from eligibility.loader import (
    load_all,
    gate_effective,
    select_by_name,
    unverified_thresholds,
    walk_checks,
)


def _all_checks(rulesets):
    for rs in rulesets:
        for gate in rs["gates"]:
            for check in walk_checks(gate.get("requirement", {})):
                yield rs, gate, check


class LoaderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rulesets = load_all()

    def test_all_rulesets_load(self):
        names = {rs["ruleset"] for rs in self.rulesets}
        self.assertEqual(
            names,
            {
                "HKEX_Main_Board",
                "HKEX_Chapter_8A_WVR",
                "HKEX_Chapter_18C_Specialist_Technology",
                "HKEX_Chapter_18A_Biotech",
                "CSRC_Overseas_Listing_Filing",
            },
        )

    def test_threshold_verified_counts_by_ruleset(self):
        counts = {}
        for rs in self.rulesets:
            counts[rs["ruleset"]] = sum(
                1 for _, _, c in _all_checks([rs]) if c.get("threshold_verified")
            )
        self.assertEqual(counts["HKEX_Main_Board"], 11)  # 8.05 (9) + 2 continuity limbs
        self.assertEqual(counts["HKEX_Chapter_8A_WVR"], 4)         # 8A.06 (3) + 8A.12 (1)
        self.assertEqual(counts["HKEX_Chapter_18C_Specialist_Technology"], 9)
        self.assertEqual(counts["HKEX_Chapter_18A_Biotech"], 0)
        self.assertEqual(counts["CSRC_Overseas_Listing_Filing"], 0)

    def test_wvr_economic_interest_is_8a12_and_verified(self):
        # Corrected rule_ref 8A.13 -> 8A.12; threshold now verified with note.
        for _, gate, check in _all_checks(self.rulesets):
            if check.get("id") == "beneficiary_aggregate_ownership":
                self.assertEqual(gate["rule_ref"], "Main Board Listing Rule 8A.12")
                self.assertTrue(check["threshold_verified"])
                self.assertIn("8A.12", check["verified_against"])
                self.assertIn("ceiling 50%", check["guidance_note"])

    def test_18c_requires_llm_gates(self):
        c18 = next(rs for rs in self.rulesets
                   if rs["ruleset"].startswith("HKEX_Chapter_18C"))
        llm = {g["id"] for g in c18["gates"] if g.get("requires_llm")}
        self.assertEqual(
            llm,
            {
                "ch18c_operating_track_record_and_continuity",
                "ch18c_independent_price_setting_investors",
                "ch18c_sophisticated_independent_investors",
            },
        )

    def test_unverified_list_is_the_complement(self):
        pending = unverified_thresholds(self.rulesets)
        total = sum(1 for _ in _all_checks(self.rulesets))
        verified = sum(1 for _, _, c in _all_checks(self.rulesets)
                       if c.get("threshold_verified"))
        self.assertEqual(len(pending), total - verified)

    def test_threshold_and_date_verification_are_independent(self):
        # 8.05(2)/(3) checks: value verified, but effective_from NOT verified.
        by_gate = {}
        for _, gate, check in _all_checks(self.rulesets):
            by_gate.setdefault(gate["id"], []).append(check)
        for gid in ("mb_8052_market_cap_revenue_cashflow_test",
                    "mb_8053_market_cap_revenue_test"):
            for check in by_gate[gid]:
                self.assertTrue(check["threshold_verified"], gid)
                self.assertFalse(check["effective_from_verified"], gid)
                self.assertIn("predate 2018", check["date_note"])
        # 8.05(1) profit checks: both value and date verified.
        for check in by_gate["mb_8051_profit_test"]:
            if check["id"].startswith("profit_"):
                self.assertTrue(check["threshold_verified"])
                self.assertTrue(check["effective_from_verified"])
                self.assertEqual(check["effective_from"], "2022-01-01")

    def test_verified_checks_carry_provenance(self):
        for _, _, check in _all_checks(self.rulesets):
            if check.get("threshold_verified"):
                self.assertEqual(check.get("verified_by"), "cc_websearch")
                self.assertEqual(check.get("verified_on"), "2026-06-29")
                self.assertTrue(check.get("verified_against"))

    def test_human_signoff_open_on_every_gate(self):
        # threshold_verified (checked vs rulebook) must never imply human sign-off.
        for rs in self.rulesets:
            for gate in rs["gates"]:
                self.assertFalse(gate.get("human_signoff", False),
                                 f"{rs['ruleset']}.{gate['id']}")

    def test_baseline_membership(self):
        baseline = {rs["ruleset"] for rs in self.rulesets
                    if rs.get("in_regression_baseline")}
        self.assertEqual(baseline, {"HKEX_Main_Board", "HKEX_Chapter_8A_WVR"})

    def test_stub_rulesets_all_gates_not_evaluated(self):
        for rs in self.rulesets:
            if rs.get("in_regression_baseline"):
                continue
            for gate in rs["gates"]:
                self.assertFalse(gate.get("evaluated", True),
                                 f"{rs['ruleset']}.{gate['id']}")

    def test_effective_from_filter(self):
        gate = {"effective_from": "2023-03-31"}
        self.assertTrue(gate_effective(gate, None))
        self.assertTrue(gate_effective(gate, "2024-01-01"))
        self.assertFalse(gate_effective(gate, "2022-01-01"))

    def test_select_by_name(self):
        picked = select_by_name(self.rulesets, ["HKEX_Main_Board"])
        self.assertEqual(len(picked), 1)
        self.assertEqual(picked[0]["ruleset"], "HKEX_Main_Board")


if __name__ == "__main__":
    unittest.main()
