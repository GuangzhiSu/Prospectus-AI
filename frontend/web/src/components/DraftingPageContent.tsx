import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const copy = {
  en: {
    eyebrow: "Prospectus drafting workspace",
    title: "Turn prepared IPO evidence into prospectus-ready drafts.",
    subtitle:
      "The drafting product starts after diagnostic and evidence preparation. It organizes issuer materials by prospectus section, generates reviewable drafts, and keeps export behind completion and review gates.",
    primaryCta: "Open web workspace",
    secondaryCta: "Download private app",
    settingsCta: "Configure model settings",
    processTitle: "Drafting process",
    processSubtitle: "A controlled generation path for sponsor-counsel review",
    steps: [
      ["Scope disclosure sections", "Work from a prospectus section map rather than a free-form chat thread."],
      ["Upload issuer materials", "Use spreadsheets or structured JSON as the controlled source set."],
      ["Prepare evidence", "Agent1 separates facts, source files, gaps, and quality flags before drafting begins."],
      ["Draft sections", "Agent2 generates each section in prospectus order with phase-level progress."],
      ["Review and revise", "Counsel can expand, modify, regenerate, and inspect missing-input notes by section."],
      ["Export review draft", "Word export becomes the controlled handoff once draft sections are ready."],
    ],
    guardrailTitle: "Not the diagnostic product",
    guardrailText:
      "Prospectus Drafting does not decide whether a company can list. It uses prepared evidence to create draft disclosure text and review materials for professional judgment.",
    cards: [
      ["Section state", "Complete, running, missing, thin draft, and review-required states keep generation status visible."],
      ["Evidence linkage", "Source files, missing information requests, and data quality flags stay near the draft surface."],
      ["Private deployment", "Run through the web workspace during development or distribute the packaged app for controlled use."],
    ],
  },
  zh: {
    eyebrow: "招股书生成工作台",
    title: "把已准备的 IPO 证据转化为招股书初稿。",
    subtitle:
      "招股书生成产品从诊断和证据准备之后开始。它按招股书章节组织发行人材料，生成可复核草稿，并在完成与复核门槛之后再进入导出。",
    primaryCta: "打开网页工作台",
    secondaryCta: "下载私有应用",
    settingsCta: "配置模型设置",
    processTitle: "起草流程",
    processSubtitle: "面向保荐人律师复核的受控生成路径",
    steps: [
      ["确定披露章节", "基于招股书章节地图工作，而不是自由聊天线程。"],
      ["上传发行人材料", "用表格或结构化 JSON 作为受控来源集。"],
      ["准备证据", "Agent1 在起草前整理事实、来源文件、缺口和质量标记。"],
      ["生成章节", "Agent2 按招股书顺序生成章节，并显示阶段级进度。"],
      ["复核与修订", "律师可以展开、修改、重新生成，并按章节查看缺失信息提示。"],
      ["导出审阅稿", "章节准备好后，Word 导出作为受控交付物。"],
    ],
    guardrailTitle: "它不是上市诊断产品",
    guardrailText:
      "招股书生成不判断公司能否上市。它用已准备的证据生成披露文本和复核材料，供专业人士判断。",
    cards: [
      ["章节状态", "完成、生成中、缺失、草稿较薄和需复核状态，让生成进度清楚可见。"],
      ["证据关联", "来源文件、缺失信息请求和数据质量标记会靠近草稿界面呈现。"],
      ["私有化部署", "开发阶段使用网页工作台，也可以分发打包应用进行受控使用。"],
    ],
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    settingsCta: string;
    processTitle: string;
    processSubtitle: string;
    steps: Array<[string, string]>;
    guardrailTitle: string;
    guardrailText: string;
    cards: Array<[string, string]>;
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

export function DraftingPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = {
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
    download: locale === "zh" ? "/zh/download" : "/download",
    settings: locale === "zh" ? "/zh/settings" : "/settings",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="drafting" locale={locale} />

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
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dfe9e4] md:text-lg">{t.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href.workspace} className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]">
                {t.primaryCta}
                <ArrowIcon />
              </Link>
              <Link href={href.download} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                <DownloadIcon />
                {t.secondaryCta}
              </Link>
              <Link href={href.settings} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10">
                {t.settingsCta}
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f8faf6] p-5 text-[#17201b] shadow-2xl">
            <p className="text-sm font-semibold">{t.processTitle}</p>
            <p className="mt-1 text-xs text-[#647064]">{t.processSubtitle}</p>
            <div className="mt-5 space-y-3">
              {t.steps.map(([title, text], index) => (
                <div key={title} className="grid grid-cols-[34px_1fr] gap-3 border-b border-[#e2e7df] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#17201b] text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-[#647064]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-semibold">{t.guardrailTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-[#637064]">{t.guardrailText}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {t.cards.map(([title, text]) => (
            <div key={title} className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
