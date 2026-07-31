/** Quality heuristics for Agent2 section bodies (mirrors section_quality.py). */

const HEADING_RE = /^#{1,6}\s+/;
const PLACEHOLDER_RE =
  /DATA_MISSING|Information not provided|\[Information not provided/i;
const AI_TAG_RE = /^\[\[AI:/;
const TABLE_ROW_RE = /^\|/;
const TABLE_SEP_RE = /^\|[\s:\-|]+\|$/;
const AI_TAG_INLINE_RE = /\[\[AI:[^\]]*\]\]/g;

const EXEMPT_SECTIONS = new Set(["Contents", "ExpectedTimetable"]);
const EVIDENCE_GAP_SECTIONS = new Set(["UseOfProceeds", "ShareCapital"]);

const VERIFICATION_NOTES_RE = /\n### Verification Notes\b[\s\S]*/i;

function stripVerificationNotes(markdown: string): string {
  return markdown.replace(VERIFICATION_NOTES_RE, "").trimEnd() + "\n";
}

const MIN_PROSE_LINES = 15;
const MAX_PLACEHOLDER_RATIO = 0.33;
const MAX_EMPTY_H2 = 2;
const MIN_H2_PROSE_CHARS = 80;
const MAX_THIN_H2 = 2;

function isProseLine(line: string): boolean {
  const s = line.trim();
  if (!s || s === "---") return false;
  if (HEADING_RE.test(s)) return false;
  if (AI_TAG_RE.test(s)) return false;
  if (TABLE_ROW_RE.test(s)) return false;
  return true;
}

function isContentLine(line: string): boolean {
  const s = line.trim();
  if (!s || s === "---" || s === "***" || s === "**") return false;
  if (TABLE_SEP_RE.test(s)) return false;
  if (HEADING_RE.test(s)) return false;
  if (AI_TAG_RE.test(s)) return false;
  if (TABLE_ROW_RE.test(s)) return true;
  return true;
}

function isPlaceholderDominatedLine(line: string): boolean {
  if (!PLACEHOLDER_RE.test(line)) return false;
  let remainder = line.replace(AI_TAG_INLINE_RE, "");
  remainder = remainder.replace(/\*\*DATA_MISSING\*\*\.?/gi, "");
  remainder = remainder.replace(
    /Information not provided|\[Information not provided[^\]]*\]/gi,
    ""
  );
  return remainder.trim().length < MIN_H2_PROSE_CHARS / 2;
}

function substantiveH2Count(body: string): number {
  return h2Blocks(body).filter(([, chunk]) => {
    const proseInChunk = chunk.filter(isProseLine);
    return proseInChunk.join("").length >= MIN_H2_PROSE_CHARS;
  }).length;
}

function h2Blocks(body: string): Array<[string, string[]]> {
  const lines = body.split("\n");
  const blocks: Array<[string, string[]]> = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i]?.trim().match(/^##\s+(.+)$/);
    if (!m) {
      i++;
      continue;
    }
    const title = m[1]?.trim() ?? "";
    const chunk: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      if (/^##\s+/.test(lines[j]?.trim() ?? "")) break;
      chunk.push(lines[j] ?? "");
      j++;
    }
    blocks.push([title, chunk]);
    i = j > i ? j : i + 1;
  }
  return blocks;
}

export type SectionQualityReport = {
  sectionId: string;
  proseLineCount: number;
  placeholderRatio: number;
  emptyH2Count: number;
  thinH2Count: number;
  duplicateH1: boolean;
  failReasons: string[];
  gapKind: "none" | "GENERATION_GAP" | "EVIDENCE_GAP";
  ok: boolean;
};

export function analyzeSectionQuality(
  body: string | undefined,
  sectionId: string
): SectionQualityReport {
  const report: SectionQualityReport = {
    sectionId,
    proseLineCount: 0,
    placeholderRatio: 0,
    emptyH2Count: 0,
    thinH2Count: 0,
    duplicateH1: false,
    failReasons: [],
    gapKind: "none",
    ok: true,
  };

  const raw = (body ?? "").trim();
  if (!raw) {
    report.ok = false;
    report.failReasons.push("empty_body");
    report.gapKind = "GENERATION_GAP";
    return report;
  }

  const text = stripVerificationNotes(raw).trim();

  const lines = text.split("\n").filter((l) => l.trim());
  const proseLines = lines.filter(isProseLine);
  const contentLines = lines.filter(isContentLine);
  const placeholderLines = lines.filter(isPlaceholderDominatedLine);

  report.proseLineCount = proseLines.length;
  report.placeholderRatio = placeholderLines.length / Math.max(lines.length, 1);
  report.duplicateH1 = /^#\s+[A-Z][A-Z0-9\s,&()\-/'"]+$/m.test(text);

  report.emptyH2Count = h2Blocks(text).filter(
    ([, chunk]) => !chunk.some(isProseLine)
  ).length;

  report.thinH2Count = h2Blocks(text).filter(([, chunk]) => {
    const proseInChunk = chunk.filter(isProseLine);
    if (!proseInChunk.length) return false;
    return proseInChunk.join("").length < MIN_H2_PROSE_CHARS;
  }).length;

  if (EXEMPT_SECTIONS.has(sectionId)) return report;

  if (EVIDENCE_GAP_SECTIONS.has(sectionId)) {
    report.gapKind = "EVIDENCE_GAP";
  }

  const substantiveH2 = substantiveH2Count(text);
  const hasEnoughContent =
    contentLines.length >= MIN_PROSE_LINES ||
    substantiveH2 >= MIN_PROSE_LINES ||
    (substantiveH2 >= 6 &&
      contentLines.length >= 10 &&
      report.thinH2Count === 0 &&
      report.emptyH2Count === 0);

  if (!hasEnoughContent) {
    report.failReasons.push(`prose_line_count<${MIN_PROSE_LINES}`);
  }
  if (report.placeholderRatio > MAX_PLACEHOLDER_RATIO) {
    report.failReasons.push(`placeholder_ratio>${MAX_PLACEHOLDER_RATIO}`);
  }
  if (report.emptyH2Count >= MAX_EMPTY_H2) {
    report.failReasons.push(`empty_h2_count>=${MAX_EMPTY_H2}`);
  }
  if (report.thinH2Count >= MAX_THIN_H2) {
    report.failReasons.push(`thin_h2_count>=${MAX_THIN_H2}`);
  }

  if (report.failReasons.length > 0) {
    report.ok = false;
    if (report.gapKind === "none") report.gapKind = "GENERATION_GAP";
  }

  return report;
}

/** True when section has enough prose to show as generated in the UI. */
export function sectionHasContent(body: string | undefined): boolean {
  return !!body?.trim();
}

/** Per-section quality gate (matches Python section_quality_ok). */
export function sectionHasQualityContent(
  body: string | undefined,
  sectionId: string
): boolean {
  if (!body?.trim()) return false;
  if (EXEMPT_SECTIONS.has(sectionId)) return true;
  return analyzeSectionQuality(body, sectionId).ok;
}
