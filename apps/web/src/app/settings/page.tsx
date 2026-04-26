"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SettingsResp = {
  llmProvider: "qwen_local" | "openai";
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  qwenModel?: string;
  useCpu?: boolean;
  cudaDevice?: string;
  openaiApiKeySet?: boolean;
};

type GpuResp = {
  ok: boolean;
  cuda_available?: boolean;
  device_count?: number;
  device_names?: string[];
  error?: string;
  python?: string;
};

type ModelStatus = { installed: boolean; path: string; mtimeMs?: number };

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [gpu, setGpu] = useState<GpuResp | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadLog, setDownloadLog] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    llmProvider: "qwen_local" as "qwen_local" | "openai",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: "gpt-4o-mini",
    qwenModel: "Qwen/Qwen3.5-4B",
    useCpu: false,
    cudaDevice: "0",
  });

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [s, g, m] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/system/gpu").then((r) => r.json()),
        fetch("/api/models/status").then((r) => r.json()),
      ]);
      if (s.error) throw new Error(s.error);
      setSettings(s);
      setGpu(g);
      setModelStatus(m);
      setForm((f) => ({
        ...f,
        llmProvider: s.llmProvider || "qwen_local",
        openaiBaseUrl: s.openaiBaseUrl || "",
        openaiModel: s.openaiModel || "gpt-4o-mini",
        qwenModel: s.qwenModel || "Qwen/Qwen3.5-4B",
        useCpu: Boolean(s.useCpu),
        cudaDevice: s.cudaDevice ?? "0",
        openaiApiKey: "",
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        llmProvider: form.llmProvider,
        openaiBaseUrl: form.openaiBaseUrl || undefined,
        openaiModel: form.openaiModel || undefined,
        qwenModel: form.qwenModel || undefined,
        useCpu: form.useCpu,
        cudaDevice: form.cudaDevice,
      };
      if (form.openaiApiKey.trim()) {
        body.openaiApiKey = form.openaiApiKey.trim();
      }
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data);
      setForm((f) => ({ ...f, openaiApiKey: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setDownloadLog(null);
    setError(null);
    try {
      const res = await fetch("/api/models/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId: "Qwen/Qwen3.5-4B" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Download failed");
      setDownloadLog(data.log || "Done.");
      await refresh();
      if (data.path) {
        setForm((f) => ({ ...f, qwenModel: data.path as string }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function useDownloadedPath() {
    if (modelStatus?.path) {
      setForm((f) => ({ ...f, qwenModel: modelStatus.path }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Inference &amp; GPU settings</h1>
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            ← Back to workspace
          </Link>
        </div>

        <p className="text-sm text-[var(--muted)] mb-6">
          Preferences are saved under your user profile (Windows:{" "}
          <code className="text-xs">%APPDATA%\ProspectusAI\settings.json</code>
          ). Agent1 and Agent2 read them on each run.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold mb-2">GPU / PyTorch probe</h2>
          {gpu?.ok && gpu.cuda_available ? (
            <ul className="text-sm text-[var(--muted)] list-disc pl-5">
              <li>
                CUDA available — {gpu.device_count} device(s) ({gpu.python})
              </li>
              {(gpu.device_names || []).map((n, i) => (
                <li key={i}>
                  [{i}] {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              {gpu?.error ||
                "CUDA not available or PyTorch not installed — enable CPU mode below or install CUDA-enabled PyTorch."}{" "}
              ({gpu?.python || "python"})
            </p>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 text-xs text-[var(--accent)] hover:underline"
          >
            Refresh probe
          </button>
        </section>

        <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold mb-2">Local Qwen model (Hugging Face)</h2>
          <p className="text-sm text-[var(--muted)] mb-3">
            Default cache: <code className="text-xs break-all">{modelStatus?.path}</code>
            {modelStatus?.installed ? (
              <span className="text-green-600 ml-2">Installed</span>
            ) : (
              <span className="text-amber-600 ml-2">Not found (config.json missing)</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {downloading ? "Downloading…" : "Download Qwen3.5-4B (~8GB+)"}
            </button>
            {modelStatus?.installed && (
              <button
                type="button"
                onClick={useDownloadedPath}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                Set Qwen path to downloaded folder
              </button>
            )}
          </div>
          {downloadLog && (
            <pre className="text-xs bg-black/30 p-2 rounded max-h-40 overflow-auto whitespace-pre-wrap">
              {downloadLog}
            </pre>
          )}
        </section>

        <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Backend</h2>
          <label className="flex flex-col gap-1 text-sm">
            <span>Provider</span>
            <select
              value={form.llmProvider}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  llmProvider: e.target.value as "qwen_local" | "openai",
                }))
              }
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2"
            >
              <option value="qwen_local">Local Qwen (Hugging Face / GPU or CPU)</option>
              <option value="openai">OpenAI-compatible API (ChatGPT, Azure OpenAI, etc.)</option>
            </select>
          </label>

          {form.llmProvider === "openai" && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span>API key {settings?.openaiApiKeySet ? "(saved; enter to replace)" : ""}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.openaiApiKey}
                  onChange={(e) => setForm((f) => ({ ...f, openaiApiKey: e.target.value }))}
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2"
                  placeholder="sk-…"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Base URL (optional)</span>
                <input
                  value={form.openaiBaseUrl}
                  onChange={(e) => setForm((f) => ({ ...f, openaiBaseUrl: e.target.value }))}
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2"
                  placeholder="https://api.openai.com/v1"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Model name</span>
                <input
                  value={form.openaiModel}
                  onChange={(e) => setForm((f) => ({ ...f, openaiModel: e.target.value }))}
                  className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2"
                />
              </label>
            </>
          )}

          {form.llmProvider === "qwen_local" && (
            <label className="flex flex-col gap-1 text-sm">
              <span>Qwen model (HF id or local folder path)</span>
              <input
                value={form.qwenModel}
                onChange={(e) => setForm((f) => ({ ...f, qwenModel: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 font-mono text-xs"
              />
            </label>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useCpu}
              onChange={(e) => setForm((f) => ({ ...f, useCpu: e.target.checked }))}
            />
            Force CPU (ignore GPU; slow but works without CUDA)
          </label>

          {!form.useCpu && (
            <label className="flex flex-col gap-1 text-sm">
              <span>CUDA device index (CUDA_VISIBLE_DEVICES)</span>
              <input
                value={form.cudaDevice}
                onChange={(e) => setForm((f) => ({ ...f, cudaDevice: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-2 w-24"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      </div>
    </div>
  );
}
