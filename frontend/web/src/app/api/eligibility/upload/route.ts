// POST /api/eligibility/upload — upload issuer docs into a session folder
// DELETE /api/eligibility/upload — remove one or all docs from a session
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";

export const runtime = "nodejs";

const ALLOWED_EXT = [".xlsx", ".json", ".docx", ".pdf", ".txt", ".md"];
const MAX_BYTES = 150 * 1024 * 1024;

function extOf(name: string) {
  const lower = name.toLowerCase();
  return ALLOWED_EXT.find((ext) => lower.endsWith(ext));
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function docsDir(sessionId: string) {
  const root = getProspectusRoot();
  return path.join(workspacePaths(root).eligibility, sessionId, "docs");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    let sessionId = String(form.get("sessionId") || "").trim();
    if (!sessionId) sessionId = randomUUID().slice(0, 12);

    if (!files?.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const sessionDir = docsDir(sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const uploaded: Array<{ name: string; size: number; path: string }> = [];
    const errors: string[] = [];

    for (const f of files) {
      const ext = extOf(f.name);
      if (!ext) {
        errors.push(`${f.name}: allowed types ${ALLOWED_EXT.join(", ")}`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        errors.push(`${f.name}: file too large`);
        continue;
      }
      const safeName = sanitizeFilename(f.name);
      const destPath = path.join(sessionDir, safeName);
      await fs.writeFile(destPath, Buffer.from(await f.arrayBuffer()));
      uploaded.push({ name: safeName, size: f.size, path: destPath });
    }

    return NextResponse.json({
      sessionId,
      uploaded,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      sessionId?: string;
      names?: string[];
      clearAll?: boolean;
    };
    const sessionId = String(body.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const sessionDir = docsDir(sessionId);
    let remaining: string[] = [];
    try {
      remaining = (await fs.readdir(sessionDir)).filter((n) => !n.startsWith("."));
    } catch {
      return NextResponse.json({ sessionId, removed: [], remaining: [] });
    }

    const removed: string[] = [];
    if (body.clearAll) {
      for (const name of remaining) {
        await fs.unlink(path.join(sessionDir, name)).catch(() => undefined);
        removed.push(name);
      }
      remaining = [];
    } else {
      const names = (body.names || [])
        .map((n) => sanitizeFilename(String(n)))
        .filter(Boolean);
      if (!names.length) {
        return NextResponse.json(
          { error: "Provide names[] or clearAll: true" },
          { status: 400 }
        );
      }
      const allowed = new Set(remaining);
      for (const name of names) {
        if (!allowed.has(name)) continue;
        await fs.unlink(path.join(sessionDir, name)).catch(() => undefined);
        removed.push(name);
      }
      remaining = (await fs.readdir(sessionDir)).filter((n) => !n.startsWith("."));
    }

    return NextResponse.json({ sessionId, removed, remaining });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
