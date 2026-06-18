(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
const DASHSCOPE_MODEL_PRESETS = DASHSCOPE_MODEL_GROUPS.flatMap(_c = (g)=>g.models);
_c1 = DASHSCOPE_MODEL_PRESETS;
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
const OPENAI_MODEL_PRESETS = OPENAI_MODEL_GROUPS.flatMap(_c2 = (g)=>g.models);
_c3 = OPENAI_MODEL_PRESETS;
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
const DEEPSEEK_MODEL_PRESETS = DEEPSEEK_MODEL_GROUPS.flatMap(_c4 = (g)=>g.models);
_c5 = DEEPSEEK_MODEL_PRESETS;
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
const ANTHROPIC_MODEL_PRESETS = ANTHROPIC_MODEL_GROUPS.flatMap(_c6 = (g)=>g.models);
_c7 = ANTHROPIC_MODEL_PRESETS;
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
const PROVIDER_LIST = LLM_PROVIDER_IDS.map(_c8 = (id)=>PROVIDER_UI[id]);
_c9 = PROVIDER_LIST;
const CUSTOM_MODEL = "__custom__";
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9;
__turbopack_context__.k.register(_c, "DASHSCOPE_MODEL_PRESETS$DASHSCOPE_MODEL_GROUPS.flatMap");
__turbopack_context__.k.register(_c1, "DASHSCOPE_MODEL_PRESETS");
__turbopack_context__.k.register(_c2, "OPENAI_MODEL_PRESETS$OPENAI_MODEL_GROUPS.flatMap");
__turbopack_context__.k.register(_c3, "OPENAI_MODEL_PRESETS");
__turbopack_context__.k.register(_c4, "DEEPSEEK_MODEL_PRESETS$DEEPSEEK_MODEL_GROUPS.flatMap");
__turbopack_context__.k.register(_c5, "DEEPSEEK_MODEL_PRESETS");
__turbopack_context__.k.register(_c6, "ANTHROPIC_MODEL_PRESETS$ANTHROPIC_MODEL_GROUPS.flatMap");
__turbopack_context__.k.register(_c7, "ANTHROPIC_MODEL_PRESETS");
__turbopack_context__.k.register(_c8, "PROVIDER_LIST$LLM_PROVIDER_IDS.map");
__turbopack_context__.k.register(_c9, "PROVIDER_LIST");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppBackendStatus",
    ()=>AppBackendStatus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function shortenModelLabel(s, max = 42) {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}
function modelForProvider(s) {
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"][s.llmProvider];
    const field = meta.modelField;
    if (!field) return meta.defaultModel;
    const v = s[field];
    return typeof v === "string" && v.trim() || meta.defaultModel;
}
function AppBackendStatus() {
    _s();
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const load = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AppBackendStatus.useCallback[load]": async ()=>{
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
        }
    }["AppBackendStatus.useCallback[load]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AppBackendStatus.useEffect": ()=>{
            void load();
        }
    }["AppBackendStatus.useEffect"], [
        load
    ]);
    if (!settings) return null;
    const meta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"][settings.llmProvider];
    const detail = modelForProvider(settings);
    const title = `${meta.label} — ${detail}. Click to change.`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        href: "/settings",
        title: title,
        className: "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "h-2 w-2 shrink-0 rounded-full bg-emerald-500",
                "aria-hidden": true
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0 text-[var(--muted)]",
                children: "Backend"
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "truncate font-medium text-[var(--foreground)]",
                children: [
                    meta.shortLabel,
                    " · ",
                    shortenModelLabel(detail, 36)
                ]
            }, void 0, true, {
                fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx",
        lineNumber: 57,
        columnNumber: 10
    }, this);
}
_s(AppBackendStatus, "bfhOoHWl3qVGdFvebOKE1kqKXAU=");
_c = AppBackendStatus;
var _c;
__turbopack_context__.k.register(_c, "AppBackendStatus");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/app/settings/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SettingsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/llm-provider-config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2d$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/app-settings-types.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
        openaiModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel,
        deepseekApiKey: "",
        deepseekBaseUrl: "",
        deepseekModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel,
        dashscopeApiKey: "",
        dashscopeBaseUrl: "",
        dashscopeModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel,
        anthropicApiKey: "",
        anthropicModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel,
        qwenModel: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_local.defaultModel,
        useCpu: false,
        cudaDevice: "0"
    };
}
function settingsToForm(s, prev) {
    return {
        ...prev,
        llmProvider: s.llmProvider || "qwen_local",
        openaiBaseUrl: s.openaiBaseUrl || "",
        openaiModel: s.openaiModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel,
        deepseekBaseUrl: s.deepseekBaseUrl || "",
        deepseekModel: s.deepseekModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel,
        dashscopeBaseUrl: s.dashscopeBaseUrl || "",
        dashscopeModel: s.dashscopeModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel,
        anthropicModel: s.anthropicModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel,
        qwenModel: s.qwenModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_local.defaultModel,
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
    return ids.includes(model) ? model : __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"];
}
function ApiKeySetBadge(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(2);
    if ($[0] !== "c1feda7e3d7a91001c8da421055c3662c33c5d5efea14eaf311eefbf002ec13b") {
        for(let $i = 0; $i < 2; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "c1feda7e3d7a91001c8da421055c3662c33c5d5efea14eaf311eefbf002ec13b";
    }
    const { set } = t0;
    if (!set) {
        return null;
    }
    let t1;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[var(--muted)]",
            children: " (saved — enter a new value to replace)"
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 103,
            columnNumber: 10
        }, this);
        $[1] = t1;
    } else {
        t1 = $[1];
    }
    return t1;
}
_c = ApiKeySetBadge;
function SettingsPage() {
    _s();
    const [settings, setSettings] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [gpu, setGpu] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [modelStatus, setModelStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [saving, setSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [downloadLog, setDownloadLog] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [downloading, setDownloading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [testResult, setTestResult] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [testing, setTesting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [form, setForm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(defaultForm);
    const activeMeta = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"][form.llmProvider];
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "SettingsPage.useCallback[refresh]": async ()=>{
            setError(null);
            try {
                const [s, g, m] = await Promise.all([
                    fetch("/api/settings").then({
                        "SettingsPage.useCallback[refresh]": (r)=>r.json()
                    }["SettingsPage.useCallback[refresh]"]),
                    fetch("/api/system/gpu").then({
                        "SettingsPage.useCallback[refresh]": (r_0)=>r_0.json()
                    }["SettingsPage.useCallback[refresh]"]),
                    fetch("/api/models/status").then({
                        "SettingsPage.useCallback[refresh]": (r_1)=>r_1.json()
                    }["SettingsPage.useCallback[refresh]"])
                ]);
                if (s.error) throw new Error(s.error);
                setSettings(s);
                setGpu(g);
                setModelStatus(m);
                setForm({
                    "SettingsPage.useCallback[refresh]": (f)=>settingsToForm(s, f)
                }["SettingsPage.useCallback[refresh]"]);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Load failed");
            } finally{
                setLoading(false);
            }
        }
    }["SettingsPage.useCallback[refresh]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SettingsPage.useEffect": ()=>{
            void refresh();
        }
    }["SettingsPage.useEffect"], [
        refresh
    ]);
    async function handleSave(e_0) {
        e_0.preventDefault();
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
                const keyErr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$app$2d$settings$2d$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["validateApiKeyInput"])(k, label);
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
            setForm((f_0)=>settingsToForm(data, f_0));
        } catch (e_1) {
            setError(e_1 instanceof Error ? e_1.message : "Save failed");
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
                return form.openaiBaseUrl !== (settings.openaiBaseUrl || "") || form.openaiModel !== (settings.openaiModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].openai.defaultModel);
            case "deepseek":
                return form.deepseekBaseUrl !== (settings.deepseekBaseUrl || "") || form.deepseekModel !== (settings.deepseekModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].deepseek.defaultModel);
            case "qwen_api":
                return form.dashscopeBaseUrl !== (settings.dashscopeBaseUrl || "") || form.dashscopeModel !== (settings.dashscopeModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].qwen_api.defaultModel);
            case "anthropic":
                return form.anthropicModel !== (settings.anthropicModel || __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_UI"].anthropic.defaultModel);
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
            const res_0 = await fetch("/api/settings/test-llm", {
                method: "POST"
            });
            const data_0 = await res_0.json();
            if (res_0.ok && data_0.ok) {
                setTestResult({
                    ok: true,
                    text: data_0.message || "Connection OK."
                });
            } else {
                setTestResult({
                    ok: false,
                    text: data_0.error || `Request failed (${res_0.status})`
                });
            }
        } catch (e_2) {
            setTestResult({
                ok: false,
                text: e_2 instanceof Error ? e_2.message : "Test failed"
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
            const res_1 = await fetch("/api/models/download", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    repoId: "Qwen/Qwen3.5-4B"
                })
            });
            const data_1 = await res_1.json();
            if (!res_1.ok) throw new Error(data_1.error || "Download failed");
            setDownloadLog(data_1.log || "Done.");
            await refresh();
            if (data_1.path) {
                setForm((f_1)=>({
                        ...f_1,
                        qwenModel: data_1.path
                    }));
            }
        } catch (e_3) {
            setError(e_3 instanceof Error ? e_3.message : "Download failed");
        } finally{
            setDownloading(false);
        }
    }
    function useDownloadedPath() {
        if (modelStatus?.path) {
            setForm((f_2)=>({
                    ...f_2,
                    qwenModel: modelStatus.path
                }));
        }
    }
    function renderModelField(label_0, model, presets, onModel, groups) {
        const selectVal = modelSelectValue(model, presets, groups);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: label_0
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 320,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: selectVal,
                            onChange: (e_4)=>{
                                const v = e_4.target.value;
                                onModel(v === __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"] ? "" : v);
                            },
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                            children: [
                                groups?.length ? groups.map((g_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("optgroup", {
                                        label: g_0.label,
                                        children: g_0.models.map((id)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: id,
                                                children: id
                                            }, id, false, {
                                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                                lineNumber: 326,
                                                columnNumber: 43
                                            }, this))
                                    }, g_0.label, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 325,
                                        columnNumber: 49
                                    }, this)) : presets.map((id_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: id_0,
                                        children: id_0
                                    }, id_0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 329,
                                        columnNumber: 54
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"],
                                    children: "Custom…"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 332,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 321,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 319,
                    columnNumber: 9
                }, this),
                selectVal === __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CUSTOM_MODEL"] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Custom model ID"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 336,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            value: model,
                            onChange: (e_5)=>onModel(e_5.target.value),
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                            placeholder: "e.g. qwen3.5-plus"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 337,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 335,
                    columnNumber: 40
                }, this)
            ]
        }, void 0, true);
    }
    function renderCloudPanel() {
        const p = form.llmProvider;
        if (p === "qwen_local") return null;
        const keyField = p === "openai" ? "openaiApiKey" : p === "deepseek" ? "deepseekApiKey" : p === "qwen_api" ? "dashscopeApiKey" : "anthropicApiKey";
        const keySet = p === "openai" ? settings?.openaiApiKeySet : p === "deepseek" ? settings?.deepseekApiKeySet : p === "qwen_api" ? settings?.dashscopeApiKeySet : settings?.anthropicApiKeySet;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-sm font-medium",
                    children: [
                        activeMeta.label,
                        " — API connection"
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 347,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex flex-col gap-1 text-sm",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "API key",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ApiKeySetBadge, {
                                    set: keySet
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 351,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 349,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "password",
                            autoComplete: "off",
                            value: form[keyField],
                            onChange: (e_6)=>setForm((f_3)=>({
                                        ...f_3,
                                        [keyField]: e_6.target.value
                                    })),
                            className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2",
                            placeholder: activeMeta.keyPlaceholder
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 353,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 348,
                    columnNumber: 9
                }, this),
                p === "openai" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL (optional)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 361,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.openaiBaseUrl,
                                    onChange: (e_7)=>setForm((f_4)=>({
                                                ...f_4,
                                                openaiBaseUrl: e_7.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 362,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 360,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model", form.openaiModel, activeMeta.modelPresets, (v_0)=>setForm((f_5)=>({
                                    ...f_5,
                                    openaiModel: v_0
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "deepseek" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL (optional)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 375,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.deepseekBaseUrl,
                                    onChange: (e_8)=>setForm((f_6)=>({
                                                ...f_6,
                                                deepseekBaseUrl: e_8.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 376,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-[var(--muted)]",
                                    children: "Official OpenAI-compatible base: api.deepseek.com (SDK appends /chat/completions)."
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 380,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 374,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model", form.deepseekModel, activeMeta.modelPresets, (v_1)=>setForm((f_7)=>({
                                    ...f_7,
                                    deepseekModel: v_1
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "qwen_api" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Base URL"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 392,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    value: form.dashscopeBaseUrl,
                                    onChange: (e_9)=>setForm((f_8)=>({
                                                ...f_8,
                                                dashscopeBaseUrl: e_9.target.value
                                            })),
                                    className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs",
                                    placeholder: activeMeta.baseUrlPlaceholder
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 393,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs text-[var(--muted)]",
                                    children: "Mainland China (default): dashscope.aliyuncs.com/compatible-mode/v1 — International (Singapore): dashscope-intl.aliyuncs.com/compatible-mode/v1"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 397,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 391,
                            columnNumber: 13
                        }, this),
                        renderModelField("Model (DashScope model ID)", form.dashscopeModel, activeMeta.modelPresets, (v_2)=>setForm((f_9)=>({
                                    ...f_9,
                                    dashscopeModel: v_2
                                })), activeMeta.modelPresetGroups)
                    ]
                }, void 0, true),
                p === "anthropic" && renderModelField("Model", form.anthropicModel, activeMeta.modelPresets, (v_3)=>setForm((f_10)=>({
                            ...f_10,
                            anthropicModel: v_3
                        })), activeMeta.modelPresetGroups),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "button",
                            disabled: testing || saving,
                            onClick: ()=>void handleTestConnection(),
                            className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface)] disabled:opacity-50",
                            children: testing ? "Testing…" : "Test connection"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 414,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-[var(--muted)]",
                            children: "Uses saved settings on disk — save first, then test."
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 417,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 413,
                    columnNumber: 9
                }, this),
                testResult && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: `text-sm ${testResult.ok ? "text-green-600" : "text-amber-600"}`,
                    children: testResult.text
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 421,
                    columnNumber: 24
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 346,
            columnNumber: 12
        }, this);
    }
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-[var(--background)] p-8 text-[var(--foreground)]",
            children: "Loading settings…"
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 427,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mx-auto max-w-3xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                    className: "mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-2xl font-bold tracking-tight",
                                    children: "Model & inference"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 435,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-[var(--muted)]",
                                    children: [
                                        "Agent1, Agent2, and document chat use the backend selected here. Saved to",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                            className: "rounded bg-[var(--surface)] px-1 text-xs",
                                            children: "~/.config/ProspectusAI/settings.json"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 438,
                                            columnNumber: 15
                                        }, this),
                                        "."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 436,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 434,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col items-start gap-2 sm:items-end",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AppBackendStatus"], {}, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 445,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "text-sm text-[var(--accent)] hover:underline",
                                    children: "← Back to workspace"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 446,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 444,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 433,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 452,
                    columnNumber: 19
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                            children: "Environment"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 457,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-medium",
                                    children: "GPU / PyTorch"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 461,
                                    columnNumber: 13
                                }, this),
                                gpu?.ok && gpu.cuda_available ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "mt-2 list-disc pl-5 text-sm text-[var(--muted)]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: [
                                                "CUDA available — ",
                                                gpu.device_count,
                                                " device(s) (",
                                                gpu.python,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 463,
                                            columnNumber: 17
                                        }, this),
                                        (gpu.device_names || []).map((n, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: [
                                                    "[",
                                                    i,
                                                    "] ",
                                                    n
                                                ]
                                            }, i, true, {
                                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                                lineNumber: 466,
                                                columnNumber: 57
                                            }, this))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 462,
                                    columnNumber: 46
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                                    lineNumber: 469,
                                    columnNumber: 23
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>void refresh(),
                                    className: "mt-3 text-xs text-[var(--accent)] hover:underline",
                                    children: "Refresh probe"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 473,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 460,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 456,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                    className: "mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                            children: "Local weights (Qwen)"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 480,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-sm text-[var(--muted)]",
                            children: "Download once or point to an existing folder. Used only when “Local Qwen” is selected."
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 483,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-[var(--muted)]",
                                    children: [
                                        "Default cache:",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                                            className: "break-all text-xs text-[var(--foreground)]",
                                            children: modelStatus?.path
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 489,
                                            columnNumber: 15
                                        }, this),
                                        modelStatus?.installed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-2 text-green-600",
                                            children: "Installed"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 490,
                                            columnNumber: 41
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-2 text-amber-600",
                                            children: "Not found"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 490,
                                            columnNumber: 98
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 487,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex flex-wrap gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            disabled: downloading,
                                            onClick: ()=>void handleDownload(),
                                            className: "rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50",
                                            children: downloading ? "Downloading…" : "Download Qwen3.5-4B"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 493,
                                            columnNumber: 15
                                        }, this),
                                        modelStatus?.installed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: useDownloadedPath,
                                            className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm",
                                            children: "Use downloaded folder path"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 496,
                                            columnNumber: 42
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 492,
                                    columnNumber: 13
                                }, this),
                                downloadLog && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                                    className: "mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-xs",
                                    children: downloadLog
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 500,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 486,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 479,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSave,
                    className: "space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                                    children: "Inference backend"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 508,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-[var(--muted)]",
                                    children: "Pick one provider. Cloud APIs need an API key; document chat uses the same credentials for OpenAI-compatible providers."
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 511,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 507,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "flex flex-col gap-1.5 text-sm",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-medium",
                                    children: "Provider"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 518,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: form.llmProvider,
                                    onChange: (e_10)=>setForm((f_11)=>({
                                                ...f_11,
                                                llmProvider: e_10.target.value
                                            })),
                                    className: "w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5",
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$llm$2d$provider$2d$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROVIDER_LIST"].map((meta)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: meta.id,
                                            children: meta.label
                                        }, meta.id, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 523,
                                            columnNumber: 42
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 519,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[var(--muted)]",
                                    children: activeMeta.description
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 527,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 517,
                            columnNumber: 11
                        }, this),
                        renderCloudPanel(),
                        form.llmProvider === "qwen_local" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "flex flex-col gap-1 text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Qwen model (Hugging Face id or local folder path)"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 534,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        value: form.qwenModel,
                                        onChange: (e_11)=>setForm((f_12)=>({
                                                    ...f_12,
                                                    qwenModel: e_11.target.value
                                                })),
                                        className: "rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2 font-mono text-xs"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                        lineNumber: 535,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                lineNumber: 533,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 532,
                            columnNumber: 49
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-medium",
                                    children: "Device (local Qwen only)"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 543,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "mt-3 flex items-center gap-2 text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            checked: form.useCpu,
                                            onChange: (e_12)=>setForm((f_13)=>({
                                                        ...f_13,
                                                        useCpu: e_12.target.checked
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 545,
                                            columnNumber: 15
                                        }, this),
                                        "Force CPU"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 544,
                                    columnNumber: 13
                                }, this),
                                !form.useCpu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "mt-3 flex flex-col gap-1 text-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "CUDA device index"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 552,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            value: form.cudaDevice,
                                            onChange: (e_13)=>setForm((f_14)=>({
                                                        ...f_14,
                                                        cudaDevice: e_13.target.value
                                                    })),
                                            className: "w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-2"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                            lineNumber: 553,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                                    lineNumber: 551,
                                    columnNumber: 30
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 542,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: saving,
                            className: "rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
                            children: saving ? "Saving…" : "Save settings"
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                            lineNumber: 560,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
                    lineNumber: 506,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
            lineNumber: 432,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/modular/platform-module/web/src/app/settings/page.tsx",
        lineNumber: 431,
        columnNumber: 10
    }, this);
}
_s(SettingsPage, "Zk/SETl6mMU+SIpGUQe8T8ce/eI=");
_c1 = SettingsPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "ApiKeySetBadge");
__turbopack_context__.k.register(_c1, "SettingsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/cjs/react-compiler-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * react-compiler-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    var ReactSharedInternals = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)").__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    exports.c = function(size) {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.");
        return dispatcher.useMemoCache(size);
    };
}();
}),
"[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ 'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/cjs/react-compiler-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    assign: null,
    searchParamsToUrlQuery: null,
    urlQueryToSearchParams: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    assign: function() {
        return assign;
    },
    searchParamsToUrlQuery: function() {
        return searchParamsToUrlQuery;
    },
    urlQueryToSearchParams: function() {
        return urlQueryToSearchParams;
    }
});
function searchParamsToUrlQuery(searchParams) {
    const query = {};
    for (const [key, value] of searchParams.entries()){
        const existing = query[key];
        if (typeof existing === 'undefined') {
            query[key] = value;
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            query[key] = [
                existing,
                value
            ];
        }
    }
    return query;
}
function stringifyUrlQueryParam(param) {
    if (typeof param === 'string') {
        return param;
    }
    if (typeof param === 'number' && !isNaN(param) || typeof param === 'boolean') {
        return String(param);
    } else {
        return '';
    }
}
function urlQueryToSearchParams(query) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)){
        if (Array.isArray(value)) {
            for (const item of value){
                searchParams.append(key, stringifyUrlQueryParam(item));
            }
        } else {
            searchParams.set(key, stringifyUrlQueryParam(value));
        }
    }
    return searchParams;
}
function assign(target, ...searchParamsList) {
    for (const searchParams of searchParamsList){
        for (const key of searchParams.keys()){
            target.delete(key);
        }
        for (const [key, value] of searchParams.entries()){
            target.append(key, value);
        }
    }
    return target;
} //# sourceMappingURL=querystring.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// Format function modified from nodejs
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    formatUrl: null,
    formatWithValidation: null,
    urlObjectKeys: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    formatUrl: function() {
        return formatUrl;
    },
    formatWithValidation: function() {
        return formatWithValidation;
    },
    urlObjectKeys: function() {
        return urlObjectKeys;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _querystring = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/querystring.js [app-client] (ecmascript)"));
const slashedProtocols = /https?|ftp|gopher|file/;
function formatUrl(urlObj) {
    let { auth, hostname } = urlObj;
    let protocol = urlObj.protocol || '';
    let pathname = urlObj.pathname || '';
    let hash = urlObj.hash || '';
    let query = urlObj.query || '';
    let host = false;
    auth = auth ? encodeURIComponent(auth).replace(/%3A/i, ':') + '@' : '';
    if (urlObj.host) {
        host = auth + urlObj.host;
    } else if (hostname) {
        host = auth + (~hostname.indexOf(':') ? `[${hostname}]` : hostname);
        if (urlObj.port) {
            host += ':' + urlObj.port;
        }
    }
    if (query && typeof query === 'object') {
        query = String(_querystring.urlQueryToSearchParams(query));
    }
    let search = urlObj.search || query && `?${query}` || '';
    if (protocol && !protocol.endsWith(':')) protocol += ':';
    if (urlObj.slashes || (!protocol || slashedProtocols.test(protocol)) && host !== false) {
        host = '//' + (host || '');
        if (pathname && pathname[0] !== '/') pathname = '/' + pathname;
    } else if (!host) {
        host = '';
    }
    if (hash && hash[0] !== '#') hash = '#' + hash;
    if (search && search[0] !== '?') search = '?' + search;
    pathname = pathname.replace(/[?#]/g, encodeURIComponent);
    search = search.replace('#', '%23');
    return `${protocol}${host}${pathname}${search}${hash}`;
}
const urlObjectKeys = [
    'auth',
    'hash',
    'host',
    'hostname',
    'href',
    'path',
    'pathname',
    'port',
    'protocol',
    'query',
    'search',
    'slashes'
];
function formatWithValidation(url) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (url !== null && typeof url === 'object') {
            Object.keys(url).forEach((key)=>{
                if (!urlObjectKeys.includes(key)) {
                    console.warn(`Unknown key passed via urlObject into url.format: ${key}`);
                }
            });
        }
    }
    return formatUrl(url);
} //# sourceMappingURL=format-url.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useMergedRef", {
    enumerable: true,
    get: function() {
        return useMergedRef;
    }
});
const _react = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
function useMergedRef(refA, refB) {
    const cleanupA = (0, _react.useRef)(null);
    const cleanupB = (0, _react.useRef)(null);
    // NOTE: In theory, we could skip the wrapping if only one of the refs is non-null.
    // (this happens often if the user doesn't pass a ref to Link/Form/Image)
    // But this can cause us to leak a cleanup-ref into user code (previously via `<Link legacyBehavior>`),
    // and the user might pass that ref into ref-merging library that doesn't support cleanup refs
    // (because it hasn't been updated for React 19)
    // which can then cause things to blow up, because a cleanup-returning ref gets called with `null`.
    // So in practice, it's safer to be defensive and always wrap the ref, even on React 19.
    return (0, _react.useCallback)((current)=>{
        if (current === null) {
            const cleanupFnA = cleanupA.current;
            if (cleanupFnA) {
                cleanupA.current = null;
                cleanupFnA();
            }
            const cleanupFnB = cleanupB.current;
            if (cleanupFnB) {
                cleanupB.current = null;
                cleanupFnB();
            }
        } else {
            if (refA) {
                cleanupA.current = applyRef(refA, current);
            }
            if (refB) {
                cleanupB.current = applyRef(refB, current);
            }
        }
    }, [
        refA,
        refB
    ]);
}
function applyRef(refA, current) {
    if (typeof refA === 'function') {
        const cleanup = refA(current);
        if (typeof cleanup === 'function') {
            return cleanup;
        } else {
            return ()=>refA(null);
        }
    } else {
        refA.current = current;
        return ()=>{
            refA.current = null;
        };
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=use-merged-ref.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    DecodeError: null,
    MiddlewareNotFoundError: null,
    MissingStaticPage: null,
    NormalizeError: null,
    PageNotFoundError: null,
    SP: null,
    ST: null,
    WEB_VITALS: null,
    execOnce: null,
    getDisplayName: null,
    getLocationOrigin: null,
    getURL: null,
    isAbsoluteUrl: null,
    isResSent: null,
    loadGetInitialProps: null,
    normalizeRepeatedSlashes: null,
    stringifyError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DecodeError: function() {
        return DecodeError;
    },
    MiddlewareNotFoundError: function() {
        return MiddlewareNotFoundError;
    },
    MissingStaticPage: function() {
        return MissingStaticPage;
    },
    NormalizeError: function() {
        return NormalizeError;
    },
    PageNotFoundError: function() {
        return PageNotFoundError;
    },
    SP: function() {
        return SP;
    },
    ST: function() {
        return ST;
    },
    WEB_VITALS: function() {
        return WEB_VITALS;
    },
    execOnce: function() {
        return execOnce;
    },
    getDisplayName: function() {
        return getDisplayName;
    },
    getLocationOrigin: function() {
        return getLocationOrigin;
    },
    getURL: function() {
        return getURL;
    },
    isAbsoluteUrl: function() {
        return isAbsoluteUrl;
    },
    isResSent: function() {
        return isResSent;
    },
    loadGetInitialProps: function() {
        return loadGetInitialProps;
    },
    normalizeRepeatedSlashes: function() {
        return normalizeRepeatedSlashes;
    },
    stringifyError: function() {
        return stringifyError;
    }
});
const WEB_VITALS = [
    'CLS',
    'FCP',
    'FID',
    'INP',
    'LCP',
    'TTFB'
];
function execOnce(fn) {
    let used = false;
    let result;
    return (...args)=>{
        if (!used) {
            used = true;
            result = fn(...args);
        }
        return result;
    };
}
// Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
// Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
const isAbsoluteUrl = (url)=>ABSOLUTE_URL_REGEX.test(url);
function getLocationOrigin() {
    const { protocol, hostname, port } = window.location;
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}
function getURL() {
    const { href } = window.location;
    const origin = getLocationOrigin();
    return href.substring(origin.length);
}
function getDisplayName(Component) {
    return typeof Component === 'string' ? Component : Component.displayName || Component.name || 'Unknown';
}
function isResSent(res) {
    return res.finished || res.headersSent;
}
function normalizeRepeatedSlashes(url) {
    const urlParts = url.split('?');
    const urlNoQuery = urlParts[0];
    return urlNoQuery // first we replace any non-encoded backslashes with forward
    // then normalize repeated forward slashes
    .replace(/\\/g, '/').replace(/\/\/+/g, '/') + (urlParts[1] ? `?${urlParts.slice(1).join('?')}` : '');
}
async function loadGetInitialProps(App, ctx) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (App.prototype?.getInitialProps) {
            const message = `"${getDisplayName(App)}.getInitialProps()" is defined as an instance method - visit https://nextjs.org/docs/messages/get-initial-props-as-an-instance-method for more information.`;
            throw Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
                value: "E394",
                enumerable: false,
                configurable: true
            });
        }
    }
    // when called from _app `ctx` is nested in `ctx`
    const res = ctx.res || ctx.ctx && ctx.ctx.res;
    if (!App.getInitialProps) {
        if (ctx.ctx && ctx.Component) {
            // @ts-ignore pageProps default
            return {
                pageProps: await loadGetInitialProps(ctx.Component, ctx.ctx)
            };
        }
        return {};
    }
    const props = await App.getInitialProps(ctx);
    if (res && isResSent(res)) {
        return props;
    }
    if (!props) {
        const message = `"${getDisplayName(App)}.getInitialProps()" should resolve to an object. But found "${props}" instead.`;
        throw Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
            value: "E394",
            enumerable: false,
            configurable: true
        });
    }
    if ("TURBOPACK compile-time truthy", 1) {
        if (Object.keys(props).length === 0 && !ctx.ctx) {
            console.warn(`${getDisplayName(App)} returned an empty object from \`getInitialProps\`. This de-optimizes and prevents automatic static optimization. https://nextjs.org/docs/messages/empty-object-getInitialProps`);
        }
    }
    return props;
}
const SP = typeof performance !== 'undefined';
const ST = SP && [
    'mark',
    'measure',
    'getEntriesByName'
].every((method)=>typeof performance[method] === 'function');
class DecodeError extends Error {
}
class NormalizeError extends Error {
}
class PageNotFoundError extends Error {
    constructor(page){
        super();
        this.code = 'ENOENT';
        this.name = 'PageNotFoundError';
        this.message = `Cannot find module for page: ${page}`;
    }
}
class MissingStaticPage extends Error {
    constructor(page, message){
        super();
        this.message = `Failed to load static file for page: ${page} ${message}`;
    }
}
class MiddlewareNotFoundError extends Error {
    constructor(){
        super();
        this.code = 'ENOENT';
        this.message = `Cannot find the middleware module`;
    }
}
function stringifyError(error) {
    return JSON.stringify({
        message: error.message,
        stack: error.stack
    });
} //# sourceMappingURL=utils.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isLocalURL", {
    enumerable: true,
    get: function() {
        return isLocalURL;
    }
});
const _utils = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _hasbasepath = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/has-base-path.js [app-client] (ecmascript)");
function isLocalURL(url) {
    // prevent a hydration mismatch on href for url with anchor refs
    if (!(0, _utils.isAbsoluteUrl)(url)) return true;
    try {
        // absolute urls can be local if they are on the same origin
        const locationOrigin = (0, _utils.getLocationOrigin)();
        const resolved = new URL(url, locationOrigin);
        return resolved.origin === locationOrigin && (0, _hasbasepath.hasBasePath)(resolved.pathname);
    } catch (_) {
        return false;
    }
} //# sourceMappingURL=is-local-url.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "errorOnce", {
    enumerable: true,
    get: function() {
        return errorOnce;
    }
});
let errorOnce = (_)=>{};
if ("TURBOPACK compile-time truthy", 1) {
    const errors = new Set();
    errorOnce = (msg)=>{
        if (!errors.has(msg)) {
            console.error(msg);
        }
        errors.add(msg);
    };
} //# sourceMappingURL=error-once.js.map
}),
"[project]/modular/platform-module/web/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    default: null,
    useLinkStatus: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    /**
 * A React component that extends the HTML `<a>` element to provide
 * [prefetching](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating#2-prefetching)
 * and client-side navigation. This is the primary way to navigate between routes in Next.js.
 *
 * @remarks
 * - Prefetching is only enabled in production.
 *
 * @see https://nextjs.org/docs/app/api-reference/components/link
 */ default: function() {
        return LinkComponent;
    },
    useLinkStatus: function() {
        return useLinkStatus;
    }
});
const _interop_require_wildcard = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _formaturl = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/format-url.js [app-client] (ecmascript)");
const _approutercontextsharedruntime = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js [app-client] (ecmascript)");
const _usemergedref = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/use-merged-ref.js [app-client] (ecmascript)");
const _utils = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils.js [app-client] (ecmascript)");
const _addbasepath = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/add-base-path.js [app-client] (ecmascript)");
const _warnonce = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils/warn-once.js [app-client] (ecmascript)");
const _links = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/components/links.js [app-client] (ecmascript)");
const _islocalurl = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/router/utils/is-local-url.js [app-client] (ecmascript)");
const _types = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/components/segment-cache/types.js [app-client] (ecmascript)");
const _erroronce = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/shared/lib/utils/error-once.js [app-client] (ecmascript)");
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute('target');
    return target && target !== '_self' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || // triggers resource download
    event.nativeEvent && event.nativeEvent.which === 2;
}
function linkClicked(e, href, as, linkInstanceRef, replace, scroll, onNavigate) {
    if (typeof window !== 'undefined') {
        const { nodeName } = e.currentTarget;
        // anchors inside an svg have a lowercase nodeName
        const isAnchorNodeName = nodeName.toUpperCase() === 'A';
        if (isAnchorNodeName && isModifiedEvent(e) || e.currentTarget.hasAttribute('download')) {
            // ignore click for browser’s default behavior
            return;
        }
        if (!(0, _islocalurl.isLocalURL)(href)) {
            if (replace) {
                // browser default behavior does not replace the history state
                // so we need to do it manually
                e.preventDefault();
                location.replace(href);
            }
            // ignore click for browser’s default behavior
            return;
        }
        e.preventDefault();
        if (onNavigate) {
            let isDefaultPrevented = false;
            onNavigate({
                preventDefault: ()=>{
                    isDefaultPrevented = true;
                }
            });
            if (isDefaultPrevented) {
                return;
            }
        }
        const { dispatchNavigateAction } = __turbopack_context__.r("[project]/modular/platform-module/web/node_modules/next/dist/client/components/app-router-instance.js [app-client] (ecmascript)");
        _react.default.startTransition(()=>{
            dispatchNavigateAction(as || href, replace ? 'replace' : 'push', scroll ?? true, linkInstanceRef.current);
        });
    }
}
function formatStringOrUrl(urlObjOrString) {
    if (typeof urlObjOrString === 'string') {
        return urlObjOrString;
    }
    return (0, _formaturl.formatUrl)(urlObjOrString);
}
function LinkComponent(props) {
    const [linkStatus, setOptimisticLinkStatus] = (0, _react.useOptimistic)(_links.IDLE_LINK_STATUS);
    let children;
    const linkInstanceRef = (0, _react.useRef)(null);
    const { href: hrefProp, as: asProp, children: childrenProp, prefetch: prefetchProp = null, passHref, replace, shallow, scroll, onClick, onMouseEnter: onMouseEnterProp, onTouchStart: onTouchStartProp, legacyBehavior = false, onNavigate, ref: forwardedRef, unstable_dynamicOnHover, ...restProps } = props;
    children = childrenProp;
    if (legacyBehavior && (typeof children === 'string' || typeof children === 'number')) {
        children = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            children: children
        });
    }
    const router = _react.default.useContext(_approutercontextsharedruntime.AppRouterContext);
    const prefetchEnabled = prefetchProp !== false;
    const fetchStrategy = prefetchProp !== false ? getFetchStrategyFromPrefetchProp(prefetchProp) : _types.FetchStrategy.PPR;
    if ("TURBOPACK compile-time truthy", 1) {
        function createPropError(args) {
            return Object.defineProperty(new Error(`Failed prop type: The prop \`${args.key}\` expects a ${args.expected} in \`<Link>\`, but got \`${args.actual}\` instead.` + (typeof window !== 'undefined' ? "\nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                value: "E319",
                enumerable: false,
                configurable: true
            });
        }
        // TypeScript trick for type-guarding:
        const requiredPropsGuard = {
            href: true
        };
        const requiredProps = Object.keys(requiredPropsGuard);
        requiredProps.forEach((key)=>{
            if (key === 'href') {
                if (props[key] == null || typeof props[key] !== 'string' && typeof props[key] !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: props[key] === null ? 'null' : typeof props[key]
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
        // TypeScript trick for type-guarding:
        const optionalPropsGuard = {
            as: true,
            replace: true,
            scroll: true,
            shallow: true,
            passHref: true,
            prefetch: true,
            unstable_dynamicOnHover: true,
            onClick: true,
            onMouseEnter: true,
            onTouchStart: true,
            legacyBehavior: true,
            onNavigate: true
        };
        const optionalProps = Object.keys(optionalPropsGuard);
        optionalProps.forEach((key)=>{
            const valType = typeof props[key];
            if (key === 'as') {
                if (props[key] && valType !== 'string' && valType !== 'object') {
                    throw createPropError({
                        key,
                        expected: '`string` or `object`',
                        actual: valType
                    });
                }
            } else if (key === 'onClick' || key === 'onMouseEnter' || key === 'onTouchStart' || key === 'onNavigate') {
                if (props[key] && valType !== 'function') {
                    throw createPropError({
                        key,
                        expected: '`function`',
                        actual: valType
                    });
                }
            } else if (key === 'replace' || key === 'scroll' || key === 'shallow' || key === 'passHref' || key === 'legacyBehavior' || key === 'unstable_dynamicOnHover') {
                if (props[key] != null && valType !== 'boolean') {
                    throw createPropError({
                        key,
                        expected: '`boolean`',
                        actual: valType
                    });
                }
            } else if (key === 'prefetch') {
                if (props[key] != null && valType !== 'boolean' && props[key] !== 'auto') {
                    throw createPropError({
                        key,
                        expected: '`boolean | "auto"`',
                        actual: valType
                    });
                }
            } else {
                // TypeScript trick for type-guarding:
                const _ = key;
            }
        });
    }
    if ("TURBOPACK compile-time truthy", 1) {
        if (props.locale) {
            (0, _warnonce.warnOnce)('The `locale` prop is not supported in `next/link` while using the `app` router. Read more about app router internalization: https://nextjs.org/docs/app/building-your-application/routing/internationalization');
        }
        if (!asProp) {
            let href;
            if (typeof hrefProp === 'string') {
                href = hrefProp;
            } else if (typeof hrefProp === 'object' && typeof hrefProp.pathname === 'string') {
                href = hrefProp.pathname;
            }
            if (href) {
                const hasDynamicSegment = href.split('/').some((segment)=>segment.startsWith('[') && segment.endsWith(']'));
                if (hasDynamicSegment) {
                    throw Object.defineProperty(new Error(`Dynamic href \`${href}\` found in <Link> while using the \`/app\` router, this is not supported. Read more: https://nextjs.org/docs/messages/app-dir-dynamic-href`), "__NEXT_ERROR_CODE", {
                        value: "E267",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
        }
    }
    const { href, as } = _react.default.useMemo({
        "LinkComponent.useMemo": ()=>{
            const resolvedHref = formatStringOrUrl(hrefProp);
            return {
                href: resolvedHref,
                as: asProp ? formatStringOrUrl(asProp) : resolvedHref
            };
        }
    }["LinkComponent.useMemo"], [
        hrefProp,
        asProp
    ]);
    // This will return the first child, if multiple are provided it will throw an error
    let child;
    if (legacyBehavior) {
        if (children?.$$typeof === Symbol.for('react.lazy')) {
            throw Object.defineProperty(new Error(`\`<Link legacyBehavior>\` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's \`<a>\` tag.`), "__NEXT_ERROR_CODE", {
                value: "E863",
                enumerable: false,
                configurable: true
            });
        }
        if ("TURBOPACK compile-time truthy", 1) {
            if (onClick) {
                console.warn(`"onClick" was passed to <Link> with \`href\` of \`${hrefProp}\` but "legacyBehavior" was set. The legacy behavior requires onClick be set on the child of next/link`);
            }
            if (onMouseEnterProp) {
                console.warn(`"onMouseEnter" was passed to <Link> with \`href\` of \`${hrefProp}\` but "legacyBehavior" was set. The legacy behavior requires onMouseEnter be set on the child of next/link`);
            }
            try {
                child = _react.default.Children.only(children);
            } catch (err) {
                if (!children) {
                    throw Object.defineProperty(new Error(`No children were passed to <Link> with \`href\` of \`${hrefProp}\` but one child is required https://nextjs.org/docs/messages/link-no-children`), "__NEXT_ERROR_CODE", {
                        value: "E320",
                        enumerable: false,
                        configurable: true
                    });
                }
                throw Object.defineProperty(new Error(`Multiple children were passed to <Link> with \`href\` of \`${hrefProp}\` but only one child is supported https://nextjs.org/docs/messages/link-multiple-children` + (typeof window !== 'undefined' ? " \nOpen your browser's console to view the Component stack trace." : '')), "__NEXT_ERROR_CODE", {
                    value: "E266",
                    enumerable: false,
                    configurable: true
                });
            }
        } else //TURBOPACK unreachable
        ;
    } else {
        if ("TURBOPACK compile-time truthy", 1) {
            if (children?.type === 'a') {
                throw Object.defineProperty(new Error('Invalid <Link> with <a> child. Please remove <a> or use <Link legacyBehavior>.\nLearn more: https://nextjs.org/docs/messages/invalid-new-link-with-extra-anchor'), "__NEXT_ERROR_CODE", {
                    value: "E209",
                    enumerable: false,
                    configurable: true
                });
            }
        }
    }
    const childRef = legacyBehavior ? child && typeof child === 'object' && child.ref : forwardedRef;
    // Use a callback ref to attach an IntersectionObserver to the anchor tag on
    // mount. In the future we will also use this to keep track of all the
    // currently mounted <Link> instances, e.g. so we can re-prefetch them after
    // a revalidation or refresh.
    const observeLinkVisibilityOnMount = _react.default.useCallback({
        "LinkComponent.useCallback[observeLinkVisibilityOnMount]": (element)=>{
            if (router !== null) {
                linkInstanceRef.current = (0, _links.mountLinkInstance)(element, href, router, fetchStrategy, prefetchEnabled, setOptimisticLinkStatus);
            }
            return ({
                "LinkComponent.useCallback[observeLinkVisibilityOnMount]": ()=>{
                    if (linkInstanceRef.current) {
                        (0, _links.unmountLinkForCurrentNavigation)(linkInstanceRef.current);
                        linkInstanceRef.current = null;
                    }
                    (0, _links.unmountPrefetchableInstance)(element);
                }
            })["LinkComponent.useCallback[observeLinkVisibilityOnMount]"];
        }
    }["LinkComponent.useCallback[observeLinkVisibilityOnMount]"], [
        prefetchEnabled,
        href,
        router,
        fetchStrategy,
        setOptimisticLinkStatus
    ]);
    const mergedRef = (0, _usemergedref.useMergedRef)(observeLinkVisibilityOnMount, childRef);
    const childProps = {
        ref: mergedRef,
        onClick (e) {
            if ("TURBOPACK compile-time truthy", 1) {
                if (!e) {
                    throw Object.defineProperty(new Error(`Component rendered inside next/link has to pass click event to "onClick" prop.`), "__NEXT_ERROR_CODE", {
                        value: "E312",
                        enumerable: false,
                        configurable: true
                    });
                }
            }
            if (!legacyBehavior && typeof onClick === 'function') {
                onClick(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onClick === 'function') {
                child.props.onClick(e);
            }
            if (!router) {
                return;
            }
            if (e.defaultPrevented) {
                return;
            }
            linkClicked(e, href, as, linkInstanceRef, replace, scroll, onNavigate);
        },
        onMouseEnter (e) {
            if (!legacyBehavior && typeof onMouseEnterProp === 'function') {
                onMouseEnterProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onMouseEnter === 'function') {
                child.props.onMouseEnter(e);
            }
            if (!router) {
                return;
            }
            if ("TURBOPACK compile-time truthy", 1) {
                return;
            }
            //TURBOPACK unreachable
            ;
            const upgradeToDynamicPrefetch = undefined;
        },
        onTouchStart: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : function onTouchStart(e) {
            if (!legacyBehavior && typeof onTouchStartProp === 'function') {
                onTouchStartProp(e);
            }
            if (legacyBehavior && child.props && typeof child.props.onTouchStart === 'function') {
                child.props.onTouchStart(e);
            }
            if (!router) {
                return;
            }
            if (!prefetchEnabled) {
                return;
            }
            const upgradeToDynamicPrefetch = unstable_dynamicOnHover === true;
            (0, _links.onNavigationIntent)(e.currentTarget, upgradeToDynamicPrefetch);
        }
    };
    // If the url is absolute, we can bypass the logic to prepend the basePath.
    if ((0, _utils.isAbsoluteUrl)(as)) {
        childProps.href = as;
    } else if (!legacyBehavior || passHref || child.type === 'a' && !('href' in child.props)) {
        childProps.href = (0, _addbasepath.addBasePath)(as);
    }
    let link;
    if (legacyBehavior) {
        if ("TURBOPACK compile-time truthy", 1) {
            (0, _erroronce.errorOnce)('`legacyBehavior` is deprecated and will be removed in a future ' + 'release. A codemod is available to upgrade your components:\n\n' + 'npx @next/codemod@latest new-link .\n\n' + 'Learn more: https://nextjs.org/docs/app/building-your-application/upgrading/codemods#remove-a-tags-from-link-components');
        }
        link = /*#__PURE__*/ _react.default.cloneElement(child, childProps);
    } else {
        link = /*#__PURE__*/ (0, _jsxruntime.jsx)("a", {
            ...restProps,
            ...childProps,
            children: children
        });
    }
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(LinkStatusContext.Provider, {
        value: linkStatus,
        children: link
    });
}
const LinkStatusContext = /*#__PURE__*/ (0, _react.createContext)(_links.IDLE_LINK_STATUS);
const useLinkStatus = ()=>{
    return (0, _react.useContext)(LinkStatusContext);
};
function getFetchStrategyFromPrefetchProp(prefetchProp) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        return prefetchProp === null || prefetchProp === 'auto' ? _types.FetchStrategy.PPR : // (although invalid values should've been filtered out by prop validation in dev)
        _types.FetchStrategy.Full;
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=link.js.map
}),
]);

//# sourceMappingURL=modular_platform-module_web_4b7402bd._.js.map