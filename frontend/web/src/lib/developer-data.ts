import fs from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import type {
  DeveloperCompany,
  DeveloperCompanyOverview,
  DeveloperDatasetIndex,
  DeveloperPrompt,
  DeveloperSection,
  SectionExecutionContract,
} from "@/lib/developer-tools-types";

const unzip = promisify(gunzip);

type PromptRequirementsEntry = Record<string, unknown> & {
  name?: string;
  kg_section_id?: string;
};

type CompiledPromptDocument = {
  sections?: Array<{ section?: string; content?: string }>;
};

type ExecutionContractsDocument = {
  version?: string;
  sourceHash?: string;
  contractCount?: number;
  contracts?: Record<string, SectionExecutionContract>;
};

function dataRoot(): string {
  const candidates = [
    path.join(process.cwd(), "devtools-data"),
    path.join(process.cwd(), "frontend", "web", "devtools-data"),
  ];
  return candidates[0];
}

async function readFromCandidates(filename: string): Promise<Buffer> {
  const candidates = [
    path.join(dataRoot(), filename),
    path.join(process.cwd(), "frontend", "web", "devtools-data", filename),
  ];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Developer dataset not found: ${filename}`);
}

async function readRepoFile(filename: string): Promise<Buffer> {
  // Keep every trace target literal. A dynamic `../../${filename}` makes
  // Turbopack conservatively include most of the monorepo in every route.
  const knownFiles: Record<string, string[]> = {
    "prospectus_section_prompts.json": [
      path.join(process.cwd(), "prospectus_section_prompts.json"),
      path.join(process.cwd(), "frontend", "web", "prospectus_section_prompts.json"),
      path.join(process.cwd(), "..", "..", "prospectus_section_prompts.json"),
    ],
    "ai-module/prompts/agents/writer.txt": [
      path.join(process.cwd(), "ai-module", "prompts", "agents", "writer.txt"),
      path.join(process.cwd(), "frontend", "web", "ai-module", "prompts", "agents", "writer.txt"),
      path.join(process.cwd(), "..", "..", "ai-module", "prompts", "agents", "writer.txt"),
    ],
    "ai-module/prompts/core/exchange_drafting.md": [
      path.join(process.cwd(), "ai-module", "prompts", "core", "exchange_drafting.md"),
      path.join(process.cwd(), "frontend", "web", "ai-module", "prompts", "core", "exchange_drafting.md"),
      path.join(process.cwd(), "..", "..", "ai-module", "prompts", "core", "exchange_drafting.md"),
    ],
    "ai-module/prompts/core/ai_tags.md": [
      path.join(process.cwd(), "ai-module", "prompts", "core", "ai_tags.md"),
      path.join(process.cwd(), "frontend", "web", "ai-module", "prompts", "core", "ai_tags.md"),
      path.join(process.cwd(), "..", "..", "ai-module", "prompts", "core", "ai_tags.md"),
    ],
    "ai-module/prompts/sections/execution_contracts.json": [
      path.join(process.cwd(), "ai-module", "prompts", "sections", "execution_contracts.json"),
      path.join(process.cwd(), "frontend", "web", "ai-module", "prompts", "sections", "execution_contracts.json"),
      path.join(process.cwd(), "..", "..", "ai-module", "prompts", "sections", "execution_contracts.json"),
    ],
    "ai-module/prompts/sections/requirements.json": [
      path.join(process.cwd(), "ai-module", "prompts", "sections", "requirements.json"),
      path.join(process.cwd(), "frontend", "web", "ai-module", "prompts", "sections", "requirements.json"),
      path.join(process.cwd(), "..", "..", "ai-module", "prompts", "sections", "requirements.json"),
    ],
  };
  const candidates = knownFiles[filename];
  if (!candidates) {
    throw new Error(`Repository prompt file is not allow-listed: ${filename}`);
  }
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Repository prompt file not found: ${filename}`);
}

function cleanPrompt(text: string): string {
  return text.replace(/\n{4,}/g, "\n\n\n").trim();
}

export async function loadDeveloperIndex(): Promise<DeveloperDatasetIndex> {
  const raw = await readFromCandidates("index.json");
  return JSON.parse(raw.toString("utf8")) as DeveloperDatasetIndex;
}

export async function loadDeveloperPrompts(): Promise<DeveloperPrompt[]> {
  const [requirements, contractsDocument, compiledRaw, writerRaw, exchangeRaw, tagsRaw] =
    await Promise.all([
      loadDeveloperPromptRequirements(),
      loadDeveloperExecutionContracts(),
      readRepoFile("prospectus_section_prompts.json"),
      readRepoFile("ai-module/prompts/agents/writer.txt"),
      readRepoFile("ai-module/prompts/core/exchange_drafting.md"),
      readRepoFile("ai-module/prompts/core/ai_tags.md"),
    ]);
  const compiled = JSON.parse(compiledRaw.toString("utf8")) as CompiledPromptDocument;
  const compiledByName = new Map(
    (compiled.sections || []).flatMap((item) =>
      typeof item.section === "string" && typeof item.content === "string"
        ? [[item.section, item.content] as const]
        : []
    )
  );
  const writer = writerRaw.toString("utf8");
  const exchange = exchangeRaw.toString("utf8").trim();
  const tags = tagsRaw.toString("utf8").trim();

  return Object.entries(requirements).map(([id, rawEntry]) => {
    const entry = rawEntry as PromptRequirementsEntry;
    const name = typeof entry.name === "string" ? entry.name : id;
    const sectionId =
      typeof entry.kg_section_id === "string" ? entry.kg_section_id : id;
    const sectionSpec = compiledByName.get(name);
    if (!sectionSpec) {
      throw new Error(`Compiled runtime SectionSpec not found for ${id} (${name}).`);
    }
    const prompt = writer
      .replace("{{exchange_drafting}}", exchange)
      .replace("{{ai_tags}}", tags)
      .replace("{{section_name}}", name)
      .replace("{{requirements}}", sectionSpec)
      .replace("{{planner_block}}", "")
      .replace("{{context}}", "{{PREPARED_COMPANY_DATA}}")
      .replace("{{mod_note}}", "");
    return {
      id,
      sectionId,
      name,
      requirements: sectionSpec,
      prompt: cleanPrompt(prompt),
      executionContract: contractsDocument.contracts?.[id],
    };
  });
}

export async function loadDeveloperExecutionContracts(): Promise<ExecutionContractsDocument> {
  let raw: Buffer;
  try {
    raw = await readFromCandidates("execution-contracts.json");
  } catch {
    raw = await readRepoFile("ai-module/prompts/sections/execution_contracts.json");
  }
  const document = JSON.parse(raw.toString("utf8")) as ExecutionContractsDocument;
  if (document.contractCount !== 31 || !document.contracts) {
    throw new Error("Developer execution contracts are missing or invalid.");
  }
  return document;
}

export async function loadDeveloperPromptRequirements(): Promise<Record<string, Record<string, unknown>>> {
  const raw = await readRepoFile("ai-module/prompts/sections/requirements.json");
  return JSON.parse(raw.toString("utf8")) as Record<string, Record<string, unknown>>;
}

export async function loadDeveloperCompany(companyId: string): Promise<DeveloperCompany> {
  const packed = await loadDeveloperCompanyArchive(companyId);
  const raw = await unzip(packed);
  return JSON.parse(raw.toString("utf8")) as DeveloperCompany;
}

export async function loadDeveloperCompanyOverview(
  companyId: string
): Promise<DeveloperCompanyOverview> {
  const company = await loadDeveloperCompany(companyId);
  return {
    id: company.id,
    name: company.name,
    sourceFile: company.sourceFile,
    totalPages: company.totalPages,
    files: company.files,
    sections: company.sections.map((section) => ({
      id: section.id,
      title: section.title,
      pageStart: section.pageStart,
      pageEnd: section.pageEnd,
      referenceCharacters: section.referenceCharacters,
      preparedDataCharacters: section.preparedDataCharacters,
      rcaReady: section.rcaReady,
      promptId: section.promptId,
      contractCoverage: section.contractCoverage,
      contractVersion: section.contractVersion,
      contractSourceHash: section.contractSourceHash,
    })),
  };
}

export async function loadDeveloperCompanyArchive(companyId: string): Promise<Buffer> {
  if (!/^[a-zA-Z0-9_-]+$/.test(companyId)) {
    throw new Error("Invalid company id.");
  }
  return readFromCandidates(`${companyId}.json.gz`);
}

export async function loadDeveloperSection(
  companyId: string,
  sectionId: string
): Promise<{ company: DeveloperCompany; section: DeveloperSection }> {
  const company = await loadDeveloperCompany(companyId);
  const section = company.sections.find((item) => item.id === sectionId);
  if (!section) throw new Error(`Section ${sectionId} is not available for ${companyId}.`);
  return { company, section };
}
