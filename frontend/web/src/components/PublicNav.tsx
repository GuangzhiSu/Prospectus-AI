"use client";

import Image from "next/image";
import Link from "next/link";
import { GithubLogo, List, Translate, X } from "@phosphor-icons/react";
import { useState } from "react";

type PublicNavProps = {
  active: "home" | "overview" | "download" | "eligibility" | "drafting" | "developer";
  locale?: "en" | "zh";
};

const labels = {
  en: {
    home: "Overview", eligibility: "IPO Diagnostic", drafting: "Drafting",
    download: "Download", workspace: "Draft Workspace", developer: "Developer Tools", github: "GitHub",
    language: "中文", languageHref: "/zh", eligibilityHref: "/diagnostic",
    draftingHref: "/drafting", downloadHref: "/download", workspaceHref: "/workspace", developerHref: "/developer-tools",
    menu: "Open navigation",
  },
  zh: {
    home: "产品概览", eligibility: "上市诊断", drafting: "招股书生成",
    download: "下载", workspace: "起草工作区", developer: "开发者工具", github: "GitHub",
    language: "English", languageHref: "/", eligibilityHref: "/zh/diagnostic",
    draftingHref: "/zh/drafting", downloadHref: "/zh/download", workspaceHref: "/zh/workspace", developerHref: "/developer-tools",
    menu: "打开导航",
  },
};

export function PublicNav({ active, locale = "en" }: PublicNavProps) {
  const [open, setOpen] = useState(false);
  const t = labels[locale];
  const homeHref = locale === "zh" ? "/zh" : "/";
  const items = [
    { label: t.home, href: homeHref, selected: active === "home" || active === "overview" },
    { label: t.eligibility, href: t.eligibilityHref, selected: active === "eligibility" },
    { label: t.drafting, href: t.draftingHref, selected: active === "drafting" },
    { label: t.download, href: t.downloadHref, selected: active === "download" },
    { label: t.developer, href: t.developerHref, selected: active === "developer" },
  ];
  const itemClass = (selected: boolean) =>
    `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${selected ? "bg-[#e5efeb] text-[#105548]" : "text-[#526159] hover:bg-[#edf1ed] hover:text-[#15221c]"}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#d9dfda]/90 bg-[#f8faf7]/95 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-6 px-5 lg:px-8" aria-label="Primary navigation">
        <Link href={homeHref} className="flex shrink-0 items-center gap-2.5 rounded-md">
          <Image src="/app-icon.png" alt="" width={30} height={30} priority />
          <span className="text-sm font-bold tracking-[-0.01em] text-[#15221c]">AI Prospectus</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={itemClass(item.selected)} aria-current={item.selected ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <a href="https://github.com/GuangzhiSu/Prospectus-AI" className={itemClass(false)} target="_blank" rel="noreferrer">
            <span className="flex items-center gap-1.5"><GithubLogo size={17} weight="bold" />{t.github}</span>
          </a>
          <Link href={t.languageHref} className={itemClass(false)}>
            <span className="flex items-center gap-1.5"><Translate size={17} weight="bold" />{t.language}</span>
          </Link>
          <Link href={t.workspaceHref} className="ml-2 rounded-md bg-[#176b5b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#105548]">
            {t.workspace}
          </Link>
        </div>

        <button type="button" className="rounded-md border border-[#d9dfda] bg-white p-2 text-[#15221c] lg:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={t.menu}>
          {open ? <X size={21} weight="bold" /> : <List size={21} weight="bold" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[#d9dfda] bg-[#f8faf7] px-5 pb-5 pt-3 lg:hidden">
          <div className="mx-auto grid max-w-[1380px] gap-1">
            {items.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={itemClass(item.selected)}>{item.label}</Link>
            ))}
            <Link href={t.workspaceHref} onClick={() => setOpen(false)} className="mt-2 rounded-md bg-[#176b5b] px-4 py-3 text-center text-sm font-semibold text-white">{t.workspace}</Link>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <a href="https://github.com/GuangzhiSu/Prospectus-AI" target="_blank" rel="noreferrer" className={itemClass(false)}>{t.github}</a>
              <Link href={t.languageHref} className={itemClass(false)}>{t.language}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
