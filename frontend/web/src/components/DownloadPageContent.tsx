import Link from "next/link";
import { AppleLogo, ArrowRight, CheckCircle, DownloadSimple, HardDrives, LinuxLogo, WindowsLogo } from "@phosphor-icons/react/dist/ssr";

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
  guideCta: string;
  recommended: string;
  downloadButton: string;
  viewReleaseButton: string;
  guideTitle: string;
  guideDescription: string;
  guideItems: Array<{
    title: string;
    badge: string;
    steps: string[];
  }>;
  guideNoteTitle: string;
  guideNote: string;
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
      description: "Thin AppImage client for the hosted workspace.",
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
      description: "连接托管工作区的轻量 AppImage 客户端。",
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
      "Thin desktop clients for the protected web workspace",
      "Windows installer, macOS DMG, and Linux AppImage options",
      "Server-side prompts, AI agents, and model execution",
      "Downloadable test dataset for validating the full generation path",
    ],
    downloadsTitle: "Downloads",
    downloadsDescription:
      `Pick the package for your machine. Buttons resolve the published ${RELEASE_LABEL} release assets from GitHub.`,
    settingsCta: "Configure model settings",
    guideCta: "Installation guide",
    recommended: "Recommended",
    downloadButton: "Download",
    viewReleaseButton: "View release",
    guideTitle: "After You Download",
    guideDescription:
      "Use the application package to install Prospectus AI. The dataset ZIP is only sample material for testing the workflow after the app is running.",
    guideItems: [
      {
        title: "Windows Installer",
        badge: "Recommended",
        steps: [
          "Close any existing Prospectus AI windows before upgrading.",
          "Run ProspectusAI-Setup-0.1.2.exe and follow the installer.",
          "Launch Prospectus AI from the Start Menu or desktop shortcut.",
          "Sign in with your workspace credentials. An internet connection is required.",
        ],
      },
      {
        title: "macOS DMG",
        badge: "Apple Silicon / Intel",
        steps: [
          "Download the DMG matching your Mac chip.",
          "Open the DMG and run 双击安装 Install.command inside the window.",
          "If macOS blocks the script, right-click it, choose Open, then Open again.",
          "Launch it from Applications and sign in to the hosted workspace.",
        ],
      },
      {
        title: "Linux AppImage",
        badge: "x86_64",
        steps: [
          "Download ProspectusAI-linux-x64.AppImage.",
          "Make it executable if your browser removed that permission.",
          "Run the AppImage and sign in to the hosted workspace.",
          "Keep an internet connection while using AI features.",
        ],
      },
      {
        title: "Test Dataset",
        badge: "Sample inputs",
        steps: [
          "Do not run the dataset ZIP as an application.",
          "Extract it after Prospectus AI is installed.",
          "Use files under prospectus_kg_output/inputs or prospectus_corpus as sample materials.",
          "Upload the sample files in the workspace, then run Prepare data.",
        ],
      },
    ],
    guideNoteTitle: "First-run setup",
    guideNote:
      "The desktop package is a thin client. Prompts, agents, model execution, and provider keys remain on the protected server; documents selected in the workspace are uploaded to that server for processing.",
    footerTitle: "Designed for controlled drafting",
    footerDescription:
      "The protected server prepares evidence, generates sections, and returns drafts and Word exports to authenticated clients.",
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
      "连接受保护网页工作区的轻量桌面客户端",
      "Windows 安装包、macOS DMG 和 Linux AppImage",
      "服务端保存 prompt、AI Agent 并执行模型调用",
      "可下载测试数据集，用于验证完整生成链路",
    ],
    downloadsTitle: "下载",
    downloadsDescription: `选择适合你机器的版本。按钮会解析 GitHub 上发布的 ${RELEASE_LABEL} 文件。`,
    settingsCta: "配置模型设置",
    guideCta: "安装指南",
    recommended: "推荐",
    downloadButton: "下载",
    viewReleaseButton: "查看发布页",
    guideTitle: "下载后怎么操作",
    guideDescription:
      "应用安装包用于安装 Prospectus AI；测试数据集 ZIP 只是样例材料，等应用正常打开后再用于测试生成链路。",
    guideItems: [
      {
        title: "Windows 安装包",
        badge: "推荐",
        steps: [
          "升级前先关闭所有 Prospectus AI 窗口。",
          "运行 ProspectusAI-Setup-0.1.2.exe，并按安装器提示完成安装。",
          "从开始菜单或桌面快捷方式启动 Prospectus AI。",
          "使用工作区账号登录；软件运行时需要网络连接。",
        ],
      },
      {
        title: "macOS DMG",
        badge: "Apple Silicon / Intel",
        steps: [
          "按你的 Mac 芯片下载对应 DMG。",
          "打开 DMG，双击窗口里的 双击安装 Install.command。",
          "如果 macOS 阻止脚本，请右键选择打开，再点打开。",
          "之后从应用程序打开 Prospectus AI，并登录托管工作区。",
        ],
      },
      {
        title: "Linux AppImage",
        badge: "x86_64",
        steps: [
          "下载 ProspectusAI-linux-x64.AppImage。",
          "如果浏览器移除了执行权限，请先把它设为可执行。",
          "运行 AppImage，并登录托管工作区。",
          "使用 AI 功能期间需要保持网络连接。",
        ],
      },
      {
        title: "测试数据集",
        badge: "样例材料",
        steps: [
          "不要把数据集 ZIP 当作应用运行。",
          "先安装并打开 Prospectus AI，再解压数据集。",
          "可使用 prospectus_kg_output/inputs 或 prospectus_corpus 中的文件作为样例材料。",
          "在工作区上传样例文件，然后运行整理数据。",
        ],
      },
    ],
    guideNoteTitle: "首次启动说明",
    guideNote:
      "桌面安装包是轻量客户端。Prompt、Agent、模型调用和供应商密钥都保留在受保护服务端；你在工作区选择的文档会上传至该服务端处理。",
    footerTitle: "为受控起草流程而设计",
    footerDescription:
      "受保护服务端负责整理证据、生成章节，并向已认证客户端返回草稿和 Word 导出文件。",
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
    actionLabel:
      asset.id === "test-dataset"
        ? locale === "zh"
          ? "下载数据集"
          : "Download dataset"
        : copy[locale].downloadButton,
  }));
}

export function DownloadPageContent({ locale = "en" }: { locale?: "en" | "zh" }) {
  const t = copy[locale];
  const assets = getAssets(locale);
  const href = {
    workspace: locale === "zh" ? "/zh/workspace" : "/workspace",
    settings: locale === "zh" ? "/zh/settings" : "/settings",
  };

  const platformIcon = (id: string) => id === "windows" ? WindowsLogo : id.startsWith("macos") ? AppleLogo : id === "linux" ? LinuxLogo : HardDrives;
  return (
    <main className="min-h-screen bg-[#f3f5f1] text-[#15221c]">
      <PublicNav active="download" locale={t.navLocale} />
      <section className="border-b border-[var(--border)] bg-[#f7f9f6] pt-16">
        <div className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">{t.eyebrow}</p><h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] md:text-7xl">{t.title}</h1><p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted)]">{t.description}</p><div className="mt-8 flex flex-wrap gap-3"><a href="#downloads" className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--accent)] px-5 text-sm font-bold text-white"><DownloadSimple size={17} weight="bold" />{t.primaryCta}</a><Link href={href.workspace} className="inline-flex h-11 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-5 text-sm font-bold">{t.workspaceCta}<ArrowRight size={17} weight="bold" /></Link></div></div>
          <div className="rounded-[14px] border border-[var(--border)] bg-[#173128] p-7 text-white shadow-[var(--shadow-soft)]"><p className="text-sm font-semibold">{t.releaseTitle}</p><p className="mt-1 text-xs text-[#b9cbc1]">{t.releaseDescription}</p><div className="mt-8 grid gap-5 sm:grid-cols-2">{t.included.map(item=><div key={item} className="flex items-start gap-3"><CheckCircle size={19} weight="fill" className="mt-0.5 shrink-0 text-[#82b8a8]"/><p className="text-sm leading-6 text-[#d6e1db]">{item}</p></div>)}</div></div>
        </div>
      </section>

      <section id="downloads" className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mb-10 max-w-3xl"><h2 className="text-3xl font-semibold tracking-[-0.035em] lg:text-5xl">{t.downloadsTitle}</h2><p className="mt-4 text-sm leading-7 text-[var(--muted)]">{t.downloadsDescription}</p>
          <div className="flex flex-wrap gap-4">
            <a href="#install-guide" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">{t.guideCta}<ArrowRight size={16} weight="bold" /></a><Link href={href.settings} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">{t.settingsCta}<ArrowRight size={16} weight="bold" /></Link>
          </div>
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => { const Icon=platformIcon(asset.id); return (
            <article key={asset.id} className={`flex min-h-[250px] flex-col rounded-[14px] border border-[var(--border)] p-6 ${asset.recommended ? "bg-[#e5efeb] md:col-span-2 xl:col-span-1" : "bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Icon size={25} weight="duotone" className="text-[var(--accent)]" />
                  <h3 className="mt-2 text-lg font-semibold">{asset.title}</h3>
                </div>
                {asset.recommended && (
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                    {t.recommended}
                  </span>
                )}
              </div>
              <p className="mt-4 flex-1 text-sm leading-6 text-[var(--muted)]">{asset.description}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[var(--muted)]">{asset.platform}</span>
                <a
                  href={asset.downloadHref}
                  className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  <DownloadSimple size={16} weight="bold" />
                  {asset.actionLabel}
                </a>
              </div>
            </article>
          )})}
        </div>
      </section>

      <section id="install-guide" className="border-y border-[var(--border)] bg-[#e7ede8]">
        <div className="mx-auto max-w-[1380px] px-5 py-20 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em]">{t.guideTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{t.guideDescription}</p>
              <div className="mt-6 rounded-[10px] border border-[#bec9c0] bg-white p-5">
                <p className="text-sm font-semibold">{t.guideNoteTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#637064]">{t.guideNote}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {t.guideItems.map((item) => (
                <article key={item.title} className="rounded-[10px] border border-[#cbd4cd] bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--accent)]">
                      {item.badge}
                    </span>
                  </div>
                  <ol className="mt-4 space-y-3 text-sm leading-6 text-[#334139]">
                    {item.steps.map((step, index) => (
                      <li key={step} className="grid grid-cols-[26px_1fr] gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="min-w-0 [overflow-wrap:anywhere]">{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f9f6]">
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
