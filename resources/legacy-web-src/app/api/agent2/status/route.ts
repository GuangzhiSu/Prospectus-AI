// GET /api/agent2/status - Quick check that Agent2 can run (diagnostic)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const root = getProspectusRoot();
    const agent1Output = path.join(root, "agent1_output");
    const agent2Path = path.join(root, "agent2.py");

    const checks: Record<string, string> = {};
    let ready = true;

    // Check agent1 output
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

    // Check agent2.py
    try {
      await fs.access(agent2Path);
      checks.agent2_script = "ok";
    } catch {
      checks.agent2_script = "not found";
      ready = false;
    }

    // Quick spawn test: --help exits immediately (no model load)
    const python = process.env.AGENT1_PYTHON || "python3";
    const model = process.env.AGENT1_MODEL || "Qwen/Qwen2.5-3B-Instruct";
    const env = { ...process.env };
    if (process.env.AGENT1_USE_CPU === "1") env.CUDA_VISIBLE_DEVICES = "";
    const canSpawn = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const proc = spawn(python, [agent2Path, "--help"], { cwd: root, env });
      let stderr = "";
      proc.stderr?.on("data", (d) => { stderr += d.toString(); });
      const t = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve({ ok: false, error: "Timeout - Python/subprocess may be stuck" });
      }, 10000);
      proc.on("close", (code) => {
        clearTimeout(t);
        if (code === 0) {
          resolve({ ok: true });
        } else {
          resolve({ ok: false, error: stderr || `Exit code ${code}` });
        }
      });
      proc.on("error", (err) => {
        clearTimeout(t);
        resolve({ ok: false, error: String(err.message) });
      });
    });

    return NextResponse.json({
      ok: ready && canSpawn.ok,
      root,
      python,
      model,
      checks,
      spawn: canSpawn.ok ? "ok" : canSpawn.error,
      hint: "First run loads the AI model (1–5 min). Generation takes ~2–5 min per section. Watch the terminal (where npm run dev runs) for progress.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
