import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_COMPANY_COUNT = 125;
const DEFAULT_PROMPT_COUNT = 31;

export async function verifyDeveloperData(
  dataRoot,
  {
    expectedCompanyCount = DEFAULT_COMPANY_COUNT,
    expectedPromptCount = DEFAULT_PROMPT_COUNT,
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
    let stat;
    try {
      stat = await fs.stat(payloadPath);
    } catch (error) {
      throw new Error(`Developer dataset payload is missing: ${company.id}.json.gz`, {
        cause: error,
      });
    }
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Developer dataset payload is empty: ${company.id}.json.gz`);
    }
  }

  for (const name of ["prompts.json", "prompt-requirements.json"]) {
    const stat = await fs.stat(path.join(dataRoot, name));
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Developer dataset support file is empty: ${name}`);
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
