/**
 * Invoke the AI module from Node (Next.js API routes).
 *
 * Usage in apps/web:
 *   import { runAiJob } from "../../modular/platform-module/src/ai-client";
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import type { AiJob, AiResult } from "./contracts";

export type RunAiJobOptions = {
  /** Path to modular/ai-module */
  aiModuleRoot: string;
  /** Python executable (venv) */
  python?: string;
  /** Extra env for LLM settings (AGENT1_MODEL, LLM_PROVIDER, …) */
  env?: NodeJS.ProcessEnv;
  /** Write job JSON here before running */
  jobFilePath: string;
  /** Stream @@AGENT2@@ lines to onProgress */
  onProgress?: (line: string) => void;
};

function defaultPython(aiModuleRoot: string): string {
  const venv = path.join(aiModuleRoot, ".venv", "bin", "python");
  return process.env.AGENT1_PYTHON || venv;
}

export async function writeJobFile(job: AiJob, jobFilePath: string): Promise<void> {
  await fs.mkdir(path.dirname(jobFilePath), { recursive: true });
  await fs.writeFile(jobFilePath, JSON.stringify(job, null, 2), "utf8");
}

export async function readAiResult(workDir: string): Promise<AiResult | null> {
  const p = path.join(workDir, "ai-result.json");
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as AiResult;
  } catch {
    return null;
  }
}

export function runAiJob(job: AiJob, opts: RunAiJobOptions): Promise<AiResult> {
  const python = opts.python ?? defaultPython(opts.aiModuleRoot);
  const aiModuleRoot = path.resolve(opts.aiModuleRoot);

  return new Promise(async (resolve, reject) => {
    await writeJobFile(job, opts.jobFilePath);

    const proc = spawn(
      python,
      ["-m", "prospectus_ai", "run", "--job", path.resolve(opts.jobFilePath)],
      {
        cwd: aiModuleRoot,
        env: { ...process.env, ...opts.env },
      }
    );

    let stdoutBuf = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";
      for (const line of lines) {
        if (opts.onProgress && line.includes("@@AGENT2@@")) {
          opts.onProgress(line);
        }
      }
    });

    let stderr = "";
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    proc.on("error", reject);
    proc.on("close", async (code) => {
      const result = await readAiResult(job.outputs.work_dir);
      if (!result) {
        reject(new Error(stderr || `AI module exited ${code} without ai-result.json`));
        return;
      }
      if (result.status !== "success" || code !== 0) {
        reject(
          new Error(result.error?.message || stderr || `AI module failed (exit ${code})`)
        );
        return;
      }
      resolve(result);
    });
  });
}

/** Resolve modular paths relative to repo root (PROSPECTUS_ROOT). */
export function modularPaths(repoRoot: string) {
  return {
    aiModule: path.join(repoRoot, "modular", "ai-module"),
    platformModule: path.join(repoRoot, "modular", "platform-module"),
    contracts: path.join(repoRoot, "modular", "contracts"),
    workspace: path.join(repoRoot, "modular", "workspace"),
  };
}
