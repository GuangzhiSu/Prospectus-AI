// POST /api/agent1/upload - Upload Excel files to data/
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

const ALLOWED_EXT = [".xlsx"];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB

function isExcelFile(name: string) {
  return ALLOWED_EXT.some((ext) => name.toLowerCase().endsWith(ext));
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files?.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const root = getProspectusRoot();
    const dataDir = path.join(root, "data");
    await fs.mkdir(dataDir, { recursive: true });

    const uploaded: Array<{ name: string; size: number }> = [];
    const errors: string[] = [];

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        errors.push(`${f.name}: file too large (max 50MB)`);
        continue;
      }
      if (!isExcelFile(f.name)) {
        errors.push(`${f.name}: only .xlsx allowed`);
        continue;
      }
      const safeName = sanitizeFilename(f.name);
      const destPath = path.join(dataDir, safeName);
      const body = Buffer.from(await f.arrayBuffer());
      await fs.writeFile(destPath, body);
      uploaded.push({ name: safeName, size: f.size });
    }

    return NextResponse.json({
      uploaded,
      errors: errors.length ? errors : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
