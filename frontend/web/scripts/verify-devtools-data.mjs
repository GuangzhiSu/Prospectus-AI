import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const DEFAULT_COMPANY_COUNT = 125;
const DEFAULT_PROMPT_COUNT = 31;
const DEFAULT_SECTION_COUNT = 3653;
const MIN_SHORT_FIELD_COVERAGE = 95;
const MIN_LONG_FIELD_COVERAGE = 90;

export async function verifyDeveloperData(
  dataRoot,
  {
    expectedCompanyCount = DEFAULT_COMPANY_COUNT,
    expectedPromptCount = DEFAULT_PROMPT_COUNT,
    expectedSectionCount = DEFAULT_SECTION_COUNT,
  } = {}
) {
  const indexPath = path.join(dataRoot, "index.json");
  let raw;
  try {
    raw = await fs.readFile(indexPath, "utf8");
  } catch (error) {
    throw new Error(`Developer dataset index is missing: ${indexPath}`, { cause: error });
  }

  let index;
  try {
    index = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Developer dataset index is invalid JSON: ${indexPath}`, { cause: error });
  }

  if (!Array.isArray(index.companies)) {
    throw new Error("Developer dataset index must contain a companies array.");
  }
  if (
    index.companyCount !== expectedCompanyCount ||
    index.companies.length !== expectedCompanyCount
  ) {
    throw new Error(
      `Developer dataset company count mismatch: expected ${expectedCompanyCount}, ` +
        `index=${index.companyCount}, entries=${index.companies.length}.`
    );
  }
  if (index.promptCount !== expectedPromptCount) {
    throw new Error(
      `Developer dataset prompt count mismatch: expected ${expectedPromptCount}, got ${index.promptCount}.`
    );
  }

  const audit = index.groundTruthAudit || {};
  if (
    audit.documents_audited !== expectedCompanyCount ||
    audit.passed !== expectedCompanyCount ||
    audit.failed !== 0 ||
    audit.missing_required_rca_sections !== 0 ||
    audit.truncated_sections !== 0 ||
    audit.unmapped_sections !== 0
  ) {
    throw new Error("Developer dataset ground-truth audit is incomplete or contains failures.");
  }

  const ids = new Set();
  let sectionCount = 0;
  for (const company of index.companies) {
    if (!company || typeof company.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(company.id)) {
      throw new Error("Developer dataset contains an invalid company id.");
    }
    if (ids.has(company.id)) {
      throw new Error(`Developer dataset contains a duplicate company id: ${company.id}.`);
    }
    ids.add(company.id);
    sectionCount += Number(company.sectionCount || 0);
    const payloadPath = path.join(dataRoot, `${company.id}.json.gz`);
    let payloadBuffer;
    try {
      payloadBuffer = await fs.readFile(payloadPath);
    } catch (error) {
      throw new Error(`Developer dataset payload is missing: ${company.id}.json.gz`, {
        cause: error,
      });
    }
    if (payloadBuffer.length === 0) {
      throw new Error(`Developer dataset payload is empty: ${company.id}.json.gz`);
    }
    let payload;
    try {
      payload = JSON.parse(gunzipSync(payloadBuffer).toString("utf8"));
    } catch (error) {
      throw new Error(`Developer dataset payload is corrupt: ${company.id}.json.gz`, {
        cause: error,
      });
    }
    if (payload.id !== company.id || !Array.isArray(payload.sections)) {
      throw new Error(`Developer dataset payload identity is invalid: ${company.id}.json.gz`);
    }
    if (payload.sections.length !== company.sectionCount) {
      throw new Error(
        `Developer dataset section count mismatch for ${company.id}: ` +
          `index=${company.sectionCount}, payload=${payload.sections.length}.`
      );
    }
    const summaries = new Map(
      (Array.isArray(company.sections) ? company.sections : []).map((section) => [
        section.id,
        section,
      ])
    );
    for (const section of payload.sections) {
      const prepared = section?.preparedData;
      const summary = summaries.get(section.id);
      if (!summary || typeof summary.rcaReady !== "boolean") {
        throw new Error(
          `Developer dataset RCA readiness audit is missing: ${company.id}/${section.id}.`
        );
      }
      if (summary.rcaReady && (
        !prepared ||
        typeof prepared !== "object" ||
        Array.isArray(prepared) ||
        Object.keys(prepared).length === 0
      )) {
        throw new Error(
          `Developer dataset prepared RCA data is missing: ${company.id}/${section?.id || "unknown"}.`
        );
      }
      if (
        !Number.isInteger(summary.preparedDataCharacters) ||
        summary.preparedDataCharacters !== section.preparedDataCharacters ||
        (summary.rcaReady && summary.preparedDataCharacters <= 2) ||
        summary.rcaReady !== section.rcaReady
      ) {
        throw new Error(
          `Developer dataset prepared-data audit is invalid: ${company.id}/${section.id}.`
        );
      }
      if (summary.rcaReady) {
        const coverage = summary.contractCoverage || {};
        if (
          !Number.isInteger(coverage.required) ||
          coverage.required <= 0 ||
          !Number.isInteger(coverage.applicable) ||
          !Number.isInteger(coverage.populated) ||
          coverage.populated > coverage.applicable ||
          !Number.isFinite(coverage.percent) ||
          !summary.contractVersion ||
          !summary.contractSourceHash
        ) {
          throw new Error(
            `Developer dataset execution-contract coverage is invalid: ${company.id}/${section.id}.`
          );
        }
        const contractValues = prepared?.contract_values;
        if (contractValues && typeof contractValues === "object" && !Array.isArray(contractValues)) {
          const legacyOwners = new Map();
          for (const [fieldId, value] of Object.entries(contractValues)) {
            const sourceKey =
              value && typeof value === "object" && !Array.isArray(value)
                ? value.contract_source_key
                : undefined;
            if (typeof sourceKey !== "string" || !sourceKey) continue;
            const owner = legacyOwners.get(sourceKey);
            if (owner && owner !== fieldId) {
              throw new Error(
                `Developer dataset reuses legacy source ${sourceKey} across ` +
                  `${company.id}/${section.id}: ${owner}, ${fieldId}.`
              );
            }
            legacyOwners.set(sourceKey, fieldId);
          }
        }
      }
    }
  }

  if (sectionCount !== expectedSectionCount) {
    throw new Error(
      `Developer dataset section count mismatch: expected ${expectedSectionCount}, got ${sectionCount}.`
    );
  }

  const contractAudit = index.executionContractAudit || {};
  if (
    contractAudit.contractCount !== expectedPromptCount ||
    contractAudit.rcaReadySections <= 0 ||
    contractAudit.shortSectionCoveragePercent < MIN_SHORT_FIELD_COVERAGE ||
    contractAudit.longSectionCoveragePercent < MIN_LONG_FIELD_COVERAGE
  ) {
    throw new Error(
      "Developer dataset execution-contract audit failed: " +
        `contracts=${contractAudit.contractCount}, ` +
        `short=${contractAudit.shortSectionCoveragePercent}%, ` +
        `long=${contractAudit.longSectionCoveragePercent}%.`
    );
  }
  if (expectedCompanyCount === DEFAULT_COMPANY_COUNT && (
    index.benchmarkSplit?.trainingCompanyCount !== 100 ||
    index.benchmarkSplit?.holdoutCompanyCount !== 25 ||
    !Array.isArray(index.benchmarkSplit?.holdoutCompanyIds) ||
    index.benchmarkSplit.holdoutCompanyIds.length !== 25
  )) {
    throw new Error("Developer dataset benchmark split must contain 100 training and 25 holdout companies.");
  }

  const profiles = index.sectionProfiles || {};
  if (expectedCompanyCount === DEFAULT_COMPANY_COUNT && Object.keys(profiles).length !== expectedPromptCount) {
    throw new Error(
      `Developer dataset must contain ${expectedPromptCount} training-only section profiles.`
    );
  }
  for (const [sectionId, profile] of Object.entries(profiles)) {
    const lengths = profile?.lengthCharacters || {};
    if (
      profile?.source !== "training_split_aggregate_v1" ||
      !Number.isInteger(profile?.sampleCount) ||
      profile.sampleCount <= 0 ||
      !Number.isFinite(lengths.p25) ||
      !Number.isFinite(lengths.median) ||
      !Number.isFinite(lengths.p75) ||
      lengths.p25 > lengths.median ||
      lengths.median > lengths.p75 ||
      !Array.isArray(profile?.commonOutline)
    ) {
      throw new Error(`Developer dataset structure profile is invalid: ${sectionId}.`);
    }
  }

  for (const name of ["prompts.json", "prompt-requirements.json", "execution-contracts.json"]) {
    const stat = await fs.stat(path.join(dataRoot, name));
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Developer dataset support file is empty: ${name}`);
    }
  }
  const requirements = JSON.parse(
    await fs.readFile(path.join(dataRoot, "prompt-requirements.json"), "utf8")
  );
  for (const [sectionId, requirement] of Object.entries(requirements)) {
    for (const field of requirement?.kg_required_input_fields || []) {
      if (field && typeof field === "object" && "example" in field) {
        throw new Error(`Concrete SectionSpec example is prohibited: ${sectionId}.`);
      }
    }
  }

  return {
    companyCount: index.companyCount,
    promptCount: index.promptCount,
    sectionCount,
    auditPassed: audit.passed,
  };
}

async function main() {
  const dataRoot = path.resolve(process.cwd(), "devtools-data");
  const required = process.env.VERCEL_ENV === "production" || process.env.REQUIRE_DEVTOOLS_DATA === "1";
  try {
    const result = await verifyDeveloperData(dataRoot);
    process.stdout.write(
      `Developer dataset verified: ${result.companyCount} companies, ` +
        `${result.sectionCount} sections, ${result.promptCount} prompts.\n`
    );
  } catch (error) {
    if (!required && error instanceof Error && error.message.includes("index is missing")) {
      process.stdout.write("Developer dataset is not present; skipping outside production.\n");
      return;
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
