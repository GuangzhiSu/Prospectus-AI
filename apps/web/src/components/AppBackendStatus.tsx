"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PROVIDER_UI, type LlmProviderId } from "@/lib/llm-provider-config";

type SettingsSummary = {
  llmProvider: LlmProviderId;
  openaiModel?: string;
  deepseekModel?: string;
  dashscopeModel?: string;
  anthropicModel?: string;
  qwenModel?: string;
};

function shortenModelLabel(s: string, max = 42): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function modelForProvider(s: SettingsSummary): string {
  const meta = PROVIDER_UI[s.llmProvider];
  const field = meta.modelField;
  if (!field) return meta.defaultModel;
  const v = s[field as keyof SettingsSummary];
  return (typeof v === "string" && v.trim()) || meta.defaultModel;
}

export function AppBackendStatus() {
  const [settings, setSettings] = useState<SettingsSummary | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = (await res.json()) as SettingsSummary & { error?: string };
      if (data.error) {
        setSettings(null);
        return;
      }
      setSettings({
        llmProvider: data.llmProvider || "qwen_local",
        openaiModel: data.openaiModel,
        deepseekModel: data.deepseekModel,
        dashscopeModel: data.dashscopeModel,
        anthropicModel: data.anthropicModel,
        qwenModel: data.qwenModel,
      });
    } catch {
      setSettings(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!settings) return null;

  const meta = PROVIDER_UI[settings.llmProvider];
  const detail = modelForProvider(settings);
  const title = `${meta.label} — ${detail}. Click to change.`;

  return (
    <Link
      href="/settings"
      title={title}
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      <span className="shrink-0 text-[var(--muted)]">Backend</span>
      <span className="truncate font-medium text-[var(--foreground)]">
        {meta.shortLabel} · {shortenModelLabel(detail, 36)}
      </span>
    </Link>
  );
}
