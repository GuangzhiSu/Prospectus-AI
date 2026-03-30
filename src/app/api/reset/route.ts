// POST /api/reset - Clear Agent1 and Agent2 outputs, start from scratch
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function POST() {
  try {
    const root = getProspectusRoot();
    const agent1Dir = path.join(root, "agent1_output");
    const agent2Dir = path.join(root, "agent2_output");

    let cleared = 0;

    // Clear agent1_output (manifest, rag_chunks, by_section)
    try {
      const entries = await fs.readdir(agent1Dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(agent1Dir, e.name);
        if (e.isFile()) {
          await fs.unlink(full);
          cleared++;
        } else if (e.isDirectory() && e.name === "by_section") {
          const sub = await fs.readdir(full, { withFileTypes: true });
          for (const s of sub) {
            if (s.isFile()) {
              await fs.unlink(path.join(full, s.name));
              cleared++;
            }
          }
        }
      }
    } catch {
      // agent1_output may not exist
    }

    // Clear agent2_output (section_*.md, all_sections.md)
    try {
      const entries = await fs.readdir(agent2Dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && (e.name === "all_sections.md" || e.name.startsWith("section_"))) {
          await fs.unlink(path.join(agent2Dir, e.name));
          cleared++;
        }
      }
    } catch {
      // agent2_output may not exist
    }

    return NextResponse.json({
      ok: true,
      message: `Reset complete. Cleared ${cleared} file(s). Start from Upload / Run Agent1.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
