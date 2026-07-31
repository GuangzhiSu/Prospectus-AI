import { stripModelReasoning } from "@/lib/strip-model-reasoning";
import { sectionHasQualityContent } from "@/lib/section-quality";

export const SECTION_ORDER = [
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
] as const;

export const SECTION_NAMES: Record<string, string> = {
  ExpectedTimetable: "Expected Timetable",
  Contents: "Contents",
  Summary: "Summary",
  Definitions: "Definitions",
  Glossary: "Glossary of Technical Terms",
  ForwardLooking: "Forward-Looking Statements",
  RiskFactors: "Risk Factors",
  Waivers: "Waivers from Strict Compliance with Listing Rules",
  InfoProspectus: "Information about this Prospectus and the Global Offering",
  DirectorsParties: "Directors and Parties Involved",
  CorporateInfo: "Corporate Information",
  Regulation: "Regulation (Regulatory Overview)",
  IndustryOverview: "Industry Overview",
  HistoryReorg: "History, Reorganization, and Corporate Structure",
  Business: "Business",
  ContractualArrangements: "Contractual Arrangements (VIE)",
  ControllingShareholders: "Relationship with Controlling Shareholders",
  ConnectedTransactions: "Connected Transactions",
  DirectorsSeniorMgmt: "Directors and Senior Management",
  SubstantialShareholders: "Substantial Shareholders",
  ShareCapital: "Share Capital",
  FinancialInfo: "Financial Information",
  UseOfProceeds: "Future Plans and Use of Proceeds",
  Underwriting: "Underwriting",
  GlobalOfferingStructure: "Structure of the Global Offering",
};

function matchSectionId(firstLine: string): string | null {
  for (const sid of SECTION_ORDER) {
    const name = SECTION_NAMES[sid];
    if (
      firstLine === name ||
      firstLine.startsWith(name) ||
      firstLine.includes(sid) ||
      firstLine === `Section ${sid}: ${name}`
    ) {
      return sid;
    }
  }
  return null;
}

/** Split combined draft on top-level section headers only (not numbered ## subsections). */
const TOP_LEVEL_SECTION_SPLIT = /\n(?=## Section )/;

function parseTopLevelSectionBlock(block: string): { firstLine: string; content: string } | null {
  const trimmed = block.trim();
  if (!trimmed.startsWith("## Section ")) return null;
  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.replace(/^##\s+/, "").trim() ?? "";
  const content = lines.slice(1).join("\n").trim();
  return { firstLine, content };
}

/** Parse combined draft markdown into section bodies (optionally strip thinking per section). */
export function parseDraftSections(
  md: string,
  options?: { stripThinking?: boolean }
): Record<string, string> {
  const stripThinking = options?.stripThinking !== false;
  const sections: Record<string, string> = {};
  if (!md || md.includes("(Your generated prospectus will appear here.")) {
    return sections;
  }

  const blocks = md.split(TOP_LEVEL_SECTION_SPLIT);
  for (const block of blocks) {
    const parsed = parseTopLevelSectionBlock(block);
    if (!parsed) continue;
    const sid = matchSectionId(parsed.firstLine);
    if (sid) {
      sections[sid] = stripThinking
        ? stripModelReasoning(parsed.content)
        : parsed.content;
    }
  }
  return sections;
}

/** True when a section body has non-whitespace prose (after strip). */
export function sectionHasContent(body: string | undefined): boolean {
  return !!body?.trim();
}

/** True when section passes minimum prose / placeholder quality checks. */
export function sectionIsComplete(
  body: string | undefined,
  sectionId: string
): boolean {
  if (!sectionHasContent(body)) return false;
  return sectionHasQualityContent(body, sectionId);
}

/** Section ids in prospectus order that have no saved body yet. */
export function getMissingSectionIds(
  sections: Record<string, string>
): string[] {
  return SECTION_ORDER.filter(
    (sid) => !sectionIsComplete(sections[sid], sid)
  );
}

/** Count sections with saved body content. */
export function countGeneratedSections(
  sections: Record<string, string>
): number {
  return SECTION_ORDER.filter((sid) =>
    sectionIsComplete(sections[sid], sid)
  ).length;
}

/** Highest index in SECTION_ORDER that has content, or -1 if none. */
export function getLastGeneratedIndex(
  sections: Record<string, string>
): number {
  let lastIndex = -1;
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    if (sectionIsComplete(sections[SECTION_ORDER[i]], SECTION_ORDER[i]))
      lastIndex = i;
  }
  return lastIndex;
}

/** Rebuild combined draft markdown from stripped section bodies. */
export function rebuildDraftMarkdown(
  sections: Record<string, string>,
  header = "# Prospectus Draft (Generated by Agent2)"
): string {
  const parts = [header, ""];
  for (const sid of SECTION_ORDER) {
    const body = sections[sid];
    if (body === undefined) continue;
    const name = SECTION_NAMES[sid];
    parts.push(`## Section ${sid}: ${name}`, "", body, "");
  }
  return parts.join("\n").trimEnd() + "\n";
}

/** Parse draft, strip thinking per section, and return cleaned combined markdown. */
export function cleanDraftMarkdown(md: string): string {
  const sections = parseDraftSections(md, { stripThinking: true });
  if (Object.keys(sections).length === 0) return md;
  const header =
    md.split(TOP_LEVEL_SECTION_SPLIT)[0]?.trim() ||
    "# Prospectus Draft (Generated by Agent2)";
  return rebuildDraftMarkdown(sections, header);
}
