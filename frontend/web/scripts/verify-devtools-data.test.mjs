import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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
    companies: [
      { id: "00001_demo", sectionCount: 3 },
      { id: "00002_demo", sectionCount: 4 },
    ],
  };
  await fs.writeFile(path.join(root, "index.json"), JSON.stringify(index));
  await fs.writeFile(path.join(root, "00001_demo.json.gz"), "one");
  await fs.writeFile(path.join(root, "00002_demo.json.gz"), "two");
  await fs.writeFile(path.join(root, "prompts.json"), "[]");
  await fs.writeFile(path.join(root, "prompt-requirements.json"), "{}");
  return root;
}

test("accepts a complete audited dataset", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await verifyDeveloperData(root, {
    expectedCompanyCount: 2,
    expectedPromptCount: 1,
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
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1 }),
    /payload is missing/
  );
});

test("rejects corrupt index JSON", async (t) => {
  const root = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "index.json"), "{broken");
  await assert.rejects(
    verifyDeveloperData(root, { expectedCompanyCount: 2, expectedPromptCount: 1 }),
    /invalid JSON/
  );
});
