"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

export default function Agent1Page() {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [results, setResults] = useState<{
    manifest?: Manifest;
    classification?: Classification;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draftMd, setDraftMd] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/agent1/files");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: DataFile[] };
      setFiles(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
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
        setDraftMd(data.markdown ?? null);
      } else {
        setDraftMd(null);
      }
    } catch {
      setDraftMd(null);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchResults();
  }, [fetchFiles, fetchResults]);

  useEffect(() => {
    const m = results?.manifest ?? results?.classification;
    if (m && !draftMd && !generating) {
      fetchDraft();
    }
  }, [results, draftMd, generating, fetchDraft]);

  async function handleUpload(filesToUpload: FileList | File[]) {
    const arr = Array.from(filesToUpload).filter((f) => f.size > 0);
    if (!arr.length) return;

    const fd = new FormData();
    arr.forEach((f) => fd.append("files", f, f.name));

    setUploading(true);
    setError(null);
    try {
      const res = await fetch("/api/agent1/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        uploaded?: Array<{ name: string; size: number }>;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      if (data.errors?.length) {
        setError(data.errors.join("\n"));
      }
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent1/run", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchResults();
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function handleGenerateDirectly() {
    setGenerating(true);
    setError(null);
    setDraftMd(null);
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
      const res = await fetch("/api/agent2/run", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const draftRes = await fetch("/api/agent2/draft");
      if (draftRes.ok) {
        const draftData = (await draftRes.json()) as { markdown?: string };
        setDraftMd(draftData.markdown ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      clearInterval(pollInterval);
      setGenerating(false);
    }
  }

  const manifest = results?.manifest ?? results?.classification;
  const qualityFlags =
    results?.manifest?.data_quality_flags ??
    results?.classification?.data_quality_flags ??
    [];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Back to Prospectus
            </Link>
            <h1 className="text-2xl font-semibold mt-1">
              Data intake
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Upload workbooks and prepare them for prospectus drafting on the home page
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Upload */}
        <section className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">1. Upload files</h2>
          <div className="flex gap-4 items-start">
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
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload .xlsx"}
            </button>
            <button
              onClick={fetchFiles}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              Refresh
            </button>
          </div>
          <div className="mt-4">
            {files.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-neutral-500">
                No Excel files. Upload .xlsx files to proceed.
              </div>
            ) : (
              <ul className="space-y-2 rounded-lg border p-4">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className="flex justify-between text-sm"
                  >
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="text-neutral-500 shrink-0 ml-2">
                      {formatBytes(f.size)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Run */}
        <section className="mb-8 rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">2. Prepare data</h2>
          <p className="text-sm text-neutral-600 mb-4">
            Reads your tables and builds material for each prospectus chapter. May take a few minutes.
          </p>
          <button
            onClick={handleRun}
            disabled={running || files.length === 0}
            className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? "Working…" : "Prepare data"}
          </button>
        </section>

        {/* Results */}
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-sm font-semibold mb-4">3. Chapter coverage</h2>
          <button
            onClick={fetchResults}
            className="text-xs rounded border px-2 py-1 hover:bg-neutral-50 mb-4"
          >
            Refresh results
          </button>

          {!manifest ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-neutral-500">
              No results yet. Complete step 2 first.
            </div>
          ) : (
            <div className="space-y-6">
              {manifest && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                  <p className="text-sm text-green-800 mb-4">
                    Your data is ready. Open the home page to draft sections, or generate here.
                  </p>
                  <button
                    onClick={handleGenerateDirectly}
                    disabled={generating}
                    className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {generating ? "Generating…" : "Generate"}
                  </button>
                </div>
              )}

              {Array.isArray(manifest.sections) && manifest.sections.length > 0 && (
                <p className="text-sm text-neutral-600">
                  Your material is ready for the main drafting workspace.
                </p>
              )}

              {/* Data quality flags */}
              {qualityFlags.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-600 mb-2">
                    Data quality
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

        {/* Prospectus draft */}
        {draftMd && (
          <section className="mt-8 rounded-xl border bg-white p-6">
            <h2 className="text-sm font-semibold mb-4">Prospectus Draft</h2>
            <div className="rounded-lg border bg-neutral-50 p-4">
              <textarea
                readOnly
                value={draftMd}
                className="w-full h-[400px] resize-y rounded-lg border px-3 py-2 text-sm font-mono outline-none"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
