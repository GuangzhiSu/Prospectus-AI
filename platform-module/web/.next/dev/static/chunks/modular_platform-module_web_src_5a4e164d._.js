(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/modular/platform-module/web/src/lib/prospectus-placeholders.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Parse prospectus draft placeholders (AI tags, DATA_MISSING, etc.) for UI bubbles. */ __turbopack_context__.s([
    "PLACEHOLDER_RE",
    ()=>PLACEHOLDER_RE,
    "getPlaceholderByHref",
    ()=>getPlaceholderByHref,
    "parsePlaceholder",
    ()=>parsePlaceholder,
    "preprocessProspectusMarkdown",
    ()=>preprocessProspectusMarkdown,
    "transformPlaceholdersInText",
    ()=>transformPlaceholdersInText
]);
const PLACEHOLDER_RE = /\[\[AI:[^\]]+\]\]|\*\*(?:DATA_MISSING|COUNSEL_INPUT_REQUIRED)\*\*|\[COUNSEL_INPUT_REQUIRED\]|\[Information not provided(?: in the documents)?\]/gi;
const AI_TAG_RE = /^\[\[AI:\s*([^|\]]+)(?:\|([^\]]*))?\]\]$/i;
function parsePlaceholder(raw, id) {
    const trimmed = raw.trim();
    if (/^\*\*DATA_MISSING\*\*$/i.test(trimmed)) {
        return {
            id,
            raw: trimmed,
            kind: "missing",
            shortLabel: "Missing",
            tooltip: "Required information is not in the source documents."
        };
    }
    if (/^\*\*COUNSEL_INPUT_REQUIRED\*\*$/i.test(trimmed) || /^\[COUNSEL_INPUT_REQUIRED\]$/i.test(trimmed)) {
        return {
            id,
            raw: trimmed,
            kind: "counsel",
            shortLabel: "Counsel",
            tooltip: "Sponsor-counsel input required before filing."
        };
    }
    if (/^\[Information not provided/i.test(trimmed)) {
        return {
            id,
            raw: trimmed,
            kind: "info_gap",
            shortLabel: "No data",
            tooltip: trimmed
        };
    }
    const ai = trimmed.match(AI_TAG_RE);
    if (ai) {
        const head = ai[1].trim().toUpperCase().replace(/\s+/g, " ");
        const body = (ai[2] ?? "").trim();
        if (head.startsWith("DD EVIDENCE NEEDED") || head === "DD") {
            const field = body.replace(/^—\s*/, "").trim();
            return {
                id,
                raw: trimmed,
                kind: "dd",
                shortLabel: "DD",
                tooltip: field ? `Due diligence evidence needed: ${field}` : "Due diligence evidence needed"
            };
        }
        if (head === "VERIFY" || head.startsWith("VERIFY")) {
            return {
                id,
                raw: trimmed,
                kind: "verify",
                shortLabel: "Verify",
                tooltip: body ? `Review required — ${body}` : "Human review required"
            };
        }
        if (head === "CITE") {
            const source = body.match(/source=([^;|]+)/i)?.[1]?.trim();
            return {
                id,
                raw: trimmed,
                kind: "cite",
                shortLabel: "Cite",
                tooltip: source ? `Citation needed — source: ${source}` : "Citation / source traceability"
            };
        }
        if (head === "XREF") {
            const to = body.match(/to=([^;|]+)/i)?.[1]?.trim();
            return {
                id,
                raw: trimmed,
                kind: "xref",
                shortLabel: to ? `→ ${to}` : "Xref",
                tooltip: to ? `Cross-reference to ${to}` : "Cross-reference"
            };
        }
        if (head === "LPD") {
            return {
                id,
                raw: trimmed,
                kind: "lpd",
                shortLabel: "LPD",
                tooltip: body || "Latest practicable date / refresh marker"
            };
        }
        if (head === "LOCKED") {
            return {
                id,
                raw: trimmed,
                kind: "locked",
                shortLabel: "Locked",
                tooltip: "Mandatory regulatory text — do not paraphrase"
            };
        }
        if (head === "TODO") {
            return {
                id,
                raw: trimmed,
                kind: "todo",
                shortLabel: "Todo",
                tooltip: body || "Template / data item pending"
            };
        }
        return {
            id,
            raw: trimmed,
            kind: "other",
            shortLabel: head.slice(0, 8),
            tooltip: body || trimmed
        };
    }
    return {
        id,
        raw: trimmed,
        kind: "other",
        shortLabel: "Check",
        tooltip: trimmed
    };
}
const FENCED_CODE_RE = /(```[\s\S]*?```)/g;
const INLINE_CODE_RE = /(`[^`\n]+`)/g;
function transformSegment(text, registry) {
    return text.replace(PLACEHOLDER_RE, (raw)=>{
        const id = registry.length;
        registry.push(parsePlaceholder(raw, id));
        const label = registry[id].shortLabel.replace(/\]/g, "\\]");
        return `\u00A0[${label}](#prospectus-ph-${id})`;
    });
}
function transformPlaceholdersInText(text, registry) {
    return text.split(INLINE_CODE_RE).map((part, i)=>i % 2 === 1 ? part : transformSegment(part, registry)).join("");
}
function preprocessProspectusMarkdown(markdown) {
    const registry = [];
    const parts = markdown.split(FENCED_CODE_RE);
    const text = parts.map((part, i)=>{
        if (i % 2 === 1) return part;
        return transformPlaceholdersInText(part, registry);
    }).join("");
    return {
        text,
        registry
    };
}
function getPlaceholderByHref(registry, href) {
    if (!href?.startsWith("#prospectus-ph-")) return null;
    const id = Number.parseInt(href.slice("#prospectus-ph-".length), 10);
    if (Number.isNaN(id) || id < 0 || id >= registry.length) return null;
    return registry[id] ?? null;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/lib/strip-model-reasoning.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "stillContainsThinking",
    ()=>stillContainsThinking,
    "stripModelReasoning",
    ()=>stripModelReasoning
]);
/** Remove Qwen / model reasoning blocks from draft markdown for display. */ const END_REDACTED = "\u003c/redacted_thinking\u003e";
const END_THINKING = "\u003c/thinking\u003e";
const START_THINK = "\u003cthink";
const THINKING_PROCESS_HEADER_RE = /(?:^|\n)\s*Thinking Process:\s*\n/i;
const ORPHAN_END_TAG_LINE_RE = new RegExp(`^\\s*(?:${END_REDACTED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${END_THINKING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*$`, "gim");
const PROSE_START_PATTERNS = [
    /^#\s+\S/m,
    /^##\s+(?!Verification Notes\b)/im,
    /^###\s+(?!Verification Notes\b)/im,
    /^\d+\s+[A-Za-z]/m,
    /^##\s+\d+\s+\S/m
];
const THINKING_ONLY_PREFIX_RE = new RegExp(`^\\s*(?:Thinking Process:|\\d+\\.\\s+\\*\\*Analyze\\b|${START_THINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
function findFirstProseStart(text) {
    let best = null;
    for (const pattern of PROSE_START_PATTERNS){
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match?.index !== undefined && (best === null || match.index < best)) {
            best = match.index;
        }
    }
    return best;
}
function stillContainsThinking(text) {
    if (!text) return false;
    if (THINKING_PROCESS_HEADER_RE.test(text)) return true;
    if (THINKING_ONLY_PREFIX_RE.test(text)) return true;
    const lower = text.toLowerCase();
    return lower.includes(END_REDACTED.toLowerCase()) || lower.includes(END_THINKING.toLowerCase());
}
function stripModelReasoning(text) {
    if (!text) return "";
    let cleaned = text.replace(/\r\n/g, "\n");
    let lower = cleaned.toLowerCase();
    for (const tag of [
        END_REDACTED,
        END_THINKING
    ]){
        const idx = lower.lastIndexOf(tag.toLowerCase());
        if (idx >= 0) {
            cleaned = cleaned.slice(idx + tag.length);
            lower = cleaned.toLowerCase();
        }
    }
    cleaned = cleaned.replace(ORPHAN_END_TAG_LINE_RE, "");
    const tp = THINKING_PROCESS_HEADER_RE.exec(cleaned);
    if (tp) {
        const after = cleaned.slice(tp.index + tp[0].length);
        const proseAt = findFirstProseStart(after);
        cleaned = proseAt !== null ? after.slice(proseAt) : "";
    } else if (THINKING_ONLY_PREFIX_RE.test(cleaned)) {
        const proseAt = findFirstProseStart(cleaned);
        cleaned = proseAt !== null && proseAt > 0 ? cleaned.slice(proseAt) : "";
    }
    return cleaned.trimStart();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PlaceholderBubble",
    ()=>PlaceholderBubble,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
"use client";
;
;
const KIND_STYLES = {
    verify: {
        bg: "bg-amber-500/12",
        text: "text-amber-800 dark:text-amber-200",
        ring: "ring-amber-500/25"
    },
    cite: {
        bg: "bg-sky-500/12",
        text: "text-sky-800 dark:text-sky-200",
        ring: "ring-sky-500/25"
    },
    xref: {
        bg: "bg-violet-500/12",
        text: "text-violet-800 dark:text-violet-200",
        ring: "ring-violet-500/25"
    },
    lpd: {
        bg: "bg-[var(--foreground)]/6",
        text: "text-[var(--muted)]",
        ring: "ring-[var(--border)]"
    },
    locked: {
        bg: "bg-rose-500/10",
        text: "text-rose-800 dark:text-rose-200",
        ring: "ring-rose-500/20"
    },
    todo: {
        bg: "bg-[var(--foreground)]/5",
        text: "text-[var(--muted)]",
        ring: "ring-dashed ring-[var(--border)]"
    },
    dd: {
        bg: "bg-orange-500/12",
        text: "text-orange-800 dark:text-orange-200",
        ring: "ring-orange-500/25"
    },
    missing: {
        bg: "bg-orange-500/15",
        text: "text-orange-900 dark:text-orange-100",
        ring: "ring-orange-500/30"
    },
    counsel: {
        bg: "bg-fuchsia-500/12",
        text: "text-fuchsia-800 dark:text-fuchsia-200",
        ring: "ring-fuchsia-500/25"
    },
    info_gap: {
        bg: "bg-[var(--warning)]/12",
        text: "text-[var(--warning)]",
        ring: "ring-[var(--warning)]/25"
    },
    other: {
        bg: "bg-[var(--foreground)]/6",
        text: "text-[var(--muted)]",
        ring: "ring-[var(--border)]"
    }
};
function PlaceholderBubble(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(14);
    if ($[0] !== "c2d570e0c2b5dcf4a91392d85cf6d817584f8f7c88bc102f668d17917fd37a06") {
        for(let $i = 0; $i < 14; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "c2d570e0c2b5dcf4a91392d85cf6d817584f8f7c88bc102f668d17917fd37a06";
    }
    const { meta } = t0;
    const style = KIND_STYLES[meta.kind];
    const t1 = `group relative inline-flex max-w-[9rem] align-baseline ml-0.5 ${style.text}`;
    const t2 = `inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-medium leading-tight ring-1 ring-inset whitespace-nowrap ${style.bg} ${style.ring}`;
    let t3;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-70",
            "aria-hidden": true
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx",
            lineNumber: 82,
            columnNumber: 10
        }, this);
        $[1] = t3;
    } else {
        t3 = $[1];
    }
    let t4;
    if ($[2] !== meta.shortLabel) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "truncate",
            children: meta.shortLabel
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx",
            lineNumber: 89,
            columnNumber: 10
        }, this);
        $[2] = meta.shortLabel;
        $[3] = t4;
    } else {
        t4 = $[3];
    }
    let t5;
    if ($[4] !== meta.tooltip || $[5] !== t2 || $[6] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: t2,
            tabIndex: 0,
            role: "note",
            "aria-label": meta.tooltip,
            children: [
                t3,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx",
            lineNumber: 97,
            columnNumber: 10
        }, this);
        $[4] = meta.tooltip;
        $[5] = t2;
        $[6] = t4;
        $[7] = t5;
    } else {
        t5 = $[7];
    }
    let t6;
    if ($[8] !== meta.tooltip) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-normal normal-case leading-snug text-[var(--foreground)] shadow-md group-hover:block group-focus-within:block",
            role: "tooltip",
            children: meta.tooltip
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx",
            lineNumber: 107,
            columnNumber: 10
        }, this);
        $[8] = meta.tooltip;
        $[9] = t6;
    } else {
        t6 = $[9];
    }
    let t7;
    if ($[10] !== t1 || $[11] !== t5 || $[12] !== t6) {
        t7 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: t1,
            children: [
                t5,
                t6
            ]
        }, void 0, true, {
            fileName: "[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx",
            lineNumber: 115,
            columnNumber: 10
        }, this);
        $[10] = t1;
        $[11] = t5;
        $[12] = t6;
        $[13] = t7;
    } else {
        t7 = $[13];
    }
    return t7;
}
_c = PlaceholderBubble;
const __TURBOPACK__default__export__ = PlaceholderBubble;
var _c;
__turbopack_context__.k.register(_c, "PlaceholderBubble");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SectionMarkdown",
    ()=>SectionMarkdown,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/react-markdown/lib/index.js [app-client] (ecmascript) <export Markdown as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$remark$2d$gfm$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/remark-gfm/lib/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$prospectus$2d$placeholders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/prospectus-placeholders.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$strip$2d$model$2d$reasoning$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/strip-model-reasoning.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$PlaceholderBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/components/PlaceholderBubble.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function createComponents(registry) {
    return {
        h1: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "mt-6 mb-3 text-2xl font-bold tracking-tight text-[var(--foreground)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 12,
                columnNumber: 18
            }, this),
        h2: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                className: "mt-6 mb-3 text-xl font-semibold tracking-tight text-[var(--foreground)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 13,
                columnNumber: 18
            }, this),
        h3: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "mt-5 mb-2 text-lg font-semibold text-[var(--foreground)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 14,
                columnNumber: 18
            }, this),
        h4: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                className: "mt-4 mb-2 text-base font-semibold text-[var(--foreground)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 15,
                columnNumber: 18
            }, this),
        h5: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h5", {
                className: "mt-4 mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 16,
                columnNumber: 18
            }, this),
        h6: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h6", {
                className: "mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 17,
                columnNumber: 18
            }, this),
        p: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "my-3 leading-[1.75]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 18,
                columnNumber: 17
            }, this),
        a: ({ href, children, ...rest })=>{
            const meta = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$prospectus$2d$placeholders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPlaceholderByHref"])(registry, href);
            if (meta) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$PlaceholderBubble$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PlaceholderBubble"], {
                    meta: meta
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                    lineNumber: 26,
                    columnNumber: 16
                }, this);
            }
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                className: "text-[var(--accent)] underline underline-offset-2 hover:opacity-80",
                target: "_blank",
                rel: "noreferrer",
                href: href,
                ...rest,
                children: children
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 28,
                columnNumber: 14
            }, this);
        },
        strong: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                className: "font-semibold",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 32,
                columnNumber: 22
            }, this),
        em: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("em", {
                className: "italic",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 33,
                columnNumber: 18
            }, this),
        ul: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "my-3 list-disc space-y-1 pl-6",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 34,
                columnNumber: 18
            }, this),
        ol: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ol", {
                className: "my-3 list-decimal space-y-1 pl-6",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 35,
                columnNumber: 18
            }, this),
        li: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                className: "leading-[1.7]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 36,
                columnNumber: 18
            }, this),
        blockquote: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("blockquote", {
                className: "my-4 border-l-4 border-[var(--border)] bg-[var(--surface)]/60 px-4 py-2 italic text-[var(--muted)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 37,
                columnNumber: 26
            }, this),
        hr: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("hr", {
                className: "my-6 border-[var(--border)]"
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 38,
                columnNumber: 15
            }, this),
        table: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "my-4 overflow-x-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                    className: "w-full border-collapse text-sm",
                    ...props
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                    lineNumber: 40,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 39,
                columnNumber: 21
            }, this),
        thead: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                className: "bg-[var(--surface)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 42,
                columnNumber: 21
            }, this),
        tr: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                className: "border-b border-[var(--border)]",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 43,
                columnNumber: 18
            }, this),
        th: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                className: "border border-[var(--border)] px-3 py-2 text-left font-semibold",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 44,
                columnNumber: 18
            }, this),
        td: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                className: "border border-[var(--border)] px-3 py-2 align-top",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 45,
                columnNumber: 18
            }, this),
        code: ({ className, children, ...rest })=>{
            const isBlock = typeof className === "string" && className.startsWith("language-");
            if (isBlock) {
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                    className: `${className} block rounded-md bg-[var(--surface)] p-3 text-xs leading-relaxed overflow-x-auto`,
                    ...rest,
                    children: children
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                    lineNumber: 53,
                    columnNumber: 16
                }, this);
            }
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("code", {
                className: "rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[0.85em]",
                ...rest,
                children: children
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 57,
                columnNumber: 14
            }, this);
        },
        pre: (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pre", {
                className: "my-4 overflow-x-auto rounded-md bg-[var(--surface)] p-3 text-xs leading-relaxed",
                ...props
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
                lineNumber: 61,
                columnNumber: 19
            }, this)
    };
}
function SectionMarkdown(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(12);
    if ($[0] !== "e0e88e3f9e1605bde389a0a35091281713463600de3a252a856aac7cb0e5cecf") {
        for(let $i = 0; $i < 12; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "e0e88e3f9e1605bde389a0a35091281713463600de3a252a856aac7cb0e5cecf";
    }
    const { children, className: t1 } = t0;
    const className = t1 === undefined ? "" : t1;
    let t2;
    if ($[1] !== children) {
        const cleaned = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$strip$2d$model$2d$reasoning$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stripModelReasoning"])(children);
        t2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$prospectus$2d$placeholders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["preprocessProspectusMarkdown"])(cleaned);
        $[1] = children;
        $[2] = t2;
    } else {
        t2 = $[2];
    }
    const { text, registry } = t2;
    let t3;
    if ($[3] !== registry) {
        t3 = createComponents(registry);
        $[3] = registry;
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    const components = t3;
    let t4;
    if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = [
            __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$remark$2d$gfm$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
        ];
        $[5] = t4;
    } else {
        t4 = $[5];
    }
    let t5;
    if ($[6] !== components || $[7] !== text) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$react$2d$markdown$2f$lib$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__Markdown__as__default$3e$__["default"], {
            remarkPlugins: t4,
            components: components,
            children: text
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
            lineNumber: 108,
            columnNumber: 10
        }, this);
        $[6] = components;
        $[7] = text;
        $[8] = t5;
    } else {
        t5 = $[8];
    }
    let t6;
    if ($[9] !== className || $[10] !== t5) {
        t6 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: className,
            children: t5
        }, void 0, false, {
            fileName: "[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx",
            lineNumber: 117,
            columnNumber: 10
        }, this);
        $[9] = className;
        $[10] = t5;
        $[11] = t6;
    } else {
        t6 = $[11];
    }
    return t6;
}
_c = SectionMarkdown;
const __TURBOPACK__default__export__ = SectionMarkdown;
var _c;
__turbopack_context__.k.register(_c, "SectionMarkdown");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
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
"[project]/modular/platform-module/web/src/lib/section-quality.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeSectionQuality",
    ()=>analyzeSectionQuality,
    "sectionHasContent",
    ()=>sectionHasContent,
    "sectionHasQualityContent",
    ()=>sectionHasQualityContent
]);
/** Quality heuristics for Agent2 section bodies (mirrors section_quality.py). */ const HEADING_RE = /^#{1,6}\s+/;
const PLACEHOLDER_RE = /DATA_MISSING|Information not provided|\[Information not provided/i;
const AI_TAG_RE = /^\[\[AI:/;
const TABLE_ROW_RE = /^\|/;
const TABLE_SEP_RE = /^\|[\s:\-|]+\|$/;
const AI_TAG_INLINE_RE = /\[\[AI:[^\]]*\]\]/g;
const EXEMPT_SECTIONS = new Set([
    "Contents",
    "ExpectedTimetable"
]);
const EVIDENCE_GAP_SECTIONS = new Set([
    "UseOfProceeds",
    "ShareCapital"
]);
const VERIFICATION_NOTES_RE = /\n### Verification Notes\b[\s\S]*/i;
function stripVerificationNotes(markdown) {
    return markdown.replace(VERIFICATION_NOTES_RE, "").trimEnd() + "\n";
}
const MIN_PROSE_LINES = 15;
const MAX_PLACEHOLDER_RATIO = 0.33;
const MAX_EMPTY_H2 = 2;
const MIN_H2_PROSE_CHARS = 80;
const MAX_THIN_H2 = 2;
function isProseLine(line) {
    const s = line.trim();
    if (!s || s === "---") return false;
    if (HEADING_RE.test(s)) return false;
    if (AI_TAG_RE.test(s)) return false;
    if (TABLE_ROW_RE.test(s)) return false;
    return true;
}
function isContentLine(line) {
    const s = line.trim();
    if (!s || s === "---" || s === "***" || s === "**") return false;
    if (TABLE_SEP_RE.test(s)) return false;
    if (HEADING_RE.test(s)) return false;
    if (AI_TAG_RE.test(s)) return false;
    if (TABLE_ROW_RE.test(s)) return true;
    return true;
}
function isPlaceholderDominatedLine(line) {
    if (!PLACEHOLDER_RE.test(line)) return false;
    let remainder = line.replace(AI_TAG_INLINE_RE, "");
    remainder = remainder.replace(/\*\*DATA_MISSING\*\*\.?/gi, "");
    remainder = remainder.replace(/Information not provided|\[Information not provided[^\]]*\]/gi, "");
    return remainder.trim().length < MIN_H2_PROSE_CHARS / 2;
}
function substantiveH2Count(body) {
    return h2Blocks(body).filter(([, chunk])=>{
        const proseInChunk = chunk.filter(isProseLine);
        return proseInChunk.join("").length >= MIN_H2_PROSE_CHARS;
    }).length;
}
function h2Blocks(body) {
    const lines = body.split("\n");
    const blocks = [];
    let i = 0;
    while(i < lines.length){
        const m = lines[i]?.trim().match(/^##\s+(.+)$/);
        if (!m) {
            i++;
            continue;
        }
        const title = m[1]?.trim() ?? "";
        const chunk = [];
        let j = i + 1;
        while(j < lines.length){
            if (/^##\s+/.test(lines[j]?.trim() ?? "")) break;
            chunk.push(lines[j] ?? "");
            j++;
        }
        blocks.push([
            title,
            chunk
        ]);
        i = j > i ? j : i + 1;
    }
    return blocks;
}
function analyzeSectionQuality(body, sectionId) {
    const report = {
        sectionId,
        proseLineCount: 0,
        placeholderRatio: 0,
        emptyH2Count: 0,
        thinH2Count: 0,
        duplicateH1: false,
        failReasons: [],
        gapKind: "none",
        ok: true
    };
    const raw = (body ?? "").trim();
    if (!raw) {
        report.ok = false;
        report.failReasons.push("empty_body");
        report.gapKind = "GENERATION_GAP";
        return report;
    }
    const text = stripVerificationNotes(raw).trim();
    const lines = text.split("\n").filter((l)=>l.trim());
    const proseLines = lines.filter(isProseLine);
    const contentLines = lines.filter(isContentLine);
    const placeholderLines = lines.filter(isPlaceholderDominatedLine);
    report.proseLineCount = proseLines.length;
    report.placeholderRatio = placeholderLines.length / Math.max(lines.length, 1);
    report.duplicateH1 = /^#\s+[A-Z][A-Z0-9\s,&()\-/'"]+$/m.test(text);
    report.emptyH2Count = h2Blocks(text).filter(([, chunk])=>!chunk.some(isProseLine)).length;
    report.thinH2Count = h2Blocks(text).filter(([, chunk])=>{
        const proseInChunk = chunk.filter(isProseLine);
        if (!proseInChunk.length) return false;
        return proseInChunk.join("").length < MIN_H2_PROSE_CHARS;
    }).length;
    if (EXEMPT_SECTIONS.has(sectionId)) return report;
    if (EVIDENCE_GAP_SECTIONS.has(sectionId)) {
        report.gapKind = "EVIDENCE_GAP";
    }
    const substantiveH2 = substantiveH2Count(text);
    const hasEnoughContent = contentLines.length >= MIN_PROSE_LINES || substantiveH2 >= MIN_PROSE_LINES || substantiveH2 >= 6 && contentLines.length >= 10 && report.thinH2Count === 0 && report.emptyH2Count === 0;
    if (!hasEnoughContent) {
        report.failReasons.push(`prose_line_count<${MIN_PROSE_LINES}`);
    }
    if (report.placeholderRatio > MAX_PLACEHOLDER_RATIO) {
        report.failReasons.push(`placeholder_ratio>${MAX_PLACEHOLDER_RATIO}`);
    }
    if (report.emptyH2Count >= MAX_EMPTY_H2) {
        report.failReasons.push(`empty_h2_count>=${MAX_EMPTY_H2}`);
    }
    if (report.thinH2Count >= MAX_THIN_H2) {
        report.failReasons.push(`thin_h2_count>=${MAX_THIN_H2}`);
    }
    if (report.failReasons.length > 0) {
        report.ok = false;
        if (report.gapKind === "none") report.gapKind = "GENERATION_GAP";
    }
    return report;
}
function sectionHasContent(body) {
    return !!body?.trim();
}
function sectionHasQualityContent(body, sectionId) {
    if (!body?.trim()) return false;
    if (EXEMPT_SECTIONS.has(sectionId)) return true;
    return analyzeSectionQuality(body, sectionId).ok;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/lib/draft-sections.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SECTION_NAMES",
    ()=>SECTION_NAMES,
    "SECTION_ORDER",
    ()=>SECTION_ORDER,
    "cleanDraftMarkdown",
    ()=>cleanDraftMarkdown,
    "countGeneratedSections",
    ()=>countGeneratedSections,
    "getLastGeneratedIndex",
    ()=>getLastGeneratedIndex,
    "getMissingSectionIds",
    ()=>getMissingSectionIds,
    "parseDraftSections",
    ()=>parseDraftSections,
    "rebuildDraftMarkdown",
    ()=>rebuildDraftMarkdown,
    "sectionHasContent",
    ()=>sectionHasContent,
    "sectionIsComplete",
    ()=>sectionIsComplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$strip$2d$model$2d$reasoning$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/strip-model-reasoning.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$section$2d$quality$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/section-quality.ts [app-client] (ecmascript)");
;
;
const SECTION_ORDER = [
    "ExpectedTimetable",
    "Contents",
    "Summary",
    "Definitions",
    "Glossary",
    "ForwardLooking",
    "RiskFactors",
    "Waivers",
    "InfoProspectus",
    "DirectorsParties",
    "CorporateInfo",
    "Regulation",
    "IndustryOverview",
    "HistoryReorg",
    "Business",
    "ContractualArrangements",
    "ControllingShareholders",
    "ConnectedTransactions",
    "DirectorsSeniorMgmt",
    "SubstantialShareholders",
    "ShareCapital",
    "FinancialInfo",
    "UseOfProceeds",
    "Underwriting",
    "GlobalOfferingStructure"
];
const SECTION_NAMES = {
    ExpectedTimetable: "Expected Timetable",
    Contents: "Contents",
    Summary: "Summary",
    Definitions: "Definitions",
    Glossary: "Glossary of Technical Terms",
    ForwardLooking: "Forward-Looking Statements",
    RiskFactors: "Risk Factors",
    Waivers: "Waivers from Strict Compliance with Listing Rules",
    InfoProspectus: "Information about this Prospectus and the Global Offering",
    DirectorsParties: "Directors and Parties Involved",
    CorporateInfo: "Corporate Information",
    Regulation: "Regulation (Regulatory Overview)",
    IndustryOverview: "Industry Overview",
    HistoryReorg: "History, Reorganization, and Corporate Structure",
    Business: "Business",
    ContractualArrangements: "Contractual Arrangements (VIE)",
    ControllingShareholders: "Relationship with Controlling Shareholders",
    ConnectedTransactions: "Connected Transactions",
    DirectorsSeniorMgmt: "Directors and Senior Management",
    SubstantialShareholders: "Substantial Shareholders",
    ShareCapital: "Share Capital",
    FinancialInfo: "Financial Information",
    UseOfProceeds: "Future Plans and Use of Proceeds",
    Underwriting: "Underwriting",
    GlobalOfferingStructure: "Structure of the Global Offering"
};
function matchSectionId(firstLine) {
    for (const sid of SECTION_ORDER){
        const name = SECTION_NAMES[sid];
        if (firstLine === name || firstLine.startsWith(name) || firstLine.includes(sid) || firstLine === `Section ${sid}: ${name}`) {
            return sid;
        }
    }
    return null;
}
/** Split combined draft on top-level section headers only (not numbered ## subsections). */ const TOP_LEVEL_SECTION_SPLIT = /\n(?=## Section )/;
function parseTopLevelSectionBlock(block) {
    const trimmed = block.trim();
    if (!trimmed.startsWith("## Section ")) return null;
    const lines = trimmed.split("\n");
    const firstLine = lines[0]?.replace(/^##\s+/, "").trim() ?? "";
    const content = lines.slice(1).join("\n").trim();
    return {
        firstLine,
        content
    };
}
function parseDraftSections(md, options) {
    const stripThinking = options?.stripThinking !== false;
    const sections = {};
    if (!md || md.includes("(Your generated prospectus will appear here.")) {
        return sections;
    }
    const blocks = md.split(TOP_LEVEL_SECTION_SPLIT);
    for (const block of blocks){
        const parsed = parseTopLevelSectionBlock(block);
        if (!parsed) continue;
        const sid = matchSectionId(parsed.firstLine);
        if (sid) {
            sections[sid] = stripThinking ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$strip$2d$model$2d$reasoning$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["stripModelReasoning"])(parsed.content) : parsed.content;
        }
    }
    return sections;
}
function sectionHasContent(body) {
    return !!body?.trim();
}
function sectionIsComplete(body, sectionId) {
    if (!sectionHasContent(body)) return false;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$section$2d$quality$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sectionHasQualityContent"])(body, sectionId);
}
function getMissingSectionIds(sections) {
    return SECTION_ORDER.filter((sid)=>!sectionIsComplete(sections[sid], sid));
}
function countGeneratedSections(sections) {
    return SECTION_ORDER.filter((sid)=>sectionIsComplete(sections[sid], sid)).length;
}
function getLastGeneratedIndex(sections) {
    let lastIndex = -1;
    for(let i = 0; i < SECTION_ORDER.length; i++){
        if (sectionIsComplete(sections[SECTION_ORDER[i]], SECTION_ORDER[i])) lastIndex = i;
    }
    return lastIndex;
}
function rebuildDraftMarkdown(sections, header = "# Prospectus Draft (Generated by Agent2)") {
    const parts = [
        header,
        ""
    ];
    for (const sid of SECTION_ORDER){
        const body = sections[sid];
        if (body === undefined) continue;
        const name = SECTION_NAMES[sid];
        parts.push(`## Section ${sid}: ${name}`, "", body, "");
    }
    return parts.join("\n").trimEnd() + "\n";
}
function cleanDraftMarkdown(md) {
    const sections = parseDraftSections(md, {
        stripThinking: true
    });
    if (Object.keys(sections).length === 0) return md;
    const header = md.split(TOP_LEVEL_SECTION_SPLIT)[0]?.trim() || "# Prospectus Draft (Generated by Agent2)";
    return rebuildDraftMarkdown(sections, header);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/modular/platform-module/web/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$SectionMarkdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/components/SectionMarkdown.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/components/AppBackendStatus.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/modular/platform-module/web/src/lib/draft-sections.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
// Prospectus AI — main drafting workspace (data prep + chapter coverage + draft)
"use client";
;
;
;
;
const PHASE_LABELS = {
    retriever: "Retrieving evidence",
    planner: "Planning outline",
    writer: "Writing draft",
    verifier: "Verifying draft",
    revision: "Revising draft",
    assembler: "Saving section",
    template: "Rendering template"
};
function createEmptyStreamState(sectionId) {
    return {
        sectionId,
        activePhase: null
    };
}
function normalizeStreamEvent(ev) {
    if (ev.type !== "section_start") return ev;
    return {
        type: "phase_start",
        section_id: ev.section_id,
        phase: ev.phase,
        revision_pass: ev.phase === "writer" ? 0 : 1
    };
}
function applyStreamEvent(prev, raw) {
    const ev = normalizeStreamEvent(raw);
    if (ev.type === "section_done") {
        return null;
    }
    if (ev.type === "phase_start") {
        return {
            sectionId: ev.section_id,
            activePhase: ev.phase
        };
    }
    if (ev.type === "phase_end") {
        if (!prev || prev.sectionId !== ev.section_id) return prev;
        return prev;
    }
    if (ev.type === "token") {
        return prev;
    }
    return prev;
}
async function consumeAgent2Stream(res, onEvent) {
    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const data = await res.json();
            if (data.error) message = data.error;
        } catch  {
            try {
                message = (await res.text()).slice(0, 500) || message;
            } catch  {
            /* ignore */ }
        }
        throw new Error(message);
    }
    if (!res.body) throw new Error("No response body");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while(true){
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
            stream: true
        });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts){
            for (const line of part.split("\n")){
                if (!line.startsWith("data: ")) continue;
                try {
                    onEvent(JSON.parse(line.slice(6)));
                } catch  {
                /* ignore malformed chunk */ }
            }
        }
    }
}
function formatBytes(bytes) {
    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];
    let i = 0;
    let v = bytes;
    while(v >= 1024 && i < units.length - 1){
        v /= 1024;
        i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
const STEPS = [
    {
        id: 1,
        label: "Upload",
        short: "Upload"
    },
    {
        id: 2,
        label: "Prepare data",
        short: "Prepare"
    },
    {
        id: 3,
        label: "Draft sections",
        short: "Draft"
    },
    {
        id: 4,
        label: "Export",
        short: "Export"
    }
];
function Page() {
    _s();
    const [files, setFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [results, setResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [running, setRunning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [generating, setGenerating] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [exporting, setExporting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [uploading, setUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [generatingSectionIndex, setGeneratingSectionIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [modificationInput, setModificationInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [modifyingSectionId, setModifyingSectionId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [agent2Status, setAgent2Status] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [expandedSectionId, setExpandedSectionId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [sectionStream, setSectionStream] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [draftMd, setDraftMd] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
    const fileInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const fetchFiles = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Page.useCallback[fetchFiles]": async ()=>{
            try {
                const res = await fetch("/api/agent1/files");
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setFiles(Array.isArray(data.items) ? data.items : []);
            } catch  {
                setFiles([]);
            }
        }
    }["Page.useCallback[fetchFiles]"], []);
    const fetchResults = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Page.useCallback[fetchResults]": async ()=>{
            try {
                const res_0 = await fetch("/api/agent1/results");
                if (res_0.status === 404) {
                    setResults(null);
                    return;
                }
                if (!res_0.ok) throw new Error(await res_0.text());
                const data_0 = await res_0.json();
                setResults(data_0);
            } catch  {
                setResults(null);
            }
        }
    }["Page.useCallback[fetchResults]"], []);
    const fetchDraft = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Page.useCallback[fetchDraft]": async ()=>{
            try {
                const res_1 = await fetch("/api/agent2/draft");
                if (res_1.ok) {
                    const data_1 = await res_1.json();
                    setDraftMd(data_1.markdown ?? `# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
                }
            } catch  {
            // keep current draft
            }
        }
    }["Page.useCallback[fetchDraft]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            fetchFiles();
            fetchResults();
        }
    }["Page.useEffect"], [
        fetchFiles,
        fetchResults
    ]);
    const fetchAgent2Status = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Page.useCallback[fetchAgent2Status]": async ()=>{
            try {
                const res_2 = await fetch("/api/agent2/status");
                const data_2 = await res_2.json();
                setAgent2Status(data_2);
            } catch  {
                setAgent2Status({
                    ok: false,
                    hint: "Could not verify generation setup."
                });
            }
        }
    }["Page.useCallback[fetchAgent2Status]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            const m = results?.manifest ?? results?.classification;
            if (m && !generating) fetchAgent2Status();
        }
    }["Page.useEffect"], [
        results,
        generating,
        fetchAgent2Status
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            const m_0 = results?.manifest ?? results?.classification;
            if (m_0 && !generating) fetchDraft();
        }
    }["Page.useEffect"], [
        results,
        generating,
        fetchDraft
    ]);
    const parsedSections = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Page.useMemo[parsedSections]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseDraftSections"])(draftMd)
    }["Page.useMemo[parsedSections]"], [
        draftMd
    ]);
    const missingSectionIds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Page.useMemo[missingSectionIds]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingSectionIds"])(parsedSections)
    }["Page.useMemo[missingSectionIds]"], [
        parsedSections
    ]);
    const generatedCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Page.useMemo[generatedCount]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["countGeneratedSections"])(parsedSections)
    }["Page.useMemo[generatedCount]"], [
        parsedSections
    ]);
    const lastGeneratedIndex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Page.useMemo[lastGeneratedIndex]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getLastGeneratedIndex"])(parsedSections)
    }["Page.useMemo[lastGeneratedIndex]"], [
        parsedSections
    ]);
    async function handleUpload(filesToUpload) {
        const arr = Array.from(filesToUpload).filter((f)=>f.size > 0);
        if (!arr.length) return;
        const fd = new FormData();
        arr.forEach((f_0)=>fd.append("files", f_0, f_0.name));
        setUploading(true);
        setError(null);
        try {
            const res_3 = await fetch("/api/agent1/upload", {
                method: "POST",
                body: fd
            });
            const data_3 = await res_3.json();
            if (!res_3.ok) throw new Error(data_3.error || `HTTP ${res_3.status}`);
            if (data_3.errors?.length) setError(data_3.errors.join("\n"));
            await fetchFiles();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally{
            setUploading(false);
        }
    }
    async function handleRunAgent1() {
        setRunning(true);
        setError(null);
        try {
            const res_4 = await fetch("/api/agent1/run", {
                method: "POST"
            });
            const data_4 = await res_4.json();
            if (!res_4.ok || !data_4.ok) throw new Error(data_4.error || `HTTP ${res_4.status}`);
            await fetchResults();
            await fetchFiles();
        } catch (e_0) {
            setError(e_0 instanceof Error ? e_0.message : "Run failed");
        } finally{
            setRunning(false);
        }
    }
    async function runSectionApi(sectionId, modification) {
        setSectionStream(createEmptyStreamState(sectionId));
        setExpandedSectionId(sectionId);
        const res_5 = await fetch("/api/agent2/run", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                section: sectionId,
                modification_instructions: modification || undefined
            })
        });
        let streamError = null;
        await consumeAgent2Stream(res_5, (ev)=>{
            if (ev.type === "section_done") {
                void fetchDraft();
                setSectionStream(null);
            } else if (ev.type === "error") {
                streamError = ev.message;
            } else {
                setSectionStream((prev)=>applyStreamEvent(prev, ev));
                if (ev.type === "phase_start" || ev.type === "section_start") {
                    setExpandedSectionId(ev.section_id);
                    const idx = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].indexOf(ev.section_id);
                    if (idx >= 0) setGeneratingSectionIndex(idx);
                }
            }
        });
        if (streamError) throw new Error(streamError);
        await fetchDraft();
        setSectionStream(null);
        return true;
    }
    async function generateSection(sectionId_0, modification_0) {
        setGenerating(true);
        setError(null);
        try {
            await runSectionApi(sectionId_0, modification_0);
        } catch (e_1) {
            setError(e_1 instanceof Error ? e_1.message : "Generation failed");
        } finally{
            setGenerating(false);
            setGeneratingSectionIndex(-1);
        }
    }
    async function handleGenerateAllSequential() {
        setGenerating(true);
        setError(null);
        const remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingSectionIds"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseDraftSections"])(draftMd));
        if (remaining.length === 0) {
            setGenerating(false);
            return;
        }
        const firstIdx = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].indexOf(remaining[0]);
        setGeneratingSectionIndex(firstIdx >= 0 ? firstIdx : 0);
        setSectionStream(null);
        try {
            const res_6 = await fetch("/api/agent2/run", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sections: remaining
                })
            });
            let streamError_0 = null;
            await consumeAgent2Stream(res_6, (ev_0)=>{
                if (ev_0.type === "section_done") {
                    void fetchDraft();
                    setSectionStream(null);
                } else if (ev_0.type === "error") {
                    streamError_0 = ev_0.message;
                } else {
                    setSectionStream((prev_0)=>applyStreamEvent(prev_0, ev_0));
                    if (ev_0.type === "phase_start" || ev_0.type === "section_start") {
                        setExpandedSectionId(ev_0.section_id);
                        const idx_0 = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].indexOf(ev_0.section_id);
                        if (idx_0 >= 0) setGeneratingSectionIndex(idx_0);
                    }
                }
            });
            if (streamError_0) throw new Error(streamError_0);
            await fetchDraft();
        } catch (e_2) {
            setError(e_2 instanceof Error ? e_2.message : "Generation failed");
        } finally{
            setSectionStream(null);
            setGenerating(false);
            setGeneratingSectionIndex(-1);
        }
    }
    function handleGenerateNext() {
        const missing = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMissingSectionIds"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseDraftSections"])(draftMd));
        if (missing.length === 0) return;
        void generateSection(missing[0]);
    }
    function handleModifySection(sectionId_1) {
        setModifyingSectionId(sectionId_1);
    }
    async function handleModifyAndRegenerate() {
        if (!modifyingSectionId) return;
        await generateSection(modifyingSectionId, modificationInput);
        setModificationInput("");
        setModifyingSectionId(null);
    }
    async function handleClearAll() {
        if (generating) return;
        try {
            const res_7 = await fetch("/api/agent2/clear", {
                method: "POST"
            });
            const data_5 = await res_7.json();
            if (!res_7.ok || !data_5.ok) throw new Error(data_5.error || `HTTP ${res_7.status}`);
            setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
        } catch (e_3) {
            setError(e_3 instanceof Error ? e_3.message : "Clear failed");
        }
    }
    async function handleClearData() {
        if (uploading || running || generating) return;
        if (!confirm("Remove all uploaded files and outputs? You can then upload completely new documents.")) return;
        setError(null);
        try {
            const [dataRes, resetRes] = await Promise.all([
                fetch("/api/agent1/clear-data", {
                    method: "POST"
                }),
                fetch("/api/reset", {
                    method: "POST"
                })
            ]);
            const dataJson = await dataRes.json();
            const resetJson = await resetRes.json();
            if (!dataRes.ok || !dataJson.ok) throw new Error(dataJson.error || "Clear data failed");
            if (!resetRes.ok || !resetJson.ok) throw new Error(resetJson.error || "Reset failed");
            setResults(null);
            setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
            await fetchFiles();
            await fetchResults();
            await fetchDraft();
        } catch (e_4) {
            setError(e_4 instanceof Error ? e_4.message : "Clear failed");
        }
    }
    async function handleStartOver() {
        if (generating || running) return;
        if (!confirm("Clear all processed data and the draft? You will need to prepare your files again.")) return;
        setError(null);
        try {
            const res_8 = await fetch("/api/reset", {
                method: "POST"
            });
            const data_6 = await res_8.json();
            if (!res_8.ok || !data_6.ok) throw new Error(data_6.error || `HTTP ${res_8.status}`);
            setResults(null);
            setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
            await fetchFiles();
            await fetchResults();
            await fetchDraft();
        } catch (e_5) {
            setError(e_5 instanceof Error ? e_5.message : "Reset failed");
        }
    }
    async function handleExportDocx() {
        setExporting(true);
        setError(null);
        try {
            const res_9 = await fetch("/api/agent2/export/docx");
            if (!res_9.ok) {
                const data_7 = await res_9.json();
                throw new Error(data_7.error || `HTTP ${res_9.status}`);
            }
            const blob = await res_9.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `prospectus-draft-${new Date().toISOString().slice(0, 10)}.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e_6) {
            setError(e_6 instanceof Error ? e_6.message : "Export failed");
        } finally{
            setExporting(false);
        }
    }
    const manifest = results?.manifest ?? results?.classification;
    const sourceFiles = results?.manifest?.source_files;
    const qualityFlags = results?.manifest?.data_quality_flags ?? results?.classification?.data_quality_flags ?? [];
    const hasDraft = draftMd && draftMd.includes("## ") && !draftMd.includes("(Your generated prospectus will appear here.)");
    const allSectionsDone = hasDraft && missingSectionIds.length === 0;
    const hasGapSections = missingSectionIds.length > 0 && lastGeneratedIndex >= 0 && __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].indexOf(missingSectionIds[0]) < lastGeneratedIndex;
    const currentStep = !files.length ? 1 : !manifest ? 2 : allSectionsDone ? 4 : 3;
    const generateAllLabel = generatedCount === 0 ? "Generate all" : `Remaining (${missingSectionIds.length})`;
    const nextMissingSectionId = missingSectionIds[0];
    const nextMissingLabel = nextMissingSectionId ? `Next missing: ${__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_NAMES"][nextMissingSectionId]}` : "Next missing";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-[var(--background)] text-[var(--foreground)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] shadow-sm",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mx-auto max-w-[1800px] px-4 py-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between mb-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                            className: "text-lg font-bold text-[var(--foreground)]",
                                            children: "Prospectus AI"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 564,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[var(--muted)] mt-0.5",
                                            children: "From your files to prospectus sections — draft, refine, export"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 567,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$AppBackendStatus$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AppBackendStatus"], {}, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 571,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "/kg-view",
                                                    className: "text-[var(--accent)] hover:underline",
                                                    children: "Knowledge Graph web view"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 572,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                    href: "/settings",
                                                    className: "text-[var(--accent)] hover:underline",
                                                    children: "Model & inference settings"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 575,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 570,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 563,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        (manifest || hasDraft) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleStartOver,
                                            disabled: generating || running,
                                            className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-50",
                                            title: "Clear processed data and draft, start from upload",
                                            children: "Start over"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 581,
                                            columnNumber: 42
                                        }, this),
                                        hasDraft && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col gap-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleExportDocx,
                                                    disabled: exporting,
                                                    className: "flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors",
                                                    children: exporting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                                            }, void 0, false, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 587,
                                                                columnNumber: 23
                                                            }, this),
                                                            "Exporting… (may take 10–30s)"
                                                        ]
                                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                className: "w-4 h-4",
                                                                fill: "none",
                                                                stroke: "currentColor",
                                                                viewBox: "0 0 24 24",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                    strokeLinecap: "round",
                                                                    strokeLinejoin: "round",
                                                                    strokeWidth: 2,
                                                                    d: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 591,
                                                                    columnNumber: 25
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 590,
                                                                columnNumber: 23
                                                            }, this),
                                                            "Export to Word"
                                                        ]
                                                    }, void 0, true)
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 585,
                                                    columnNumber: 17
                                                }, this),
                                                exporting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-[var(--muted)]",
                                                    children: "Building your Word document…"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 596,
                                                    columnNumber: 31
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 584,
                                            columnNumber: 28
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 580,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                            lineNumber: 562,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-2",
                            children: STEPS.map((s, i)=>{
                                const done = currentStep > s.id || s.id === 3 && manifest;
                                const active = currentStep === s.id;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${active ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium" : ""} ${done && !active ? "text-[var(--success)]" : ""}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${done ? "bg-[var(--success)] text-white" : active ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--muted)]"}`,
                                                    children: done ? "✓" : s.id
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 606,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "hidden sm:inline",
                                                    children: s.label
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 609,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 605,
                                            columnNumber: 19
                                        }, this),
                                        i < STEPS.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "h-px w-4 bg-[var(--border)]"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 611,
                                            columnNumber: 44
                                        }, this)
                                    ]
                                }, s.id, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 604,
                                    columnNumber: 20
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                            lineNumber: 600,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                    lineNumber: 561,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                lineNumber: 560,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto max-w-[1800px] px-4 pt-3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-lg border border-[var(--error)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                    lineNumber: 619,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                lineNumber: 618,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto max-w-[1800px] flex h-[calc(100vh-140px)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 overflow-auto",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-sm font-semibold text-[var(--foreground)]",
                                children: "Your files"
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 627,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-[var(--muted)] mt-1",
                                children: "Excel workbooks or structured JSON"
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 628,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-4 flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        ref: fileInputRef,
                                        type: "file",
                                        multiple: true,
                                        accept: ".xlsx,.json",
                                        className: "hidden",
                                        onChange: (e_7)=>{
                                            if (e_7.target.files?.length) handleUpload(e_7.target.files);
                                            e_7.currentTarget.value = "";
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                        lineNumber: 630,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>fileInputRef.current?.click(),
                                        disabled: uploading,
                                        className: "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-50 transition-colors",
                                        children: uploading ? "Uploading…" : "Upload .xlsx / .json"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                        lineNumber: 634,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: fetchFiles,
                                        className: "rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)]",
                                        children: "Refresh"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                        lineNumber: 637,
                                        columnNumber: 13
                                    }, this),
                                    files.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleClearData,
                                        disabled: uploading || running || generating,
                                        className: "rounded-lg border border-[var(--error)]/40 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50",
                                        title: "Remove all uploaded files, upload new documents",
                                        children: "Remove all"
                                    }, void 0, false, {
                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                        lineNumber: 640,
                                        columnNumber: 34
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 629,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-4",
                                children: files.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-lg border-2 border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]",
                                    children: "No .xlsx or .json files yet"
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 645,
                                    columnNumber: 35
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "space-y-2 rounded-lg border border-[var(--border)] p-3",
                                    children: files.map((f_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            className: "flex justify-between text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "truncate font-medium",
                                                    children: f_1.name
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 649,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "shrink-0 ml-2 text-[var(--muted)]",
                                                    children: formatBytes(f_1.size)
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 650,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, f_1.name, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 648,
                                            columnNumber: 35
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 647,
                                    columnNumber: 24
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 644,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                        lineNumber: 626,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-1 flex flex-col overflow-auto min-w-0",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-1 overflow-auto p-6 space-y-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                    className: "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-base font-semibold mb-1",
                                            children: "Step 1: Prepare your data"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 660,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[var(--muted)] mb-4",
                                            children: "We read your spreadsheets or JSON and organize them for each prospectus chapter. Large Excel files may take several minutes."
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 661,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleRunAgent1,
                                            disabled: running || files.length === 0,
                                            className: "rounded-lg bg-[var(--foreground)] text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity",
                                            children: running ? "Working…" : "Prepare data"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 664,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 659,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                                    className: "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-base font-semibold mb-1",
                                            children: "Step 2: Status"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 670,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[var(--muted)] mb-4",
                                            children: "Confirms your files are processed and you can move on to drafting."
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 671,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: fetchResults,
                                            className: "text-xs rounded-lg border border-[var(--border)] px-2 py-1 hover:bg-[var(--background)] mb-4",
                                            children: "Refresh"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 674,
                                            columnNumber: 15
                                        }, this),
                                        !manifest ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-lg border-2 border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)] text-center",
                                            children: "No results yet. Use Step 1 after uploading files."
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 677,
                                            columnNumber: 28
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-6",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "rounded-lg border border-[var(--success)]/40 bg-[var(--success-bg)] p-4",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-[var(--success)] font-medium",
                                                            children: "Ready to draft"
                                                        }, void 0, false, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 681,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm text-[var(--muted)] mt-2 leading-relaxed",
                                                            children: "Generate and edit your prospectus in the panel on the right."
                                                        }, void 0, false, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 684,
                                                            columnNumber: 21
                                                        }, this),
                                                        Array.isArray(sourceFiles) && sourceFiles.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-[var(--muted)] mt-3",
                                                            children: [
                                                                sourceFiles.length,
                                                                " file",
                                                                sourceFiles.length === 1 ? "" : "s",
                                                                " from your upload"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 687,
                                                            columnNumber: 78
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 680,
                                                    columnNumber: 19
                                                }, this),
                                                qualityFlags.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "mb-2 text-xs font-semibold text-[var(--muted)]",
                                                            children: "Data quality"
                                                        }, void 0, false, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 693,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                            className: "space-y-2",
                                                            children: qualityFlags.map((f_2, i_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                                    className: "rounded-lg border border-[var(--border)] p-3 text-sm",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: `font-medium ${f_2.severity === "high" ? "text-[var(--error)]" : f_2.severity === "medium" ? "text-[var(--warning)]" : "text-[var(--muted)]"}`,
                                                                            children: [
                                                                                f_2.severity,
                                                                                ":"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                            lineNumber: 696,
                                                                            columnNumber: 29
                                                                        }, this),
                                                                        " ",
                                                                        f_2.issue,
                                                                        f_2.suggested_fix && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "mt-1 text-xs text-[var(--muted)]",
                                                                            children: [
                                                                                "Suggestion: ",
                                                                                f_2.suggested_fix
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                            lineNumber: 700,
                                                                            columnNumber: 51
                                                                        }, this)
                                                                    ]
                                                                }, i_0, true, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 695,
                                                                    columnNumber: 57
                                                                }, this))
                                                        }, void 0, false, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 694,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 692,
                                                    columnNumber: 47
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 679,
                                            columnNumber: 26
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 669,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                            lineNumber: 658,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                        lineNumber: 657,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                        className: "w-[520px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "shrink-0 px-5 py-4 border-b border-[var(--border)]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-start",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                    className: "text-base font-semibold text-[var(--foreground)]",
                                                    children: "Prospectus draft"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 714,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-[var(--muted)] mt-0.5",
                                                    children: "25 sections in prospectus order · click to expand"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 715,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 713,
                                            columnNumber: 15
                                        }, this),
                                        (generatedCount > 0 || hasDraft) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleClearAll,
                                            disabled: generating,
                                            className: "text-sm rounded-lg border border-[var(--error)]/40 px-3 py-1.5 text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50 transition-colors",
                                            children: "Clear all"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 719,
                                            columnNumber: 52
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 712,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 711,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 overflow-auto px-4 py-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].map((sectionId_2, index)=>{
                                        const name = __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_NAMES"][sectionId_2];
                                        const savedContent = parsedSections[sectionId_2];
                                        const isStreaming = generating && sectionStream?.sectionId === sectionId_2;
                                        const stream = isStreaming ? sectionStream : null;
                                        const hasContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sectionHasContent"])(savedContent);
                                        const isComplete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sectionIsComplete"])(savedContent, sectionId_2);
                                        const showFinalContent = isComplete && !isStreaming;
                                        const isGenerated = showFinalContent;
                                        const isInProgress = isStreaming;
                                        const isMissingGap = !isGenerated && !isInProgress && hasContent && lastGeneratedIndex >= 0 && index < lastGeneratedIndex;
                                        const isThinDraft = !isGenerated && !isInProgress && hasContent && !isMissingGap;
                                        const isModifying = modifyingSectionId === sectionId_2;
                                        const isExpanded = expandedSectionId === sectionId_2;
                                        const phaseLabel = stream?.activePhase && PHASE_LABELS[stream.activePhase] ? PHASE_LABELS[stream.activePhase] : "Generating";
                                        const previewRaw = isComplete ? savedContent.replace(/^#{1,6}\s+/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1").replace(/\[\[AI:[^\]]*\]\]/g, "").replace(/\s+/g, " ").trim() : "";
                                        const preview = previewRaw ? previewRaw.slice(0, 120) + (previewRaw.length > 120 ? "…" : "") : null;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `rounded-xl border transition-colors ${isInProgress ? "border-[var(--accent)]/50 bg-[var(--accent)]/5" : isGenerated ? "border-[var(--success)]/30 bg-[var(--success-bg)]/30" : "border-dashed border-[var(--border)] bg-[var(--background)]/30"}`,
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: `flex items-start gap-3 px-4 py-3 select-none ${isGenerated || isInProgress ? "cursor-pointer" : "cursor-default"}`,
                                                    onClick: ()=>!isModifying && !isInProgress && isGenerated && setExpandedSectionId((id)=>id === sectionId_2 ? null : sectionId_2),
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)]/8 text-xs font-semibold text-[var(--foreground)]",
                                                            children: index + 1
                                                        }, void 0, false, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 745,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "min-w-0 flex-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-sm font-medium text-[var(--foreground)] leading-snug",
                                                                    children: name
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 749,
                                                                    columnNumber: 25
                                                                }, this),
                                                                !isGenerated && !isInProgress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: `text-xs mt-0.5 italic ${isMissingGap ? "text-[var(--warning)]" : isThinDraft ? "text-[var(--accent)]" : "text-[var(--muted)]"}`,
                                                                    children: isMissingGap ? "Missing — not generated" : isThinDraft ? "Thin draft — regenerate recommended" : "Pending"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 750,
                                                                    columnNumber: 59
                                                                }, this),
                                                                isInProgress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-[var(--accent)] mt-0.5",
                                                                    children: [
                                                                        phaseLabel,
                                                                        "…"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 753,
                                                                    columnNumber: 42
                                                                }, this),
                                                                isGenerated && !isExpanded && preview && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "text-xs text-[var(--muted)] mt-1 line-clamp-2",
                                                                    children: preview
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 756,
                                                                    columnNumber: 67
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 748,
                                                            columnNumber: 23
                                                        }, this),
                                                        isGenerated && !isModifying && !isInProgress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex shrink-0 gap-2",
                                                            onClick: (e_8)=>e_8.stopPropagation(),
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>handleModifySection(sectionId_2),
                                                                    className: "text-xs rounded-lg border border-[var(--border)] px-2.5 py-1.5 hover:bg-[var(--background)] transition-colors",
                                                                    children: "Modify"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 759,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-[var(--muted)] self-center",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                                        className: `w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`,
                                                                        fill: "none",
                                                                        stroke: "currentColor",
                                                                        viewBox: "0 0 24 24",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                                            strokeLinecap: "round",
                                                                            strokeLinejoin: "round",
                                                                            strokeWidth: 2,
                                                                            d: "M19 9l-7 7-7-7"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                            lineNumber: 764,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                        lineNumber: 763,
                                                                        columnNumber: 29
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                    lineNumber: 762,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                            lineNumber: 758,
                                                            columnNumber: 72
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 744,
                                                    columnNumber: 21
                                                }, this),
                                                isExpanded && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "px-4 pb-4 pt-0 border-t border-[var(--border)]/50 mt-0",
                                                    children: isModifying ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "pt-4 space-y-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                                                value: modificationInput,
                                                                onChange: (e_9)=>setModificationInput(e_9.target.value),
                                                                placeholder: "Modification instructions…",
                                                                className: "w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                                                            }, void 0, false, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 771,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: handleModifyAndRegenerate,
                                                                        disabled: generating || !modificationInput.trim(),
                                                                        className: "rounded-lg bg-[var(--foreground)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50",
                                                                        children: generating ? "Regenerating…" : "Regenerate"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                        lineNumber: 773,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>{
                                                                            setModifyingSectionId(null);
                                                                            setModificationInput("");
                                                                        },
                                                                        className: "rounded-lg border border-[var(--border)] px-4 py-2 text-sm",
                                                                        children: "Cancel"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                        lineNumber: 776,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 772,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                        lineNumber: 770,
                                                        columnNumber: 40
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "pt-4 space-y-4",
                                                        children: [
                                                            isInProgress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-[var(--muted)] italic",
                                                                children: [
                                                                    phaseLabel,
                                                                    "… Final text will appear when this section is saved."
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 784,
                                                                columnNumber: 46
                                                            }, this),
                                                            showFinalContent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$components$2f$SectionMarkdown$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SectionMarkdown"], {
                                                                className: "text-[15px] leading-[1.7] text-[var(--foreground)] break-words",
                                                                children: savedContent
                                                            }, void 0, false, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 787,
                                                                columnNumber: 50
                                                            }, this),
                                                            !showFinalContent && !isInProgress && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-[var(--muted)] italic",
                                                                children: "No content yet."
                                                            }, void 0, false, {
                                                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                                lineNumber: 790,
                                                                columnNumber: 68
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                        lineNumber: 783,
                                                        columnNumber: 36
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 769,
                                                    columnNumber: 36
                                                }, this)
                                            ]
                                        }, sectionId_2, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 743,
                                            columnNumber: 22
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 725,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 724,
                                columnNumber: 11
                            }, this),
                            manifest && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-4 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 shrink-0",
                                children: generating ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[var(--accent)] font-medium",
                                            children: generatingSectionIndex >= 0 ? `Generating section ${generatingSectionIndex + 1} of ${__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].length}…` : "Generating…"
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 800,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-[var(--muted)]",
                                            children: "Only the final verified section appears when each step completes."
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 803,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 799,
                                    columnNumber: 29
                                }, this) : allSectionsDone ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-[var(--foreground)]",
                                    children: "All sections done. Use Modify above or Export to Word."
                                }, void 0, false, {
                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                    lineNumber: 806,
                                    columnNumber: 44
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-[var(--foreground)] mb-3",
                                            children: [
                                                generatedCount === 0 ? "Generate all 25 sections sequentially." : `${generatedCount} of ${__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$src$2f$lib$2f$draft$2d$sections$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SECTION_ORDER"].length} sections complete.`,
                                                missingSectionIds.length > 0 && generatedCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        " ",
                                                        hasGapSections ? `${missingSectionIds.length} missing (including gaps before section ${lastGeneratedIndex + 1}).` : `${missingSectionIds.length} remaining.`
                                                    ]
                                                }, void 0, true)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 809,
                                            columnNumber: 19
                                        }, this),
                                        agent2Status && !agent2Status.ok && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mb-3 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-3 py-2 text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-medium text-[var(--warning)]",
                                                    children: "Setup issue:"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 817,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1 text-[var(--muted)]",
                                                    children: agent2Status.spawn || "Check backend setup in the terminal."
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 818,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: fetchAgent2Status,
                                                    className: "mt-2 text-[var(--accent)] hover:underline",
                                                    children: "Re-check"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 819,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 816,
                                            columnNumber: 56
                                        }, this),
                                        agent2Status?.ok && agent2Status.hint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-[var(--muted)] mb-3",
                                            children: agent2Status.hint
                                        }, void 0, false, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 821,
                                            columnNumber: 61
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex gap-2 flex-wrap items-center",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleGenerateAllSequential,
                                                    disabled: generating,
                                                    className: "rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50",
                                                    children: generateAllLabel
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 823,
                                                    columnNumber: 21
                                                }, this),
                                                missingSectionIds.length > 0 && generatedCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: handleGenerateNext,
                                                    disabled: generating,
                                                    className: "rounded-lg border-2 border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10",
                                                    children: nextMissingLabel
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 826,
                                                    columnNumber: 76
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$modular$2f$platform$2d$module$2f$web$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    onClick: fetchAgent2Status,
                                                    disabled: generating,
                                                    className: "rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50",
                                                    title: "Verify the drafting backend is ready",
                                                    children: "Check setup"
                                                }, void 0, false, {
                                                    fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                                    lineNumber: 829,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                            lineNumber: 822,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                                lineNumber: 798,
                                columnNumber: 24
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                        lineNumber: 710,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
                lineNumber: 624,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/modular/platform-module/web/src/app/page.tsx",
        lineNumber: 558,
        columnNumber: 10
    }, this);
}
_s(Page, "6plgftcrK5hSIp4fW0VpcgyBb7A=");
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=modular_platform-module_web_src_5a4e164d._.js.map