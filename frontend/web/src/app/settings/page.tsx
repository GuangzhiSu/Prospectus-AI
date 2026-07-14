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
type SettingsLocale = "en" | "zh";
type SettingsCopy = {
  loading: string;
  backToWorkspace: string;
  pageTitle: string;
  pageDescription: string;
  softwareUpdates: string;
  updatesDescription: string;
  checkingUpdates: string;
  checkUpdates: string;
  newVersionAvailable: (version?: string) => string;
  upToDate: (version?: string) => string;
  downloadInstaller: string;
  openReleaseNotes: string;
  openDownloadPage: string;
  latestReleaseNoInstaller: string;
  updateCheckFailed: string;
  environment: string;
  gpuHeading: string;
  cudaAvailable: (count?: number, python?: string) => string;
  cudaNotAvailable: string;
  refreshProbe: string;
  localWeights: string;
  localWeightsDescription: string;
  defaultCache: string;
  installed: string;
  notFound: string;
  downloadQwen: string;
  downloading: string;
  useDownloadedPath: string;
  inferenceBackend: string;
  inferenceDescription: string;
  provider: string;
  customModelId: string;
  customModelPlaceholder: string;
  apiConnection: string;
  billingText: string;
  openBilling: string;
  billingLabels: Partial<Record<LlmProviderId, string>>;
  apiKey: string;
  baseUrlOptional: string;
  model: string;
  deepseekBaseHelp: string;
  dashscopeBaseUrl: string;
  dashscopeModelLabel: string;
  dashscopeBaseHelp: string;
  testConnection: string;
  testing: string;
  testSavedSettingsHint: string;
  localQwenNoRemoteApi: string;
  saveBeforeTest: string;
  connectionOk: string;
  requestFailed: (status: number) => string;
  testFailed: string;
  qwenModelLabel: string;
  deviceTitle: string;
  forceCpu: string;
  cudaDeviceIndex: string;
  saveSettings: string;
  saving: string;
  loadFailed: string;
  downloadFailed: string;
  saveFailed: string;
};

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

const SETTINGS_COPY = {
  en: {
    loading: "Loading settings…",
    backToWorkspace: "← Back to workspace",
    pageTitle: "Model & inference",
    pageDescription:
      "Agent1, Agent2, and document chat use the backend selected here. Saved to",
    softwareUpdates: "Software updates",
    updatesDescription: "Check GitHub Releases for a newer Prospectus AI installer.",
    checkingUpdates: "Checking…",
    checkUpdates: "Check for updates",
    newVersionAvailable: (version?: string) => `New version available: ${version || "latest"}`,
    upToDate: (version?: string) => `You are up to date: ${version || "current"}`,
    downloadInstaller: "Download installer",
    openReleaseNotes: "Open release notes",
    openDownloadPage: "Open download page",
    latestReleaseNoInstaller:
      "The latest release is available, but no Windows installer asset was found yet.",
    updateCheckFailed: "Update check failed",
    environment: "Environment",
    gpuHeading: "GPU / PyTorch",
    cudaAvailable: (count?: number, python?: string) =>
      `CUDA available — ${count ?? 0} device(s) (${python || "python"})`,
    cudaNotAvailable: "CUDA not available — enable CPU mode below or install CUDA PyTorch.",
    refreshProbe: "Refresh probe",
    localWeights: "Local weights (Qwen)",
    localWeightsDescription:
      "Download once or point to an existing folder. Used only when “Local Qwen” is selected.",
    defaultCache: "Default cache:",
    installed: "Installed",
    notFound: "Not found",
    downloadQwen: "Download Qwen3.5-4B",
    downloading: "Downloading…",
    useDownloadedPath: "Use downloaded folder path",
    inferenceBackend: "Inference backend",
    inferenceDescription:
      "Pick one provider. Cloud APIs need an API key; document chat uses the same credentials for OpenAI-compatible providers.",
    provider: "Provider",
    customModelId: "Custom model ID",
    customModelPlaceholder: "e.g. qwen3.5-plus",
    apiConnection: "API connection",
    billingText:
      "Need API credits? Open the provider billing page to top up or check your balance, then return here to save and test the connection.",
    openBilling: "Open billing",
    billingLabels: {
      openai: "Open OpenAI billing",
      deepseek: "Open DeepSeek top-up",
      qwen_api: "Open DashScope billing",
      anthropic: "Open Claude billing",
    },
    apiKey: "API key",
    baseUrlOptional: "Base URL (optional)",
    model: "Model",
    deepseekBaseHelp:
      "Official OpenAI-compatible base: api.deepseek.com (SDK appends /chat/completions).",
    dashscopeBaseUrl: "Base URL",
    dashscopeModelLabel: "Model (DashScope model ID)",
    dashscopeBaseHelp:
      "Mainland China (default): dashscope.aliyuncs.com/compatible-mode/v1 — International (Singapore): dashscope-intl.aliyuncs.com/compatible-mode/v1",
    testConnection: "Test connection",
    testing: "Testing…",
    testSavedSettingsHint: "Uses saved settings on disk — save first, then test.",
    localQwenNoRemoteApi:
      "Local Qwen has no remote API — save settings and run Agent1 to verify the model loads.",
    saveBeforeTest: "Test uses saved settings only. Click “Save settings” first, then try again.",
    connectionOk: "Connection OK.",
    requestFailed: (status: number) => `Request failed (${status})`,
    testFailed: "Test failed",
    qwenModelLabel: "Qwen model (Hugging Face id or local folder path)",
    deviceTitle: "Device (local Qwen only)",
    forceCpu: "Force CPU",
    cudaDeviceIndex: "CUDA device index",
    saveSettings: "Save settings",
    saving: "Saving…",
    loadFailed: "Load failed",
    downloadFailed: "Download failed",
    saveFailed: "Save failed",
  },
  zh: {
    loading: "正在加载设置…",
    backToWorkspace: "← 返回中文工作区",
    pageTitle: "模型与推理",
    pageDescription: "Agent1、Agent2 和文档问答都会使用这里选择的后端。设置会保存到",
    softwareUpdates: "软件更新",
    updatesDescription: "检查 GitHub Releases 中是否有更新的 Prospectus AI 安装包。",
    checkingUpdates: "正在检查…",
    checkUpdates: "检查更新",
    newVersionAvailable: (version?: string) => `发现新版本：${version || "latest"}`,
    upToDate: (version?: string) => `当前已是最新版本：${version || "current"}`,
    downloadInstaller: "下载安装包",
    openReleaseNotes: "打开发布说明",
    openDownloadPage: "打开下载页",
    latestReleaseNoInstaller: "已有最新版本，但暂未找到对应的 Windows 安装包文件。",
    updateCheckFailed: "检查更新失败",
    environment: "运行环境",
    gpuHeading: "GPU / PyTorch",
    cudaAvailable: (count?: number, python?: string) =>
      `CUDA 可用 — ${count ?? 0} 个设备（${python || "python"}）`,
    cudaNotAvailable: "CUDA 不可用 — 可在下方启用 CPU 模式，或安装 CUDA 版 PyTorch。",
    refreshProbe: "刷新检测",
    localWeights: "本地权重（Qwen）",
    localWeightsDescription: "可下载一次，也可以指向已有模型文件夹。仅在选择“Local Qwen”时使用。",
    defaultCache: "默认缓存：",
    installed: "已安装",
    notFound: "未找到",
    downloadQwen: "下载 Qwen3.5-4B",
    downloading: "下载中…",
    useDownloadedPath: "使用已下载的文件夹路径",
    inferenceBackend: "推理后端",
    inferenceDescription:
      "请选择一个模型服务商。云端 API 需要 API key；文档问答会复用同一套 OpenAI-compatible 凭证。",
    provider: "服务商",
    customModelId: "自定义模型 ID",
    customModelPlaceholder: "例如 qwen3.5-plus",
    apiConnection: "API 连接",
    billingText:
      "需要 API 额度？请打开对应服务商的账单或充值页面，完成充值或确认余额后，回到这里保存并测试连接。",
    openBilling: "打开账单页面",
    billingLabels: {
      openai: "打开 OpenAI 账单",
      deepseek: "打开 DeepSeek 充值",
      qwen_api: "打开 DashScope 账单",
      anthropic: "打开 Claude 账单",
    },
    apiKey: "API key",
    baseUrlOptional: "Base URL（可选）",
    model: "模型",
    deepseekBaseHelp:
      "官方 OpenAI-compatible base：api.deepseek.com（SDK 会自动追加 /chat/completions）。",
    dashscopeBaseUrl: "Base URL",
    dashscopeModelLabel: "模型（DashScope model ID）",
    dashscopeBaseHelp:
      "中国内地默认地址：dashscope.aliyuncs.com/compatible-mode/v1；国际站（新加坡）：dashscope-intl.aliyuncs.com/compatible-mode/v1",
    testConnection: "测试连接",
    testing: "测试中…",
    testSavedSettingsHint: "测试只读取已保存到本地的设置，请先保存，再测试。",
    localQwenNoRemoteApi: "本地 Qwen 没有远程 API；请保存设置后运行 Agent1 来确认模型可加载。",
    saveBeforeTest: "测试只使用已保存的设置。请先点击“保存设置”，再重新测试。",
    connectionOk: "连接正常。",
    requestFailed: (status: number) => `请求失败（${status}）`,
    testFailed: "测试失败",
    qwenModelLabel: "Qwen 模型（Hugging Face id 或本地文件夹路径）",
    deviceTitle: "运行设备（仅本地 Qwen）",
    forceCpu: "强制使用 CPU",
    cudaDeviceIndex: "CUDA 设备编号",
    saveSettings: "保存设置",
    saving: "保存中…",
    loadFailed: "加载失败",
    downloadFailed: "下载失败",
    saveFailed: "保存失败",
  },
} satisfies Record<SettingsLocale, SettingsCopy>;

export function SettingsPageContent({ locale = "en" }: { locale?: SettingsLocale }) {
  const t = SETTINGS_COPY[locale];
  const workspaceHref = locale === "zh" ? "/zh/workspace" : "/workspace";
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
      setError(e instanceof Error ? e.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.loadFailed]);

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
      if (!res.ok) throw new Error(data.error || t.saveFailed);
      setSettings(data);
      setForm((f) => settingsToForm(data, f));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.saveFailed);
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
        text: t.localQwenNoRemoteApi,
      });
      return;
    }
    if (isTestConfigDirty()) {
      setTestResult({
        ok: false,
        text: t.saveBeforeTest,
      });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-llm", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setTestResult({ ok: true, text: data.message || t.connectionOk });
      } else {
        setTestResult({ ok: false, text: data.error || t.requestFailed(res.status) });
      }
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : t.testFailed });
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
      if (!res.ok) throw new Error(data.error || t.downloadFailed);
      setDownloadLog(data.log || "Done.");
      await refresh();
      if (data.path) {
        setForm((f) => ({ ...f, qwenModel: data.path as string }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.downloadFailed);
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
        throw new Error(data.error || t.updateCheckFailed);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t.updateCheckFailed;
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
            <span>{t.customModelId}</span>
            <input
              value={model}
              onChange={(e) => onModel(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
              placeholder={t.customModelPlaceholder}
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
        <h3 className="text-sm font-medium">{activeMeta.label} — {t.apiConnection}</h3>
        {activeMeta.billingUrl && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm md:flex-row md:items-center md:justify-between">
            <p className="text-[var(--muted)]">
              {t.billingText}
            </p>
            <a
              href={activeMeta.billingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)]"
            >
              {t.billingLabels[p] || activeMeta.billingLabel || t.openBilling}
            </a>
          </div>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span>
            {t.apiKey}
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
              <span>{t.baseUrlOptional}</span>
              <input
                value={form.openaiBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, openaiBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
            </label>
            {renderModelField(
              t.model,
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
              <span>{t.baseUrlOptional}</span>
              <input
                value={form.deepseekBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, deepseekBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
              <span className="text-xs text-[var(--muted)]">
                {t.deepseekBaseHelp}
              </span>
            </label>
            {renderModelField(
              t.model,
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
              <span>{t.dashscopeBaseUrl}</span>
              <input
                value={form.dashscopeBaseUrl}
                onChange={(e) => setForm((f) => ({ ...f, dashscopeBaseUrl: e.target.value }))}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                placeholder={activeMeta.baseUrlPlaceholder}
              />
              <span className="text-xs text-[var(--muted)]">
                {t.dashscopeBaseHelp}
              </span>
            </label>
            {renderModelField(
              t.dashscopeModelLabel,
              form.dashscopeModel,
              activeMeta.modelPresets,
              (v) => setForm((f) => ({ ...f, dashscopeModel: v })),
              activeMeta.modelPresetGroups
            )}
          </>
        )}

        {p === "anthropic" &&
          renderModelField(
            t.model,
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
            {testing ? t.testing : t.testConnection}
          </button>
          <span className="text-xs text-[var(--muted)]">
            {t.testSavedSettingsHint}
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
        {t.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.pageTitle}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t.pageDescription}{" "}
              <code className="rounded bg-[var(--surface)] px-1 text-xs">
                ~/.config/ProspectusAI/settings.json
              </code>
              .
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <AppBackendStatus />
            <Link href={workspaceHref} className="text-sm text-[var(--accent)] hover:underline">
              {t.backToWorkspace}
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
                {t.softwareUpdates}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t.updatesDescription}
              </p>
            </div>
            <button
              type="button"
              disabled={checkingUpdate}
              onClick={() => void handleCheckUpdates()}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-50"
            >
              {checkingUpdate ? t.checkingUpdates : t.checkUpdates}
            </button>
          </div>
          {updateStatus && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm">
              {updateStatus.ok ? (
                <>
                  <p className="font-medium">
                    {updateStatus.hasUpdate
                      ? t.newVersionAvailable(updateStatus.latestVersion)
                      : t.upToDate(updateStatus.currentVersion)}
                  </p>
                  {updateStatus.hasUpdate && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {updateStatus.installerUrl && (
                        <a
                          href={updateStatus.installerUrl}
                          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
                        >
                          {t.downloadInstaller}
                        </a>
                      )}
                      {updateStatus.releaseUrl && (
                        <a
                          href={updateStatus.releaseUrl}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)]"
                        >
                          {t.openReleaseNotes}
                        </a>
                      )}
                      {updateStatus.downloadPageUrl && (
                        <a
                          href={updateStatus.downloadPageUrl}
                          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)]"
                        >
                          {t.openDownloadPage}
                        </a>
                      )}
                    </div>
                  )}
                  {updateStatus.hasUpdate && !updateStatus.installerUrl && (
                    <p className="mt-2 text-amber-600">
                      {t.latestReleaseNoInstaller}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-amber-600">{updateStatus.error || t.updateCheckFailed}</p>
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t.environment}
          </h2>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-medium">{t.gpuHeading}</h3>
            {gpu?.ok && gpu.cuda_available ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--muted)]">
                <li>
                  {t.cudaAvailable(gpu.device_count, gpu.python)}
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
                  t.cudaNotAvailable}{" "}
                ({gpu?.python || "python"})
              </p>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 text-xs text-[var(--accent)] hover:underline"
            >
              {t.refreshProbe}
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t.localWeights}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t.localWeightsDescription}
          </p>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm text-[var(--muted)]">
              {t.defaultCache}{" "}
              <code className="break-all text-xs text-[var(--foreground)]">{modelStatus?.path}</code>
              {modelStatus?.installed ? (
                <span className="ml-2 text-green-600">{t.installed}</span>
              ) : (
                <span className="ml-2 text-amber-600">{t.notFound}</span>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={downloading}
                onClick={() => void handleDownload()}
                className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {downloading ? t.downloading : t.downloadQwen}
              </button>
              {modelStatus?.installed && (
                <button
                  type="button"
                  onClick={useDownloadedPath}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  {t.useDownloadedPath}
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
              {t.inferenceBackend}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t.inferenceDescription}
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t.provider}</span>
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
                <span>{t.qwenModelLabel}</span>
                <input
                  value={form.qwenModel}
                  onChange={(e) => setForm((f) => ({ ...f, qwenModel: e.target.value }))}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                />
              </label>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="text-sm font-medium">{t.deviceTitle}</h3>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.useCpu}
                onChange={(e) => setForm((f) => ({ ...f, useCpu: e.target.checked }))}
              />
              {t.forceCpu}
            </label>
            {!form.useCpu && (
              <label className="mt-3 flex flex-col gap-1 text-sm">
                <span>{t.cudaDeviceIndex}</span>
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
            {saving ? t.saving : t.saveSettings}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
