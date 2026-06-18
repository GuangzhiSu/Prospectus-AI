/**
 * Server-only settings persistence and env mapping.
 * Client components must import from `@/lib/app-settings-types` instead.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import {
  isLlmProviderId,
  PROVIDER_UI,
} from "@/lib/llm-provider-config";
import type { AppSettings, LlmProvider, MaskedAppSettings } from "@/lib/app-settings-types";

export type { AppSettings, LlmProvider, MaskedAppSettings } from "@/lib/app-settings-types";
export { validateApiKeyInput } from "@/lib/app-settings-types";

const DEFAULT_SETTINGS: AppSettings = {
  llmProvider: "qwen_local",
  openaiModel: "gpt-4o-mini",
  deepseekModel: "deepseek-v4-flash",
  dashscopeModel: "qwen3.5-plus",
  anthropicModel: "claude-sonnet-4-6",
  qwenModel: "Qwen/Qwen3.5-4B",
  useCpu: false,
  cudaDevice: "",
};

function configDir(): string {
  if (process.platform === "win32") {
    const base = process.env.APPDATA || process.env.LOCALAPPDATA || ".";
    return path.join(base, "ProspectusAI");
  }
  const home = process.env.HOME || ".";
  return path.join(home, ".config", "ProspectusAI");
}

export function getSettingsFilePath(): string {
  return path.join(configDir(), "settings.json");
}

/** Default directory for HF snapshot_download of Qwen weights (first-run download). */
export function getDefaultLocalModelDir(): string {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA || process.env.APPDATA || ".";
    return path.join(base, "ProspectusAI", "models", "Qwen3.5-4B");
  }
  const home = process.env.HOME || ".";
  return path.join(home, ".local", "share", "ProspectusAI", "models", "Qwen3.5-4B");
}

function normalizeProvider(raw: unknown): LlmProvider {
  if (typeof raw === "string" && isLlmProviderId(raw)) {
    return raw;
  }
  return DEFAULT_SETTINGS.llmProvider;
}

export async function readSettings(): Promise<AppSettings> {
  const file = getSettingsFilePath();
  if (!existsSync(file)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      llmProvider: normalizeProvider(parsed.llmProvider),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const dir = configDir();
  await fs.mkdir(dir, { recursive: true });
  const current = await readSettings();
  const next: AppSettings = {
    ...current,
    ...partial,
    llmProvider: partial.llmProvider
      ? normalizeProvider(partial.llmProvider)
      : current.llmProvider,
  };
  await fs.writeFile(getSettingsFilePath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function maskApiKey(key?: string): string | undefined {
  if (!key) return undefined;
  return "••••••••" + key.slice(-4);
}

/** API responses: never expose full API keys. */
export function maskSettingsForClient(s: AppSettings): MaskedAppSettings {
  const {
    openaiApiKey,
    deepseekApiKey,
    dashscopeApiKey,
    anthropicApiKey,
    ...rest
  } = s;
  return {
    ...rest,
    openaiApiKey: maskApiKey(openaiApiKey),
    deepseekApiKey: maskApiKey(deepseekApiKey),
    dashscopeApiKey: maskApiKey(dashscopeApiKey),
    anthropicApiKey: maskApiKey(anthropicApiKey),
    openaiApiKeySet: Boolean(openaiApiKey?.length),
    deepseekApiKeySet: Boolean(deepseekApiKey?.length),
    dashscopeApiKeySet: Boolean(dashscopeApiKey?.length),
    anthropicApiKeySet: Boolean(anthropicApiKey?.length),
  };
}

function applyOpenAiCompatibleEnv(
  env: NodeJS.ProcessEnv,
  cfg: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    defaultBaseUrl: string;
    defaultModel: string;
    keyEnv: string;
    baseEnv: string;
    modelEnv: string;
  }
): void {
  if (cfg.apiKey) env[cfg.keyEnv] = cfg.apiKey;
  if (cfg.baseUrl?.trim()) env[cfg.baseEnv] = cfg.baseUrl.trim();
  else delete env[cfg.baseEnv];
  if (cfg.model?.trim()) env[cfg.modelEnv] = cfg.model.trim();
  else env[cfg.modelEnv] = cfg.defaultModel;
  // RAG / shared OpenAI client in Next.js
  env.RAG_PROVIDER = "openai";
  env.OPENAI_API_KEY = env[cfg.keyEnv] || "";
  env.OPENAI_BASE_URL = env[cfg.baseEnv] || cfg.defaultBaseUrl;
  env.OPENAI_CHAT_MODEL = env[cfg.modelEnv] || cfg.defaultModel;
}

/**
 * Merge persisted settings into env for Python child processes.
 * Does not mutate the input object.
 */
export function buildAgentProcessEnv(
  base: NodeJS.ProcessEnv,
  settings: AppSettings
): NodeJS.ProcessEnv {
  const env = { ...base };
  const provider = settings.llmProvider;
  const meta = PROVIDER_UI[provider];

  env.LLM_PROVIDER = meta.envProvider;

  delete env.OPENAI_API_KEY;
  delete env.OPENAI_BASE_URL;
  delete env.OPENAI_MODEL;
  delete env.DEEPSEEK_API_KEY;
  delete env.DEEPSEEK_BASE_URL;
  delete env.DEEPSEEK_MODEL;
  delete env.DASHSCOPE_API_KEY;
  delete env.DASHSCOPE_BASE_URL;
  delete env.DASHSCOPE_MODEL;
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_MODEL;

  if (provider === "openai") {
    applyOpenAiCompatibleEnv(env, {
      apiKey: settings.openaiApiKey,
      baseUrl: settings.openaiBaseUrl,
      model: settings.openaiModel,
      defaultBaseUrl: PROVIDER_UI.openai.defaultBaseUrl!,
      defaultModel: PROVIDER_UI.openai.defaultModel,
      keyEnv: "OPENAI_API_KEY",
      baseEnv: "OPENAI_BASE_URL",
      modelEnv: "OPENAI_MODEL",
    });
  } else if (provider === "deepseek") {
    applyOpenAiCompatibleEnv(env, {
      apiKey: settings.deepseekApiKey,
      baseUrl: settings.deepseekBaseUrl,
      model: settings.deepseekModel,
      defaultBaseUrl: PROVIDER_UI.deepseek.defaultBaseUrl!,
      defaultModel: PROVIDER_UI.deepseek.defaultModel,
      keyEnv: "DEEPSEEK_API_KEY",
      baseEnv: "DEEPSEEK_BASE_URL",
      modelEnv: "DEEPSEEK_MODEL",
    });
  } else if (provider === "qwen_api") {
    applyOpenAiCompatibleEnv(env, {
      apiKey: settings.dashscopeApiKey,
      baseUrl: settings.dashscopeBaseUrl,
      model: settings.dashscopeModel,
      defaultBaseUrl: PROVIDER_UI.qwen_api.defaultBaseUrl!,
      defaultModel: PROVIDER_UI.qwen_api.defaultModel,
      keyEnv: "DASHSCOPE_API_KEY",
      baseEnv: "DASHSCOPE_BASE_URL",
      modelEnv: "DASHSCOPE_MODEL",
    });
  } else if (provider === "anthropic") {
    env.RAG_PROVIDER = "local";
    if (settings.anthropicApiKey) env.ANTHROPIC_API_KEY = settings.anthropicApiKey;
    if (settings.anthropicModel?.trim()) {
      env.ANTHROPIC_MODEL = settings.anthropicModel.trim();
    } else {
      env.ANTHROPIC_MODEL = PROVIDER_UI.anthropic.defaultModel;
    }
  } else {
    env.RAG_PROVIDER = "local";
  }

  const qwen = settings.qwenModel?.trim() || DEFAULT_SETTINGS.qwenModel!;
  env.AGENT2_MODEL = qwen;
  env.AGENT1_MODEL = qwen;

  if (settings.useCpu) {
    env.AGENT1_USE_CPU = "1";
    env.AGENT2_USE_CPU = "1";
    env.CUDA_VISIBLE_DEVICES = "";
  } else {
    delete env.AGENT1_USE_CPU;
    delete env.AGENT2_USE_CPU;
    const dev = settings.cudaDevice?.trim();
    if (dev !== undefined && dev !== "") {
      env.CUDA_VISIBLE_DEVICES = dev;
      env.AGENT1_CUDA_DEVICES = dev;
      env.AGENT2_CUDA_DEVICES = dev;
    }
  }

  if (!env.CUDA_DEVICE_ORDER) env.CUDA_DEVICE_ORDER = "PCI_BUS_ID";

  return env;
}

/**
 * Env overrides for /api/chat RAG pipeline. Merged via rag-env AsyncLocalStorage
 * so concurrent requests are safe. Keys set here win over process.env for that request.
 */
export function buildRagEnvOverrides(
  settings: AppSettings
): Record<string, string | undefined> {
  const env = buildAgentProcessEnv(process.env, settings);
  const pick = (k: string) => env[k];
  const o: Record<string, string | undefined> = {};
  if (pick("RAG_PROVIDER")) o.RAG_PROVIDER = pick("RAG_PROVIDER");
  if (pick("OPENAI_API_KEY")) o.OPENAI_API_KEY = pick("OPENAI_API_KEY");
  if (pick("OPENAI_BASE_URL")) o.OPENAI_BASE_URL = pick("OPENAI_BASE_URL");
  if (pick("OPENAI_CHAT_MODEL")) o.OPENAI_CHAT_MODEL = pick("OPENAI_CHAT_MODEL");
  if (pick("LOCAL_LLM_URL")) o.LOCAL_LLM_URL = pick("LOCAL_LLM_URL");
  if (!o.LOCAL_LLM_URL && settings.llmProvider === "qwen_local") {
    o.LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8000";
  }
  return o;
}

/** Credentials for the test-connection route (server-side only). */
export function getProviderTestCredentials(
  settings: AppSettings
): { ok: true; apiKey: string; baseUrl?: string; model: string } | { ok: false; error: string } {
  const id = settings.llmProvider;
  if (id === "qwen_local") {
    return { ok: false, error: "Local Qwen has no API to ping — run Agent1 to verify the model loads." };
  }
  if (id === "anthropic") {
    const apiKey = settings.anthropicApiKey?.trim();
    if (!apiKey) return { ok: false, error: "No Anthropic API key saved. Enter a key, save, then test." };
    return {
      ok: true,
      apiKey,
      model: settings.anthropicModel?.trim() || PROVIDER_UI.anthropic.defaultModel,
    };
  }
  const meta = PROVIDER_UI[id];
  const key = meta.apiKeyField
    ? (settings[meta.apiKeyField] as string | undefined)?.trim()
    : "";
  if (!key) {
    return { ok: false, error: "No API key saved. Enter a key, save settings, then test again." };
  }
  const baseUrlField = meta.baseUrlField;
  const modelField = meta.modelField;
  const baseUrl = baseUrlField
    ? (settings[baseUrlField] as string | undefined)?.trim() || meta.defaultBaseUrl
    : meta.defaultBaseUrl;
  const model =
    modelField && modelField !== "qwenModel"
      ? (settings[modelField] as string | undefined)?.trim() || meta.defaultModel
      : meta.defaultModel;
  return { ok: true, apiKey: key, baseUrl, model };
}
