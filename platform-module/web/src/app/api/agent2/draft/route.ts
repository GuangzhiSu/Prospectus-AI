// GET /api/agent2/draft - Read agent2_output/all_sections.md
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";
import { stripVerificationNotes } from "@/lib/draft-cleaning";
import { cleanDraftMarkdown } from "@/lib/draft-sections";

export const runtime = "nodejs";

export async function GET() {
  try {
    const root = getProspectusRoot();
    const draftPath = path.join(root, "agent2_output", "all_sections.md");

    try {
      const content = await fs.readFile(draftPath, "utf8");
      const markdown = stripVerificationNotes(cleanDraftMarkdown(content));
      return NextResponse.json({ markdown });
    } catch {
      return NextResponse.json(
        { error: "No draft yet. Run Agent2 first." },
        { status: 404 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
