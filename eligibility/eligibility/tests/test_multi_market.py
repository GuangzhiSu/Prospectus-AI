"""Tests for v1 multi-market hard packs (CN / GEM / SGX / public float)."""
from __future__ import annotations

import json
import os
import unittest

from eligibility.engine import PASS, SHORTFALL, eval_gate, EvalContext
from eligibility.loader import load_all, load_soft_layer, walk_checks

NEW_PACK_FILES = {
    "cn_main_board.yaml",
    "cn_star.yaml",
    "cn_chinext.yaml",
    "cn_bse.yaml",
    "cn_csrc_preconditions.yaml",
    "hkex_gem.yaml",
    "hkex_public_float.yaml",
    "sgx_mainboard.yaml",
    "sgx_catalist.yaml",
}

NEW_RULESETS = {
    "CN_Main_Board",
    "CN_STAR_Market",
    "CN_ChiNext",
    "CN_BSE",
    "CN_CSRC_Preconditions",
    "HKEX_GEM",
    "HKEX_Public_Float",
    "SGX_Mainboard",
    "SGX_Catalist",
}

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


class MultiMarketPackLoading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rulesets = load_all()

    def test_new_packs_load(self):
        by_file = {rs["_source_file"]: rs for rs in self.rulesets}
        for fname in NEW_PACK_FILES:
            self.assertIn(fname, by_file, f"missing pack file {fname}")
            rs = by_file[fname]
            self.assertIn(rs["ruleset"], NEW_RULESETS)
            self.assertFalse(rs.get("in_regression_baseline", True))
            self.assertTrue(rs["gates"], f"{fname} has no gates")

    def test_new_packs_not_in_regression_baseline(self):
        for rs in self.rulesets:
            if rs["ruleset"] in NEW_RULESETS:
                self.assertFalse(rs.get("in_regression_baseline", False))

    def test_soft_pack_excluded_from_hard_load(self):
        hard_names = {rs["ruleset"] for rs in self.rulesets}
        soft_names = {rs["ruleset"] for rs in load_soft_layer()}
        self.assertIn("HKEX_Qualitative_Substance", soft_names)
        self.assertNotIn("HKEX_Qualitative_Substance", hard_names)
        self.assertFalse(hard_names & soft_names)

    def test_pe_ratio_at_issue_not_referenced(self):
        refs = []
        for rs in self.rulesets:
            for gate in rs["gates"]:
                for check in walk_checks(gate.get("requirement", {})):
                    for key in ("input_path", "profile_field", "metric"):
                        val = check.get(key) or ""
                        if "pe_ratio_at_issue" in str(val):
                            refs.append((rs["ruleset"], gate["id"], check.get("id")))
        self.assertEqual(refs, [])

    def test_pending_text_check_never_passes(self):
        """Gates/checks flagged needs_human_verify must not hard-evaluate to PASS."""
        ctx = EvalContext({}, profile={})
        for rs in self.rulesets:
            meta = {"ruleset": rs["ruleset"], "version": rs["version"]}
            for gate in rs["gates"]:
                for check in walk_checks(gate.get("requirement", {})):
                    if not check.get("needs_human_verify"):
                        continue
                    self.assertFalse(
                        gate.get("evaluated", False),
                        f"{rs['ruleset']}.{gate['id']} has needs_human_verify but evaluated:true",
                    )
                    result = eval_gate(gate, meta, ctx)
                    self.assertNotIn(
                        result.status,
                        (PASS, SHORTFALL),
                        f"{rs['ruleset']}.{gate['id']} pending gate must not PASS/SHORTFALL",
                    )


class MultiMarketFixtures(unittest.TestCase):
    """Optional fixture smoke tests — packs load against synthetic issuer JSON."""

    @classmethod
    def setUpClass(cls):
        cls.path_vars = {"latest_audited_fy": "FY2024", "prior_fy_1": "FY2023", "prior_fy_2": "FY2022"}

    def _load(self, name: str) -> dict:
        path = os.path.join(FIXTURES, name)
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    def test_ashare_fixture_loads(self):
        issuer = self._load("synthetic_ashare.json")
        ctx = EvalContext(issuer, path_vars=self.path_vars, profile=issuer.get("profile", {}))
        cn = next(rs for rs in load_all() if rs["ruleset"] == "CN_ChiNext")
        meta = {"ruleset": cn["ruleset"], "version": cn["version"]}
        for gate in cn["gates"]:
            result = eval_gate(gate, meta, ctx)
            self.assertIn(result.status, ("NOT_EVALUATED", PASS, SHORTFALL, "MISSING_INPUT", "INDETERMINATE"))

    def test_sgx_fixture_loads(self):
        issuer = self._load("synthetic_sgx.json")
        ctx = EvalContext(issuer, path_vars=self.path_vars, profile=issuer.get("profile", {}))
        sg = next(rs for rs in load_all() if rs["ruleset"] == "SGX_Mainboard")
        meta = {"ruleset": sg["ruleset"], "version": sg["version"]}
        for gate in sg["gates"]:
            result = eval_gate(gate, meta, ctx)
            self.assertIn(result.status, ("NOT_EVALUATED", PASS, SHORTFALL, "MISSING_INPUT", "INDETERMINATE"))


if __name__ == "__main__":
    unittest.main()
