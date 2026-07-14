import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";
import { DOWNLOAD_ASSETS, RELEASE_LABEL, type DownloadAsset } from "@/lib/download-assets";

type DisplayAsset = DownloadAsset & {
  downloadHref: string;
  actionLabel: string;
};

type DownloadCopy = {
  navLocale?: "en" | "zh";
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  workspaceCta: string;
  releaseTitle: string;
  releaseDescription: string;
  evidence: string;
  drafting: string;
  export: string;
  includedTitle: string;
  included: string[];
  downloadsTitle: string;
  downloadsDescription: string;
  settingsCta: string;
  recommended: string;
  downloadButton: string;
  viewReleaseButton: string;
  footerTitle: string;
  footerDescription: string;
  workflowTitle: string;
  workflowText: string;
  deploymentTitle: string;
  deploymentText: string;
};

const assetLabels = {
  en: {
    windows: {
      title: "Windows Installer",
      description: "Standard installer that creates Start Menu and optional desktop shortcuts.",
    },
    "macos-arm64": {
      title: "macOS Apple Silicon",
      description: "Standalone Mac app package for M-series Macs.",
    },
    "macos-x64": {
      title: "macOS Intel",
      description: "Standalone Mac app package for Intel Macs.",
    },
    linux: {
      title: "Linux x86_64",
      description: "Full Linux archive for workstation or server deployment.",
    },
    "test-dataset": {
      title: "Test dataset",
      description:
        "Public sample pack with reverse-engineered inputs, source packages, section text, and prospectus PDFs for end-to-end tests.",
    },
  },
  zh: {
    windows: {
      title: "Windows 安装包",
      description: "标准安装程序，会创建开始菜单快捷方式，并可选择创建桌面快捷方式。",
    },
    "macos-arm64": {
      title: "macOS Apple Silicon",
      description: "适用于 M 系列芯片 Mac 的独立应用包。",
    },
    "macos-x64": {
      title: "macOS Intel",
      description: "适用于 Intel Mac 的独立应用包。",
    },
    linux: {
      title: "Linux x86_64",
      description: "适用于工作站或服务器部署的完整 Linux 压缩包。",
    },
    "test-dataset": {
      title: "测试数据集",
      description: "公开测试包，包含逆向提取输入、source packages、章节原文和招股书 PDF，可直接用于端到端测试。",
    },
  },
};

const copy = {
  en: {
    navLocale: "en",
    eyebrow: "Sponsor counsel drafting workspace",
    title: "Prospectus AI",
    description:
      "A desktop-ready AI workspace for transforming issuer files into prospectus evidence, section drafts, verification notes, and Word exports.",
    primaryCta: "View desktop downloads",
    workspaceCta: "Open web workspace",
    releaseTitle: "Current release",
    releaseDescription: "Installer and release builds from GitHub Releases",
    evidence: "Evidence",
    drafting: "Drafting",
    export: "Export",
    includedTitle: "Included",
    included: [
      "Isolated AI module and web workspace",
      "Windows installer, macOS DMG workflow, and Linux archive options",
      "Local file workflow for confidential issuer materials",
      "Downloadable test dataset for validating the full generation path",
    ],
    downloadsTitle: "Downloads",
    downloadsDescription:
      `Pick the package for your machine. Buttons resolve the published ${RELEASE_LABEL} release assets from GitHub.`,
    settingsCta: "Configure model settings",
    recommended: "Recommended",
    downloadButton: "Download",
    viewReleaseButton: "View release",
    footerTitle: "Designed for controlled drafting",
    footerDescription:
      "The app keeps the main workflow local: upload issuer materials, prepare evidence, generate sections, then export a Word draft for review.",
    workflowTitle: "Workflow",
    workflowText: "Data upload, Agent1 evidence preparation, Agent2 section drafting, and DOCX export.",
    deploymentTitle: "Deployment",
    deploymentText: "Use the web workspace for development or download the desktop package for distribution.",
  },
  zh: {
    navLocale: "zh",
    eyebrow: "保荐人律师文档生成工作区",
    title: "Prospectus AI",
    description:
      "面向桌面端的 AI 工作区，可将发行人文件转化为招股书证据、章节草稿、核验提示和 Word 工作稿。",
    primaryCta: "查看桌面端下载",
    workspaceCta: "打开网页工作区",
    releaseTitle: "当前版本",
    releaseDescription: "安装包和发布文件来自 GitHub Releases",
    evidence: "证据",
    drafting: "起草",
    export: "导出",
    includedTitle: "包含内容",
    included: [
      "独立 AI 模块与网页工作区",
      "Windows 安装包、macOS DMG 流程和 Linux 压缩包选项",
      "适合敏感发行人材料的本地文件工作流",
      "可下载测试数据集，用于验证完整生成链路",
    ],
    downloadsTitle: "下载",
    downloadsDescription: `选择适合你机器的版本。按钮会解析 GitHub 上发布的 ${RELEASE_LABEL} 文件。`,
    settingsCta: "配置模型设置",
    recommended: "推荐",
    downloadButton: "下载",
    viewReleaseButton: "查看发布页",
    footerTitle: "为受控起草流程而设计",
    footerDescription:
      "应用将核心流程保留在本地：上传发行人材料、整理证据、生成章节，然后导出 Word 草稿供审阅。",
    workflowTitle: "工作流",
    workflowText: "数据上传、Agent1 证据整理、Agent2 章节起草和 DOCX 导出。",
    deploymentTitle: "部署",
    deploymentText: "开发时可使用网页工作区；分发时可下载对应桌面端安装包。",
  },
} satisfies Record<"en" | "zh", DownloadCopy>;

function getAssets(locale: "en" | "zh"): DisplayAsset[] {
  const labels = assetLabels[locale];
  return DOWNLOAD_ASSETS.map((asset) => ({
    ...asset,
    title: labels[asset.id as keyof typeof labels]?.title || asset.title,
    description: labels[asset.id as keyof typeof labels]?.description || asset.description,
    downloadHref: `/api/download/${asset.id}`,
    actionLabel: copy[locale].downloadButton,
  }));
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v11m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function DownloadPageContent({ locale = "en" }: { locale?: "en" | "zh" }) {
  const t = copy[locale];
  const assets = getAssets(locale);
  const href = {
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
    settings: locale === "zh" ? "/zh/settings" : "/settings",
  };

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-[#17201b]">
      <PublicNav active="download" locale={t.navLocale} />
      <section className="relative overflow-hidden bg-[#16231d] text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/app-icon-512.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-14 pt-28 md:grid-cols-[1fr_420px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dce8df]">
              {t.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dce8df] md:text-lg">
              {t.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#downloads"
                className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]"
              >
                <DownloadIcon />
                {t.primaryCta}
              </a>
              <Link
                href={href.workspace}
                className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t.workspaceCta}
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f7faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="Prospectus AI icon" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">{t.releaseTitle}</p>
                <p className="text-xs text-[#647064]">{t.releaseDescription}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Agent1</p>
                <p className="mt-1 text-[#647064]">{t.evidence}</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Agent2</p>
                <p className="mt-1 text-[#647064]">{t.drafting}</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">DOCX</p>
                <p className="mt-1 text-[#647064]">{t.export}</p>
              </div>
            </div>
            <div className="mt-5 border-t border-[#d8ded6] pt-4">
              <p className="text-xs font-semibold uppercase text-[#6b735f]">{t.includedTitle}</p>
              <ul className="mt-3 space-y-2 text-sm text-[#334139]">
                {t.included.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="downloads" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#d5ddd2] pb-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold">{t.downloadsTitle}</h2>
            <p className="mt-2 text-sm text-[#637064]">{t.downloadsDescription}</p>
          </div>
          <Link href={href.settings} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] hover:underline">
            {t.settingsCta}
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {assets.map((asset) => (
            <article key={asset.id} className="flex h-full flex-col border border-[#d5ddd2] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#6b735f]">
                    {asset.platform}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
                </div>
                {asset.recommended && (
                  <span className="bg-[#e8f3ef] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                    {t.recommended}
                  </span>
                )}
              </div>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#637064]">{asset.description}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#edf0eb] pt-4">
                <span className="text-sm font-medium text-[#334139]">{asset.platform}</span>
                <a
                  href={asset.downloadHref}
                  className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap bg-[#17201b] px-4 text-sm font-semibold text-white transition hover:bg-[#2b3a32]"
                >
                  <DownloadIcon />
                  {asset.actionLabel}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#d5ddd2] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold">{t.footerTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#637064]">{t.footerDescription}</p>
          </div>
          <div className="md:border-l md:border-[#d5ddd2] md:pl-5">
            <p className="text-sm font-semibold">{t.workflowTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#637064]">{t.workflowText}</p>
          </div>
          <div className="md:border-l md:border-[#d5ddd2] md:pl-5">
            <p className="text-sm font-semibold">{t.deploymentTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#637064]">{t.deploymentText}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
