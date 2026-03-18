// app/page.tsx - HKEX Prospectus AI: Agent1 + Agent2 pipeline
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

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

const SECTION_ORDER = [
  "ExpectedTimetable", "Contents", "Summary", "Definitions", "Glossary",
  "ForwardLooking", "RiskFactors", "Waivers", "InfoProspectus", "DirectorsParties",
  "CorporateInfo", "Regulation", "IndustryOverview", "HistoryReorg", "Business",
  "ContractualArrangements", "ControllingShareholders", "ConnectedTransactions",
  "DirectorsSeniorMgmt", "SubstantialShareholders", "ShareCapital", "FinancialInfo",
  "UseOfProceeds", "Underwriting", "GlobalOfferingStructure",
];

const SECTION_NAMES: Record<string, string> = {
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
  GlobalOfferingStructure: "Structure of the Global Offering",
};

function parseDraftSections(md: string): Record<string, string> {
  const sections: Record<string, string> = {};
  if (!md || md.includes("(Your generated prospectus will appear here.)"))
    return sections;
  const blocks = md.split(/\n## /);
  for (let i = 1; i < blocks.length; i++) {
    const firstLine = blocks[i].split("\n")[0]?.trim() ?? "";
    const content = blocks[i].split("\n").slice(1).join("\n").trim();
    for (const sid of SECTION_ORDER) {
      const name = SECTION_NAMES[sid];
      if (firstLine === name || firstLine.startsWith(name) || firstLine.includes(sid)) {
        sections[sid] = content;
        break;
      }
    }
  }
  return sections;
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
  { id: 1, label: "Upload Excel", short: "Upload" },
  { id: 2, label: "Process Data", short: "Agent1" },
  { id: 3, label: "Generate Sections", short: "Agent2" },
  { id: 4, label: "Export", short: "Export" },
];

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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const [generatingSectionIndex, setGeneratingSectionIndex] = useState(-1);
  const [modificationInput, setModificationInput] = useState("");
  const [modifyingSectionId, setModifyingSectionId] = useState<string | null>(null);
  const [agent2Status, setAgent2Status] = useState<{
    ok?: boolean;
    hint?: string;
    spawn?: string;
    checks?: Record<string, string>;
  } | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [hoveredSectionContent, setHoveredSectionContent] = useState<string>("");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const hoverLeaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setAgent2Status({ ok: false, hint: "Could not check Agent2 status." });
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

  useEffect(() => {
    if (!draftMd) return;
    const parsed = parseDraftSections(draftMd);
    let lastIndex = -1;
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      if (parsed[SECTION_ORDER[i]]) lastIndex = i;
    }
    if (lastIndex >= 0 && currentSectionIndex < lastIndex) {
      setCurrentSectionIndex(lastIndex);
    }
  }, [draftMd]);

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
    const res = await fetch("/api/agent2/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: sectionId,
        modification_instructions: modification || undefined,
      }),
    });
    let data: { ok?: boolean; error?: string };
    try {
      data = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      throw new Error(res.status === 404 ? "API not found." : `HTTP ${res.status} - check the terminal.`);
    }
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await fetchDraft();
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
    const startFrom = currentSectionIndex + 1;
    if (startFrom >= SECTION_ORDER.length) {
      setGenerating(false);
      return;
    }
    const remaining = SECTION_ORDER.slice(startFrom);
    setGeneratingSectionIndex(startFrom);
    const pollMs = 2000;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/agent2/draft");
        if (res.ok) {
          const data = (await res.json()) as { markdown?: string };
          const md = data.markdown ?? "";
          if (md && !md.includes("(Your generated prospectus will appear here.)")) {
            setDraftMd(md);
          }
        }
      } catch {
        /* ignore poll errors */
      }
    }, pollMs);
    try {
      const res = await fetch("/api/agent2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: remaining }),
      });
      let data: { ok?: boolean; error?: string };
      try {
        data = (await res.json()) as { ok?: boolean; error?: string };
      } catch {
        throw new Error(res.status === 404 ? "API not found. Is the dev server running?" : `HTTP ${res.status} - check the terminal for errors.`);
      }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchDraft();
      setCurrentSectionIndex(SECTION_ORDER.length - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      clearInterval(pollInterval);
      setGenerating(false);
      setGeneratingSectionIndex(-1);
    }
  }

  function handleGenerateNext() {
    const nextIndex = currentSectionIndex + 1;
    if (nextIndex >= SECTION_ORDER.length) return;
    generateSection(SECTION_ORDER[nextIndex]).then(() =>
      setCurrentSectionIndex(nextIndex)
    );
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

  async function handleSectionHover(sectionId: string) {
    if (hoverLeaveRef.current) {
      clearTimeout(hoverLeaveRef.current);
      hoverLeaveRef.current = null;
    }
    setHoveredSectionId(sectionId);
    try {
      const res = await fetch(`/api/agent1/section/${sectionId}`);
      if (res.ok) {
        const data = (await res.json()) as { preview?: string };
        setHoveredSectionContent(data.preview ?? "");
      } else {
        setHoveredSectionContent("");
      }
    } catch {
      setHoveredSectionContent("");
    }
  }

  function handleSectionLeave() {
    hoverLeaveRef.current = setTimeout(() => {
      setHoveredSectionId(null);
      setHoveredSectionContent("");
    }, 150);
  }

  function handleTooltipEnter() {
    if (hoverLeaveRef.current) {
      clearTimeout(hoverLeaveRef.current);
      hoverLeaveRef.current = null;
    }
  }

  function handleTooltipLeave() {
    setHoveredSectionId(null);
    setHoveredSectionContent("");
  }

  async function handleClearAll() {
    if (generating) return;
    try {
      const res = await fetch("/api/agent2/clear", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
      setCurrentSectionIndex(-1);
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
      setCurrentSectionIndex(-1);
      await fetchFiles();
      await fetchResults();
      await fetchDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed");
    }
  }

  async function handleStartOver() {
    if (generating || running) return;
    if (!confirm("Clear all Agent1 and Agent2 outputs? You will need to run Agent1 again.")) return;
    setError(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResults(null);
      setDraftMd(`# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`);
      setCurrentSectionIndex(-1);
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
  const qualityFlags =
    results?.manifest?.data_quality_flags ??
    results?.classification?.data_quality_flags ??
    [];
  const hasDraft = draftMd && draftMd.includes("## ") && !draftMd.includes("(Your generated prospectus will appear here.)");
  const currentStep = !files.length ? 1 : !manifest ? 2 : currentSectionIndex < SECTION_ORDER.length - 1 ? 3 : 4;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header + Pipeline stepper */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="mx-auto max-w-[1800px] px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-[var(--foreground)]">
                HKEX Prospectus AI
              </h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                Sponsor counsel drafting · Excel → RAG → Sections
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(manifest || hasDraft) && (
                <button
                  onClick={handleStartOver}
                  disabled={generating || running}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:opacity-50"
                  title="Clear Agent1 & Agent2 outputs, start from Upload"
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
                  <p className="text-xs text-[var(--muted)]">Generating .docx from section files…</p>
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
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Data source</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Upload .xlsx or .json for Agent1</p>
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

        {/* Center: Agent1 + Agent2 flow */}
        <main className="flex-1 flex flex-col overflow-auto min-w-0">
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Step 1: Process data (Agent1)</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                Excel: table summaries via Qwen. JSON: structured fields → RAG chunks. A few minutes for Excel.
              </p>
              <button
                onClick={handleRunAgent1}
                disabled={running || files.length === 0}
                className="rounded-lg bg-[var(--foreground)] text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {running ? "Processing…" : "Run Agent1"}
              </button>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <h2 className="text-base font-semibold mb-1">Step 2: RAG results</h2>
              <button
                onClick={fetchResults}
                className="text-xs rounded-lg border border-[var(--border)] px-2 py-1 hover:bg-[var(--background)] mb-4"
              >
                Refresh
              </button>
              {!manifest ? (
                <div className="rounded-lg border-2 border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)] text-center">
                  No results. Run Agent1 first.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg border border-[var(--success)]/40 bg-[var(--success-bg)] p-4">
                    <p className="text-sm text-[var(--success)] font-medium">
                      Ready for section generation
                    </p>
                    {("total_chunks" in manifest || "text_chunk_count" in manifest) && (
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {typeof manifest.text_chunk_count === "number" && typeof manifest.fact_count === "number"
                          ? `${manifest.text_chunk_count} text chunks + ${manifest.fact_count} facts`
                          : typeof manifest.total_chunks === "number"
                            ? `${manifest.total_chunks} RAG chunks`
                            : ""}
                        {` from ${Array.isArray(manifest.source_files) ? manifest.source_files.length : 0} files`}
                      </p>
                    )}
                  </div>
                  {Array.isArray(manifest.sections) && manifest.sections.length > 0 && (
                    <div className="relative">
                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">RAG sections</h3>
                      <p className="text-xs text-[var(--muted)] mb-3">Hover to preview content</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(manifest.sections as Array<{ id: string; name: string; chunk_count: number; fact_count?: number }>).map((s) => (
                          <div
                            key={s.id}
                            className="relative"
                            onMouseEnter={() => handleSectionHover(s.id)}
                            onMouseLeave={handleSectionLeave}
                          >
                            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-4 cursor-default hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-colors">
                              <div className="text-sm font-semibold text-[var(--foreground)]">{s.id}</div>
                              <div className="text-sm text-[var(--muted)] mt-0.5 leading-relaxed line-clamp-2">{s.name}</div>
                              <div className="mt-2 flex gap-3 text-xs text-[var(--muted)]">
                                <span>{s.chunk_count} chunks</span>
                                {typeof s.fact_count === "number" && s.fact_count > 0 && (
                                  <span>{s.fact_count} facts</span>
                                )}
                              </div>
                            </div>
                            {hoveredSectionId === s.id && hoveredSectionContent && (
                              <div
                                className="absolute left-full top-0 ml-3 z-50 w-96 max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
                                onMouseEnter={handleTooltipEnter}
                                onMouseLeave={handleTooltipLeave}
                              >
                                <div className="text-sm font-semibold text-[var(--foreground)] mb-2">{s.name}</div>
                                <div
                                  className="text-[13px] leading-relaxed text-[var(--muted)]"
                                  style={{ fontFamily: "var(--font-serif)" }}
                                >
                                  <pre className="whitespace-pre-wrap break-words font-[inherit] p-0 m-0">
                                    {hoveredSectionContent}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  25 sections in HKEX order · click to expand
                </p>
              </div>
              {(currentSectionIndex >= 0 || hasDraft) && (
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
                const content = parseDraftSections(draftMd)[sectionId];
                const isGenerated = !!content;
                const isModifying = modifyingSectionId === sectionId;
                const isExpanded = expandedSectionId === sectionId;
                const preview = content ? content.slice(0, 120).replace(/\n/g, " ") + (content.length > 120 ? "…" : "") : null;
                return (
                  <div
                    key={sectionId}
                    className={`rounded-xl border transition-colors ${
                      isGenerated ? "border-[var(--success)]/30 bg-[var(--success-bg)]/30" : "border-dashed border-[var(--border)] bg-[var(--background)]/30"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 px-4 py-3 select-none ${isGenerated ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() => !isModifying && isGenerated && setExpandedSectionId((id) => (id === sectionId ? null : sectionId))}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--foreground)]/8 text-xs font-semibold text-[var(--foreground)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--foreground)] leading-snug">{name}</div>
                        {!isGenerated && <div className="text-xs text-[var(--muted)] mt-0.5 italic">Pending</div>}
                        {isGenerated && !isExpanded && preview && (
                          <div className="text-xs text-[var(--muted)] mt-1 line-clamp-2">{preview}</div>
                        )}
                      </div>
                      {isGenerated && !isModifying && (
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
                          <div className="pt-4 prose prose-sm max-w-none">
                            <div
                              className="text-[15px] leading-[1.7] text-[var(--foreground)]"
                              style={{ fontFamily: "var(--font-serif)" }}
                            >
                              <pre className="whitespace-pre-wrap break-words font-[inherit] bg-transparent p-0 m-0 text-inherit">
                                {content}
                              </pre>
                            </div>
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
                      ? `Generating ${SECTION_ORDER.length - generatingSectionIndex} sections…`
                      : "Generating…"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    First run loads the AI model (1–5 min). Each section then takes ~2–5 min. Watch the terminal for progress.
                  </p>
                </div>
              ) : currentSectionIndex >= SECTION_ORDER.length - 1 ? (
                <p className="text-sm text-[var(--foreground)]">
                  All sections done. Use Modify above or Export to Word.
                </p>
              ) : (
                <>
                  <p className="text-sm text-[var(--foreground)] mb-3">
                    {currentSectionIndex < 0
                      ? "Generate all 25 sections sequentially."
                      : `Up to part ${currentSectionIndex + 1}. Continue or modify.`}
                  </p>
                  {agent2Status && !agent2Status.ok && (
                    <div className="mb-3 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 px-3 py-2 text-xs">
                      <p className="font-medium text-[var(--warning)]">Setup issue:</p>
                      <p className="mt-1 text-[var(--muted)]">{agent2Status.spawn || "Check Agent2 status"}</p>
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
                      {currentSectionIndex < 0 ? "Generate all" : `Remaining (${SECTION_ORDER.length - currentSectionIndex - 1})`}
                    </button>
                    {currentSectionIndex >= 0 && (
                      <button
                        onClick={handleGenerateNext}
                        disabled={generating}
                        className="rounded-lg border-2 border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10"
                      >
                        Next section
                      </button>
                    )}
                    <button
                      onClick={fetchAgent2Status}
                      disabled={generating}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50"
                      title="Verify Agent2 can run"
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
