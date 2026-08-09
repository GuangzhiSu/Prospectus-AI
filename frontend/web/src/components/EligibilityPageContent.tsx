import Link from "next/link";
import { ArrowDown, ArrowRight, Brain, CheckCircle, Database, FileText, Scales, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";
const contactHref = "mailto:contact@ai-prospectus.com?subject=IPO%20Diagnostic%20demo";

const copy = {
  en: {
    eyebrow: "IPO Diagnostic architecture", title: "Extract facts with AI. Compare thresholds with rules.",
    subtitle: "Documents become resolved facts before deterministic listing tests run. Missing values stay missing instead of being guessed.",
    primary: "Open diagnostic", secondary: "Request demo",
    architectureTitle: "One fact model connects two input paths.", architectureText: "Manual fields and extracted documents resolve into CompanyProfile. The same versioned rule engine then produces an auditable gap report.",
    inputs: [["Structured fields", "Issuer teams enter fixed financial and continuity values directly."], ["Uploaded materials", "Agent1 and an LLM extract facts from documents, financials, and tables."]],
    profile: ["CompanyProfile", "A shared resolved-value object. Missing values become MISSING_INPUT."],
    outputs: [["Hard rule engine", "Numeric thresholds are deterministic, repeatable, and versioned."], ["Soft signal queue", "Qualitative issues remain queued for retrieval and professional review."], ["Gap report", "The result shows evidence, shortfalls, missing inputs, and review items without a listing verdict."]],
    principleTitle: "Hard thresholds deliberately avoid model judgment.", principleText: "Profit, revenue, market capitalisation, continuity, and foreign-exchange gates are comparisons, not language tasks. The engine never invents a number to complete a test.",
    statusesTitle: "A status model built for review", statuses: [["PASS", "A resolved value meets the modeled threshold."], ["SHORTFALL", "A resolved value falls below the threshold."], ["MISSING_INPUT", "A required value was not supplied or resolved."], ["INDETERMINATE", "A comparison lacks date or exchange-rate context."], ["REVIEW_REQUIRED", "Professional judgment is needed."], ["DEFERRED_REVIEW", "A modeled qualitative area is tracked but not scored."]],
    scopeTitle: "Modeled pathways", pathways: ["HKEX Main Board Rule 8.05", "Chapter 8A WVR quantitative subset", "Chapter 18C specialist technology", "Chapter 18A and CSRC filing placeholders", "Seven qualitative substance signals"],
    closing: "Inspect listing-readiness gaps without turning the model into the rulebook.",
  },
  zh: {
    eyebrow: "上市诊断架构", title: "用 AI 抽取事实，用规则比较阈值。",
    subtitle: "文档先转化为已解析事实，再运行确定性上市测试。缺失值保持缺失，不通过猜测补全。",
    primary: "打开诊断工作台", secondary: "预约演示",
    architectureTitle: "一个事实模型连接两种输入路径。", architectureText: "手填字段与文档抽取结果都会进入 CompanyProfile，再由同一套版本化规则引擎生成可审计缺口报告。",
    inputs: [["结构化字段", "发行人团队直接填写固定财务与持续性数据。"], ["上传材料", "Agent1 与 LLM 从文档、财报和表格中抽取事实。"]],
    profile: ["CompanyProfile", "共享的已解析事实对象。缺失值会成为 MISSING_INPUT。"],
    outputs: [["硬规则引擎", "数字阈值保持确定、可复现并经过版本管理。"], ["软信号队列", "定性问题进入检索与专业复核队列。"], ["缺口报告", "展示证据、短板、缺失输入和复核事项，但不输出上市裁决。"]],
    principleTitle: "硬阈值故意不让模型参与判断。", principleText: "盈利、收入、市值、持续性和汇率门槛都是比较任务，不是语言任务。引擎不会为了完成测试而编造数字。",
    statusesTitle: "为复核设计的状态模型", statuses: [["PASS", "已解析值达到已建模阈值。"], ["SHORTFALL", "已解析值低于阈值。"], ["MISSING_INPUT", "必要数值尚未提供或解析。"], ["INDETERMINATE", "比较缺少日期或汇率语境。"], ["REVIEW_REQUIRED", "需要专业判断。"], ["DEFERRED_REVIEW", "定性领域已跟踪但不评分。"]],
    scopeTitle: "已建模路径", pathways: ["港交所主板规则 8.05", "第 8A 章 WVR 量化子集", "第 18C 章特专科技公司", "第 18A 章与中国证监会备案占位", "七类定性实质信号"],
    closing: "检查上市准备度缺口，同时不让模型替代规则。",
  },
} as const;

export function EligibilityPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const workspace = locale === "zh" ? "/zh/diagnostic/workspace" : "/diagnostic/workspace";
  const inputIcons = [Database, FileText];
  const outputIcons = [Scales, Brain, ShieldCheck];
  return <main className="min-h-screen bg-[#f3f5f1] text-[#15221c]">
    <PublicNav active="eligibility" locale={locale} />
    <section className="border-b border-[var(--border)] bg-[#f7f9f6] pt-16"><div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-24"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{t.eyebrow}</p><h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] md:text-6xl">{t.title}</h1><p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">{t.subtitle}</p><div className="mt-8 flex flex-wrap gap-3"><Link href={workspace} className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white">{t.primary}<ArrowRight size={17} weight="bold" /></Link><a href={contactHref} className="inline-flex h-11 items-center rounded-md border border-[var(--border)] bg-white px-5 text-sm font-bold">{t.secondary}</a></div></div><div className="rounded-[14px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)]"><div className="grid gap-3 sm:grid-cols-2">{t.inputs.map(([title,text],i)=>{const Icon=inputIcons[i];return <article key={title} className={`rounded-[10px] p-5 ${i ? "bg-[#e5efeb]" : "bg-[#f0f2ef]"}`}><Icon size={23} weight="duotone" className="text-[var(--accent)]"/><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{text}</p></article>})}</div><ArrowDown size={20} weight="bold" className="mx-auto my-4 text-[var(--accent)]"/><div className="rounded-[10px] bg-[#173128] p-5 text-white"><p className="font-semibold">{t.profile[0]}</p><p className="mt-2 text-xs leading-5 text-[#bfd0c7]">{t.profile[1]}</p></div></div></div></section>
    <section className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8 lg:py-28"><div className="max-w-3xl"><h2 className="text-3xl font-semibold tracking-[-0.035em] lg:text-5xl">{t.architectureTitle}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)]">{t.architectureText}</p></div><div className="mt-12 grid gap-5 lg:grid-cols-[1.05fr_0.9fr_1.05fr]">{t.outputs.map(([title,text],i)=>{const Icon=outputIcons[i];return <article key={title} className={`rounded-[14px] border border-[var(--border)] p-7 ${i===1?"bg-[#e5efeb]":"bg-white"}`}><Icon size={25} weight="duotone" className="text-[var(--accent)]"/><h3 className="mt-8 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p></article>})}</div></section>
    <section className="border-y border-[var(--border)] bg-[#e7ede8]"><div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"><div><Scales size={30} weight="duotone" className="text-[var(--accent)]"/><h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">{t.principleTitle}</h2><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{t.principleText}</p></div><div><h2 className="text-xl font-semibold">{t.statusesTitle}</h2><div className="mt-6 grid gap-4 sm:grid-cols-2">{t.statuses.map(([status,text])=><article key={status} className="rounded-[10px] bg-white p-5"><p className="font-mono text-xs font-bold text-[var(--accent)]">{status}</p><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{text}</p></article>)}</div></div></div></section>
    <section className="mx-auto grid max-w-[1380px] gap-10 px-5 py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8"><h2 className="text-3xl font-semibold tracking-[-0.035em]">{t.scopeTitle}</h2><div className="grid gap-4 sm:grid-cols-2">{t.pathways.map(item=><div key={item} className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] bg-white p-5"><CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-[var(--accent)]"/><p className="text-sm font-semibold leading-6">{item}</p></div>)}</div></section>
    <section className="border-t border-[var(--border)] bg-[#e7ede8]"><div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-6 px-5 py-16 lg:flex-row lg:items-center lg:px-8"><h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.035em]">{t.closing}</h2><Link href={workspace} className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white">{t.primary}<ArrowRight size={17} weight="bold"/></Link></div></section>
  </main>;
}
