// POST /api/agent1/run - Run ai-module/agent1.py (per-table summarization)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getAgentScriptPath, getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";
import { readSettings, buildAgentProcessEnv } from "@/lib/app-settings";
import {
  formatPythonProcessError,
  resolvePythonCommand,
  spawnPython,
} from "@/lib/python-runtime";

export const runtime = "nodejs";
export const maxDuration = 900; // large source files and first model load can take a while locally

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
    const supportedExt = [".xlsx", ".json", ".docx", ".pdf"];
    const hasSupportedInput = files.some((f) =>
      supportedExt.some((ext) => f.toLowerCase().endsWith(ext))
    );
    if (!hasSupportedInput) {
      return NextResponse.json(
        { error: `No .xlsx, .json, .docx, or .pdf files in ${path.relative(root, dataDir) || dataDir}. Upload files first.` },
        { status: 400 }
      );
    }

    const pythonResolution = await resolvePythonCommand(root);
    if (!pythonResolution.ok) {
      return NextResponse.json(
        { ok: false, error: pythonResolution.error },
        { status: 500 }
      );
    }
    const settings = await readSettings();
    const env = buildAgentProcessEnv(process.env, settings);
    const model =
      env.AGENT1_MODEL ||
      process.env.AGENT1_MODEL ||
      "Qwen/Qwen3.5-4B";
    return new Promise<NextResponse>((resolve) => {
      const proc = spawnPython(
        pythonResolution.python,
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
                error: formatPythonProcessError(stderr || stdout || `Exit code ${code}`),
              },
              { status: 500 }
            )
          );
        }
      });

      proc.on("error", (err) => {
        resolve(
          NextResponse.json(
            { ok: false, error: formatPythonProcessError(String(err.message)) },
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
