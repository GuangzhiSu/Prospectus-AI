"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { PublicNav } from "@/components/PublicNav";

type Locale = "en" | "zh";
type InputMode = "documents" | "structured";
type Status =
  | "PASS"
  | "SHORTFALL"
  | "MISSING_INPUT"
  | "INDETERMINATE"
  | "NOT_EVALUATED"
  | "TRIGGERED"
  | "PASS_SIGNAL"
  | "DEFERRED_REVIEW";

type Market = {
  key: string;
  label: string;
  labelZh: string;
  rulesets: string[];
};

type ProfileValues = {
  issuerName: string;
  latestProfit: string;
  precedingTwoYearProfit: string;
  trackRecordProfit: string;
  latestRevenue: string;
  marketCap: string;
  operatingCashflow: string;
  managementContinuityYears: string;
  ownershipContinuity: "unknown" | "yes" | "no";
  wvrBeneficiaryOwnership: string;
  fxRate: string;
};

type EligibilityReport = {
  issuer_id?: string;
  summary?: { status_counts?: Record<string, number>; gates_total?: number };
  rulesets?: Array<{
    ruleset_name?: string;
    ruleset?: string;
    version?: string;
    gates?: Array<{
      gate_id: string;
      title: string;
      rule_ref: string;
      status: string;
      checks?: Array<{
        metric: string;
        status: string;
        required?: string;
        actual?: unknown;
        note?: string;
        rule_ref?: string;
      }>;
    }>;
  }>;
  soft_conditions?: Array<{
    gate_id: string;
    status: string;
    severity?: string;
    substantive_concern?: string;
    rationale?: string;
    triggered?: boolean;
    rule_ref?: string;
  }>;
  feedback?: {
    readiness?: string;
    headline?: string;
    summary?: string;
    strengths?: string[];
    gaps?: Array<{
      area?: string;
      severity?: string;
      detail?: string;
      rule_ref?: string;
      suggested_action?: string;
    }>;
    priority_actions?: string[];
    disclaimer?: string;
    stub?: boolean;
    source?: string;
    notes?: string[];
    llm_error?: string;
  };
  extraction?: {
    quantifiable?: Array<{
      field_id: string;
      value: unknown;
      unit?: string;
      confirmation_status?: string;
    }>;
    narrative?: Array<{ field_id?: string; text?: string; topic?: string }>;
    llm_stub?: boolean;
    notes?: string[];
  };
  disclaimer?: string;
};

const statusTone: Record<string, string> = {
  PASS: "border-[#0f766e] bg-[#e8f3ef] text-[#0f4f49]",
  SHORTFALL: "border-[#b45309] bg-[#fff7ed] text-[#9a3412]",
  MISSING_INPUT: "border-[#94a3b8] bg-[#f1f5f9] text-[#334155]",
  INDETERMINATE: "border-[#a16207] bg-[#fefce8] text-[#854d0e]",
  NOT_EVALUATED: "border-[#8c7ae6] bg-[#efedff] text-[#342e70]",
  TRIGGERED: "border-[#b45309] bg-[#fff7ed] text-[#9a3412]",
  PASS_SIGNAL: "border-[#0f766e] bg-[#e8f3ef] text-[#0f4f49]",
  DEFERRED_REVIEW: "border-[#8c7ae6] bg-[#efedff] text-[#342e70]",
};

const initialValues: ProfileValues = {
  issuerName: "",
  latestProfit: "",
  precedingTwoYearProfit: "",
  trackRecordProfit: "",
  latestRevenue: "",
  marketCap: "",
  operatingCashflow: "",
  managementContinuityYears: "",
  ownershipContinuity: "unknown",
  wvrBeneficiaryOwnership: "",
  fxRate: "",
};

const copy = {
  en: {
    navTitle: "IPO eligibility workspace",
    title: "Upload documents. Get listing readiness feedback.",
    subtitle:
      "Standalone diagnostic for HKEX, A-share, and SGX pathways. Hard thresholds are code — AI extracts facts and drafts feedback.",
    documents: "Upload documents",
    structured: "Structured fields",
    market: "Target market / board",
    uploadButton: "Select files",
    uploaded: "Uploaded",
    removeFile: "Remove",
    clearAllFiles: "Clear all uploads",
    dropTitle: "Drag files here",
    dropHint: "or click to browse — PDF, DOCX, XLSX, JSON (chapter JSON from drafting is OK)",
    dropActive: "Drop to upload",
    uploading: "Uploading…",
    removing: "Removing…",
    run: "Run diagnostic",
    running: "Running…",
    progressTitle: "Diagnosis in progress",
    progressWaiting:
      "Still working — progress stays under 100% until the server responds.",
    progressWaitingLocal:
      "Still working — Local Qwen first load / inference can take several minutes. Progress stays under 100% until the server responds.",
    progressWaitingCloud:
      "Still working — cloud API extraction and feedback can take a minute or two on large uploads. Progress stays under 100% until the server responds.",
    progressSteps: {
      prepare: "Preparing request",
      extract: "Extracting facts from documents",
      hard: "Comparing hard thresholds",
      qualitative: "Analyzing qualitative signals",
      feedback: "Generating readiness feedback",
      finalize: "Waiting for server (almost done)",
    } as Record<string, string>,
    fieldsTitle: "Company profile (optional overrides)",
    documentHint: "PDF, DOCX, XLSX, or JSON. AI extracts facts; you confirm before hard gates use them.",
    reportTitle: "Status tally",
    feedbackTitle: "IPO readiness feedback",
    pathwayTitle: "Hard-gate scorecard",
    softTitle: "Qualitative signals",
    extractionTitle: "Extracted fields",
    strengths: "Strengths",
    gaps: "Gaps to close",
    actions: "Priority actions",
    diagnosticPage: "Architecture",
    mainWorkspace: "Drafting workspace",
    noVerdict: "Diagnostic — not legal advice",
    noAiHard: "Hard rules: no AI",
    aiWhereNeeded: "AI: extract + qualitative + feedback",
    emptyReport: "Upload materials or fill fields, choose a market, then run.",
    errorPrefix: "Run failed",
    issuerName: "Issuer name",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    fxRate: "FX to HKD (if needed)",
    stubNote: "Structured diagnostic feedback from hard-gate results (rule-linked gaps below). Configure a live provider in Settings for richer narrative wording.",
    llmFallbackNote: "Provider response needed cleanup (thinking/non-JSON). Showing comprehensive rule-linked feedback; narrative may be structured rather than free-form prose.",
    providerTitle: "Inference backend",
    providerHint: "Uses eligibility settings (separate from drafting). Switch Local Qwen / OpenAI / DeepSeek / DashScope / Anthropic there.",
    actionsPreview: "Priority actions",
    localQwenHint:
      "Local Qwen on Apple Silicon can take 10–20+ minutes for multi-chapter uploads (model load + several LLM passes). For faster runs, use a cloud API in eligibility settings, or enter structured fields.",
    openSettings: "Open eligibility settings",
    stubBadge: "stub / offline",
    liveBadge: "live",
    readiness: {
      ready_to_discuss: "Ready to discuss with sponsor / counsel",
      not_ready: "Not ready yet",
      unclear_missing_inputs: "Unclear — missing inputs",
    } as Record<string, string>,
    fields: {
      latestProfit: "Latest FY profit attributable to owners",
      precedingTwoYearProfit: "Prior 2 FY aggregate profit",
      trackRecordProfit: "Track-record aggregate profit",
      latestRevenue: "Latest FY revenue",
      marketCap: "Expected market cap at listing",
      operatingCashflow: "Track-record operating cash flow",
      managementContinuityYears: "Management continuity (years)",
      ownershipContinuity: "Ownership continuity (recent FY)",
      wvrBeneficiaryOwnership: "WVR beneficiary ownership %",
    },
    units: { hkdM: "HKD m", years: "yrs", pct: "%" },
  },
  zh: {
    navTitle: "上市资格诊断工作区",
    title: "上传材料，获取上市准备反馈",
    subtitle:
      "独立诊断模块，覆盖港股、A股与新交所路径。硬性门槛用代码比对；AI负责抽取与反馈。",
    documents: "上传文件",
    structured: "结构化字段",
    market: "目标市场 / 板块",
    uploadButton: "选择文件",
    uploaded: "已上传",
    removeFile: "移除",
    clearAllFiles: "清空全部上传",
    dropTitle: "拖拽文件到此处",
    dropHint: "或点击选择 — PDF、DOCX、XLSX、JSON（起草模块章节 JSON 也可）",
    dropActive: "松开以上传",
    uploading: "上传中…",
    removing: "移除中…",
    run: "开始诊断",
    running: "诊断中…",
    progressTitle: "诊断进行中",
    progressWaiting: "仍在运行 — 服务端返回前进度会停在 100% 以下。",
    progressWaitingLocal:
      "仍在运行 — 本地 Qwen 首次加载或推理可能需要数分钟。服务端返回前进度会停在 95% 左右。",
    progressWaitingCloud:
      "仍在运行 — 云端 API 抽取与反馈在大文件上可能需要一两分钟。服务端返回前进度会停在 100% 以下。",
    progressSteps: {
      prepare: "准备请求",
      extract: "从文件抽取事实",
      hard: "比对硬性门槛",
      qualitative: "分析定性信号",
      feedback: "生成准备度反馈",
      finalize: "等待服务端返回",
    } as Record<string, string>,
    fieldsTitle: "公司资料（可选覆盖）",
    documentHint: "支持 PDF / DOCX / XLSX / JSON。AI 抽取后需确认，再进入硬性比对。",
    reportTitle: "状态统计",
    feedbackTitle: "上市准备反馈",
    pathwayTitle: "硬性门槛记分卡",
    softTitle: "定性信号",
    extractionTitle: "抽取字段",
    strengths: "优势",
    gaps: "待改进",
    actions: "优先行动",
    diagnosticPage: "架构说明",
    mainWorkspace: "招股书工作区",
    noVerdict: "诊断意见 · 非法律结论",
    noAiHard: "硬性规则：不用 AI",
    aiWhereNeeded: "AI：抽取 · 定性 · 反馈",
    emptyReport: "请上传材料或填写字段，选择市场后运行。",
    errorPrefix: "运行失败",
    issuerName: "发行人名称",
    unknown: "未知",
    yes: "是",
    no: "否",
    fxRate: "兑港元汇率（如需）",
    stubNote: "以下为基于硬性门槛的结构化诊断反馈（详见缺口与优先行动）。如需更丰富叙述，请在设置中配置可用的推理后端。",
    llmFallbackNote: "模型返回了需清理的内容（如思考过程/非 JSON）。已提供完整规则关联反馈；叙述可能偏结构化而非自由文案。",
    providerTitle: "推理后端",
    providerHint: "使用上市资格专用设置（与招股书起草分开）。可在其中切换 Local Qwen / OpenAI / DeepSeek / DashScope / Anthropic。",
    actionsPreview: "优先行动",
    localQwenHint:
      "在 Apple Silicon 上用本地 Qwen 处理多章节上传可能需要 10–20+ 分钟（加载模型 + 多次推理）。更快的做法：在资格设置里改用云端 API，或改填结构化字段。",
    openSettings: "打开资格诊断设置",
    stubBadge: "离线 stub",
    liveBadge: "已接通",
    readiness: {
      ready_to_discuss: "可与保荐人/律师讨论",
      not_ready: "尚不具备条件",
      unclear_missing_inputs: "信息不足，暂无法判断",
    } as Record<string, string>,
    fields: {
      latestProfit: "最近一年归母净利润",
      precedingTwoYearProfit: "前两年合计利润",
      trackRecordProfit: "往绩期合计利润",
      latestRevenue: "最近一年营业收入",
      marketCap: "预计上市市值",
      operatingCashflow: "往绩期经营现金流",
      managementContinuityYears: "管理层连续性（年）",
      ownershipContinuity: "股权连续性（最近财年）",
      wvrBeneficiaryOwnership: "同股不同权受益人持股 %",
    },
    units: { hkdM: "百万港元", years: "年", pct: "%" },
  },
};

const PROGRESS_STAGES = [
  { key: "prepare", until: 12 },
  { key: "extract", until: 38 },
  { key: "hard", until: 62 },
  { key: "qualitative", until: 78 },
  { key: "feedback", until: 92 },
  { key: "finalize", until: 98 },
] as const;

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] || statusTone.NOT_EVALUATED;
  return (
    <span className={`inline-flex h-7 items-center border px-2 font-mono text-[11px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}

function readinessLabel(t: (typeof copy)["en"], key?: string) {
  if (!key) return "";
  // Guard against LLM echoing the prompt enum list as the readiness value.
  if (key.includes("|")) return t.readiness.not_ready;
  return t.readiness[key] || key;
}

function ProgressPanel({
  title,
  percent,
  label,
  elapsedSec,
  waitingHint,
}: {
  title: string;
  percent: number;
  label: string;
  elapsedSec?: number;
  waitingHint?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const showWait = clamped >= 90 && clamped < 100 && Boolean(waitingHint);
  return (
    <div className="border border-[#0f766e] bg-[#e8f3ef] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#0f4f49]">{title}</p>
        <p className="font-mono text-xs font-semibold text-[#0f766e]">
          {Math.round(clamped)}%
          {typeof elapsedSec === "number" && elapsedSec > 0 ? ` · ${elapsedSec}s` : ""}
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden border border-[#0f766e]/30 bg-white">
        <div
          className="h-full bg-[#0f766e] transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-[#334139]">{label}</p>
      {showWait ? (
        <p className="mt-2 text-xs leading-relaxed text-[#5a6f68]">{waitingHint}</p>
      ) : null}
    </div>
  );
}

export function DiagnosticWorkspacePageContent({ locale = "en" }: { locale?: Locale }) {
  const t = copy[locale];
  const [mode, setMode] = useState<InputMode>("documents");
  const [values, setValues] = useState<ProfileValues>(initialValues);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketKey, setMarketKey] = useState("hkex_main_board");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState<string>("prepare");
  const [progressElapsed, setProgressElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [providerInfo, setProviderInfo] = useState<{
    provider: string;
    label: string;
    model?: string;
    hasCredentials?: boolean;
    needsApiKey?: boolean;
  } | null>(null);
  const [lastLlm, setLastLlm] = useState<{
    provider?: string;
    stub?: boolean;
  } | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/eligibility/markets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.markets)) setMarkets(data.markets);
      })
      .catch(() => undefined);
    fetch("/api/eligibility/provider")
      .then((r) => r.json())
      .then((data) => {
        if (data?.provider) setProviderInfo(data);
      })
      .catch(() => undefined);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const counts = useMemo(() => {
    const base = report?.summary?.status_counts || {};
    return {
      PASS: Number(base.PASS || 0),
      SHORTFALL: Number(base.SHORTFALL || 0),
      MISSING_INPUT: Number(base.MISSING_INPUT || 0),
      INDETERMINATE: Number(base.INDETERMINATE || 0),
      NOT_EVALUATED: Number(base.NOT_EVALUATED || 0),
    };
  }, [report]);

  const updateValue = useCallback(<K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const stopProgressTicker = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const startProgressTicker = useCallback(
    (hasDocs: boolean) => {
      stopProgressTicker();
      setProgress(4);
      setProgressStep("prepare");
      setProgressElapsed(0);
      const started = Date.now();
      // Docs + local LLM: climb slower so we don't claim "almost done" in ~8s.
      const pace = hasDocs ? 220 : 90;
      progressTimer.current = setInterval(() => {
        const elapsed = Date.now() - started;
        setProgressElapsed(Math.floor(elapsed / 1000));
        // Ease toward ~95% while waiting for the backend; never complete until response.
        const target = Math.min(95, 8 + elapsed / pace);
        setProgress((prev) => {
          const next = Math.max(prev, target);
          const stage =
            PROGRESS_STAGES.find((s) => next < s.until) ||
            PROGRESS_STAGES[PROGRESS_STAGES.length - 1];
          // Skip extract stage label when no docs uploaded
          if (!hasDocs && stage.key === "extract") {
            setProgressStep("hard");
          } else {
            setProgressStep(stage.key);
          }
          return next;
        });
      }, 200);
    },
    [stopProgressTicker],
  );

  async function handleRemoveFiles(names?: string[], clearAll = false) {
    if (!sessionId) {
      setDocumentNames([]);
      return;
    }
    if (!clearAll && (!names || !names.length)) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch("/api/eligibility/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          names: clearAll ? undefined : names,
          clearAll,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Remove failed");
        return;
      }
      setDocumentNames(Array.isArray(data.remaining) ? data.remaining : []);
      if (clearAll || (Array.isArray(data.remaining) && data.remaining.length === 0)) {
        setReport(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemoving(false);
    }
  }

  async function handleUpload(fileList: FileList | File[] | null) {
    if (!fileList || (fileList as FileList).length === 0 && !(fileList as File[]).length) return;
    const files = Array.from(fileList as ArrayLike<File>);
    if (!files.length) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      if (sessionId) form.set("sessionId", sessionId);
      files.forEach((file) => form.append("files", file));
      const res = await fetch("/api/eligibility/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setSessionId(data.sessionId);
      setDocumentNames((prev) => {
        const names = (data.uploaded || []).map((f: { name: string }) => f.name);
        return Array.from(new Set([...prev, ...names]));
      });
      if (Array.isArray(data.errors) && data.errors.length) {
        setError(data.errors.join("; "));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setDragActive(false);
      dragDepth.current = 0;
    }
  }

  function onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (files?.length) void handleUpload(files);
  }

  async function handleRun() {
    setBusy(true);
    setError(null);
    setReport(null);
    const hasDocs = mode === "documents" && documentNames.length > 0;
    startProgressTicker(hasDocs);
    try {
      const pathVars = {
        latest_audited_fy: "FY_latest",
        prior_fy_1: "FY_prior_1",
        prior_fy_2: "FY_prior_2",
      };

      const structured_form = {
        issuer_name: values.issuerName || undefined,
        latest_profit: values.latestProfit || undefined,
        preceding_two_year_profit: values.precedingTwoYearProfit || undefined,
        track_record_profit: values.trackRecordProfit || undefined,
        latest_revenue: values.latestRevenue || undefined,
        market_cap: values.marketCap || undefined,
        operating_cashflow: values.operatingCashflow || undefined,
        management_continuity_years: values.managementContinuityYears || undefined,
        ownership_continuity: values.ownershipContinuity,
        wvr_ownership_pct: values.wvrBeneficiaryOwnership || undefined,
        market_hint: markets.find((m) => m.key === marketKey)?.[locale === "zh" ? "labelZh" : "label"],
        fx_rate_to_hkd: values.fxRate
          ? {
              value: Number(values.fxRate),
              from_currency: "RMB",
              as_of_date: new Date().toISOString().slice(0, 10),
              source_ref: "ui",
            }
          : undefined,
        path_vars: pathVars,
      };

      const hasStructured = Object.entries(structured_form).some(([k, v]) => {
        if (k === "path_vars" || k === "ownership_continuity" || k === "market_hint") return false;
        return v !== undefined && v !== "" && v !== null;
      });

      const res = await fetch("/api/eligibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          market_key: marketKey,
          auto_confirm: true,
          include_feedback: true,
          use_uploaded_docs: hasDocs,
          structured_form: hasStructured || mode === "structured" ? structured_form : undefined,
          // Always send path_vars so hard gates resolve {latest_audited_fy} etc.
          profile: {
            path_vars: pathVars,
            fx_rate_to_hkd: structured_form.fx_rate_to_hkd,
            market_hint: structured_form.market_hint,
          },
        }),
      });
      const data = await res.json();
      stopProgressTicker();
      if (!res.ok || !data.ok) {
        setProgress(0);
        setError(data.error || t.errorPrefix);
        return;
      }
      setProgress(100);
      setProgressStep("finalize");
      setSessionId(data.sessionId);
      setReport(data.report);
      if (data.llm) setLastLlm(data.llm);
      else if (data.report?.llm) setLastLlm(data.report.llm);
    } catch (err: unknown) {
      stopProgressTicker();
      setProgress(0);
      setError(err instanceof Error ? err.message : t.errorPrefix);
    } finally {
      setBusy(false);
      // Keep 100% briefly, then leave bar visible until next run clears it via setReport(null)
      setTimeout(() => {
        setProgress((p) => (p >= 100 ? 0 : p));
      }, 1200);
    }
  }

  const feedback = report?.feedback;
  const progressLabel = t.progressSteps[progressStep] || t.running;
  const progressWaitingHint =
    providerInfo?.provider === "qwen_local"
      ? t.progressWaitingLocal
      : providerInfo?.provider
        ? t.progressWaitingCloud
        : t.progressWaiting;

  return (
    <main className="min-h-screen bg-[#f7f8f2] text-[#17201b]">
      <PublicNav active="eligibility" locale={locale} />

      <section className="relative overflow-hidden border-b border-[#d5ddd2] bg-[#18201e] pt-28 text-[#f4f7f2]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 20%, rgba(15,118,110,0.45), transparent 50%), radial-gradient(ellipse at 80% 0%, rgba(242,193,78,0.18), transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-6 px-6 pb-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f2c14e]">{t.navTitle}</p>
            <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight md:text-5xl">{t.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#c5d0c6]">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border border-[#3d4a43] bg-[#24302b] px-3 py-2 text-xs font-semibold">{t.noVerdict}</span>
            <span className="border border-[#0f766e] bg-[#0f766e]/20 px-3 py-2 text-xs font-semibold text-[#9ad5cb]">{t.noAiHard}</span>
            <span className="border border-[#8c7ae6] bg-[#8c7ae6]/15 px-3 py-2 text-xs font-semibold text-[#d5cff8]">{t.aiWhereNeeded}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <div className="border border-[#d5ddd2] bg-white p-5">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#4f5a52]">{t.market}</span>
              <select
                value={marketKey}
                onChange={(e) => setMarketKey(e.target.value)}
                className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
              >
                {(markets.length ? markets : [{ key: "hkex_main_board", label: "Hong Kong — Main Board", labelZh: "香港 — 主板", rulesets: [] }]).map((m) => (
                  <option key={m.key} value={m.key}>
                    {locale === "zh" ? m.labelZh : m.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-[#e4ebe1] pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#4f5a52]">{t.providerTitle}</p>
                <p className="mt-2 text-sm font-semibold">
                  {providerInfo?.label || "—"}
                  {providerInfo?.model ? (
                    <span className="ml-2 font-mono text-xs font-normal text-[#637064]">{providerInfo.model}</span>
                  ) : null}
                </p>
                <p className="mt-1 max-w-xl text-xs leading-5 text-[#637064]">{t.providerHint}</p>
                {providerInfo?.provider === "qwen_local" ? (
                  <p className="mt-2 max-w-xl text-xs leading-5 text-[#8a6a1a]">{t.localQwenHint}</p>
                ) : null}
                {lastLlm ? (
                  <p className="mt-2 font-mono text-[11px] text-[#0f766e]">
                    last run: {lastLlm.provider || "?"} · {lastLlm.stub ? t.stubBadge : t.liveBadge}
                  </p>
                ) : null}
              </div>
              <Link
                href={locale === "zh" ? "/zh/diagnostic/settings" : "/diagnostic/settings"}
                className="inline-flex h-10 items-center border border-[#c9d2c7] bg-[#f7f8f2] px-4 text-sm font-semibold hover:bg-[#eef3ec]"
              >
                {t.openSettings}
              </Link>
            </div>
          </div>

          <div className="border border-[#d5ddd2] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex border border-[#d5ddd2] bg-[#f7f8f2] p-1">
                {(["documents", "structured"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={mode === item}
                    onClick={() => setMode(item)}
                    className={`h-10 px-4 text-sm font-semibold transition ${
                      mode === item ? "bg-[#17201b] text-white" : "text-[#334139] hover:bg-white"
                    }`}
                  >
                    {item === "documents" ? t.documents : t.structured}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || uploading}
                onClick={() => void handleRun()}
                className="inline-flex h-11 items-center bg-[#f2c14e] px-5 text-sm font-semibold text-[#17201b] hover:bg-[#e6b53d] disabled:opacity-60"
              >
                {busy ? t.running : t.run}
              </button>
            </div>
            {busy || progress > 0 ? (
              <div className="mt-5">
                <ProgressPanel
                  title={t.progressTitle}
                  percent={progress}
                  label={progressLabel}
                  elapsedSec={progressElapsed}
                  waitingHint={progressWaitingHint}
                />
              </div>
            ) : null}
          </div>

          {mode === "documents" ? (
            <div className="border border-[#d5ddd2] bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{t.documents}</h2>
                  <p className="mt-1 text-sm text-[#637064]">{t.documentHint}</p>
                </div>
                <button
                  type="button"
                  disabled={uploading || busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32] disabled:opacity-60"
                >
                  {uploading ? t.uploading : t.uploadButton}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.json,.txt,.md"
                  className="sr-only"
                  onChange={(event) => {
                    void handleUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>

              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={`cursor-pointer border border-dashed p-8 text-center transition ${
                  dragActive
                    ? "border-[#0f766e] bg-[#e8f3ef]"
                    : "border-[#c9d2c7] bg-[#f7f8f2] hover:border-[#0f766e]/60"
                }`}
              >
                <p className="text-sm font-semibold text-[#17201b]">
                  {dragActive ? t.dropActive : t.dropTitle}
                </p>
                <p className="mt-2 text-xs text-[#637064]">
                  {uploading ? t.uploading : t.dropHint}
                </p>
              </div>

              {documentNames.length ? (
                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#4f5a52]">
                      {t.uploaded} ({documentNames.length})
                    </p>
                    <button
                      type="button"
                      disabled={removing || uploading || busy}
                      onClick={() => void handleRemoveFiles(undefined, true)}
                      className="text-xs font-semibold text-[#9b3d3d] hover:underline disabled:opacity-50"
                    >
                      {removing ? t.removing : t.clearAllFiles}
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {documentNames.map((name) => (
                      <div
                        key={name}
                        className="flex items-start justify-between gap-3 border border-[#d5ddd2] bg-[#f7f8f2] p-3"
                      >
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold uppercase text-[#0f766e]">
                            {t.uploaded}
                          </span>
                          <p className="mt-1 break-all text-sm font-medium">{name}</p>
                        </div>
                        <button
                          type="button"
                          disabled={removing || uploading || busy}
                          onClick={() => void handleRemoveFiles([name])}
                          className="shrink-0 text-xs font-semibold text-[#637064] hover:text-[#9b3d3d] disabled:opacity-50"
                        >
                          {t.removeFile}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="border border-[#d5ddd2] bg-white p-5">
            <h2 className="mb-5 text-lg font-semibold">{t.fieldsTitle}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-semibold text-[#4f5a52]">{t.issuerName}</span>
                <input
                  value={values.issuerName}
                  onChange={(e) => updateValue("issuerName", e.target.value)}
                  className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
                />
              </label>
              {(
                [
                  ["latestProfit", "hkdM"],
                  ["precedingTwoYearProfit", "hkdM"],
                  ["trackRecordProfit", "hkdM"],
                  ["latestRevenue", "hkdM"],
                  ["marketCap", "hkdM"],
                  ["operatingCashflow", "hkdM"],
                  ["managementContinuityYears", "years"],
                  ["wvrBeneficiaryOwnership", "pct"],
                ] as const
              ).map(([key, unit]) => (
                <label key={key} className="grid gap-2">
                  <span className="text-xs font-semibold text-[#4f5a52]">{t.fields[key]}</span>
                  <div className="grid grid-cols-[1fr_auto] border border-[#c9d2c7] bg-[#f7f8f2] focus-within:border-[#0f766e]">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={values[key]}
                      onChange={(e) => updateValue(key, e.target.value)}
                      className="h-11 min-w-0 bg-transparent px-3 text-sm outline-none"
                    />
                    <span className="flex h-11 items-center border-l border-[#d5ddd2] px-3 text-xs font-semibold text-[#637064]">
                      {t.units[unit]}
                    </span>
                  </div>
                </label>
              ))}
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-[#4f5a52]">{t.fields.ownershipContinuity}</span>
                <select
                  value={values.ownershipContinuity}
                  onChange={(e) => updateValue("ownershipContinuity", e.target.value as ProfileValues["ownershipContinuity"])}
                  className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
                >
                  <option value="unknown">{t.unknown}</option>
                  <option value="yes">{t.yes}</option>
                  <option value="no">{t.no}</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-[#4f5a52]">{t.fxRate}</span>
                <input
                  type="number"
                  step="0.0001"
                  value={values.fxRate}
                  onChange={(e) => updateValue("fxRate", e.target.value)}
                  className="h-11 border border-[#c9d2c7] bg-[#f7f8f2] px-3 text-sm outline-none focus:border-[#0f766e]"
                />
              </label>
            </div>
          </div>

          {error ? (
            <div className="border border-[#b45309] bg-[#fff7ed] p-4 text-sm text-[#9a3412]">
              {t.errorPrefix}: {error}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          <div className="border border-[#d5ddd2] bg-white p-5">
            <h2 className="text-lg font-semibold">{t.reportTitle}</h2>
            {report ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {(Object.keys(counts) as Array<keyof typeof counts>).map((status) => (
                  <div key={status} className={`border p-3 ${statusTone[status]}`}>
                    <p className="font-mono text-lg font-semibold">{counts[status]}</p>
                    <p className="mt-1 font-mono text-[11px] font-semibold">{status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#637064]">{t.emptyReport}</p>
            )}
          </div>

          {feedback ? (
            <div className="border border-[#17201b] bg-[#18201e] p-5 text-[#f4f7f2]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f2c14e]">{t.feedbackTitle}</p>
              <p className="mt-3 text-sm font-semibold text-[#f2c14e]">
                {readinessLabel(t, feedback.readiness)}
              </p>
              <h3 className="mt-2 font-serif text-xl leading-snug">{feedback.headline}</h3>
              <p className="mt-3 text-sm leading-6 text-[#c5d0c6]">{feedback.summary}</p>
              {(feedback.priority_actions || []).length ? (
                <div className="mt-4 border-t border-[#2f3b36] pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f2c14e]">
                    {t.actionsPreview}
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-[#d7e0d8]">
                    {feedback.priority_actions!.slice(0, 4).map((action, idx) => (
                      <li key={`aside-action-${idx}`}>{action}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {feedback.source === "llm_fallback" || feedback.llm_error ? (
                <p className="mt-3 text-xs text-[#9ad5cb]">{t.llmFallbackNote}</p>
              ) : feedback.stub || lastLlm?.stub ? (
                <p className="mt-3 text-xs text-[#9ad5cb]">{t.stubNote}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Link
              href={locale === "zh" ? "/zh/diagnostic" : "/diagnostic"}
              className="inline-flex h-10 items-center border border-[#c9d2c7] bg-white px-4 text-sm font-semibold hover:bg-[#eef3ec]"
            >
              {t.diagnosticPage}
            </Link>
            <Link
              href={locale === "zh" ? "/zh/workspace" : "/workspace"}
              className="inline-flex h-10 items-center bg-[#17201b] px-4 text-sm font-semibold text-white hover:bg-[#2b3a32]"
            >
              {t.mainWorkspace}
            </Link>
          </div>
        </aside>
      </section>

      {feedback?.gaps?.length || feedback?.priority_actions?.length || feedback?.strengths?.length ? (
        <section className="border-y border-[#d5ddd2] bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-3">
            <div>
              <h2 className="text-lg font-semibold">{t.strengths}</h2>
              <ul className="mt-4 space-y-2 text-sm text-[#334139]">
                {(feedback.strengths || []).slice(0, 8).map((item, idx) => (
                  <li key={`strength-${idx}`} className="border border-[#d5ddd2] bg-[#f7f8f2] px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold">{t.gaps}</h2>
              <div className="mt-4 space-y-3">
                {(feedback.gaps || []).slice(0, 8).map((gap, idx) => (
                  <article key={`${gap.area}-${idx}`} className="border border-[#d5ddd2] bg-[#f7f8f2] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{gap.area}</h3>
                      <span className="font-mono text-[11px] uppercase text-[#637064]">{gap.severity}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#4f5a52]">{gap.detail}</p>
                    {gap.suggested_action ? (
                      <p className="mt-2 text-xs font-semibold text-[#0f766e]">{gap.suggested_action}</p>
                    ) : null}
                    {gap.rule_ref ? (
                      <p className="mt-2 font-mono text-[11px] text-[#637064]">{gap.rule_ref}</p>
                    ) : null}
                  </article>
                ))}
              </div>
              {(feedback.priority_actions || []).length ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#4f5a52]">{t.actions}</h3>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                    {feedback.priority_actions!.slice(0, 6).map((action, idx) => (
                      <li key={`priority-action-${idx}`}>{action}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {report?.extraction?.quantifiable?.length ? (
        <section className="mx-auto max-w-7xl px-6 py-8">
          <h2 className="text-lg font-semibold">{t.extractionTitle}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {report.extraction.quantifiable.map((field) => (
              <div key={field.field_id} className="border border-[#d5ddd2] bg-white p-4">
                <p className="font-mono text-[11px] text-[#637064]">{field.field_id}</p>
                <p className="mt-2 text-sm font-semibold">
                  {String(field.value)} {field.unit || ""}
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase text-[#0f766e]">
                  {field.confirmation_status}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-y border-[#d5ddd2] bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <h2 className="text-lg font-semibold">{t.pathwayTitle}</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {(report?.rulesets || []).flatMap((block) =>
              (block.gates || []).map((gate) => (
                <article key={`${block.ruleset}-${gate.gate_id}`} className="border border-[#d5ddd2] bg-[#f7f8f2] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase text-[#637064]">
                        {block.ruleset_name || block.ruleset}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold">{gate.title}</h3>
                      <p className="mt-1 font-mono text-xs text-[#637064]">{gate.rule_ref}</p>
                    </div>
                    <StatusBadge status={gate.status} />
                  </div>
                  <div className="mt-4 divide-y divide-[#d5ddd2] border border-[#d5ddd2] bg-white">
                    {(gate.checks || []).map((check, idx) => (
                      <div key={`${gate.gate_id}-${idx}`} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <p className="text-sm font-medium">{check.metric}</p>
                          <p className="mt-1 font-mono text-xs text-[#637064]">
                            required {check.required}; actual {String(check.actual)}
                            {check.note ? `; ${check.note}` : ""}
                          </p>
                        </div>
                        <StatusBadge status={check.status} />
                      </div>
                    ))}
                  </div>
                </article>
              )),
            )}
            {!report ? (
              <p className="text-sm text-[#637064] lg:col-span-2">{t.emptyReport}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <h2 className="text-lg font-semibold">{t.softTitle}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(report?.soft_conditions || []).map((signal) => (
            <div key={signal.gate_id} className="border border-[#8c7ae6] bg-[#efedff] p-4 text-[#342e70]">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{signal.gate_id}</p>
                <StatusBadge status={signal.status} />
              </div>
              <p className="mt-3 text-xs leading-5">
                {signal.rationale || signal.substantive_concern}
              </p>
              {signal.rule_ref ? (
                <p className="mt-3 font-mono text-[11px]">{signal.rule_ref}</p>
              ) : null}
            </div>
          ))}
        </div>
        {report?.disclaimer ? (
          <p className="mt-8 max-w-3xl text-xs leading-5 text-[#637064]">{report.disclaimer}</p>
        ) : null}
      </section>
    </main>
  );
}
