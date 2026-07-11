"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppBackendStatus } from "@/components/AppBackendStatus";
import {
  CUSTOM_MODEL,
  PROVIDER_LIST,
  PROVIDER_UI,
  type LlmProviderId,
  type ModelPresetGroup,
} from "@/lib/llm-provider-config";
import { validateApiKeyInput, type MaskedAppSettings } from "@/lib/app-settings-types";

type GpuResp = {
  ok: boolean;
  cuda_available?: boolean;
  device_count?: number;
  device_names?: string[];
  error?: string;
  python?: string;
};

type ModelStatus = { installed: boolean; path: string; mtimeMs?: number };

type SettingsResp = MaskedAppSettings;

type UpdateResp = {
  ok: boolean;
  currentVersion?: string;
  latestVersion?: string;
  latestTag?: string;
  hasUpdate?: boolean;
  releaseUrl?: string;
  installerUrl?: string | null;
  installerName?: string | null;
  error?: string;
};

type FormState = {
  llmProvider: LlmProviderId;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  dashscopeApiKey: string;
  dashscopeBaseUrl: string;
  dashscopeModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  qwenModel: string;
  useCpu: boolean;
  cudaDevice: string;
};

function defaultForm(): FormState {
  return {
    llmProvider: "qwen_local",
    openaiApiKey: "",
    openaiBaseUrl: "",
    openaiModel: PROVIDER_UI.openai.defaultModel,
    deepseekApiKey: "",
    deepseekBaseUrl: "",
    deepseekModel: PROVIDER_UI.deepseek.defaultModel,
    dashscopeApiKey: "",
    dashscopeBaseUrl: "",
    dashscopeModel: PROVIDER_UI.qwen_api.defaultModel,
    anthropicApiKey: "",
    anthropicModel: PROVIDER_UI.anthropic.defaultModel,
    qwenModel: PROVIDER_UI.qwen_local.defaultModel,
    useCpu: false,
    cudaDevice: "0",
  };
}

function settingsToForm(s: SettingsResp, prev: FormState): FormState {
  return {
    ...prev,
    llmProvider: s.llmProvider || "qwen_local",
    openaiBaseUrl: s.openaiBaseUrl || "",
    openaiModel: s.openaiModel || PROVIDER_UI.openai.defaultModel,
    deepseekBaseUrl: s.deepseekBaseUrl || "",
    deepseekModel: s.deepseekModel || PROVIDER_UI.deepseek.defaultModel,
    dashscopeBaseUrl: s.dashscopeBaseUrl || "",
    dashscopeModel: s.dashscopeModel || PROVIDER_UI.qwen_api.defaultModel,
    anthropicModel: s.anthropicModel || PROVIDER_UI.anthropic.defaultModel,
    qwenModel: s.qwenModel || PROVIDER_UI.qwen_local.defaultModel,
    useCpu: Boolean(s.useCpu),
    cudaDevice: s.cudaDevice ?? "0",
    openaiApiKey: "",
    deepseekApiKey: "",
    dashscopeApiKey: "",
    anthropicApiKey: "",
  };
}

function allPresetIds(presets: readonly string[], groups?: readonly ModelPresetGroup[]): string[] {
  if (groups?.length) return groups.flatMap((g) => [...g.models]);
  return [...presets];
}

function modelSelectValue(
  model: string,
  presets: readonly string[],
  groups?: readonly ModelPresetGroup[]
): string {
  const ids = allPresetIds(presets, groups);
  return ids.includes(model) ? model : CUSTOM_MODEL;
}

function ApiKeySetBadge({ set }: { set?: boolean }) {
  if (!set) return null;
  return (
    <span className="text-[var(--muted)]"> (saved — enter a new value to replace)</span>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResp | null>(null);
  const [gpu, setGpu] = useState<GpuResp | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadLog, setDownloadLog] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateResp | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const activeMeta = PROVIDER_UI[form.llmProvider];

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
      setForm((f) => settingsToForm(s, f));
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
    setTestResult(null);
    try {
      const body: Record<string, unknown> = {
        llmProvider: form.llmProvider,
        openaiBaseUrl: form.openaiBaseUrl || undefined,
        openaiModel: form.openaiModel || undefined,
        deepseekBaseUrl: form.deepseekBaseUrl || undefined,
        deepseekModel: form.deepseekModel || undefined,
        dashscopeBaseUrl: form.dashscopeBaseUrl || undefined,
        dashscopeModel: form.dashscopeModel || undefined,
        anthropicModel: form.anthropicModel || undefined,
        qwenModel: form.qwenModel || undefined,
        useCpu: form.useCpu,
        cudaDevice: form.cudaDevice,
      };
      const keyChecks: { value: string; label: string; field: string }[] = [
        { value: form.openaiApiKey, label: "OpenAI API key", field: "openaiApiKey" },
        { value: form.deepseekApiKey, label: "DeepSeek API key", field: "deepseekApiKey" },
        { value: form.dashscopeApiKey, label: "DashScope API key", field: "dashscopeApiKey" },
        { value: form.anthropicApiKey, label: "Anthropic API key", field: "anthropicApiKey" },
      ];
      for (const { value, label, field } of keyChecks) {
        const k = value.trim();
        if (!k) continue;
        const keyErr = validateApiKeyInput(k, label);
        if (keyErr) throw new Error(keyErr);
        body[field] = k;
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSettings(data);
      setForm((f) => settingsToForm(data, f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function isTestConfigDirty(): boolean {
    if (!settings) return true;
    if (form.llmProvider !== settings.llmProvider) return true;
    if (form.llmProvider === "qwen_local") return false;

    const keyDirty =
      form.openaiApiKey.trim() ||
      form.deepseekApiKey.trim() ||
      form.dashscopeApiKey.trim() ||
      form.anthropicApiKey.trim();

    if (keyDirty) return true;

    switch (form.llmProvider) {
      case "openai":
        return (
          form.openaiBaseUrl !== (settings.openaiBaseUrl || "") ||
          form.openaiModel !== (settings.openaiModel || PROVIDER_UI.openai.defaultModel)
        );
      case "deepseek":
        return (
          form.deepseekBaseUrl !== (settings.deepseekBaseUrl || "") ||
          form.deepseekModel !== (settings.deepseekModel || PROVIDER_UI.deepseek.defaultModel)
        );
      case "qwen_api":
        return (
          form.dashscopeBaseUrl !== (settings.dashscopeBaseUrl || "") ||
          form.dashscopeModel !== (settings.dashscopeModel || PROVIDER_UI.qwen_api.defaultModel)
        );
      case "anthropic":
        return (
          form.anthropicModel !== (settings.anthropicModel || PROVIDER_UI.anthropic.defaultModel)
        );
      default:
        return false;
    }
  }

  async function handleTestConnection() {
    setTestResult(null);
    setError(null);
    if (form.llmProvider === "qwen_local") {
      setTestResult({
        ok: false,
        text: "Local Qwen has no remote API — save settings and run Agent1 to verify the model loads.",
      });
      return;
    }
    if (isTestConfigDirty()) {
      setTestResult({
        ok: false,
        text: "Test uses saved settings only. Click “Save settings” first, then try again.",
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-llm", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setTestResult({ ok: true, text: data.message || "Connection OK." });
      } else {
        setTestResult({ ok: false, text: data.error || `Request failed (${res.status})` });
      }
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
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

  async function handleCheckUpdates() {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/updates/check", { cache: "no-store" });
      const data = (await res.json()) as UpdateResp;
      setUpdateStatus(data);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Update check failed");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update check failed";
      setUpdateStatus({ ok: false, error: message });
    } finally {
      setCheckingUpdate(false);
    }
  }

  function renderModelField(
    label: string,
    model: string,
    presets: readonly string[],
    onModel: (v: string) => void,
    groups?: readonly ModelPresetGroup[]
  ) {
    const selectVal = modelSelectValue(model, presets, groups);
    return (
      <>
        <label className="flex flex-col gap-1 text-sm">
          <span>{label}</span>
          <select
            value={selectVal}
            onChange={(e) => {
              const v = e.target.value;
              onModel(v === CUSTOM_MODEL ? "" : v);
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
          >
            {groups?.length
              ? groups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.models.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </optgroup>
                ))
              : presets.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
            <option value={CUSTOM_MODEL}>Custom…</option>
          </select>
        </label>
        {selectVal === CUSTOM_MODEL && (
          <label className="flex flex-col gap-1 text-sm">
            <span>Custom model ID</span>
            <input
              value={model}
              onChange={(e) => onModel(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
              placeholder="e.g. qwen3.5-plus"
            />
          </label>
        )}
      </>
    );
  }

  function renderCloudPanel() {
    const p = form.llmProvider;
    if (p === "qwen_local") return null;

    const keyField =
      p === "openai"
        ? "openaiApiKey"
        : p === "deepseek"
          ? "deepseekApiKey"
          : p === "qwen_api"
            ? "dashscopeApiKey"
            : "anthropicApiKey";

    const keySet =
      p === "openai"
        ? settings?.openaiApiKeySet
        : p === "deepseek"
          ? settings?.deepseekApiKeySet
          : p === "qwen_api"
            ? settings?.dashscopeApiKeySet
            : settings?.anthropicApiKeySet;

    return (
      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
        <h3 className="text-sm font-medium">{activeMeta.label} — API connection</h3>
        <label className="flex flex-col gap-1 text-sm">
          <span>
            API key
            <ApiKeySetBadge set={keySet} />
          </span>
          <input
            type="password"
            autoComplete="off"
            value={form[keyField]}
            onChange={(e) =>
              setForm((f) => ({ ...f, [keyField]: e.target.value }))
            }
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
            placeholder={activeMeta.keyPlaceholder}
          />
        </label>

        {p === "openai" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span>Base URL (optional)</span>
              <input
                value={form.openaiBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, openaiBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
            </label>
            {renderModelField(
              "Model",
              form.openaiModel,
              activeMeta.modelPresets,
              (v) => setForm((f) => ({ ...f, openaiModel: v })),
              activeMeta.modelPresetGroups
            )}
          </>
        )}

        {p === "deepseek" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span>Base URL (optional)</span>
              <input
                value={form.deepseekBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, deepseekBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
              <span className="text-xs text-[var(--muted)]">
                Official OpenAI-compatible base: api.deepseek.com (SDK appends /chat/completions).
              </span>
            </label>
            {renderModelField(
              "Model",
              form.deepseekModel,
              activeMeta.modelPresets,
              (v) => setForm((f) => ({ ...f, deepseekModel: v })),
              activeMeta.modelPresetGroups
            )}
          </>
        )}

        {p === "qwen_api" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span>Base URL</span>
              <input
                value={form.dashscopeBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, dashscopeBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
              <span className="text-xs text-[var(--muted)]">
                Mainland China (default): dashscope.aliyuncs.com/compatible-mode/v1 — International
                (Singapore): dashscope-intl.aliyuncs.com/compatible-mode/v1
              </span>
            </label>
            {renderModelField(
              "Model (DashScope model ID)",
              form.dashscopeModel,
              activeMeta.modelPresets,
              (v) => setForm((f) => ({ ...f, dashscopeModel: v })),
              activeMeta.modelPresetGroups
            )}
          </>
        )}

        {p === "anthropic" &&
          renderModelField(
            "Model",
            form.anthropicModel,
            activeMeta.modelPresets,
            (v) => setForm((f) => ({ ...f, anthropicModel: v })),
            activeMeta.modelPresetGroups
          )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={testing || saving}
            onClick={() => void handleTestConnection()}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
          <span className="text-xs text-[var(--muted)]">
            Uses saved settings on disk — save first, then test.
          </span>
        </div>
        {testResult && (
          <p className={`text-sm ${testResult.ok ? "text-green-600" : "text-amber-600"}`}>
            {testResult.text}
          </p>
        )}
      </div>
    );
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
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Model &amp; inference</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Agent1, Agent2, and document chat use the backend selected here. Saved to{" "}
              <code className="rounded bg-[var(--surface)] px-1 text-xs">
                ~/.config/ProspectusAI/settings.json
              </code>
              .
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <AppBackendStatus />
            <Link href="/workspace" className="text-sm text-[var(--accent)] hover:underline">
              ← Back to workspace
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                Software updates
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Check GitHub Releases for a newer Prospectus AI installer.
              </p>
            </div>
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={() => void handleCheckUpdates()}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-50"
            >
              {checkingUpdate ? "Checking…" : "Check for updates"}
            </button>
          </div>
          {updateStatus && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm">
              {updateStatus.ok ? (
                <>
                  <p className="font-medium">
                    {updateStatus.hasUpdate
                      ? `New version available: ${updateStatus.latestVersion}`
                      : `You are up to date: ${updateStatus.currentVersion}`}
                  </p>
                  {updateStatus.hasUpdate && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {updateStatus.installerUrl && (
                        <a
                          href={updateStatus.installerUrl}
                          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                        >
                          Download installer
                        </a>
                      )}
                      {updateStatus.releaseUrl && (
                        <a
                          href={updateStatus.releaseUrl}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)]"
                        >
                          Open release notes
                        </a>
                      )}
                    </div>
                  )}
                  {updateStatus.hasUpdate && !updateStatus.installerUrl && (
                    <p className="mt-2 text-amber-600">
                      The latest release is available, but no Windows installer asset was found yet.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-amber-600">{updateStatus.error || "Update check failed"}</p>
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Environment
          </h2>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-medium">GPU / PyTorch</h3>
            {gpu?.ok && gpu.cuda_available ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
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
              <p className="mt-2 text-sm text-[var(--muted)]">
                {gpu?.error ||
                  "CUDA not available — enable CPU mode below or install CUDA PyTorch."}{" "}
                ({gpu?.python || "python"})
              </p>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 text-xs text-[var(--accent)] hover:underline"
            >
              Refresh probe
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Local weights (Qwen)
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Download once or point to an existing folder. Used only when “Local Qwen” is selected.
          </p>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm text-[var(--muted)]">
              Default cache:{" "}
              <code className="break-all text-xs text-[var(--foreground)]">{modelStatus?.path}</code>
              {modelStatus?.installed ? (
                <span className="ml-2 text-green-600">Installed</span>
              ) : (
                <span className="ml-2 text-amber-600">Not found</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {downloading ? "Downloading…" : "Download Qwen3.5-4B"}
              </button>
              {modelStatus?.installed && (
                <button
                  type="button"
                  onClick={useDownloadedPath}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Use downloaded folder path
                </button>
              )}
            </div>
            {downloadLog && (
              <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-xs">
                {downloadLog}
              </pre>
            )}
          </div>
        </section>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Inference backend
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Pick one provider. Cloud APIs need an API key; document chat uses the same credentials
              for OpenAI-compatible providers.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Provider</span>
            <select
              value={form.llmProvider}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  llmProvider: e.target.value as LlmProviderId,
                }))
              }
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5"
            >
              {PROVIDER_LIST.map((meta) => (
                <option key={meta.id} value={meta.id}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p className="text-[var(--muted)]">{activeMeta.description}</p>
          </label>

          {renderCloudPanel()}

          {form.llmProvider === "qwen_local" && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <label className="flex flex-col gap-1 text-sm">
                <span>Qwen model (Hugging Face id or local folder path)</span>
                <input
                  value={form.qwenModel}
                  onChange={(e) => setForm((f) => ({ ...f, qwenModel: e.target.value }))}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                />
              </label>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-medium">Device (local Qwen only)</h3>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.useCpu}
                onChange={(e) => setForm((f) => ({ ...f, useCpu: e.target.checked }))}
              />
              Force CPU
            </label>
            {!form.useCpu && (
              <label className="mt-3 flex flex-col gap-1 text-sm">
                <span>CUDA device index</span>
                <input
                  value={form.cudaDevice}
                  onChange={(e) => setForm((f) => ({ ...f, cudaDevice: e.target.value }))}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
                />
              </label>
            )}
          </div>

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
