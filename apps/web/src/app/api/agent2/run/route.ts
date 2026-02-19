// POST /api/agent2/run - Run agent2.py (single section or all)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { spawn } from "child_process";
import { getProspectusRoot } from "@/lib/prospectus-root";

export const runtime = "nodejs";
export const maxDuration = 1800; // 30 min for batch (all remaining sections)

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

export async function POST(req: Request) {
  try {
    const root = getProspectusRoot();
    const agent1Output = path.join(root, "agent1_output");
    const agent2Path = path.join(root, "agent2.py");

    try {
      await fs.access(path.join(agent1Output, "rag_chunks.jsonl"));
      await fs.access(agent2Path);
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "agent1_output/rag_chunks.jsonl or agent2.py not found. Run Agent1 first.",
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
    const model =
      process.env.AGENT1_MODEL || "Qwen/Qwen2.5-3B-Instruct";
    const env = { ...process.env };
    if (process.env.AGENT1_USE_CPU === "1") {
      env.CUDA_VISIBLE_DEVICES = "";
    } else if (process.env.AGENT1_CUDA_DEVICES) {
      env.CUDA_VISIBLE_DEVICES = process.env.AGENT1_CUDA_DEVICES;
    }

    // sections: array of section IDs for batch generation (one process, model loaded once)
    const sectionArgs = Array.isArray(sections) && sections.length > 0
      ? sections
      : section
        ? [section]
        : ["all"];
    const args = ["agent2.py", "--section", ...sectionArgs, "--model", model];
    if (modFilePath) args.push("--modification-file", modFilePath);

    return new Promise<NextResponse>(async (resolve) => {
      const proc = spawn(python, args, { cwd: root, env });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", async (code) => {
        if (modFilePath) {
          try {
            await fs.unlink(modFilePath);
          } catch {
            /* ignore */
          }
        }
        if (code === 0) {
          const batchCount = Array.isArray(sections) ? sections.length : 0;
          resolve(
            NextResponse.json({
              ok: true,
              message: isSingleSection
                ? `Section ${section} generated.`
                : batchCount > 0
                  ? `${batchCount} sections generated.`
                  : "Agent2 completed. Prospectus draft generated.",
              section: isSingleSection ? section : undefined,
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
