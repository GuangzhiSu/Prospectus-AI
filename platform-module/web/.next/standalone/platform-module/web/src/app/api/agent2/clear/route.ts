// POST /api/agent2/clear - Delete all generated prospectus sections
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function POST() {
  try {
    const root = getProspectusRoot();
    const outputDir = path.join(root, "agent2_output");

    try {
      await fs.access(outputDir);
    } catch {
      return NextResponse.json({ ok: true, message: "Nothing to clear." });
    }

    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    let deleted = 0;
    for (const e of entries) {
      if (e.isFile() && (e.name === "all_sections.md" || e.name.startsWith("section_"))) {
        await fs.unlink(path.join(outputDir, e.name));
        deleted++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Cleared ${deleted} file(s).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
