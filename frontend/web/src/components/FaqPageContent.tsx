import Link from "next/link";
import { ArrowRight, CaretDown, FileText, FlowArrow, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const copy = {
  en: {
    eyebrow: "Workflow guide",
    title: "How AI Prospectus works",
    intro: "A practical guide to the workflow, the techniques behind it, and where professional review remains essential.",
    techniquesEyebrow: "Techniques in the workflow",
    techniquesTitle: "Structured assistance, not a black box.",
    techniques: [
      ["How are source documents prepared?", "PDF, DOCX, XLSX, and structured files are parsed and normalized into a consistent working format. The system preserves useful structure so later steps can work with sections rather than an undifferentiated pile of text."],
      ["How does section-level evidence and retrieval work?", "Prepared information is organized around disclosure sections. When a section is drafted, the system retrieves the most relevant evidence and keeps source context available for review."],
      ["What are Prompt orchestration and controlled generation?", "Each drafting stage uses a purpose-specific instruction and a defined output contract. Generation runs section by section so teams can inspect progress, intervene, and rerun a limited scope."],
      ["How are sources, missing information, and quality checks handled?", "The workflow retains source markers where available, surfaces missing inputs, and runs checks for coverage and consistency. A clean-looking answer is not treated as proof that every required fact exists."],
      ["What is the RCA feedback loop?", "Root-cause analysis compares generated sections with reference outcomes, classifies likely causes, and proposes Prompt improvements. Suggested changes remain subject to human review before adoption."],
      ["Can I use local and cloud models?", "Yes. Local models support private on-device work, while supported cloud providers can be used when their capabilities are preferred. Deployment and credentials remain explicit so teams can choose the appropriate control boundary."],
    ],
    guideEyebrow: "Using the system",
    guideTitle: "From configuration to Word draft in seven steps.",
    steps: [
      ["Configure a model", "Choose a cloud provider such as DeepSeek, or a local Qwen model. Save the settings and run the built-in connection or environment check."],
      ["Prepare source materials", "Collect issuer documents, financial files, and structured inputs. Use clear filenames and the latest reviewed versions."],
      ["Run the IPO diagnostic", "Assess listing-readiness facts and identify questions that require legal, financial, or sponsor judgment."],
      ["Prepare evidence", "Parse and organize materials, then review section coverage, source pointers, and quality warnings."],
      ["Draft section by section", "Generate a limited section, inspect it, and continue only when the evidence and direction are appropriate."],
      ["Review gaps and sources", "Resolve missing information, verify statements against primary documents, and record decisions requiring professional judgment."],
      ["Export to Word", "Export the reviewed working draft for the deal team’s established editing, approval, and filing process."],
    ],
    boundaryTitle: "Professional working draft, not professional advice",
    boundaryText: "AI Prospectus produces a professional working draft. It does not replace legal advice, audit assurance, sponsor due diligence, regulatory review, or a stock exchange listing decision.",
    ctaTitle: "Ready to begin?", ctaText: "Configure your model, then start with issuer materials in the workspace.",
    primary: "Open model settings", secondary: "Open workspace", footer: "Private AI tools for regulated document workflows.",
  },
  zh: {
    eyebrow: "工作流指南",
    title: "AI Prospectus 如何工作",
    intro: "用简明方式了解系统工作流、背后的核心方法，以及必须保留专业复核的环节。",
    techniquesEyebrow: "工作流采用的方法",
    techniquesTitle: "结构化辅助，而不是不可见的黑箱。",
    techniques: [
      ["源文档如何准备？", "系统会解析 PDF、DOCX、XLSX 和结构化文件，并统一为可处理的工作格式；同时尽量保留有用结构，让后续环节围绕章节工作，而不是面对一整堆无差别文本。"],
      ["章节证据组织与检索如何工作？", "准备后的信息会按披露章节组织。起草某个章节时，系统检索最相关的证据，并保留来源语境供复核。"],
      ["什么是 Prompt 编排与受控生成？", "不同起草阶段使用各自明确的指令和输出约束。内容按章节生成，团队可以查看进度、及时干预，并只重跑需要调整的范围。"],
      ["系统如何处理来源、缺失信息和质量检查？", "工作流会尽可能保留来源标记、提示缺失输入，并检查覆盖度与一致性。文字看起来完整，并不代表所有必要事实已经具备。"],
      ["RCA 反馈循环是什么？", "根因分析会将生成章节与参考结果对照，归类可能原因，并提出 Prompt 改进建议。任何建议都需要人工复核后才应采纳。"],
      ["可以使用本地模型和云端模型吗？", "可以。本地模型适合设备内的私有化处理；需要更强能力时，也可以选择受支持的云端服务商。部署方式与凭据保持明确，让团队选择合适的控制边界。"],
    ],
    guideEyebrow: "系统使用方法",
    guideTitle: "从配置模型到 Word 工作稿，共七步。",
    steps: [
      ["配置模型", "选择 DeepSeek 等云端服务商，或本地 Qwen 模型；保存设置并执行连接或本地环境检查。"],
      ["准备材料", "收集发行人文档、财务文件和结构化输入，使用清楚的文件名并确认版本已经过最新复核。"],
      ["运行上市诊断", "评估上市准备度事实，并识别需要法律、财务或保荐人专业判断的问题。"],
      ["准备证据", "解析和组织材料，然后检查章节覆盖、来源线索与质量提示。"],
      ["逐章起草", "先生成有限章节，检查内容与证据，再在方向合适时继续。"],
      ["复核缺失项与来源", "补充缺失信息，对照一手材料核实陈述，并记录需要专业判断的事项。"],
      ["导出 Word", "将完成复核的工作稿导出，进入项目团队既有的编辑、审批和申报流程。"],
    ],
    boundaryTitle: "专业工作稿，不是专业意见",
    boundaryText: "AI Prospectus 生成的是专业工作稿，不替代法律意见、审计保证、保荐人尽职调查、监管复核或证券交易所的上市决定。",
    ctaTitle: "可以开始了吗？", ctaText: "先配置模型，再从工作区中的发行人材料开始。",
    primary: "打开模型设置", secondary: "进入工作区", footer: "面向受监管文档流程的私有化 AI 工具。",
  },
} as const;

export function FaqPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const settingsHref = locale === "zh" ? "/zh/settings" : "/settings";
  const workspaceHref = locale === "zh" ? "/zh/workspace" : "/workspace";

  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#15221c]">
      <PublicNav active="faq" locale={locale} />
      <section className="border-b border-[#d7ddd8] bg-[#f7f9f6] pt-16">
        <div className="mx-auto max-w-[1380px] px-5 py-16 lg:px-8 lg:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#176b5b]">{t.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,5vw,5.2rem)] font-semibold leading-[1] tracking-[-0.05em]">{t.title}</h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#59675f] lg:text-lg">{t.intro}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 lg:grid-cols-[0.62fr_1.38fr] lg:px-8 lg:py-24">
        <div>
          <FlowArrow size={30} weight="duotone" className="text-[#176b5b]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#176b5b]">{t.techniquesEyebrow}</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">{t.techniquesTitle}</h2>
        </div>
        <div className="border-t border-[#cbd4cd]">
          {t.techniques.map(([question, answer], index) => (
            <details key={question} className="group border-b border-[#cbd4cd]" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-6 text-base font-semibold marker:content-none">
                <span>{question}</span><CaretDown size={18} weight="bold" className="shrink-0 text-[#176b5b] transition-transform group-open:rotate-180" />
              </summary>
              <p className="max-w-3xl pb-6 pr-8 text-sm leading-7 text-[#647068]">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-[#14231c] text-white">
        <div className="mx-auto max-w-[1380px] px-5 py-16 lg:px-8 lg:py-24">
          <FileText size={30} weight="duotone" className="text-[#8ac2b0]" />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#8ac2b0]">{t.guideEyebrow}</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.035em] lg:text-4xl">{t.guideTitle}</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/15 bg-white/15 md:grid-cols-2 xl:grid-cols-3">
            {t.steps.map(([title, text], index) => (
              <li key={title} className="bg-[#172a21] p-6">
                <span className="font-mono text-xs font-semibold text-[#8ac2b0]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#b8c9c0]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-7 rounded-xl border border-[#cbd4cd] bg-white p-7 lg:grid-cols-[auto_1fr] lg:p-10">
          <ShieldCheck size={34} weight="duotone" className="text-[#176b5b]" />
          <div><h2 className="text-2xl font-semibold tracking-[-0.025em]">{t.boundaryTitle}</h2><p className="mt-4 max-w-4xl text-sm leading-7 text-[#647068]">{t.boundaryText}</p></div>
        </div>
      </section>

      <section className="border-t border-[#cfd7d0] bg-[#e7ede8]">
        <div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-7 px-5 py-14 lg:flex-row lg:items-center lg:px-8">
          <div><h2 className="text-3xl font-semibold tracking-[-0.035em]">{t.ctaTitle}</h2><p className="mt-3 text-sm text-[#647068]">{t.ctaText}</p></div>
          <div className="flex flex-wrap gap-3"><Link href={settingsHref} className="inline-flex h-11 items-center gap-2 rounded-md bg-[#176b5b] px-5 text-sm font-bold text-white hover:bg-[#105548]">{t.primary}<ArrowRight size={16} weight="bold" /></Link><Link href={workspaceHref} className="inline-flex h-11 items-center rounded-md border border-[#bec9c0] bg-white px-5 text-sm font-bold hover:bg-[#f5f7f4]">{t.secondary}</Link></div>
        </div>
      </section>
      <footer className="bg-[#14231c] text-[#aebfb6]"><div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-5 py-7 text-xs sm:flex-row sm:items-center sm:justify-between lg:px-8"><span className="font-semibold text-white">AI Prospectus</span><span>{t.footer}</span><span>© 2026</span></div></footer>
    </main>
  );
}
