// app/page.tsx - Main page: Agent1 + Agent2 flow
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type DataFile = { name: string; size: number; lastModified: string };

type Manifest = {
  sections?: Array<{ id: string; name: string; chunk_count: number }>;
  total_chunks?: number;
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
  "GlobalOfferingStructure",
];

const SECTION_NAMES: Record<string, string> = {
  ExpectedTimetable: "Expected Timetable",
  Contents: "Contents",
  Summary: "Summary",
  Definitions: "Definitions",
  Glossary: "Glossary of Technical Terms",
  ForwardLooking: "Forward-Looking Statements",
  RiskFactors: "Risk Factors",
  Waivers: "Waivers from Strict Compliance with Listing Rules (Waivers and Exemptions)",
  InfoProspectus: "Information about this Prospectus and the Global Offering",
  DirectorsParties: "Directors and Parties Involved in the Global Offering",
  CorporateInfo: "Corporate Information",
  Regulation: "Regulation (Regulatory Overview)",
  IndustryOverview: "Industry Overview",
  HistoryReorg: "History, Reorganization, and Corporate Structure",
  Business: "Business",
  ContractualArrangements: "Contractual Arrangements (Variable Interest Entities)",
  ControllingShareholders: "Relationship with Our Controlling Shareholders",
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
      if (
        firstLine === name ||
        firstLine.startsWith(name) ||
        firstLine.includes(sid)
      ) {
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
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const [generatingSectionIndex, setGeneratingSectionIndex] = useState(-1);
  const [modificationInput, setModificationInput] = useState("");
  const [modifyingSectionId, setModifyingSectionId] = useState<string | null>(null);
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
    const data = (await res.json()) as { ok?: boolean; error?: string };
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
    try {
      const res = await fetch("/api/agent2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: remaining }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchDraft();
      setCurrentSectionIndex(SECTION_ORDER.length - 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
      setGeneratingSectionIndex(-1);
    }
  }

  async function handleGenerateDirectly() {
    await generateSection(SECTION_ORDER[0]);
    setCurrentSectionIndex(0);
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

  const manifest = results?.manifest ?? results?.classification;
  const qualityFlags =
    results?.manifest?.data_quality_flags ??
    results?.classification?.data_quality_flags ??
    [];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex h-screen">
        {/* Left: Excel files (data/) */}
        <aside className="w-[340px] border-r bg-white p-4 overflow-auto">
          <h2 className="text-sm font-semibold">Excel files (data/)</h2>
          <div className="mt-3 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload .xlsx"}
            </button>
            <button
              onClick={fetchFiles}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="mt-4">
            {files.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-xs text-neutral-500">
                No Excel files. Upload .xlsx to proceed.
              </div>
            ) : (
              <ul className="space-y-2 rounded-lg border p-3">
                {files.map((f) => (
                  <li key={f.name} className="flex justify-between text-xs">
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="shrink-0 ml-2 text-neutral-500">
                      {formatBytes(f.size)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Center: Agent1 + Agent2 flow */}
        <main className="flex-1 flex flex-col overflow-auto">
          <header className="border-b bg-white px-4 py-3 shrink-0">
            <div className="text-sm font-semibold">Prospectus Generator</div>
            <div className="text-xs text-neutral-500">
              Agent1 (Excel → summaries) → Agent2 (generate prospectus)
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Step 1: Run Agent1 */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-sm font-semibold mb-4">1. Run Agent1</h2>
              <p className="text-sm text-neutral-600 mb-4">
                Generate content summaries for each Excel table for Agent2 RAG. Takes a few minutes.
              </p>
              <button
                onClick={handleRunAgent1}
                disabled={running || files.length === 0}
                className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? "Running…" : "Run Agent1"}
              </button>
            </section>

            {/* Step 2: Agent1 results */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-sm font-semibold mb-4">2. Agent1 Results</h2>
              <button
                onClick={fetchResults}
                className="text-xs rounded border px-2 py-1 hover:bg-neutral-50 mb-4"
              >
                Refresh results
              </button>

              {!manifest ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-neutral-500">
                  No results yet. Run Agent1 first.
                </div>
              ) : (
                <div className="space-y-6">
                  {manifest && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                      <p className="text-sm text-green-800 mb-2">
                        Table summaries generated. Start generating the prospectus section by section on the right.
                      </p>
                      {"total_chunks" in manifest && typeof manifest.total_chunks === "number" && (
                        <p className="text-xs text-green-700">
                          {manifest.total_chunks} RAG chunks from {Array.isArray(manifest.source_files) ? manifest.source_files.length : 0} Excel files
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sections summary */}
                  {manifest.sections &&
                    Array.isArray(manifest.sections) &&
                    manifest.sections.length > 0 && (
                      <div className="relative">
                        <h3 className="text-xs font-semibold text-neutral-600 mb-2">
                          Section overview (hover to preview)
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {manifest.sections.map(
                            (s: {
                              id: string;
                              name: string;
                              chunk_count: number;
                            }) => (
                              <div
                                key={s.id}
                                className="relative"
                                onMouseEnter={() => handleSectionHover(s.id)}
                                onMouseLeave={handleSectionLeave}
                              >
                                <div className="rounded-lg border p-3 text-sm cursor-default hover:border-blue-300 transition-colors">
                                  <div className="font-medium">{s.id}</div>
                                  <div className="truncate text-xs text-neutral-500">
                                    {s.name}
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-600">
                                    {s.chunk_count} chunks
                                  </div>
                                </div>
                                {hoveredSectionId === s.id && hoveredSectionContent && (
                                  <div
                                    className="absolute left-full top-0 ml-2 z-50 w-80 max-h-64 overflow-auto rounded-lg border bg-white p-3 text-xs shadow-lg"
                                    onMouseEnter={handleTooltipEnter}
                                    onMouseLeave={handleTooltipLeave}
                                  >
                                    <div className="font-medium text-neutral-700 mb-2">
                                      {s.name} – preview
                                    </div>
                                    <pre className="whitespace-pre-wrap break-words text-neutral-600 font-sans">
                                      {hoveredSectionContent}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                        {"total_chunks" in manifest &&
                          typeof manifest.total_chunks === "number" && (
                            <p className="mt-2 text-xs text-neutral-500">
                              {manifest.total_chunks} chunks total
                            </p>
                          )}
                      </div>
                    )}

                  {/* Data quality flags */}
                  {qualityFlags.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold text-neutral-600">
                        Data quality flags
                      </h3>
                      <ul className="space-y-2">
                        {qualityFlags.map((f, i) => (
                          <li key={i} className="rounded-lg border p-3 text-sm">
                            <span
                              className={`font-medium ${
                                f.severity === "high"
                                  ? "text-red-600"
                                  : f.severity === "medium"
                                    ? "text-amber-600"
                                    : "text-neutral-600"
                              }`}
                            >
                              {f.severity}:
                            </span>{" "}
                            {f.issue}
                            {f.suggested_fix && (
                              <div className="mt-1 text-xs text-neutral-500">
                                Suggestion: {f.suggested_fix}
                              </div>
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

        {/* Right: Draft - section by section */}
        <aside className="w-[420px] border-l bg-white p-4 overflow-auto shrink-0 flex flex-col">
          <div className="flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-sm font-semibold">Prospectus Draft</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Generate section by section in order. Modify or continue to next after each.
              </p>
            </div>
            {(currentSectionIndex >= 0 || draftMd.includes("## ")) && (
              <button
                onClick={handleClearAll}
                disabled={generating}
                className="text-xs rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="mt-3 flex-1 overflow-auto space-y-4">
            {SECTION_ORDER.map((sectionId, index) => {
              const name = SECTION_NAMES[sectionId];
              const content = parseDraftSections(draftMd)[sectionId];
              const isGenerated = !!content;
              const isCurrent = index === currentSectionIndex;
              const isModifying = modifyingSectionId === sectionId;
              return (
                <div
                  key={sectionId}
                  className={`rounded-xl border p-4 shrink-0 ${
                    isGenerated
                      ? "border-green-200 bg-green-50/50"
                      : "border-dashed border-neutral-200 bg-neutral-50/30"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">
                      Part {index + 1}: {name}
                    </span>
                    {isGenerated && !isModifying && (
                      <button
                        onClick={() => handleModifySection(sectionId)}
                        className="text-xs rounded border px-2 py-1 hover:bg-white"
                      >
                        Modify
                      </button>
                    )}
                  </div>
                  {!isGenerated ? (
                    <div className="text-xs text-neutral-500 italic">
                      Pending
                    </div>
                  ) : isModifying ? (
                    <div className="space-y-2">
                      <textarea
                        value={modificationInput}
                        onChange={(e) => setModificationInput(e.target.value)}
                        placeholder="Enter modification instructions…"
                        className="w-full rounded border px-2 py-1.5 text-xs resize-none h-16"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleModifyAndRegenerate}
                          disabled={generating || !modificationInput.trim()}
                          className="rounded bg-neutral-900 text-white px-3 py-1 text-xs disabled:opacity-50"
                        >
                          {generating ? "Regenerating…" : "Regenerate"}
                        </button>
                        <button
                          onClick={() => {
                            setModifyingSectionId(null);
                            setModificationInput("");
                          }}
                          className="rounded border px-3 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto bg-white/60 rounded p-2">
                      {content}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions: generate all / generate next / modify */}
          {manifest && (
            <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50/80 p-4 shrink-0">
              {generating ? (
                <p className="text-sm text-blue-900">
                  {generatingSectionIndex >= 0
                    ? `Generating all remaining sections (${SECTION_ORDER.length - generatingSectionIndex} sections)… Model loaded once, please wait.`
                    : "Generating…"}
                </p>
              ) : currentSectionIndex >= SECTION_ORDER.length - 1 ? (
                <p className="text-sm text-blue-900">
                  All sections generated. Click "Modify" on any block above to adjust.
                </p>
              ) : (
                <>
                  <p className="text-sm text-blue-900 mb-2">
                    {currentSectionIndex < 0
                      ? "Generate all sections sequentially (one by one). Each section completes before the next starts."
                      : `Generated up to part ${currentSectionIndex + 1}. Generate remaining sections or modify current.`}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleGenerateAllSequential}
                      disabled={generating}
                      className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {currentSectionIndex < 0
                        ? "Generate all sections"
                        : `Generate remaining (${SECTION_ORDER.length - currentSectionIndex - 1} sections)`}
                    </button>
                    {currentSectionIndex >= 0 && (
                      <button
                        onClick={handleGenerateNext}
                        disabled={generating}
                        className="rounded-lg border border-blue-600 px-4 py-2 text-sm text-blue-800 hover:bg-blue-100"
                      >
                        Generate next section
                      </button>
                    )}
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
