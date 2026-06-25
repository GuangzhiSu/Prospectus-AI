import Image from "next/image";
import Link from "next/link";

type PublicNavProps = {
  active: "home" | "download";
  locale?: "en" | "zh";
};

const labels = {
  en: {
    home: "Main",
    download: "Download",
    workspace: "Workspace",
    github: "GitHub",
    language: "中文",
    languageHref: "/zh",
  },
  zh: {
    home: "主页",
    download: "下载",
    workspace: "工作区",
    github: "GitHub",
    language: "English",
    languageHref: "/",
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
  const homeHref = locale === "zh" ? "/zh" : "/";

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 border border-[#d5ddd2]/80 bg-[#f7faf6]/95 px-3 py-2 text-[#17201b] shadow-lg backdrop-blur md:px-4">
        <Link href={homeHref} className="flex min-w-0 items-center gap-2">
          <Image src="/app-icon.png" alt="AI Prospectus logo" width={32} height={32} />
          <span className="hidden text-sm font-semibold sm:inline">AI Prospectus</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          <Link href={homeHref} className={navClass(active === "home")}>
            {t.home}
          </Link>
          <Link href="/download" className={navClass(active === "download")}>
            {t.download}
          </Link>
          <Link href="/workspace" className={navClass(false)}>
            {t.workspace}
          </Link>
          <a
            href="https://github.com/GuangzhiSu/Prospectus-AI"
            className={navClass(false)}
          >
            {t.github}
          </a>
          <Link href={t.languageHref} className={navClass(false)}>
            {t.language}
          </Link>
        </div>
      </nav>
    </header>
  );
}
