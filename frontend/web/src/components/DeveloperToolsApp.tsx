"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type {
  DeveloperCompanyOverview,
  DeveloperDatasetIndex,
  DeveloperPrompt,
  DeveloperPromptMutationResponse,
  DeveloperPromptOverride,
  DeveloperPromptSyncStatus,
  DeveloperPromptsResponse,
  DeveloperSection,
  DeveloperSectionPage,
  DeveloperToolsHealth,
  ModelConfig,
  ModelProviderId,
  PromptSuggestion,
  RcaCaseResult,
  RcaPlanResponse,
  RcaUnitResult,
} from "@/lib/developer-tools-types";

type TabId = "prompts" | "dataset" | "rca";
type CaseStatus = "queued" | "running" | "completed" | "error";

type ExperimentCase = {
  id: string;
  companyId: string;
  companyName: string;
  sectionId: string;
  sectionName: string;
  promptId: string;
  promptSnapshot: string;
  status: CaseStatus;
  result?: RcaCaseResult;
  error?: string;
  unitProgress?: { completed: number; total: number; current?: string };
};

type SuggestionState = {
  status: "queued" | "running" | "ready" | "accepted" | "rejected" | "error";
  suggestion?: PromptSuggestion;
  error?: string;
};

type BatchState = {
  id: string;
  scopeLabel: string;
  createdAt: string;
  status: "running" | "paused" | "suggesting" | "completed";
  cases: ExperimentCase[];
  suggestions: Record<string, SuggestionState>;
};

type StoredPrompt = DeveloperPromptOverride;
type PromptMutationState = {
  status: "idle" | "syncing" | "success" | "error";
  promptId?: string;
  message?: string;
  commitUrl?: string;
};

const PROMPT_STORAGE_KEY = "prospectus.devtools.prompt-overrides.v2";
const PROVIDER_STORAGE_KEY = "prospectus.devtools.model-config.v1";
const KEY_SESSION_STORAGE = "prospectus.devtools.api-key.v1";

const PROVIDERS: Record<
  ModelProviderId,
  { label: string; model: string; baseUrl: string; keyPlaceholder: string }
> = {
  openai: {
    label: "OpenAI / compatible",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk-…",
  },
  deepseek: {
    label: "DeepSeek",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com",
    keyPlaceholder: "sk-…",
  },
  qwen_api: {
    label: "Qwen (DashScope)",
    model: "qwen-plus",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    keyPlaceholder: "sk-…",
  },
  anthropic: {
    label: "Anthropic",
    model: "claude-sonnet-4-6",
    baseUrl: "",
    keyPlaceholder: "sk-ant-…",
  },
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status === 401) {
    window.location.assign("/developer-tools/login");
    throw new Error("登录已失效，请重新登录。");
  }
  if (!response.ok) {
    const error = body as { error?: string };
    throw new Error(error.error || `Request failed (${response.status}).`);
  }
  return body as T;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function assemblePrompt(prompt: DeveloperPrompt, requirements: string): string {
  if (!prompt.requirements || prompt.requirements === requirements) return prompt.prompt;
  return prompt.prompt.replace(prompt.requirements, requirements);
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}
    >
      <path d="m7 4 6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: CaseStatus | BatchState["status"] }) {
  const styles: Record<string, string> = {
    queued: "bg-[#edf0eb] text-[#647064]",
    running: "bg-[#e4f3ef] text-[#17695f]",
    completed: "bg-[#e7f2e4] text-[#356a2d]",
    error: "bg-[#fff0eb] text-[#a64934]",
    paused: "bg-[#fff5d8] text-[#806415]",
    suggesting: "bg-[#eee8ff] text-[#5d47a3]",
  };
  const labels: Record<string, string> = {
    queued: "等待中",
    running: "运行中",
    completed: "已完成",
    error: "失败",
    paused: "已暂停",
    suggesting: "汇总建议中",
  };
  return <span className={`px-2 py-1 text-[11px] font-semibold ${styles[status]}`}>{labels[status]}</span>;
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-52 items-center justify-center border border-dashed border-[#cbd5cc] bg-[#fafcf9] p-8 text-center text-sm leading-6 text-[#728078]">
      {children}
    </div>
  );
}

function PromptManagement({
  prompts,
  overrides,
  sync,
  mutation,
  onSave,
  onReset,
}: {
  prompts: DeveloperPrompt[];
  overrides: Record<string, StoredPrompt>;
  sync: DeveloperPromptSyncStatus | null;
  mutation: PromptMutationState;
  onSave: (id: string, requirements: string, source?: StoredPrompt["source"]) => Promise<boolean>;
  onReset: (id: string) => Promise<boolean>;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(prompts[0]?.id || "");
  const selected = prompts.find((item) => item.id === selectedId) || prompts[0];
  const effective = selected
    ? overrides[selected.id]?.requirements || selected.requirements
    : "";
  const [draft, setDraft] = useState(effective);

  const filtered = prompts.filter((item) =>
    `${item.name} ${item.sectionId}`.toLowerCase().includes(query.toLowerCase())
  );

  if (!selected) return <EmptyPanel>未找到 section prompt。</EmptyPanel>;
  const modified = Boolean(overrides[selected.id]);
  const dirty = draft !== effective;
  const assembled = assemblePrompt(selected, draft);
  const syncing = mutation.status === "syncing" && mutation.promptId === selected.id;

  return (
    <div className="grid min-h-[calc(100vh-166px)] grid-cols-1 border border-[#d5ddd4] bg-white lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#d5ddd4] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#66746b]">Section prompts</p>
          <p className="mt-1 text-2xl font-semibold">{prompts.length}</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 section…"
            className="mt-4 h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
          />
        </div>
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedId(item.id);
                setDraft(overrides[item.id]?.requirements || item.requirements);
              }}
              className={`mb-1 w-full border-l-2 px-3 py-3 text-left transition ${
                selected.id === item.id
                  ? "border-[#267267] bg-white text-[#17201b] shadow-sm"
                  : "border-transparent text-[#5f6d64] hover:bg-white/70"
              }`}
            >
              <span className="block text-sm font-semibold">{item.name}</span>
              <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[#7a877f]">
                {item.sectionId}
                {overrides[item.id] ? <span className="text-[#a76e13]">modified</span> : null}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-col gap-4 border-b border-[#d5ddd4] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{selected.name}</h2>
              <span className={`px-2 py-1 text-[10px] font-semibold uppercase ${modified ? "bg-[#fff2cf] text-[#805c0b]" : "bg-[#eaf1ea] text-[#526158]"}`}>
                {modified ? overrides[selected.id].source : "baseline"}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-[#728078]">{selected.sectionId} · {draft.length.toLocaleString()} chars</p>
          </div>
          <div className="flex gap-2">
            {modified ? (
              <button
                disabled={syncing || !sync?.configured || Boolean(sync.error)}
                onClick={() => void onReset(selected.id).then((ok) => ok && setDraft(selected.requirements))}
                className="h-9 border border-[#cbd4cc] px-3 text-xs font-semibold hover:bg-[#f3f6f1] disabled:opacity-40"
              >
                恢复 baseline
              </button>
            ) : null}
            <button
              disabled={!dirty || !draft.trim() || syncing || !sync?.configured || Boolean(sync.error)}
              onClick={() => void onSave(selected.id, draft)}
              className="h-9 bg-[#17201b] px-4 text-xs font-semibold text-white disabled:opacity-40"
            >
              {syncing ? "同步到 GitHub…" : "保存并同步 GitHub"}
            </button>
          </div>
        </div>
        <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
          <div className="p-5">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">Runtime SectionSpec · 可编辑</label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              className="mt-3 min-h-[38vh] w-full resize-y border border-[#d4dcd4] bg-[#fbfcfa] p-4 font-mono text-xs leading-6 text-[#26332c] outline-none focus:border-[#267267]"
            />
            <details className="mt-5 border border-[#d5ddd4]" open>
              <summary className="cursor-pointer bg-[#f4f7f2] px-4 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-[#526057]">
                完整生成 Prompt · 实时预览 · {assembled.length.toLocaleString()} chars
              </summary>
              <pre className="max-h-[48vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-6 text-[#303d35]">
                {assembled}
              </pre>
            </details>
          </div>
          <aside className="border-t border-[#d5ddd4] bg-[#f8faf7] p-5 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">GitHub sync</p>
            <div className={`mt-3 border-l-2 p-3 text-xs leading-5 ${sync?.configured ? "border-[#3e806f] bg-[#edf7f3] text-[#286456]" : "border-[#c75b45] bg-[#fff1ed] text-[#8b3f31]"}`}>
              {sync?.configured
                ? `${sync.repository} · ${sync.branch} · ${sync.path}`
                : "服务端尚未配置 GITHUB_PROMPT_TOKEN；为防止只保存在浏览器，保存按钮已禁用。"}
              {sync?.error ? <span className="mt-1 block">{sync.error}</span> : null}
              {sync?.verifiedAt ? (
                <span className="mt-1 block">
                  写后校验：{new Date(sync.verifiedAt).toLocaleString("zh-CN")}
                </span>
              ) : null}
            </div>
            {mutation.status === "success" && mutation.promptId === selected.id ? (
              <div className="mt-4 border-l-2 border-[#3e806f] bg-white p-3 text-xs leading-5 text-[#286456]">
                {mutation.message}
                {mutation.commitUrl ? <a className="mt-1 block underline" href={mutation.commitUrl} target="_blank" rel="noreferrer">查看 GitHub commit</a> : null}
              </div>
            ) : null}
            {mutation.status === "error" && mutation.promptId === selected.id ? (
              <div className="mt-4 border-l-2 border-[#c75b45] bg-white p-3 text-xs leading-5 text-[#8b3f31]">{mutation.message}</div>
            ) : null}
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">Baseline runtime SectionSpec</p>
            <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap border border-[#d5ddd4] bg-white p-3 text-xs leading-5 text-[#536158]">{selected.requirements}</div>
            <div className="mt-6 border-l-2 border-[#d3a52c] bg-[#fff8e5] p-3 text-xs leading-5 text-[#69551b]">
              保存或采纳 RCA diff 会把此 section 的 runtime SectionSpec override 提交到 GitHub；Writer 模板、全局 Exchange 规则和公司证据仍由 pipeline 动态组合。
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function DatasetManagement({
  index,
  getCompany,
  getSection,
}: {
  index: DeveloperDatasetIndex;
  getCompany: (id: string) => Promise<DeveloperCompanyOverview>;
  getSection: (companyId: string, sectionId: string, atomOffset?: number) => Promise<DeveloperSectionPage>;
}) {
  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState(index.companies[0]?.id || "");
  const [company, setCompany] = useState<DeveloperCompanyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"sections" | "files">("sections");
  const [sectionId, setSectionId] = useState("");
  const [sectionPage, setSectionPage] = useState<DeveloperSectionPage | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [atomOffset, setAtomOffset] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    let active = true;
    getCompany(companyId)
      .then((next) => {
        if (!active) return;
        const nextSectionId = next.sections[0]?.id || "";
        setCompany(next);
        setSectionPage(null);
        setSectionError("");
        setSectionLoading(Boolean(nextSectionId));
        setAtomOffset(0);
        setSectionId(nextSectionId);
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "加载失败。"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [companyId, getCompany]);

  useEffect(() => {
    if (!company || company.id !== companyId || !sectionId) return;
    let active = true;
    getSection(companyId, sectionId, atomOffset)
      .then((next) => active && setSectionPage(next))
      .catch((reason) => active && setSectionError(reason instanceof Error ? reason.message : "Section 加载失败。"))
      .finally(() => active && setSectionLoading(false));
    return () => {
      active = false;
    };
  }, [atomOffset, company, companyId, getSection, sectionId]);

  const companies = index.companies.filter((item) =>
    `${item.name} ${item.id}`.toLowerCase().includes(query.toLowerCase())
  );
  function chooseCompany(id: string) {
    if (id === companyId) return;
    setCompanyId(id);
    setCompany(null);
    setSectionId("");
    setSectionPage(null);
    setSectionError("");
    setSectionLoading(false);
    setAtomOffset(0);
    setLoading(true);
    setError("");
  }

  return (
    <div className="grid min-h-[calc(100vh-166px)] grid-cols-1 border border-[#d5ddd4] bg-white xl:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] xl:border-b-0 xl:border-r">
        <div className="border-b border-[#d5ddd4] p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#66746b]">Companies</p>
              <p className="mt-1 text-2xl font-semibold">{index.companyCount}</p>
            </div>
            <p className="text-xs text-[#738078]">真实语料</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索公司名或 stock code…"
            className="mt-4 h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
          />
        </div>
        <div className="max-h-[calc(100vh-315px)] overflow-y-auto p-2">
          {companies.map((item) => (
            <button
              key={item.id}
              onClick={() => chooseCompany(item.id)}
              className={`mb-1 w-full border-l-2 px-3 py-3 text-left ${
                companyId === item.id ? "border-[#267267] bg-white shadow-sm" : "border-transparent hover:bg-white/70"
              }`}
            >
              <span className="block truncate text-sm font-semibold">{item.name}</span>
              <span className="mt-1 flex justify-between font-mono text-[10px] text-[#758179]">
                <span>{item.id}</span>
                <span>{item.sectionCount} sections</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0">
        {loading ? <EmptyPanel>正在解压并加载公司数据…</EmptyPanel> : null}
        {error ? <EmptyPanel>{error}</EmptyPanel> : null}
        {!loading && !error && company ? (
          <>
            <div className="flex flex-col gap-4 border-b border-[#d5ddd4] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{company.name}</h2>
                <p className="mt-1 font-mono text-xs text-[#738078]">
                  {company.id} · {company.totalPages || "—"} pages · {company.files.length} files · {company.sections.length} sections
                </p>
              </div>
              <div className="flex bg-[#edf1eb] p-1">
                {(["sections", "files"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setView(item)}
                    className={`h-8 px-4 text-xs font-semibold ${view === item ? "bg-white text-[#17201b] shadow-sm" : "text-[#657269]"}`}
                  >
                    {item === "sections" ? "真实 Section + 准备数据" : "历史文件清单"}
                  </button>
                ))}
              </div>
            </div>

            {view === "files" ? (
              <div className="overflow-x-auto p-5">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#cfd8cf] text-xs uppercase tracking-[0.12em] text-[#6a776f]">
                      <th className="px-3 py-3 font-semibold">文件</th>
                      <th className="px-3 py-3 font-semibold">类型</th>
                      <th className="px-3 py-3 font-semibold">对应 Section</th>
                      <th className="px-3 py-3 font-semibold">页码</th>
                      <th className="px-3 py-3 text-right font-semibold">大小</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.files.map((file, indexKey) => (
                      <tr key={`${file.path}-${indexKey}`} className="border-b border-[#edf0ec] align-top hover:bg-[#fafcf9]">
                        <td className="max-w-md px-3 py-3">
                          <p className="font-medium text-[#26332c]">{file.name}</p>
                          <p className="mt-1 break-all font-mono text-[10px] text-[#7b877f]">{file.path}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-[#59675e]">{file.category}</td>
                        <td className="px-3 py-3 font-mono text-xs text-[#59675e]">{file.sectionHint || "—"}</td>
                        <td className="px-3 py-3 text-xs text-[#59675e]">
                          {file.pageStart ? `${file.pageStart}${file.pageEnd ? `–${file.pageEnd}` : ""}` : "—"}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-xs text-[#59675e]">{formatBytes(file.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid min-h-[calc(100vh-260px)] grid-cols-1 lg:grid-cols-[250px_1fr]">
                <div className="border-b border-[#d5ddd4] bg-[#fafcf9] p-2 lg:border-b-0 lg:border-r">
                  <div className="max-h-[calc(100vh-285px)] overflow-y-auto">
                    {company.sections.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSectionId(item.id);
                          setAtomOffset(0);
                          setSectionPage(null);
                          setSectionError("");
                          setSectionLoading(true);
                        }}
                        className={`mb-1 w-full px-3 py-2.5 text-left ${sectionId === item.id ? "bg-[#17201b] text-white" : "hover:bg-[#eef3ec]"}`}
                      >
                        <span className="block truncate text-xs font-semibold">{item.title}</span>
                        <span className={`mt-1 block font-mono text-[10px] ${sectionId === item.id ? "text-[#c5d4cc]" : "text-[#7a877f]"}`}>
                          p. {item.pageStart || "—"}–{item.pageEnd || "—"} · {formatNumber(item.referenceCharacters)} chars
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                {sectionLoading ? <EmptyPanel>正在加载 section 与原子证据…</EmptyPanel> : null}
                {sectionError ? <EmptyPanel>{sectionError}</EmptyPanel> : null}
                {!sectionLoading && !sectionError && sectionPage ? (
                  <SectionComparison
                    page={sectionPage}
                    onAtomOffsetChange={(offset) => {
                      setSectionPage(null);
                      setSectionError("");
                      setSectionLoading(true);
                      setAtomOffset(offset);
                    }}
                  />
                ) : null}
                {!sectionLoading && !sectionError && !sectionPage ? <EmptyPanel>请选择 section。</EmptyPanel> : null}
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function SectionComparison({
  page,
  onAtomOffsetChange,
}: {
  page: DeveloperSectionPage;
  onAtomOffsetChange: (offset: number) => void;
}) {
  const { section, evidenceAtoms, evidenceAtomPage } = page;
  const atomStart = evidenceAtomPage.total ? evidenceAtomPage.offset + 1 : 0;
  const atomEnd = Math.min(evidenceAtomPage.total, evidenceAtomPage.offset + evidenceAtoms.length);
  return (
    <div className="min-w-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#267267]">{section.id}</p>
          <h3 className="mt-1 text-lg font-semibold">{section.title}</h3>
        </div>
        <span className="bg-[#eef3ec] px-3 py-1.5 font-mono text-xs text-[#5d6a62]">
          p. {section.pageStart || "—"}–{section.pageEnd || "—"}
        </span>
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        <TextPanel title="真实招股说明书内容" meta={`${formatNumber(section.referenceCharacters)} chars`} text={section.referenceText || "该 section 没有可用文本。"} />
        <TextPanel title="为该 section 准备的数据" meta="Structured JSON" text={JSON.stringify(section.preparedData, null, 2)} code />
      </div>
      <section className="mt-4 min-w-0 border border-[#d5ddd4] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d5ddd4] bg-[#f4f7f2] px-4 py-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526057]">Evidence atoms</h4>
            <p className="mt-1 font-mono text-[10px] text-[#7a877f]">{atomStart}–{atomEnd} / {formatNumber(evidenceAtomPage.total)}</p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!evidenceAtomPage.hasPrevious}
              onClick={() => onAtomOffsetChange(Math.max(0, evidenceAtomPage.offset - evidenceAtomPage.limit))}
              className="h-8 border border-[#cbd4cc] px-3 text-xs font-semibold disabled:opacity-35"
            >
              上一页
            </button>
            <button
              disabled={!evidenceAtomPage.hasNext}
              onClick={() => onAtomOffsetChange(evidenceAtomPage.offset + evidenceAtomPage.limit)}
              className="h-8 border border-[#cbd4cc] px-3 text-xs font-semibold disabled:opacity-35"
            >
              下一页
            </button>
          </div>
        </div>
        <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-6 text-[#303d35]">
          {JSON.stringify(evidenceAtoms, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function TextPanel({ title, meta, text, code = false }: { title: string; meta?: string; text: string; code?: boolean }) {
  return (
    <section className="min-w-0 border border-[#d5ddd4] bg-white">
      <div className="flex items-center justify-between border-b border-[#d5ddd4] bg-[#f4f7f2] px-4 py-3">
        <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#526057]">{title}</h4>
        {meta ? <span className="font-mono text-[10px] text-[#7a877f]">{meta}</span> : null}
      </div>
      <pre className={`${code ? "font-mono text-[11px]" : "font-serif text-sm"} max-h-[62vh] overflow-auto whitespace-pre-wrap break-words p-4 leading-6 text-[#303d35]`}>
        {text}
      </pre>
    </section>
  );
}

function ModelSettings({ config, onChange }: { config: ModelConfig; onChange: (value: ModelConfig) => void }) {
  const providerMeta = PROVIDERS[config.provider];
  return (
    <div className="grid gap-3 border border-[#d5ddd4] bg-[#f7faf6] p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Provider</span>
        <select
          value={config.provider}
          onChange={(event) => {
            const provider = event.target.value as ModelProviderId;
            const next = PROVIDERS[provider];
            onChange({ provider, model: next.model, baseUrl: next.baseUrl, apiKey: config.apiKey });
          }}
          className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 text-sm outline-none"
        >
          {(Object.keys(PROVIDERS) as ModelProviderId[]).map((id) => (
            <option key={id} value={id}>{PROVIDERS[id].label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Model</span>
        <input value={config.model} onChange={(event) => onChange({ ...config, model: event.target.value })} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 font-mono text-xs outline-none" />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">API Key · 仅当前 tab</span>
        <input type="password" autoComplete="off" placeholder={providerMeta.keyPlaceholder} value={config.apiKey || ""} onChange={(event) => onChange({ ...config, apiKey: event.target.value })} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 font-mono text-xs outline-none" />
      </label>
      <label className={`block ${config.provider === "anthropic" ? "opacity-45" : ""}`}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Base URL</span>
        <input disabled={config.provider === "anthropic"} value={config.baseUrl || ""} onChange={(event) => onChange({ ...config, baseUrl: event.target.value })} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 font-mono text-[11px] outline-none disabled:bg-[#eef1ec]" />
      </label>
    </div>
  );
}

function RcaWorkspace({
  index,
  prompts,
  overrides,
  onAdoptPrompt,
  getSection,
}: {
  index: DeveloperDatasetIndex;
  prompts: DeveloperPrompt[];
  overrides: Record<string, StoredPrompt>;
  onAdoptPrompt: (id: string, requirements: string, source?: StoredPrompt["source"]) => Promise<boolean>;
  getSection: (companyId: string, sectionId: string, atomOffset?: number) => Promise<DeveloperSectionPage>;
}) {
  const [scope, setScope] = useState<"section" | "company" | "all">("section");
  const [companyId, setCompanyId] = useState(index.companies[0]?.id || "");
  const [sectionId, setSectionId] = useState(index.companies[0]?.sections[0]?.id || "");
  const [concurrency, setConcurrency] = useState(1);
  const [preflighting, setPreflighting] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({ provider: "openai", model: PROVIDERS.openai.model, baseUrl: PROVIDERS.openai.baseUrl, apiKey: "" });
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [caseFilter, setCaseFilter] = useState("");
  const [visibleCases, setVisibleCases] = useState(100);
  const [expandedCaseId, setExpandedCaseId] = useState("");
  const [suggestionSection, setSuggestionSection] = useState("");
  const [generateSuggestions, setGenerateSuggestions] = useState(false);
  const [runLegacyJudge, setRunLegacyJudge] = useState(false);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const batchRef = useRef<BatchState | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROVIDER_STORAGE_KEY) || "null") as Partial<ModelConfig> | null;
      const key = sessionStorage.getItem(KEY_SESSION_STORAGE) || "";
      if (saved?.provider && PROVIDERS[saved.provider]) {
        setModelConfig({
          provider: saved.provider,
          model: saved.model || PROVIDERS[saved.provider].model,
          baseUrl: saved.baseUrl ?? PROVIDERS[saved.provider].baseUrl,
          apiKey: key,
        });
      }
    } catch {
      // Keep safe defaults when browser storage is unavailable.
    }
  }, []);

  function updateModelConfig(next: ModelConfig) {
    setModelConfig(next);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify({ provider: next.provider, model: next.model, baseUrl: next.baseUrl }));
      sessionStorage.setItem(KEY_SESSION_STORAGE, next.apiKey || "");
    } catch {
      // The experiment still works without persistence.
    }
  }

  const promptBySection = useMemo(() => new Map(prompts.map((item) => [item.sectionId, item])), [prompts]);
  const selectedCompany = index.companies.find((item) => item.id === companyId);

  useEffect(() => {
    const sections = (selectedCompany?.sections || []).filter((item) => item.rcaReady);
    if (!sections.some((item) => item.id === sectionId)) {
      setSectionId(sections[0]?.id || "");
    }
  }, [sectionId, selectedCompany]);

  const mutateBatch = useCallback((mutator: (current: BatchState) => BatchState) => {
    setBatch((current) => {
      if (!current) return current;
      const next = mutator(current);
      batchRef.current = next;
      return next;
    });
  }, []);

  function buildCases(): ExperimentCase[] {
    const companies = scope === "all" ? index.companies : index.companies.filter((item) => item.id === companyId);
    return companies.flatMap((company) =>
      company.sections.flatMap((section) => {
        if (scope === "section" && section.id !== sectionId) return [];
        if (!section.rcaReady) return [];
        const prompt = promptBySection.get(section.id);
        if (!prompt) return [];
        return [
          {
            id: `${company.id}::${section.id}`,
            companyId: company.id,
            companyName: company.name,
            sectionId: section.id,
            sectionName: prompt.name,
            promptId: prompt.id,
            promptSnapshot: assemblePrompt(
              prompt,
              overrides[prompt.id]?.requirements || prompt.requirements
            ),
            status: "queued" as const,
          },
        ];
      })
    );
  }

  async function runCase(item: ExperimentCase): Promise<ExperimentCase> {
    try {
      const plan = await apiJson<RcaPlanResponse>("/api/developer-tools/rca/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: item.companyId,
          sectionId: item.sectionId,
          prompt: item.promptSnapshot,
        }),
      });
      const unitDrafts: RcaUnitResult[] = [];
      for (const [unitIndex, unit] of plan.units.entries()) {
        mutateBatch((value) => ({
          ...value,
          cases: value.cases.map((candidate) =>
            candidate.id === item.id
              ? {
                  ...candidate,
                  unitProgress: {
                    completed: unitIndex,
                    total: plan.units.length,
                    current: unit.title,
                  },
                }
              : candidate
          ),
        }));
        const unitResult = await apiJson<RcaUnitResult>("/api/developer-tools/rca/run-unit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: item.companyId,
            sectionId: item.sectionId,
            unitId: unit.unitId,
            targetCharacters: unit.targetCharacters,
            prompt: item.promptSnapshot,
            contractSourceHash: plan.contract.sourceHash,
            model: modelConfig,
          }),
        });
        unitDrafts.push(unitResult);
      }
      const last = unitDrafts.at(-1);
      const result = await apiJson<RcaCaseResult>("/api/developer-tools/rca/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: item.companyId,
          sectionId: item.sectionId,
          prompt: item.promptSnapshot,
          contractSourceHash: plan.contract.sourceHash,
          unitDrafts,
          model: last?.model || modelConfig.model,
          provider: last?.provider || modelConfig.provider,
          legacyModelJudge: runLegacyJudge,
          judgeModel: runLegacyJudge ? modelConfig : undefined,
        }),
      });
      return { ...item, status: "completed", result };
    } catch (reason) {
      return { ...item, status: "error", error: reason instanceof Error ? reason.message : "运行失败。" };
    }
  }

  async function synthesizeSuggestions() {
    const current = batchRef.current;
    if (!current) return;
    if (stopRef.current) {
      runningRef.current = false;
      mutateBatch((value) => ({ ...value, status: "paused" }));
      return;
    }
    const sectionIds = Array.from(
      new Set(
        current.cases
          .filter((item) => Boolean(item.result))
          .map((item) => item.sectionId)
      )
    );
    mutateBatch((value) => ({
      ...value,
      status: "suggesting",
      suggestions: Object.fromEntries(sectionIds.map((id) => [id, value.suggestions[id] || { status: "queued" }])),
    }));

    for (const sectionId of sectionIds) {
      if (stopRef.current) {
        runningRef.current = false;
        mutateBatch((value) => ({ ...value, status: "paused" }));
        return;
      }
      const existingStatus = batchRef.current?.suggestions[sectionId]?.status;
      if (existingStatus && ["ready", "accepted", "rejected", "error"].includes(existingStatus)) {
        continue;
      }
      mutateBatch((value) => ({ ...value, suggestions: { ...value.suggestions, [sectionId]: { status: "running" } } }));
      const snapshot = batchRef.current!;
      const cases = snapshot.cases.filter((item) => item.sectionId === sectionId && item.result);
      const prompt = promptBySection.get(sectionId);
      if (!prompt || !cases.length) continue;
      try {
        const suggestion = await apiJson<PromptSuggestion>("/api/developer-tools/rca/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId,
            sectionName: prompt.name,
            prompt: cases[0].promptSnapshot,
            requirements: overrides[prompt.id]?.requirements || prompt.requirements,
            diagnoses: cases.map((item) => ({ companyName: item.companyName, diagnosis: item.result!.diagnosis })),
            model: modelConfig,
          }),
        });
        mutateBatch((value) => ({ ...value, suggestions: { ...value.suggestions, [sectionId]: { status: "ready", suggestion } } }));
        setSuggestionSection((selected) => selected || sectionId);
      } catch (reason) {
        mutateBatch((value) => ({
          ...value,
          suggestions: {
            ...value.suggestions,
            [sectionId]: { status: "error", error: reason instanceof Error ? reason.message : "建议生成失败。" },
          },
        }));
      }
    }
    mutateBatch((value) => ({ ...value, status: "completed" }));
    runningRef.current = false;
  }

  async function executeBatch() {
    if (runningRef.current || !batchRef.current) return;
    runningRef.current = true;
    stopRef.current = false;
    mutateBatch((value) => ({ ...value, status: "running" }));
    let cursor = 0;

    async function worker() {
      while (!stopRef.current) {
        const snapshot = batchRef.current;
        if (!snapshot) return;
        while (cursor < snapshot.cases.length && snapshot.cases[cursor].status !== "queued") cursor += 1;
        if (cursor >= snapshot.cases.length) return;
        const indexToRun = cursor++;
        const item = snapshot.cases[indexToRun];
        mutateBatch((value) => ({
          ...value,
          cases: value.cases.map((candidate) => candidate.id === item.id ? { ...candidate, status: "running" } : candidate),
        }));
        const result = await runCase(item);
        mutateBatch((value) => ({
          ...value,
          cases: value.cases.map((candidate) => candidate.id === item.id ? result : candidate),
        }));
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    runningRef.current = false;
    if (stopRef.current) {
      mutateBatch((value) => ({ ...value, status: "paused" }));
      return;
    }
    if (generateSuggestions) {
      await synthesizeSuggestions();
    } else {
      mutateBatch((value) => ({ ...value, status: "completed" }));
    }
  }

  async function startBatch() {
    if (!modelConfig.model.trim()) return window.alert("请填写模型名称。");
    if (!modelConfig.apiKey?.trim()) {
      const proceed = window.confirm("当前没有填写 API Key。只有服务端已配置对应密钥时才能运行。仍要继续吗？");
      if (!proceed) return;
    }
    const cases = buildCases();
    if (!cases.length) return window.alert("当前范围内没有可运行的 section。");
    const generationCalls = cases.reduce((total, item) => {
      const prompt = promptBySection.get(item.sectionId);
      return total + Math.max(1, prompt?.executionContract?.units.length || 1);
    }, 0);
    const suggestionCalls = generateSuggestions ? new Set(cases.map((item) => item.sectionId)).size : 0;
    const estimatedCalls = 1 + generationCalls + suggestionCalls;
    const confirmed = window.confirm(
      `将运行 ${formatNumber(cases.length)} 个 case，共 ${formatNumber(generationCalls)} 个 section units，预计调用模型约 ${formatNumber(estimatedCalls)} 次（凭据预检 + 分段生成${generateSuggestions ? " + 每 section 一轮可选建议" : ""}；确定性评测不调用模型）。\n\n该操作可能产生 API 费用，确认开始？`
    );
    if (!confirmed) return;
    setPreflighting(true);
    try {
      await apiJson<{ ok: boolean }>("/api/developer-tools/rca/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelConfig }),
      });
    } catch (reason) {
      window.alert(
        `模型预检失败，Batch 尚未开始：${reason instanceof Error ? reason.message : "未知错误"}`
      );
      return;
    } finally {
      setPreflighting(false);
    }
    const next: BatchState = {
      id: crypto.randomUUID(),
      scopeLabel:
        scope === "all"
          ? `全部 ${index.companyCount} 家公司`
          : scope === "section"
            ? `${selectedCompany?.name || companyId} · ${promptBySection.get(sectionId)?.name || sectionId}`
            : selectedCompany?.name || companyId,
      createdAt: new Date().toISOString(),
      status: "running",
      cases,
      suggestions: {},
    };
    setVisibleCases(100);
    setExpandedCaseId("");
    setSuggestionSection("");
    setBatch(next);
    batchRef.current = next;
    setTimeout(() => void executeBatch(), 0);
  }

  function pauseBatch() {
    stopRef.current = true;
  }

  function resumeBatch() {
    stopRef.current = false;
    void executeBatch();
  }

  const completed = batch?.cases.filter((item) => item.status === "completed").length || 0;
  const failed = batch?.cases.filter((item) => item.status === "error").length || 0;
  const finished = completed + failed;
  const progress = batch?.cases.length ? Math.round((finished / batch.cases.length) * 100) : 0;
  const attributionCounts = batch?.cases.reduce(
    (counts, item) => {
      const key = item.result?.diagnosis.primaryAttribution;
      if (key) counts[key] += 1;
      return counts;
    },
    { data_incomplete: 0, prompt_incomplete: 0, prompt_or_workflow: 0, model_limitation: 0, none: 0 }
  );

  const filteredCases = (batch?.cases || []).filter((item) =>
    `${item.companyName} ${item.sectionName} ${item.status}`.toLowerCase().includes(caseFilter.toLowerCase())
  );
  const suggestionEntries = Object.entries(batch?.suggestions || {});
  const activeSuggestion = batch && suggestionSection ? batch.suggestions[suggestionSection] : undefined;
  const activePrompt = promptBySection.get(suggestionSection);

  async function decideSuggestion(sectionId: string, decision: "accepted" | "rejected") {
    const state = batchRef.current?.suggestions[sectionId];
    if (!state?.suggestion) return;
    if (decision === "accepted") {
      const prompt = promptBySection.get(sectionId);
      if (prompt) {
        const saved = await onAdoptPrompt(
          prompt.id,
          state.suggestion.revisedRequirements,
          "rca"
        );
        if (!saved) {
          window.alert("未能同步到 GitHub；该 diff 尚未采纳。请在 Prompt Management 查看错误。 ");
          return;
        }
      }
    }
    mutateBatch((value) => ({
      ...value,
      suggestions: { ...value.suggestions, [sectionId]: { ...value.suggestions[sectionId], status: decision } },
    }));
  }

  return (
    <div className="space-y-5">
      <section className="border border-[#d5ddd4] bg-white p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#267267]">Batch configuration</p>
            <h2 className="mt-1 text-xl font-semibold">RCA 实验范围</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#637067]">
              单章节验证适合低成本 smoke test；长章节会按 contract 拆成可恢复的 section units。模型只负责起草，事实、数值、结构、顺序、长度和占位符均由确定性规则评测；Prompt 建议默认关闭且不会自动采纳。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {batch && ["running", "suggesting"].includes(batch.status) ? (
              <button onClick={pauseBatch} className="h-10 border border-[#c7d1c8] px-4 text-sm font-semibold">完成当前调用后暂停</button>
            ) : batch?.status === "paused" ? (
              <button onClick={resumeBatch} className="h-10 bg-[#267267] px-4 text-sm font-semibold text-white">继续 Batch</button>
            ) : null}
            <button disabled={preflighting || Boolean(batch && ["running", "suggesting"].includes(batch.status))} onClick={() => void startBatch()} className="h-10 bg-[#17201b] px-5 text-sm font-semibold text-white disabled:opacity-40">
              {preflighting ? "正在预检模型…" : batch ? "新建并运行 Batch" : "开始 Batch"}
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_120px]">
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Scope</span>
            <select value={scope} onChange={(event) => setScope(event.target.value as "section" | "company" | "all")} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 text-sm">
              <option value="section">单章节验证</option>
              <option value="company">单家公司 · 全部 sections</option>
              <option value="all">全部公司 · 全部 sections</option>
            </select>
          </label>
          <label className={scope !== "section" ? "opacity-45" : ""}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Section</span>
            <select disabled={scope !== "section"} value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 text-sm disabled:bg-[#eef1ec]">
              {(selectedCompany?.sections || []).filter((item) => item.rcaReady).map((item) => (
                <option key={item.id} value={item.id}>
                  {promptBySection.get(item.id)?.name || item.title}
                </option>
              ))}
            </select>
          </label>
          <label className={scope === "all" ? "opacity-45" : ""}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Company</span>
            <select disabled={scope === "all"} value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 text-sm disabled:bg-[#eef1ec]">
              {index.companies.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.id}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#69766e]">Concurrency</span>
            <select value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value))} className="mt-1 h-10 w-full border border-[#cad4cc] bg-white px-3 text-sm">
              {[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4"><ModelSettings config={modelConfig} onChange={updateModelConfig} /></div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="flex items-start gap-3 border border-[#d5ddd4] bg-[#fafcf9] p-3 text-xs leading-5 text-[#536158]">
            <input type="checkbox" checked={generateSuggestions} onChange={(event) => setGenerateSuggestions(event.target.checked)} className="mt-1" />
            <span><strong className="block text-[#26332c]">生成可选 Prompt 建议</strong>Batch 完成后每个 section 额外调用一次模型汇总建议；只有你点击采纳后才会同步到 GitHub。</span>
          </label>
          <label className="flex items-start gap-3 border border-[#d5ddd4] bg-[#fafcf9] p-3 text-xs leading-5 text-[#536158]">
            <input type="checkbox" checked={runLegacyJudge} onChange={(event) => setRunLegacyJudge(event.target.checked)} className="mt-1" />
            <span><strong className="block text-[#26332c]">可选 Legacy Model Judge</strong>每个 case 额外调用一次当前模型，并把真实 section 片段发送给该模型做主观对照。结果单独显示，永不改变确定性总分或自动修改 Prompt。</span>
          </label>
        </div>
      </section>

      {batch ? (
        <>
          <section className="border border-[#d5ddd4] bg-[#17201b] p-5 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{batch.scopeLabel}</h3>
                  <StatusPill status={batch.status} />
                </div>
                <p className="mt-1 font-mono text-[10px] text-[#aebdb5]">Batch {batch.id} · {new Date(batch.createdAt).toLocaleString("zh-CN")}</p>
              </div>
              <div className="grid grid-cols-3 gap-5 text-center sm:grid-cols-6">
                <Metric label="Cases" value={batch.cases.length} />
                <Metric label="Done" value={completed} />
                <Metric label="Failed" value={failed} />
                <Metric label="Data" value={attributionCounts?.data_incomplete || 0} />
                <Metric label="Workflow" value={(attributionCounts?.prompt_or_workflow || 0) + (attributionCounts?.prompt_incomplete || 0)} />
                <Metric label="Hard fail" value={batch.cases.filter((item) => Boolean(item.result?.deterministicEvaluation?.hardFailures.length)).length} />
              </div>
            </div>
            <div className="mt-5 h-2 bg-white/10"><div className="h-full bg-[#f2c14e] transition-all" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-right font-mono text-[10px] text-[#b9c7bf]">{finished}/{batch.cases.length} · {progress}%</p>
          </section>

          <section className="border border-[#d5ddd4] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#d5ddd4] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Case-by-case RCA</h3>
                <p className="mt-1 text-xs text-[#738078]">点击每一行右侧箭头，查看确定性指标、clean / annotated draft、真实 section、运行快照与准备数据。</p>
              </div>
              <input value={caseFilter} onChange={(event) => { setCaseFilter(event.target.value); setVisibleCases(100); }} placeholder="筛选公司 / section / 状态…" className="h-9 w-full border border-[#cbd4cc] px-3 text-sm sm:w-72" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#d5ddd4] bg-[#f7faf6] text-[10px] uppercase tracking-[0.12em] text-[#68756d]">
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Section</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Root cause</th>
                    <th className="px-4 py-3 font-semibold">Scores</th>
                    <th className="px-4 py-3 text-right font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.slice(0, visibleCases).map((item) => {
                    const open = expandedCaseId === item.id;
                    return (
                      <CaseRow key={item.id} item={item} open={open} onToggle={() => setExpandedCaseId(open ? "" : item.id)} getSection={getSection} />
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredCases.length > visibleCases ? (
              <button onClick={() => setVisibleCases((value) => value + 100)} className="m-4 h-9 border border-[#cbd4cc] px-4 text-xs font-semibold">
                再显示 100 个 · 剩余 {filteredCases.length - visibleCases}
              </button>
            ) : null}
          </section>

          {suggestionEntries.length ? (
            <section className="grid border border-[#d5ddd4] bg-white lg:grid-cols-[280px_1fr]">
              <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] p-2 lg:border-b-0 lg:border-r">
                <div className="px-3 py-3">
                  <h3 className="font-semibold">Prompt 修改建议</h3>
                  <p className="mt-1 text-xs leading-5 text-[#738078]">每个 section / batch 仅一轮</p>
                </div>
                {suggestionEntries.map(([sectionId, state]) => (
                  <button key={sectionId} onClick={() => setSuggestionSection(sectionId)} className={`mb-1 flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-xs ${suggestionSection === sectionId ? "bg-white shadow-sm" : "hover:bg-white/70"}`}>
                    <span className="truncate font-semibold">{promptBySection.get(sectionId)?.name || sectionId}</span>
                    <span className="font-mono text-[10px] text-[#68756d]">{state.status}</span>
                  </button>
                ))}
              </aside>
              <div className="min-w-0 p-5">
                {!activeSuggestion ? <EmptyPanel>选择一个 section 查看本轮建议。</EmptyPanel> : null}
                {activeSuggestion?.status === "running" || activeSuggestion?.status === "queued" ? <EmptyPanel>正在汇总该 section 的 batch RCA，并形成一轮通用建议…</EmptyPanel> : null}
                {activeSuggestion?.status === "error" ? <EmptyPanel>{activeSuggestion.error}</EmptyPanel> : null}
                {activeSuggestion?.suggestion && activePrompt ? (
                  <PromptSuggestionView
                    requirements={overrides[activePrompt.id]?.requirements || activePrompt.requirements}
                    state={activeSuggestion}
                    onAccept={() => void decideSuggestion(suggestionSection, "accepted")}
                    onReject={() => void decideSuggestion(suggestionSection, "rejected")}
                  />
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <EmptyPanel>配置模型与实验范围后开始 batch。尚未调用任何模型 API。</EmptyPanel>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xl font-semibold">{formatNumber(value)}</p><p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#aebdb5]">{label}</p></div>;
}

function CaseRow({ item, open, onToggle, getSection }: { item: ExperimentCase; open: boolean; onToggle: () => void; getSection: (companyId: string, sectionId: string, atomOffset?: number) => Promise<DeveloperSectionPage> }) {
  const diagnosis = item.result?.diagnosis;
  const evaluation = item.result?.deterministicEvaluation;
  const labels = { data_incomplete: "数据不全", prompt_incomplete: "Prompt 不全", prompt_or_workflow: "Prompt / Workflow", model_limitation: "模型能力限制", none: "通过" };
  return (
    <>
      <tr className="border-b border-[#e8ede8] text-xs hover:bg-[#fafcf9]">
        <td className="max-w-xs px-4 py-3"><p className="truncate font-semibold">{item.companyName}</p><p className="mt-1 font-mono text-[9px] text-[#7b877f]">{item.companyId}</p></td>
        <td className="px-4 py-3"><p className="font-semibold">{item.sectionName}</p><p className="mt-1 font-mono text-[9px] text-[#7b877f]">{item.sectionId}</p></td>
        <td className="px-4 py-3"><StatusPill status={item.status} />{item.status === "running" && item.unitProgress ? <p className="mt-1 max-w-xs truncate text-[10px] text-[#507069]" title={item.unitProgress.current}>unit {item.unitProgress.completed + 1}/{item.unitProgress.total} · {item.unitProgress.current}</p> : null}{item.error ? <p className="mt-1 max-w-xs truncate text-[10px] text-[#a64934]" title={item.error}>{item.error}</p> : null}</td>
        <td className="px-4 py-3">{diagnosis ? <><span className="font-semibold">{labels[diagnosis.primaryAttribution]}</span><span className="ml-2 font-mono text-[10px] text-[#7b877f]">{diagnosis.confidence}%</span></> : "—"}</td>
        <td className="px-4 py-3 font-mono text-[10px] text-[#59675e]">{evaluation ? `O ${evaluation.overallScore} · R ${evaluation.requiredFactRecall} · N ${evaluation.numericFidelity.precision}/${evaluation.numericFidelity.recall} · S ${evaluation.structureCoverage}` : "—"}</td>
        <td className="px-4 py-3 text-right"><button disabled={!item.result} onClick={onToggle} aria-label="展开 RCA 详情" className="inline-flex h-8 w-8 items-center justify-center border border-[#ccd5cd] disabled:opacity-30"><Chevron open={open} /></button></td>
      </tr>
      {open && item.result ? <tr className="border-b border-[#d5ddd4]"><td colSpan={6} className="bg-[#f5f8f3] p-4"><CaseDetails item={item} getSection={getSection} /></td></tr> : null}
    </>
  );
}

function CaseDetails({ item, getSection }: { item: ExperimentCase; getSection: (companyId: string, sectionId: string, atomOffset?: number) => Promise<DeveloperSectionPage> }) {
  const [section, setSection] = useState<DeveloperSection | null>(null);
  const [error, setError] = useState("");
  const [draftView, setDraftView] = useState<"clean" | "annotated">("clean");
  useEffect(() => {
    let active = true;
    getSection(item.companyId, item.sectionId)
      .then((page) => active && setSection(page.section))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "数据加载失败。"));
    return () => { active = false; };
  }, [getSection, item.companyId, item.sectionId]);
  const diagnosis = item.result!.diagnosis;
  const evaluation = item.result!.deterministicEvaluation;
  const manifest = item.result!.runManifest;
  const legacyJudge = item.result!.legacyModelJudge;
  const attributionLabels = { data_incomplete: "数据不全", prompt_incomplete: "Prompt 不全", prompt_or_workflow: "Prompt / Workflow", model_limitation: "模型能力限制", none: "无硬失败" };
  if (error) return <p className="text-sm text-[#a64934]">{error}</p>;
  if (!section) return <p className="text-sm text-[#6c7971]">正在加载对照数据…</p>;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[220px_1fr_1fr]">
        <div className="border border-[#d5ddd4] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">Primary attribution</p><p className="mt-2 text-lg font-semibold">{attributionLabels[diagnosis.primaryAttribution]}</p><p className="mt-1 font-mono text-xs text-[#66746b]">confidence {diagnosis.confidence}%</p></div>
        <div className="border border-[#d5ddd4] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">RCA summary</p><p className="mt-2 text-sm leading-6">{diagnosis.summary}</p></div>
        <div className="border border-[#d5ddd4] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">Recommended action</p><p className="mt-2 text-sm leading-6">{diagnosis.recommendedAction}</p></div>
      </div>
      {evaluation ? (
        <div className="border border-[#d5ddd4] bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">Deterministic evaluation</p><p className="mt-1 text-2xl font-semibold">{evaluation.overallScore}<span className="text-sm font-normal text-[#748078]"> / 100</span></p></div>
            {manifest ? <p className="max-w-3xl text-right font-mono text-[9px] leading-5 text-[#758179]">contract {manifest.contractVersion} · {manifest.contractSourceHash.slice(0, 12)}<br />prompt {manifest.promptSha.slice(0, 12)} · {manifest.provider}/{manifest.model}<br />data {manifest.dataAuditVersion || manifest.datasetGeneratedAt || "unknown"} · profile {manifest.structureProfileSource || "contract only"}</p> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <ScoreTile label="Input fields" value={evaluation.inputFieldCoverage} />
            <ScoreTile label="Required facts" value={evaluation.requiredFactRecall} />
            <ScoreTile label="Numeric P / R" value={`${evaluation.numericFidelity.precision} / ${evaluation.numericFidelity.recall}`} />
            <ScoreTile label="Grounded claims" value={evaluation.groundedClaimPrecision} />
            <ScoreTile label="Structure" value={evaluation.structureCoverage} />
            <ScoreTile label="Outline order" value={evaluation.outlineOrderSimilarity} />
            <ScoreTile label="Reference outline" value={evaluation.referenceOutlineSimilarity} />
            <ScoreTile label="Length profile" value={evaluation.lengthProfile} />
            <ScoreTile label="Placeholders" value={evaluation.placeholderIntegrity} />
            <ScoreTile label="Cross-section" value={evaluation.crossSectionConsistency} />
          </div>
          {evaluation.hardFailures.length ? <div className="mt-3 border-l-2 border-[#c75b45] bg-[#fff1ed] p-3 text-xs leading-5 text-[#8b3f31]"><strong>硬失败</strong><ul className="mt-1 list-disc pl-4">{evaluation.hardFailures.map((failure) => <li key={failure}>{failure}</li>)}</ul></div> : <p className="mt-3 border-l-2 border-[#3e806f] bg-[#edf7f3] p-3 text-xs text-[#286456]">未触发无依据数字、日期、主体或非通用硬编码等硬失败。</p>}
        </div>
      ) : null}
      {legacyJudge ? (
        <div className="border border-[#d5ddd4] bg-[#fafcf9] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">Legacy model judge · optional</p><p className="mt-2 text-sm leading-6 text-[#47544c]">{legacyJudge.summary}</p></div>
            <p className="font-mono text-xs text-[#66746b]">confidence {legacyJudge.confidence}% · does not affect score</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ScoreTile label="Completeness" value={legacyJudge.dimensions.completeness} />
            <ScoreTile label="Factuality" value={legacyJudge.dimensions.factuality} />
            <ScoreTile label="Structure" value={legacyJudge.dimensions.structure} />
            <ScoreTile label="Style" value={legacyJudge.dimensions.style} />
          </div>
        </div>
      ) : item.result!.legacyModelJudgeError ? (
        <p className="border-l-2 border-[#c75b45] bg-[#fff1ed] p-3 text-xs text-[#8b3f31]">Legacy model judge 未完成：{item.result!.legacyModelJudgeError}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <ListPanel title="数据缺口" items={diagnosis.dataGaps} />
        <ListPanel title="Prompt 缺口" items={diagnosis.promptGaps} />
        <ListPanel title="模型限制" items={diagnosis.modelLimitations} />
      </div>
      <div className="flex justify-end bg-[#e9eee8] p-1">
        <button onClick={() => setDraftView("clean")} className={`h-8 px-3 text-xs font-semibold ${draftView === "clean" ? "bg-white shadow-sm" : "text-[#66746b]"}`}>Clean draft</button>
        <button onClick={() => setDraftView("annotated")} className={`h-8 px-3 text-xs font-semibold ${draftView === "annotated" ? "bg-white shadow-sm" : "text-[#66746b]"}`}>Annotated draft</button>
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        <TextPanel title="真实招股说明书 Section" meta={`${item.result!.contextCoverage.referenceCharactersUsed}/${item.result!.contextCoverage.referenceCharacters} chars used`} text={section.referenceText} />
        <TextPanel title={draftView === "clean" ? "Clean Draft" : "Annotated Draft"} meta={draftView === "clean" ? `${item.result!.model} · ${item.result!.provider}` : "证据引用 · 缺口 · 核验记录"} text={draftView === "clean" ? item.result!.cleanDraft || item.result!.generatedOutput : item.result!.annotatedDraft || item.result!.generatedOutput} code={draftView === "annotated"} />
        <TextPanel title="当前 Prompt（运行快照）" meta={`${item.promptSnapshot.length} chars`} text={item.promptSnapshot} code />
        <TextPanel title="准备数据" meta={`${item.result!.contextCoverage.preparedDataCharactersUsed}/${item.result!.contextCoverage.preparedDataCharacters} chars used`} text={JSON.stringify(section.preparedData, null, 2)} code />
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number | string }) {
  return <div className="bg-[#f5f8f3] px-3 py-2"><p className="font-mono text-sm font-semibold text-[#26332c]">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[0.11em] text-[#718077]">{label}</p></div>;
}

function ListPanel({ title, items }: { title: string; items: string[] }) {
  return <div className="border border-[#d5ddd4] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#708078]">{title}</p>{items.length ? <ul className="mt-2 space-y-2 text-xs leading-5 text-[#4f5d54]">{items.map((item, index) => <li key={index} className="border-l-2 border-[#ccd5cd] pl-2">{item}</li>)}</ul> : <p className="mt-2 text-xs text-[#87928b]">未识别</p>}</div>;
}

function PromptSuggestionView({ requirements, state, onAccept, onReject }: { requirements: string; state: SuggestionState; onAccept: () => void; onReject: () => void }) {
  const suggestion = state.suggestion!;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[#d5ddd4] pb-5 md:flex-row md:items-start md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#267267]">Round 1 · {suggestion.basedOnCaseCount} cases</p><h3 className="mt-1 text-lg font-semibold">{suggestion.summary}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6d64]">{suggestion.rationale}</p></div>
        <div className="flex shrink-0 gap-2">
          <button disabled={["accepted", "rejected"].includes(state.status)} onClick={onReject} className="h-9 border border-[#cbd4cc] px-4 text-xs font-semibold disabled:opacity-40">拒绝</button>
          <button disabled={["accepted", "rejected"].includes(state.status)} onClick={onAccept} className="h-9 bg-[#267267] px-4 text-xs font-semibold text-white disabled:opacity-40">采纳此 Diff</button>
        </div>
      </div>
      {["accepted", "rejected"].includes(state.status) ? <p className={`border-l-2 px-3 py-2 text-sm ${state.status === "accepted" ? "border-[#3e806f] bg-[#edf7f3] text-[#286456]" : "border-[#9a6a5d] bg-[#fbf2ef] text-[#7d4b3e]"}`}>{state.status === "accepted" ? "已采纳：新 prompt 已进入 Prompt Management 的当前版本。" : "已拒绝：当前 prompt 未修改。"}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2"><ListPanel title="建议新增" items={suggestion.additions} /><ListPanel title="建议删除 / 收紧" items={suggestion.removals} /></div>
      <div className="grid gap-4 lg:grid-cols-2"><ExamplePanel good title="好的写法" text={suggestion.goodExample} /><ExamplePanel title="不好的写法" text={suggestion.badExample} /></div>
      <div className="grid gap-4 2xl:grid-cols-2"><TextPanel title="当前 Section Requirements" text={requirements} code /><TextPanel title="建议 Section Requirements" text={suggestion.revisedRequirements} code /></div>
      <p className="border-l-2 border-[#d3a52c] bg-[#fff8e5] px-3 py-2 text-xs leading-5 text-[#69551b]">{suggestion.caution}</p>
    </div>
  );
}

function ExamplePanel({ title, text, good = false }: { title: string; text: string; good?: boolean }) {
  return <div className={`border p-4 ${good ? "border-[#bad5cc] bg-[#f1f8f5]" : "border-[#e1c8bf] bg-[#fff7f4]"}`}><p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${good ? "text-[#2c6e5d]" : "text-[#995744]"}`}>{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3d4a42]">{text || "—"}</p></div>;
}

export function DeveloperToolsApp() {
  const [tab, setTab] = useState<TabId>("prompts");
  const [index, setIndex] = useState<DeveloperDatasetIndex | null>(null);
  const [prompts, setPrompts] = useState<DeveloperPrompt[]>([]);
  const [overrides, setOverrides] = useState<Record<string, StoredPrompt>>({});
  const [promptSync, setPromptSync] = useState<DeveloperPromptSyncStatus | null>(null);
  const [health, setHealth] = useState<DeveloperToolsHealth | null>(null);
  const [promptMutation, setPromptMutation] = useState<PromptMutationState>({ status: "idle" });
  const [loading, setLoading] = useState(true);
  const [promptError, setPromptError] = useState("");
  const [datasetError, setDatasetError] = useState("");
  const companyCache = useRef(new Map<string, DeveloperCompanyOverview>());
  const sectionCache = useRef(new Map<string, DeveloperSectionPage>());

  useEffect(() => {
    let localOverrides: Record<string, StoredPrompt> = {};
    try {
      localOverrides = JSON.parse(
        localStorage.getItem(PROMPT_STORAGE_KEY) || "{}"
      ) as Record<string, StoredPrompt>;
    } catch {
      localOverrides = {};
    }
    Promise.allSettled([
      apiJson<DeveloperDatasetIndex>("/api/developer-tools/dataset"),
      apiJson<DeveloperPromptsResponse>("/api/developer-tools/prompts"),
      apiJson<DeveloperToolsHealth>("/api/developer-tools/health"),
    ])
      .then(([datasetResult, promptResult, healthResult]) => {
        if (datasetResult.status === "fulfilled") {
          setIndex(datasetResult.value);
        } else {
          setDatasetError(
            datasetResult.reason instanceof Error
              ? datasetResult.reason.message
              : "Dataset Management 数据包不可用。"
          );
        }
        if (promptResult.status === "fulfilled") {
          const promptData = promptResult.value;
          setPrompts(promptData.prompts);
          setPromptSync(promptData.sync);
          const nextOverrides = promptData.sync.configured
            ? promptData.overrides
            : { ...localOverrides, ...promptData.overrides };
          setOverrides(nextOverrides);
          localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(nextOverrides));
        } else {
          setPromptError(
            promptResult.reason instanceof Error
              ? promptResult.reason.message
              : "Prompt Management 数据不可用。"
          );
        }
        if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const getCompany = useCallback(async (id: string) => {
    const cached = companyCache.current.get(id);
    if (cached) return cached;
    const company = await apiJson<DeveloperCompanyOverview>(`/api/developer-tools/dataset/${encodeURIComponent(id)}`);
    companyCache.current.set(id, company);
    return company;
  }, []);

  const getSection = useCallback(async (companyId: string, sectionId: string, atomOffset = 0) => {
    const key = `${companyId}:${sectionId}:${atomOffset}`;
    const cached = sectionCache.current.get(key);
    if (cached) return cached;
    const page = await apiJson<DeveloperSectionPage>(
      `/api/developer-tools/dataset/${encodeURIComponent(companyId)}/${encodeURIComponent(sectionId)}?atomOffset=${atomOffset}`
    );
    sectionCache.current.set(key, page);
    return page;
  }, []);

  async function savePrompt(
    id: string,
    requirements: string,
    source: StoredPrompt["source"] = "manual"
  ): Promise<boolean> {
    setPromptMutation({ status: "syncing", promptId: id });
    try {
      const result = await apiJson<DeveloperPromptMutationResponse>(
        "/api/developer-tools/prompts",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, requirements, source }),
        }
      );
      if (!result.override) throw new Error("GitHub did not return the saved requirements.");
      const next = { ...overrides, [id]: result.override };
      setOverrides(next);
      setPromptSync(result.sync);
      localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(next));
      setPromptMutation({
        status: "success",
        promptId: id,
        message: `已同步到 ${result.sync.repository}/${result.sync.branch}`,
        commitUrl: result.override.commitUrl,
      });
      return true;
    } catch (reason) {
      setPromptMutation({
        status: "error",
        promptId: id,
        message: reason instanceof Error ? reason.message : "GitHub prompt 同步失败。",
      });
      return false;
    }
  }

  async function resetPrompt(id: string): Promise<boolean> {
    setPromptMutation({ status: "syncing", promptId: id });
    try {
      const result = await apiJson<DeveloperPromptMutationResponse>(
        "/api/developer-tools/prompts",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      const next = { ...overrides };
      delete next[id];
      setOverrides(next);
      setPromptSync(result.sync);
      localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(next));
      setPromptMutation({
        status: "success",
        promptId: id,
        message: result.removed
          ? "已在 GitHub 恢复首次网页修改前的 baseline。"
          : "GitHub 中没有需要恢复的网页覆盖版本。",
      });
      return true;
    } catch (reason) {
      setPromptMutation({
        status: "error",
        promptId: id,
        message: reason instanceof Error ? reason.message : "GitHub prompt 恢复失败。",
      });
      return false;
    }
  }

  async function logout() {
    await fetch("/api/developer-tools/auth/logout", { method: "POST" });
    window.location.assign("/developer-tools/login");
  }

  return (
    <main className="min-h-screen bg-[#eef2ec] text-[#17201b]">
      <header className="sticky top-0 z-50 border-b border-[#cbd5cc] bg-[#f8faf6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/app-icon.png" alt="" width={34} height={34} />
            <div className="min-w-0"><p className="truncate text-sm font-semibold">AI Prospectus · Developer Tools</p><p className="hidden text-[10px] uppercase tracking-[0.16em] text-[#6c7971] sm:block">Prompt evaluation & root cause analysis</p></div>
          </div>
          <div className="flex items-center gap-2"><Link href="/" className="h-9 border border-[#c9d3ca] px-3 py-2 text-xs font-semibold hover:bg-white">返回网站</Link><button onClick={logout} className="h-9 bg-[#17201b] px-3 text-xs font-semibold text-white">退出</button></div>
        </div>
        <nav className="mx-auto flex max-w-[1800px] gap-1 overflow-x-auto px-4 sm:px-6">
          {([
            ["prompts", "Prompt Management", "31 个 section prompt"],
            ["dataset", "Dataset Management", "125 家公司真实语料"],
            ["rca", "RCA Experiments", "生成 · 对照 · 归因 · Diff"],
          ] as const).map(([id, label, detail]) => (
            <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-4 py-3 text-left transition ${tab === id ? "border-[#267267] bg-white/70 text-[#17201b]" : "border-transparent text-[#617067] hover:bg-white/50"}`}><span className="block whitespace-nowrap text-xs font-semibold sm:text-sm">{label}</span><span className="hidden whitespace-nowrap text-[9px] text-[#7b877f] md:block">{detail}</span></button>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
        {health ? (
          <section className="mb-4 grid gap-px overflow-hidden border border-[#cbd5cc] bg-[#cbd5cc] sm:grid-cols-3">
            <HealthCard
              label="Dataset"
              ok={health.dataset.ready}
              detail={health.dataset.ready ? `${health.dataset.companyCount} companies · ${health.dataset.sectionCount} sections · contract ${health.dataset.contractCount}/31 · profiles ${health.dataset.structureProfileCount}/31 · coverage S ${health.dataset.shortSectionCoveragePercent}% / L ${health.dataset.longSectionCoveragePercent}%` : health.dataset.error || "审计、contract 或结构 profile 未达标"}
            />
            <HealthCard
              label="Prompt sync"
              ok={health.promptSync.ready}
              detail={health.promptSync.ready ? `${health.promptSync.repository} · ${health.promptSync.branch}` : health.promptSync.error || "GitHub 未就绪"}
            />
            <HealthCard
              label="RCA server keys"
              ok={health.rca.configuredProviders.length > 0}
              detail={health.rca.configuredProviders.length ? health.rca.configuredProviders.join(" · ") : "可在当前浏览器会话填写 API Key"}
            />
          </section>
        ) : null}
        {loading ? <EmptyPanel>正在加载 Prompt 与 125 家公司数据索引…</EmptyPanel> : null}
        {!loading && tab === "prompts" && promptError ? <EmptyPanel>{promptError}</EmptyPanel> : null}
        {!loading && tab === "prompts" && !promptError ? <PromptManagement prompts={prompts} overrides={overrides} sync={promptSync} mutation={promptMutation} onSave={savePrompt} onReset={resetPrompt} /> : null}
        {!loading && tab === "dataset" && datasetError ? <EmptyPanel>{datasetError}</EmptyPanel> : null}
        {!loading && tab === "dataset" && !datasetError && index ? <DatasetManagement index={index} getCompany={getCompany} getSection={getSection} /> : null}
        {!loading && tab === "rca" && (datasetError || promptError) ? <EmptyPanel>{datasetError || promptError}</EmptyPanel> : null}
        {!loading && tab === "rca" && !datasetError && !promptError && index ? <RcaWorkspace index={index} prompts={prompts} overrides={overrides} onAdoptPrompt={savePrompt} getSection={getSection} /> : null}
      </div>
    </main>
  );
}

function HealthCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#69766e]">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-[#2f806c]" : "bg-[#c45b45]"}`} aria-label={ok ? "ready" : "attention"} />
      </div>
      <p className="mt-1 truncate text-xs text-[#3f4d45]" title={detail}>{detail}</p>
    </div>
  );
}
