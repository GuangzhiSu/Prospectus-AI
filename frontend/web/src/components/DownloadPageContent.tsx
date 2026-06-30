import Image from "next/image";
import Link from "next/link";

import { PublicNav } from "@/components/PublicNav";
import { DOWNLOAD_ASSETS, type DownloadAsset } from "@/lib/download-assets";

type Locale = "en" | "zh";

type DisplayAsset = DownloadAsset & {
  downloadHref: string;
};

type DownloadCard = {
  id: string;
  title: string;
  platform: string;
  description: string;
  href: string;
  recommended?: boolean;
  action: string;
};

const assetLabels = {
  en: {
    windows: {
      title: "Windows installer",
      description:
        "Recommended desktop installer for private IPO drafting workstations. Creates Start Menu and optional desktop shortcuts.",
    },
    linux: {
      title: "Linux x86_64",
      description:
        "Full Linux archive for controlled workstation, server, or internal testing deployment.",
    },
  },
  zh: {
    windows: {
      title: "Windows 安装包",
      description:
        "推荐用于私有 IPO 起草工作站的桌面安装包，会创建开始菜单快捷方式，并可选择创建桌面快捷方式。",
    },
    linux: {
      title: "Linux x86_64",
      description:
        "适用于受控工作站、服务器或内部测试部署的完整 Linux 压缩包。",
    },
  },
};

const copy = {
  en: {
    eyebrow: "Private and controlled deployment",
    title: "Download the private AI Prospectus workspace.",
    description:
      "Use the installer, web workspace, or source package depending on how your team wants to run local evidence preparation, prospectus drafting, review, and export.",
    windowsCta: "Windows installer",
    workspaceCta: "Open web workspace",
    settingsCta: "Configure model settings",
    panelTitle: "Controlled IPO workspace",
    panelSubtitle: "Local files, explicit model settings, reviewable output",
    privateData: "Private data",
    localMode: "Local mode",
    reviewExport: "Review export",
    includedTitle: "Designed for",
    included: [
      "Sensitive issuer materials in a local or controlled environment",
      "Model and inference configuration before drafting",
      "Evidence preparation, section drafting, review notes, and DOCX export",
    ],
    downloadsTitle: "Downloads",
    downloadsDescription:
      "Pick the package that matches your deployment path. Windows is the recommended packaged experience; Linux and source are available for controlled technical use.",
    recommended: "Recommended",
    sourceTitle: "Source / GitHub",
    sourcePlatform: "Repository",
    sourceDescription:
      "Use the repository for code review, local development, deployment customization, and release notes.",
    sourceAction: "View source",
    downloadButton: "Download",
    footerTitle: "Private by workflow design",
    footerDescription:
      "AI Prospectus separates public product pages from the workspace where issuer files, diagnostic context, drafting state, and export readiness are handled.",
    workflowTitle: "Workspace path",
    workflowText: "Upload materials, run IPO diagnostic, prepare evidence, draft sections, review, and export.",
    deploymentTitle: "Deployment path",
    deploymentText: "Use packaged installers for controlled desktop use or source for internal engineering review.",
  },
  zh: {
    eyebrow: "私有化与受控部署",
    title: "下载私有化 AI Prospectus 工作台。",
    description:
      "根据团队运行方式选择安装包、网页工作台或源码包，用于本地证据整理、招股书起草、复核和导出。",
    windowsCta: "Windows 安装包",
    workspaceCta: "打开网页工作台",
    settingsCta: "配置模型设置",
    panelTitle: "受控 IPO 工作台",
    panelSubtitle: "本地文件、明确模型配置、可复核输出",
    privateData: "私有数据",
    localMode: "本地模式",
    reviewExport: "复核导出",
    includedTitle: "适用于",
    included: [
      "在本地或受控环境中处理敏感发行人材料",
      "在起草前配置模型和推理参数",
      "证据准备、章节起草、复核提示和 DOCX 导出",
    ],
    downloadsTitle: "下载",
    downloadsDescription:
      "选择适合部署路径的版本。Windows 是推荐的打包体验；Linux 和源码适合受控技术使用。",
    recommended: "推荐",
    sourceTitle: "源码 / GitHub",
    sourcePlatform: "代码仓库",
    sourceDescription:
      "用于代码审阅、本地开发、部署定制和查看发布说明。",
    sourceAction: "查看源码",
    downloadButton: "下载",
    footerTitle: "从工作流层面保持私有",
    footerDescription:
      "AI Prospectus 将公开产品页面与实际处理发行人文件、诊断语境、起草状态和导出准备度的工作台分离。",
    workflowTitle: "工作台路径",
    workflowText: "上传材料、运行上市诊断、准备证据、生成章节、复核并导出。",
    deploymentTitle: "部署路径",
    deploymentText: "受控桌面使用建议安装包；内部工程审阅可使用源码。",
  },
} satisfies Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    windowsCta: string;
    workspaceCta: string;
    settingsCta: string;
    panelTitle: string;
    panelSubtitle: string;
    privateData: string;
    localMode: string;
    reviewExport: string;
    includedTitle: string;
    included: string[];
    downloadsTitle: string;
    downloadsDescription: string;
    recommended: string;
    sourceTitle: string;
    sourcePlatform: string;
    sourceDescription: string;
    sourceAction: string;
    downloadButton: string;
    footerTitle: string;
    footerDescription: string;
    workflowTitle: string;
    workflowText: string;
    deploymentTitle: string;
    deploymentText: string;
  }
>;

function getAssets(locale: Locale): DisplayAsset[] {
  const labels = assetLabels[locale];
  return DOWNLOAD_ASSETS.map((asset) => ({
    ...asset,
    title: labels[asset.id as keyof typeof labels]?.title || asset.title,
    description: labels[asset.id as keyof typeof labels]?.description || asset.description,
    downloadHref: `/api/download/${asset.id}`,
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

export function DownloadPageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const assets = getAssets(locale);
  const recommended = assets.find((asset) => asset.recommended) ?? assets[0];
  const workspaceHref = locale === "zh" ? "/zh/workspace" : "/workspace";
  const cards: DownloadCard[] = [
    ...assets.map((asset) => ({
      id: asset.id,
      title: asset.title,
      platform: asset.platform,
      description: asset.description,
      href: asset.downloadHref,
      recommended: asset.recommended,
      action: t.downloadButton,
    })),
    {
      id: "source",
      title: t.sourceTitle,
      platform: t.sourcePlatform,
      description: t.sourceDescription,
      href: "https://github.com/GuangzhiSu/Prospectus-AI",
      action: t.sourceAction,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="download" locale={locale} />

      <section className="relative overflow-hidden bg-[#16231d] text-white">
        <div className="absolute inset-0 opacity-[0.14]">
          <Image src="/app-icon-512.png" alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
        <div className="relative mx-auto grid min-h-[680px] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-14 pt-28 md:grid-cols-[1fr_420px]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-[#dce8df]">
              {t.eyebrow}
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">{t.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#dce8df] md:text-lg">
              {t.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={recommended.downloadHref} className="inline-flex h-11 items-center gap-2 bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] transition hover:bg-[#ffd36b]">
                <DownloadIcon />
                {t.windowsCta}
              </a>
              <Link href={workspaceHref} className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.workspaceCta}
                <ArrowIcon />
              </Link>
              <Link href="/settings" className="inline-flex h-11 items-center gap-2 border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
                {t.settingsCta}
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div className="border border-white/15 bg-[#f7faf6] p-5 text-[#17201b] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#d8ded6] pb-4">
              <Image src="/app-icon.png" alt="AI Prospectus icon" width={44} height={44} />
              <div>
                <p className="text-sm font-semibold">{t.panelTitle}</p>
                <p className="text-xs text-[#647064]">{t.panelSubtitle}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Data</p>
                <p className="mt-1 text-[#647064]">{t.privateData}</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">Model</p>
                <p className="mt-1 text-[#647064]">{t.localMode}</p>
              </div>
              <div className="bg-[#eef3ec] px-2 py-3">
                <p className="font-semibold">DOCX</p>
                <p className="mt-1 text-[#647064]">{t.reviewExport}</p>
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

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#d5ddd2] pb-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold">{t.downloadsTitle}</h2>
            <p className="mt-2 text-sm text-[#637064]">{t.downloadsDescription}</p>
          </div>
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f766e] hover:underline">
            {t.settingsCta}
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((asset) => (
            <article key={asset.id} className="border border-[#d5ddd2] bg-white p-5 shadow-sm">
              <div className="flex min-h-[86px] items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-[#6b735f]">{asset.platform}</p>
                  <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
                </div>
                {asset.recommended && (
                  <span className="bg-[#e8f3ef] px-2 py-1 text-xs font-semibold text-[#0f766e]">
                    {t.recommended}
                  </span>
                )}
              </div>
              <p className="mt-3 min-h-24 text-sm leading-6 text-[#637064]">{asset.description}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4">
                <span className="text-sm font-medium text-[#334139]">{asset.platform}</span>
                <a href={asset.href} className="inline-flex h-10 items-center gap-2 bg-[#17201b] px-4 text-sm font-semibold text-white transition hover:bg-[#2b3a32]">
                  {asset.id === "source" ? <ArrowIcon /> : <DownloadIcon />}
                  {asset.action}
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
