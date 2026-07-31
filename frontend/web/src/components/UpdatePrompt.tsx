"use client";

import { useEffect, useMemo, useState } from "react";

import { isDesktopShell } from "@/lib/desktop-app";

type UpdateResp = {
  ok: boolean;
  currentVersion?: string;
  latestVersion?: string;
  latestTag?: string;
  hasUpdate?: boolean;
  releaseUrl?: string;
  installerUrl?: string | null;
  installerName?: string | null;
  downloadPageUrl?: string;
  error?: string;
};

const OFFICIAL_DOWNLOAD_URL = "https://ai-prospectus.com/download";
const REMIND_LATER_MS = 24 * 60 * 60 * 1000;

function isLocalRuntime(): boolean {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function updateDismissKey(update: UpdateResp): string {
  return `prospectus-update-snoozed:${update.latestTag || update.latestVersion || "latest"}`;
}

function updateIsSnoozed(update: UpdateResp): boolean {
  try {
    const value = window.localStorage.getItem(updateDismissKey(update));
    return value ? Number(value) > Date.now() : false;
  } catch {
    return false;
  }
}

function openExternal(url: string | undefined) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function UpdatePrompt() {
  const [update, setUpdate] = useState<UpdateResp | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDesktopShell() && !isLocalRuntime()) return;

    let cancelled = false;

    async function checkForUpdates() {
      try {
        const res = await fetch("/api/updates/check", { cache: "no-store" });
        const data = (await res.json()) as UpdateResp;
        if (cancelled || !res.ok || !data.ok || !data.hasUpdate) return;

        if (updateIsSnoozed(data)) return;

        setUpdate(data);
        setVisible(true);
      } catch {
        // Update checks should never block the drafting workspace.
      }
    }

    void checkForUpdates();

    return () => {
      cancelled = true;
    };
  }, []);

  const locale = useMemo(() => {
    if (typeof window === "undefined") return "en";
    return window.location.pathname.startsWith("/zh") ? "zh" : "en";
  }, []);

  if (!visible || !update) return null;

  const activeUpdate = update;
  const latest = activeUpdate.latestVersion || activeUpdate.latestTag || "latest";
  const primaryUrl = activeUpdate.installerUrl || activeUpdate.downloadPageUrl || OFFICIAL_DOWNLOAD_URL;
  const releaseUrl = activeUpdate.releaseUrl || activeUpdate.downloadPageUrl || OFFICIAL_DOWNLOAD_URL;
  const copy =
    locale === "zh"
      ? {
          eyebrow: "发现新版本",
          title: `Prospectus AI ${latest} 可以更新`,
          body: `当前版本是 ${activeUpdate.currentVersion || "unknown"}。建议下载新版安装包，关闭当前应用后运行安装程序完成替换。`,
          primary: activeUpdate.installerUrl ? "下载新版安装包" : "打开官网下载页",
          secondary: "查看发布说明",
          later: "稍后",
        }
      : {
          eyebrow: "Update available",
          title: `Prospectus AI ${latest} is ready`,
          body: `You are running ${activeUpdate.currentVersion || "unknown"}. Download the newer installer, close this app, then run the installer to replace it.`,
          primary: activeUpdate.installerUrl ? "Download installer" : "Open download page",
          secondary: "Release notes",
          later: "Later",
        };

  function dismiss() {
    try {
      window.localStorage.setItem(updateDismissKey(activeUpdate), String(Date.now() + REMIND_LATER_MS));
    } catch {
      // Ignore storage errors.
    }
    setVisible(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase text-sky-700">{copy.eyebrow}</p>
        <h2 id="update-prompt-title" className="mt-2 text-xl font-semibold leading-7">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.body}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => openExternal(primaryUrl)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
          >
            {copy.primary}
          </button>
          <button
            type="button"
            onClick={() => openExternal(releaseUrl)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {copy.secondary}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            {copy.later}
          </button>
        </div>
      </div>
    </div>
  );
}
