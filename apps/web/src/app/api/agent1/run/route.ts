// POST /api/agent1/run - Run agent1.py (per-table summarization)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { spawn } from "child_process";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for LLM

export async function POST(req: Request) {
  try {
    const root = getProspectusRoot();
    const dataDir = path.join(root, "data");
    const agent1Path = path.join(root, "agent1.py");

    try {
      await fs.access(dataDir);
      await fs.access(agent1Path);
    } catch (e) {
      return NextResponse.json(
        { error: "data/ or agent1.py not found" },
        { status: 500 }
      );
    }

    const files = await fs.readdir(dataDir);
    const xlsxCount = files.filter((f) =>
      f.toLowerCase().endsWith(".xlsx")
    ).length;
    if (xlsxCount === 0) {
      return NextResponse.json(
        { error: "No .xlsx files in data/. Upload Excel files first." },
        { status: 400 }
      );
    }

    const python = process.env.AGENT1_PYTHON || "python3";
    // Use 3B model by default (fits in 11GB GPU); 7B needs ~14GB+
    const model =
      process.env.AGENT1_MODEL || "Qwen/Qwen2.5-3B-Instruct";
    const env = { ...process.env };
    if (process.env.AGENT1_USE_CPU === "1") {
      env.CUDA_VISIBLE_DEVICES = "";
    } else if (process.env.AGENT1_CUDA_DEVICES) {
      // Specify GPU IDs, e.g. 2,3,4
      env.CUDA_VISIBLE_DEVICES = process.env.AGENT1_CUDA_DEVICES;
    }
    return new Promise<NextResponse>((resolve) => {
      const proc = spawn(
        python,
        ["agent1.py", "--model", model],
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
