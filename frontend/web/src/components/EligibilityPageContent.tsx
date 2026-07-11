import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=IPO%20Diagnostic%20demo";

const copy = {
  en: {
    eyebrow: "IPO Diagnostic architecture",
    title: "AI extracts facts. Deterministic rules compare thresholds.",
    description:
      "The diagnostic module is not 'AI-free'. It is intentionally split: AI is used where issuer documents must be read and normalized into CompanyProfile; the hard rule engine then compares resolved values against listing thresholds without an LLM.",
    primaryCta: "Open workspace",
    secondaryCta: "Request diagnostic demo",
    overviewCta: "Back to overview",
    panelTitle: "Where AI is used",
    panelSubtitle: "Extraction and soft signals use AI; hard thresholds do not.",
    panelItems: [
      ["Uses AI", "Document, financial-statement, and table extraction through Agent1 + LLM."],
      ["No AI by design", "Profit, revenue, market cap, continuity, and FX-gated threshold comparison."],
      ["AI later", "Seven qualitative soft signals are modeled and waiting for LLM + retrieval wiring."],
    ],
    flowTitle: "Two input modes, one diagnostic truth source",
    flowSubtitle:
      "The upload choice changes how CompanyProfile is filled. It does not change the downstream rule logic.",
    flow: {
      structured: ["Structured fields", "Manual input · no AI"],
      documents: ["Documents / financials / tables", "AI extraction · Agent1"],
      profile: ["CompanyProfile", "Missing value -> MISSING_INPUT"],
      hard: ["Hard rule engine", "Deterministic · deliberately no AI"],
      soft: ["Soft signal layer", "7 signals · LLM/retrieval pending"],
      report: ["Diagnostic report", "Gap-only · no listing verdict"],
    },
    legend: [
      ["Uses AI", "bg-[#efedff] border-[#8c7ae6]"],
      ["Deterministic by design", "bg-[#e8f3ef] border-[#0f766e]"],
      ["Data / input / output", "bg-[#f7f8f2] border-[#9aa196]"],
    ],
    modesTitle: "How companies can submit information",
    modes: [
      {
        title: "Structured fields",
        tag: "No AI required",
        text: "The issuer enters profit, revenue, market cap, dates, FX, continuity, WVR ownership, or other fixed fields directly. Those values flow into CompanyProfile and are compared by the deterministic engine.",
      },
      {
        title: "Uploaded materials",
        tag: "AI extraction required",
        text: "The issuer uploads documents, financial statements, spreadsheets, or diligence files. Agent1 and the LLM extract facts into the same CompanyProfile before the same deterministic engine runs.",
      },
    ],
    whyTitle: "Why hard thresholds deliberately avoid AI",
    whyText:
      "A 35 million profit test or 4 billion market-cap threshold is not a judgment call. Letting an LLM decide numeric gates risks invented values, mixed-up rule limbs, and non-repeatable results. The hard path must be auditable, reproducible, and regression-tested.",
    boundaries: [
      ["Extraction layer", "Uses AI when the source is a document or table; skipped when fields are manually supplied."],
      ["CompanyProfile", "The shared resolved-value object. Missing resolved values become MISSING_INPUT rather than guessed numbers."],
      ["Hard rule engine", "Reads CompanyProfile / issuer JSON and compares against versioned YAML thresholds. No LLM imports are allowed."],
      ["Soft signal layer", "Customer concentration, supplier concentration, connected-party independence, competing business, internal controls, equity/WVR/pre-IPO clarity, and shell-company pattern need LLM + retrieval before they can be assessed."],
    ],
    statusesTitle: "User-facing status model",
    statuses: [
      ["PASS", "Resolved value exists and meets the modeled threshold."],
      ["SHORTFALL", "Resolved value exists but falls below the modeled threshold."],
      ["MISSING_INPUT", "CompanyProfile lacks a required value; the engine does not infer it."],
      ["INDETERMINATE", "A value exists but cannot be compared, often because FX or date context is missing."],
      ["REVIEW_REQUIRED", "A qualitative signal is detected or queued for professional judgment."],
      ["DEFERRED_REVIEW", "A qualitative or not-yet-wired rule area is tracked but not deterministically scored."],
    ],
    pathwaysTitle: "Same rule engine after either input path",
    pathways: [
      "HKEX Main Board Rule 8.05",
      "Chapter 8A WVR quantitative subset",
      "Chapter 18C specialist technology framework",
      "Chapter 18A biotech and CSRC overseas filing stubs",
      "Qualitative substance signals for later expert / LLM review",
    ],
    footerTitle: "The correction is precise: the hard engine is not the whole module.",
    footerText:
      "Engine.py is the deterministic comparison stage. The full diagnostic workflow has AI extraction before it and LLM-assisted soft-signal review after it.",
  },
  zh: {
    eyebrow: "上市诊断架构",
    title: "AI 负责抽取事实，确定性规则负责比较阈值。",
    description:
      "这个模块不是“完全没用 AI”。它是故意拆成两段：当发行人上传档案、财报、统计表时，用 AI 抽取并归一化到 CompanyProfile；之后硬规则引擎只拿已解析值和上市阈值比较，不让 LLM 参与判定。",
    primaryCta: "打开工作台",
    secondaryCta: "预约诊断演示",
    overviewCta: "返回产品概览",
    panelTitle: "AI 用在哪里",
    panelSubtitle: "抽取和软信号用 AI；硬阈值比对不用 AI。",
    panelItems: [
      ["用 AI", "文档、财报、表格经 Agent1 + LLM 抽取。"],
      ["故意不用 AI", "盈利、市值、收入、持续性、汇率等硬阈值比对。"],
      ["后续接 AI", "7 个定性软信号已经建模，等待 LLM + 检索接入。"],
    ],
    flowTitle: "两种输入形式，一个诊断事实源",
    flowSubtitle:
      "上传形式只决定 CompanyProfile 怎么被填上；不改变后面的规则判定逻辑。",
    flow: {
      structured: ["结构化字段", "手填 · 不经 AI"],
      documents: ["文档 / 财报 / 表格", "AI 抽取 · Agent1"],
      profile: ["CompanyProfile", "缺失值 -> MISSING_INPUT"],
      hard: ["硬判定引擎", "确定性 · 故意不用 AI"],
      soft: ["软信号层", "7 信号 · 待接 LLM/检索"],
      report: ["诊断报告", "只标 gap · 不裁决"],
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
        text: "发行人直接填写盈利、收入、市值、日期、汇率、管理层持续性、WVR 权益比例等固定字段。这些值进入 CompanyProfile，再由确定性引擎比较。",
      },
      {
        title: "上传材料",
        tag: "需要 AI 抽取",
        text: "发行人上传档案、财报、统计表或尽调文件。Agent1 和 LLM 把事实抽进同一个 CompanyProfile，再运行同一套确定性判定引擎。",
      },
    ],
    whyTitle: "为什么硬阈值判定故意不用 AI",
    whyText:
      "3,500 万盈利测试、40 亿市值门槛不是判断题，而是数字比大小。让 LLM 判硬门槛会带来编数字、记混规则分支、结果不可复现的问题。硬路径必须可审计、可复现、可回归测试。",
    boundaries: [
      ["抽取层", "资料来源是文档或表格时用 AI；如果是手填字段，则跳过 AI。"],
      ["CompanyProfile", "共享的已解析事实对象。缺少解析值就输出 MISSING_INPUT，而不是猜。"],
      ["硬规则引擎", "读取 CompanyProfile / 发行人 JSON，对照版本化 YAML 阈值。禁止导入 LLM。"],
      ["软信号层", "客户集中度、供应商集中度、关联交易独立性、同业竞争、内控、股权/WVR/pre-IPO 清晰度、壳公司模式，需要 LLM + 检索后才能评估。"],
    ],
    statusesTitle: "面向用户的状态模型",
    statuses: [
      ["PASS", "解析值存在，并达到已建模阈值。"],
      ["SHORTFALL", "解析值存在，但低于已建模阈值。"],
      ["MISSING_INPUT", "CompanyProfile 缺必要值；引擎不会推断。"],
      ["INDETERMINATE", "值存在但无法比较，常见原因是缺汇率或日期语境。"],
      ["REVIEW_REQUIRED", "定性信号已触发或进入专业判断队列。"],
      ["DEFERRED_REVIEW", "定性或尚未接入的规则领域已跟踪，但不纳入确定性评分。"],
    ],
    pathwaysTitle: "无论哪种输入形式，后端都是同一套规则引擎",
    pathways: [
      "港交所主板规则 8.05",
      "第 8A 章 WVR 量化子集",
      "第 18C 章特专科技公司框架",
      "第 18A 章生物科技公司与中国证监会境外上市备案结构化占位",
      "后续供专家 / LLM 复核的定性实质信号",
    ],
    footerTitle: "准确的纠正是：硬判定引擎不等于整个模块。",
    footerText:
      "Engine.py 只是确定性比较阶段。完整上市诊断流程在它之前有 AI 抽取，在它之后还有 LLM 辅助的软信号复核。",
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
    panelTitle: string;
    panelSubtitle: string;
    panelItems: Array<[string, string]>;
    flowTitle: string;
    flowSubtitle: string;
    flow: Record<"structured" | "documents" | "profile" | "hard" | "soft" | "report", [string, string]>;
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
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
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
              <Link href={href.workspace} className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]">
                {t.primaryCta}
                <ArrowIcon />
              </Link>
              <a href={contactHref} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.secondaryCta}
                <ArrowIcon />
              </a>
              <Link href={href.overview} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
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
            <FlowCard item={t.flow.profile} tone="data" />
          </div>
          <div className="mx-auto my-3 h-8 w-px bg-[#9aa196]" />
          <div className="grid gap-4 md:grid-cols-2">
            <FlowCard item={t.flow.hard} tone="deterministic" />
            <FlowCard item={t.flow.soft} tone="ai" />
          </div>
          <div className="mx-auto my-3 h-8 w-px bg-[#9aa196]" />
          <div className="mx-auto max-w-xl">
            <FlowCard item={t.flow.report} tone="data" />
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
          <a href={contactHref} className="inline-flex h-11 w-fit items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]">
            {t.secondaryCta}
            <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
