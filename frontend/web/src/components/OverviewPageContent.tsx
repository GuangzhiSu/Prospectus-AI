import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=AI%20Prospectus%20demo%20request";

const copy = {
  en: {
    eyebrow: "Private IPO AI workspace",
    title: "From IPO readiness to prospectus-ready drafts.",
    subtitle:
      "AI Prospectus combines an independent IPO diagnostic module with a controlled drafting workspace for evidence preparation, section generation, review notes, and Word export.",
    primaryCta: "Run IPO diagnostic",
    secondaryCta: "Open workspace",
    tertiaryCta: "Download app",
    workflowTitle: "IPO AI Workflow",
    workflowSubtitle: "Independent modules inside one regulated-finance ecosystem",
    steps: [
      {
        title: "Diagnostic",
        text: "Check issuer facts against listing pathway rules, flag shortfalls, and separate expert-review items.",
      },
      {
        title: "Evidence",
        text: "Prepare issuer materials into section-aware facts, source pointers, and data quality notes.",
      },
      {
        title: "Drafting",
        text: "Generate prospectus sections with verification discipline and exportable review drafts.",
      },
    ],
    builtTitle: "Built for regulated IPO workflows",
    builtText:
      "The site now presents AI Prospectus as a private IPO workspace rather than a single document generator: diagnostic, evidence, drafting, and review remain distinct while sharing the same disclosure context.",
    cards: [
      {
        title: "Private data workspace",
        text: "Issuer files can stay in a local or controlled environment while the app surfaces processing status and model configuration clearly.",
      },
      {
        title: "IPO diagnostic",
        text: "The listing readiness module is separate from drafting and reports rule-linked gaps without pretending to issue a listing approval.",
      },
      {
        title: "Section-aware drafting",
        text: "Evidence, missing information, generation state, and final output are organized around prospectus sections.",
      },
      {
        title: "Audit-first output",
        text: "The workspace favors review notes, source awareness, and export readiness over opaque one-shot chatbot answers.",
      },
    ],
    ecosystemTitle: "One ecosystem, separate products",
    ecosystemText:
      "IPO Diagnostic helps a deal team understand listing-readiness gaps. Prospectus Drafting turns prepared evidence into a reviewable document. They are connected by the deal workflow, not merged into one black box.",
    diagnosticCta: "Explore diagnostic",
    draftingCta: "Explore drafting",
    downloadCta: "Get private workspace",
    demoCta: "Request demo",
    githubCta: "GitHub",
  },
  zh: {
    eyebrow: "私有化 IPO AI 工作台",
    title: "从上市诊断到招股书初稿生成。",
    subtitle:
      "AI Prospectus 将独立的上市诊断模块与受控招股书起草工作台放在同一生态中，覆盖证据整理、章节生成、复核提示和 Word 导出。",
    primaryCta: "进入上市诊断",
    secondaryCta: "打开工作台",
    tertiaryCta: "下载应用",
    workflowTitle: "上市 AI 工作流",
    workflowSubtitle: "同一监管金融生态中的独立模块",
    steps: [
      {
        title: "诊断",
        text: "用发行人事实对照上市路径规则，标记短板，并把需要专家复核的事项单独呈现。",
      },
      {
        title: "证据",
        text: "把发行人材料整理为面向章节的事实、来源线索和数据质量提示。",
      },
      {
        title: "起草",
        text: "生成招股书章节，保留核验纪律，并导出可审阅的工作稿。",
      },
    ],
    builtTitle: "为受监管的上市文件流程而设计",
    builtText:
      "官网现在把 AI Prospectus 定位为私有化 IPO 工作台，而不是单一文档生成器：诊断、证据、起草和复核彼此独立，但共享同一披露语境。",
    cards: [
      {
        title: "私有数据工作区",
        text: "发行人文件可以保留在本地或受控环境中，同时清楚展示处理状态与模型配置。",
      },
      {
        title: "上市诊断",
        text: "上市准备度模块与招股书起草分离，输出规则关联缺口，而不是模拟监管审批结论。",
      },
      {
        title: "章节感知起草",
        text: "证据、缺失信息、生成状态和最终输出都围绕招股书章节组织。",
      },
      {
        title: "审计优先输出",
        text: "工作台强调复核提示、来源意识和导出准备度，而不是不透明的一次性聊天回答。",
      },
    ],
    ecosystemTitle: "一个生态，独立产品线",
    ecosystemText:
      "上市诊断帮助项目团队理解上市准备度缺口；招股书生成把准备好的证据转化为可审阅文档。两者由项目流程连接，而不是融合成一个黑箱。",
    diagnosticCta: "查看上市诊断",
    draftingCta: "查看招股书生成",
    downloadCta: "获取私有工作台",
    demoCta: "预约演示",
    githubCta: "GitHub",
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
    workflowTitle: string;
    workflowSubtitle: string;
    steps: Array<{ title: string; text: string }>;
    builtTitle: string;
    builtText: string;
    cards: Array<{ title: string; text: string }>;
    ecosystemTitle: string;
    ecosystemText: string;
    diagnosticCta: string;
    draftingCta: string;
    downloadCta: string;
    demoCta: string;
    githubCta: string;
  }
>;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

export function OverviewPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = {
    diagnostic: locale === "zh" ? "/zh/diagnostic" : "/diagnostic",
    drafting: locale === "zh" ? "/zh/drafting" : "/drafting",
    download: locale === "zh" ? "/zh/download" : "/download",
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="overview" locale={locale} />

      <section className="relative overflow-hidden bg-[#17201b] text-white">
        <div className="absolute inset-0 opacity-[0.12]">
          <Image src="/app-icon-512.png" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[#f7f8f2]" />
        <div className="relative mx-auto grid min-h-[720px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-24 pt-28 md:grid-cols-[1fr_450px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dfe9e4]">
              {t.eyebrow}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dfe9e4] md:text-lg">
              {t.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={href.diagnostic}
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                {t.primaryCta}
                <ArrowIcon />
              </Link>
              <Link
                href={href.workspace}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.secondaryCta}
                <ArrowIcon />
              </Link>
              <Link
                href={href.download}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <DownloadIcon />
                {t.tertiaryCta}
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f8faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">{t.workflowTitle}</p>
                <p className="text-xs text-[#647064]">{t.workflowSubtitle}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {t.steps.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[34px_1fr] gap-3 border-b border-[#e2e7df] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#0f766e] text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#647064]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t.builtTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.builtText}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {t.cards.map((card) => (
              <div key={card.title} className="border border-[#d5ddd2] bg-white p-5">
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="mt-3 text-sm leading-6 text-[#637064]">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold">{t.ecosystemTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">{t.ecosystemText}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href={href.diagnostic} className="flex items-center justify-between gap-2 border border-[#d5ddd2] p-4 text-sm font-semibold hover:bg-[#f7f8f2]">
              {t.diagnosticCta}
              <ArrowIcon />
            </Link>
            <Link href={href.drafting} className="flex items-center justify-between gap-2 border border-[#d5ddd2] p-4 text-sm font-semibold hover:bg-[#f7f8f2]">
              {t.draftingCta}
              <ArrowIcon />
            </Link>
            <Link href={href.download} className="flex items-center justify-between gap-2 border border-[#17201b] bg-[#17201b] p-4 text-sm font-semibold text-white hover:bg-[#2b3a32]">
              {t.downloadCta}
              <ArrowIcon />
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 border-t border-[#d5ddd2] px-6 py-10 md:flex-row md:items-center">
          <a href={contactHref} className="inline-flex h-11 w-fit items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]">
            {t.demoCta}
            <ArrowIcon />
          </a>
          <a href="https://github.com/GuangzhiSu/Prospectus-AI" className="inline-flex h-11 w-fit items-center gap-2 border border-[#c9d2c7] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
            {t.githubCta}
            <ArrowIcon />
          </a>
        </div>
      </section>
    </main>
  );
}
