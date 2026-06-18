// POST /api/agent2/run - Run Agent2 via modular AI module (SSE progress)
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProspectusRoot, getAiModuleRoot } from "@/lib/prospectus-root";
import { readSettings, buildAgentProcessEnv } from "@/lib/app-settings";
import { ensurePlatformConfig } from "@/lib/modular/config-seed";
import { buildAgent2Job } from "@/lib/modular/job-builder";
import { agent2SseResponse, spawnAiJobAsync } from "@/lib/modular/ai-runner";

export const runtime = "nodejs";
export const maxDuration = 1800;

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
    await ensurePlatformConfig();
    const root = getProspectusRoot();
    const agent1Output = path.join(root, "agent1_output");
    const aiModule = getAiModuleRoot();

    try {
      await fs.access(path.join(agent1Output, "rag_chunks.jsonl"));
      await fs.access(path.join(aiModule, "agent2.py"));
    } catch {
      try {
        await fs.access(path.join(agent1Output, "text_chunks.jsonl"));
        await fs.access(path.join(aiModule, "agent2.py"));
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error:
              "agent1_output not found or empty. Run Agent1 first.",
          },
          { status: 400 }
        );
      }
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
      /* empty body */
    }

    const section = body.section;
    const sections = body.sections;
    const modificationInstructions = body.modification_instructions?.trim();

    const settings = await readSettings();
    const baseEnv = buildAgentProcessEnv(process.env, settings);
    const env: NodeJS.ProcessEnv = {
      ...baseEnv,
      PYTHONUNBUFFERED: "1",
      AGENT2_STREAM: "1",
    };
    const model =
      env.AGENT2_MODEL ||
      process.env.AGENT2_MODEL ||
      env.AGENT1_MODEL ||
      process.env.AGENT1_MODEL ||
      "Qwen/Qwen3.5-4B";

    let sectionList: string[] | undefined;
    if (Array.isArray(sections) && sections.length > 0) {
      sectionList = sections;
    } else if (section && section !== "all") {
      sectionList = [section];
    }

    const isSingleSection =
      sectionList?.length === 1 && SECTION_ORDER.includes(sectionList[0]);

    const job = buildAgent2Job({
      model,
      sections: sectionList,
      modification_instructions:
        isSingleSection && modificationInstructions
          ? modificationInstructions
          : undefined,
    });

    const proc = await spawnAiJobAsync(job, env);
    return agent2SseResponse(proc);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
