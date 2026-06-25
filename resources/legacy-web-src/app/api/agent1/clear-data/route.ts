// POST /api/agent1/clear-data - Remove all uploaded .xlsx and .json files from data/
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

const DATA_EXT = [".xlsx", ".json"];

function isDataFile(name: string) {
  const lower = name.toLowerCase();
  return DATA_EXT.some((ext) => lower.endsWith(ext));
}

export async function POST() {
  try {
    const root = getProspectusRoot();
    const dataDir = path.join(root, "data");

    try {
      await fs.access(dataDir);
    } catch {
      return NextResponse.json({ ok: true, message: "No data directory." });
    }

    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    let deleted = 0;
    for (const e of entries) {
      if (e.isFile() && isDataFile(e.name)) {
        await fs.unlink(path.join(dataDir, e.name));
        deleted++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Removed ${deleted} file(s). You can upload new documents.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
