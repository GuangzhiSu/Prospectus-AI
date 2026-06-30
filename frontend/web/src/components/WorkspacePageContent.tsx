// Prospectus AI — main drafting workspace (data prep + chapter coverage + draft)
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SectionMarkdown } from "@/components/SectionMarkdown";
import { AppBackendStatus } from "@/components/AppBackendStatus";
import {
  countGeneratedSections,
  getLastGeneratedIndex,
  getMissingSectionIds,
  parseDraftSections,
  sectionIsComplete,
  sectionHasContent,
  SECTION_NAMES,
  SECTION_ORDER,
} from "@/lib/draft-sections";

type DataFile = { name: string; size: number; lastModified: string };

type Manifest = {
  sections?: Array<{ id: string; name: string; chunk_count: number; fact_count?: number }>;
  total_chunks?: number;
  text_chunk_count?: number;
  fact_count?: number;
  source_files?: string[];
  missing_information_requests?: Array<{
    section: string;
    priority: string;
    missing_items?: string[];
    why_needed_for_prospectus?: string;
    what_user_should_provide?: Array<{
      type?: string;
      description?: string;
      preferred_format?: string;
    }>;
  }>;
  data_quality_flags?: Array<{
    severity: string;
    issue: string;
    evidence_pointer?: Record<string, string>;
    suggested_fix?: string;
  }>;
};

type Classification = {
  sections?: Record<string, { items?: unknown[] }>;
  global_metadata?: Record<string, unknown>;
  missing_information_requests?: Manifest["missing_information_requests"];
  data_quality_flags?: Manifest["data_quality_flags"];
};

type Agent2StreamEvent =
  | { type: "section_start"; section_id: string; section_name?: string; phase: string }
  | { type: "phase_start"; section_id: string; phase: string; revision_pass?: number }
  | { type: "phase_end"; section_id: string; phase: string; revision_pass?: number; summary?: string }
  | { type: "token"; section_id: string; phase: string; revision_pass?: number; text: string }
  | { type: "section_done"; section_id: string; section_name: string }
  | { type: "done"; ok: boolean }
  | { type: "error"; message: string };

type WorkspaceLocale = "en" | "zh";

const WORKSPACE_COPY = {
  en: {
    emptyDraft: "# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n",
    phaseLabels: {
      retriever: "Retrieving evidence",
      planner: "Planning outline",
      writer: "Writing draft",
      verifier: "Verifying draft",
      revision: "Revising draft",
      assembler: "Saving section",
      template: "Rendering template",
    } as Record<string, string>,
    steps: ["Upload materials", "Run IPO diagnostic", "Prepare evidence", "Draft sections", "Review & export"],
    setupVerifyFailed: "Could not verify generation setup.",
    uploadFailed: "Upload failed",
    runFailed: "Run failed",
    generationFailed: "Generation failed",
    clearFailed: "Clear failed",
    resetFailed: "Reset failed",
    exportFailed: "Export failed",
    clearDataConfirm: "Remove all uploaded files and outputs? You can then upload completely new documents.",
    startOverConfirm: "Clear all processed data and the draft? You will need to prepare your files again.",
    generateAll: "Generate all",
    remaining: (n: number) => `Remaining (${n})`,
    nextMissing: (name?: string) => (name ? `Next missing: ${name}` : "Next missing"),
    title: "AI Prospectus Workspace",
    subtitle: "Private IPO workflow for diagnostic context, evidence, drafting, review, and export",
    project: "Project: Demo Issuer",
    mode: "Mode: Local · Qwen/Qwen3.5-4B",
    privateStatus: "Status: Private workspace",
    productSite: "Product site",
    kgView: "Knowledge Graph web view",
    downloadApp: "Download app",
    settings: "Model & inference settings",
    zhWorkspace: "中文工作区",
    startOver: "Start over",
    startOverTitle: "Clear processed data and draft, start from upload",
    exporting: "Exporting… (may take 10–30s)",
    exportWord: "Export to Word",
    buildingWord: "Building your Word document…",
    filesTitle: "Your files",
    filesSubtitle: "Excel workbooks or structured JSON",
    uploading: "Uploading…",
    uploadButton: "Upload .xlsx / .json",
    refresh: "Refresh",
    removeAll: "Remove all",
    removeAllTitle: "Remove all uploaded files, upload new documents",
    noFiles: "No .xlsx or .json files yet",
    diagnosticTitle: "Step 2: Run IPO diagnostic",
    diagnosticDescription:
      "Use the standalone diagnostic module to surface listing-pathway gaps before drafting. It remains separate from generation.",
    diagnosticButton: "Open IPO Diagnostic",
    diagnosticReady: "Diagnostic ready when issuer materials are uploaded.",
    diagnosticWaiting: "Upload issuer materials before relying on diagnostic context.",
    prepareTitle: "Step 3: Prepare evidence",
    prepareDescription:
      "We read your spreadsheets or JSON and organize evidence for each prospectus chapter. Large Excel files may take several minutes.",
    working: "Working…",
    prepareButton: "Prepare evidence",
    statusTitle: "Evidence status",
    statusDescription: "Confirms your files are processed and you can move on to section drafting.",
    noResults: "No results yet. Prepare evidence after uploading files.",
    ready: "Ready to draft",
    readyDescription: "Generate and edit your prospectus in the panel on the right.",
    filesFromUpload: (n: number) => `${n} file${n === 1 ? "" : "s"} from your upload`,
    dataQuality: "Data quality",
    suggestion: "Suggestion",
    draftTitle: "Prospectus draft",
    draftSubtitle: "25 sections in prospectus order · click to expand",
    clearAll: "Clear all",
    generating: "Generating",
    missing: "Missing — not generated",
    thinDraft: "Thin draft — regenerate recommended",
    pending: "Pending",
    sectionStatusComplete: "Complete",
    sectionStatusRunning: "Running",
    sectionStatusMissing: "Missing input",
    sectionStatusThin: "Review required",
    sectionStatusPending: "Pending",
    modify: "Modify",
    modificationPlaceholder: "Modification instructions…",
    regenerating: "Regenerating…",
    regenerate: "Regenerate",
    cancel: "Cancel",
    finalTextHint: (phase: string) => `${phase}… Final text will appear when this section is saved.`,
    noContent: "No content yet.",
    generatingSection: (idx: number, total: number) => `Generating section ${idx} of ${total}…`,
    finalOnly: "Only the final verified section appears when each step completes.",
    allDone: "All sections done. Use Modify above or Export to Word.",
    generateAllSections: "Generate all 25 sections sequentially.",
    sectionsComplete: (done: number, total: number) => `${done} of ${total} sections complete.`,
    missingWithGaps: (n: number, section: number) => `${n} missing (including gaps before section ${section}).`,
    remainingSections: (n: number) => `${n} remaining.`,
    setupIssue: "Setup issue:",
    backendSetup: "Check backend setup in the terminal.",
    recheck: "Re-check",
    checkSetup: "Check setup",
    checkSetupTitle: "Verify the drafting backend is ready",
    reviewTitle: "Evidence & review",
    reviewSubtitle: "Section context, source coverage, missing inputs, and export readiness.",
    reviewRequired: "Review required",
    selectedSection: "Selected section",
    sourceFilesTitle: "Source files",
    noSources: "Source coverage appears after evidence preparation.",
    missingInputsTitle: "Missing inputs",
    noMissingInputs: "No section-specific missing input request is currently surfaced.",
    qualityFlagsTitle: "Quality flags",
    noQualityFlags: "No quality flags returned from evidence preparation.",
    exportReadinessTitle: "Export readiness",
    exportReady: "All sections are complete. Word export is available.",
    exportBlocked: "Export locked",
    exportBlockedHint: "Complete all prospectus sections before exporting a review draft.",
    reviewWaiting: "Prepare evidence to populate the review panel.",
  },
  zh: {
    emptyDraft: "# 招股书草稿\n\n（生成后的招股书内容会显示在这里。）\n",
    phaseLabels: {
      retriever: "检索证据",
      planner: "规划大纲",
      writer: "撰写草稿",
      verifier: "核验草稿",
      revision: "修订草稿",
      assembler: "保存章节",
      template: "渲染模板",
    } as Record<string, string>,
    steps: ["上传材料", "运行上市诊断", "准备证据", "生成章节", "复核与导出"],
    setupVerifyFailed: "无法验证生成环境。",
    uploadFailed: "上传失败",
    runFailed: "运行失败",
    generationFailed: "生成失败",
    clearFailed: "清除失败",
    resetFailed: "重置失败",
    exportFailed: "导出失败",
    clearDataConfirm: "要删除所有已上传文件和输出吗？之后可以上传一套全新的文档。",
    startOverConfirm: "要清除所有已处理数据和草稿吗？之后需要重新整理文件。",
    generateAll: "生成全部",
    remaining: (n: number) => `剩余 ${n} 节`,
    nextMissing: (name?: string) => (name ? `下一节：${name}` : "下一节"),
    title: "AI Prospectus 工作台",
    subtitle: "面向诊断语境、证据、起草、复核和导出的私有 IPO 工作流",
    project: "项目：Demo Issuer",
    mode: "模式：Local · Qwen/Qwen3.5-4B",
    privateStatus: "状态：私有工作台",
    productSite: "产品主页",
    kgView: "知识图谱视图",
    downloadApp: "下载应用",
    settings: "模型与推理设置",
    zhWorkspace: "English workspace",
    startOver: "重新开始",
    startOverTitle: "清除已处理数据和草稿，从上传重新开始",
    exporting: "正在导出…（可能需要 10–30 秒）",
    exportWord: "导出 Word",
    buildingWord: "正在生成 Word 文档…",
    filesTitle: "你的文件",
    filesSubtitle: "Excel 工作簿或结构化 JSON",
    uploading: "正在上传…",
    uploadButton: "上传 .xlsx / .json",
    refresh: "刷新",
    removeAll: "全部移除",
    removeAllTitle: "删除所有上传文件，重新上传新文档",
    noFiles: "还没有 .xlsx 或 .json 文件",
    diagnosticTitle: "步骤 2：运行上市诊断",
    diagnosticDescription:
      "使用独立诊断模块在起草前发现上市路径缺口。它与招股书生成保持分离。",
    diagnosticButton: "打开上市诊断",
    diagnosticReady: "上传发行人材料后即可使用诊断语境。",
    diagnosticWaiting: "请先上传发行人材料，再依赖诊断语境。",
    prepareTitle: "步骤 3：准备证据",
    prepareDescription: "系统会读取表格或 JSON，并按招股书章节组织证据。大型 Excel 文件可能需要几分钟。",
    working: "处理中…",
    prepareButton: "准备证据",
    statusTitle: "证据状态",
    statusDescription: "确认文件已经处理完成，可以进入章节起草阶段。",
    noResults: "还没有结果。上传文件后请先准备证据。",
    ready: "可以开始起草",
    readyDescription: "在右侧面板生成和编辑招股书内容。",
    filesFromUpload: (n: number) => `来自本次上传的 ${n} 个文件`,
    dataQuality: "数据质量",
    suggestion: "建议",
    draftTitle: "招股书草稿",
    draftSubtitle: "按招股书顺序排列的 25 个章节 · 点击展开",
    clearAll: "清空草稿",
    generating: "生成中",
    missing: "缺失 — 尚未生成",
    thinDraft: "草稿较薄 — 建议重新生成",
    pending: "待生成",
    sectionStatusComplete: "已完成",
    sectionStatusRunning: "生成中",
    sectionStatusMissing: "缺输入",
    sectionStatusThin: "需复核",
    sectionStatusPending: "待处理",
    modify: "修改",
    modificationPlaceholder: "请输入修改要求…",
    regenerating: "重新生成中…",
    regenerate: "重新生成",
    cancel: "取消",
    finalTextHint: (phase: string) => `${phase}… 章节保存后会显示最终文本。`,
    noContent: "还没有内容。",
    generatingSection: (idx: number, total: number) => `正在生成第 ${idx} / ${total} 节…`,
    finalOnly: "每个步骤完成后，只显示最终核验后的章节。",
    allDone: "所有章节已完成。可在上方修改，或导出 Word。",
    generateAllSections: "按顺序生成全部 25 个章节。",
    sectionsComplete: (done: number, total: number) => `已完成 ${done} / ${total} 个章节。`,
    missingWithGaps: (n: number, section: number) => `仍缺 ${n} 节（包括第 ${section} 节之前的空缺）。`,
    remainingSections: (n: number) => `剩余 ${n} 节。`,
    setupIssue: "环境问题：",
    backendSetup: "请在终端检查后端设置。",
    recheck: "重新检查",
    checkSetup: "检查环境",
    checkSetupTitle: "确认起草后端已准备好",
    reviewTitle: "证据与复核",
    reviewSubtitle: "章节语境、来源覆盖、缺失输入和导出准备度。",
    reviewRequired: "需复核",
    selectedSection: "当前章节",
    sourceFilesTitle: "来源文件",
    noSources: "准备证据后会显示来源覆盖。",
    missingInputsTitle: "缺失输入",
    noMissingInputs: "当前未显示该章节的缺失输入请求。",
    qualityFlagsTitle: "质量标记",
    noQualityFlags: "证据准备暂未返回质量标记。",
    exportReadinessTitle: "导出准备度",
    exportReady: "所有章节已完成，可以导出 Word。",
    exportBlocked: "导出已锁定",
    exportBlockedHint: "请先完成全部招股书章节，再导出审阅稿。",
    reviewWaiting: "准备证据后会填充复核面板。",
  },
};

type SectionStreamState = {
  sectionId: string;
  activePhase: string | null;
};

function createEmptyStreamState(sectionId: string): SectionStreamState {
  return {
    sectionId,
    activePhase: null,
  };
}

function normalizeStreamEvent(ev: Agent2StreamEvent): Agent2StreamEvent {
  if (ev.type !== "section_start") return ev;
  return {
    type: "phase_start",
    section_id: ev.section_id,
    phase: ev.phase,
    revision_pass: ev.phase === "writer" ? 0 : 1,
  };
}

function applyStreamEvent(
  prev: SectionStreamState | null,
  raw: Agent2StreamEvent
): SectionStreamState | null {
  const ev = normalizeStreamEvent(raw);

  if (ev.type === "section_done") {
    return null;
  }

  if (ev.type === "phase_start") {
    return {
      sectionId: ev.section_id,
      activePhase: ev.phase,
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

async function consumeAgent2Stream(
  res: Response,
  onEvent: (ev: Agent2StreamEvent) => void
): Promise<void> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      try {
        message = (await res.text()).slice(0, 500) || message;
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      for (const line of part.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          onEvent(JSON.parse(line.slice(6)) as Agent2StreamEvent);
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function sectionOrderIndex(sectionId: string | undefined) {
  if (!sectionId) return -1;
  return (SECTION_ORDER as readonly string[]).indexOf(sectionId);
}

export function WorkspacePageContent({ locale = "en" }: { locale?: WorkspaceLocale }) {
  const t = WORKSPACE_COPY[locale];
  const steps = t.steps.map((label, index) => ({ id: index + 1, label }));
  const [files, setFiles] = useState<DataFile[]>([]);
  const [results, setResults] = useState<{
    manifest?: Manifest;
    classification?: Classification;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingSectionIndex, setGeneratingSectionIndex] = useState(-1);
  const [modificationInput, setModificationInput] = useState("");
  const [modifyingSectionId, setModifyingSectionId] = useState<string | null>(null);
  const [agent2Status, setAgent2Status] = useState<{
    ok?: boolean;
    hint?: string;
    spawn?: string;
    checks?: Record<string, string>;
  } | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [sectionStream, setSectionStream] = useState<SectionStreamState | null>(null);
  const [draftMd, setDraftMd] = useState<string>(t.emptyDraft);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/agent1/files");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: DataFile[] };
      setFiles(Array.isArray(data.items) ? data.items : []);
    } catch {
      setFiles([]);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch("/api/agent1/results");
      if (res.status === 404) {
        setResults(null);
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        manifest?: Manifest;
        classification?: Classification;
      };
      setResults(data);
    } catch {
      setResults(null);
    }
  }, []);

  const fetchDraft = useCallback(async () => {
    try {
      const res = await fetch("/api/agent2/draft");
      if (res.ok) {
        const data = (await res.json()) as { markdown?: string };
        setDraftMd(data.markdown ?? t.emptyDraft);
      }
    } catch {
      // keep current draft
    }
  }, [t.emptyDraft]);

  useEffect(() => {
    fetchFiles();
    fetchResults();
  }, [fetchFiles, fetchResults]);

  const fetchAgent2Status = useCallback(async () => {
    try {
      const res = await fetch("/api/agent2/status");
      const data = (await res.json()) as {
        ok?: boolean;
        hint?: string;
        spawn?: string;
        checks?: Record<string, string>;
      };
      setAgent2Status(data);
    } catch {
      setAgent2Status({ ok: false, hint: t.setupVerifyFailed });
    }
  }, [t.setupVerifyFailed]);

  useEffect(() => {
    const m = results?.manifest ?? results?.classification;
    if (m && !generating) fetchAgent2Status();
  }, [results, generating, fetchAgent2Status]);

  useEffect(() => {
    const m = results?.manifest ?? results?.classification;
    if (m && !generating) fetchDraft();
  }, [results, generating, fetchDraft]);

  const parsedSections = useMemo(() => parseDraftSections(draftMd), [draftMd]);
  const missingSectionIds = useMemo(
    () => getMissingSectionIds(parsedSections),
    [parsedSections]
  );
  const generatedCount = useMemo(
    () => countGeneratedSections(parsedSections),
    [parsedSections]
  );
  const lastGeneratedIndex = useMemo(
    () => getLastGeneratedIndex(parsedSections),
    [parsedSections]
  );

  async function handleUpload(filesToUpload: FileList | File[]) {
    const arr = Array.from(filesToUpload).filter((f) => f.size > 0);
    if (!arr.length) return;
    const fd = new FormData();
    arr.forEach((f) => fd.append("files", f, f.name));
    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent1/upload", { method: "POST", body: fd });
      const data = (await res.json()) as {
        uploaded?: Array<{ name: string; size: number }>;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.errors?.length) setError(data.errors.join("\n"));
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  async function handleRunAgent1() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent1/run", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchResults();
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.runFailed);
    } finally {
      setRunning(false);
    }
  }

  async function runSectionApi(sectionId: string, modification?: string): Promise<boolean> {
    setSectionStream(createEmptyStreamState(sectionId));
    setExpandedSectionId(sectionId);

    const res = await fetch("/api/agent2/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: sectionId,
        modification_instructions: modification || undefined,
      }),
    });

    let streamError: string | null = null;
    await consumeAgent2Stream(res, (ev) => {
      if (ev.type === "section_done") {
        void fetchDraft();
        setSectionStream(null);
      } else if (ev.type === "error") {
        streamError = ev.message;
      } else {
        setSectionStream((prev) => applyStreamEvent(prev, ev));
        if (ev.type === "phase_start" || ev.type === "section_start") {
          setExpandedSectionId(ev.section_id);
          const idx = sectionOrderIndex(ev.section_id);
          if (idx >= 0) setGeneratingSectionIndex(idx);
        }
      }
    });
    if (streamError) throw new Error(streamError);

    await fetchDraft();
    setSectionStream(null);
    return true;
  }

  async function generateSection(sectionId: string, modification?: string) {
    setGenerating(true);
    setError(null);
    try {
      await runSectionApi(sectionId, modification);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.generationFailed);
    } finally {
      setGenerating(false);
      setGeneratingSectionIndex(-1);
    }
  }

  async function handleGenerateAllSequential() {
    setGenerating(true);
    setError(null);
    const remaining = getMissingSectionIds(parseDraftSections(draftMd));
    if (remaining.length === 0) {
      setGenerating(false);
      return;
    }
    const firstIdx = sectionOrderIndex(remaining[0]);
    setGeneratingSectionIndex(firstIdx >= 0 ? firstIdx : 0);
    setSectionStream(null);

    try {
      const res = await fetch("/api/agent2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: remaining }),
      });

      let streamError: string | null = null;
      await consumeAgent2Stream(res, (ev) => {
        if (ev.type === "section_done") {
          void fetchDraft();
          setSectionStream(null);
        } else if (ev.type === "error") {
          streamError = ev.message;
        } else {
          setSectionStream((prev) => applyStreamEvent(prev, ev));
          if (ev.type === "phase_start" || ev.type === "section_start") {
            setExpandedSectionId(ev.section_id);
            const idx = sectionOrderIndex(ev.section_id);
            if (idx >= 0) setGeneratingSectionIndex(idx);
          }
        }
      });
      if (streamError) throw new Error(streamError);

      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.generationFailed);
    } finally {
      setSectionStream(null);
      setGenerating(false);
      setGeneratingSectionIndex(-1);
    }
  }

  function handleGenerateNext() {
    const missing = getMissingSectionIds(parseDraftSections(draftMd));
    if (missing.length === 0) return;
    void generateSection(missing[0]);
  }

  function handleModifySection(sectionId: string) {
    setModifyingSectionId(sectionId);
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
      const res = await fetch("/api/agent2/clear", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDraftMd(t.emptyDraft);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.clearFailed);
    }
  }

  async function handleClearData() {
    if (uploading || running || generating) return;
    if (!confirm(t.clearDataConfirm)) return;
    setError(null);
    try {
      const [dataRes, resetRes] = await Promise.all([
        fetch("/api/agent1/clear-data", { method: "POST" }),
        fetch("/api/reset", { method: "POST" }),
      ]);
      const dataJson = (await dataRes.json()) as { ok?: boolean; error?: string };
      const resetJson = (await resetRes.json()) as { ok?: boolean; error?: string };
      if (!dataRes.ok || !dataJson.ok) throw new Error(dataJson.error || t.clearFailed);
      if (!resetRes.ok || !resetJson.ok) throw new Error(resetJson.error || t.resetFailed);
      setResults(null);
      setDraftMd(t.emptyDraft);
      await fetchFiles();
      await fetchResults();
      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.clearFailed);
    }
  }

  async function handleStartOver() {
    if (generating || running) return;
    if (!confirm(t.startOverConfirm)) return;
    setError(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(null);
      setDraftMd(t.emptyDraft);
      await fetchFiles();
      await fetchResults();
      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.resetFailed);
    }
  }

  async function handleExportDocx() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/agent2/export/docx");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `prospectus-draft-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  const manifest = results?.manifest ?? results?.classification;
  const sourceFiles = results?.manifest?.source_files;
  const qualityFlags =
    results?.manifest?.data_quality_flags ??
    results?.classification?.data_quality_flags ??
    [];
  const missingInformationRequests =
    results?.manifest?.missing_information_requests ??
    results?.classification?.missing_information_requests ??
    [];
  const hasDraft = draftMd && draftMd.includes("## ") && draftMd !== t.emptyDraft;
  const allSectionsDone = hasDraft && missingSectionIds.length === 0;
  const hasGapSections =
    missingSectionIds.length > 0 &&
    lastGeneratedIndex >= 0 &&
    sectionOrderIndex(missingSectionIds[0]) < lastGeneratedIndex;
  const currentStep = !files.length ? 1 : !manifest ? 3 : allSectionsDone ? 5 : 4;
  const generateAllLabel =
    generatedCount === 0 ? t.generateAll : t.remaining(missingSectionIds.length);
  const nextMissingSectionId = missingSectionIds[0];
  const nextMissingLabel = nextMissingSectionId
    ? t.nextMissing(SECTION_NAMES[nextMissingSectionId])
    : t.nextMissing();
  const diagnosticHref = locale === "zh" ? "/zh/diagnostic" : "/diagnostic";
  const firstContentSectionId = SECTION_ORDER.find((sid) =>
    sectionHasContent(parsedSections[sid])
  );
  const reviewSectionId =
    expandedSectionId ||
    sectionStream?.sectionId ||
    nextMissingSectionId ||
    firstContentSectionId ||
    SECTION_ORDER[0];
  const reviewSectionName = SECTION_NAMES[reviewSectionId] ?? reviewSectionId;
  const reviewSectionKey = reviewSectionId.toLowerCase();
  const reviewSectionLabel = reviewSectionName.toLowerCase();
  const sectionMissingRequests = missingInformationRequests.filter((request) => {
    const sectionLabel = String(request.section || "").toLowerCase();
    if (!sectionLabel) return true;
    return (
      sectionLabel.includes(reviewSectionKey) ||
      sectionLabel.includes(reviewSectionLabel) ||
      reviewSectionLabel.includes(sectionLabel)
    );
  });
  const reviewMissingRequests =
    sectionMissingRequests.length > 0
      ? sectionMissingRequests
      : missingInformationRequests.slice(0, 3);
  const reviewSourceFiles =
    Array.isArray(sourceFiles) && sourceFiles.length > 0
      ? sourceFiles
      : files.map((file) => file.name);
  const reviewSectionComplete = sectionIsComplete(
    parsedSections[reviewSectionId],
    reviewSectionId
  );
  const reviewSectionHasDraft = sectionHasContent(parsedSections[reviewSectionId]);

  return (
    <div className="min-h-screen bg-[#f7f8f2] text-[var(--foreground)]">
      {/* Header + Pipeline stepper */}
      <header className="sticky top-0 z-10 border-b border-[#d5ddd2] bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-[1900px] px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-[var(--foreground)]">
                {t.title}
              </h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                {t.subtitle}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="border border-[#d5ddd2] bg-[#f7f8f2] px-2.5 py-1 font-semibold text-[#334139]">
                  {t.project}
                </span>
                <span className="border border-[#d5ddd2] bg-[#eef3ec] px-2.5 py-1 font-semibold text-[#0f766e]">
                  {t.mode}
                </span>
                <span className="border border-[#d5ddd2] bg-[#fff8e1] px-2.5 py-1 font-semibold text-[#8a5a00]">
                  {t.privateStatus}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <AppBackendStatus />
                <Link
                  href={locale === "zh" ? "/zh" : "/"}
                  className="text-[var(--accent)] hover:underline"
                >
                  {t.productSite}
                </Link>
                <Link
                  href="/kg-view"
                  className="text-[var(--accent)] hover:underline"
                >
                  {t.kgView}
                </Link>
                <Link
                  href={locale === "zh" ? "/zh/download" : "/download"}
                  className="text-[var(--accent)] hover:underline"
                >
                  {t.downloadApp}
                </Link>
                <Link
                  href="/settings"
                  className="text-[var(--accent)] hover:underline"
                >
                  {t.settings}
                </Link>
                <Link
                  href={locale === "zh" ? "/workspace" : "/zh/workspace"}
                  className="text-[var(--accent)] hover:underline"
                >
                  {t.zhWorkspace}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(manifest || hasDraft) && (
                <button
                  onClick={handleStartOver}
                  disabled={generating || running}
                  className="rounded-md border border-[#d5dde8] bg-white px-3 py-2 text-sm text-[var(--muted)] hover:bg-[#f6f8fb] hover:text-[var(--foreground)] disabled:opacity-50"
                  title={t.startOverTitle}
                >
                  {t.startOver}
                </button>
              )}
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleExportDocx}
                  disabled={exporting || !allSectionsDone}
                  className="flex items-center gap-2 rounded-md bg-[#172033] px-4 py-2 text-sm font-medium text-white hover:bg-[#253149] disabled:opacity-50 transition-colors"
                >
                  {exporting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t.exporting}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t.exportWord}
                    </>
                  )}
                </button>
                {exporting && (
                  <p className="text-xs text-[var(--muted)]">{t.buildingWord}</p>
                )}
                {!exporting && !allSectionsDone && (
                  <p className="max-w-48 text-xs text-[var(--muted)]">{t.exportBlockedHint}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((s, i) => {
              const done = currentStep > s.id;
              const active = currentStep === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                      active ? "bg-[#e8f3ef] text-[#0f766e] font-medium" : ""
                    } ${done && !active ? "text-[var(--success)]" : ""}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      done ? "bg-[var(--success)] text-white" :
                      active ? "bg-[#0f766e] text-white" :
                      "bg-[#dde5da] text-[var(--muted)]"
                    }`}>
                      {done ? "✓" : s.id}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="h-px w-4 bg-[var(--border)]" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-[1900px] px-5 pt-3">
          <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-[1900px] flex-col gap-4 px-5 py-4 xl:flex-row">
        {/* Left: Excel files */}
        <aside className="w-full shrink-0 space-y-4 overflow-auto rounded-lg border border-[#d5ddd2] bg-white p-4 shadow-sm xl:max-h-[calc(100vh-200px)] xl:w-[340px]">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t.filesTitle}</h2>
          <p className="text-xs text-[var(--muted)] mt-1">{t.filesSubtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-[#d5dde8] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f6f8fb] disabled:opacity-50 transition-colors"
            >
              {uploading ? t.uploading : t.uploadButton}
            </button>
            <button
              onClick={fetchFiles}
              className="rounded-md border border-[#d5dde8] px-3 py-2 text-sm hover:bg-[#f6f8fb]"
            >
              {t.refresh}
            </button>
            {files.length > 0 && (
              <button
                onClick={handleClearData}
                disabled={uploading || running || generating}
                className="rounded-md border border-[var(--error)]/40 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50"
                title={t.removeAllTitle}
              >
                {t.removeAll}
              </button>
            )}
          </div>
          <div className="mt-4">
            {files.length === 0 ? (
              <div className="rounded-md border-2 border-dashed border-[#d5dde8] bg-[#f8fafc] p-4 text-center text-sm text-[var(--muted)]">
                {t.noFiles}
              </div>
            ) : (
              <ul className="space-y-2 rounded-md border border-[#d5dde8] bg-[#f8fafc] p-3">
                {files.map((f) => (
                  <li key={f.name} className="flex justify-between text-xs">
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="shrink-0 ml-2 text-[var(--muted)]">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section className="rounded-lg border border-[#d5ddd2] bg-[#fffaf0] p-4">
            <h2 className="text-sm font-semibold mb-1">{t.diagnosticTitle}</h2>
            <p className="text-xs leading-5 text-[var(--muted)] mb-3">
              {t.diagnosticDescription}
            </p>
            <div className="mb-3 border border-[#ead6a0] bg-white px-3 py-2 text-xs text-[#6b4c12]">
              {files.length > 0 ? t.diagnosticReady : t.diagnosticWaiting}
            </div>
            <Link
              href={diagnosticHref}
              className="inline-flex w-full items-center justify-center rounded-md border border-[#c9a84b] bg-[#f2c14e] px-4 py-2.5 text-sm font-semibold text-[#17201b] hover:bg-[#ffd36b]"
            >
              {t.diagnosticButton}
            </Link>
          </section>

          <section className="rounded-lg border border-[#d5dde8] bg-[#f8fafc] p-4">
            <h2 className="text-sm font-semibold mb-1">{t.prepareTitle}</h2>
            <p className="text-xs leading-5 text-[var(--muted)] mb-3">
              {t.prepareDescription}
            </p>
            <button
              onClick={handleRunAgent1}
              disabled={running || files.length === 0}
              className="w-full rounded-md bg-[#172033] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#253149] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {running ? t.working : t.prepareButton}
            </button>
          </section>

          <section className="rounded-lg border border-[#d5dde8] bg-[#f8fafc] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold mb-1">{t.statusTitle}</h2>
                <p className="text-xs leading-5 text-[var(--muted)]">
                  {t.statusDescription}
                </p>
              </div>
              <button
                onClick={fetchResults}
                className="shrink-0 rounded-md border border-[#d5dde8] px-2 py-1 text-xs hover:bg-white"
              >
                {t.refresh}
              </button>
            </div>
            {!manifest ? (
              <div className="mt-3 rounded-md border-2 border-dashed border-[#d5dde8] bg-white p-4 text-center text-xs text-[var(--muted)]">
                {t.noResults}
              </div>
            ) : (
                <div className="mt-3 space-y-4">
                  <div className="rounded-md border border-[var(--success)]/40 bg-[var(--success-bg)] p-4">
                    <p className="text-sm text-[var(--success)] font-medium">
                      {t.ready}
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                      {t.readyDescription}
                    </p>
                    {Array.isArray(sourceFiles) && sourceFiles.length > 0 && (
                      <p className="text-xs text-[var(--muted)] mt-3">
                        {t.filesFromUpload(sourceFiles.length)}
                      </p>
                    )}
                  </div>
                  {qualityFlags.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">{t.dataQuality}</h3>
                      <ul className="space-y-2">
                        {qualityFlags.map((f, i) => (
                          <li key={i} className="rounded-md border border-[#d5dde8] bg-white p-3 text-sm">
                            <span className={`font-medium ${
                              f.severity === "high" ? "text-[var(--error)]" :
                              f.severity === "medium" ? "text-[var(--warning)]" : "text-[var(--muted)]"
                            }`}>
                              {f.severity}:
                            </span>{" "}
                            {f.issue}
                            {f.suggested_fix && (
                              <div className="mt-1 text-xs text-[var(--muted)]">{t.suggestion}: {f.suggested_fix}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
        </aside>

        {/* Right: Draft */}
        <main className="flex min-h-[640px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#d5ddd2] bg-white shadow-sm xl:flex-[1.2]">
          <div className="shrink-0 border-b border-[#d5ddd2] px-5 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">{t.draftTitle}</h2>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  {t.draftSubtitle}
                </p>
              </div>
              {(generatedCount > 0 || hasDraft) && (
                <button
                  onClick={handleClearAll}
                  disabled={generating}
                  className="rounded-md border border-[var(--error)]/40 px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50 transition-colors"
                >
                  {t.clearAll}
                </button>
              )}
            </div>
          </div>
          {manifest && (
            <div className="shrink-0 border-b border-[#d5ddd2] bg-[#f8fafc] px-5 py-4">
              {generating ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--accent)] font-medium">
                    {generatingSectionIndex >= 0
                      ? t.generatingSection(generatingSectionIndex + 1, SECTION_ORDER.length)
                      : `${t.generating}…`}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {t.finalOnly}
                  </p>
                </div>
              ) : allSectionsDone ? (
                <p className="text-sm text-[var(--foreground)]">
                  {t.allDone}
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--foreground)] mb-3">
                    {generatedCount === 0
                      ? t.generateAllSections
                      : t.sectionsComplete(generatedCount, SECTION_ORDER.length)}
                    {missingSectionIds.length > 0 && generatedCount > 0 && (
                      <>
                        {" "}
                        {hasGapSections
                          ? t.missingWithGaps(missingSectionIds.length, lastGeneratedIndex + 1)
                          : t.remainingSections(missingSectionIds.length)}
                      </>
                    )}
                  </p>
                  {agent2Status && !agent2Status.ok && (
                    <div className="mb-3 rounded-md border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-3 py-2 text-xs">
                      <p className="font-medium text-[var(--warning)]">{t.setupIssue}</p>
                      <p className="mt-1 text-[var(--muted)]">{agent2Status.spawn || t.backendSetup}</p>
                      <button onClick={fetchAgent2Status} className="mt-2 text-[var(--accent)] hover:underline">{t.recheck}</button>
                    </div>
                  )}
                  {agent2Status?.ok && agent2Status.hint && (
                    <p className="text-xs text-[var(--muted)] mb-3">{agent2Status.hint}</p>
                  )}
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={handleGenerateAllSequential}
                      disabled={generating}
                      className="rounded-md bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#115e59] disabled:opacity-50"
                    >
                      {generateAllLabel}
                    </button>
                    {missingSectionIds.length > 0 && generatedCount > 0 && (
                      <button
                        onClick={handleGenerateNext}
                        disabled={generating}
                        className="rounded-md border-2 border-[#0f766e] px-4 py-2 text-sm font-medium text-[#0f766e] hover:bg-[#e8f3ef]"
                      >
                        {nextMissingLabel}
                      </button>
                    )}
                    <button
                      onClick={fetchAgent2Status}
                      disabled={generating}
                      className="rounded-md border border-[#d5dde8] px-3 py-2 text-xs text-[var(--muted)] hover:bg-white disabled:opacity-50"
                      title={t.checkSetupTitle}
                    >
                      {t.checkSetup}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto bg-white px-5 py-4">
            <div className="space-y-2">
              {SECTION_ORDER.map((sectionId, index) => {
                const name = SECTION_NAMES[sectionId];
                const savedContent = parsedSections[sectionId];
                const isStreaming =
                  generating && sectionStream?.sectionId === sectionId;
                const stream = isStreaming ? sectionStream : null;
                const hasContent = sectionHasContent(savedContent);
                const isComplete = sectionIsComplete(savedContent, sectionId);
                const showFinalContent = isComplete && !isStreaming;
                const isGenerated = showFinalContent;
                const isInProgress = isStreaming;
                const isMissingGap =
                  !isGenerated &&
                  !isInProgress &&
                  hasContent &&
                  lastGeneratedIndex >= 0 &&
                  index < lastGeneratedIndex;
                const isThinDraft =
                  !isGenerated &&
                  !isInProgress &&
                  hasContent &&
                  !isMissingGap;
                const isModifying = modifyingSectionId === sectionId;
                const isExpanded = expandedSectionId === sectionId;
                const phaseLabel =
                  stream?.activePhase && t.phaseLabels[stream.activePhase]
                    ? t.phaseLabels[stream.activePhase]
                    : t.generating;
                const previewRaw = isComplete
                  ? savedContent!
                      .replace(/^#{1,6}\s+/gm, "")
                      .replace(/\*\*(.+?)\*\*/g, "$1")
                      .replace(/\*(.+?)\*/g, "$1")
                      .replace(/`(.+?)`/g, "$1")
                      .replace(/\[\[AI:[^\]]*\]\]/g, "")
                      .replace(/\s+/g, " ")
                      .trim()
                  : "";
                const preview = previewRaw
                  ? previewRaw.slice(0, 120) + (previewRaw.length > 120 ? "…" : "")
                  : null;
                const statusLabel = isInProgress
                  ? t.sectionStatusRunning
                  : isGenerated
                    ? t.sectionStatusComplete
                    : isMissingGap
                      ? t.sectionStatusMissing
                      : isThinDraft
                        ? t.sectionStatusThin
                        : t.sectionStatusPending;
                const statusClass = isInProgress
                  ? "bg-[#e8f3ef] text-[#0f766e]"
                  : isGenerated
                    ? "bg-[var(--success-bg)] text-[var(--success)]"
                    : isMissingGap
                      ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                      : isThinDraft
                        ? "bg-[#fffaf0] text-[#6b4c12]"
                        : "bg-white text-[var(--muted)]";

                return (
                  <div
                    key={sectionId}
                    className={`rounded-lg border transition-colors ${
                      isInProgress
                        ? "border-[#0f766e] bg-[#e8f3ef]"
                        : isGenerated
                          ? "border-[var(--success)]/30 bg-[var(--success-bg)]/40"
                          : "border-dashed border-[#d5dde8] bg-[#f8fafc]"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 px-4 py-3 select-none ${isInProgress ? "cursor-default" : "cursor-pointer"}`}
                      onClick={() => {
                        if (isModifying || isInProgress) return;
                        setExpandedSectionId((id) =>
                          isGenerated && id === sectionId ? null : sectionId
                        );
                      }}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)]/8 text-xs font-semibold text-[var(--foreground)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--foreground)] leading-snug">{name}</div>
                        {!isGenerated && !isInProgress && (
                          <div className={`text-xs mt-0.5 italic ${isMissingGap ? "text-[var(--warning)]" : isThinDraft ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                            {isMissingGap
                              ? t.missing
                              : isThinDraft
                                ? t.thinDraft
                                : t.pending}
                          </div>
                        )}
                        {isInProgress && (
                          <div className="text-xs text-[var(--accent)] mt-0.5">
                            {phaseLabel}…
                          </div>
                        )}
                        {isGenerated && !isExpanded && preview && (
                          <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{preview}</div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`px-2 py-1 text-xs font-semibold ${statusClass}`}>
                          {statusLabel}
                        </span>
                        {isGenerated && !isModifying && !isInProgress && (
                          <>
                          <button
                            onClick={() => handleModifySection(sectionId)}
                            className="text-xs rounded-lg border border-[var(--border)] px-2.5 py-1.5 hover:bg-[var(--background)] transition-colors"
                          >
                            {t.modify}
                          </button>
                          <span className="text-[var(--muted)] self-center">
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]/50 mt-0">
                        {isModifying ? (
                          <div className="pt-4 space-y-3">
                            <textarea
                              value={modificationInput}
                              onChange={(e) => setModificationInput(e.target.value)}
                              placeholder={t.modificationPlaceholder}
                              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleModifyAndRegenerate}
                                disabled={generating || !modificationInput.trim()}
                                className="rounded-lg bg-[var(--foreground)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                              >
                                {generating ? t.regenerating : t.regenerate}
                              </button>
                              <button
                                onClick={() => { setModifyingSectionId(null); setModificationInput(""); }}
                                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                              >
                                {t.cancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-4 space-y-4">
                            {isInProgress && (
                              <p className="text-xs text-[var(--muted)] italic">
                                {t.finalTextHint(phaseLabel)}
                              </p>
                            )}
                            {showFinalContent && (
                              <SectionMarkdown
                                className="text-[15px] leading-[1.7] text-[var(--foreground)] break-words"
                              >
                                {savedContent}
                              </SectionMarkdown>
                            )}
                            {!showFinalContent && !isInProgress && (
                              <p className="text-xs text-[var(--muted)] italic">{t.noContent}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </main>

        <aside className="w-full shrink-0 space-y-4 overflow-auto rounded-lg border border-[#d5ddd2] bg-white p-4 shadow-sm xl:max-h-[calc(100vh-200px)] xl:w-[360px]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">{t.reviewTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{t.reviewSubtitle}</p>
          </div>

          {!manifest ? (
            <div className="rounded-md border-2 border-dashed border-[#d5dde8] bg-[#f8fafc] p-4 text-sm text-[var(--muted)]">
              {t.reviewWaiting}
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-[#d5dde8] bg-[#f8fafc] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">{t.selectedSection}</p>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{reviewSectionName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {reviewSectionHasDraft
                        ? t.sectionsComplete(reviewSectionComplete ? 1 : 0, 1)
                        : t.sectionStatusPending}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 text-xs font-semibold ${
                      reviewSectionComplete
                        ? "bg-[var(--success-bg)] text-[var(--success)]"
                        : reviewSectionHasDraft
                          ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                          : "bg-white text-[var(--muted)]"
                    }`}
                  >
                    {reviewSectionComplete
                      ? t.sectionStatusComplete
                      : reviewSectionHasDraft
                        ? t.sectionStatusThin
                        : t.sectionStatusPending}
                  </span>
                </div>
              </section>

              <section className="rounded-lg border border-[#d5dde8] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">{t.sourceFilesTitle}</p>
                {reviewSourceFiles.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {reviewSourceFiles.slice(0, 5).map((file) => (
                      <li key={file} className="truncate border border-[#edf0eb] bg-[#f8fafc] px-3 py-2 text-xs text-[var(--foreground)]">
                        {file}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.noSources}</p>
                )}
              </section>

              <section className="rounded-lg border border-[#d5dde8] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">{t.missingInputsTitle}</p>
                {reviewMissingRequests.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {reviewMissingRequests.slice(0, 3).map((request, index) => (
                      <li key={`${request.section}-${index}`} className="border border-[#ead6a0] bg-[#fffaf0] p-3 text-xs">
                        <p className="font-semibold text-[#6b4c12]">
                          {request.section || t.reviewRequired}
                        </p>
                        {request.missing_items && request.missing_items.length > 0 && (
                          <ul className="mt-2 space-y-1 text-[#6b4c12]">
                            {request.missing_items.slice(0, 3).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                        {request.why_needed_for_prospectus && (
                          <p className="mt-2 leading-5 text-[var(--muted)]">
                            {request.why_needed_for_prospectus}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.noMissingInputs}</p>
                )}
              </section>

              <section className="rounded-lg border border-[#d5dde8] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">{t.qualityFlagsTitle}</p>
                {qualityFlags.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {qualityFlags.slice(0, 4).map((flag, index) => (
                      <li key={`${flag.issue}-${index}`} className="border border-[#edf0eb] bg-[#f8fafc] p-3 text-xs">
                        <span className={`font-semibold ${
                          flag.severity === "high"
                            ? "text-[var(--error)]"
                            : flag.severity === "medium"
                              ? "text-[var(--warning)]"
                              : "text-[var(--muted)]"
                        }`}>
                          {flag.severity}:
                        </span>{" "}
                        <span>{flag.issue}</span>
                        {flag.suggested_fix && (
                          <p className="mt-1 leading-5 text-[var(--muted)]">{t.suggestion}: {flag.suggested_fix}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t.noQualityFlags}</p>
                )}
              </section>

              <section className={`rounded-lg border p-4 ${
                allSectionsDone
                  ? "border-[var(--success)]/40 bg-[var(--success-bg)]"
                  : "border-[#ead6a0] bg-[#fffaf0]"
              }`}>
                <p className="text-xs font-semibold uppercase text-[var(--muted)]">{t.exportReadinessTitle}</p>
                <p className={`mt-2 text-sm font-semibold ${
                  allSectionsDone ? "text-[var(--success)]" : "text-[#6b4c12]"
                }`}>
                  {allSectionsDone ? t.exportReady : t.exportBlocked}
                </p>
                {!allSectionsDone && (
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{t.exportBlockedHint}</p>
                )}
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
