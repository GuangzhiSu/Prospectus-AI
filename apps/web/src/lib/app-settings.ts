/**
 * User preferences for local installs (Windows %APPDATA%, Unix XDG config).
 * Merged into env when spawning agent1.py / agent2.py.
 */

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export type LlmProvider = "qwen_local" | "openai";

export type AppSettings = {
  llmProvider: LlmProvider;
  /** OpenAI-compatible API (ChatGPT, Azure OpenAI with compatible endpoint, etc.) */
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  /** e.g. gpt-4o-mini */
  openaiModel?: string;
  /** Hugging Face repo id or local folder path for Qwen (Agent2 / table summary) */
  qwenModel?: string;
  /** Force CPU even if CUDA is available */
  useCpu?: boolean;
  /** CUDA device index string, e.g. "0" — passed as CUDA_VISIBLE_DEVICES */
  cudaDevice?: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  llmProvider: "qwen_local",
  openaiModel: "gpt-4o-mini",
  qwenModel: "Qwen/Qwen3.5-4B",
  useCpu: false,
  cudaDevice: "0",
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

export async function readSettings(): Promise<AppSettings> {
  const file = getSettingsFilePath();
  if (!existsSync(file)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const dir = configDir();
  await fs.mkdir(dir, { recursive: true });
  const current = await readSettings();
  const next = { ...current, ...partial };
  await fs.writeFile(
    getSettingsFilePath(),
    JSON.stringify(next, null, 2),
    "utf8"
  );
  return next;
}

/** API responses: never expose full API key. */
export function maskSettingsForClient(s: AppSettings): AppSettings & { openaiApiKeySet: boolean } {
  const { openaiApiKey, ...rest } = s;
  return {
    ...rest,
    openaiApiKey: openaiApiKey ? "••••••••" + openaiApiKey.slice(-4) : undefined,
    openaiApiKeySet: Boolean(openaiApiKey && openaiApiKey.length > 0),
  };
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

  if (settings.llmProvider === "openai") {
    env.LLM_PROVIDER = "openai";
    if (settings.openaiApiKey) env.OPENAI_API_KEY = settings.openaiApiKey;
    if (settings.openaiBaseUrl) env.OPENAI_BASE_URL = settings.openaiBaseUrl;
    if (settings.openaiModel) env.OPENAI_MODEL = settings.openaiModel;
  } else {
    env.LLM_PROVIDER = "qwen_local";
    delete env.OPENAI_API_KEY;
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
