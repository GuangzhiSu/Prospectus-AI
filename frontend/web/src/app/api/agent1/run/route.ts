// POST /api/agent1/run - Run ai-module/agent1.py (per-table summarization)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { getAgentScriptPath, getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";
import { readSettings, buildAgentProcessEnv } from "@/lib/app-settings";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for LLM

export async function POST(req: Request) {
  try {
    const root = getProspectusRoot();
    const paths = workspacePaths(root);
    const dataDir = paths.data;
    const agent1Path = getAgentScriptPath("agent1.py", root);

    try {
      await fs.access(dataDir);
      await fs.access(agent1Path);
    } catch (e) {
      return NextResponse.json(
        { error: `${path.relative(root, dataDir) || dataDir}/ or agent1.py not found` },
        { status: 500 }
      );
    }

    const files = await fs.readdir(dataDir);
    const hasXlsx = files.some((f) => f.toLowerCase().endsWith(".xlsx"));
    const hasJson = files.some((f) => f.toLowerCase().endsWith(".json"));
    if (!hasXlsx && !hasJson) {
      return NextResponse.json(
        { error: `No .xlsx or .json files in ${path.relative(root, dataDir) || dataDir}. Upload files first.` },
        { status: 400 }
      );
    }

    const python = process.env.AGENT1_PYTHON || "python3";
    const settings = await readSettings();
    const env = buildAgentProcessEnv(process.env, settings);
    const model =
      env.AGENT1_MODEL ||
      process.env.AGENT1_MODEL ||
      "Qwen/Qwen3.5-4B";
    return new Promise<NextResponse>((resolve) => {
      const proc = spawn(
        python,
        [
          agent1Path,
          "--model",
          model,
          "--data-dir",
          dataDir,
          "--output-dir",
          paths.agent1Output,
        ],
        {
          cwd: root,
          env,
        }
      );

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve(
            NextResponse.json({
              ok: true,
              message: "Agent1 completed successfully",
              stdout: stdout || undefined,
            })
          );
        } else {
          resolve(
            NextResponse.json(
              {
                ok: false,
                error: stderr || stdout || `Exit code ${code}`,
              },
              { status: 500 }
            )
          );
        }
      });

      proc.on("error", (err) => {
        resolve(
          NextResponse.json(
            { ok: false, error: String(err.message) },
            { status: 500 }
          )
        );
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
