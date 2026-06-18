# Coverage vs. IPO_Input_Report_EN.docx (1).pdf

_Generated from `prospectus_kg_output/inputs/input_schema.json` v2.0._

Each row below maps one Report §1–§6 bullet to the Schema A `field_id`(s) that
cover it.  Rows marked **COVERED** have concrete schema fields; rows marked
**GAP** have no matching field and require a follow-up (none today).

## Summary

| Report section | Bullets | Covered | Gap | Coverage |
| --- | ---: | ---: | ---: | ---: |
| §1.1 Corporate Structure        |  8 |  8 | 0 | 100% |
| §1.2 Business                   |  8 |  8 | 0 | 100% |
| §1.3 Financial                  | 10 | 10 | 0 | 100% |
| §1.4(a) Directors               |  6 |  6 | 0 | 100% |
| §1.4(b) Intellectual Property   |  5 |  5 | 0 | 100% |
| §1.4(c) Property                |  6 |  6 | 0 | 100% |
| §1.4(d) Litigation              |  5 |  5 | 0 | 100% |
| §1.4(e) Employment              |  6 |  6 | 0 | 100% |
| §1.4(f) Insurance               |  4 |  4 | 0 | 100% |
| §1.4(g) Regulatory Compliance   |  6 |  6 | 0 | 100% |
| §1.4(h) Tax                     |  4 |  4 | 0 | 100% |
| §1.4(i) IT                      |  5 |  5 | 0 | 100% |
| §2   Professional Deliverables  | 27 | 27 | 0 | 100% |
| §3   Document Format / Transmission | 10 | 10 | 0 | 100% |
| §4   Information Flow Anchors   |  6 |  6 | 0 | 100% |
| §5   Gatekeeping Documents      |  8 |  8 | 0 | 100% |
| §6   Regulatory Frameworks      |  8 |  8 | 0 | 100% |
| **Total** | **132** | **132** | **0** | **100%** |

> Coverage of the Report bullet list is 100%. Residual gaps live in the extractor
> (fill rate in `records/`), not in the schema surface area.

---

## §1 Issuer-Supplied Materials

### §1.1 Corporate Structure and Records

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Certificate of incorporation | COVERED | `issuer.corp.certificate_of_incorporation` |
| 2 | Business registration certificate | COVERED | `issuer.corp.business_registration` |
| 3 | Articles of association (as amended) | COVERED | `issuer.corp.articles_of_association` |
| 4 | Statutory books | COVERED | `issuer.corp.statutory_books` |
| 5 | Board and committee minutes (3Y) | COVERED | `issuer.corp.board_minutes` |
| 6 | Register of members | COVERED | `issuer.corp.shareholder_register` |
| 7 | Register of directors | COVERED | `issuer.corp.director_register` |
| 8 | Share transfer history | COVERED | `issuer.corp.share_transfer_history` |

### §1.2 Business and Operations

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Principal business scope | COVERED | `issuer.biz.business_scope` |
| 2 | Business model / revenue streams | COVERED | `issuer.biz.business_model` |
| 3 | Major products or services | COVERED | `issuer.biz.major_products` |
| 4 | Supply chain and manufacturing footprint | COVERED | `issuer.biz.supply_chain` |
| 5 | Material customer contracts | COVERED | `issuer.biz.customer_contracts` |
| 6 | Top five customers (3Y) | COVERED | `issuer.biz.major_customers` |
| 7 | Top five suppliers (3Y) | COVERED | `issuer.biz.major_suppliers` |
| 8 | Geographic distribution of revenue | COVERED | `issuer.biz.geographic_distribution` |

### §1.3 Financial Records

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Audited consolidated accounts (3Y) | COVERED | `issuer.fin.audited_accounts_3y` |
| 2 | Interim financial statements | COVERED | `issuer.fin.interim_financials` |
| 3 | Monthly management accounts | COVERED | `issuer.fin.management_accounts` |
| 4 | Tax returns (3Y) | COVERED | `issuer.fin.tax_returns` |
| 5 | Bank statements & facility confirmations | COVERED | `issuer.fin.bank_statements` |
| 6 | Working capital model | COVERED | `issuer.fin.working_capital_model` |
| 7 | Indebtedness schedule | COVERED | `issuer.fin.indebtedness_schedule` |
| 8 | Capex plan | COVERED | `issuer.fin.capex_plan` |
| 9 | Financial projections | COVERED | `issuer.fin.financial_projections` |
| 10 | Significant accounting policies | COVERED | `issuer.fin.accounting_policies` |

### §1.4(a) Directors and Interests

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Director CVs | COVERED | `issuer.dir.director_cvs` |
| 2 | Director questionnaires (D&O) | COVERED | `issuer.dir.director_questionnaires` |
| 3 | D&O interests disclosure | COVERED | `issuer.dir.do_interests` |
| 4 | Related party transactions register | COVERED | `issuer.dir.related_party_transactions` |
| 5 | Conflict of interest disclosures | COVERED | `issuer.dir.conflict_disclosures` |
| 6 | Resignation / appointment letters | COVERED | `issuer.dir.resignation_letters` |

### §1.4(b) Intellectual Property

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Patents | COVERED | `issuer.ip.patents` |
| 2 | Trademarks | COVERED | `issuer.ip.trademarks` |
| 3 | Copyrights | COVERED | `issuer.ip.copyrights` |
| 4 | IP licensing agreements | COVERED | `issuer.ip.licensing_agreements` |
| 5 | IP disputes / litigation | COVERED | `issuer.ip.ip_disputes` |

### §1.4(c) Property

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Property list | COVERED | `issuer.prop.property_list` |
| 2 | Title deeds / land-use rights | COVERED | `issuer.prop.title_deeds` |
| 3 | Lease agreements | COVERED | `issuer.prop.leases` |
| 4 | Property valuation reports | COVERED | `issuer.prop.valuation_reports` |
| 5 | Occupancy / construction permits | COVERED | `issuer.prop.occupancy_permits` |
| 6 | Environmental compliance | COVERED | `issuer.prop.environmental_compliance` |

### §1.4(d) Litigation

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Ongoing litigation | COVERED | `issuer.lit.ongoing_litigation` |
| 2 | Historical litigation (3Y) | COVERED | `issuer.lit.historical_litigation` |
| 3 | Regulatory inquiries | COVERED | `issuer.lit.regulatory_inquiries` |
| 4 | Investigation correspondence | COVERED | `issuer.lit.investigation_letters` |
| 5 | Settlement agreements | COVERED | `issuer.lit.settlement_agreements` |

### §1.4(e) Employment

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Employee headcount (3Y) | COVERED | `issuer.hr.employee_count` |
| 2 | Key employee contracts | COVERED | `issuer.hr.key_contracts` |
| 3 | Pension / MPF arrangements | COVERED | `issuer.hr.pension_arrangements` |
| 4 | Labor disputes / unionisation | COVERED | `issuer.hr.labor_disputes` |
| 5 | Share option / incentive schemes | COVERED | `issuer.hr.share_option_scheme` |
| 6 | Employment policies / handbook | COVERED | `issuer.hr.employment_policies` |

### §1.4(f) Insurance

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Policy register | COVERED | `issuer.ins.policy_list` |
| 2 | Coverage summary | COVERED | `issuer.ins.coverage_summary` |
| 3 | Claims history (3Y) | COVERED | `issuer.ins.claims_history` |
| 4 | Adequacy assessment | COVERED | `issuer.ins.adequacy_assessment` |

### §1.4(g) Regulatory Compliance

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Licenses and permits register | COVERED | `issuer.reg.licenses_held` |
| 2 | Compliance policies | COVERED | `issuer.reg.compliance_policies` |
| 3 | PRC regulatory correspondence | COVERED | `issuer.reg.prc_regulatory_letters` |
| 4 | Breaches and remediation | COVERED | `issuer.reg.breaches_remediation` |
| 5 | Anti-corruption / anti-bribery policy | COVERED | `issuer.reg.anti_corruption_policy` |
| 6 | Data-privacy / cybersecurity compliance | COVERED | `issuer.reg.data_privacy_compliance` |

### §1.4(h) Tax

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Tax residency status | COVERED | `issuer.tax.residency` |
| 2 | Tax clearance certificates | COVERED | `issuer.tax.clearances` |
| 3 | Unresolved tax disputes | COVERED | `issuer.tax.disputes` |
| 4 | Transfer pricing documentation | COVERED | `issuer.tax.transfer_pricing` |

### §1.4(i) Information Technology

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Core IT systems inventory | COVERED | `issuer.it.core_systems` |
| 2 | Data-security policy | COVERED | `issuer.it.data_security_policy` |
| 3 | Cybersecurity incident history (3Y) | COVERED | `issuer.it.cyber_incidents` |
| 4 | IT infrastructure / hosting | COVERED | `issuer.it.infrastructure` |
| 5 | IT outsourcing contracts | COVERED | `issuer.it.outsourcing_contracts` |

---

## §2 Professional Party Deliverables

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Sponsor — Form M107 | COVERED | `prof.sponsor.form_M107` |
| 2 | Sponsor — Form M108 | COVERED | `prof.sponsor.form_M108` |
| 3 | Sponsor DD memorandum | COVERED | `prof.sponsor.dd_memorandum` |
| 4 | Sponsor DD workpapers | COVERED | `prof.sponsor.dd_workpapers` |
| 5 | Track-record period analysis | COVERED | `prof.sponsor.track_record_analysis` |
| 6 | Reporting accountants — long-form report | COVERED | `prof.ra.accountants_report` |
| 7 | Working capital sufficiency opinion | COVERED | `prof.ra.working_capital_opinion` |
| 8 | Indebtedness statement | COVERED | `prof.ra.indebtedness_statement` |
| 9 | Profit forecast memorandum | COVERED | `prof.ra.profit_forecast_memo` |
| 10 | 5 comfort letters (enum) | COVERED | `prof.ra.comfort_letters` |
| 11 | Comfort letter — long-form | COVERED | `prof.ra.comfort_letter_accountants_report_long_form` |
| 12 | Comfort letter — FIS | COVERED | `prof.ra.comfort_letter_fis` |
| 13 | Comfort letter — interim | COVERED | `prof.ra.comfort_letter_interim` |
| 14 | Comfort letter — subsequent events | COVERED | `prof.ra.comfort_letter_subsequent_events` |
| 15 | Comfort letter — MD&A | COVERED | `prof.ra.comfort_letter_management_discussion` |
| 16 | HK counsel — corporate opinion | COVERED | `prof.legal.hk.corporate_opinion` |
| 17 | HK counsel — litigation opinion | COVERED | `prof.legal.hk.litigation_opinion` |
| 18 | HK counsel — verification notes | COVERED | `prof.legal.hk.verification_notes` |
| 19 | Cayman / Bermuda counsel — incorporation opinion | COVERED | `prof.legal.offshore.incorporation_opinion` |
| 20 | PRC counsel — regulatory opinion | COVERED | `prof.legal.prc.regulatory_opinion` |
| 21 | PRC counsel — license opinion | COVERED | `prof.legal.prc.license_opinion` |
| 22 | PRC counsel — WFOE / VIE opinion | COVERED | `prof.legal.prc.wfoe_vie_opinion` |
| 23 | Sponsor's / underwriters' counsel — disclosure opinion | COVERED | `prof.legal.sponsor_counsel.disclosure_opinion` |
| 24 | Sponsor's counsel — 10b-5 letter | COVERED | `prof.legal.sponsor_counsel.10b5_letter` |
| 25 | Property valuer — qualification (RICS / HKIS) | COVERED | `prof.valuer.qualification` |
| 26 | Property valuer — 15% trigger threshold | COVERED | `prof.valuer.trigger_threshold_pct` |
| 27 | Property valuer — 3-month date rule | COVERED | `prof.valuer.valuation_date_max_age_months` |

---

## §3 Document Format and Transmission

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Primary draft format (Word / PDF) | COVERED | `format.primary_draft_format` |
| 2 | Comment / tracking format | COVERED | `format.comment_tracking_format` |
| 3 | Final Exchange submission format (iFile / XBRL) | COVERED | `format.final_submission_format` |
| 4 | Bilingual EN + TC requirement | COVERED | `format.bilingual_requirement` |
| 5 | Redline / blackline protocol | COVERED | `format.redline_protocol` |
| 6 | Clean version protocol | COVERED | `format.clean_version_protocol` |
| 7 | Version control convention | COVERED | `format.version_control_convention` |
| 8 | VDR vendor enum (Datasite / Intralinks / iDeals / Ansarada) | COVERED | `format.vdr_vendor` |
| 9 | Secure email / encryption protocol | COVERED | `format.secure_email_protocol` |
| 10 | Physical execution copies | COVERED | `format.physical_execution_copies` |

---

## §4 Information Flow and Timeline Anchors

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Kickoff 210 days before listing (LD-210) | COVERED | `flow.kickoff_offset_listing_days` |
| 2 | 20+ typical draft revisions | COVERED | `flow.typical_draft_revisions_min` |
| 3 | Bilingual typesetting required | COVERED | `flow.bilingual_typesetting_required` |
| 4 | Verification concurrent with drafting | COVERED | `flow.verification_drafting_concurrent` |
| 5 | Minimum DD rounds | COVERED | `flow.dd_rounds_min` |
| 6 | Printer typesetting offset | COVERED | `flow.printer_typesetting_offset_days` |

---

## §5 Gatekeeping Documents per Section

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Cover — underwriting agreement draft | COVERED | `gate.cover.underwriting_agreement_draft` |
| 2 | Business — sponsor DD memo | COVERED | `gate.business.sponsor_dd_memorandum` |
| 3 | Financial — accountants' report | COVERED | `gate.financial.accountants_report` |
| 4 | Risk Factors — risk matrix | COVERED | `gate.risk.risk_matrix` |
| 5 | Reg Overview — PRC regulatory opinion | COVERED | `gate.reg.prc_regulatory_opinion` |
| 6 | Industry — independent industry report | COVERED | `gate.industry.independent_industry_report` |
| 7 | Connected Transactions — CT memo | COVERED | `gate.connected.connected_transactions_memo` |
| 8 | VIE — VIE structure memo | COVERED | `gate.vie.vie_structure_memo` |

---

## §6 Regulatory Frameworks (new category)

| # | Report bullet | Status | Schema field id |
| --- | --- | --- | --- |
| 1 | Exchange Form M105 (sponsor appointment) | COVERED | `reg.form_M105` |
| 2 | Exchange Form M106 (independent sponsor declaration) | COVERED | `reg.form_M106` |
| 3 | Exchange Form M107 (declaration on filing) | COVERED | `reg.form_M107` |
| 4 | Exchange Form M108 (sponsor's undertaking) | COVERED | `reg.form_M108` |
| 5 | Exchange Guidance Letter GL21-10 | COVERED | `reg.GL21_10` |
| 6 | Exchange Guidance Letter GL55-13 | COVERED | `reg.GL55_13` |
| 7 | HK Sponsor Due Diligence Guidelines 3rd ed. (March 2020) | COVERED | `reg.sponsor_dd_guidelines_3rd_ed` |
| 8 | Exchange Listing Rules Ch. 7 / 8 / 11 / 19A | COVERED | `reg.listing_rules_chapters` |

---

## Agent2 wiring

Every schema field above is referenced by `prospectus_kg_output/inputs/input_schema_crosswalk.json`.
When Agent2 drafts section `X`, the writer prompt is enriched with the gating documents /
deliverables associated with that section; the `records/` fill status decides whether
`[[AI: DD evidence needed — <field_id>]]` tags are raised.
