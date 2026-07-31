// GET /api/eligibility/report?sessionId=...
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId")?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }
    const root = getProspectusRoot();
    const reportPath = path.join(
      workspacePaths(root).eligibility,
      sessionId,
      "report.json"
    );
    try {
      const raw = await fs.readFile(reportPath, "utf8");
      return NextResponse.json({ ok: true, sessionId, report: JSON.parse(raw) });
    } catch {
      return NextResponse.json(
        { error: "Report not found for session" },
        { status: 404 }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
