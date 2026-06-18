// GET /api/agent1/section/[id] - Get preview content for a section (for hover tooltip)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !/^[A-H]$/.test(id)) {
      return NextResponse.json({ error: "Invalid section id" }, { status: 400 });
    }

    const root = getProspectusRoot();
    const sectionPath = path.join(root, "agent1_output", "by_section", `section_${id}.jsonl`);

    try {
      const content = await fs.readFile(sectionPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      const seen = new Set<string>();
      const summaries: string[] = [];

      for (const line of lines.slice(0, 50)) {
        try {
          const chunk = JSON.parse(line) as { source_file?: string; sheet_name?: string; sheet_summary?: string };
          const key = `${chunk.source_file}:${chunk.sheet_name}`;
          if (key && chunk.sheet_summary && !seen.has(key)) {
            seen.add(key);
            summaries.push(`[${chunk.source_file} / ${chunk.sheet_name}]\n${chunk.sheet_summary}`);
          }
        } catch {
          // skip invalid lines
        }
      }

      const preview = summaries.slice(0, 10).join("\n\n---\n\n");
      return NextResponse.json({ preview, count: summaries.length });
    } catch {
      return NextResponse.json({ preview: "", count: 0 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
