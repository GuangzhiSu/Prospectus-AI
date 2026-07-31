// GET /api/agent1/results - Read manifest + classification from agent1_output
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";

export async function GET() {
  try {
    const root = getProspectusRoot();
    const outputDir = path.join(root, "agent1_output");

    const manifestPath = path.join(outputDir, "manifest.json");
    const classificationPath = path.join(outputDir, "classification.json");

    let manifest: Record<string, unknown> | null = null;
    let classification: Record<string, unknown> | null = null;

    try {
      const m = await fs.readFile(manifestPath, "utf8");
      manifest = JSON.parse(m) as Record<string, unknown>;
    } catch {
      // manifest not found or invalid
    }

    try {
      const c = await fs.readFile(classificationPath, "utf8");
      classification = JSON.parse(c) as Record<string, unknown>;
    } catch {
      // classification not found (only exists after --full-analysis)
    }

    if (!manifest && !classification) {
      return NextResponse.json(
        { error: "No agent1 results yet. Run agent1 first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      manifest: manifest ?? undefined,
      classification: classification ?? undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
