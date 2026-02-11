// app/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";

type LocalAttachment = { id: string; file: File };

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number; // ms
  attachments?: { name: string; size: number; type: string }[];
};

type StoredLocalDoc = {
  storedName: string;
  name: string;
  size: number;
  lastModified: string;
};

function uid(prefix = "id") {
  // Use browser crypto if available (client-side)
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(16).slice(2)}_${Date.now()}`;
  return `${prefix}_${rnd}`;
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

// Upgrade A: restrict to PDF/DOCX
const ALLOWED_EXT = [".pdf", ".docx"];
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const DEFAULT_PROMPT =
  "Generate the full prospectus draft from the uploaded documents.";

function isAllowedClientFile(f: File) {
  const lower = f.name.toLowerCase();
  const extOk = ALLOWED_EXT.some((ext) => lower.endsWith(ext));
  const mimeOk = f.type ? ALLOWED_MIME.has(f.type) : false;
  // accept if either matches (some browsers provide empty MIME)
  return extOk || mimeOk;
}

export default function Page() {
  // Fix A: mounted flag to avoid hydration mismatch (timestamps & locale formatting)
  const [mounted, setMounted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draftMd, setDraftMd] = useState<string>(
    `# Prospectus Draft\n\n(Your generated prospectus will appear here.)\n`
  );

  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  // Upgrade B: show saved local docs (persist across refresh/reopen)
  const [storedDocs, setStoredDocs] = useState<StoredLocalDoc[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const attachmentMeta = useMemo(
    () =>
      attachments.map((a) => ({
        name: a.file.name,
        size: a.file.size,
        type: a.file.type || "application/octet-stream",
      })),
    [attachments]
  );
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== "user"),
    [messages]
  );

  async function fetchProgress() {
    try {
      const res = await fetch("/api/progress", { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        completed?: number;
        total?: number;
      };
      setProgress({
        completed: typeof data.completed === "number" ? data.completed : 0,
        total: typeof data.total === "number" ? data.total : 0,
      });
    } catch {
      // ignore progress errors
    }
  }

  async function refreshStoredDocs() {
    try {
      const res = await fetch("/api/files", { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: StoredLocalDoc[] };
      setStoredDocs(Array.isArray(data.items) ? data.items : []);
    } catch {
      // ignore fetch errors for now
    }
  }

  useEffect(() => {
    setMounted(true);

    // Add a welcome message AFTER mount to avoid SSR/client mismatches (Date.now, random ids)
    setMessages([
      {
        id: uid("m"),
        role: "assistant",
        content:
          'Upload PDF/DOCX documents and click "Generate". The draft will appear on the right.',
        createdAt: Date.now(),
      },
    ]);

    refreshStoredDocs();
  }, []);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.size > 0);

    const allowed = arr.filter(isAllowedClientFile);
    const rejected = arr.filter((f) => !isAllowedClientFile(f));

    if (rejected.length) {
      setNotice(
        `Rejected ${rejected.length} file(s). Only PDF/DOCX allowed: ${rejected
          .map((x) => x.name)
          .join(", ")}`
      );
      window.setTimeout(() => setNotice(null), 6000);
    }

    const kept = allowed
      .slice(0, 10) // cap per message
      .map((file) => ({ id: uid("f"), file }));

    setAttachments((prev) => [...prev, ...kept]);
  }

  function onPickFiles() {
    fileInputRef.current?.click();
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function generate() {
    const trimmed = DEFAULT_PROMPT.trim();
    if (!trimmed && attachments.length === 0) return;

    const userMsg: Message = {
      id: uid("m"),
      role: "user",
      content: trimmed || "(uploaded files)",
      createdAt: Date.now(),
      attachments: attachmentMeta.length ? attachmentMeta : undefined,
    };

    // show message immediately
    setMessages((prev) => [...prev, userMsg]);
    setPending(true);
    setProgress({ completed: 0, total: 0 });

    // send to backend
    const fd = new FormData();
    fd.append("messages", JSON.stringify([...messages, userMsg]));
    attachments.forEach((a) => fd.append("files", a.file, a.file.name));

    // clear attachments (they are now “sent”)
    setAttachments([]);

    let pollTimer: number | null = null;
    try {
      await fetchProgress();
      pollTimer = window.setInterval(fetchProgress, 1000);

      const res = await fetch("/api/chat", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        assistant_message: string;
        draft_markdown?: string;
      };

      const assistantMsg: Message = {
        id: uid("m"),
        role: "assistant",
        content: data.assistant_message ?? "(no response)",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.draft_markdown) setDraftMd(data.draft_markdown);

      // Upgrade B: refresh local saved docs after upload
      await refreshStoredDocs();
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("m"),
          role: "assistant",
          content:
            "I hit an error calling the server:\n\n" +
            String(e?.message ?? e),
          createdAt: Date.now(),
        },
      ]);
    } finally {
      if (pollTimer) window.clearInterval(pollTimer);
      setPending(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div
        className="flex h-screen"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {/* Left: Documents */}
        <aside className="w-[340px] border-r bg-white p-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Documents</h2>
            <button
              className="text-xs rounded-md border px-2 py-1 hover:bg-neutral-50"
              onClick={onPickFiles}
            >
              Upload (PDF/DOCX)
            </button>
          </div>

          {notice ? (
            <div className="mt-3 rounded-lg border bg-amber-50 p-3 text-xs text-amber-900">
              {notice}
            </div>
          ) : null}

          {/* Pending attachments */}
          <div className="mt-4">
            <div className="text-xs font-semibold text-neutral-700">
              Used for next generation
            </div>
            <div className="mt-2 space-y-2">
              {attachments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-xs text-neutral-500">
                  None
                </div>
              ) : (
                <div className="rounded-lg border p-3">
                  <ul className="space-y-2">
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs">{a.file.name}</div>
                          <div className="text-[11px] text-neutral-500">
                            {formatBytes(a.file.size)}
                          </div>
                        </div>
                        <button
                          className="text-[11px] rounded-md border px-2 py-1 hover:bg-neutral-50"
                          onClick={() => removeAttachment(a.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Stored docs (local prototype) */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                Saved locally (./uploads)
              </div>
              <button
                className="text-[11px] rounded-md border px-2 py-1 hover:bg-neutral-50"
                onClick={refreshStoredDocs}
              >
                Refresh
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {storedDocs.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-xs text-neutral-500">
                  No saved documents yet.
                </div>
              ) : (
                <div className="rounded-lg border p-3">
                  <ul className="space-y-3">
                    {storedDocs.map((d) => (
                      <li key={d.storedName} className="text-xs">
                        <div className="font-medium truncate">{d.name}</div>
                        <div className="text-[11px] text-neutral-500 flex justify-between gap-2">
                          <span>{formatBytes(d.size)}</span>
                          <span className="truncate">{d.lastModified}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {d.storedName}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* File input (Upgrade A: accept filters) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.currentTarget.value = "";
            }}
          />
        </aside>

        {/* Center: Generation */}
        <main className="flex-1 flex flex-col">
          <header className="border-b bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Prospectus Generator</div>
                <div className="text-xs text-neutral-500">
                  Upload documents → one-click draft.
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {visibleMessages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[900px] ${
                  m.role === "user" ? "ml-auto" : "mr-auto"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm border ${
                    m.role === "user"
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>

                  {m.attachments?.length ? (
                    <div
                      className={`mt-3 rounded-xl p-3 text-xs ${
                        m.role === "user"
                          ? "bg-white/10"
                          : "bg-neutral-50 border border-neutral-200"
                      }`}
                    >
                      <div className="font-medium mb-2">Attachments</div>
                      <ul className="space-y-1">
                        {m.attachments.map((a, idx) => (
                          <li key={idx} className="flex justify-between gap-3">
                            <span className="truncate">{a.name}</span>
                            <span className="opacity-80">{formatBytes(a.size)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {/* Fix A: render time only after mount to prevent hydration mismatch */}
                <div className="mt-1 text-[11px] text-neutral-500">
                  {mounted ? new Date(m.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}

            {pending ? (
              <div className="mr-auto max-w-[900px]">
                <div className="rounded-2xl px-4 py-3 shadow-sm border bg-white border-neutral-200">
                  <div className="text-sm text-neutral-600">
                    Generating…{" "}
                    {progress?.total
                      ? `(${progress.completed}/${progress.total})`
                      : "(0/0)"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-neutral-600">
                {attachments.length
                  ? `Selected ${attachments.length} file(s) for this run.`
                  : "No new files selected. You can still generate from saved uploads."}
              </div>
              <button
                className="shrink-0 rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
                disabled={pending}
                onClick={generate}
              >
                {pending ? "Generating..." : "Generate"}
              </button>
            </div>

            <div className="mt-2 text-[11px] text-neutral-500">
              Tip: drag & drop PDF/DOCX anywhere. Files will be saved into{" "}
              <span className="font-mono">./uploads</span>.
            </div>
          </div>
        </main>

        {/* Right: Draft */}
        <aside className="w-[420px] border-l bg-white p-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Draft</h2>
          </div>

          <div className="mt-3 rounded-xl border bg-neutral-50 p-3">
            <div className="text-xs font-medium text-neutral-700 mb-2">
              Prospectus (Markdown)
            </div>
            <textarea
              value={draftMd}
              onChange={(e) => setDraftMd(e.target.value)}
              className="w-full h-[78vh] resize-none rounded-lg border px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-neutral-200"
            />
            <div className="mt-2 text-[11px] text-neutral-500">
              Later: swap this textarea for a rich editor + outline + citations.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
