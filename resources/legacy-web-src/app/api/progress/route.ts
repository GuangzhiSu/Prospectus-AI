import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const requirementsPath = path.join(
      process.cwd(),
      "prospectus_section_prompts.json"
    );
    const raw = await fs.readFile(requirementsPath, "utf8");
    const parsed = JSON.parse(raw) as {
      sections?: Array<{ section: string; content: string }>;
    };
    const total = Array.isArray(parsed.sections) ? parsed.sections.length : 0;

    const progressPath = path.join(process.cwd(), ".progress.json");
    try {
      const p = await fs.readFile(progressPath, "utf8");
      const progress = JSON.parse(p) as {
        status?: string;
        completed?: number;
        total?: number;
      };
      return NextResponse.json({
        status: progress.status || "running",
        completed: progress.completed ?? 0,
        total: progress.total ?? total,
      });
    } catch {
      return NextResponse.json({ status: "idle", completed: 0, total });
    }
  } catch (err: any) {
    return new NextResponse(err?.message ? String(err.message) : "Server error", {
      status: 500,
    });
  }
}
