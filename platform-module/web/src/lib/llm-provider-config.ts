/**
 * Inference provider metadata shared by settings UI and API routes.
 */

export const LLM_PROVIDER_IDS = [
  "qwen_local",
  "openai",
  "deepseek",
  "qwen_api",
  "anthropic",
] as const;

export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export function isLlmProviderId(v: string): v is LlmProviderId {
  return (LLM_PROVIDER_IDS as readonly string[]).includes(v);
}

export type ModelPresetGroup = {
  label: string;
  models: readonly string[];
};

/** Official DashScope model IDs (stable aliases only — no dated snapshots). */
export const DASHSCOPE_MODEL_GROUPS: ModelPresetGroup[] = [
  {
    label: "Qwen3 Max",
    models: ["qwen3-max", "qwen3-max-preview"],
  },
  {
    label: "Plus / balanced",
    models: ["qwen3.5-plus", "qwen-plus", "qwen-plus-latest"],
  },
  {
    label: "Flash / fast",
    models: ["qwen3.5-flash", "qwen-flash"],
  },
  {
    label: "Long context (mainland)",
    models: ["qwen-long-latest"],
  },
  {
    label: "Coder",
    models: ["qwen3-coder-plus", "qwen3-coder-flash"],
  },
  {
    label: "Legacy",
    models: ["qwen-max", "qwen-max-latest", "qwen-turbo", "qwen-turbo-latest"],
  },
];

export const DASHSCOPE_MODEL_PRESETS: readonly string[] = DASHSCOPE_MODEL_GROUPS.flatMap(
  (g) => g.models
);

/** @see https://platform.openai.com/docs/models */
export const OPENAI_MODEL_GROUPS: ModelPresetGroup[] = [
  {
    label: "GPT-5",
    models: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano"],
  },
  {
    label: "GPT-4o",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  {
    label: "Reasoning",
    models: ["o3-mini", "o4-mini"],
  },
];

export const OPENAI_MODEL_PRESETS: readonly string[] = OPENAI_MODEL_GROUPS.flatMap((g) => g.models);

/** @see https://api-docs.deepseek.com/ */
export const DEEPSEEK_MODEL_GROUPS: ModelPresetGroup[] = [
  {
    label: "DeepSeek V4",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
  },
  {
    label: "Legacy aliases (retire Jul 2026)",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
];

export const DEEPSEEK_MODEL_PRESETS: readonly string[] = DEEPSEEK_MODEL_GROUPS.flatMap(
  (g) => g.models
);

export const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";

/** @see https://platform.claude.com/docs/en/about-claude/models/overview */
export const ANTHROPIC_MODEL_GROUPS: ModelPresetGroup[] = [
  {
    label: "Opus",
    models: ["claude-opus-4-7", "claude-opus-4-6", "claude-opus-4-5", "claude-opus-4-1"],
  },
  {
    label: "Sonnet",
    models: ["claude-sonnet-4-6", "claude-sonnet-4-5"],
  },
  {
    label: "Haiku",
    models: ["claude-haiku-4-5"],
  },
];

export const ANTHROPIC_MODEL_PRESETS: readonly string[] = ANTHROPIC_MODEL_GROUPS.flatMap(
  (g) => g.models
);

/** @see https://help.aliyun.com/zh/model-studio/models */
export const DASHSCOPE_DEFAULT_BASE_URL_CN =
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
export const DASHSCOPE_DEFAULT_BASE_URL_INTL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export type ProviderUiMeta = {
  id: LlmProviderId;
  label: string;
  shortLabel: string;
  description: string;
  /** Python ``LLM_PROVIDER`` env value */
  envProvider: string;
  needsApiKey: boolean;
  /** Settings JSON field for API key (if needsApiKey) */
  apiKeyField?:
    | "openaiApiKey"
    | "deepseekApiKey"
    | "dashscopeApiKey"
    | "anthropicApiKey";
  baseUrlField?: "openaiBaseUrl" | "deepseekBaseUrl" | "dashscopeBaseUrl";
  modelField?:
    | "openaiModel"
    | "deepseekModel"
    | "dashscopeModel"
    | "anthropicModel"
    | "qwenModel";
  defaultModel: string;
  defaultBaseUrl?: string;
  modelPresets: readonly string[];
  /** Optional grouped presets (e.g. DashScope catalog) */
  modelPresetGroups?: readonly ModelPresetGroup[];
  keyPlaceholder: string;
  baseUrlPlaceholder?: string;
};

export const PROVIDER_UI: Record<LlmProviderId, ProviderUiMeta> = {
  qwen_local: {
    id: "qwen_local",
    label: "Local Qwen",
    shortLabel: "Local",
    description:
      "Runs on this machine (GPU or CPU). Data stays local — best for confidential drafts.",
    envProvider: "qwen_local",
    needsApiKey: false,
    modelField: "qwenModel",
    defaultModel: "Qwen/Qwen3.5-4B",
    modelPresets: ["Qwen/Qwen3.5-4B", "Qwen/Qwen3.5-27B", "Qwen/Qwen2.5-7B-Instruct"],
    keyPlaceholder: "",
  },
  openai: {
    id: "openai",
    label: "OpenAI / compatible",
    shortLabel: "OpenAI",
    description:
      "OpenAI API or any OpenAI-compatible server (Azure, Ollama, LM Studio, vLLM). Model IDs must match your endpoint — see platform.openai.com/docs/models for OpenAI.",
    envProvider: "openai",
    needsApiKey: true,
    apiKeyField: "openaiApiKey",
    baseUrlField: "openaiBaseUrl",
    modelField: "openaiModel",
    defaultModel: "gpt-4o-mini",
    defaultBaseUrl: "https://api.openai.com/v1",
    modelPresets: OPENAI_MODEL_PRESETS,
    modelPresetGroups: OPENAI_MODEL_GROUPS,
    keyPlaceholder: "sk-…",
    baseUrlPlaceholder: "https://api.openai.com/v1",
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek API",
    shortLabel: "DeepSeek",
    description:
      "Official DeepSeek OpenAI-compatible API. Current models: deepseek-v4-flash / deepseek-v4-pro — see api-docs.deepseek.com.",
    envProvider: "deepseek",
    needsApiKey: true,
    apiKeyField: "deepseekApiKey",
    baseUrlField: "deepseekBaseUrl",
    modelField: "deepseekModel",
    defaultModel: "deepseek-v4-flash",
    defaultBaseUrl: DEEPSEEK_DEFAULT_BASE_URL,
    modelPresets: DEEPSEEK_MODEL_PRESETS,
    modelPresetGroups: DEEPSEEK_MODEL_GROUPS,
    keyPlaceholder: "sk-…",
    baseUrlPlaceholder: DEEPSEEK_DEFAULT_BASE_URL,
  },
  qwen_api: {
    id: "qwen_api",
    label: "Qwen (DashScope API)",
    shortLabel: "Qwen API",
    description:
      "Alibaba Cloud Model Studio (百炼) OpenAI-compatible endpoint. Mainland: dashscope.aliyuncs.com; international: dashscope-intl.aliyuncs.com. Model IDs from the official catalog — see help.aliyun.com/zh/model-studio/models.",
    envProvider: "qwen_api",
    needsApiKey: true,
    apiKeyField: "dashscopeApiKey",
    baseUrlField: "dashscopeBaseUrl",
    modelField: "dashscopeModel",
    defaultModel: "qwen3.5-plus",
    defaultBaseUrl: DASHSCOPE_DEFAULT_BASE_URL_CN,
    modelPresets: DASHSCOPE_MODEL_PRESETS,
    modelPresetGroups: DASHSCOPE_MODEL_GROUPS,
    keyPlaceholder: "sk-…",
    baseUrlPlaceholder: DASHSCOPE_DEFAULT_BASE_URL_CN,
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude / Opus)",
    shortLabel: "Claude",
    description:
      "Anthropic Messages API. Model IDs from platform.claude.com/docs — use aliases without dates where available (4.6+ generation).",
    envProvider: "anthropic",
    needsApiKey: true,
    apiKeyField: "anthropicApiKey",
    modelField: "anthropicModel",
    defaultModel: "claude-sonnet-4-6",
    modelPresets: ANTHROPIC_MODEL_PRESETS,
    modelPresetGroups: ANTHROPIC_MODEL_GROUPS,
    keyPlaceholder: "sk-ant-…",
  },
};

export const PROVIDER_LIST: ProviderUiMeta[] = LLM_PROVIDER_IDS.map((id) => PROVIDER_UI[id]);

export const CUSTOM_MODEL = "__custom__";
