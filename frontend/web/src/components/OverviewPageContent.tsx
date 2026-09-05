import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, DownloadSimple, FileText, FlowArrow, Question, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const copy = {
  en: {
    eyebrow: "Private IPO document intelligence",
    title: "Draft regulated documents with evidence.",
    subtitle: "Turn issuer files into structured evidence, reviewable prospectus sections, and Word drafts inside a controlled workspace.",
    primary: "Open workspace", secondary: "Download app",
    proof: ["Local or controlled deployment", "Section-level review", "Word export"],
    workflowEyebrow: "A controlled drafting sequence", workflowTitle: "Evidence stays attached to the work.",
    workflowText: "The workspace separates preparation, drafting, verification, and export so teams can see what is complete and what still needs judgment.",
    steps: [
      { tag: "01", title: "Prepare issuer material", text: "Normalize PDF, DOCX, XLSX, and structured JSON into section-aware evidence." },
      { tag: "02", title: "Draft by disclosure section", text: "Generate one reviewable section at a time with progress and missing-input signals." },
      { tag: "03", title: "Review and deliver", text: "Refine the draft in context, then export a Word document for the deal team." },
    ],
    systemEyebrow: "Two focused products", systemTitle: "One deal context, clear boundaries.",
    diagnosticTitle: "IPO Diagnostic", diagnosticText: "Assess listing-readiness facts against pathway rules and isolate questions that require expert review.", diagnosticCta: "Explore diagnostic",
    draftingTitle: "Prospectus Drafting", draftingText: "Convert prepared evidence into structured sections without hiding generation state, coverage gaps, or source context.", draftingCta: "Explore drafting",
    principlesTitle: "Designed for professional review", principles: [
      ["Private by design", "Files can remain in a local or controlled environment."],
      ["Evidence aware", "Preparation records coverage, source pointers, and quality notes."],
      ["Review first", "Output is a working draft for professional judgment, not an approval decision."],
      ["Provider flexible", "Choose a supported model provider from one explicit settings surface."],
    ],
    faqEyebrow: "How the workflow works", faqTitle: "Understand the system before you start.",
    faqText: "See the techniques used across the workflow, the seven-step operating guide, and the boundaries of AI-generated working drafts.", faqCta: "Read the FAQ",
    closingTitle: "Move from source files to a reviewable draft.", closingText: "Start in the workspace or install the private desktop application.",
    footer: "Private AI tools for regulated document workflows.",
  },
  zh: {
    eyebrow: "私有化 IPO 文档智能工作台",
    title: "让证据始终处在监管文档起草视野内。",
    subtitle: "将发行人材料转化为结构化证据、可复核招股书章节和 Word 工作稿。",
    primary: "打开工作台", secondary: "下载应用",
    proof: ["本地或受控部署", "章节级复核", "Word 导出"],
    workflowEyebrow: "受控的起草流程", workflowTitle: "证据与工作过程保持连接。",
    workflowText: "工作台把材料准备、章节起草、核验和导出清楚分开，让团队随时看到完成进度与待判断事项。",
    steps: [
      { tag: "01", title: "准备发行人材料", text: "将 PDF、DOCX、XLSX 与结构化 JSON 整理为面向章节的证据。" },
      { tag: "02", title: "按披露章节起草", text: "逐章生成可复核内容，并展示进度与缺失输入。" },
      { tag: "03", title: "复核并交付", text: "在上下文中修改工作稿，再导出 Word 文档供项目团队审阅。" },
    ],
    systemEyebrow: "两个聚焦产品", systemTitle: "共享项目语境，保持清晰边界。",
    diagnosticTitle: "上市诊断", diagnosticText: "根据上市路径规则评估准备度事实，并单独列出需要专家复核的问题。", diagnosticCta: "查看上市诊断",
    draftingTitle: "招股书起草", draftingText: "把准备好的证据转化为结构化章节，同时清楚保留生成状态、覆盖缺口和来源语境。", draftingCta: "查看起草产品",
    principlesTitle: "为专业复核而设计", principles: [
      ["私有化优先", "文件可以保留在本地或受控环境中。"],
      ["证据感知", "材料准备会记录覆盖情况、来源线索与质量提示。"],
      ["复核优先", "输出是供专业判断的工作稿，不模拟审批结论。"],
      ["模型可选", "通过明确的设置界面选择受支持的模型供应商。"],
    ],
    faqEyebrow: "了解工作流程", faqTitle: "开始之前，先了解系统如何工作。",
    faqText: "查看工作流采用的核心方法、七步使用指南，以及 AI 生成专业工作稿的适用边界。", faqCta: "阅读常见问题",
    closingTitle: "从源文件推进到可复核工作稿。", closingText: "立即进入工作台，或安装私有桌面应用。",
    footer: "面向受监管文档流程的私有化 AI 工具。",
  },
} as const;

export function OverviewPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = {
    diagnostic: locale === "zh" ? "/zh/diagnostic" : "/diagnostic",
    drafting: locale === "zh" ? "/zh/drafting" : "/drafting",
    download: locale === "zh" ? "/zh/download" : "/download",
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
    faq: locale === "zh" ? "/zh/faq" : "/faq",
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f5f1] text-[#15221c]">
      <PublicNav active="overview" locale={locale} />

      <section className="relative border-b border-[#d7ddd8] bg-[#f7f9f6] pt-16">
        <div className="absolute inset-y-0 right-0 hidden w-[38%] bg-[#e7ede8] lg:block" />
        <div className="relative mx-auto grid max-w-[1380px] gap-12 px-5 pb-16 pt-16 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:pb-24 lg:pt-24">
          <div className="flex max-w-2xl flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b5b]">{t.eyebrow}</p>
            <h1 className="mt-6 text-[clamp(2.75rem,5.3vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#13231c]">{t.title}</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#59675f] lg:text-lg">{t.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href.workspace} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#176b5b] px-5 text-sm font-bold text-white transition-colors hover:bg-[#105548]">
                {t.primary}<ArrowRight size={17} weight="bold" />
              </Link>
              <Link href={href.download} className="inline-flex h-11 items-center gap-2 rounded-md border border-[#cbd4cd] bg-white px-5 text-sm font-bold text-[#223129] transition-colors hover:bg-[#edf1ed]">
                <DownloadSimple size={17} weight="bold" />{t.secondary}
              </Link>
            </div>
            <ul className="mt-10 grid gap-3 border-t border-[#d7ddd8] pt-5 text-xs font-semibold text-[#59675f] sm:grid-cols-3">
              {t.proof.map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle size={17} weight="fill" className="text-[#176b5b]" />{item}</li>)}
            </ul>
          </div>

          <div className="relative self-center lg:pl-6">
            <div className="absolute -left-6 top-10 hidden h-[74%] w-px bg-[#b8c5bb] lg:block" />
            <div className="overflow-hidden rounded-[14px] border border-[#cbd4cd] bg-white p-2 shadow-[0_28px_70px_rgba(26,50,39,0.15)]">
              <div className="flex h-9 items-center gap-1.5 border-b border-[#e1e5e1] px-3">
                <span className="h-2 w-2 rounded-full bg-[#b23a32]" /><span className="h-2 w-2 rounded-full bg-[#c79135]" /><span className="h-2 w-2 rounded-full bg-[#176b5b]" />
                <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a857e]">AI Prospectus Workspace</span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden bg-[#edf1ed]">
                <Image src="/workspace-preview.png" alt="AI Prospectus drafting workspace" fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover object-top" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-10 px-5 py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-28">
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b5b]">{t.workflowEyebrow}</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] lg:text-5xl">{t.workflowTitle}</h2>
          <p className="mt-5 text-sm leading-7 text-[#647068]">{t.workflowText}</p>
        </div>
        <ol className="border-t border-[#cfd7d0]">
          {t.steps.map((item) => (
            <li key={item.tag} className="grid gap-3 border-b border-[#cfd7d0] py-7 sm:grid-cols-[64px_0.7fr_1.3fr] sm:items-start">
              <span className="font-mono text-xs font-semibold text-[#176b5b]">{item.tag}</span>
              <h3 className="text-lg font-semibold tracking-[-0.02em]">{item.title}</h3>
              <p className="text-sm leading-6 text-[#647068]">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#14231c] text-white">
        <div className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#82b8a8]">{t.systemEyebrow}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] lg:text-5xl">{t.systemTitle}</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[14px] border border-white/15 bg-white/15 lg:grid-cols-[0.85fr_1.15fr]">
            <article className="bg-[#172a21] p-7 lg:p-10">
              <ShieldCheck size={28} weight="duotone" className="text-[#8ac2b0]" />
              <h3 className="mt-10 text-2xl font-semibold">{t.diagnosticTitle}</h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-[#b8c9c0]">{t.diagnosticText}</p>
              <Link href={href.diagnostic} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#a3d2c4]">{t.diagnosticCta}<ArrowRight size={16} weight="bold" /></Link>
            </article>
            <article className="bg-[#1c3328] p-7 lg:p-10">
              <FileText size={28} weight="duotone" className="text-[#8ac2b0]" />
              <h3 className="mt-10 text-2xl font-semibold">{t.draftingTitle}</h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[#b8c9c0]">{t.draftingText}</p>
              <Link href={href.drafting} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-[#a3d2c4]">{t.draftingCta}<ArrowRight size={16} weight="bold" /></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <div><FlowArrow size={30} weight="duotone" className="text-[#176b5b]" /><h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">{t.principlesTitle}</h2></div>
          <div className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {t.principles.map(([title, text], index) => (
              <article key={title} className="border-t border-[#cfd7d0] pt-5">
                <span className="font-mono text-[11px] font-semibold text-[#176b5b]">0{index + 1}</span>
                <h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#647068]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#cfd7d0] bg-white">
        <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
          <div>
            <Question size={30} weight="duotone" className="text-[#176b5b]" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#176b5b]">{t.faqEyebrow}</p>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">{t.faqTitle}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#647068]">{t.faqText}</p>
            <Link href={href.faq} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#176b5b] hover:text-[#105548]">{t.faqCta}<ArrowRight size={16} weight="bold" /></Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[#cfd7d0] bg-[#e7ede8]">
        <div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-8 px-5 py-16 lg:flex-row lg:items-center lg:px-8">
          <div><h2 className="text-3xl font-semibold tracking-[-0.035em]">{t.closingTitle}</h2><p className="mt-3 text-sm text-[#647068]">{t.closingText}</p></div>
          <div className="flex flex-wrap gap-3"><Link href={href.workspace} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#176b5b] px-5 text-sm font-bold text-white hover:bg-[#105548]">{t.primary}<ArrowRight size={17} weight="bold" /></Link><Link href={href.download} className="inline-flex h-11 items-center rounded-md border border-[#bec9c0] bg-white px-5 text-sm font-bold hover:bg-[#f5f7f4]">{t.secondary}</Link></div>
        </div>
      </section>

      <footer className="bg-[#14231c] text-[#aebfb6]"><div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-5 py-7 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-8"><span className="font-semibold text-white">AI Prospectus</span><span>{t.footer}</span><span>© 2026</span></div></footer>
    </main>
  );
}
