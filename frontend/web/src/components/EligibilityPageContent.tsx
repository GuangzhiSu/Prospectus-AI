import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=Listing%20eligibility%20diagnostic%20demo";

const copy = {
  en: {
    navLocale: "en",
    eyebrow: "Listing pathway diagnostic",
    title: "IPO eligibility diagnosis before drafting starts.",
    description:
      "A standalone rule engine for checking issuer inputs against listing pathway criteria. It reports pass, shortfall, missing input, indeterminate, and not evaluated items without issuing a listing verdict.",
    primaryCta: "Request diagnostic demo",
    ecosystemCta: "Back to ecosystem",
    panelTitle: "Diagnostic snapshot",
    panelSubtitle: "Rule-linked status, not an approval decision",
    metrics: [
      ["Hard gates", "Quantitative thresholds"],
      ["Soft signals", "Qualitative probes"],
      ["Output", "Report and audit trail"],
    ],
    statuses: [
      ["PASS", "Converted value is present and meets the threshold."],
      ["SHORTFALL", "Converted value is present but falls below the threshold."],
      ["MISSING_INPUT", "Required issuer or profile input is absent."],
      ["INDETERMINATE", "A value exists but cannot be compared, often because FX or dates are missing."],
      ["NOT_EVALUATED", "Rule exists but is intentionally deferred, usually for qualitative assessment."],
    ],
    sections: [
      {
        title: "Separated from prospectus generation",
        text: "Eligibility diagnosis sits beside the drafting product. It can inform deal planning and data requests, but it does not enter the Agent1 or Agent2 drafting path.",
      },
      {
        title: "Deterministic hard engine",
        text: "Quantitative gates read versioned YAML rules and explicit issuer/profile inputs. The hard path does not call an LLM or fabricate financial values.",
      },
      {
        title: "Soft layer prepared for review",
        text: "Qualitative signals such as suitability, concentration, independence, continuity, and WVR clarity are modeled as separate soft gates for later retrieval and expert review.",
      },
      {
        title: "Audit-first reporting",
        text: "Reports preserve rule references, threshold provenance, effective-date checks, and human signoff flags so reviewers can see what was checked and what remains open.",
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
    productRelationTitle: "One ecosystem, two products",
    productRelationText:
      "The drafting workspace turns prepared evidence into prospectus sections. The eligibility diagnostic examines whether issuer data is ready for listing-pathway analysis. They share the same regulated-finance context while keeping their workflows independent.",
    footerTitle: "Use diagnosis before document generation.",
    footerText:
      "Start with listing-pathway gaps, then move to evidence preparation and drafting when the deal team has the required inputs.",
  },
  zh: {
    navLocale: "zh",
    eyebrow: "公司上市路径诊断",
    title: "在招股书起草前，先看发行人上市条件缺口。",
    description:
      "这是独立于招股书生成的规则诊断引擎，用发行人输入和上市规则路径做比对，输出满足、短板、缺输入、不可判断和暂不评价事项；它不作上市裁定，也不给通过/不通过结论。",
    primaryCta: "预约诊断演示",
    ecosystemCta: "返回生态首页",
    panelTitle: "诊断快照",
    panelSubtitle: "规则口径状态，不是审批结论",
    metrics: [
      ["硬性门槛", "量化阈值判断"],
      ["软性信号", "定性事项探针"],
      ["输出物", "报告与审计轨迹"],
    ],
    statuses: [
      ["PASS", "数值存在，并达到规则阈值。"],
      ["SHORTFALL", "数值存在，但低于规则阈值。"],
      ["MISSING_INPUT", "发行人或运行档案中缺少必要输入。"],
      ["INDETERMINATE", "数值存在但暂不能比较，常见原因是缺少汇率或日期。"],
      ["NOT_EVALUATED", "规则已建模但本阶段有意暂不评价，通常用于定性事项。"],
    ],
    sections: [
      {
        title: "与招股书生成分离",
        text: "上市诊断是招股书生成旁边的一条独立产品线。它可以服务项目规划和资料清单，但不进入 Agent1/Agent2 起草链路。",
      },
      {
        title: "确定性的硬规则引擎",
        text: "量化门槛来自版本化 YAML 规则和明确的发行人/档案输入。硬规则路径不调用 LLM，也不自行编造财务计算结果。",
      },
      {
        title: "为专业复核准备的软性层",
        text: "适格性、客户/供应商集中度、独立性、业务持续性和 WVR 清晰度等定性事项被放在单独软性层，便于后续接入检索和专家复核。",
      },
      {
        title: "以审计轨迹为先",
        text: "报告保留规则引用、阈值来源、有效日期核验和人工签署标记，让审阅者知道哪些已检查，哪些仍需补充。",
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
    productRelationTitle: "一个生态，两条产品线",
    productRelationText:
      "招股书工作区把已整理证据转化为章节草稿；上市诊断模块检查发行人数据是否足以支持上市路径分析。两者处在同一个监管金融生态里，但工作流保持独立。",
    footerTitle: "先诊断，再生成文档。",
    footerText:
      "先看上市路径缺口，再在资料足够时进入证据整理和招股书起草。",
  },
} satisfies Record<Locale, {
  navLocale: Locale;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  ecosystemCta: string;
  panelTitle: string;
  panelSubtitle: string;
  metrics: Array<[string, string]>;
  statuses: Array<[string, string]>;
  sections: Array<{ title: string; text: string }>;
  pathwaysTitle: string;
  pathways: string[];
  productRelationTitle: string;
  productRelationText: string;
  footerTitle: string;
  footerText: string;
}>;

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
  const homeHref = locale === "zh" ? "/zh" : "/";

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#171d1b]">
      <PublicNav active="eligibility" locale={t.navLocale} />

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
              <a
                href={contactHref}
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                {t.primaryCta}
                <ArrowIcon />
              </a>
              <Link
                href={homeHref}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.ecosystemCta}
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
                <div key={status} className="grid grid-cols-[120px_1fr] gap-3 border border-[#dde5da] bg-white px-3 py-2">
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
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.productRelationText}</p>
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
          <h2 className="text-2xl font-semibold">{t.productRelationTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-[#637064]">{t.productRelationText}</p>
        </div>
        <div className="border border-[#d5ddd2] bg-[#17201b] p-5 text-white">
          <p className="text-lg font-semibold">{t.footerTitle}</p>
          <p className="mt-3 text-sm leading-6 text-[#dfe9e4]">{t.footerText}</p>
          <a
            href={contactHref}
            className="mt-5 inline-flex h-10 items-center gap-2 bg-[#f2c14e] px-4 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]"
          >
            {t.primaryCta}
            <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
