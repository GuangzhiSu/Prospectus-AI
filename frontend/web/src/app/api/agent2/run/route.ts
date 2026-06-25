// POST /api/agent2/run - Run ai-module/agent2.py (single section or all), stream progress via SSE
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { getAgentScriptPath, getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";
import { readSettings, buildAgentProcessEnv } from "@/lib/app-settings";

export const runtime = "nodejs";
/** Vercel Hobby allows max 300s. Longer local runs should use the desktop/server workflow. */
export const maxDuration = 300;

const SECTION_ORDER = [
  "ExpectedTimetable",
  "Contents",
  "Summary",
  "Definitions",
  "Glossary",
  "ForwardLooking",
  "RiskFactors",
  "Waivers",
  "InfoProspectus",
  "DirectorsParties",
  "CorporateInfo",
  "Regulation",
  "IndustryOverview",
  "HistoryReorg",
  "Business",
  "ContractualArrangements",
  "ControllingShareholders",
  "ConnectedTransactions",
  "DirectorsSeniorMgmt",
  "SubstantialShareholders",
  "ShareCapital",
  "FinancialInfo",
  "UseOfProceeds",
  "Underwriting",
  "GlobalOfferingStructure",
];

const AGENT2_PREFIX = "@@AGENT2@@";

function agent2SseResponse(
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

export async function POST(req: Request) {
  try {
    const root = getProspectusRoot();
    const paths = workspacePaths(root);
    const agent1Output = paths.agent1Output;
    const agent2Path = getAgentScriptPath("agent2.py", root);

    try {
      await fs.access(path.join(agent1Output, "rag_chunks.jsonl"));
      await fs.access(agent2Path);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            `${path.relative(root, agent1Output) || agent1Output}/rag_chunks.jsonl or agent2.py not found. Run Agent1 first.`,
        },
        { status: 400 }
      );
    }

    let body: {
      section?: string;
      sections?: string[];
      modification_instructions?: string;
    } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text) as typeof body;
    } catch {
      // no body or invalid JSON
    }

    const section = body.section;
    const sections = body.sections;
    const modificationInstructions = body.modification_instructions?.trim();
    const isSingleSection =
      section && section !== "all" && SECTION_ORDER.includes(section);

    let modFilePath: string | null = null;
    if (isSingleSection && modificationInstructions) {
      modFilePath = path.join(os.tmpdir(), `agent2_mod_${Date.now()}.txt`);
      await fs.writeFile(modFilePath, modificationInstructions, "utf8");
    }

    const python = process.env.AGENT1_PYTHON || "python3";
    const settings = await readSettings();
    const env: NodeJS.ProcessEnv = {
      ...buildAgentProcessEnv(process.env, settings),
      PYTHONUNBUFFERED: "1",
      AGENT2_STREAM: "1",
    };
    const model =
      env.AGENT2_MODEL ||
      process.env.AGENT2_MODEL ||
      process.env.AGENT1_MODEL ||
      "Qwen/Qwen3.5-4B";

    const sectionArgs =
      Array.isArray(sections) && sections.length > 0
        ? sections
        : section
          ? [section]
          : ["all"];
    const args = [
      agent2Path,
      "--section",
      ...sectionArgs,
      "--model",
      model,
      "--rag-dir",
      paths.agent1Output,
      "--output-dir",
      paths.agent2Output,
      "--stream",
    ];
    if (modFilePath) args.push("--modification-file", modFilePath);

    const proc = spawn(python, args, {
      cwd: root,
      env,
    }) as ChildProcessWithoutNullStreams;

    return agent2SseResponse(proc, async () => {
      if (modFilePath) {
        try {
          await fs.unlink(modFilePath);
        } catch {
          /* ignore */
        }
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
