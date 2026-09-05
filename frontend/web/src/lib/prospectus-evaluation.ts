import { createHash } from "node:crypto";

import type {
  ContractCoverage,
  DeterministicEvaluation,
  EvidenceFieldContract,
  RcaAttribution,
  SectionExecutionContract,
  SectionUnitPlan,
} from "@/lib/developer-tools-types";

const AI_TAG = /\[\[AI:[^\]]+\]\]/gi;
const VERIFICATION_BLOCK = /(?:\n### Verification Notes\b[\s\S]*|\n*---\s*\n*AI verification notes[\s\S]*)$/i;
const PLACEHOLDER = /(?:\[●[^\]]*\]|DATA_MISSING|Information not provided)/gi;
const NUMBER = /(?<![A-Za-z])(?:HK\$|RMB|US\$|USD|HKD)?\s*(?:\(?-?\d[\d,]*(?:\.\d+)?\)?%?|20\d{2})(?![A-Za-z])/gi;
const DATE = /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\b/gi;
const ENTITY = /\b(?:[A-Z][A-Za-z&'’.-]+(?:\s+|,\s*)){1,8}(?:Company|Co\.?|Limited|Ltd\.?|Inc\.?|Corporation|Holdings|Group|Securities|Capital|Bank)\b/g;
const MARKDOWN_HEADING = /^#{1,6}\s+(.+?)\s*$/gm;
const REFERENCE_HEADING = /^[A-Z][A-Z0-9 &(),/\-'’]{2,100}$/gm;

type PreparedRecord = Record<string, unknown>;

export function cleanAnnotatedDraft(text: string): string {
  return text
    .replace(VERIFICATION_BLOCK, "")
    .replace(AI_TAG, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function promptSha(prompt: string): string {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

function normalizeIdentifier(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeText(value: unknown): string {
  return String(value || "").toLowerCase().replace(/[^a-z0-9%$]+/g, " ").trim();
}

function numericTokens(value: unknown): Set<string> {
  const tokens = new Set<string>();
  for (const match of String(value || "").matchAll(NUMBER)) {
    const token = match[0].toLowerCase().replace(/\s+/g, "").replace(/,/g, "");
    tokens.add(token);
    const withoutCurrency = token.replace(/^(?:hk\$|rmb|us\$|usd|hkd)/, "");
    if (withoutCurrency && withoutCurrency !== token) tokens.add(withoutCurrency);
  }
  return tokens;
}

function dateTokens(value: unknown): Set<string> {
  return new Set(
    [...String(value || "").matchAll(DATE)].map((match) =>
      match[0].toLowerCase().replace(/[\s,]+/g, "")
    )
  );
}

function entityTokens(value: unknown): Set<string> {
  return new Set(
    [...String(value || "").matchAll(ENTITY)].map((match) => normalizeIdentifier(match[0]))
  );
}

function leafValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(leafValues);
  if (value && typeof value === "object") {
    const object = value as PreparedRecord;
    if ("value" in object) return leafValues(object.value);
    return Object.values(object).flatMap(leafValues);
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text.length >= 2 ? [text] : [];
  }
  return [];
}

function preparedValueMap(prepared: PreparedRecord): Map<string, unknown> {
  const source =
    (prepared.contract_values as PreparedRecord | undefined) ||
    (prepared.contractValues as PreparedRecord | undefined) ||
    (prepared.values as PreparedRecord | undefined) ||
    {};
  return new Map(Object.entries(source).map(([key, value]) => [normalizeIdentifier(key), value]));
}

function fieldEntry(map: Map<string, unknown>, field: EvidenceFieldContract): unknown {
  for (const candidate of [field.fieldId, field.label, ...field.aliases]) {
    const key = normalizeIdentifier(candidate);
    if (map.has(key)) return map.get(key);
  }
  return undefined;
}

function fieldValue(entry: unknown): unknown {
  if (entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry) {
    return (entry as PreparedRecord).value;
  }
  return entry;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function isNotApplicable(entry: unknown): boolean {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
  const record = entry as PreparedRecord;
  return record.applicable === false || record.evidence_status === "not_applicable";
}

export function contractCoverage(
  contract: SectionExecutionContract,
  prepared: PreparedRecord
): ContractCoverage {
  const values = preparedValueMap(prepared);
  const applicable = contract.fields.filter((field) => !isNotApplicable(fieldEntry(values, field)));
  const populated = applicable.filter((field) => hasValue(fieldValue(fieldEntry(values, field))));
  const atoms = Array.isArray(prepared.evidence_atoms) ? prepared.evidence_atoms.length : 0;
  const units = Array.isArray(prepared.section_units) ? prepared.section_units.length : 0;
  return {
    required: contract.fields.length,
    applicable: applicable.length,
    populated: populated.length,
    percent: applicable.length ? Math.round((1000 * populated.length) / applicable.length) / 10 : 100,
    evidenceAtoms: atoms,
    sectionUnits: units,
  };
}

export function mergeEvidenceUnits(
  contract: SectionExecutionContract,
  prepared: PreparedRecord
): SectionUnitPlan[] {
  const preparedUnits = Array.isArray(prepared.section_units)
    ? (prepared.section_units as Array<Record<string, unknown>>)
    : [];
  const atoms = Array.isArray(prepared.evidence_atoms)
    ? (prepared.evidence_atoms as Array<Record<string, unknown>>)
    : [];
  const atomsById = new Map(atoms.map((atom) => [String(atom.id || ""), atom]));
  const byId = new Map(preparedUnits.map((unit) => [String(unit.unitId || ""), unit]));
  const expanded: SectionUnitPlan[] = [];
  for (const unit of contract.units) {
    const preparedUnit = byId.get(unit.unitId);
    const ids = Array.isArray(preparedUnit?.evidenceAtomIds)
      ? preparedUnit.evidenceAtomIds.filter((value): value is string => typeof value === "string")
      : [];
    const groups: string[][] = [];
    let current: string[] = [];
    let characters = 0;
    for (const id of ids) {
      const atomCharacters = JSON.stringify(atomsById.get(id) || {}).length + 4;
      if (current.length && characters + atomCharacters > 45_000) {
        groups.push(current);
        current = [];
        characters = 0;
      }
      current.push(id);
      characters += atomCharacters;
    }
    if (current.length || !groups.length) groups.push(current);
    groups.forEach((group, index) => {
      const split = groups.length > 1;
      expanded.push({
        ...unit,
        unitId: split ? `${unit.unitId}:part:${index + 1}` : unit.unitId,
        order: expanded.length + 1,
        title: split ? `${unit.title} (${index + 1}/${groups.length})` : unit.title,
        instruction: split
          ? `${unit.instruction}\nContinue only the evidence assigned to part ${index + 1} of ${groups.length}; do not repeat earlier parts.`
          : unit.instruction,
        targetCharacters: Math.max(1200, Math.ceil(unit.targetCharacters / groups.length)),
        evidenceAtomIds: group,
        evidenceAtomCount: group.length,
      });
    });
  }
  return expanded;
}

export function evidenceForUnit(
  prepared: PreparedRecord,
  contract: SectionExecutionContract,
  unit: SectionUnitPlan
): PreparedRecord {
  const atoms = Array.isArray(prepared.evidence_atoms)
    ? (prepared.evidence_atoms as Array<Record<string, unknown>>)
    : [];
  const wanted = new Set(unit.evidenceAtomIds || []);
  const selectedAtoms = atoms.filter((atom) => wanted.has(String(atom.id || "")));
  const values = (prepared.contract_values as PreparedRecord | undefined) || {};
  const scopedValue = (fieldId: string): unknown => {
    const raw = values[fieldId];
    if (JSON.stringify(raw || null).length <= 4_000) return raw;
    const record = raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as PreparedRecord)
      : {};
    const linkedIds = Array.isArray(record.evidence_atom_ids)
      ? record.evidence_atom_ids.filter((id): id is string => typeof id === "string" && wanted.has(id))
      : [];
    return {
      value: "[Values are supplied by the linked EvidenceAtom records in this unit part.]",
      evidence_status: record.evidence_status || "section_traceable",
      evidence_atom_ids: linkedIds,
    };
  };
  const selectedValues = Object.fromEntries(
    unit.requiredFieldIds
      .filter((fieldId) => fieldId in values)
      .map((fieldId) => [fieldId, scopedValue(fieldId)])
  );
  return {
    schema_version: "developer-rca-unit-evidence/1.0",
    document_id: prepared.document_id,
    section_id: prepared.section_id,
    execution_contract: prepared.execution_contract,
    unit: {
      unitId: unit.unitId,
      title: unit.title,
      instruction: unit.instruction,
      targetCharacters: unit.targetCharacters,
      tableRequirements: unit.tableRequirements,
    },
    contract_values: selectedValues,
    evidence_atoms: selectedAtoms,
  };
}

type SharedFactKind = "stock_code" | "offer_price" | "offer_shares" | "issuer_name";

const SHARED_FACT_KEYS: Record<SharedFactKind, RegExp> = {
  stock_code: /stock.?code/i,
  offer_price: /offer.?price/i,
  offer_shares: /(?:number.?of)?.*offer.*shares/i,
  issuer_name: /(?:company|issuer).*legal.*name/i,
};

function sharedFactTokens(kind: SharedFactKind, text: string): Set<string> {
  if (kind === "issuer_name") return entityTokens(text);
  if (kind === "stock_code") {
    return new Set(
      [...text.matchAll(/stock\s*code\s*:?\s*([0-9]{1,6})/gi)].map((match) =>
        match[1].padStart(5, "0")
      )
    );
  }
  if (kind === "offer_price") {
    return new Set(
      [...text.matchAll(/(?:offer|max(?:imum)?\s+offer)\s+price[^\n.]{0,100}?(HK\$|RMB|US\$|USD|HKD)?\s*([0-9][\d,.]*)/gi)].map(
        (match) => `${(match[1] || "").toLowerCase()}${match[2].replace(/,/g, "")}`
      )
    );
  }
  return new Set(
    [...text.matchAll(/([0-9][\d,]*)\s+(?:H\s+)?(?:offer\s+)?shares/gi)].map((match) =>
      match[1].replace(/,/g, "")
    )
  );
}

export function crossSectionConsistencyScore(
  cleanDraft: string,
  preparedSections: Array<{ preparedData: PreparedRecord }>
): number {
  let tested = 0;
  let consistent = 0;
  for (const kind of Object.keys(SHARED_FACT_KEYS) as SharedFactKind[]) {
    const canonicalText: string[] = [];
    for (const section of preparedSections) {
      const values =
        (section.preparedData.contract_values as PreparedRecord | undefined) ||
        (section.preparedData.contractValues as PreparedRecord | undefined) ||
        {};
      for (const [key, value] of Object.entries(values)) {
        if (SHARED_FACT_KEYS[kind].test(key)) canonicalText.push(...leafValues(value));
      }
    }
    const expected = sharedFactTokens(kind, canonicalText.join("\n"));
    const actual = sharedFactTokens(kind, cleanDraft);
    if (!actual.size || !expected.size) continue;
    tested += 1;
    if ([...actual].every((token) => expected.has(token))) consistent += 1;
  }
  return percent(consistent, tested);
}

function headings(text: string, reference = false): string[] {
  const regex = reference ? REFERENCE_HEADING : MARKDOWN_HEADING;
  const found = [...text.matchAll(regex)].map((match) => normalizeText(reference ? match[0] : match[1]));
  return [...new Set(found.filter(Boolean))];
}

function tokenOverlap(left: string, right: string): number {
  const a = new Set(normalizeText(left).split(" ").filter(Boolean));
  const b = new Set(normalizeText(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  return [...a].filter((item) => b.has(item)).length / Math.min(a.size, b.size);
}

function lcsLength(left: string[], right: string[]): number {
  let previous = Array(right.length + 1).fill(0) as number[];
  for (const a of left) {
    const current = [0];
    for (let index = 1; index <= right.length; index += 1) {
      current.push(
        tokenOverlap(a, right[index - 1]) >= 0.5
          ? previous[index - 1] + 1
          : Math.max(previous[index], current[index - 1])
      );
    }
    previous = current;
  }
  return previous.at(-1) || 0;
}

function percent(numerator: number, denominator: number, fallback = 100): number {
  return denominator > 0
    ? Math.round(Math.max(0, Math.min(100, (1000 * numerator) / denominator))) / 10
    : fallback;
}

function containsFact(normalizedDraft: string, fact: string): boolean {
  const normalized = normalizeText(fact);
  if (!normalized) return true;
  if (normalizedDraft.includes(normalized)) return true;
  const requiredNumbers = numericTokens(fact);
  const draftNumbers = numericTokens(normalizedDraft);
  if ([...requiredNumbers].some((token) => !draftNumbers.has(token))) return false;
  const factTokens = [...new Set(normalized.split(" ").filter((token) => token.length > 2))];
  if (factTokens.length < 4) return false;
  const draftTokens = new Set(normalizedDraft.split(" "));
  const overlap = factTokens.filter((token) => draftTokens.has(token)).length / factTokens.length;
  return overlap >= (factTokens.length <= 12 ? 0.72 : 0.6);
}

function lengthProfile(cleanDraft: string, reference: string): number {
  if (!reference.trim()) return 100;
  const ratio = cleanDraft.trim().length / Math.max(reference.trim().length, 1);
  if (ratio >= 0.65 && ratio <= 1.25) return 100;
  if (ratio < 0.65) return Math.round((1000 * ratio) / 0.65) / 10;
  return Math.round((1000 * 1.25) / ratio) / 10;
}

export function evaluateDraft({
  contract,
  prepared,
  annotatedDraft,
  cleanDraft = cleanAnnotatedDraft(annotatedDraft),
  referenceText = "",
  crossSectionConsistency = 100,
}: {
  contract: SectionExecutionContract;
  prepared: PreparedRecord;
  annotatedDraft: string;
  cleanDraft?: string;
  referenceText?: string;
  crossSectionConsistency?: number;
}): DeterministicEvaluation {
  const valueMap = preparedValueMap(prepared);
  const applicable = contract.fields.filter((field) => !isNotApplicable(fieldEntry(valueMap, field)));
  const present = applicable.flatMap((field) => {
    const value = fieldValue(fieldEntry(valueMap, field));
    return hasValue(value) ? [{ field, value }] : [];
  });
  const missingFields = applicable
    .filter((field) => !hasValue(fieldValue(fieldEntry(valueMap, field))))
    .map((field) => field.label);
  const inputFieldCoverage = percent(present.length, applicable.length);

  const requiredFacts = [...new Set(present.flatMap(({ value }) => leafValues(value)))];
  const atoms = Array.isArray(prepared.evidence_atoms)
    ? (prepared.evidence_atoms as Array<Record<string, unknown>>)
    : [];
  for (const atom of atoms) {
    if (!["required", "high"].includes(String(atom.priority || ""))) continue;
    const value = String(atom.value || atom.text || "").trim();
    if (value.length >= 2 && value.length <= 500) requiredFacts.push(value);
  }
  const uniqueFacts = [...new Set(requiredFacts)];
  const normalizedDraft = normalizeText(cleanDraft);
  const missingFacts = uniqueFacts.filter((fact) => !containsFact(normalizedDraft, fact));
  const requiredFactRecall = percent(uniqueFacts.length - missingFacts.length, uniqueFacts.length);

  const evidenceText = [
      ...leafValues(prepared.values),
      ...leafValues(prepared.contract_values),
      ...atoms.map((atom) => String(atom.value || atom.text || "")),
    ].join("\n");
  const evidenceNumbers = numericTokens(evidenceText);
  const evidenceDates = dateTokens(evidenceText);
  const evidenceEntities = entityTokens(evidenceText);
  const draftNumbers = numericTokens(cleanDraft);
  const draftDates = dateTokens(cleanDraft);
  const draftEntities = entityTokens(cleanDraft);
  const entitySupported = (token: string) =>
    [...evidenceEntities].some((evidence) => evidence.includes(token) || token.includes(evidence));
  const supported = [...draftNumbers].filter((token) => evidenceNumbers.has(token));
  const unsupportedNumbers = [...draftNumbers].filter((token) => !evidenceNumbers.has(token)).sort();
  const priorityNumbers = numericTokens(uniqueFacts.join("\n"));
  const recalledNumbers = [...priorityNumbers].filter((token) => draftNumbers.has(token));
  const numericPrecision = percent(supported.length, draftNumbers.size);
  const numericRecall = percent(recalledNumbers.length, priorityNumbers.size);
  const unsupportedDates = [...draftDates].filter((token) => !evidenceDates.has(token));
  const unsupportedEntities = [...draftEntities].filter((token) => !entitySupported(token));

  const draftHeadings = headings(cleanDraft);
  const unitTitles = contract.units.map((unit) => unit.title);
  const matchedUnits = unitTitles.filter(
    (title) =>
      draftHeadings.some((heading) => tokenOverlap(title, heading) >= 0.5) ||
      normalizedDraft.includes(normalizeText(title))
  );
  const structureCoverage = percent(matchedUnits.length, unitTitles.length);
  const outlineOrderSimilarity = percent(lcsLength(unitTitles, draftHeadings), unitTitles.length);
  const referenceHeadings = headings(referenceText, true);
  const referenceOutlineSimilarity = referenceHeadings.length
    ? percent(lcsLength(referenceHeadings, draftHeadings), referenceHeadings.length)
    : structureCoverage;
  const lengthScore = lengthProfile(cleanDraft, referenceText);

  const placeholderCount = [...cleanDraft.matchAll(PLACEHOLDER)].length;
  const placeholderIntegrity = missingFields.length
    ? percent(Math.min(placeholderCount, missingFields.length), missingFields.length)
    : placeholderCount === 0
      ? 100
      : 0;
  const groundedClaimPrecision = percent(
    supported.length +
      [...draftDates].filter((token) => evidenceDates.has(token)).length +
      [...draftEntities].filter(entitySupported).length,
    draftNumbers.size + draftDates.size + draftEntities.size
  );
  const structureScore =
    (structureCoverage + outlineOrderSimilarity + referenceOutlineSimilarity) / 3;
  const formatLengthScore = (lengthScore + placeholderIntegrity) / 2;
  let overallScore = Math.round(
    10 *
      (requiredFactRecall * 0.3 +
        ((numericPrecision + numericRecall) / 2) * 0.25 +
        groundedClaimPrecision * 0.2 +
        structureScore * 0.15 +
        formatLengthScore * 0.1)
  ) / 10;

  const hardFailures: string[] = [];
  if (unsupportedNumbers.length) hardFailures.push("unsupported_numeric_claim");
  if (unsupportedDates.length) hardFailures.push("unsupported_date_claim");
  if (unsupportedEntities.length) hardFailures.push("unsupported_entity_claim");
  if (AI_TAG.test(cleanDraft)) hardFailures.push("clean_draft_contains_ai_tag");
  AI_TAG.lastIndex = 0;
  if (crossSectionConsistency < 100) hardFailures.push("cross_section_contradiction");
  if (hardFailures.length) overallScore = Math.min(overallScore, 49);

  let rootCause: RcaAttribution = "none";
  if (missingFields.length) rootCause = "data_incomplete";
  else if (requiredFactRecall < 85 || structureCoverage < 90) rootCause = "prompt_or_workflow";
  else if (hardFailures.length) rootCause = "model_limitation";

  return {
    overallScore,
    inputFieldCoverage,
    requiredFactRecall,
    numericFidelity: { precision: numericPrecision, recall: numericRecall },
    groundedClaimPrecision,
    structureCoverage,
    outlineOrderSimilarity,
    referenceOutlineSimilarity,
    lengthProfile: lengthScore,
    placeholderIntegrity,
    crossSectionConsistency,
    hardFailures,
    missingFields: missingFields.slice(0, 50),
    missingFacts: missingFacts.slice(0, 50),
    unsupportedNumbers: unsupportedNumbers.slice(0, 50),
    unsupportedDates: unsupportedDates.slice(0, 50),
    unsupportedEntities: unsupportedEntities.slice(0, 50),
    rootCause,
  };
}
