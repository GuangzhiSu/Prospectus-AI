"""Mode B issuer-builder tests."""
from __future__ import annotations

import unittest

from eligibility.extraction.issuer_builder import (
    apply_confirmations,
    build_issuer_from_extraction,
    structured_form_to_issuer,
)


class IssuerBuilderTests(unittest.TestCase):
    def test_unconfirmed_fields_excluded(self):
        package = {
            "quantifiable": [
                {
                    "field_id": "revenue",
                    "value": 500,
                    "unit": "HKD million",
                    "confirmation_status": "extracted",
                }
            ],
            "deal_params": [],
        }
        issuer = build_issuer_from_extraction(
            package, profile={"path_vars": {"latest_audited_fy": "FY2024"}}
        )
        rows = issuer["financials"]["income_statement"]
        self.assertTrue(all("revenue" not in r for r in rows) or not rows)

    def test_confirmed_fields_written(self):
        package = {
            "quantifiable": [
                {
                    "field_id": "revenue",
                    "value": 500,
                    "unit": "HKD million",
                    "confirmation_status": "extracted",
                }
            ],
            "deal_params": [],
        }
        apply_confirmations(package, confirm_all=True)
        issuer = build_issuer_from_extraction(
            package, profile={"path_vars": {"latest_audited_fy": "FY2024"}}
        )
        row = issuer["financials"]["income_statement"][0]
        self.assertEqual(row["period"], "FY2024")
        self.assertEqual(row["revenue"]["value"], 500)

    def test_structured_form(self):
        issuer, profile = structured_form_to_issuer(
            {
                "issuer_name": "DemoCo",
                "latest_profit": "40",
                "market_cap": "600",
                "management_continuity_years": "3",
                "ownership_continuity": "yes",
            }
        )
        self.assertEqual(issuer["issuer_id"], "DemoCo")
        self.assertEqual(profile["management_continuity_years"], 3.0)
        self.assertTrue(profile["ownership_continuity_recent_audited_fy"])


if __name__ == "__main__":
    unittest.main()
