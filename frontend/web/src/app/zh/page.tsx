import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";

export const metadata = {
  title: "AI Prospectus | 私有化 AI 文档生成",
  description:
    "AI Prospectus 帮助法律、投行与合规团队将专有材料转化为结构化证据、监管文档草稿与可导出的工作稿。",
  alternates: {
    canonical: "/zh",
    languages: {
      en: "/",
      "zh-CN": "/zh",
    },
  },
};

const workflow = [
  {
    title: "接入专有材料",
    text: "上传发行人表格、JSON 记录、尽调输出和内部工作底稿，进入受控的文档生成工作区。",
  },
  {
    title: "整理证据与事实",
    text: "Agent1 将叙述性文本和结构化事实分离，并映射到招股书章节，同时保留来源线索。",
  },
  {
    title: "生成合规草稿",
    text: "Agent2 按章节生成工作稿，附带核验提示、缺失信息标记，并支持导出 Word 供专业审阅。",
  },
];

const audiences = [
  "IPO 保荐人律师团队",
  "资本市场律师",
  "投行执行团队",
  "合规与披露团队",
];

const graphHighlights = [
  {
    title: "来源锚定",
    text: "事实、叙事段落和表格抽取结果会保留对应来源文件与位置线索。",
  },
  {
    title: "章节路由",
    text: "证据会先映射到招股书章节结构，再进入章节级生成。",
  },
  {
    title: "缺口识别",
    text: "缺失输入和覆盖薄弱的地方会变成复核信号，而不是悄悄混进草稿里。",
  },
];

const contactHref =
  "mailto:contact@ai-prospectus.com?subject=AI%20Prospectus%20demo%20request";

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

function EvidenceGraphVisual() {
  return (
    <div className="border border-white/15 bg-[#0f1916] p-5 text-white shadow-2xl">
      <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase text-[#f2c14e]">内部证据层</p>
          <p className="mt-1 text-sm text-[#c8d8d0]">从原始材料到可核验披露结构</p>
        </div>
        <span className="border border-[#5aa79b]/45 bg-[#14332e] px-3 py-1 text-xs font-semibold text-[#9ee0d5]">
          仅在运行时使用
        </span>
      </div>

      <div className="relative mt-5 grid gap-2 overflow-hidden border border-white/10 bg-[#15231f] p-4 sm:block sm:min-h-[300px]">
        <div className="absolute left-[16%] top-[28%] hidden h-px w-[68%] bg-[#f2c14e]/50 sm:block" />
        <div className="absolute left-[21%] top-[48%] hidden h-px w-[54%] rotate-[-18deg] bg-[#5aa79b]/45 sm:block" />
        <div className="absolute left-[24%] top-[57%] hidden h-px w-[50%] rotate-[21deg] bg-white/20 sm:block" />
        <div className="absolute left-[48%] top-[28%] hidden h-[42%] w-px bg-white/20 sm:block" />

        <div className="border border-white/15 bg-[#f7faf6] px-3 py-2 text-[#17201b] sm:absolute sm:left-[6%] sm:top-[14%] sm:w-[9.5rem]">
          <p className="text-xs font-semibold">发行人文件</p>
          <p className="mt-1 text-[11px] text-[#647064]">PDF、DOCX、XLSX、JSON</p>
        </div>
        <div className="border border-[#f2c14e]/55 bg-[#2b2414] px-3 py-2 sm:absolute sm:left-[39%] sm:top-[11%] sm:w-[9rem]">
          <p className="text-xs font-semibold text-[#f7d98b]">抽取事实</p>
          <p className="mt-1 text-[11px] text-[#e9d8a6]">数值、日期、主体</p>
        </div>
        <div className="border border-[#5aa79b]/55 bg-[#14332e] px-3 py-2 sm:absolute sm:right-[5%] sm:top-[18%] sm:w-[9rem]">
          <p className="text-xs font-semibold text-[#9ee0d5]">章节地图</p>
          <p className="mt-1 text-[11px] text-[#bfe9e1]">业务、风险、财务分析</p>
        </div>
        <div className="border border-white/15 bg-[#22302b] px-3 py-2 sm:absolute sm:bottom-[15%] sm:left-[13%] sm:w-[9rem]">
          <p className="text-xs font-semibold">来源指针</p>
          <p className="mt-1 text-[11px] text-[#c8d8d0]">文件、表格、页码、行号</p>
        </div>
        <div className="border border-[#d77259]/55 bg-[#321c18] px-3 py-2 sm:absolute sm:bottom-[9%] sm:left-[42%] sm:w-[9.5rem]">
          <p className="text-xs font-semibold text-[#ffb39f]">覆盖缺口</p>
          <p className="mt-1 text-[11px] text-[#f1c5bb]">缺失输入会被标记</p>
        </div>
        <div className="border border-white/15 bg-[#f7faf6] px-3 py-2 text-[#17201b] sm:absolute sm:bottom-[20%] sm:right-[8%] sm:w-[9rem]">
          <p className="text-xs font-semibold">起草计划</p>
          <p className="mt-1 text-[11px] text-[#647064]">有证据支撑的大纲</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-[#c8d8d0] sm:grid-cols-3">
        <div className="border border-white/10 px-3 py-2">可追溯检索包</div>
        <div className="border border-white/10 px-3 py-2">章节感知提示词</div>
        <div className="border border-white/10 px-3 py-2">面向复核的缺口</div>
      </div>
    </div>
  );
}

export default function ChineseHomePage() {
  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17201b]">
      <PublicNav active="home" locale="zh" />
      <section className="relative overflow-hidden bg-[#111c18] text-white">
        <div className="absolute inset-0 opacity-18">
          <Image
            src="/app-icon-512.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative mx-auto grid min-h-[700px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-28 md:grid-cols-[1fr_430px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dce8df]">
              面向监管文档的私有化 AI 生成系统
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              将专有交易材料转化为可审阅的招股书工作稿。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dce8df] md:text-lg">
              AI Prospectus 是面向保荐人律师与资本市场团队的模块化文档生成系统，
              覆盖证据整理、章节生成、核验提示和 Word 导出，适合在受控工作流中处理敏感材料。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/zh/download"
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                <DownloadIcon />
                下载应用
              </Link>
              <Link
                href="/zh/workspace"
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                打开受保护工作区
                <ArrowIcon />
              </Link>
              <a
                href={contactHref}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                预约演示
                <ArrowIcon />
              </a>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f7faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">披露文档生成管线</p>
                <p className="text-xs text-[#647064]">先整理证据，再生成文本</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {workflow.map((item, index) => (
                <div key={item.title} className="grid grid-cols-[32px_1fr] gap-3 border-b border-[#e2e7df] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex h-8 w-8 items-center justify-center bg-[#17201b] text-xs font-semibold text-white">
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
            <h2 className="text-2xl font-semibold">为专有化文档生成而设计</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              项目从 IPO 招股书起步，但架构已经拆分为 AI 模块、前端工作区、平台工具、知识模块和抽取管线。
              这让不同领域的专业文档生成流程可以独立演进，而不必互相耦合。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {audiences.map((item) => (
                <span key={item} className="border border-[#d5ddd2] bg-white px-3 py-2 text-sm text-[#334139]">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">私有数据工作流</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                运行时文件可以保留在本地工作区，代码结构则保持清晰、模块化。
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">章节感知生成</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                章节要求、证据检索、核验流程和输出包都围绕披露章节组织。
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">桌面应用分发</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                可下载版本适合内部评审和分发，无需把发行人文件暴露到公开 SaaS。
              </p>
            </div>
            <div className="border border-[#d5ddd2] bg-white p-5">
              <p className="text-sm font-semibold">可扩展模块</p>
              <p className="mt-3 text-sm leading-6 text-[#637064]">
                AI、前端、平台、内部证据层、资源和抽取管线都有清晰边界。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#17201b] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase text-[#f2c14e]">生成引擎内部</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">
              私有证据图谱会先整理事实，再让模型开始写作。
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#c8d8d0]">
              用户只需要完成上传、生成、修改和导出。系统背后会构建一层结构化证据层，
              将来源材料、抽取事实、章节要求和缺失信息信号持续对齐，帮助生成内容更接近可审阅披露文本。
            </p>
            <div className="mt-7 grid gap-3">
              {graphHighlights.map((item) => (
                <div key={item.title} className="border border-white/15 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#c8d8d0]">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
          <EvidenceGraphVisual />
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 border-b border-[#d5ddd2] px-6 py-12 md:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold">从招股书起步，延伸到专有化文档生成</h2>
            <p className="mt-4 text-sm leading-6 text-[#637064]">
              同一套模块化结构可以支持发行人问卷、尽调摘要、监管申报文件、董事会材料和其他需要可追溯、
              可审阅、可控输出的专有文档。
            </p>
          </div>
          <div className="grid gap-3">
            <div className="border border-[#d5ddd2] p-4">
              <p className="text-sm font-semibold">演示与合作咨询</p>
              <p className="mt-2 text-sm leading-6 text-[#637064]">
                如果你希望讨论试点、保荐人律师工作流或私有化部署，请预约演示，并说明目标文档类型。
              </p>
              <a href={contactHref} className="mt-4 inline-flex h-10 items-center gap-2 bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32]">
                预约演示
                <ArrowIcon />
              </a>
            </div>
            <div className="border border-[#d5ddd2] p-4">
              <p className="text-sm font-semibold">源码与发布版本</p>
              <p className="mt-2 text-sm leading-6 text-[#637064]">
                官网下载入口连接 GitHub Releases；受保护工作区与对外展示页面分离。
              </p>
              <a href="https://github.com/GuangzhiSu/Prospectus-AI" className="mt-4 inline-flex h-10 items-center gap-2 border border-[#c9d2c7] px-4 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
                查看 GitHub
                <ArrowIcon />
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-6 py-10 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">下载应用，或申请访问工作区。</h2>
            <p className="mt-2 text-sm text-[#637064]">
              官网用于产品介绍；实际文档生成在受保护工作区中完成。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/zh/download" className="inline-flex h-11 items-center gap-2 bg-[#17201b] px-5 text-sm font-semibold text-white hover:bg-[#2b3a32]">
              <DownloadIcon />
              下载应用
            </Link>
            <Link href="/zh/workspace" className="inline-flex h-11 items-center gap-2 border border-[#c9d2c7] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#f6f8f4]">
              受保护工作区
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
