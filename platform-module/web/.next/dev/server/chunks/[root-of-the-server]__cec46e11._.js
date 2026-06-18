module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/fs/promises [external] (fs/promises, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs/promises", () => require("fs/promises"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Inference provider metadata shared by settings UI and API routes.
 */ __turbopack_context__.s([
    "ANTHROPIC_MODEL_GROUPS",
    ()=>ANTHROPIC_MODEL_GROUPS,
    "ANTHROPIC_MODEL_PRESETS",
    ()=>ANTHROPIC_MODEL_PRESETS,
    "CUSTOM_MODEL",
    ()=>CUSTOM_MODEL,
    "DASHSCOPE_DEFAULT_BASE_URL_CN",
    ()=>DASHSCOPE_DEFAULT_BASE_URL_CN,
    "DASHSCOPE_DEFAULT_BASE_URL_INTL",
    ()=>DASHSCOPE_DEFAULT_BASE_URL_INTL,
    "DASHSCOPE_MODEL_GROUPS",
    ()=>DASHSCOPE_MODEL_GROUPS,
    "DASHSCOPE_MODEL_PRESETS",
    ()=>DASHSCOPE_MODEL_PRESETS,
    "DEEPSEEK_DEFAULT_BASE_URL",
    ()=>DEEPSEEK_DEFAULT_BASE_URL,
    "DEEPSEEK_MODEL_GROUPS",
    ()=>DEEPSEEK_MODEL_GROUPS,
    "DEEPSEEK_MODEL_PRESETS",
    ()=>DEEPSEEK_MODEL_PRESETS,
    "LLM_PROVIDER_IDS",
    ()=>LLM_PROVIDER_IDS,
    "OPENAI_MODEL_GROUPS",
    ()=>OPENAI_MODEL_GROUPS,
    "OPENAI_MODEL_PRESETS",
    ()=>OPENAI_MODEL_PRESETS,
    "PROVIDER_LIST",
    ()=>PROVIDER_LIST,
    "PROVIDER_UI",
    ()=>PROVIDER_UI,
    "isLlmProviderId",
    ()=>isLlmProviderId
]);
const LLM_PROVIDER_IDS = [
    "qwen_local",
    "openai",
    "deepseek",
    "qwen_api",
    "anthropic"
];
function isLlmProviderId(v) {
    return LLM_PROVIDER_IDS.includes(v);
}
const DASHSCOPE_MODEL_GROUPS = [
    {
        label: "Qwen3 Max",
        models: [
            "qwen3-max",
            "qwen3-max-preview"
        ]
    },
    {
        label: "Plus / balanced",
        models: [
            "qwen3.5-plus",
            "qwen-plus",
            "qwen-plus-latest"
        ]
    },
    {
        label: "Flash / fast",
        models: [
            "qwen3.5-flash",
            "qwen-flash"
        ]
    },
    {
        label: "Long context (mainland)",
        models: [
            "qwen-long-latest"
        ]
    },
    {
        label: "Coder",
        models: [
            "qwen3-coder-plus",
            "qwen3-coder-flash"
        ]
    },
    {
        label: "Legacy",
        models: [
            "qwen-max",
            "qwen-max-latest",
            "qwen-turbo",
            "qwen-turbo-latest"
        ]
    }
];
const DASHSCOPE_MODEL_PRESETS = DASHSCOPE_MODEL_GROUPS.flatMap((g)=>g.models);
const OPENAI_MODEL_GROUPS = [
    {
        label: "GPT-5",
        models: [
            "gpt-5.5",
            "gpt-5.4",
            "gpt-5.4-mini",
            "gpt-5.4-nano"
        ]
    },
    {
        label: "GPT-4o",
        models: [
            "gpt-4o",
            "gpt-4o-mini"
        ]
    },
    {
        label: "Reasoning",
        models: [
            "o3-mini",
            "o4-mini"
        ]
    }
];
const OPENAI_MODEL_PRESETS = OPENAI_MODEL_GROUPS.flatMap((g)=>g.models);
const DEEPSEEK_MODEL_GROUPS = [
    {
        label: "DeepSeek V4",
        models: [
            "deepseek-v4-flash",
            "deepseek-v4-pro"
        ]
    },
    {
        label: "Legacy aliases (retire Jul 2026)",
        models: [
            "deepseek-chat",
            "deepseek-reasoner"
        ]
    }
];
const DEEPSEEK_MODEL_PRESETS = DEEPSEEK_MODEL_GROUPS.flatMap((g)=>g.models);
const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";
const ANTHROPIC_MODEL_GROUPS = [
    {
        label: "Opus",
        models: [
            "claude-opus-4-7",
            "claude-opus-4-6",
            "claude-opus-4-5",
            "claude-opus-4-1"
        ]
    },
    {
        label: "Sonnet",
        models: [
            "claude-sonnet-4-6",
            "claude-sonnet-4-5"
        ]
    },
    {
        label: "Haiku",
        models: [
            "claude-haiku-4-5"
        ]
    }
];
const ANTHROPIC_MODEL_PRESETS = ANTHROPIC_MODEL_GROUPS.flatMap((g)=>g.models);
const DASHSCOPE_DEFAULT_BASE_URL_CN = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DASHSCOPE_DEFAULT_BASE_URL_INTL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const PROVIDER_UI = {
    qwen_local: {
        id: "qwen_local",
        label: "Local Qwen",
        shortLabel: "Local",
        description: "Runs on this machine (GPU or CPU). Data stays local — best for confidential drafts.",
        envProvider: "qwen_local",
        needsApiKey: false,
        modelField: "qwenModel",
        defaultModel: "Qwen/Qwen3.5-4B",
        modelPresets: [
            "Qwen/Qwen3.5-4B",
            "Qwen/Qwen3.5-27B",
            "Qwen/Qwen2.5-7B-Instruct"
        ],
        keyPlaceholder: ""
    },
    openai: {
        id: "openai",
        label: "OpenAI / compatible",
        shortLabel: "OpenAI",
        description: "OpenAI API or any OpenAI-compatible server (Azure, Ollama, LM Studio, vLLM). Model IDs must match your endpoint — see platform.openai.com/docs/models for OpenAI.",
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
        baseUrlPlaceholder: "https://api.openai.com/v1"
    },
    deepseek: {
        id: "deepseek",
        label: "DeepSeek API",
        shortLabel: "DeepSeek",
        description: "Official DeepSeek OpenAI-compatible API. Current models: deepseek-v4-flash / deepseek-v4-pro — see api-docs.deepseek.com.",
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
        baseUrlPlaceholder: DEEPSEEK_DEFAULT_BASE_URL
    },
    qwen_api: {
        id: "qwen_api",
        label: "Qwen (DashScope API)",
        shortLabel: "Qwen API",
        description: "Alibaba Cloud Model Studio (百炼) OpenAI-compatible endpoint. Mainland: dashscope.aliyuncs.com; international: dashscope-intl.aliyuncs.com. Model IDs from the official catalog — see help.aliyun.com/zh/model-studio/models.",
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
        baseUrlPlaceholder: DASHSCOPE_DEFAULT_BASE_URL_CN
    },
    anthropic: {
        id: "anthropic",
        label: "Anthropic (Claude / Opus)",
        shortLabel: "Claude",
        description: "Anthropic Messages API. Model IDs from platform.claude.com/docs — use aliases without dates where available (4.6+ generation).",
        envProvider: "anthropic",
        needsApiKey: true,
        apiKeyField: "anthropicApiKey",
        modelField: "anthropicModel",
        defaultModel: "claude-sonnet-4-6",
        modelPresets: ANTHROPIC_MODEL_PRESETS,
        modelPresetGroups: ANTHROPIC_MODEL_GROUPS,
        keyPlaceholder: "sk-ant-…"
    }
};
const PROVIDER_LIST = LLM_PROVIDER_IDS.map((id)=>PROVIDER_UI[id]);
const CUSTOM_MODEL = "__custom__";
}),
"[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Client-safe settings types and validation (no Node fs/path).
 */ __turbopack_context__.s([
    "validateApiKeyInput",
    ()=>validateApiKeyInput
]);
function validateApiKeyInput(key, fieldLabel = "API key") {
    const k = key.trim();
    if (!k || k.startsWith("••")) return null;
    if (/^40[0-9]\s/.test(k)) {
        return `${fieldLabel} looks like an HTTP error message, not a key. Paste the key from your provider console (usually starts with sk-).`;
    }
    if (/incorrect api key/i.test(k) || /apikey-error/i.test(k)) {
        return `${fieldLabel} looks like an API error response. Use the key from the console, not the error text.`;
    }
    if (/help\.aliyun\.com/i.test(k) && k.length > 60) {
        return `${fieldLabel} contains a help URL — likely pasted error text, not a key.`;
    }
    if (k.length < 8) {
        return `${fieldLabel} is too short to be valid.`;
    }
    return null;
}
}),
"[project]/modular/platform-module/web/src/lib/app-settings.ts [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildAgentProcessEnv",
    ()=>buildAgentProcessEnv,
    "buildRagEnvOverrides",
    ()=>buildRagEnvOverrides,
    "getDefaultLocalModelDir",
    ()=>getDefaultLocalModelDir,
    "getProviderTestCredentials",
    ()=>getProviderTestCredentials,
    "getSettingsFilePath",
    ()=>getSettingsFilePath,
    "maskSettingsForClient",
    ()=>maskSettingsForClient,
    "readSettings",
    ()=>readSettings,
    "writeSettings",
    ()=>writeSettings
]);
/**
 * Server-only settings persistence and env mapping.
 * Client components must import from `@/lib/app-settings-types` instead.
 */ var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs/promises [external] (fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2d$types$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-route] (ecmascript)");
;
;
;
;
;
const DEFAULT_SETTINGS = {
    llmProvider: "qwen_local",
    openaiModel: "gpt-4o-mini",
    deepseekModel: "deepseek-v4-flash",
    dashscopeModel: "qwen3.5-plus",
    anthropicModel: "claude-sonnet-4-6",
    qwenModel: "Qwen/Qwen3.5-4B",
    useCpu: false,
    cudaDevice: ""
};
function configDir() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const home = process.env.HOME || ".";
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(home, ".config", "ProspectusAI");
}
function getSettingsFilePath() {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(configDir(), "settings.json");
}
function getDefaultLocalModelDir() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const home = process.env.HOME || ".";
    return __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(home, ".local", "share", "ProspectusAI", "models", "Qwen3.5-4B");
}
function normalizeProvider(raw) {
    if (typeof raw === "string" && (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isLlmProviderId"])(raw)) {
        return raw;
    }
    return DEFAULT_SETTINGS.llmProvider;
}
async function readSettings() {
    const file = getSettingsFilePath();
    if (!(0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["existsSync"])(file)) {
        return {
            ...DEFAULT_SETTINGS
        };
    }
    try {
        const raw = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].readFile(file, "utf8");
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            llmProvider: normalizeProvider(parsed.llmProvider)
        };
    } catch  {
        return {
            ...DEFAULT_SETTINGS
        };
    }
}
async function writeSettings(partial) {
    const dir = configDir();
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].mkdir(dir, {
        recursive: true
    });
    const current = await readSettings();
    const next = {
        ...current,
        ...partial,
        llmProvider: partial.llmProvider ? normalizeProvider(partial.llmProvider) : current.llmProvider
    };
    await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].writeFile(getSettingsFilePath(), JSON.stringify(next, null, 2), "utf8");
    return next;
}
function maskApiKey(key) {
    if (!key) return undefined;
    return "••••••••" + key.slice(-4);
}
function maskSettingsForClient(s) {
    const { openaiApiKey, deepseekApiKey, dashscopeApiKey, anthropicApiKey, ...rest } = s;
    return {
        ...rest,
        openaiApiKey: maskApiKey(openaiApiKey),
        deepseekApiKey: maskApiKey(deepseekApiKey),
        dashscopeApiKey: maskApiKey(dashscopeApiKey),
        anthropicApiKey: maskApiKey(anthropicApiKey),
        openaiApiKeySet: Boolean(openaiApiKey?.length),
        deepseekApiKeySet: Boolean(deepseekApiKey?.length),
        dashscopeApiKeySet: Boolean(dashscopeApiKey?.length),
        anthropicApiKeySet: Boolean(anthropicApiKey?.length)
    };
}
function applyOpenAiCompatibleEnv(env, cfg) {
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
function buildAgentProcessEnv(base, settings) {
    const env = {
        ...base
    };
    const provider = settings.llmProvider;
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"][provider];
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
            defaultBaseUrl: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultBaseUrl,
            defaultModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel,
            keyEnv: "OPENAI_API_KEY",
            baseEnv: "OPENAI_BASE_URL",
            modelEnv: "OPENAI_MODEL"
        });
    } else if (provider === "deepseek") {
        applyOpenAiCompatibleEnv(env, {
            apiKey: settings.deepseekApiKey,
            baseUrl: settings.deepseekBaseUrl,
            model: settings.deepseekModel,
            defaultBaseUrl: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultBaseUrl,
            defaultModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel,
            keyEnv: "DEEPSEEK_API_KEY",
            baseEnv: "DEEPSEEK_BASE_URL",
            modelEnv: "DEEPSEEK_MODEL"
        });
    } else if (provider === "qwen_api") {
        applyOpenAiCompatibleEnv(env, {
            apiKey: settings.dashscopeApiKey,
            baseUrl: settings.dashscopeBaseUrl,
            model: settings.dashscopeModel,
            defaultBaseUrl: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultBaseUrl,
            defaultModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel,
            keyEnv: "DASHSCOPE_API_KEY",
            baseEnv: "DASHSCOPE_BASE_URL",
            modelEnv: "DASHSCOPE_MODEL"
        });
    } else if (provider === "anthropic") {
        env.RAG_PROVIDER = "local";
        if (settings.anthropicApiKey) env.ANTHROPIC_API_KEY = settings.anthropicApiKey;
        if (settings.anthropicModel?.trim()) {
            env.ANTHROPIC_MODEL = settings.anthropicModel.trim();
        } else {
            env.ANTHROPIC_MODEL = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel;
        }
    } else {
        env.RAG_PROVIDER = "local";
    }
    const qwen = settings.qwenModel?.trim() || DEFAULT_SETTINGS.qwenModel;
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
function buildRagEnvOverrides(settings) {
    const env = buildAgentProcessEnv(process.env, settings);
    const pick = (k)=>env[k];
    const o = {};
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
function getProviderTestCredentials(settings) {
    const id = settings.llmProvider;
    if (id === "qwen_local") {
        return {
            ok: false,
            error: "Local Qwen has no API to ping — run Agent1 to verify the model loads."
        };
    }
    if (id === "anthropic") {
        const apiKey = settings.anthropicApiKey?.trim();
        if (!apiKey) return {
            ok: false,
            error: "No Anthropic API key saved. Enter a key, save, then test."
        };
        return {
            ok: true,
            apiKey,
            model: settings.anthropicModel?.trim() || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel
        };
    }
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PROVIDER_UI"][id];
    const key = meta.apiKeyField ? settings[meta.apiKeyField]?.trim() : "";
    if (!key) {
        return {
            ok: false,
            error: "No API key saved. Enter a key, save settings, then test again."
        };
    }
    const baseUrlField = meta.baseUrlField;
    const modelField = meta.modelField;
    const baseUrl = baseUrlField ? settings[baseUrlField]?.trim() || meta.defaultBaseUrl : meta.defaultBaseUrl;
    const model = modelField && modelField !== "qwenModel" ? settings[modelField]?.trim() || meta.defaultModel : meta.defaultModel;
    return {
        ok: true,
        apiKey: key,
        baseUrl,
        model
    };
}
}),
"[project]/modular/platform-module/web/src/app/api/models/status/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs/promises [external] (fs/promises, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/app-settings.ts [app-route] (ecmascript) <locals>");
;
;
;
;
const runtime = "nodejs";
async function GET() {
    const dir = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getDefaultLocalModelDir"])();
    try {
        await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].access(__TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(dir, "config.json"));
        const st = await __TURBOPACK__imported__module__$5b$externals$5d2f$fs$2f$promises__$5b$external$5d$__$28$fs$2f$promises$2c$__cjs$29$__["default"].stat(dir);
        return __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            installed: true,
            path: dir,
            mtimeMs: st.mtimeMs
        });
    } catch  {
        return __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            installed: false,
            path: dir
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__cec46e11._.js.map