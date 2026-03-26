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
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [hoveredSectionContent, setHoveredSectionContent] = useState<string>("");
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
  const draftSections = parseDraftSections(draftMd);
  const finishedCount = SECTION_ORDER.filter((id) => Boolean(draftSections[id])).length;
  const canGenerateMore = currentSectionIndex < SECTION_ORDER.length - 1;
  const currentStep = !files.length
    ? 1
    : !manifest
      ? 2
      : canGenerateMore
        ? 3
        : 4;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
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

      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1800px] px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Prospectus Assistant</h1>
              <p className="text-sm text-[var(--muted)]">Upload documents, generate sections, and export draft.</p>
            </div>
            <div className="flex items-center gap-2">
              {(manifest || hasDraft) && (
                <button
                  onClick={handleStartOver}
                  disabled={generating || running}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)] disabled:opacity-50"
                >
                  Start over
                </button>
              )}
              {(currentSectionIndex >= 0 || hasDraft) && (
                <button
                  onClick={handleClearAll}
                  disabled={generating}
                  className="rounded-lg border border-[var(--error)]/40 px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] disabled:opacity-50"
                >
                  Clear draft
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            {[
              { id: 1, label: "Upload" },
              { id: 2, label: "Prepare" },
              { id: 3, label: "Generate" },
              { id: 4, label: "Export" },
            ].map((step, idx) => {
              const active = currentStep === step.id;
              const done = currentStep > step.id;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={`rounded-lg px-3 py-1.5 ${
                      active
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : done
                          ? "text-[var(--success)]"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {done ? "✓ " : ""}
                    {step.label}
                  </div>
                  {idx < 3 && <div className="h-px w-4 bg-[var(--border)]" />}
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

      <div className="mx-auto flex h-[calc(100vh-150px)] max-w-[1800px]">
        <aside className="w-80 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 overflow-auto">
          <div>
            <h2 className="text-sm font-semibold">Your files</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Upload `.xlsx` or `.json` documents.</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)] disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload files"}
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
              >
                Remove all
              </button>
            )}
          </div>

          <div className="mt-4">
            {files.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                No files yet
              </div>
            ) : (
              <ul className="space-y-2 rounded-lg border border-[var(--border)] p-3">
                {files.map((f) => (
                  <li key={f.name} className="flex justify-between text-xs">
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="ml-2 shrink-0 text-[var(--muted)]">{formatBytes(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6 space-y-6 min-w-0">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRunAgent1}
                disabled={running || files.length === 0}
                className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {running ? "Preparing..." : "Prepare documents"}
              </button>
              <button
                onClick={fetchResults}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)]"
              >
                Refresh status
              </button>
              {manifest && (
                <span className="text-xs text-[var(--success)]">Ready for section generation.</span>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleGenerateAllSequential}
                disabled={generating || !manifest || !canGenerateMore}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {generating ? "Generating..." : canGenerateMore ? "Generate remaining sections" : "All sections generated"}
              </button>
              {currentSectionIndex >= 0 && canGenerateMore && (
                <button
                  onClick={handleGenerateNext}
                  disabled={generating}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)] disabled:opacity-50"
                >
                  Generate next
                </button>
              )}
              <span className="text-xs text-[var(--muted)]">
                {finishedCount}/{SECTION_ORDER.length} sections ready
              </span>
            </div>
            {generating && (
              <p className="mt-2 text-xs text-[var(--muted)]">
                {generatingSectionIndex >= 0
                  ? `Working on sections ${generatingSectionIndex + 1} to ${SECTION_ORDER.length}.`
                  : "Generating..."}
              </p>
            )}
          </section>

          {manifest && Array.isArray(manifest.sections) && manifest.sections.length > 0 && (
            <section className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold">Section library</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">Hover a card to preview source highlights.</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {manifest.sections.map((s) => (
                  <div
                    key={s.id}
                    className="relative"
                    onMouseEnter={() => handleSectionHover(s.id)}
                    onMouseLeave={handleSectionLeave}
                  >
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/40 p-3">
                      <div className="text-sm font-semibold">{s.id}</div>
                      <div className="line-clamp-2 text-sm text-[var(--muted)]">{s.name}</div>
                    </div>
                    {hoveredSectionId === s.id && hoveredSectionContent && (
                      <div
                        className="absolute left-full top-0 z-50 ml-3 w-96 max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
                        onMouseEnter={handleTooltipEnter}
                        onMouseLeave={handleTooltipLeave}
                      >
                        <div className="mb-2 text-sm font-semibold">{s.name}</div>
                        <pre className="whitespace-pre-wrap break-words text-xs text-[var(--muted)]">
                          {hoveredSectionContent}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {qualityFlags.length > 0 && (
            <section className="rounded-xl border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-5">
              <h3 className="text-sm font-semibold">Review reminders</h3>
              <ul className="mt-2 space-y-2">
                {qualityFlags.map((f, i) => (
                  <li key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                    {f.issue}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <aside className="w-[560px] shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-[var(--border)] px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Draft sections</h2>
              <button
                onClick={handleExportDocx}
                disabled={exporting || !hasDraft}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {exporting ? "Exporting..." : "Export Word"}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">Click a section to expand. Use Edit to regenerate with instructions.</p>
          </div>
          <div className="flex-1 overflow-auto px-4 py-3">
            <div className="space-y-2">
              {SECTION_ORDER.map((sectionId, index) => {
                const name = SECTION_NAMES[sectionId];
                const content = draftSections[sectionId];
                const isGenerated = Boolean(content);
                const isExpanded = expandedSectionId === sectionId;
                const isModifying = modifyingSectionId === sectionId;
                const preview = content
                  ? `${content.slice(0, 120).replace(/\n/g, " ")}${content.length > 120 ? "..." : ""}`
                  : "";

                return (
                  <div
                    key={sectionId}
                    className={`rounded-xl border ${
                      isGenerated
                        ? "border-[var(--border)] bg-[var(--surface)]"
                        : "border-dashed border-[var(--border)] bg-[var(--background)]/40"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 px-4 py-3 ${isGenerated ? "cursor-pointer" : "cursor-default"}`}
                      onClick={() =>
                        !isModifying &&
                        isGenerated &&
                        setExpandedSectionId((current) => (current === sectionId ? null : sectionId))
                      }
                    >
                      <span className="mt-0.5 text-xs text-[var(--muted)]">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{name}</div>
                        {!isGenerated && <div className="mt-1 text-xs text-[var(--muted)]">Pending</div>}
                        {isGenerated && !isExpanded && (
                          <div className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{preview}</div>
                        )}
                      </div>
                      {isGenerated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModifySection(sectionId);
                            setExpandedSectionId(sectionId);
                          }}
                          className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--background)]"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {isExpanded && isGenerated && (
                      <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
                        {isModifying ? (
                          <div className="space-y-3">
                            <textarea
                              value={modificationInput}
                              onChange={(e) => setModificationInput(e.target.value)}
                              placeholder="Describe how to revise this section..."
                              className="min-h-[90px] w-full resize-none rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleModifyAndRegenerate}
                                disabled={generating || !modificationInput.trim()}
                                className="rounded-lg bg-[var(--foreground)] px-3 py-2 text-sm text-white disabled:opacity-50"
                              >
                                {generating ? "Updating..." : "Update section"}
                              </button>
                              <button
                                onClick={() => {
                                  setModifyingSectionId(null);
                                  setModificationInput("");
                                }}
                                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--background)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <pre
                            className="whitespace-pre-wrap break-words text-sm leading-7"
                            style={{ fontFamily: "var(--font-serif)" }}
                          >
                            {content}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
