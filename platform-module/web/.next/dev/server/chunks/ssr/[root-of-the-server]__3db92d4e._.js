module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppBackendStatus",
    ()=>AppBackendStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
function shortenModelLabel(s, max = 42) {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}
function modelForProvider(s) {
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"][s.llmProvider];
    const field = meta.modelField;
    if (!field) return meta.defaultModel;
    const v = s[field];
    return typeof v === "string" && v.trim() || meta.defaultModel;
}
function AppBackendStatus() {
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const load = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            const res = await fetch("/api/settings");
            const data = await res.json();
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
                qwenModel: data.qwenModel
            });
        } catch  {
            setSettings(null);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        void load();
    }, [
        load
    ]);
    if (!settings) return null;
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"][settings.llmProvider];
    const detail = modelForProvider(settings);
    const title = `${meta.label} — ${detail}. Click to change.`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: "/settings",
        title: title,
        className: "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "h-2 w-2 shrink-0 rounded-full bg-emerald-500",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0 text-[var(--muted)]",
                children: "Backend"
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 71,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "truncate font-medium text-[var(--foreground)]",
                children: [
                    meta.shortLabel,
                    " · ",
                    shortenModelLabel(detail, 36)
                ]
            }, void 0, true, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
        lineNumber: 65,
        columnNumber: 5
    }, this);
}
}),
"[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/modular/platform-module/web/src/app/settings/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2d$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function defaultForm() {
    return {
        llmProvider: "qwen_local",
        openaiApiKey: "",
        openaiBaseUrl: "",
        openaiModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel,
        deepseekApiKey: "",
        deepseekBaseUrl: "",
        deepseekModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel,
        dashscopeApiKey: "",
        dashscopeBaseUrl: "",
        dashscopeModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel,
        anthropicApiKey: "",
        anthropicModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel,
        qwenModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_local.defaultModel,
        useCpu: false,
        cudaDevice: "0"
    };
}
function settingsToForm(s, prev) {
    return {
        ...prev,
        llmProvider: s.llmProvider || "qwen_local",
        openaiBaseUrl: s.openaiBaseUrl || "",
        openaiModel: s.openaiModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel,
        deepseekBaseUrl: s.deepseekBaseUrl || "",
        deepseekModel: s.deepseekModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel,
        dashscopeBaseUrl: s.dashscopeBaseUrl || "",
        dashscopeModel: s.dashscopeModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel,
        anthropicModel: s.anthropicModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel,
        qwenModel: s.qwenModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_local.defaultModel,
        useCpu: Boolean(s.useCpu),
        cudaDevice: s.cudaDevice ?? "0",
        openaiApiKey: "",
        deepseekApiKey: "",
        dashscopeApiKey: "",
        anthropicApiKey: ""
    };
}
function allPresetIds(presets, groups) {
    if (groups?.length) return groups.flatMap((g)=>[
            ...g.models
        ]);
    return [
        ...presets
    ];
}
function modelSelectValue(model, presets, groups) {
    const ids = allPresetIds(presets, groups);
    return ids.includes(model) ? model : __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"];
}
function ApiKeySetBadge({ set }) {
    if (!set) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "text-[var(--muted)]",
        children: " (saved — enter a new value to replace)"
    }, void 0, false, {
        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
        lineNumber: 104,
        columnNumber: 5
    }, this);
}
function SettingsPage() {
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [gpu, setGpu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [modelStatus, setModelStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [downloadLog, setDownloadLog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [downloading, setDownloading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [testResult, setTestResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [testing, setTesting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(defaultForm);
    const activeMeta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"][form.llmProvider];
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setError(null);
        try {
            const [s, g, m] = await Promise.all([
                fetch("/api/settings").then((r)=>r.json()),
                fetch("/api/system/gpu").then((r)=>r.json()),
                fetch("/api/models/status").then((r)=>r.json())
            ]);
            if (s.error) throw new Error(s.error);
            setSettings(s);
            setGpu(g);
            setModelStatus(m);
            setForm((f)=>settingsToForm(s, f));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Load failed");
        } finally{
            setLoading(false);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        void refresh();
    }, [
        refresh
    ]);
    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setTestResult(null);
        try {
            const body = {
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
                cudaDevice: form.cudaDevice
            };
            const keyChecks = [
                {
                    value: form.openaiApiKey,
                    label: "OpenAI API key",
                    field: "openaiApiKey"
                },
                {
                    value: form.deepseekApiKey,
                    label: "DeepSeek API key",
                    field: "deepseekApiKey"
                },
                {
                    value: form.dashscopeApiKey,
                    label: "DashScope API key",
                    field: "dashscopeApiKey"
                },
                {
                    value: form.anthropicApiKey,
                    label: "Anthropic API key",
                    field: "anthropicApiKey"
                }
            ];
            for (const { value, label, field } of keyChecks){
                const k = value.trim();
                if (!k) continue;
                const keyErr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2d$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["validateApiKeyInput"])(k, label);
                if (keyErr) throw new Error(keyErr);
                body[field] = k;
            }
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");
            setSettings(data);
            setForm((f)=>settingsToForm(data, f));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally{
            setSaving(false);
        }
    }
    function isTestConfigDirty() {
        if (!settings) return true;
        if (form.llmProvider !== settings.llmProvider) return true;
        if (form.llmProvider === "qwen_local") return false;
        const keyDirty = form.openaiApiKey.trim() || form.deepseekApiKey.trim() || form.dashscopeApiKey.trim() || form.anthropicApiKey.trim();
        if (keyDirty) return true;
        switch(form.llmProvider){
            case "openai":
                return form.openaiBaseUrl !== (settings.openaiBaseUrl || "") || form.openaiModel !== (settings.openaiModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel);
            case "deepseek":
                return form.deepseekBaseUrl !== (settings.deepseekBaseUrl || "") || form.deepseekModel !== (settings.deepseekModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel);
            case "qwen_api":
                return form.dashscopeBaseUrl !== (settings.dashscopeBaseUrl || "") || form.dashscopeModel !== (settings.dashscopeModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel);
            case "anthropic":
                return form.anthropicModel !== (settings.anthropicModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel);
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
                text: "Local Qwen has no remote API — save settings and run Agent1 to verify the model loads."
            });
            return;
        }
        if (isTestConfigDirty()) {
            setTestResult({
                ok: false,
                text: "Test uses saved settings only. Click “Save settings” first, then try again."
            });
            return;
        }
        setTesting(true);
        try {
            const res = await fetch("/api/settings/test-llm", {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                setTestResult({
                    ok: true,
                    text: data.message || "Connection OK."
                });
            } else {
                setTestResult({
                    ok: false,
                    text: data.error || `Request failed (${res.status})`
                });
            }
        } catch (e) {
            setTestResult({
                ok: false,
                text: e instanceof Error ? e.message : "Test failed"
            });
        } finally{
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
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    repoId: "Qwen/Qwen3.5-4B"
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Download failed");
            setDownloadLog(data.log || "Done.");
            await refresh();
            if (data.path) {
                setForm((f)=>({
                        ...f,
                        qwenModel: data.path
                    }));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Download failed");
        } finally{
            setDownloading(false);
        }
    }
    function useDownloadedPath() {
        if (modelStatus?.path) {
            setForm((f)=>({
                    ...f,
                    qwenModel: modelStatus.path
                }));
        }
    }
    function renderModelField(label, model, presets, onModel, groups) {
        const selectVal = modelSelectValue(model, presets, groups);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: label
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 308,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: selectVal,
                            onChange: (e)=>{
                                const v = e.target.value;
                                onModel(v === __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"] ? "" : v);
                            },
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                            children: [
                                groups?.length ? groups.map((g)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("optgroup", {
                                        label: g.label,
                                        children: g.models.map((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: id,
                                                children: id
                                            }, id, false, {
                                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                                lineNumber: 321,
                                                columnNumber: 23
                                            }, this))
                                    }, g.label, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 19
                                    }, this)) : presets.map((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: id,
                                        children: id
                                    }, id, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 328,
                                        columnNumber: 19
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"],
                                    children: "Custom…"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 332,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 309,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 307,
                    columnNumber: 9
                }, this),
                selectVal === __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Custom model ID"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 337,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: model,
                            onChange: (e)=>onModel(e.target.value),
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                            placeholder: "e.g. qwen3.5-plus"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 338,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 336,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true);
    }
    function renderCloudPanel() {
        const p = form.llmProvider;
        if (p === "qwen_local") return null;
        const keyField = p === "openai" ? "openaiApiKey" : p === "deepseek" ? "deepseekApiKey" : p === "qwen_api" ? "dashscopeApiKey" : "anthropicApiKey";
        const keySet = p === "openai" ? settings?.openaiApiKeySet : p === "deepseek" ? settings?.deepseekApiKeySet : p === "qwen_api" ? settings?.dashscopeApiKeySet : settings?.anthropicApiKeySet;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-sm font-medium",
                    children: [
                        activeMeta.label,
                        " — API connection"
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 374,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "API key",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ApiKeySetBadge, {
                                    set: keySet
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 378,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 376,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "password",
                            autoComplete: "off",
                            value: form[keyField],
                            onChange: (e)=>setForm((f)=>({
                                        ...f,
                                        [keyField]: e.target.value
                                    })),
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2",
                            placeholder: activeMeta.keyPlaceholder
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 380,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 375,
                    columnNumber: 9
                }, this),
                p === "openai" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL (optional)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 395,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.openaiBaseUrl,
                                    onChange: (e)=>setForm((f)=>({
                                                ...f,
                                                openaiBaseUrl: e.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 396,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 394,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model", form.openaiModel, activeMeta.modelPresets, (v)=>setForm((f)=>({
                                    ...f,
                                    openaiModel: v
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "deepseek" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL (optional)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 416,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.deepseekBaseUrl,
                                    onChange: (e)=>setForm((f)=>({
                                                ...f,
                                                deepseekBaseUrl: e.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 417,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-[var(--muted)]",
                                    children: "Official OpenAI-compatible base: api.deepseek.com (SDK appends /chat/completions)."
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 423,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 415,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model", form.deepseekModel, activeMeta.modelPresets, (v)=>setForm((f)=>({
                                    ...f,
                                    deepseekModel: v
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "qwen_api" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 440,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.dashscopeBaseUrl,
                                    onChange: (e)=>setForm((f)=>({
                                                ...f,
                                                dashscopeBaseUrl: e.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 441,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-[var(--muted)]",
                                    children: "Mainland China (default): dashscope.aliyuncs.com/compatible-mode/v1 — International (Singapore): dashscope-intl.aliyuncs.com/compatible-mode/v1"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 447,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 439,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model (DashScope model ID)", form.dashscopeModel, activeMeta.modelPresets, (v)=>setForm((f)=>({
                                    ...f,
                                    dashscopeModel: v
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "anthropic" && renderModelField("Model", form.anthropicModel, activeMeta.modelPresets, (v)=>setForm((f)=>({
                            ...f,
                            anthropicModel: v
                        })), activeMeta.modelPresetGroups),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            disabled: testing || saving,
                            onClick: ()=>void handleTestConnection(),
                            className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50",
                            children: testing ? "Testing…" : "Test connection"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 472,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-[var(--muted)]",
                            children: "Uses saved settings on disk — save first, then test."
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 480,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 471,
                    columnNumber: 9
                }, this),
                testResult && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: `text-sm ${testResult.ok ? "text-green-600" : "text-amber-600"}`,
                    children: testResult.text
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 485,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 373,
            columnNumber: 7
        }, this);
    }
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]",
            children: "Loading settings…"
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 495,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto max-w-3xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-2xl font-bold tracking-tight",
                                    children: "Model & inference"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 506,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-[var(--muted)]",
                                    children: [
                                        "Agent1, Agent2, and document chat use the backend selected here. Saved to",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                            className: "rounded bg-[var(--surface)] px-1 text-xs",
                                            children: "~/.config/ProspectusAI/settings.json"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 509,
                                            columnNumber: 15
                                        }, this),
                                        "."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 507,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 505,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col items-start gap-2 sm:items-end",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AppBackendStatus"], {}, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 516,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "text-sm text-[var(--accent)] hover:underline",
                                    children: "← Back to workspace"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 517,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 515,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 504,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 524,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                            children: "Environment"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 530,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-medium",
                                    children: "GPU / PyTorch"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 534,
                                    columnNumber: 13
                                }, this),
                                gpu?.ok && gpu.cuda_available ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "mt-2 list-disc pl-5 text-sm text-[var(--muted)]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: [
                                                "CUDA available — ",
                                                gpu.device_count,
                                                " device(s) (",
                                                gpu.python,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 537,
                                            columnNumber: 17
                                        }, this),
                                        (gpu.device_names || []).map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    "[",
                                                    i,
                                                    "] ",
                                                    n
                                                ]
                                            }, i, true, {
                                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                                lineNumber: 541,
                                                columnNumber: 19
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 536,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 text-sm text-[var(--muted)]",
                                    children: [
                                        gpu?.error || "CUDA not available — enable CPU mode below or install CUDA PyTorch.",
                                        " ",
                                        "(",
                                        gpu?.python || "python",
                                        ")"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 547,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>void refresh(),
                                    className: "mt-3 text-xs text-[var(--accent)] hover:underline",
                                    children: "Refresh probe"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 553,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 533,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 529,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                            children: "Local weights (Qwen)"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 564,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-sm text-[var(--muted)]",
                            children: "Download once or point to an existing folder. Used only when “Local Qwen” is selected."
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 567,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-[var(--muted)]",
                                    children: [
                                        "Default cache:",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                            className: "break-all text-xs text-[var(--foreground)]",
                                            children: modelStatus?.path
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 573,
                                            columnNumber: 15
                                        }, this),
                                        modelStatus?.installed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-2 text-green-600",
                                            children: "Installed"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 575,
                                            columnNumber: 17
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-2 text-amber-600",
                                            children: "Not found"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 577,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 571,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex flex-wrap gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            disabled: downloading,
                                            onClick: ()=>void handleDownload(),
                                            className: "rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50",
                                            children: downloading ? "Downloading…" : "Download Qwen3.5-4B"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 581,
                                            columnNumber: 15
                                        }, this),
                                        modelStatus?.installed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: useDownloadedPath,
                                            className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm",
                                            children: "Use downloaded folder path"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 590,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 580,
                                    columnNumber: 13
                                }, this),
                                downloadLog && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                    className: "mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-xs",
                                    children: downloadLog
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 600,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 570,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 563,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSave,
                    className: "space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                                    children: "Inference backend"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 612,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-[var(--muted)]",
                                    children: "Pick one provider. Cloud APIs need an API key; document chat uses the same credentials for OpenAI-compatible providers."
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 615,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 611,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1.5 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-medium",
                                    children: "Provider"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 622,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.llmProvider,
                                    onChange: (e)=>setForm((f)=>({
                                                ...f,
                                                llmProvider: e.target.value
                                            })),
                                    className: "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5",
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PROVIDER_LIST"].map((meta)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: meta.id,
                                            children: meta.label
                                        }, meta.id, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 634,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 623,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[var(--muted)]",
                                    children: activeMeta.description
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 639,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 621,
                            columnNumber: 11
                        }, this),
                        renderCloudPanel(),
                        form.llmProvider === "qwen_local" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex flex-col gap-1 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Qwen model (Hugging Face id or local folder path)"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 647,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        value: form.qwenModel,
                                        onChange: (e)=>setForm((f)=>({
                                                    ...f,
                                                    qwenModel: e.target.value
                                                })),
                                        className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 648,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                lineNumber: 646,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 645,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-medium",
                                    children: "Device (local Qwen only)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 658,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "mt-3 flex items-center gap-2 text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            checked: form.useCpu,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        useCpu: e.target.checked
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 660,
                                            columnNumber: 15
                                        }, this),
                                        "Force CPU"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 659,
                                    columnNumber: 13
                                }, this),
                                !form.useCpu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "mt-3 flex flex-col gap-1 text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "CUDA device index"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 669,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: form.cudaDevice,
                                            onChange: (e)=>setForm((f)=>({
                                                        ...f,
                                                        cudaDevice: e.target.value
                                                    })),
                                            className: "w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 670,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 668,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 657,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: saving,
                            className: "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
                            children: saving ? "Saving…" : "Save settings"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 679,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 607,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 503,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
        lineNumber: 502,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3db92d4e._.js.map