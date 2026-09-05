"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  DiagnosticCatalog,
  DiagnosticCause,
  DiagnosticCheck,
  DiagnosticGate,
  DiagnosticSourceDoc,
  DiagnosticTrace,
  DiagnosticWorkbookRow,
} from "@/lib/developer-tools-types";

type ViewId = "criteria" | "documents" | "fields" | "lab";

const CAUSE_LABEL: Record<DiagnosticCause, string> = {
  criteria: "规则 / 文档",
  extraction: "抽取 JSON",
  diagnostic: "诊断引擎",
  ready: "已打开",
};

const CAUSE_STYLE: Record<DiagnosticCause, string> = {
  criteria: "bg-[#fff2cf] text-[#805c0b]",
  extraction: "bg-[#eef2f6] text-[#334155]",
  diagnostic: "bg-[#efedff] text-[#342e70]",
  ready: "bg-[#e7f2e4] text-[#356a2d]",
};

const STATUS_STYLE: Record<string, string> = {
  PASS: "bg-[#e7f2e4] text-[#356a2d]",
  SHORTFALL: "bg-[#fff7ed] text-[#9a3412]",
  MISSING_INPUT: "bg-[#f1f5f9] text-[#334155]",
  INDETERMINATE: "bg-[#fefce8] text-[#854d0e]",
  NOT_EVALUATED: "bg-[#efedff] text-[#342e70]",
};

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-52 items-center justify-center border border-dashed border-[#cbd5cc] bg-[#fafcf9] p-8 text-center text-sm leading-6 text-[#728078]">
      {children}
    </div>
  );
}

function CauseChip({ cause }: { cause: DiagnosticCause }) {
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold ${CAUSE_STYLE[cause]}`}>
      {CAUSE_LABEL[cause]}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status] || "bg-[#edf0eb] text-[#647064]"}`}>
      {status}
    </span>
  );
}

function formatRequirement(check: DiagnosticCheck): string {
  const op = check.operator || "≥";
  const value = check.thresholdValue;
  const unit = check.thresholdUnit ? ` ${check.thresholdUnit}` : "";
  if (value === undefined || value === null || value === "") {
    return check.metric || check.id;
  }
  return `${check.metric || check.id}  ${op} ${value}${unit}`;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: unknown = {};
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

export function DeveloperDiagnosticWorkspace() {
  const [catalog, setCatalog] = useState<DiagnosticCatalog | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewId>("criteria");

  async function reload() {
    setLoading(true);
    setError("");
    try {
      setCatalog(await apiJson<DiagnosticCatalog>("/api/developer-tools/diagnostic"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "IPO Diagnostic 数据不可用。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (loading && !catalog) {
    return <EmptyPanel>正在加载 IPO 诊断规则、update 文档和门槛总表…</EmptyPanel>;
  }
  if (error && !catalog) return <EmptyPanel>{error}</EmptyPanel>;
  if (!catalog) return <EmptyPanel>未找到诊断目录。</EmptyPanel>;

  return (
    <div className="border border-[#d5ddd4] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#d5ddd4] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#66746b]">
            三因对照
          </p>
          <h2 className="mt-1 text-lg font-semibold">未评估，到底是规则、文档，还是抽取？</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d6a62]">
            工作区里大量「未评估」通常不是单一 bug。这里把同一条门槛拆成三层：YAML
            规则有没有被关掉、update 文档 / 工作簿写没写清、公司 JSON 有没有抽出对应字段。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <SummaryStat label="规则条数" value={catalog.summary.gateCount} />
          <SummaryStat label="已打开" value={catalog.summary.readyCount} tone="ready" />
          <SummaryStat label="规则关掉" value={catalog.summary.criteriaCount} tone="criteria" />
          <SummaryStat label="定性 / AI" value={catalog.summary.diagnosticCount} tone="diagnostic" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-[#d5ddd4] bg-[#f5f8f3] px-4 py-2">
        {(
          [
            ["criteria", "规则门槛", `${catalog.summary.gateCount} 条`],
            ["documents", "源文档", catalog.summary.xlsxPresent ? "含 Excel 总表" : "CSV 快照"],
            ["fields", "字段对照", `${catalog.fields.length} 个 JSON 路径`],
            ["lab", "归因实验", "粘贴公司 JSON"],
          ] as const
        ).map(([id, label, detail]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`px-3 py-2 text-left ${
              view === id ? "bg-white shadow-sm" : "text-[#5f6d64] hover:bg-white/70"
            }`}
          >
            <span className="block text-xs font-semibold">{label}</span>
            <span className="block text-[10px] text-[#7b877f]">{detail}</span>
          </button>
        ))}
        <button
          onClick={() => void reload()}
          className="ml-auto h-9 border border-[#cbd4cc] px-3 text-xs font-semibold hover:bg-white"
        >
          重新加载
        </button>
      </div>

      {view === "criteria" ? <CriteriaView catalog={catalog} onSaved={reload} /> : null}
      {view === "documents" ? <DocumentsView catalog={catalog} /> : null}
      {view === "fields" ? <FieldsView catalog={catalog} /> : null}
      {view === "lab" ? <LabView catalog={catalog} /> : null}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: DiagnosticCause;
}) {
  return (
    <div className={`min-w-[88px] border border-[#d5ddd4] px-3 py-2 ${tone ? CAUSE_STYLE[tone] : "bg-[#f8faf7]"}`}>
      <p className="text-[10px] uppercase tracking-[0.12em]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function CriteriaView({
  catalog,
  onSaved,
}: {
  catalog: DiagnosticCatalog;
  onSaved: () => Promise<void>;
}) {
  const [marketKey, setMarketKey] = useState(catalog.markets[0]?.key || "");
  const [causeFilter, setCauseFilter] = useState<DiagnosticCause | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");

  const visible = useMemo(() => {
    return catalog.gates.filter((gate) => {
      const inMarket = !marketKey || gate.marketKeys.includes(marketKey) || gate.marketKeys.length === 0;
      const inCause = causeFilter === "all" || gate.staticCause === causeFilter;
      const hay = `${gate.title} ${gate.id} ${gate.ruleset} ${gate.ruleRef}`.toLowerCase();
      return inMarket && inCause && hay.includes(query.toLowerCase());
    });
  }, [catalog.gates, marketKey, causeFilter, query]);

  const selected =
    visible.find((gate) => `${gate.ruleset}:${gate.id}` === selectedKey) ||
    visible[0] ||
    catalog.gates[0];

  useEffect(() => {
    if (!selected) return;
    const key = `${selected.ruleset}:${selected.id}`;
    if (key !== selectedKey) setSelectedKey(key);
  }, [selected, selectedKey]);

  return (
    <div className="grid min-h-[calc(100vh-320px)] grid-cols-1 lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-[#d5ddd4] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#66746b]">Diagnostic gates</p>
          <select
            value={marketKey}
            onChange={(event) => setMarketKey(event.target.value)}
            className="h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
          >
            {catalog.markets.map((market) => (
              <option key={market.key} value={market.key}>
                {market.labelZh}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索门槛、条款、YAML id…"
            className="h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
          />
          <div className="flex flex-wrap gap-1">
            {(["all", "criteria", "diagnostic", "ready"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setCauseFilter(item)}
                className={`px-2 py-1 text-[10px] font-semibold ${
                  causeFilter === item ? "bg-[#17201b] text-white" : "bg-white text-[#5f6d64]"
                }`}
              >
                {item === "all" ? `全部 ${visible.length}` : CAUSE_LABEL[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[calc(100vh-430px)] overflow-y-auto p-2">
          {visible.map((gate) => (
            <button
              key={`${gate.ruleset}-${gate.id}`}
              onClick={() => setSelectedKey(`${gate.ruleset}:${gate.id}`)}
              className={`mb-1 w-full border-l-2 px-3 py-3 text-left ${
                selected?.id === gate.id && selected.ruleset === gate.ruleset
                  ? "border-[#267267] bg-white shadow-sm"
                  : "border-transparent hover:bg-white/70"
              }`}
            >
              <span className="block text-sm font-semibold">{gate.title}</span>
              <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-[#7a877f]">
                <span className="truncate">{gate.id}</span>
                <CauseChip cause={gate.staticCause} />
              </span>
            </button>
          ))}
        </div>
      </aside>
      {selected ? <GateEditor gate={selected} catalog={catalog} onSaved={onSaved} /> : <EmptyPanel>请选择一条门槛。</EmptyPanel>}
    </div>
  );
}

function GateEditor({
  gate,
  catalog,
  onSaved,
}: {
  gate: DiagnosticGate;
  catalog: DiagnosticCatalog;
  onSaved: () => Promise<void>;
}) {
  const [evaluated, setEvaluated] = useState(gate.evaluated);
  const [stubReason, setStubReason] = useState(gate.stubReason || "");
  const [title, setTitle] = useState(gate.title);
  const [ruleRef, setRuleRef] = useState(gate.ruleRef);
  const [checks, setChecks] = useState(gate.checks);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEvaluated(gate.evaluated);
    setStubReason(gate.stubReason || "");
    setTitle(gate.title);
    setRuleRef(gate.ruleRef);
    setChecks(gate.checks);
    setMessage("");
    setError("");
  }, [gate]);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiJson("/api/developer-tools/diagnostic/gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFile: gate.sourceFile,
          gateId: gate.id,
          evaluated,
          stubReason,
          title,
          ruleRef,
          checks: checks.map((check) => ({
            id: check.id,
            thresholdValue: check.thresholdValue,
            thresholdUnit: check.thresholdUnit,
          })),
        }),
      });
      setMessage(`已写入本地 ${gate.sourceFile}。重新加载后，左侧归因会按新开关计算。`);
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  const markets = catalog.markets.filter((market) => gate.marketKeys.includes(market.key));

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[#d5ddd4] px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{gate.title}</h3>
            <CauseChip cause={gate.staticCause} />
            {gate.layer === "soft" ? <span className="bg-[#eee8ff] px-2 py-0.5 text-[10px] font-semibold text-[#5d47a3]">SOFT</span> : null}
          </div>
          <p className="mt-1 font-mono text-xs text-[#728078]">
            {gate.sourceFile} · {gate.id} · {gate.ruleRef || "无条款引用"}
          </p>
        </div>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="h-9 bg-[#17201b] px-4 text-xs font-semibold text-white disabled:opacity-40"
        >
          {saving ? "写入 YAML…" : "保存到本地 YAML"}
        </button>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5 p-5">
          <div className={`border-l-2 p-3 text-sm leading-6 ${CAUSE_STYLE[gate.staticCause]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">未评估归因（不需要公司数据）</p>
            <p className="mt-1">{gate.staticReason}</p>
          </div>

          <label className="flex items-center justify-between gap-4 border border-[#d5ddd4] bg-[#fbfcfa] px-4 py-3">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#65736a]">评估开关 · evaluated</span>
              <span className="mt-1 block text-sm text-[#536158]">
                关掉 = 工作区必然显示未评估。打开后才会拿公司 JSON 比门槛。
              </span>
            </span>
            <input
              type="checkbox"
              checked={evaluated}
              onChange={(event) => setEvaluated(event.target.checked)}
              disabled={gate.requiresLlm || gate.layer === "soft"}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">标题</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-10 w-full border border-[#d4dcd4] bg-[#fbfcfa] px-3 text-sm outline-none focus:border-[#267267]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">规则引用</span>
            <input
              value={ruleRef}
              onChange={(event) => setRuleRef(event.target.value)}
              className="mt-2 h-10 w-full border border-[#d4dcd4] bg-[#fbfcfa] px-3 text-sm outline-none focus:border-[#267267]"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">关掉原因 · stub_reason</span>
            <textarea
              value={stubReason}
              onChange={(event) => setStubReason(event.target.value)}
              className="mt-2 min-h-24 w-full border border-[#d4dcd4] bg-[#fbfcfa] p-3 text-sm outline-none focus:border-[#267267]"
              placeholder="例如：工作簿仍是 pending_text_check；本阶段没有该板块夹具。"
            />
          </label>

          {checks.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">硬门槛判断行</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#cfd8cf] text-[10px] uppercase tracking-[0.12em] text-[#6a776f]">
                      <th className="px-2 py-2">要判断什么</th>
                      <th className="px-2 py-2">公司 JSON 路径</th>
                      <th className="px-2 py-2">门槛</th>
                      <th className="px-2 py-2">单位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check, index) => (
                      <tr key={check.id || index} className="border-b border-[#edf0ec] align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{check.metric || check.id}</p>
                          <p className="font-mono text-[10px] text-[#7a877f]">{check.id}</p>
                        </td>
                        <td className="px-2 py-2 font-mono text-[11px] text-[#536158]">
                          {check.inputPath || (check.profileField ? `profile.${check.profileField}` : "—")}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={check.thresholdValue === undefined || check.thresholdValue === null ? "" : String(check.thresholdValue)}
                            onChange={(event) => {
                              const next = [...checks];
                              const raw = event.target.value;
                              next[index] = {
                                ...check,
                                thresholdValue: raw === "" || Number.isNaN(Number(raw)) ? raw : Number(raw),
                              };
                              setChecks(next);
                            }}
                            className="h-8 w-28 border border-[#d4dcd4] px-2 text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={check.thresholdUnit || ""}
                            onChange={(event) => {
                              const next = [...checks];
                              next[index] = { ...check, thresholdUnit: event.target.value };
                              setChecks(next);
                            }}
                            className="h-8 w-36 border border-[#d4dcd4] px-2 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#728078]">这条没有数字门槛，属于定性信号或结构条件。</p>
          )}

          {message ? <div className="border-l-2 border-[#3e806f] bg-[#edf7f3] p-3 text-xs text-[#286456]">{message}</div> : null}
          {error ? <div className="border-l-2 border-[#c75b45] bg-[#fff1ed] p-3 text-xs text-[#8b3f31]">{error}</div> : null}
        </div>

        <aside className="border-t border-[#d5ddd4] bg-[#f8faf7] p-5 xl:border-l xl:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">写进哪几个板块</p>
          <p className="mt-2 text-sm leading-6 text-[#536158]">
            {markets.length ? markets.map((item) => item.labelZh).join("、") : "未挂到具体上市板块"}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">人话对照</p>
          <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-[#536158]">
            {checks.length
              ? checks.map((check) => <li key={check.id || check.metric}>{formatRequirement(check)}</li>)
              : <li>{gate.condition || gate.substantiveConcern || "定性条款，不比数字。"}</li>}
          </ul>
          {gate.workbookRows?.length ? (
            <>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">工作簿对应行</p>
              <div className="mt-2 max-h-64 space-y-2 overflow-auto text-xs leading-5 text-[#536158]">
                {gate.workbookRows.map((row) => (
                  <WorkbookCard key={row.rowId} row={row} />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 border-l-2 border-[#d3a52c] bg-[#fff8e5] p-3 text-xs leading-5 text-[#69551b]">
              门槛总表里没有自动对上这一条。文档同事应检查 CSV / Excel 是否漏行，或条款引用是否和 YAML 不一致。
            </div>
          )}
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-[#65736a]">三因怎么读</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-[#536158]">
            {Object.entries(catalog.legend).map(([cause, text]) => (
              <li key={cause}>
                <CauseChip cause={cause as DiagnosticCause} />
                <span className="mt-1 block">{text}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

function WorkbookCard({ row }: { row: DiagnosticWorkbookRow }) {
  return (
    <div className="border border-[#d5ddd4] bg-white p-3">
      <p className="font-mono text-[10px] text-[#7a877f]">{row.rowId}</p>
      <p className="mt-1 font-medium">{row.limb || row.standard}</p>
      <p className="mt-1">
        {row.metricField} {row.op} {row.value} {row.unit}
      </p>
      <p className="mt-1">{row.citation}</p>
      <p className="mt-1 text-[#805c0b]">{row.verified || "verification unknown"}</p>
      {row.url ? (
        <a className="mt-1 block truncate underline" href={row.url} target="_blank" rel="noreferrer">
          官方原文
        </a>
      ) : null}
    </div>
  );
}

function DocumentsView({ catalog }: { catalog: DiagnosticCatalog }) {
  const [docId, setDocId] = useState(catalog.sourceDocs[0]?.id || "");
  const selected = catalog.sourceDocs.find((doc) => doc.id === docId) || catalog.sourceDocs[0];
  return (
    <div className="grid min-h-[calc(100vh-320px)] grid-cols-1 lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] p-2 lg:border-b-0 lg:border-r">
        {catalog.sourceDocs.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setDocId(doc.id)}
            className={`mb-1 w-full px-3 py-3 text-left ${
              selected?.id === doc.id ? "bg-[#17201b] text-white" : "hover:bg-white/70"
            }`}
          >
            <span className="block text-sm font-semibold">{doc.title}</span>
            <span className={`mt-1 block font-mono text-[10px] ${selected?.id === doc.id ? "text-[#c5d4cc]" : "text-[#7a877f]"}`}>
              {doc.exists ? doc.path : "文件不在仓库里"}
            </span>
          </button>
        ))}
      </aside>
      {selected ? <DocumentReader doc={selected} workbookRows={catalog.workbookRows} /> : <EmptyPanel>没有源文档。</EmptyPanel>}
    </div>
  );
}

function DocumentReader({
  doc,
  workbookRows,
}: {
  doc: DiagnosticSourceDoc;
  workbookRows: DiagnosticWorkbookRow[];
}) {
  const [query, setQuery] = useState("");
  const rows = workbookRows.filter((row) =>
    `${row.rowId} ${row.limb} ${row.citation} ${row.metricField}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="min-w-0 p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{doc.title}</h3>
        <p className="mt-1 font-mono text-xs text-[#728078]">{doc.path}</p>
        <p className="mt-3 text-sm leading-6 text-[#536158]">{doc.note}</p>
      </div>
      {!doc.exists ? (
        <EmptyPanel>仓库里找不到这个文件。文档同事需要把它放进 update/update 后，这里才能对照。</EmptyPanel>
      ) : null}
      {doc.kind === "xlsx" && doc.exists ? (
        <div className="border border-[#d5ddd4] bg-[#f8faf7] p-4 text-sm leading-6">
          <p>Excel 主工作簿在仓库中。数字以这本为准；下面门槛总表来自已提交的 CSV 快照，方便 diff。</p>
          {doc.sheets?.length ? (
            <ul className="mt-3 list-disc pl-5">
              {doc.sheets.map((sheet) => (
                <li key={sheet.name}>
                  {sheet.name} · {sheet.rows} 行
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {doc.kind === "markdown" && doc.content ? (
        <div className="prose prose-sm max-w-none border border-[#d5ddd4] bg-[#fbfcfa] p-5 text-[#26332c]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
        </div>
      ) : null}
      {(doc.kind === "csv" || doc.id === "xlsx") && workbookRows.length ? (
        <div className="mt-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索 row_id、条款、字段…"
            className="h-10 w-full max-w-md border border-[#ccd6cd] px-3 text-sm outline-none focus:border-[#267267]"
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#cfd8cf] uppercase tracking-[0.1em] text-[#6a776f]">
                  <th className="px-2 py-2">row</th>
                  <th className="px-2 py-2">板块</th>
                  <th className="px-2 py-2">判断行</th>
                  <th className="px-2 py-2">字段</th>
                  <th className="px-2 py-2">门槛</th>
                  <th className="px-2 py-2">核验</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 120).map((row) => (
                  <tr key={row.rowId} className="border-b border-[#edf0ec] align-top">
                    <td className="px-2 py-2 font-mono">{row.rowId}</td>
                    <td className="px-2 py-2">{row.board}</td>
                    <td className="px-2 py-2">{row.limb || row.standard}</td>
                    <td className="px-2 py-2 font-mono">{row.metricField}</td>
                    <td className="px-2 py-2">
                      {row.op} {row.value} {row.unit}
                    </td>
                    <td className="px-2 py-2">{row.verified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldsView({ catalog }: { catalog: DiagnosticCatalog }) {
  const [query, setQuery] = useState("");
  const [fieldKey, setFieldKey] = useState(catalog.fields[0]?.key || "");
  const fields = catalog.fields.filter((item) =>
    `${item.key} ${item.metrics.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  );
  const selected = fields.find((item) => item.key === fieldKey) || fields[0];
  const gates = selected
    ? catalog.gates.filter((gate) =>
        selected.gates.some((label) => label === `${gate.ruleset} / ${gate.id}`)
      )
    : [];

  return (
    <div className="grid min-h-[calc(100vh-320px)] grid-cols-1 lg:grid-cols-[320px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#d5ddd4] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#66746b]">JSON paths</p>
          <p className="mt-1 text-2xl font-semibold">{catalog.fields.length}</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索路径或指标…"
            className="mt-4 h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
          />
        </div>
        <div className="max-h-[calc(100vh-430px)] overflow-y-auto p-2">
          {fields.map((field) => (
            <button
              key={field.key}
              onClick={() => setFieldKey(field.key)}
              className={`mb-1 w-full px-3 py-3 text-left ${
                selected?.key === field.key ? "bg-[#17201b] text-white" : "hover:bg-white/70"
              }`}
            >
              <span className="block truncate font-mono text-[11px]">{field.key}</span>
              <span className={`mt-1 block text-[10px] ${selected?.key === field.key ? "text-[#c5d4cc]" : "text-[#7a877f]"}`}>
                {field.kind === "profile" ? "运行档案" : "公司 JSON"} · {field.gates.length} 条门槛
              </span>
            </button>
          ))}
        </div>
      </aside>
      {selected ? (
        <div className="p-5">
          <p className="font-mono text-xs text-[#267267]">{selected.kind}</p>
          <h3 className="mt-1 break-all text-lg font-semibold">{selected.key}</h3>
          <p className="mt-3 text-sm leading-6 text-[#536158]">
            诊断工作区传入的是抽取后的 JSON，不是原始财报。如果规则已打开，但这条路径在 JSON 里不存在，工作区会显示缺输入或未评估——那是抽取问题，不是文档没写门槛。
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#65736a]">用到这条路径的门槛</p>
          <div className="mt-3 space-y-2">
            {gates.map((gate) => (
              <div key={`${gate.ruleset}-${gate.id}`} className="border border-[#d5ddd4] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{gate.title}</p>
                  <CauseChip cause={gate.staticCause} />
                </div>
                <p className="mt-1 font-mono text-[10px] text-[#7a877f]">
                  {gate.ruleset} · {gate.id}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyPanel>没有字段。</EmptyPanel>
      )}
    </div>
  );
}

function LabView({ catalog }: { catalog: DiagnosticCatalog }) {
  const [marketKey, setMarketKey] = useState("hkex_main_board");
  const [jsonText, setJsonText] = useState("");
  const [fixture, setFixture] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [trace, setTrace] = useState<DiagnosticTrace | null>(null);
  const [causeFilter, setCauseFilter] = useState<DiagnosticCause | "all">("all");

  async function run(nextFixture?: string) {
    setRunning(true);
    setError("");
    try {
      let issuer: Record<string, unknown> | undefined;
      if (!nextFixture) {
        const trimmed = jsonText.trim();
        if (trimmed) issuer = JSON.parse(trimmed) as Record<string, unknown>;
      }
      const result = await apiJson<DiagnosticTrace>("/api/developer-tools/diagnostic/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketKey,
          fixture: nextFixture || undefined,
          issuer,
        }),
      });
      setTrace(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "归因失败。JSON 需要是一个对象。");
    } finally {
      setRunning(false);
    }
  }

  const gates = (trace?.gates || []).filter(
    (gate) => causeFilter === "all" || gate.runtimeCause === causeFilter
  );

  return (
    <div className="grid min-h-[calc(100vh-320px)] grid-cols-1 xl:grid-cols-[380px_1fr]">
      <aside className="border-b border-[#d5ddd4] bg-[#f5f8f3] p-5 xl:border-b-0 xl:border-r">
        <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#66746b]">Company JSON</p>
        <p className="mt-2 text-sm leading-6 text-[#536158]">
          把你们传给诊断工作区的同一份抽取 JSON 贴进来。系统用真实硬引擎跑一遍，并给每条未评估贴上三因标签。
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[#65736a]">目标市场</label>
        <select
          value={marketKey}
          onChange={(event) => setMarketKey(event.target.value)}
          className="mt-2 h-10 w-full border border-[#ccd6cd] bg-white px-3 text-sm outline-none focus:border-[#267267]"
        >
          {catalog.markets
            .filter((market) => market.key !== "qualitative")
            .map((market) => (
              <option key={market.key} value={market.key}>
                {market.labelZh}
              </option>
            ))}
        </select>
        <textarea
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value);
            setFixture("");
          }}
          spellCheck={false}
          placeholder='{"issuer_id":"…","financials":{…}}'
          className="mt-4 min-h-[32vh] w-full resize-y border border-[#d4dcd4] bg-white p-3 font-mono text-[11px] leading-5 outline-none focus:border-[#267267]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["synthetic_issuer", "港股夹具"],
            ["synthetic_ashare", "A股夹具"],
            ["synthetic_sgx", "新交所夹具"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setFixture(id);
                void run(id);
              }}
              className={`h-8 px-3 text-[11px] font-semibold ${
                fixture === id ? "bg-[#17201b] text-white" : "border border-[#cbd4cc] hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          disabled={running}
          onClick={() => void run()}
          className="mt-4 h-10 w-full bg-[#17201b] text-xs font-semibold text-white disabled:opacity-40"
        >
          {running ? "正在用硬引擎对照…" : "对这份 JSON 做归因"}
        </button>
        {error ? <p className="mt-3 text-xs leading-5 text-[#8b3f31]">{error}</p> : null}
      </aside>
      <section className="min-w-0 p-5">
        {!trace ? (
          <EmptyPanel>
            先选市场，再贴抽取 JSON 或点一个合成夹具。结果会按「规则/文档 / 抽取 JSON / 诊断引擎」分组。
          </EmptyPanel>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <SummaryStat label="达标" value={trace.summary.PASS || 0} tone="ready" />
              <SummaryStat label="未达标" value={trace.summary.SHORTFALL || 0} />
              <SummaryStat label="缺输入" value={trace.summary.MISSING_INPUT || 0} tone="extraction" />
              <SummaryStat label="未评估" value={trace.summary.NOT_EVALUATED || 0} tone="diagnostic" />
              <SummaryStat label="JSON 已有字段" value={trace.presentFieldCount} />
              <SummaryStat label="JSON 缺字段" value={trace.missingFieldCount} tone="extraction" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "criteria", "extraction", "diagnostic", "ready"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setCauseFilter(item)}
                  className={`px-2 py-1 text-[10px] font-semibold ${
                    causeFilter === item ? "bg-[#17201b] text-white" : "bg-[#edf1eb] text-[#5f6d64]"
                  }`}
                >
                  {item === "all" ? "全部结果" : CAUSE_LABEL[item]}
                  {item !== "all" && trace.summary[item] != null ? ` ${trace.summary[item]}` : ""}
                </button>
              ))}
            </div>
            {trace.missingFields.length ? (
              <details className="mt-4 border border-[#d5ddd4]">
                <summary className="cursor-pointer bg-[#f4f7f2] px-4 py-2 text-xs font-semibold">
                  这份 JSON 缺的路径（{trace.missingFields.length}）
                </summary>
                <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-5">
                  {trace.missingFields.join("\n")}
                </pre>
              </details>
            ) : null}
            <div className="mt-4 space-y-2">
              {gates.map((gate) => (
                <article key={`${gate.ruleset}-${gate.id}`} className="border border-[#d5ddd4] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{gate.title}</p>
                      <p className="font-mono text-[10px] text-[#7a877f]">
                        {gate.ruleset} · {gate.id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {gate.status ? <StatusChip status={gate.status} /> : null}
                      <CauseChip cause={gate.runtimeCause || gate.staticCause} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#536158]">{gate.runtimeReason || gate.staticReason}</p>
                  {gate.missingInputs?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-[#5d6a62]">
                      {gate.missingInputs.map((item) => (
                        <li key={`${item.checkId}-${item.path}`}>
                          <span className="font-mono">{item.path}</span> — {item.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
