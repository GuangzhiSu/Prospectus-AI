import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=IPO%20Diagnostic%20demo";

const copy = {
  en: {
    eyebrow: "IPO Diagnostic",
    title: "Diagnose IPO readiness before prospectus drafting starts.",
    description:
      "A standalone deterministic rules engine for checking issuer inputs against listing pathway criteria. It reports rule-linked status, missing evidence, and review-required qualitative issues without issuing a listing verdict.",
    primaryCta: "Request diagnostic demo",
    secondaryCta: "Open drafting workspace",
    overviewCta: "Back to overview",
    panelTitle: "Diagnostic status model",
    panelSubtitle: "Rule-linked analysis, not an approval decision",
    metrics: [
      ["Hard rules", "Quantitative thresholds"],
      ["Soft signals", "Expert review queue"],
      ["Output", "Gap report and audit trail"],
    ],
    statuses: [
      ["PASS", "Required value is present and meets the modeled threshold."],
      ["SHORTFALL", "Required value is present but below the modeled threshold."],
      ["MISSING_INPUT", "Issuer profile, financial, date, or FX input is absent."],
      ["INDETERMINATE", "A value exists but cannot be compared under current inputs."],
      ["REVIEW_REQUIRED", "Qualitative signal needs professional judgment before reliance."],
      ["DEFERRED_REVIEW", "Rule area is tracked but intentionally deferred from deterministic scoring."],
    ],
    sections: [
      {
        title: "Independent from drafting",
        text: "IPO Diagnostic sits beside Prospectus Drafting. It informs project planning and evidence requests, but it does not enter the Agent1 or Agent2 generation path.",
      },
      {
        title: "Deterministic hard engine",
        text: "Quantitative gates read versioned rules and explicit issuer/profile inputs. The hard path does not call an LLM or fabricate financial values.",
      },
      {
        title: "Review-aware soft layer",
        text: "Suitability, concentration, independence, continuity, WVR clarity, and specialist-technology factors are separated for expert review.",
      },
      {
        title: "Audit-first reporting",
        text: "Reports preserve rule references, threshold provenance, effective-date checks, missing inputs, and human signoff flags.",
      },
    ],
    pathwaysTitle: "Covered listing pathways",
    pathways: [
      "HKEX Main Board Rule 8.05",
      "Chapter 8A WVR quantitative subset",
      "Chapter 18C specialist technology framework",
      "Chapter 18A biotech and CSRC overseas filing stubs",
      "Qualitative substance signals for suitability review",
    ],
    relationTitle: "One IPO ecosystem, two product lines",
    relationText:
      "The diagnostic module answers whether issuer inputs are ready for listing-pathway analysis. The drafting workspace turns prepared evidence into prospectus sections. They are related through the IPO workflow while remaining operationally separate.",
    footerTitle: "Use diagnosis before document generation.",
    footerText:
      "Start with listing-pathway gaps, then move to evidence preparation and drafting when the deal team has the required inputs.",
  },
  zh: {
    eyebrow: "上市诊断",
    title: "在招股书起草前，先完成 IPO 准备度诊断。",
    description:
      "这是独立的确定性规则引擎，用发行人输入对照上市路径要求，输出规则状态、缺失证据和需要专业复核的定性事项；它不作上市裁定，也不给监管审批结论。",
    primaryCta: "预约诊断演示",
    secondaryCta: "打开起草工作台",
    overviewCta: "返回产品概览",
    panelTitle: "诊断状态模型",
    panelSubtitle: "规则关联分析，不是审批结论",
    metrics: [
      ["硬性规则", "量化阈值"],
      ["软性信号", "专家复核队列"],
      ["输出物", "缺口报告与审计轨迹"],
    ],
    statuses: [
      ["PASS", "必要数值存在，并达到已建模阈值。"],
      ["SHORTFALL", "必要数值存在，但低于已建模阈值。"],
      ["MISSING_INPUT", "缺少发行人档案、财务、日期或汇率输入。"],
      ["INDETERMINATE", "数值存在，但在当前输入下无法比较。"],
      ["REVIEW_REQUIRED", "定性信号需要专业判断后才能依赖。"],
      ["DEFERRED_REVIEW", "规则领域已跟踪，但有意不纳入确定性评分。"],
    ],
    sections: [
      {
        title: "与起草产品独立",
        text: "上市诊断位于招股书生成旁边。它服务项目规划和证据请求，但不进入 Agent1 或 Agent2 生成链路。",
      },
      {
        title: "确定性的硬规则引擎",
        text: "量化门槛来自版本化规则和明确的发行人/档案输入。硬规则路径不调用 LLM，也不自行编造财务数值。",
      },
      {
        title: "面向复核的软性层",
        text: "适格性、集中度、独立性、业务持续性、WVR 清晰度和特专科技因素会被单独放入专家复核队列。",
      },
      {
        title: "审计轨迹优先",
        text: "报告保留规则引用、阈值来源、有效日期核验、缺失输入和人工签署标记。",
      },
    ],
    pathwaysTitle: "覆盖的上市路径",
    pathways: [
      "港交所主板规则 8.05",
      "第 8A 章 WVR 量化子集",
      "第 18C 章特专科技公司框架",
      "第 18A 章生物科技公司与中国证监会境外上市备案结构化占位",
      "围绕适格性复核的定性实质信号",
    ],
    relationTitle: "一个 IPO 生态，两条产品线",
    relationText:
      "上市诊断回答发行人输入是否足以支持上市路径分析；招股书工作台把已准备证据转化为招股书章节。两者由 IPO 项目流程连接，但操作上保持独立。",
    footerTitle: "先诊断，再生成文档。",
    footerText:
      "先看上市路径缺口，再在资料足够时进入证据整理和招股书起草。",
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
    metrics: Array<[string, string]>;
    statuses: Array<[string, string]>;
    sections: Array<{ title: string; text: string }>;
    pathwaysTitle: string;
    pathways: string[];
    relationTitle: string;
    relationText: string;
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

export function EligibilityPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = {
    overview: locale === "zh" ? "/zh" : "/",
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="diagnostic" locale={locale} />

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
              <a href={contactHref} className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]">
                {t.primaryCta}
                <ArrowIcon />
              </a>
              <Link href={href.workspace} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.secondaryCta}
                <ArrowIcon />
              </Link>
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
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {t.metrics.map(([label, value]) => (
                <div key={label} className="bg-[#eef3ec] px-3 py-3">
                  <p className="text-xs font-semibold uppercase text-[#59655d]">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {t.statuses.map(([status, detail]) => (
                <div key={status} className="grid grid-cols-[132px_1fr] gap-3 border border-[#dde5da] bg-white px-3 py-2">
                  <p className="font-mono text-xs font-semibold text-[#0f766e]">{status}</p>
                  <p className="text-xs leading-5 text-[#647064]">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-4 md:grid-cols-4">
          {t.sections.map((item) => (
            <div key={item.title} className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t.pathwaysTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.relationText}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.pathways.map((item) => (
              <div key={item} className="flex gap-3 border border-[#d5ddd2] p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-[#0f766e] text-white">
                  <CheckIcon />
                </span>
                <p className="text-sm leading-6 text-[#334139]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="text-2xl font-semibold">{t.relationTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-[#637064]">{t.relationText}</p>
        </div>
        <div className="border border-[#d5ddd2] bg-[#17201b] p-5 text-white">
          <p className="text-lg font-semibold">{t.footerTitle}</p>
          <p className="mt-3 text-sm leading-6 text-[#dfe9e4]">{t.footerText}</p>
          <a href={contactHref} className="mt-5 inline-flex h-10 items-center gap-2 bg-[#f2c14e] px-4 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]">
            {t.primaryCta}
            <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
