import Image from "next/image";
import Link from "next/link";

type PublicNavProps = {
  active: "overview" | "diagnostic" | "drafting" | "download" | "workspace";
  locale?: "en" | "zh";
};

const labels = {
  en: {
    overview: "Overview",
    diagnostic: "IPO Diagnostic",
    drafting: "Prospectus Drafting",
    download: "Download",
    workspace: "Workspace",
    docs: "Docs / GitHub",
    language: "中文",
  },
  zh: {
    overview: "产品概览",
    diagnostic: "上市诊断",
    drafting: "招股书生成",
    download: "下载",
    workspace: "工作台",
    docs: "文档 / GitHub",
    language: "EN",
  },
};

const hrefs = {
  en: {
    overview: "/",
    diagnostic: "/diagnostic",
    drafting: "/drafting",
    download: "/download",
    workspace: "/workspace",
  },
  zh: {
    overview: "/zh",
    diagnostic: "/zh/diagnostic",
    drafting: "/zh/drafting",
    download: "/zh/download",
    workspace: "/zh/workspace",
  },
};

function navClass(isActive: boolean) {
  return [
    "px-3 py-2 text-sm font-semibold transition",
    isActive ? "bg-[#17201b] text-white" : "text-[#334139] hover:bg-[#eef3ec]",
  ].join(" ");
}

export function PublicNav({ active, locale = "en" }: PublicNavProps) {
  const t = labels[locale];
  const currentHrefs = hrefs[locale];
  const alternateHrefs = hrefs[locale === "zh" ? "en" : "zh"];

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 border border-[#d5ddd2]/80 bg-[#f7faf6]/95 px-3 py-2 text-[#17201b] shadow-lg backdrop-blur md:px-4">
        <Link href={currentHrefs.overview} className="flex min-w-0 items-center gap-2">
          <Image src="/app-icon.png" alt="AI Prospectus logo" width={32} height={32} />
          <span className="hidden text-sm font-semibold sm:inline">AI Prospectus</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          <Link href={currentHrefs.overview} className={navClass(active === "overview")}>
            {t.overview}
          </Link>
          <Link href={currentHrefs.diagnostic} className={navClass(active === "diagnostic")}>
            {t.diagnostic}
          </Link>
          <Link href={currentHrefs.drafting} className={navClass(active === "drafting")}>
            {t.drafting}
          </Link>
          <Link href={currentHrefs.workspace} className={navClass(active === "workspace")}>
            {t.workspace}
          </Link>
          <Link href={currentHrefs.download} className={navClass(active === "download")}>
            {t.download}
          </Link>
          <a
            href="https://github.com/GuangzhiSu/Prospectus-AI"
            className={navClass(false)}
          >
            {t.docs}
          </a>
          <Link href={alternateHrefs[active]} className={navClass(false)}>
            {t.language}
          </Link>
        </div>
      </nav>
    </header>
  );
}
