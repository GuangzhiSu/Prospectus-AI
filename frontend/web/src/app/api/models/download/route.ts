// POST: run huggingface snapshot_download via Python (first-run model pull)
import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import { getProspectusRoot } from "@/lib/prospectus-root";
import { getDefaultLocalModelDir } from "@/lib/app-settings";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: Request) {
  let repoId = "Qwen/Qwen3.5-4B";
  let outDir: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.repoId === "string" && body.repoId.trim()) {
      repoId = body.repoId.trim();
    }
    if (typeof body?.outDir === "string" && body.outDir.trim()) {
      outDir = body.outDir.trim();
    }
  } catch {
    /* default */
  }

  const root = getProspectusRoot();
  const script = path.join(root, "scripts", "download_qwen_model.py");
  const targetDir = outDir || getDefaultLocalModelDir();
  const python = process.env.AGENT1_PYTHON || "python3";

  return new Promise<NextResponse>((resolve) => {
    const proc = spawn(
      python,
      [script, "--repo-id", repoId, "--out-dir", targetDir],
      {
        cwd: root,
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
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
            path: targetDir,
            repoId,
            log: (stdout + stderr).slice(-8000),
          })
        );
      } else {
        resolve(
          NextResponse.json(
            {
              ok: false,
              error: stderr || stdout || `exit ${code}`,
              path: targetDir,
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
}
