"""
Deterministic builder for ``prospectus_kg_output/inputs/input_schema.json`` driven by the
English input report (``docs/IPO_Input_Report_EN.docx (1).pdf``).

Rationale
---------
The legacy Stage 3a path runs a 5+ minute Qwen inference against the Chinese
report and flattens the 12 sub-categories of §1 into a single bag, loses the
per-comfort-letter structure of §2, and does not cover §6 at all.  This builder
encodes the English Report's §1–§6 taxonomy directly so the schema round-trips
reliably and the downstream crosswalk / coverage report can depend on stable
``field_id``s.

Run::

    python -m scripts.prospectus_kg.build_input_schema_en \
        --out prospectus_kg_output/inputs/input_schema.json

The script is idempotent; rerunning it overwrites the file with the same
canonical JSON.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def _field(
    fid: str,
    name_en: str,
    *,
    type_: str = "string",
    description: str,
    required: bool = True,
    name_zh: str | None = None,
    example: Any | None = None,
    evidence_source: str | None = None,
    enum: list[str] | None = None,
    report_anchor: str | None = None,
) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "field_id": fid,
        "field_name": name_en,
        "type": type_,
        "description": description,
        "required": required,
    }
    if name_zh:
        entry["name_zh"] = name_zh
    if example is not None:
        entry["example"] = example
    if evidence_source:
        entry["evidence_source"] = evidence_source
    if enum:
        entry["enum"] = enum
    if report_anchor:
        entry["report_anchor"] = report_anchor
    return entry


# ---------------------------------------------------------------------------
# §1  Issuer materials (12 sub-categories)
# ---------------------------------------------------------------------------

_ISSUER_SUBCATEGORIES: list[dict[str, Any]] = [
    {
        "category_id": "issuer_materials.corporate_structure",
        "category_name": "Corporate Structure and Records",
        "name_zh": "公司架构与记录",
        "report_anchor": "§1.1",
        "fields": [
            _field("issuer.corp.certificate_of_incorporation", "Certificate of Incorporation",
                   name_zh="注册证书",
                   description="Original certificate evidencing the issuer's formation in its place of incorporation.",
                   evidence_source="Company registry filing",
                   report_anchor="§1.1"),
            _field("issuer.corp.business_registration", "Business Registration Certificate",
                   name_zh="商业登记证",
                   description="Business registration certificate issued by the local tax authority.",
                   evidence_source="Inland Revenue Department / equivalent",
                   report_anchor="§1.1"),
            _field("issuer.corp.articles_of_association", "Articles of Association (as amended)",
                   name_zh="公司章程",
                   description="Current articles including all amendments approved by shareholders.",
                   evidence_source="Company secretary",
                   report_anchor="§1.1"),
            _field("issuer.corp.statutory_books", "Statutory Books",
                   name_zh="法定簿册",
                   description="Registers of members, directors, secretaries, charges and minute books.",
                   report_anchor="§1.1"),
            _field("issuer.corp.board_minutes", "Board and Committee Minutes (3Y)",
                   type_="table",
                   name_zh="董事会纪要和决议",
                   description="Board, audit/remuneration/nomination committee minutes covering the track-record period.",
                   report_anchor="§1.1"),
            _field("issuer.corp.shareholder_register", "Register of Members",
                   name_zh="股东名册",
                   description="Current and historical register of shareholders.",
                   report_anchor="§1.1"),
            _field("issuer.corp.director_register", "Register of Directors",
                   name_zh="董事名册",
                   description="Current register of directors and company secretary.",
                   report_anchor="§1.1"),
            _field("issuer.corp.share_transfer_history", "Share Transfer History",
                   type_="table", name_zh="股权变动历史",
                   description="Complete record of share transfers, issuances, and reorganisations during the track-record period.",
                   report_anchor="§1.1"),
        ],
    },
    {
        "category_id": "issuer_materials.business",
        "category_name": "Business and Operations",
        "name_zh": "业务与运营",
        "report_anchor": "§1.2",
        "fields": [
            _field("issuer.biz.business_scope", "Principal Business Scope",
                   type_="text", name_zh="业务范围",
                   description="Description of the issuer's principal products and services as disclosed to regulators.",
                   report_anchor="§1.2"),
            _field("issuer.biz.business_model", "Business Model and Revenue Streams",
                   type_="text", name_zh="业务模式",
                   description="How the issuer generates revenue, including pricing, distribution, and go-to-market.",
                   report_anchor="§1.2"),
            _field("issuer.biz.major_products", "Major Products or Services",
                   type_="list", name_zh="主要产品或服务",
                   description="Itemised list of principal products/services with revenue contribution.",
                   report_anchor="§1.2"),
            _field("issuer.biz.supply_chain", "Supply Chain and Manufacturing Footprint",
                   type_="text", name_zh="供应链",
                   description="Key suppliers, manufacturing locations, and critical inputs.",
                   report_anchor="§1.2"),
            _field("issuer.biz.customer_contracts", "Material Customer Contracts",
                   type_="table", name_zh="重大客户合同",
                   description="Copies of contracts with the five largest customers and any customer exceeding 5% revenue.",
                   report_anchor="§1.2"),
            _field("issuer.biz.major_customers", "Top Five Customers (3Y)",
                   type_="table", name_zh="前五大客户",
                   description="Name, revenue, % of total, and length of relationship for each year.",
                   report_anchor="§1.2"),
            _field("issuer.biz.major_suppliers", "Top Five Suppliers (3Y)",
                   type_="table", name_zh="前五大供应商",
                   description="Name, spend, % of total, and length of relationship for each year.",
                   report_anchor="§1.2"),
            _field("issuer.biz.geographic_distribution", "Geographic Distribution of Revenue",
                   type_="table", name_zh="地域分布",
                   description="Revenue breakdown by geographic region across the track record.",
                   report_anchor="§1.2"),
        ],
    },
    {
        "category_id": "issuer_materials.financial",
        "category_name": "Financial Records",
        "name_zh": "财务记录",
        "report_anchor": "§1.3",
        "fields": [
            _field("issuer.fin.audited_accounts_3y", "Audited Consolidated Accounts (3 Years)",
                   type_="table", name_zh="三年审计账目",
                   description="Audited consolidated statements for the full track-record period.",
                   report_anchor="§1.3"),
            _field("issuer.fin.interim_financials", "Interim Financial Statements",
                   type_="table", name_zh="中期财务报表",
                   description="Most recent interim period reviewed by the reporting accountants.",
                   report_anchor="§1.3"),
            _field("issuer.fin.management_accounts", "Monthly Management Accounts",
                   type_="table", name_zh="月度管理账",
                   description="Monthly P&L/BS/CF used for stub-period cut-off testing.",
                   report_anchor="§1.3"),
            _field("issuer.fin.tax_returns", "Tax Returns (3Y)",
                   type_="table", name_zh="税务申报表",
                   description="Filed tax returns across the track-record period for each reporting entity.",
                   report_anchor="§1.3"),
            _field("issuer.fin.bank_statements", "Bank Statements and Facility Confirmations",
                   type_="list", name_zh="银行对账单与授信函",
                   description="Bank confirmations supporting the working capital and indebtedness statements.",
                   report_anchor="§1.3"),
            _field("issuer.fin.working_capital_model", "Working Capital Model",
                   type_="object", name_zh="营运资金模型",
                   description="12-month forward-looking working capital projection underpinning the sufficiency opinion.",
                   report_anchor="§1.3"),
            _field("issuer.fin.indebtedness_schedule", "Indebtedness Schedule",
                   type_="table", name_zh="负债明细表",
                   description="Schedule of all borrowings, guarantees and contingent liabilities at the latest practicable date.",
                   report_anchor="§1.3"),
            _field("issuer.fin.capex_plan", "Capital Expenditure Plan",
                   type_="table", name_zh="资本支出计划",
                   description="Planned capex over the forecast horizon, broken down by category.",
                   report_anchor="§1.3"),
            _field("issuer.fin.financial_projections", "Financial Projections / Forecast",
                   type_="table", name_zh="财务预测",
                   description="Projection model supporting any profit forecast disclosed in the prospectus.",
                   report_anchor="§1.3"),
            _field("issuer.fin.accounting_policies", "Significant Accounting Policies",
                   type_="text", name_zh="重要会计政策",
                   description="Summary of significant accounting policies, critical estimates and judgements.",
                   report_anchor="§1.3"),
        ],
    },
    {
        "category_id": "issuer_materials.directors_interests",
        "category_name": "Directors and Interests",
        "name_zh": "董事及权益",
        "report_anchor": "§1.4(a)",
        "fields": [
            _field("issuer.dir.director_cvs", "Director Curriculum Vitae",
                   type_="table", name_zh="董事履历",
                   description="CVs for every director, senior manager and key technical/operational personnel.",
                   report_anchor="§1.4(a)"),
            _field("issuer.dir.director_questionnaires", "Director Questionnaires (D&O)",
                   type_="list", name_zh="董事问卷",
                   description="Completed D&O questionnaires and supporting background evidence.",
                   report_anchor="§1.4(a)"),
            _field("issuer.dir.do_interests", "Directors' and Officers' Interests",
                   type_="table", name_zh="董事及高管权益",
                   description="Full disclosure of each director/officer's interests in shares, options and related entities.",
                   report_anchor="§1.4(a)"),
            _field("issuer.dir.related_party_transactions", "Related Party Transactions Register",
                   type_="table", name_zh="关联方交易",
                   description="Schedule of related-party transactions during the track-record period.",
                   report_anchor="§1.4(a)"),
            _field("issuer.dir.conflict_disclosures", "Conflict of Interest Disclosures",
                   type_="list", name_zh="利益冲突披露",
                   description="Signed conflict disclosures covering all competing businesses and outside directorships.",
                   report_anchor="§1.4(a)"),
            _field("issuer.dir.resignation_letters", "Resignation / Appointment Letters",
                   type_="list", name_zh="董事辞任/委任函",
                   description="Appointment and resignation letters for directors during the track-record period.",
                   report_anchor="§1.4(a)"),
        ],
    },
    {
        "category_id": "issuer_materials.intellectual_property",
        "category_name": "Intellectual Property",
        "name_zh": "知识产权",
        "report_anchor": "§1.4(b)",
        "fields": [
            _field("issuer.ip.patents", "Patent Register",
                   type_="table", name_zh="专利清单",
                   description="Granted and pending patents with territory, status, and expiry.",
                   report_anchor="§1.4(b)"),
            _field("issuer.ip.trademarks", "Trademark Register",
                   type_="table", name_zh="商标清单",
                   description="Registered and pending trademarks with class, territory and status.",
                   report_anchor="§1.4(b)"),
            _field("issuer.ip.copyrights", "Copyrighted Works",
                   type_="list", name_zh="版权作品",
                   description="Software, content and other copyrighted material owned or licensed by the group.",
                   report_anchor="§1.4(b)"),
            _field("issuer.ip.licensing_agreements", "IP Licensing Agreements",
                   type_="table", name_zh="知识产权许可协议",
                   description="In-licences and out-licences of material intellectual property.",
                   report_anchor="§1.4(b)"),
            _field("issuer.ip.ip_disputes", "IP Disputes and Litigation",
                   type_="list", name_zh="知识产权纠纷",
                   description="Any pending or threatened IP litigation, oppositions or customs seizures.",
                   report_anchor="§1.4(b)"),
        ],
    },
    {
        "category_id": "issuer_materials.property",
        "category_name": "Property and Premises",
        "name_zh": "物业与场地",
        "report_anchor": "§1.4(c)",
        "fields": [
            _field("issuer.prop.property_list", "Property Register",
                   type_="table", name_zh="物业清单",
                   description="All owned and leased properties with address, use, area, and status.",
                   report_anchor="§1.4(c)"),
            _field("issuer.prop.title_deeds", "Title Deeds and Land-Use Rights",
                   type_="list", name_zh="物业所有权/土地使用权证",
                   description="Title deeds, land-use rights certificates and real-estate registration.",
                   report_anchor="§1.4(c)"),
            _field("issuer.prop.leases", "Lease Agreements",
                   type_="table", name_zh="租赁合同",
                   description="All material leases for the group's operating premises.",
                   report_anchor="§1.4(c)"),
            _field("issuer.prop.valuation_reports", "Property Valuation Report(s)",
                   type_="list", name_zh="物业估值报告",
                   description="Valuation report prepared by an independent qualified valuer (required where §2 trigger applies).",
                   report_anchor="§1.4(c)"),
            _field("issuer.prop.occupancy_permits", "Occupancy / Construction Permits",
                   type_="list", name_zh="入伙纸/建筑许可证",
                   description="Occupancy permits and construction completion certificates.",
                   report_anchor="§1.4(c)"),
            _field("issuer.prop.environmental_compliance", "Environmental Compliance Documents",
                   type_="list", name_zh="环保合规文件",
                   description="Environmental impact assessments, permits and regulator correspondence.",
                   report_anchor="§1.4(c)"),
        ],
    },
    {
        "category_id": "issuer_materials.litigation",
        "category_name": "Litigation and Regulatory Correspondence",
        "name_zh": "诉讼及监管函件",
        "report_anchor": "§1.4(d)",
        "fields": [
            _field("issuer.lit.ongoing_litigation", "Ongoing Litigation Register",
                   type_="table", name_zh="在审诉讼",
                   description="Material pending litigation or arbitration the group is involved in.",
                   report_anchor="§1.4(d)"),
            _field("issuer.lit.historical_litigation", "Historical Litigation (3Y)",
                   type_="table", name_zh="历史诉讼",
                   description="Concluded litigation during the track-record period with outcome and impact.",
                   report_anchor="§1.4(d)"),
            _field("issuer.lit.regulatory_inquiries", "Regulatory Inquiries and Investigations",
                   type_="list", name_zh="监管查询及调查",
                   description="Any open inquiries, investigations or enforcement actions from regulators.",
                   report_anchor="§1.4(d)"),
            _field("issuer.lit.investigation_letters", "Investigation Correspondence",
                   type_="list", name_zh="调查函件",
                   description="Letters exchanged with regulators during investigations.",
                   report_anchor="§1.4(d)"),
            _field("issuer.lit.settlement_agreements", "Settlement Agreements",
                   type_="list", name_zh="和解协议",
                   description="Material settlement agreements arising from disputes or investigations.",
                   report_anchor="§1.4(d)"),
        ],
    },
    {
        "category_id": "issuer_materials.employment",
        "category_name": "Employment and Human Resources",
        "name_zh": "雇佣与人力资源",
        "report_anchor": "§1.4(e)",
        "fields": [
            _field("issuer.hr.employee_count", "Employee Headcount (3Y)",
                   type_="table", name_zh="员工总数",
                   description="Total employees by function/region at each period-end over the track record.",
                   report_anchor="§1.4(e)"),
            _field("issuer.hr.key_contracts", "Key Employee Contracts",
                   type_="list", name_zh="关键员工合同",
                   description="Service agreements for directors and senior management, including notice and non-compete terms.",
                   report_anchor="§1.4(e)"),
            _field("issuer.hr.pension_arrangements", "Pension Arrangements",
                   type_="text", name_zh="退休金安排",
                   description="MPF / pension scheme structure and contribution rates.",
                   report_anchor="§1.4(e)"),
            _field("issuer.hr.labor_disputes", "Labor Disputes and Unionisation",
                   type_="list", name_zh="劳动纠纷",
                   description="Any material labor disputes, collective bargaining or industrial action.",
                   report_anchor="§1.4(e)"),
            _field("issuer.hr.share_option_scheme", "Share Option / Incentive Schemes",
                   type_="object", name_zh="股份奖励计划",
                   description="Terms of pre-IPO and post-IPO share option / RSU schemes.",
                   report_anchor="§1.4(e)"),
            _field("issuer.hr.employment_policies", "Employment Policies and Handbook",
                   type_="text", name_zh="雇佣政策",
                   description="Employment policies, code of conduct and related procedures.",
                   report_anchor="§1.4(e)"),
        ],
    },
    {
        "category_id": "issuer_materials.insurance",
        "category_name": "Insurance",
        "name_zh": "保险",
        "report_anchor": "§1.4(f)",
        "fields": [
            _field("issuer.ins.policy_list", "Insurance Policy Register",
                   type_="table", name_zh="保单清单",
                   description="List of all material insurance policies carried by the group.",
                   report_anchor="§1.4(f)"),
            _field("issuer.ins.coverage_summary", "Coverage Summary",
                   type_="text", name_zh="保障范围摘要",
                   description="Summary of insured risks, coverage limits and deductibles.",
                   report_anchor="§1.4(f)"),
            _field("issuer.ins.claims_history", "Claims History (3Y)",
                   type_="table", name_zh="索赔记录",
                   description="Insurance claims made and paid during the track-record period.",
                   report_anchor="§1.4(f)"),
            _field("issuer.ins.adequacy_assessment", "Adequacy Assessment",
                   type_="text", name_zh="充足性评估",
                   description="Directors' / sponsor's assessment that cover is adequate for the business.",
                   report_anchor="§1.4(f)"),
        ],
    },
    {
        "category_id": "issuer_materials.regulatory_compliance",
        "category_name": "Regulatory Compliance",
        "name_zh": "监管合规",
        "report_anchor": "§1.4(g)",
        "fields": [
            _field("issuer.reg.licenses_held", "Licenses and Permits Register",
                   type_="table", name_zh="持牌清单",
                   description="All material operating licences and permits, with issuing authority and expiry.",
                   report_anchor="§1.4(g)"),
            _field("issuer.reg.compliance_policies", "Compliance Policies",
                   type_="list", name_zh="合规政策",
                   description="Key compliance policies (AML, sanctions, anti-competition, etc.).",
                   report_anchor="§1.4(g)"),
            _field("issuer.reg.prc_regulatory_letters", "PRC Regulatory Correspondence",
                   type_="list", name_zh="中国监管函件",
                   description="Correspondence with PRC regulators (CSRC, CAC, MIIT, etc.) where applicable.",
                   report_anchor="§1.4(g)"),
            _field("issuer.reg.breaches_remediation", "Breaches and Remediation",
                   type_="list", name_zh="违规及整改",
                   description="Historical compliance breaches during the track-record period and remediation steps.",
                   report_anchor="§1.4(g)"),
            _field("issuer.reg.anti_corruption_policy", "Anti-Corruption / Anti-Bribery Policy",
                   type_="text", name_zh="反贪污政策",
                   description="Anti-corruption policy, training records and whistle-blowing channels.",
                   report_anchor="§1.4(g)"),
            _field("issuer.reg.data_privacy_compliance", "Data Privacy and Cybersecurity Compliance",
                   type_="text", name_zh="数据合规",
                   description="Compliance with PDPO, PIPL, GDPR or equivalent data-privacy laws.",
                   report_anchor="§1.4(g)"),
        ],
    },
    {
        "category_id": "issuer_materials.tax",
        "category_name": "Tax",
        "name_zh": "税务",
        "report_anchor": "§1.4(h)",
        "fields": [
            _field("issuer.tax.residency", "Tax Residency Status",
                   type_="text", name_zh="税务居民身份",
                   description="Tax residency of each group entity.",
                   report_anchor="§1.4(h)"),
            _field("issuer.tax.clearances", "Tax Clearance Certificates",
                   type_="list", name_zh="税务清缴证明",
                   description="Tax clearance certificates where obtained.",
                   report_anchor="§1.4(h)"),
            _field("issuer.tax.disputes", "Unresolved Tax Disputes",
                   type_="list", name_zh="未决税务争议",
                   description="Open tax audits or disputes at the latest practicable date.",
                   report_anchor="§1.4(h)"),
            _field("issuer.tax.transfer_pricing", "Transfer Pricing Documentation",
                   type_="list", name_zh="转让定价文件",
                   description="Contemporaneous transfer pricing documentation for material inter-company flows.",
                   report_anchor="§1.4(h)"),
        ],
    },
    {
        "category_id": "issuer_materials.information_technology",
        "category_name": "Information Technology",
        "name_zh": "信息技术",
        "report_anchor": "§1.4(i)",
        "fields": [
            _field("issuer.it.core_systems", "Core IT Systems Inventory",
                   type_="list", name_zh="核心系统清单",
                   description="Key ERP, CRM, MES and e-commerce systems that support the business.",
                   report_anchor="§1.4(i)"),
            _field("issuer.it.data_security_policy", "Data Security Policy",
                   type_="text", name_zh="数据安全政策",
                   description="Information-security policy, access controls and incident-response procedures.",
                   report_anchor="§1.4(i)"),
            _field("issuer.it.cyber_incidents", "Cybersecurity Incident History (3Y)",
                   type_="list", name_zh="网络安全事件",
                   description="Material cybersecurity incidents during the track-record period.",
                   report_anchor="§1.4(i)"),
            _field("issuer.it.infrastructure", "IT Infrastructure and Hosting",
                   type_="text", name_zh="IT基础设施",
                   description="Data-centre locations, cloud providers and hosting model.",
                   report_anchor="§1.4(i)"),
            _field("issuer.it.outsourcing_contracts", "IT Outsourcing Contracts",
                   type_="list", name_zh="IT外包合同",
                   description="Material outsourcing contracts for IT services and SaaS providers.",
                   report_anchor="§1.4(i)"),
        ],
    },
]


# ---------------------------------------------------------------------------
# §2  Professional deliverables (sponsor / reporting accountants / legal / valuer)
# ---------------------------------------------------------------------------

_COMFORT_LETTER_TYPES = [
    "accountants_report_long_form",
    "comfort_letter_fis",
    "comfort_letter_interim",
    "comfort_letter_subsequent_events",
    "comfort_letter_management_discussion",
]

_PROFESSIONAL_DELIVERABLES: dict[str, Any] = {
    "category_id": "professional_deliverables",
    "category_name": "Professional Party Deliverables",
    "name_zh": "专业方交付物",
    "report_anchor": "§2",
    "description": "Deliverables produced by the sponsor, reporting accountants, legal counsel and property valuer.",
    "fields": [
        # --- Sponsor ----------------------------------------------------
        _field("prof.sponsor.form_M107", "Form M107 (Sponsor's Declaration)",
               name_zh="保荐人声明 M107",
               description="Sponsor's declaration of independence and compliance submitted to HKEX.",
               evidence_source="Sponsor to HKEX",
               report_anchor="§2 / §6"),
        _field("prof.sponsor.form_M108", "Form M108 (Sponsor's Undertaking)",
               name_zh="保荐人承诺 M108",
               description="Sponsor's undertaking to HKEX regarding continuing obligations.",
               evidence_source="Sponsor to HKEX",
               report_anchor="§2 / §6"),
        _field("prof.sponsor.dd_memorandum", "Sponsor Due Diligence Memorandum",
               type_="text", name_zh="保荐人尽调备忘录",
               description="Consolidated due-diligence memorandum documenting business, legal, financial and operational DD.",
               report_anchor="§2"),
        _field("prof.sponsor.dd_workpapers", "Sponsor DD Workpapers",
               type_="list", name_zh="保荐人尽调工作底稿",
               description="Indexed workpapers evidencing DD meetings, site visits, interviews and searches.",
               report_anchor="§2"),
        _field("prof.sponsor.track_record_analysis", "Track-Record Period Analysis",
               type_="text", name_zh="业绩记录期分析",
               description="Analysis of the track-record period including management representations and sample testing.",
               report_anchor="§2"),
        # --- Reporting accountants -------------------------------------
        _field("prof.ra.accountants_report", "Accountants' Report (Long-Form)",
               type_="text", name_zh="会计师报告",
               description="Full accountants' report on historical financial information under HKEX App 1A.",
               report_anchor="§2"),
        _field("prof.ra.working_capital_opinion", "Working Capital Sufficiency Opinion",
               name_zh="营运资金充足性意见",
               description="Accountants' opinion on the adequacy of working capital for at least 12 months.",
               report_anchor="§2"),
        _field("prof.ra.indebtedness_statement", "Indebtedness Statement",
               name_zh="负债声明",
               description="Statement of indebtedness at the latest practicable date for the prospectus.",
               report_anchor="§2"),
        _field("prof.ra.profit_forecast_memo", "Profit Forecast Memorandum",
               name_zh="盈利预测备忘录",
               description="Accountants' examination of any profit forecast included in the prospectus.",
               required=False, report_anchor="§2"),
        _field("prof.ra.comfort_letters", "Comfort Letters (5 Types)",
               type_="list", name_zh="安慰函（5类）",
               description="Comfort letters covering the long-form report, FIS, interim period, subsequent events and MD&A.",
               enum=_COMFORT_LETTER_TYPES,
               report_anchor="§2"),
        _field("prof.ra.comfort_letter_accountants_report_long_form", "Comfort Letter — Long-Form Accountants' Report",
               description="Comfort letter supporting the long-form historical financial information.",
               report_anchor="§2"),
        _field("prof.ra.comfort_letter_fis", "Comfort Letter — Financial Information Statement (FIS)",
               description="Comfort letter on the FIS cut-off, reconciliation and agreed-upon procedures.",
               report_anchor="§2"),
        _field("prof.ra.comfort_letter_interim", "Comfort Letter — Interim Period",
               description="Comfort letter covering the most recent reviewed interim period.",
               report_anchor="§2"),
        _field("prof.ra.comfort_letter_subsequent_events", "Comfort Letter — Subsequent Events (Bring-Down)",
               description="Bring-down comfort letter issued close to pricing on subsequent events.",
               report_anchor="§2"),
        _field("prof.ra.comfort_letter_management_discussion", "Comfort Letter — MD&A / Management Discussion",
               description="Comfort letter on figures circled in the Management Discussion & Analysis.",
               report_anchor="§2"),
        # --- Legal counsel (4 parties) ---------------------------------
        _field("prof.legal.hk.corporate_opinion", "HK Counsel — Corporate Legal Opinion",
               name_zh="香港法律意见（公司）",
               description="HK counsel opinion on the due incorporation, good standing and corporate approvals.",
               report_anchor="§2"),
        _field("prof.legal.hk.litigation_opinion", "HK Counsel — Litigation Opinion",
               name_zh="香港法律意见（诉讼）",
               description="HK counsel opinion confirming the absence of material undisclosed litigation in HK.",
               report_anchor="§2"),
        _field("prof.legal.hk.verification_notes", "HK Counsel — Verification Notes",
               type_="list", name_zh="核证笔记",
               description="Verification notes evidencing every material statement in the prospectus.",
               report_anchor="§2"),
        _field("prof.legal.offshore.incorporation_opinion", "Cayman / Bermuda Counsel — Incorporation Opinion",
               name_zh="开曼/百慕大法律意见",
               description="Counsel opinion on incorporation and capacity of the Cayman/Bermuda parent.",
               report_anchor="§2"),
        _field("prof.legal.prc.regulatory_opinion", "PRC Counsel — Regulatory Opinion",
               name_zh="中国法律意见（监管）",
               description="PRC counsel opinion on regulatory compliance, CSRC filing and industry approvals.",
               report_anchor="§2"),
        _field("prof.legal.prc.license_opinion", "PRC Counsel — License Opinion",
               name_zh="中国法律意见（许可证）",
               description="PRC counsel opinion on validity of operating licences held by group entities.",
               report_anchor="§2"),
        _field("prof.legal.prc.wfoe_vie_opinion", "PRC Counsel — WFOE / VIE Opinion",
               name_zh="中国法律意见（VIE/WFOE）",
               description="PRC counsel opinion on legality and enforceability of contractual / VIE arrangements.",
               required=False, report_anchor="§2"),
        _field("prof.legal.sponsor_counsel.disclosure_opinion", "Sponsor's / Underwriters' Counsel — Disclosure Opinion",
               name_zh="保荐人/包销商律师披露意见",
               description="Counsel opinion on completeness and accuracy of prospectus disclosure.",
               report_anchor="§2"),
        _field("prof.legal.sponsor_counsel.10b5_letter", "Sponsor's Counsel — 10b-5 Disclosure Letter",
               name_zh="10b-5披露函",
               description="Rule 10b-5 disclosure letter on US securities-law disclosure where a US tranche exists.",
               required=False, report_anchor="§2"),
        # --- Property valuer -------------------------------------------
        _field("prof.valuer.qualification", "Property Valuer Qualification",
               name_zh="估值师资质",
               description="Qualification of the independent valuer.",
               enum=["RICS", "HKIS", "RICS+HKIS"],
               report_anchor="§2"),
        _field("prof.valuer.valuation_report", "Property Valuation Report",
               type_="text", name_zh="物业估值报告",
               description="Independent valuation report prepared by a qualified valuer.",
               required=False, report_anchor="§2"),
        _field("prof.valuer.trigger_threshold_pct", "Valuation Trigger Threshold (% of Total Assets)",
               type_="number", name_zh="估值触发阈值",
               description="Threshold above which an independent property valuation report is required.",
               example=15, report_anchor="§2"),
        _field("prof.valuer.valuation_date_max_age_months", "Valuation Date — Max Age (Months)",
               type_="number", name_zh="估值日期最大账龄",
               description="Maximum permitted age of the valuation date relative to prospectus date.",
               example=3, report_anchor="§2"),
    ],
}


# ---------------------------------------------------------------------------
# §3  Document format and transmission
# ---------------------------------------------------------------------------

_DOC_FORMAT: dict[str, Any] = {
    "category_id": "document_format_and_transmission",
    "category_name": "Document Format and Transmission",
    "name_zh": "格式与流转",
    "report_anchor": "§3",
    "fields": [
        _field("format.primary_draft_format", "Primary Draft Format",
               description="Primary format used to circulate working drafts.",
               enum=["Word", "PDF"], example="Word", report_anchor="§3"),
        _field("format.comment_tracking_format", "Comment / Tracking Format",
               description="Format used for tracked-changes / consolidated comments.",
               enum=["PDF_markup", "Word_track_changes"], example="Word_track_changes", report_anchor="§3"),
        _field("format.final_submission_format", "Final HKEX Submission Format",
               description="Format required for the final HKEX submission.",
               enum=["HKEX_iFile_XBRL", "PDF"], example="HKEX_iFile_XBRL", report_anchor="§3"),
        _field("format.bilingual_requirement", "Bilingual Requirement (EN + TC)",
               type_="boolean", description="Whether both English and Traditional Chinese versions must be filed.",
               example=True, report_anchor="§3"),
        _field("format.redline_protocol", "Redline / Blackline Protocol",
               type_="text", description="How redlines are generated, distributed and consolidated between rounds.",
               report_anchor="§3"),
        _field("format.clean_version_protocol", "Clean Version Protocol",
               type_="text", description="How clean versions are prepared and numbered for HKEX submission.",
               report_anchor="§3"),
        _field("format.version_control_convention", "Version Control Convention",
               type_="text", description="File-naming and versioning convention (e.g. v0.1, v1.0).",
               report_anchor="§3"),
        _field("format.vdr_vendor", "Virtual Data Room Vendor",
               description="Approved VDR vendor for DD materials.",
               enum=["Datasite", "Intralinks", "iDeals", "Ansarada"], example="Datasite",
               report_anchor="§3"),
        _field("format.secure_email_protocol", "Secure Email / Encryption Protocol",
               type_="text", description="Encryption / password protocol for email transmission of sensitive drafts.",
               report_anchor="§3"),
        _field("format.physical_execution_copies", "Physical Execution / Signing Copies",
               type_="text", description="How physical signature copies are coordinated across counterparties.",
               required=False, report_anchor="§3"),
    ],
}


# ---------------------------------------------------------------------------
# §4  Information flow and operational anchors
# ---------------------------------------------------------------------------

_INFO_FLOW: dict[str, Any] = {
    "category_id": "information_flow_path",
    "category_name": "Information Flow and Timeline Anchors",
    "name_zh": "信息流路径",
    "report_anchor": "§4",
    "fields": [
        _field("flow.kickoff_offset_listing_days", "Kickoff Offset (Days Before Listing)",
               type_="number",
               description="Typical offset, in calendar days, of the all-hands kickoff relative to the target listing date.",
               example=-210, report_anchor="§4"),
        _field("flow.typical_draft_revisions_min", "Minimum Typical Draft Revisions",
               type_="number",
               description="Empirical minimum number of full prospectus-draft revisions across the deal lifecycle.",
               example=20, report_anchor="§4"),
        _field("flow.bilingual_typesetting_required", "Bilingual Typesetting Required",
               type_="boolean",
               description="Whether printer must typeset English and Chinese versions in parallel.",
               example=True, report_anchor="§4"),
        _field("flow.verification_drafting_concurrent", "Verification Runs Concurrently With Drafting",
               type_="boolean",
               description="Whether the verification workstream runs concurrently with drafting (vs. sequentially).",
               example=True, report_anchor="§4"),
        _field("flow.dd_rounds_min", "Minimum Due Diligence Rounds",
               type_="number",
               description="Expected minimum number of formal DD rounds (business / legal / financial).",
               example=3, report_anchor="§4"),
        _field("flow.printer_typesetting_offset_days", "Printer Typesetting Offset (Days Before PHIP)",
               type_="number",
               description="Typical buffer between first printer typesetting round and PHIP filing.",
               example=-14, report_anchor="§4"),
    ],
}


# ---------------------------------------------------------------------------
# §5  Gatekeeping documents per section
# ---------------------------------------------------------------------------

_GATEKEEPING: dict[str, Any] = {
    "category_id": "gatekeeping_documents",
    "category_name": "Gatekeeping Documents (per Section)",
    "name_zh": "门控文件",
    "report_anchor": "§5",
    "description": "Per-section gating documents that must be in the VDR before the corresponding prospectus section can be drafted.",
    "fields": [
        _field("gate.cover.underwriting_agreement_draft", "Underwriting Agreement (Draft)",
               description="Signed draft supporting the Cover and Parties Involved sections.",
               report_anchor="§5"),
        _field("gate.business.sponsor_dd_memorandum", "Sponsor DD Memorandum (Business)",
               description="Business-DD memorandum underpinning the Business section disclosures.",
               report_anchor="§5"),
        _field("gate.financial.accountants_report", "Accountants' Report (Financial)",
               description="Long-form accountants' report underpinning the Financial Information section.",
               report_anchor="§5"),
        _field("gate.risk.risk_matrix", "Risk Matrix Workbook",
               description="Sponsor-maintained risk matrix feeding the Risk Factors section.",
               report_anchor="§5"),
        _field("gate.reg.prc_regulatory_opinion", "PRC Regulatory Opinion (Reg Overview)",
               description="PRC counsel regulatory opinion underpinning the Regulatory Overview section.",
               report_anchor="§5"),
        _field("gate.industry.independent_industry_report", "Independent Industry Consultant Report",
               description="Independent industry report underpinning the Industry Overview section.",
               report_anchor="§5"),
        _field("gate.connected.connected_transactions_memo", "Connected Transactions Memorandum",
               description="Memo covering continuing connected transactions and waivers.",
               report_anchor="§5"),
        _field("gate.vie.vie_structure_memo", "VIE Structure Memorandum",
               description="Memo describing the VIE / contractual arrangements, underpinning the VIE section.",
               report_anchor="§5"),
    ],
}


# ---------------------------------------------------------------------------
# §6  Regulatory frameworks (NEW)
# ---------------------------------------------------------------------------

_REGULATORY_FRAMEWORKS: dict[str, Any] = {
    "category_id": "regulatory_frameworks",
    "category_name": "Regulatory Frameworks",
    "name_zh": "监管框架",
    "report_anchor": "§6",
    "description": "HKEX regulatory instruments and SFC guidelines that govern prospectus production. Every field records whether the issuer / sponsor has evidenced compliance.",
    "fields": [
        _field("reg.form_M105", "HKEX Form M105 (Sponsor Appointment)",
               description="Formal sponsor appointment filing with HKEX.",
               evidence_source="Sponsor to HKEX",
               report_anchor="§6"),
        _field("reg.form_M106", "HKEX Form M106 (Independent Sponsor Declaration)",
               description="Independent sponsor declaration (where applicable).",
               required=False, evidence_source="Sponsor to HKEX",
               report_anchor="§6"),
        _field("reg.form_M107", "HKEX Form M107 (Sponsor's Declaration on Filing)",
               description="Sponsor's declaration accompanying the A1 filing.",
               evidence_source="Sponsor to HKEX",
               report_anchor="§6"),
        _field("reg.form_M108", "HKEX Form M108 (Sponsor's Undertaking)",
               description="Sponsor's undertaking of continuing obligations.",
               evidence_source="Sponsor to HKEX",
               report_anchor="§6"),
        _field("reg.GL21_10", "HKEX Guidance Letter GL21-10",
               description="HKEX guidance on financial-information disclosure.",
               evidence_source="HKEX GL21-10",
               report_anchor="§6"),
        _field("reg.GL55_13", "HKEX Guidance Letter GL55-13",
               description="HKEX guidance on Waivers and Exemptions disclosure.",
               evidence_source="HKEX GL55-13",
               report_anchor="§6"),
        _field("reg.sponsor_dd_guidelines_3rd_ed", "HK Sponsor Due Diligence Guidelines (3rd Ed., March 2020)",
               type_="text",
               description="SFC/HKEX Due Diligence Guidelines 3rd edition, March 2020 — required reference standard.",
               report_anchor="§6"),
        _field("reg.listing_rules_chapters", "Applicable HKEX Listing Rules Chapters",
               type_="list",
               description="Chapters of the HKEX Listing Rules governing the listing (typically Ch. 7, 8, 11, 19A).",
               example=["Ch. 7", "Ch. 8", "Ch. 11", "Ch. 19A"],
               report_anchor="§6"),
    ],
}


def build_schema() -> dict[str, Any]:
    issuer_fields: list[dict[str, Any]] = []
    for sub in _ISSUER_SUBCATEGORIES:
        issuer_fields.extend(sub["fields"])
    issuer_bundle: dict[str, Any] = {
        "category_id": "issuer_materials",
        "category_name": "Issuer-Supplied Materials",
        "name_zh": "发行人必须提供的材料",
        "report_anchor": "§1",
        "description": (
            "Materials the issuer must deliver to sponsors and reporting accountants. "
            "Organised into 12 sub-categories that mirror Report §1.1–§1.4(i)."
        ),
        "sub_categories": [
            {
                "category_id": sub["category_id"],
                "category_name": sub["category_name"],
                "name_zh": sub["name_zh"],
                "report_anchor": sub["report_anchor"],
                "fields": sub["fields"],
            }
            for sub in _ISSUER_SUBCATEGORIES
        ],
        "fields": issuer_fields,
    }

    schema: dict[str, Any] = {
        "language": "en",
        "source_document": "docs/IPO_Input_Report_EN.docx (1).pdf",
        "schema_version": "2.0",
        "schema_name": "IPO Input Report — English — Schema A",
        "description": (
            "Structured input schema for HKEX prospectus drafting, derived from the "
            "English IPO Input Report. Top-level categories mirror Report §1–§6; §1 is "
            "further broken into 12 sub-categories matching §1.1–§1.4(i)."
        ),
        "categories": [
            issuer_bundle,
            _PROFESSIONAL_DELIVERABLES,
            _DOC_FORMAT,
            _INFO_FLOW,
            _GATEKEEPING,
            _REGULATORY_FRAMEWORKS,
        ],
    }

    field_count = sum(len(cat.get("fields") or []) for cat in schema["categories"])
    schema["field_count"] = field_count
    schema["category_count"] = len(schema["categories"])
    return schema


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--out",
        type=Path,
        default=Path("prospectus_kg_output/inputs/input_schema.json"),
    )
    args = ap.parse_args()

    schema = build_schema()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "written": str(args.out),
                "categories": schema["category_count"],
                "fields": schema["field_count"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
