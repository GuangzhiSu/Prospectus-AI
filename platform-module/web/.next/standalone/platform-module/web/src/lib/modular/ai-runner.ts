import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs/promises";
import path from "path";
import type { AiJob, AiResult } from "./contracts";
import { getAiModuleRoot, workspacePaths } from "./paths";

const AGENT2_PREFIX = "@@AGENT2@@";

function defaultPython(aiModuleRoot: string): string {
  const venv =
    process.platform === "win32"
      ? path.join(aiModuleRoot, ".venv", "Scripts", "python.exe")
      : path.join(aiModuleRoot, ".venv", "bin", "python");
  return process.env.AGENT1_PYTHON || venv || "python3";
}

export async function writeJobFile(job: AiJob): Promise<string> {
  const ws = workspacePaths();
  await fs.mkdir(ws.jobs, { recursive: true });
  const jobPath = path.join(ws.jobs, `${job.job_id}.json`);
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2), "utf8");
  return jobPath;
}

export async function readAiResult(workDir: string): Promise<AiResult | null> {
  try {
    const raw = await fs.readFile(path.join(workDir, "ai-result.json"), "utf8");
    return JSON.parse(raw) as AiResult;
  } catch {
    return null;
  }
}

export function spawnAiJob(
  jobPath: string,
  env: NodeJS.ProcessEnv
): ChildProcessWithoutNullStreams {
  const aiRoot = getAiModuleRoot();
  const python = defaultPython(aiRoot);
  return spawn(python, ["-m", "prospectus_ai", "run", "--job", jobPath], {
    cwd: aiRoot,
    env: { ...process.env, ...env, PYTHONUNBUFFERED: "1" },
  }) as ChildProcessWithoutNullStreams;
}

export function runAiJobSync(
  job: AiJob,
  env: NodeJS.ProcessEnv
): Promise<{ code: number; result: AiResult | null; stdout: string; stderr: string }> {
  return new Promise(async (resolve, reject) => {
    let jobPath: string;
    try {
      jobPath = await writeJobFile(job);
    } catch (e) {
      reject(e);
      return;
    }
    const proc = spawnAiJob(jobPath, env);
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", async (code) => {
      const result = await readAiResult(job.outputs.work_dir);
      resolve({ code: code ?? 1, result, stdout, stderr });
    });
  });
}

export function agent2SseResponse(
  proc: ChildProcessWithoutNullStreams,
  cleanup?: () => Promise<void>
): Response {
  const encoder = new TextEncoder();
  let stdoutBuf = "";
  let stderr = "";

  const stream = new ReadableStream({
    start(controller) {
      const flushLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith(AGENT2_PREFIX)) return;
        const payload = trimmed.slice(AGENT2_PREFIX.length);
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      };

      proc.stdout.on("data", (d: Buffer) => {
        stdoutBuf += d.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() ?? "";
        for (const line of lines) flushLine(line);
      });

      proc.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      proc.on("close", async (code) => {
        if (stdoutBuf.trim()) flushLine(stdoutBuf);
        if (code !== 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                message: stderr.trim() || stdoutBuf.trim() || `Exit code ${code}`,
              })}\n\n`
            )
          );
        }
        if (cleanup) {
          try {
            await cleanup();
          } catch {
            /* ignore */
          }
        }
        controller.close();
      });

      proc.on("error", async (err) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: String(err.message) })}\n\n`
          )
        );
        if (cleanup) {
          try {
            await cleanup();
          } catch {
            /* ignore */
          }
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function spawnAiJobAsync(
  job: AiJob,
  env: NodeJS.ProcessEnv
): Promise<ChildProcessWithoutNullStreams> {
  const jobPath = await writeJobFile(job);
  return spawnAiJob(jobPath, env);
}
