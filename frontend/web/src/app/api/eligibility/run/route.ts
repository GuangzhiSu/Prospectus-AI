// POST /api/eligibility/run — spawn eligibility bridge with drafting LLM settings
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import {
  getAiModuleRoot,
  getProspectusRoot,
  workspacePaths,
} from "@/lib/prospectus-root";
import { getEligibilityPackageRoot } from "@/lib/eligibility-paths";
import { readEligibilitySettings, buildAgentProcessEnv } from "@/lib/app-settings";
import {
  formatPythonProcessError,
  resolvePythonCommand,
  spawnPython,
} from "@/lib/python-runtime";

export const runtime = "nodejs";
export const maxDuration = 300;

type RunBody = {
  sessionId?: string;
  market_key?: string;
  market_hint?: string;
  ruleset_names?: string[];
  auto_confirm?: boolean;
  confirmed_ids?: string[];
  rejected_ids?: string[];
  include_feedback?: boolean;
  structured_form?: Record<string, unknown>;
  profile?: Record<string, unknown>;
  issuer?: Record<string, unknown>;
  use_uploaded_docs?: boolean;
};

function providerReady(
  provider: string,
  env: NodeJS.ProcessEnv
): { ready: boolean; reason?: string } {
  if (provider === "qwen_local") return { ready: true };
  if (provider === "anthropic") {
    return env.ANTHROPIC_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No Anthropic API key saved in Settings." };
  }
  if (provider === "deepseek") {
    return env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No DeepSeek API key saved in Settings." };
  }
  if (provider === "qwen_api") {
    return env.DASHSCOPE_API_KEY || env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No DashScope API key saved in Settings." };
  }
  if (provider === "openai") {
    return env.OPENAI_API_KEY
      ? { ready: true }
      : { ready: false, reason: "No OpenAI API key saved in Settings." };
  }
  return { ready: false, reason: `Unknown provider: ${provider}` };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RunBody;
    const root = getProspectusRoot();
    const paths = workspacePaths(root);
    const sessionId = (body.sessionId || randomUUID().slice(0, 12)).trim();
    const sessionDir = path.join(paths.eligibility, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const docsDir = path.join(sessionDir, "docs");
    let document_paths: string[] | undefined;
    if (body.use_uploaded_docs !== false) {
      try {
        const names = await fs.readdir(docsDir);
        document_paths = names
          .filter((n) => !n.startsWith("."))
          .map((n) => path.join(docsDir, n));
        if (!document_paths.length) document_paths = undefined;
      } catch {
        document_paths = undefined;
      }
    }

    if (!document_paths && !body.structured_form && !body.issuer) {
      return NextResponse.json(
        {
          error:
            "Provide uploaded documents, a structured form, or an issuer JSON payload.",
        },
        { status: 400 }
      );
    }

    const payload = {
      document_paths,
      structured_form: body.structured_form,
      issuer: body.issuer,
      profile: body.profile || {},
      market_key: body.market_key,
      market_hint: body.market_hint,
      ruleset_names: body.ruleset_names,
      auto_confirm: body.auto_confirm ?? true,
      confirmed_ids: body.confirmed_ids,
      rejected_ids: body.rejected_ids,
      include_feedback: body.include_feedback ?? true,
    };

    const payloadPath = path.join(sessionDir, "request.json");
    const reportPath = path.join(sessionDir, "report.json");
    await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), "utf8");

    const pythonResolution = await resolvePythonCommand(root);
    if (!pythonResolution.ok) {
      return NextResponse.json(
        { ok: false, error: pythonResolution.error },
        { status: 500 }
      );
    }

    const settings = await readEligibilitySettings();
    const env = buildAgentProcessEnv(process.env, settings);
    const eligibilityRoot = getEligibilityPackageRoot(root);
    const aiModuleRoot = getAiModuleRoot(root);
    env.PYTHONPATH = [eligibilityRoot, aiModuleRoot, env.PYTHONPATH || ""]
      .filter(Boolean)
      .join(path.delimiter);
    env.AI_MODULE_ROOT = aiModuleRoot;
    env.PROSPECTUS_ROOT = root;
    // Eligibility prompts are shorter than prospectus drafting; keep MPS/CPU safe.
    if (!env.QWEN_MAX_CTX) env.QWEN_MAX_CTX = "4096";
    if (!env.QWEN_MAX_NEW_TOKENS) env.QWEN_MAX_NEW_TOKENS = "768";
    if (!env.QWEN_DO_SAMPLE) env.QWEN_DO_SAMPLE = "0";
    if (!env.QWEN_ENABLE_THINKING) env.QWEN_ENABLE_THINKING = "0";

    // Same provider as drafting Settings. Only force stub when the selected
    // cloud provider has no credentials; Local Qwen always attempts live load.
    const provider = String(env.LLM_PROVIDER || settings.llmProvider || "qwen_local");
    const readiness = providerReady(provider, env);
    if (env.ELIGIBILITY_LLM_STUB === undefined || env.ELIGIBILITY_LLM_STUB === "") {
      env.ELIGIBILITY_LLM_STUB = readiness.ready ? "0" : "1";
    }

    const result = await new Promise<{
      ok: boolean;
      code: number | null;
      stdout: string;
      stderr: string;
      timedOut?: boolean;
    }>((resolve) => {
      const proc = spawnPython(
        pythonResolution.python,
        ["-m", "eligibility.bridge", "--in", payloadPath, "--out", reportPath],
        { cwd: root, env }
      );
      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeoutMs = Number(
        process.env.ELIGIBILITY_RUN_TIMEOUT_MS ||
          (provider === "qwen_local" ? 20 * 60 * 1000 : 8 * 60 * 1000)
      );
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          proc.kill("SIGTERM");
        } catch {
          /* ignore */
        }
        setTimeout(() => {
          try {
            proc.kill("SIGKILL");
          } catch {
            /* ignore */
          }
        }, 4000);
        resolve({
          ok: false,
          code: null,
          stdout,
          stderr:
            stderr +
            `\nTimed out after ${Math.round(timeoutMs / 1000)}s while running the eligibility bridge.` +
            (provider === "qwen_local"
              ? " Local Qwen may still be loading, or the run is blocked on network/proxy access to Hugging Face. Prefer a cloud API in Eligibility Settings, or confirm the local model folder is complete."
              : " Try again, or switch provider in Eligibility Settings."),
          timedOut: true,
        });
      }, timeoutMs);
      const finish = (payload: {
        ok: boolean;
        code: number | null;
        stdout: string;
        stderr: string;
        timedOut?: boolean;
      }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(payload);
      };
      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("close", (code) =>
        finish({ ok: code === 0, code, stdout, stderr })
      );
      proc.on("error", (err) =>
        finish({ ok: false, code: null, stdout: "", stderr: err.message })
      );
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          sessionId,
          error: formatPythonProcessError(
            result.stderr || result.stdout || `Exit code ${result.code}`
          ),
          timedOut: Boolean(result.timedOut),
          llm: {
            provider,
            stub: env.ELIGIBILITY_LLM_STUB === "1",
            model: env.AGENT1_MODEL,
            reason: readiness.reason,
          },
        },
        { status: result.timedOut ? 504 : 500 }
      );
    }

    const reportRaw = await fs.readFile(reportPath, "utf8");
    const report = JSON.parse(reportRaw);
    return NextResponse.json({
      ok: true,
      sessionId,
      report,
      llm: report.llm || {
        provider,
        stub: env.ELIGIBILITY_LLM_STUB === "1",
        reason: readiness.reason,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
