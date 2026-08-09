import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, DownloadSimple, FileText, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";

const copy = {
  en: {
    eyebrow: "Prospectus drafting workspace",
    title: "Build each section from prepared evidence.",
    subtitle: "Organize issuer material, draft in prospectus order, review gaps, and export a controlled Word working draft.",
    primary: "Open workspace", secondary: "Download app",
    processTitle: "A drafting process that keeps state visible.",
    processText: "The product separates source preparation, section generation, professional review, and delivery. Teams always know what is saved and what still needs judgment.",
    steps: [
      ["Prepare evidence", "Agent1 organizes facts, sources, gaps, and quality flags before drafting begins."],
      ["Draft by section", "Agent2 works in prospectus order and reports the active generation phase."],
      ["Review in context", "Expand completed sections, inspect thin drafts, and regenerate with instructions."],
      ["Export for counsel", "Create a Word working draft after the relevant sections are ready."],
    ],
    boundaryTitle: "Drafting supports judgment. It does not replace it.",
    boundaryText: "The workspace produces review material from supplied evidence. It does not decide listing eligibility or issue a regulatory conclusion.",
    principles: [
      ["Visible section state", "Complete, running, missing, and review-required states stay explicit."],
      ["Evidence nearby", "Source coverage and missing information remain close to the draft."],
      ["Controlled deployment", "Use the web workspace or a packaged private desktop application."],
    ],
    settings: "Model settings", closing: "Start with issuer files, finish with a reviewable working draft.",
  },
  zh: {
    eyebrow: "招股书起草工作台",
    title: "让每个章节都从已准备的证据开始。",
    subtitle: "整理发行人材料，按招股书顺序起草，复核缺口，并导出受控 Word 工作稿。",
    primary: "打开工作台", secondary: "下载应用",
    processTitle: "让起草状态始终清楚可见。",
    processText: "产品将来源准备、章节生成、专业复核和交付分开。团队可以随时看到已保存内容与待判断事项。",
    steps: [
      ["准备证据", "Agent1 在起草前整理事实、来源、缺口和质量标记。"],
      ["逐章起草", "Agent2 按招股书顺序工作，并展示当前生成阶段。"],
      ["结合语境复核", "展开已完成章节，检查薄弱草稿，并根据指示重新生成。"],
      ["导出供律师审阅", "相关章节准备好后，生成 Word 工作稿。"],
    ],
    boundaryTitle: "起草支持专业判断，但不替代专业判断。",
    boundaryText: "工作台根据提供的证据生成复核材料，不判断上市资格，也不输出监管结论。",
    principles: [
      ["章节状态可见", "完成、生成中、缺失和需复核状态保持明确。"],
      ["证据就在附近", "来源覆盖和缺失信息始终靠近草稿呈现。"],
      ["受控部署", "可以使用网页工作台或私有桌面应用。"],
    ],
    settings: "模型设置", closing: "从发行人文件开始，以可复核工作稿结束。",
  },
} as const;

export function DraftingPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const href = { workspace: locale === "zh" ? "/zh/workspace" : "/workspace", download: locale === "zh" ? "/zh/download" : "/download", settings: locale === "zh" ? "/zh/settings" : "/settings" };
  const icons = [FileText, MagnifyingGlass, ShieldCheck, DownloadSimple];
  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#15221c]">
      <PublicNav active="drafting" locale={locale} />
      <section className="border-b border-[var(--border)] bg-[#f7f9f6] pt-16">
        <div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{t.eyebrow}</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.03] tracking-[-0.045em] md:text-6xl">{t.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">{t.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={href.workspace} className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white hover:bg-[var(--accent-hover)]">{t.primary}<ArrowRight size={17} weight="bold" /></Link><Link href={href.download} className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-5 text-sm font-bold hover:bg-[#edf1ed]"><DownloadSimple size={17} weight="bold" />{t.secondary}</Link></div>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-soft)]"><div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-[#e7ede8]"><Image src="/workspace-preview.png" alt="Prospectus drafting workspace" fill priority sizes="(min-width:1024px) 55vw, 100vw" className="object-cover object-top" /></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="max-w-3xl"><h2 className="text-3xl font-semibold tracking-[-0.035em] lg:text-5xl">{t.processTitle}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)]">{t.processText}</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {t.steps.map(([title, text], index) => { const Icon = icons[index]; return <article key={title} className={`rounded-[14px] border border-[var(--border)] p-7 ${index === 0 || index === 3 ? "bg-[#e5efeb]" : "bg-white"}`}><Icon size={25} weight="duotone" className="text-[var(--accent)]" /><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 max-w-lg text-sm leading-6 text-[var(--muted)]">{text}</p></article>; })}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[#e7ede8]"><div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"><div><ShieldCheck size={30} weight="duotone" className="text-[var(--accent)]" /><h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em]">{t.boundaryTitle}</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{t.boundaryText}</p></div><div className="grid gap-8 sm:grid-cols-3">{t.principles.map(([title,text])=><article key={title} className="border-t border-[#bec9c0] pt-5"><CheckCircle size={20} weight="fill" className="text-[var(--accent)]" /><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</p></article>)}</div></div></section>
      <section className="mx-auto flex max-w-[1380px] flex-col justify-between gap-6 px-5 py-16 lg:flex-row lg:items-center lg:px-8"><h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em]">{t.closing}</h2><div className="flex flex-wrap gap-3"><Link href={href.workspace} className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white">{t.primary}<ArrowRight size={17} weight="bold" /></Link><Link href={href.settings} className="inline-flex h-11 items-center rounded-md border border-[var(--border)] bg-white px-5 text-sm font-bold">{t.settings}</Link></div></section>
    </main>
  );
}
