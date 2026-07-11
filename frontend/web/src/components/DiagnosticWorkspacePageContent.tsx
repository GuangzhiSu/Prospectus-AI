"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";
type InputMode = "structured" | "documents";
type BooleanInput = "unknown" | "yes" | "no";
type Status = "PASS" | "SHORTFALL" | "MISSING_INPUT" | "DEFERRED_REVIEW";

type ProfileValues = {
  issuerName: string;
  latestProfit: string;
  precedingTwoYearProfit: string;
  trackRecordProfit: string;
  latestRevenue: string;
  marketCap: string;
  operatingCashflow: string;
  managementContinuityYears: string;
  ownershipContinuity: BooleanInput;
  wvrBeneficiaryOwnership: string;
};

type FieldKey = Exclude<keyof ProfileValues, "issuerName" | "ownershipContinuity">;

type Check = {
  label: string;
  ruleRef: string;
  status: Status;
  detail: string;
};

type Gate = {
  title: string;
  ruleRef: string;
  status: Status;
  note: string;
  checks: Check[];
};

const copy = {
  en: {
    navTitle: "IPO Diagnostic Workspace",
    title: "CompanyProfile intake and gap scorecard",
    subtitle: "A separate workspace for listing diagnostics. The drafting workspace remains a different product.",
    structured: "Structured fields",
    documents: "Documents",
    extractionQueued: "AI extraction pending",
    extractionReady: "Ready for Agent1 extraction",
    fieldsTitle: "Resolved CompanyProfile fields",
    documentsTitle: "Issuer materials",
    documentHint: "Selected files stay local in this browser session on the public site.",
    reportTitle: "Diagnostic report preview",
    profileTitle: "CompanyProfile preview",
    pathwayTitle: "Pathway checks",
    softTitle: "Soft-signal queue",
    mainWorkspace: "Open drafting workspace",
    diagnosticPage: "Diagnostic architecture",
    noVerdict: "No listing verdict",
    noAiHard: "Hard rules: no AI",
    aiWhereNeeded: "AI only before/after hard comparison",
    uploadButton: "Select files",
    issuerName: "Issuer name",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    missing: "Missing input",
    counts: "Status counts",
    confirmed: "confirmed",
    notConfirmed: "not confirmed",
    wvrMarketCheck: "Expected market capitalisation for WVR applicant",
    ch18cCheck: "Commercial / pre-commercial pathway",
    ch18cDetail: "requires profile dates, specialist-tech facts, and soft review",
    gateTitles: {
      profit: "Main Board profit test",
      marketRevenueCashflow: "Main Board market cap / revenue / cash flow",
      marketRevenue: "Main Board market cap / revenue",
      continuity: "Management and ownership continuity",
      wvr: "Chapter 8A WVR quantitative subset",
      ch18c: "Chapter 18C specialist technology",
    },
    notes: {
      hard: "Hard threshold path",
      profile: "CompanyProfile fields",
      wvr: "Soft WVR character checks remain outside the hard engine",
      ch18c: "Modeled ruleset; no fixture-driven web scoring in this phase",
    },
    fields: {
      latestProfit: "Latest-year profit attributable to owners",
      precedingTwoYearProfit: "Aggregate profit, two preceding years",
      trackRecordProfit: "Aggregate profit, track record period",
      latestRevenue: "Latest audited-year revenue",
      marketCap: "Expected market capitalisation at listing",
      operatingCashflow: "Aggregate operating cash flow, track record period",
      managementContinuityYears: "Management continuity",
      ownershipContinuity: "Ownership continuity and control",
      wvrBeneficiaryOwnership: "WVR beneficiaries' economic interest",
    },
    units: {
      hkdM: "HKD million",
      years: "financial years",
      pct: "%",
    },
    modeNotes: {
      structured: "Manual values flow directly into CompanyProfile; the hard engine compares thresholds without LLM judgment.",
      documents: "Files would go through Agent1 + LLM extraction first, then land in the same CompanyProfile fields.",
    },
    softSignals: [
      "Customer concentration",
      "Supplier concentration",
      "Connected transactions independence",
      "Competing business",
      "Financial internal controls",
      "Equity / WVR / pre-IPO clarity",
      "Shell-company pattern",
    ],
  },
  zh: {
    navTitle: "上市诊断工作台",
    title: "CompanyProfile 录入与缺口诊断",
    subtitle: "这是上市诊断自己的工作台；招股书起草工作区是另一个产品。",
    structured: "结构化字段",
    documents: "上传材料",
    extractionQueued: "待 AI 抽取",
    extractionReady: "已进入 Agent1 抽取队列",
    fieldsTitle: "已解析的 CompanyProfile 字段",
    documentsTitle: "发行人材料",
    documentHint: "公开站点中选择的文件只保留在当前浏览器会话。",
    reportTitle: "诊断报告预览",
    profileTitle: "CompanyProfile 预览",
    pathwayTitle: "路径检查",
    softTitle: "软信号队列",
    mainWorkspace: "打开起草工作区",
    diagnosticPage: "诊断架构页",
    noVerdict: "不输出上市裁决",
    noAiHard: "硬规则不用 AI",
    aiWhereNeeded: "AI 只用于硬比较前后",
    uploadButton: "选择文件",
    issuerName: "发行人名称",
    unknown: "未知",
    yes: "是",
    no: "否",
    missing: "缺少输入",
    counts: "状态统计",
    confirmed: "已确认",
    notConfirmed: "未确认",
    wvrMarketCheck: "WVR 申请人预计上市市值",
    ch18cCheck: "商业化 / 未商业化路径",
    ch18cDetail: "需要档案日期、特专科技事实和软信号复核",
    gateTitles: {
      profit: "主板盈利测试",
      marketRevenueCashflow: "主板市值 / 收入 / 现金流测试",
      marketRevenue: "主板市值 / 收入测试",
      continuity: "管理层及拥有权持续性",
      wvr: "第 8A 章 WVR 量化子集",
      ch18c: "第 18C 章特专科技公司",
    },
    notes: {
      hard: "硬阈值路径",
      profile: "CompanyProfile 字段",
      wvr: "WVR 公司特质等软条件不由硬引擎判定",
      ch18c: "规则集已建模；当前网页阶段不做 fixture 驱动评分",
    },
    fields: {
      latestProfit: "最近一年归母利润",
      precedingTwoYearProfit: "前两年累计归母利润",
      trackRecordProfit: "业绩记录期累计归母利润",
      latestRevenue: "最近一个经审计年度收入",
      marketCap: "预计上市市值",
      operatingCashflow: "业绩记录期累计经营现金流",
      managementContinuityYears: "管理层持续性",
      ownershipContinuity: "拥有权和控制权持续性",
      wvrBeneficiaryOwnership: "WVR 受益人经济权益比例",
    },
    units: {
      hkdM: "百万港元",
      years: "个财政年度",
      pct: "%",
    },
    modeNotes: {
      structured: "手填数值直接进入 CompanyProfile；硬规则引擎只做确定性阈值比较，不让 LLM 判定。",
      documents: "文件应先经过 Agent1 + LLM 抽取，再落入同一组 CompanyProfile 字段。",
    },
    softSignals: [
      "客户集中度",
      "供应商集中度",
      "关联交易独立性",
      "同业竞争",
      "财务内控",
      "股权 / WVR / pre-IPO 清晰度",
      "壳公司模式",
    ],
  },
} satisfies Record<Locale, {
  navTitle: string;
  title: string;
  subtitle: string;
  structured: string;
  documents: string;
  extractionQueued: string;
  extractionReady: string;
  fieldsTitle: string;
  documentsTitle: string;
  documentHint: string;
  reportTitle: string;
  profileTitle: string;
  pathwayTitle: string;
  softTitle: string;
  mainWorkspace: string;
  diagnosticPage: string;
  noVerdict: string;
  noAiHard: string;
  aiWhereNeeded: string;
  uploadButton: string;
  issuerName: string;
  unknown: string;
  yes: string;
  no: string;
  missing: string;
  counts: string;
  confirmed: string;
  notConfirmed: string;
  wvrMarketCheck: string;
  ch18cCheck: string;
  ch18cDetail: string;
  gateTitles: Record<"profit" | "marketRevenueCashflow" | "marketRevenue" | "continuity" | "wvr" | "ch18c", string>;
  notes: Record<"hard" | "profile" | "wvr" | "ch18c", string>;
  fields: Record<Exclude<keyof ProfileValues, "issuerName">, string>;
  units: Record<"hkdM" | "years" | "pct", string>;
  modeNotes: Record<InputMode, string>;
  softSignals: string[];
}>;

const fieldConfig: Array<{ key: FieldKey; unit: "hkdM" | "years" | "pct"; step: string }> = [
  { key: "latestProfit", unit: "hkdM", step: "1" },
  { key: "precedingTwoYearProfit", unit: "hkdM", step: "1" },
  { key: "trackRecordProfit", unit: "hkdM", step: "1" },
  { key: "latestRevenue", unit: "hkdM", step: "1" },
  { key: "marketCap", unit: "hkdM", step: "1" },
  { key: "operatingCashflow", unit: "hkdM", step: "1" },
  { key: "managementContinuityYears", unit: "years", step: "0.5" },
  { key: "wvrBeneficiaryOwnership", unit: "pct", step: "0.1" },
];

const initialValues: ProfileValues = {
  issuerName: "",
  latestProfit: "",
  precedingTwoYearProfit: "",
  trackRecordProfit: "",
  latestRevenue: "",
  marketCap: "",
  operatingCashflow: "",
  managementContinuityYears: "",
  ownershipContinuity: "unknown",
  wvrBeneficiaryOwnership: "",
};

const statusTone: Record<Status, string> = {
  PASS: "border-[#0f766e] bg-[#e8f3ef] text-[#0f4f49]",
  SHORTFALL: "border-[#c48a1b] bg-[#fff5d8] text-[#6f4d0e]",
  MISSING_INPUT: "border-[#9aa196] bg-[#f7f8f2] text-[#4f5a52]",
  DEFERRED_REVIEW: "border-[#8c7ae6] bg-[#efedff] text-[#342e70]",
};

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluateNumber(label: string, ruleRef: string, raw: string, threshold: number, unit: string): Check {
  const value = toNumber(raw);
  if (value === null) {
    return { label, ruleRef, status: "MISSING_INPUT", detail: `>= ${threshold} ${unit}` };
  }
  return {
    label,
    ruleRef,
    status: value >= threshold ? "PASS" : "SHORTFALL",
    detail: `${value} / >= ${threshold} ${unit}`,
  };
}

function evaluateBoolean(
  label: string,
  ruleRef: string,
  value: BooleanInput,
  details: { confirmed: string; notConfirmed: string },
): Check {
  if (value === "unknown") {
    return { label, ruleRef, status: "MISSING_INPUT", detail: "true / false" };
  }
  return {
    label,
    ruleRef,
    status: value === "yes" ? "PASS" : "SHORTFALL",
    detail: value === "yes" ? details.confirmed : details.notConfirmed,
  };
}

function aggregate(checks: Check[]): Status {
  if (checks.some((check) => check.status === "MISSING_INPUT")) return "MISSING_INPUT";
  if (checks.some((check) => check.status === "SHORTFALL")) return "SHORTFALL";
  if (checks.some((check) => check.status === "DEFERRED_REVIEW")) return "DEFERRED_REVIEW";
  return "PASS";
}

function buildGates(values: ProfileValues, t: (typeof copy)[Locale]): Gate[] {
  const hkdM = t.units.hkdM;
  const profitTest = [
    evaluateNumber(t.fields.latestProfit, "MB Rule 8.05(1)", values.latestProfit, 35, hkdM),
    evaluateNumber(t.fields.precedingTwoYearProfit, "MB Rule 8.05(1)", values.precedingTwoYearProfit, 45, hkdM),
    evaluateNumber(t.fields.trackRecordProfit, "MB Rule 8.05(1)", values.trackRecordProfit, 80, hkdM),
    evaluateNumber(t.fields.marketCap, "MB Rule 8.05(1) / 8.09(2)", values.marketCap, 500, hkdM),
  ];
  const marketRevenueCashflow = [
    evaluateNumber(t.fields.marketCap, "MB Rule 8.05(2)", values.marketCap, 2000, hkdM),
    evaluateNumber(t.fields.latestRevenue, "MB Rule 8.05(2)", values.latestRevenue, 500, hkdM),
    evaluateNumber(t.fields.operatingCashflow, "MB Rule 8.05(2)", values.operatingCashflow, 100, hkdM),
  ];
  const marketRevenue = [
    evaluateNumber(t.fields.marketCap, "MB Rule 8.05(3)", values.marketCap, 4000, hkdM),
    evaluateNumber(t.fields.latestRevenue, "MB Rule 8.05(3)", values.latestRevenue, 500, hkdM),
  ];
  const continuity = [
    evaluateNumber(t.fields.managementContinuityYears, "MB Rule 8.05", values.managementContinuityYears, 3, t.units.years),
    evaluateBoolean(
      t.fields.ownershipContinuity,
      "MB Rule 8.05(2)(c) / 8.05(3)(c)",
      values.ownershipContinuity,
      { confirmed: t.confirmed, notConfirmed: t.notConfirmed },
    ),
  ];
  const wvr = evaluateWvr(values, t);

  return [
    {
      title: t.gateTitles.profit,
      ruleRef: "Rule 8.05(1)",
      status: aggregate(profitTest),
      note: t.notes.hard,
      checks: profitTest,
    },
    {
      title: t.gateTitles.marketRevenueCashflow,
      ruleRef: "Rule 8.05(2)",
      status: aggregate(marketRevenueCashflow),
      note: t.notes.hard,
      checks: marketRevenueCashflow,
    },
    {
      title: t.gateTitles.marketRevenue,
      ruleRef: "Rule 8.05(3)",
      status: aggregate(marketRevenue),
      note: t.notes.hard,
      checks: marketRevenue,
    },
    {
      title: t.gateTitles.continuity,
      ruleRef: "Rule 8.05 continuity limbs",
      status: aggregate(continuity),
      note: t.notes.profile,
      checks: continuity,
    },
    {
      title: t.gateTitles.wvr,
      ruleRef: "Rules 8A.06 / 8A.12",
      status: aggregate(wvr),
      note: t.notes.wvr,
      checks: wvr,
    },
    {
      title: t.gateTitles.ch18c,
      ruleRef: "Chapter 18C",
      status: "DEFERRED_REVIEW",
      note: t.notes.ch18c,
      checks: [
        {
          label: t.ch18cCheck,
          ruleRef: "Chapter 18C",
          status: "DEFERRED_REVIEW",
          detail: t.ch18cDetail,
        },
      ],
    },
  ];
}

function evaluateWvr(values: ProfileValues, t: (typeof copy)[Locale]): Check[] {
  const marketCap = toNumber(values.marketCap);
  const revenue = toNumber(values.latestRevenue);
  const ownership = evaluateNumber(
    t.fields.wvrBeneficiaryOwnership,
    "MB Rule 8A.12",
    values.wvrBeneficiaryOwnership,
    10,
    t.units.pct,
  );

  let marketDetail = ">= 40000 or >= 10000 + revenue >= 1000";
  let marketStatus: Status = "MISSING_INPUT";
  if (marketCap !== null && marketCap >= 40000) {
    marketStatus = "PASS";
    marketDetail = `${marketCap} / >= 40000 ${t.units.hkdM}`;
  } else if (marketCap !== null && marketCap < 10000) {
    marketStatus = "SHORTFALL";
    marketDetail = `${marketCap} / >= 10000 ${t.units.hkdM}`;
  } else if (marketCap !== null && revenue !== null) {
    marketStatus = revenue >= 1000 ? "PASS" : "SHORTFALL";
    marketDetail = `${marketCap} + revenue ${revenue} / >= 1000 ${t.units.hkdM}`;
  }

  return [
    {
      label: t.wvrMarketCheck,
      ruleRef: "MB Rule 8A.06",
      status: marketStatus,
      detail: marketDetail,
    },
    ownership,
  ];
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex h-7 items-center border px-2 font-mono text-[11px] font-semibold ${statusTone[status]}`}>
      {status}
    </span>
  );
}

export function DiagnosticWorkspacePageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const [mode, setMode] = useState<InputMode>("structured");
  const [values, setValues] = useState<ProfileValues>(initialValues);
  const [documentNames, setDocumentNames] = useState<string[]>([]);

  const gates = useMemo(() => buildGates(values, t), [values, t]);
  const counts = useMemo(() => {
    return gates.reduce<Record<Status, number>>(
      (acc, gate) => {
        acc[gate.status] += 1;
        return acc;
      },
      { PASS: 0, SHORTFALL: 0, MISSING_INPUT: 0, DEFERRED_REVIEW: 0 },
    );
  }, [gates]);
  const profilePreview = useMemo(
    () => ({
      issuer_id: values.issuerName || null,
      input_mode: mode,
      financials: {
        latest_profit_attributable_to_owners_hkd_m: toNumber(values.latestProfit),
        preceding_two_year_profit_hkd_m: toNumber(values.precedingTwoYearProfit),
        track_record_profit_hkd_m: toNumber(values.trackRecordProfit),
        latest_revenue_hkd_m: toNumber(values.latestRevenue),
        operating_cashflow_track_record_hkd_m: toNumber(values.operatingCashflow),
      },
      offering: {
        expected_market_cap_at_listing_hkd_m: toNumber(values.marketCap),
      },
      continuity: {
        management_continuity_years: toNumber(values.managementContinuityYears),
        ownership_continuity_recent_audited_fy:
          values.ownershipContinuity === "unknown" ? null : values.ownershipContinuity === "yes",
      },
      wvr: {
        beneficiary_aggregate_ownership_pct: toNumber(values.wvrBeneficiaryOwnership),
      },
      uploaded_documents: documentNames,
    }),
    [documentNames, mode, values],
  );

  function updateValue<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="eligibility" locale={locale} />

      <section className="border-b border-[#d5ddd2] bg-white pt-28">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase text-[#0f766e]">{t.navTitle}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold md:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#637064]">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border border-[#d5ddd2] bg-[#f7f8f2] px-3 py-2 text-xs font-semibold">{t.noVerdict}</span>
            <span className="border border-[#0f766e] bg-[#e8f3ef] px-3 py-2 text-xs font-semibold text-[#0f4f49]">{t.noAiHard}</span>
            <span className="border border-[#8c7ae6] bg-[#efedff] px-3 py-2 text-xs font-semibold text-[#342e70]">{t.aiWhereNeeded}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="border border-[#d5ddd2] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex border border-[#d5ddd2] bg-[#f7f8f2] p-1">
                {(["structured", "documents"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={mode === item}
                    onClick={() => setMode(item)}
                    className={`h-10 px-4 text-sm font-semibold transition ${
                      mode === item ? "bg-[#17201b] text-white" : "text-[#334139] hover:bg-white"
                    }`}
                  >
                    {item === "structured" ? t.structured : t.documents}
                  </button>
                ))}
              </div>
              <p className="max-w-xl text-sm leading-6 text-[#637064]">{t.modeNotes[mode]}</p>
            </div>
          </div>

          {mode === "documents" ? (
            <div className="border border-[#d5ddd2] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t.documentsTitle}</h2>
                  <p className="mt-1 text-sm text-[#637064]">{t.documentHint}</p>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32]">
                  {t.uploadButton}
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      setDocumentNames(Array.from(event.target.files ?? []).map((file) => file.name));
                    }}
                  />
                </label>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(documentNames.length ? documentNames : [t.extractionQueued]).map((name) => (
                  <div key={name} className="border border-[#d5ddd2] bg-[#f7f8f2] p-3 text-sm font-medium text-[#334139]">
                    {name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border border-[#d5ddd2] bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{t.fieldsTitle}</h2>
              {mode === "documents" && documentNames.length ? (
                <span className="border border-[#8c7ae6] bg-[#efedff] px-3 py-1 text-xs font-semibold text-[#342e70]">
                  {t.extractionReady}
                </span>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold text-[#4f5a52]">{t.issuerName}</span>
                <input
                  value={values.issuerName}
                  onChange={(event) => updateValue("issuerName", event.target.value)}
                  className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
                />
              </label>
              {fieldConfig.map((field) => (
                <label key={field.key} className="grid gap-2">
                  <span className="text-xs font-semibold text-[#4f5a52]">{t.fields[field.key]}</span>
                  <div className="grid grid-cols-[1fr_auto] border border-[#c9d2c7] bg-[#f7f8f2] focus-within:border-[#0f766e]">
                    <input
                      type="number"
                      min="0"
                      step={field.step}
                      value={values[field.key]}
                      onChange={(event) => updateValue(field.key, event.target.value)}
                      className="h-11 min-w-0 bg-transparent px-3 text-sm outline-none"
                    />
                    <span className="flex h-11 items-center border-l border-[#d5ddd2] px-3 text-xs font-semibold text-[#637064]">
                      {t.units[field.unit]}
                    </span>
                  </div>
                </label>
              ))}
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-[#4f5a52]">{t.fields.ownershipContinuity}</span>
                <select
                  value={values.ownershipContinuity}
                  onChange={(event) => updateValue("ownershipContinuity", event.target.value as BooleanInput)}
                  className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
                >
                  <option value="unknown">{t.unknown}</option>
                  <option value="yes">{t.yes}</option>
                  <option value="no">{t.no}</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border border-[#d5ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">{t.reportTitle}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(Object.keys(counts) as Status[]).map((status) => (
                <div key={status} className={`border p-3 ${statusTone[status]}`}>
                  <p className="font-mono text-lg font-semibold">{counts[status]}</p>
                  <p className="mt-1 font-mono text-[11px] font-semibold">{status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#d5ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">{t.profileTitle}</h2>
            <pre className="mt-4 max-h-[420px] overflow-auto border border-[#d5ddd2] bg-[#17201b] p-4 font-mono text-xs leading-5 text-[#e7efe9]">
              {JSON.stringify(profilePreview, null, 2)}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={locale === "zh" ? "/zh/diagnostic" : "/diagnostic"} className="inline-flex h-10 items-center border border-[#c9d2c7] bg-white px-4 text-sm font-semibold hover:bg-[#eef3ec]">
              {t.diagnosticPage}
            </Link>
            <Link href={locale === "zh" ? "/zh/workspace" : "/workspace"} className="inline-flex h-10 items-center bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32]">
              {t.mainWorkspace}
            </Link>
          </div>
        </aside>
      </section>

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h2 className="text-lg font-semibold">{t.pathwayTitle}</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {gates.map((gate) => (
              <article key={gate.title} className="border border-[#d5ddd2] bg-[#f7f8f2] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{gate.title}</h3>
                    <p className="mt-1 font-mono text-xs text-[#637064]">{gate.ruleRef}</p>
                  </div>
                  <StatusBadge status={gate.status} />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase text-[#637064]">{gate.note}</p>
                <div className="mt-4 divide-y divide-[#d5ddd2] border border-[#d5ddd2] bg-white">
                  {gate.checks.map((check) => (
                    <div key={`${gate.title}-${check.label}`} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="text-sm font-medium">{check.label}</p>
                        <p className="mt-1 font-mono text-xs text-[#637064]">{check.ruleRef} · {check.detail}</p>
                      </div>
                      <StatusBadge status={check.status} />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-lg font-semibold">{t.softTitle}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {t.softSignals.map((signal) => (
            <div key={signal} className="border border-[#8c7ae6] bg-[#efedff] p-4 text-[#342e70]">
              <p className="text-sm font-semibold">{signal}</p>
              <p className="mt-3 font-mono text-[11px] font-semibold">DEFERRED_REVIEW</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
