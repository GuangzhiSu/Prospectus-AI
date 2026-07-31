import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=IPO%20Diagnostic%20demo";

const copy = {
  en: {
    eyebrow: "IPO eligibility · standalone module",
    title: "Upload documents. Run hard rules. Get readiness feedback.",
    description:
      "Eligibility is a separate product from prospectus drafting. AI extracts facts and drafts feedback; a deterministic engine compares confirmed numbers to listing thresholds — never inventing values.",
    primaryCta: "Open eligibility workspace",
    secondaryCta: "Request diagnostic demo",
    overviewCta: "Back to overview",
    settingsCta: "Eligibility settings",
    panelTitle: "Four stages",
    panelSubtitle: "AI where reading text helps; code where thresholds must be exact.",
    panelItems: [
      ["1 · Extraction", "Reads PDF / DOCX / XLSX / JSON into quantifiable fields and narrative excerpts (Mode B: confirm before hard use)."],
      ["2 · Hard inspection", "Pure Python vs versioned YAML thresholds across HK / A-share / SGX boards. No LLM imports."],
      ["3 · Qualitative", "LLM reviews unquantifiable substance signals (concentration, independence, controls, …)."],
      ["4 · Feedback", "Plain-language readiness + what to improve, tied to shortfalls and missing inputs."],
    ],
    flowTitle: "End-to-end flow",
    flowSubtitle:
      "Structured fields and uploads both feed the same hard engine. Provider choice lives in eligibility settings — separate from drafting.",
    flow: {
      structured: ["Structured fields", "Manual · no AI"],
      documents: ["Uploaded documents", "AI extraction"],
      confirm: ["Confirm values", "Mode B · unconfirmed = MISSING_INPUT"],
      hard: ["Hard rule engine", "Deterministic · no AI"],
      soft: ["Qualitative signals", "LLM"],
      report: ["Feedback + scorecard", "Diagnostic · not legal advice"],
    },
    legend: [
      ["Uses AI", "bg-[#efedff] border-[#8c7ae6]"],
      ["Deterministic by design", "bg-[#e8f3ef] border-[#0f766e]"],
      ["Data / input / output", "bg-[#f7f8f2] border-[#9aa196]"],
    ],
    modesTitle: "How companies submit information",
    modes: [
      {
        title: "Structured fields",
        tag: "No AI required",
        text: "Enter profit, revenue, market cap, continuity, FX, and related fields. Values go straight into the issuer envelope for hard comparison.",
      },
      {
        title: "Uploaded materials",
        tag: "AI extraction",
        text: "Upload audited statements or diligence files. The eligibility extraction agent (not Agent1 drafting) pulls fields and narrative text; deal params stay hard-entered.",
      },
    ],
    whyTitle: "Why hard thresholds never use AI",
    whyText:
      "A profit test or market-cap floor is not a judgment call. LLMs must not invent numbers or pick rule limbs. The hard path is auditable, reproducible, and regression-tested.",
    boundaries: [
      ["Standalone package", "Lives under eligibility/ — does not depend on Agent1 / Agent2 drafting graphs."],
      ["Own inference settings", "/diagnostic/settings stores providers separately from drafting Settings."],
      ["Hard rule engine", "YAML packs for HKEX, PRC boards, and SGX. No LLM imports on this path."],
      ["Feedback layer", "Answers “ready to discuss?” and lists gaps — not exchange approval."],
    ],
    statusesTitle: "Status model",
    statuses: [
      ["PASS", "Resolved value meets the threshold."],
      ["SHORTFALL", "Resolved value falls short."],
      ["MISSING_INPUT", "Value absent or not confirmed."],
      ["INDETERMINATE", "Value present but cannot be compared (e.g. missing FX)."],
      ["NOT_EVALUATED", "Gate authored but not run this phase / qualitative pending evidence."],
      ["TRIGGERED", "Qualitative signal fired for review (soft layer)."],
    ],
    pathwaysTitle: "Markets and boards covered",
    pathways: [
      "Hong Kong Main Board, GEM, Ch. 8A / 18A / 18C, public float",
      "PRC Main Board, STAR, ChiNext, BSE + CSRC preconditions",
      "SGX Mainboard and Catalist",
      "Multi-market packs encoded from the update/ threshold master",
    ],
    footerTitle: "Diagnostic only — humans finalize.",
    footerText:
      "Eligibility reconstructs issuer data, compares thresholds, and flags gaps. It does not decide listing approval or write a prospectus.",
  },
  zh: {
    eyebrow: "上市资格 · 独立模块",
    title: "上传材料，跑硬性规则，获得准备度反馈。",
    description:
      "上市资格与招股书起草是分开的产品。AI 负责抽取与反馈；确定性引擎用已确认数字对照上市门槛——从不编造数值。",
    primaryCta: "打开资格诊断工作区",
    secondaryCta: "预约诊断演示",
    overviewCta: "返回产品概览",
    settingsCta: "资格诊断设置",
    panelTitle: "四个阶段",
    panelSubtitle: "适合读文本的地方用 AI；门槛必须精确的地方用代码。",
    panelItems: [
      ["1 · 信息抽取", "读取 PDF / DOCX / XLSX / JSON，得到可量化字段与叙述摘录（Mode B：确认后才进硬性比对）。"],
      ["2 · 硬性检查", "纯 Python 对照版本化 YAML（港股 / A 股 / 新交所）。此路径不导入 LLM。"],
      ["3 · 定性分析", "LLM 审阅不可量化实质信号（集中度、独立性、内控等）。"],
      ["4 · 反馈", "用白话说明准备度与待改进项，并挂钩短板与缺输入。"],
    ],
    flowTitle: "端到端流程",
    flowSubtitle:
      "结构化字段与上传材料最终进入同一套硬性引擎。推理提供商在资格诊断设置中配置——与起草设置分开。",
    flow: {
      structured: ["结构化字段", "手填 · 不用 AI"],
      documents: ["上传文件", "AI 抽取"],
      confirm: ["确认数值", "Mode B · 未确认 = MISSING_INPUT"],
      hard: ["硬性规则引擎", "确定性 · 不用 AI"],
      soft: ["定性信号", "LLM"],
      report: ["反馈 + 记分卡", "诊断意见 · 非法律结论"],
    },
    legend: [
      ["用 AI", "bg-[#efedff] border-[#8c7ae6]"],
      ["确定性 · 故意不用 AI", "bg-[#e8f3ef] border-[#0f766e]"],
      ["数据 / 输入 / 输出", "bg-[#f7f8f2] border-[#9aa196]"],
    ],
    modesTitle: "公司可以怎样提交资料",
    modes: [
      {
        title: "结构化字段",
        tag: "不需要 AI",
        text: "直接填写盈利、收入、市值、持续性、汇率等。数值进入发行人结构体，供硬性比对。",
      },
      {
        title: "上传材料",
        tag: "需要 AI 抽取",
        text: "上传审计报表或尽调文件。由资格诊断抽取代理（不是起草 Agent1）提取字段与叙述；交易参数仍须手填。",
      },
    ],
    whyTitle: "为什么硬性门槛从不使用 AI",
    whyText:
      "盈利测试或市值门槛不是判断题。不能让 LLM 编数字或选错规则分支。硬路径必须可审计、可复现、可回归测试。",
    boundaries: [
      ["独立程序包", "位于 eligibility/，不依赖 Agent1 / Agent2 起草图。"],
      ["独立推理设置", "/diagnostic/settings 与招股书起草 Settings 分开存储。"],
      ["硬性规则引擎", "覆盖港交所、A 股板块与新交所的 YAML 规则包。"],
      ["反馈层", "回答「能否讨论上市」并列出缺口——不是交易所批复。"],
    ],
    statusesTitle: "状态模型",
    statuses: [
      ["PASS", "解析值达标。"],
      ["SHORTFALL", "解析值未达标。"],
      ["MISSING_INPUT", "缺值或未确认。"],
      ["INDETERMINATE", "有值但无法比较（如缺汇率）。"],
      ["NOT_EVALUATED", "规则已写但本阶段未评 / 定性证据不足。"],
      ["TRIGGERED", "定性信号触发（软层）。"],
    ],
    pathwaysTitle: "已覆盖的市场与板块",
    pathways: [
      "港交所主板、GEM、第 8A / 18A / 18C 章、公众持股",
      "A 股主板、科创板、创业板、北交所及证监会前置条件",
      "新交所主板与 Catalist",
      "规则包来自 update/ 阈值主表编码",
    ],
    footerTitle: "仅作诊断 —— 由人最终拍板。",
    footerText:
      "资格诊断重建发行人数据、比对门槛并标出缺口。它不决定能否上市，也不自动撰写招股书。",
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    overviewCta: string;
    settingsCta: string;
    panelTitle: string;
    panelSubtitle: string;
    panelItems: Array<[string, string]>;
    flowTitle: string;
    flowSubtitle: string;
    flow: Record<
      "structured" | "documents" | "confirm" | "hard" | "soft" | "report",
      [string, string]
    >;
    legend: Array<[string, string]>;
    modesTitle: string;
    modes: Array<{ title: string; tag: string; text: string }>;
    whyTitle: string;
    whyText: string;
    boundaries: Array<[string, string]>;
    statusesTitle: string;
    statuses: Array<[string, string]>;
    pathwaysTitle: string;
    pathways: string[];
    footerTitle: string;
    footerText: string;
  }
>;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />
    </svg>
  );
}

function FlowCard({
  item,
  tone = "data",
}: {
  item: [string, string];
  tone?: "ai" | "deterministic" | "data";
}) {
  const toneClass = {
    ai: "border-[#8c7ae6] bg-[#efedff] text-[#342e70]",
    deterministic: "border-[#0f766e] bg-[#e8f3ef] text-[#0f4f49]",
    data: "border-[#9aa196] bg-[#f7f8f2] text-[#383f3a]",
  }[tone];

  return (
    <div className={`border p-4 text-center shadow-sm ${toneClass}`}>
      <p className="text-sm font-semibold">{item[0]}</p>
      <p className="mt-1 text-xs font-medium">{item[1]}</p>
    </div>
  );
}

export function EligibilityPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = {
    overview: locale === "zh" ? "/zh" : "/",
    workspace: locale === "zh" ? "/zh/diagnostic/workspace" : "/diagnostic/workspace",
    settings: locale === "zh" ? "/zh/diagnostic/settings" : "/diagnostic/settings",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="eligibility" locale={locale} />

      <section className="relative overflow-hidden bg-[#18201e] text-white">
        <div className="absolute inset-0 opacity-[0.14]">
          <Image src="/app-icon-512.png" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative mx-auto grid min-h-[690px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-28 md:grid-cols-[1fr_460px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dfe9e4]">
              {t.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">{t.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dfe9e4] md:text-lg">{t.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={href.workspace}
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                {t.primaryCta}
                <ArrowIcon />
              </Link>
              <Link
                href={href.settings}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.settingsCta}
                <ArrowIcon />
              </Link>
              <a
                href={contactHref}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.secondaryCta}
                <ArrowIcon />
              </a>
              <Link
                href={href.overview}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.overviewCta}
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f8faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">{t.panelTitle}</p>
                <p className="text-xs text-[#647064]">{t.panelSubtitle}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {t.panelItems.map(([title, text]) => (
                <div key={title} className="border border-[#dde5da] bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase text-[#0f766e]">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-[#334139]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-semibold">{t.flowTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#637064]">{t.flowSubtitle}</p>
        </div>
        <div className="border border-[#d5ddd2] bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <FlowCard item={t.flow.structured} tone="data" />
            <FlowCard item={t.flow.documents} tone="ai" />
          </div>
          <div className="mx-auto my-3 h-8 w-px bg-[#9aa196]" />
          <div className="mx-auto max-w-xl">
            <FlowCard item={t.flow.confirm} tone="data" />
          </div>
          <div className="mx-auto my-3 h-8 w-px bg-[#9aa196]" />
          <div className="grid gap-4 md:grid-cols-2">
            <FlowCard item={t.flow.hard} tone="deterministic" />
            <FlowCard item={t.flow.soft} tone="ai" />
          </div>
          <div className="mx-auto my-3 h-8 w-px bg-[#9aa196]" />
          <div className="mx-auto max-w-xl">
            <FlowCard item={t.flow.report} tone="ai" />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-[#4f5a52]">
            {t.legend.map(([label, colorClass]) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className={`h-4 w-4 border ${colorClass}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t.modesTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.whyText}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {t.modes.map((mode) => (
              <div key={mode.title} className="border border-[#d5ddd2] bg-[#f7f8f2] p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{mode.title}</p>
                  <span className="shrink-0 bg-[#e8f3ef] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                    {mode.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#637064]">{mode.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-semibold">{t.whyTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-[#637064]">{t.whyText}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {t.boundaries.map(([title, text]) => (
            <div key={title} className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t.statusesTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.pathwaysTitle}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.statuses.map(([status, detail]) => (
              <div key={status} className="grid grid-cols-[132px_1fr] gap-3 border border-[#d5ddd2] p-4">
                <p className="font-mono text-xs font-semibold text-[#0f766e]">{status}</p>
                <p className="text-sm leading-6 text-[#334139]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-semibold">{t.pathwaysTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-[#637064]">{t.footerText}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.pathways.map((item) => (
            <div key={item} className="flex gap-3 border border-[#d5ddd2] bg-white p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-[#0f766e] text-white">
                <CheckIcon />
              </span>
              <p className="text-sm leading-6 text-[#334139]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-[#17201b] text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 py-12 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">{t.footerTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#dfe9e4]">{t.footerText}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={href.workspace}
              className="inline-flex h-11 w-fit items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]"
            >
              {t.primaryCta}
              <ArrowIcon />
            </Link>
            <Link
              href={href.settings}
              className="inline-flex h-11 w-fit items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t.settingsCta}
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
