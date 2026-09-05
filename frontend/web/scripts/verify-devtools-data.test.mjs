import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { verifyDeveloperData } from "./verify-devtools-data.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "prospectus-devtools-data-"));
  const index = {
    companyCount: 2,
    promptCount: 1,
    groundTruthAudit: {
      documents_audited: 2,
      passed: 2,
      failed: 0,
      missing_required_rca_sections: 0,
      truncated_sections: 0,
      unmapped_sections: 0,
    },
    executionContractAudit: {
      contractCount: 1,
      rcaReadySections: 7,
      shortSectionCoveragePercent: 100,
      longSectionCoveragePercent: 100,
    },
    companies: [
      {
        id: "00001_demo",
        sectionCount: 3,
        sections: ["A", "B", "C"].map((id) => ({ id, preparedDataCharacters: 42, rcaReady: true, contractCoverage: { required: 1, applicable: 1, populated: 1, percent: 100 }, contractVersion: "test/1", contractSourceHash: "abc" })),
      },
      {
        id: "00002_demo",
        sectionCount: 4,
        sections: ["A", "B", "C", "D"].map((id) => ({ id, preparedDataCharacters: 42, rcaReady: true, contractCoverage: { required: 1, applicable: 1, populated: 1, percent: 100 }, contractVersion: "test/1", contractSourceHash: "abc" })),
      },
    ],
  };
  await fs.writeFile(path.join(root, "index.json"), JSON.stringify(index));
  for (const company of index.companies) {
    await fs.writeFile(
      path.join(root, `${company.id}.json.gz`),
      gzipSync(
        JSON.stringify({
          id: company.id,
          sections: company.sections.map(({ id, preparedDataCharacters, rcaReady }) => ({
            id,
            preparedDataCharacters,
            rcaReady,
            preparedData: { extracted_source_materials: { char_count: 100 } },
          })),
        })
      )
    );
  }
  await fs.writeFile(path.join(root, "prompts.json"), "[]");
  await fs.writeFile(path.join(root, "prompt-requirements.json"), "{}");
  await fs.writeFile(path.join(root, "execution-contracts.json"), "{}");
  return root;
}

test("accepts a complete audited dataset", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await verifyDeveloperData(root, {
    expectedCompanyCount: 2,
    expectedPromptCount: 1,
    expectedSectionCount: 7,
  });
  assert.deepEqual(result, {
    companyCount: 2,
    promptCount: 1,
    sectionCount: 7,
    auditPassed: 2,
  });
});

test("rejects a missing company payload", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.rm(path.join(root, "00002_demo.json.gz"));
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1, expectedSectionCount: 7 }),
    /payload is missing/
  );
});

test("rejects corrupt index JSON", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "index.json"), "{broken");
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1, expectedSectionCount: 7 }),
    /invalid JSON/
  );
});

test("rejects a corrupt company payload", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "00002_demo.json.gz"), "not gzip");
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1, expectedSectionCount: 7 }),
    /payload is corrupt/
  );
});

test("rejects a section whose prepared RCA data is empty", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(root, "00001_demo.json.gz"),
    gzipSync(
      JSON.stringify({
        id: "00001_demo",
        sections: [
          { id: "A", preparedDataCharacters: 2, rcaReady: true, preparedData: {} },
          { id: "B", preparedDataCharacters: 42, rcaReady: true, preparedData: { values: {} } },
          { id: "C", preparedDataCharacters: 42, rcaReady: true, preparedData: { values: {} } },
        ],
      })
    )
  );
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1, expectedSectionCount: 7 }),
    /prepared RCA data is missing/
  );
});

test("rejects concrete SectionSpec example values", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(root, "prompt-requirements.json"),
    JSON.stringify({ Cover: { kg_required_input_fields: [{ field: "issuer_name", example: "Issuer A" }] } })
  );
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1, expectedSectionCount: 7 }),
    /Concrete SectionSpec example is prohibited/
  );
});
