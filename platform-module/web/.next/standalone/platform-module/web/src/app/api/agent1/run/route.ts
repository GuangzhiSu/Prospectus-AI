// POST /api/agent1/run - Run Agent1 via modular AI module
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot, getAiModuleRoot } from "@/lib/prospectus-root";
import { readSettings, buildAgentProcessEnv } from "@/lib/app-settings";
import { ensurePlatformConfig } from "@/lib/modular/config-seed";
import { buildAgent1Job } from "@/lib/modular/job-builder";
import { runAiJobSync } from "@/lib/modular/ai-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  try {
    await ensurePlatformConfig();
    const root = getProspectusRoot();
    const dataDir = path.join(root, "data");
    const aiModule = getAiModuleRoot();

    try {
      await fs.access(dataDir);
      await fs.access(path.join(aiModule, "agent1.py"));
    } catch {
      return NextResponse.json(
        { error: "workspace/data/ or ai-module not found" },
        { status: 500 }
      );
    }

    const files = await fs.readdir(dataDir);
    const hasInput = files.some(
      (f) =>
        f.toLowerCase().endsWith(".xlsx") ||
        f.toLowerCase().endsWith(".json") ||
        f.toLowerCase().endsWith(".docx") ||
        f.toLowerCase().endsWith(".pdf")
    );
    if (!hasInput) {
      return NextResponse.json(
        { error: "No input files in data/. Upload files first." },
        { status: 400 }
      );
    }

    const settings = await readSettings();
    const env = buildAgentProcessEnv(process.env, settings);
    const model =
      env.AGENT1_MODEL || process.env.AGENT1_MODEL || "Qwen/Qwen3.5-4B";

    const job = buildAgent1Job({ model });
    const { code, result, stderr, stdout } = await runAiJobSync(job, env);

    if (code === 0 && result?.status === "success") {
      return NextResponse.json({
        ok: true,
        message: "Agent1 completed successfully",
        job_id: job.job_id,
        stdout: stdout || undefined,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          result?.error?.message ||
          stderr ||
          stdout ||
          `Exit code ${code}`,
      },
      { status: 500 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
