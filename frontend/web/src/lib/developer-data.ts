import fs from "node:fs/promises";
import path from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

import type {
  DeveloperCompany,
  DeveloperDatasetIndex,
  DeveloperPrompt,
  DeveloperSection,
} from "@/lib/developer-tools-types";

const unzip = promisify(gunzip);

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

export async function loadDeveloperIndex(): Promise<DeveloperDatasetIndex> {
  const raw = await readFromCandidates("index.json");
  return JSON.parse(raw.toString("utf8")) as DeveloperDatasetIndex;
}

export async function loadDeveloperPrompts(): Promise<DeveloperPrompt[]> {
  const raw = await readFromCandidates("prompts.json");
  const parsed = JSON.parse(raw.toString("utf8")) as { prompts: DeveloperPrompt[] };
  return parsed.prompts;
}

export async function loadDeveloperPromptRequirements(): Promise<Record<string, Record<string, unknown>>> {
  const raw = await readFromCandidates("prompt-requirements.json");
  return JSON.parse(raw.toString("utf8")) as Record<string, Record<string, unknown>>;
}

export async function loadDeveloperCompany(companyId: string): Promise<DeveloperCompany> {
  if (!/^[a-zA-Z0-9_-]+$/.test(companyId)) {
    throw new Error("Invalid company id.");
  }
  const packed = await readFromCandidates(`${companyId}.json.gz`);
  const raw = await unzip(packed);
  return JSON.parse(raw.toString("utf8")) as DeveloperCompany;
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
