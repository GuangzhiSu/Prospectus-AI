// GET /api/agent2/status - Diagnostic for modular AI module
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { getProspectusRoot, getAiModuleRoot } from "@/lib/prospectus-root";
import { ensurePlatformConfig } from "@/lib/modular/config-seed";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    await ensurePlatformConfig();
    const root = getProspectusRoot();
    const aiModule = getAiModuleRoot();
    const agent1Output = path.join(root, "agent1_output");

    const checks: Record<string, string> = {};
    let ready = true;

    try {
      await fs.access(path.join(agent1Output, "rag_chunks.jsonl"));
      checks.agent1_output = "ok (rag_chunks.jsonl exists)";
    } catch {
      try {
        await fs.access(path.join(agent1Output, "text_chunks.jsonl"));
        checks.agent1_output = "ok (text_chunks.jsonl exists)";
      } catch {
        checks.agent1_output = "missing - Run Agent1 first";
        ready = false;
      }
    }

    try {
      await fs.access(path.join(aiModule, "agent2.py"));
      checks.ai_module = "ok";
    } catch {
      checks.ai_module = "not found";
      ready = false;
    }

    try {
      await fs.access(
        path.join(root, "platform-config", "agent2_section_requirements.json")
      );
      checks.section_requirements = "ok";
    } catch {
      checks.section_requirements = "missing in platform-config/";
      ready = false;
    }

    const venvPy =
      process.platform === "win32"
        ? path.join(aiModule, ".venv", "Scripts", "python.exe")
        : path.join(aiModule, ".venv", "bin", "python");
    const python = process.env.AGENT1_PYTHON || venvPy || "python3";

    const canSpawn = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const proc = spawn(
        python,
        ["-m", "prospectus_ai", "validate", "--job", "/dev/null"],
        { cwd: aiModule, env: process.env }
      );
      let stderr = "";
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });
      const t = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve({ ok: false, error: "Timeout" });
      }, 10000);
      proc.on("close", () => {
        clearTimeout(t);
        resolve({ ok: true });
      });
      proc.on("error", (err) => {
        clearTimeout(t);
        resolve({ ok: false, error: String(err.message) });
      });
    });

    return NextResponse.json({
      ok: ready && canSpawn.ok,
      root,
      aiModule,
      python,
      modular: true,
      checks,
      spawn: canSpawn.ok ? "ok" : canSpawn.error,
      hint: "Modular stack: platform-module/web → ai-module via contract v1 jobs.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
