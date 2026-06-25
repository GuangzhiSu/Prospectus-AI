// Prospectus AI — main drafting workspace (data prep + chapter coverage + draft)
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const PHASE_LABELS: Record<string, string> = {
  retriever: "Retrieving evidence",
  planner: "Planning outline",
  writer: "Writing draft",
  verifier: "Verifying draft",
  revision: "Revising draft",
  assembler: "Saving section",
  template: "Rendering template",
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

const STEPS = [
  { id: 1, label: "Upload", short: "Upload" },
  { id: 2, label: "Prepare data", short: "Prepare" },
  { id: 3, label: "Draft sections", short: "Draft" },
  { id: 4, label: "Export", short: "Export" },
];

function sectionOrderIndex(sectionId: string | undefined) {
  if (!sectionId) return -1;
  return (SECTION_ORDER as readonly string[]).indexOf(sectionId);
}

export default function Page() {
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
  const [draftMd, setDraftMd] = useState<string>(
    `# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`
  );
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
        setDraftMd(data.markdown ?? `# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
      }
    } catch {
      // keep current draft
    }
  }, []);

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
      setAgent2Status({ ok: false, hint: "Could not verify generation setup." });
    }
  }, []);

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
      setError(e instanceof Error ? e.message : "Upload failed");
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
      setError(e instanceof Error ? e.message : "Run failed");
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
      setError(e instanceof Error ? e.message : "Generation failed");
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
      setError(e instanceof Error ? e.message : "Generation failed");
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
      setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  async function handleClearData() {
    if (uploading || running || generating) return;
    if (!confirm("Remove all uploaded files and outputs? You can then upload completely new documents.")) return;
    setError(null);
    try {
      const [dataRes, resetRes] = await Promise.all([
        fetch("/api/agent1/clear-data", { method: "POST" }),
        fetch("/api/reset", { method: "POST" }),
      ]);
      const dataJson = (await dataRes.json()) as { ok?: boolean; error?: string };
      const resetJson = (await resetRes.json()) as { ok?: boolean; error?: string };
      if (!dataRes.ok || !dataJson.ok) throw new Error(dataJson.error || "Clear data failed");
      if (!resetRes.ok || !resetJson.ok) throw new Error(resetJson.error || "Reset failed");
      setResults(null);
      setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
      await fetchFiles();
      await fetchResults();
      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  async function handleStartOver() {
    if (generating || running) return;
    if (!confirm("Clear all processed data and the draft? You will need to prepare your files again.")) return;
    setError(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(null);
      setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
      await fetchFiles();
      await fetchResults();
      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
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
      setError(e instanceof Error ? e.message : "Export failed");
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
  const hasDraft = draftMd && draftMd.includes("## ") && !draftMd.includes("(Your generated prospectus will appear here.)");
  const allSectionsDone = hasDraft && missingSectionIds.length === 0;
  const hasGapSections =
    missingSectionIds.length > 0 &&
    lastGeneratedIndex >= 0 &&
    sectionOrderIndex(missingSectionIds[0]) < lastGeneratedIndex;
  const currentStep = !files.length ? 1 : !manifest ? 2 : allSectionsDone ? 4 : 3;
  const generateAllLabel =
    generatedCount === 0 ? "Generate all" : `Remaining (${missingSectionIds.length})`;
  const nextMissingSectionId = missingSectionIds[0];
  const nextMissingLabel = nextMissingSectionId
    ? `Next missing: ${SECTION_NAMES[nextMissingSectionId]}`
    : "Next missing";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header + Pipeline stepper */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="mx-auto max-w-[1800px] px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-[var(--foreground)]">
                Prospectus AI
              </h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                From your files to prospectus sections — draft, refine, export
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <AppBackendStatus />
                <a
                  href="/"
                  className="text-[var(--accent)] hover:underline"
                >
                  Product site
                </a>
                <a
                  href="/kg-view"
                  className="text-[var(--accent)] hover:underline"
                >
                  Knowledge Graph web view
                </a>
                <a
                  href="/download"
                  className="text-[var(--accent)] hover:underline"
                >
                  Download app
                </a>
                <a
                  href="/settings"
                  className="text-[var(--accent)] hover:underline"
                >
                  Model &amp; inference settings
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(manifest || hasDraft) && (
                <button
                  onClick={handleStartOver}
                  disabled={generating || running}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-50"
                  title="Clear processed data and draft, start from upload"
                >
                  Start over
                </button>
              )}
              {hasDraft && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleExportDocx}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                >
                  {exporting ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Exporting… (may take 10–30s)
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export to Word
                    </>
                  )}
                </button>
                {exporting && (
                  <p className="text-xs text-[var(--muted)]">Building your Word document…</p>
                )}
              </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = currentStep > s.id || (s.id === 3 && manifest);
              const active = currentStep === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                      active ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium" : ""
                    } ${done && !active ? "text-[var(--success)]" : ""}`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      done ? "bg-[var(--success)] text-white" :
                      active ? "bg-[var(--accent)] text-white" :
                      "bg-[var(--border)] text-[var(--muted)]"
                    }`}>
                      {done ? "✓" : s.id}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-px w-4 bg-[var(--border)]" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-[1800px] px-4 pt-3">
          <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1800px] flex h-[calc(100vh-140px)]">
        {/* Left: Excel files */}
        <aside className="w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 overflow-auto">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Your files</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Excel workbooks or structured JSON</p>
          <div className="mt-4 flex gap-2">
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
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--background)] disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading…" : "Upload .xlsx / .json"}
            </button>
            <button
              onClick={fetchFiles}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)]"
            >
              Refresh
            </button>
            {files.length > 0 && (
              <button
                onClick={handleClearData}
                disabled={uploading || running || generating}
                className="rounded-lg border border-[var(--error)]/40 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50"
                title="Remove all uploaded files, upload new documents"
              >
                Remove all
              </button>
            )}
          </div>
          <div className="mt-4">
            {files.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                No .xlsx or .json files yet
              </div>
            ) : (
              <ul className="space-y-2 rounded-lg border border-[var(--border)] p-3">
                {files.map((f) => (
                  <li key={f.name} className="flex justify-between text-xs">
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="shrink-0 ml-2 text-[var(--muted)]">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Center: prepare data + review coverage */}
        <main className="flex-1 flex flex-col overflow-auto min-w-0">
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Step 1: Prepare your data</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                We read your spreadsheets or JSON and organize them for each prospectus chapter. Large Excel files may take several minutes.
              </p>
              <button
                onClick={handleRunAgent1}
                disabled={running || files.length === 0}
                className="rounded-lg bg-[var(--foreground)] text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {running ? "Working…" : "Prepare data"}
              </button>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Step 2: Status</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                Confirms your files are processed and you can move on to drafting.
              </p>
              <button
                onClick={fetchResults}
                className="text-xs rounded-lg border border-[var(--border)] px-2 py-1 hover:bg-[var(--background)] mb-4"
              >
                Refresh
              </button>
              {!manifest ? (
                <div className="rounded-lg border-2 border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)] text-center">
                  No results yet. Use Step 1 after uploading files.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success-bg)] p-4">
                    <p className="text-sm text-[var(--success)] font-medium">
                      Ready to draft
                    </p>
                    <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                      Generate and edit your prospectus in the panel on the right.
                    </p>
                    {Array.isArray(sourceFiles) && sourceFiles.length > 0 && (
                      <p className="text-xs text-[var(--muted)] mt-3">
                        {sourceFiles.length} file
                        {sourceFiles.length === 1 ? "" : "s"} from your upload
                      </p>
                    )}
                  </div>
                  {qualityFlags.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-[var(--muted)]">Data quality</h3>
                      <ul className="space-y-2">
                        {qualityFlags.map((f, i) => (
                          <li key={i} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                            <span className={`font-medium ${
                              f.severity === "high" ? "text-[var(--error)]" :
                              f.severity === "medium" ? "text-[var(--warning)]" : "text-[var(--muted)]"
                            }`}>
                              {f.severity}:
                            </span>{" "}
                            {f.issue}
                            {f.suggested_fix && (
                              <div className="mt-1 text-xs text-[var(--muted)]">Suggestion: {f.suggested_fix}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Right: Draft */}
        <aside className="w-[520px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden">
          <div className="shrink-0 px-5 py-4 border-b border-[var(--border)]">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Prospectus draft</h2>
                <p className="text-sm text-[var(--muted)] mt-0.5">
                  25 sections in prospectus order · click to expand
                </p>
              </div>
              {(generatedCount > 0 || hasDraft) && (
                <button
                  onClick={handleClearAll}
                  disabled={generating}
                  className="text-sm rounded-lg border border-[var(--error)]/40 px-3 py-1.5 text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 py-3">
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
                  stream?.activePhase && PHASE_LABELS[stream.activePhase]
                    ? PHASE_LABELS[stream.activePhase]
                    : "Generating";
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

                return (
                  <div
                    key={sectionId}
                    className={`rounded-xl border transition-colors ${
                      isInProgress
                        ? "border-[var(--accent)]/50 bg-[var(--accent)]/5"
                        : isGenerated
                          ? "border-[var(--success)]/30 bg-[var(--success-bg)]/30"
                          : "border-dashed border-[var(--border)] bg-[var(--background)]/30"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 px-4 py-3 select-none ${isGenerated || isInProgress ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() =>
                        !isModifying &&
                        !isInProgress &&
                        isGenerated &&
                        setExpandedSectionId((id) => (id === sectionId ? null : sectionId))
                      }
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)]/8 text-xs font-semibold text-[var(--foreground)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--foreground)] leading-snug">{name}</div>
                        {!isGenerated && !isInProgress && (
                          <div className={`text-xs mt-0.5 italic ${isMissingGap ? "text-[var(--warning)]" : isThinDraft ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                            {isMissingGap
                              ? "Missing — not generated"
                              : isThinDraft
                                ? "Thin draft — regenerate recommended"
                                : "Pending"}
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
                      {isGenerated && !isModifying && !isInProgress && (
                        <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleModifySection(sectionId)}
                            className="text-xs rounded-lg border border-[var(--border)] px-2.5 py-1.5 hover:bg-[var(--background)] transition-colors"
                          >
                            Modify
                          </button>
                          <span className="text-[var(--muted)] self-center">
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-[var(--border)]/50 mt-0">
                        {isModifying ? (
                          <div className="pt-4 space-y-3">
                            <textarea
                              value={modificationInput}
                              onChange={(e) => setModificationInput(e.target.value)}
                              placeholder="Modification instructions…"
                              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleModifyAndRegenerate}
                                disabled={generating || !modificationInput.trim()}
                                className="rounded-lg bg-[var(--foreground)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                              >
                                {generating ? "Regenerating…" : "Regenerate"}
                              </button>
                              <button
                                onClick={() => { setModifyingSectionId(null); setModificationInput(""); }}
                                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-4 space-y-4">
                            {isInProgress && (
                              <p className="text-xs text-[var(--muted)] italic">
                                {phaseLabel}… Final text will appear when this section is saved.
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
                              <p className="text-xs text-[var(--muted)] italic">No content yet.</p>
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

          {manifest && (
            <div className="mt-4 rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4 shrink-0">
              {generating ? (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--accent)] font-medium">
                    {generatingSectionIndex >= 0
                      ? `Generating section ${generatingSectionIndex + 1} of ${SECTION_ORDER.length}…`
                      : "Generating…"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Only the final verified section appears when each step completes.
                  </p>
                </div>
              ) : allSectionsDone ? (
                <p className="text-sm text-[var(--foreground)]">
                  All sections done. Use Modify above or Export to Word.
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--foreground)] mb-3">
                    {generatedCount === 0
                      ? "Generate all 25 sections sequentially."
                      : `${generatedCount} of ${SECTION_ORDER.length} sections complete.`}
                    {missingSectionIds.length > 0 && generatedCount > 0 && (
                      <>
                        {" "}
                        {hasGapSections
                          ? `${missingSectionIds.length} missing (including gaps before section ${lastGeneratedIndex + 1}).`
                          : `${missingSectionIds.length} remaining.`}
                      </>
                    )}
                  </p>
                  {agent2Status && !agent2Status.ok && (
                    <div className="mb-3 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-3 py-2 text-xs">
                      <p className="font-medium text-[var(--warning)]">Setup issue:</p>
                      <p className="mt-1 text-[var(--muted)]">{agent2Status.spawn || "Check backend setup in the terminal."}</p>
                      <button onClick={fetchAgent2Status} className="mt-2 text-[var(--accent)] hover:underline">Re-check</button>
                    </div>
                  )}
                  {agent2Status?.ok && agent2Status.hint && (
                    <p className="text-xs text-[var(--muted)] mb-3">{agent2Status.hint}</p>
                  )}
                  <div className="flex gap-2 flex-wrap items-center">
                    <button
                      onClick={handleGenerateAllSequential}
                      disabled={generating}
                      className="rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      {generateAllLabel}
                    </button>
                    {missingSectionIds.length > 0 && generatedCount > 0 && (
                      <button
                        onClick={handleGenerateNext}
                        disabled={generating}
                        className="rounded-lg border-2 border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                      >
                        {nextMissingLabel}
                      </button>
                    )}
                    <button
                      onClick={fetchAgent2Status}
                      disabled={generating}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50"
                      title="Verify the drafting backend is ready"
                    >
                      Check setup
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
