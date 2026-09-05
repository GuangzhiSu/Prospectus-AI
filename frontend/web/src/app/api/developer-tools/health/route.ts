import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperCompany, loadDeveloperIndex } from "@/lib/developer-data";
import { loadPromptOverrides } from "@/lib/developer-prompt-sync";
import type {
  DeveloperToolsHealth,
  ModelProviderId,
} from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER_KEYS: Array<[ModelProviderId, string]> = [
  ["openai", "OPENAI_API_KEY"],
  ["deepseek", "DEEPSEEK_API_KEY"],
  ["qwen_api", "DASHSCOPE_API_KEY"],
  ["anthropic", "ANTHROPIC_API_KEY"],
];

export async function GET() {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();
  const configuredProviders = PROVIDER_KEYS.flatMap(([provider, envName]) =>
    process.env[envName]?.trim() ? [provider] : []
  );

  let dataset: DeveloperToolsHealth["dataset"];
  try {
    const index = await loadDeveloperIndex();
    const sample = index.companies[0]
      ? await loadDeveloperCompany(index.companies[0].id)
      : null;
    const audit = index.groundTruthAudit || {};
    const contractAudit = index.executionContractAudit || {};
    const sectionCount = index.companies.reduce(
      (total, company) => total + company.sectionCount,
      0
    );
    dataset = {
      ready:
        index.companyCount === index.companies.length &&
        Number(audit.failed || 0) === 0 &&
        Number(contractAudit.contractCount || 0) === 31 &&
        Number(contractAudit.shortSectionCoveragePercent || 0) >= 95 &&
        Number(contractAudit.longSectionCoveragePercent || 0) >= 90 &&
        Object.keys(index.sectionProfiles || {}).length === 31 &&
        Boolean(sample?.sections.length),
      companyCount: index.companyCount,
      sectionCount,
      promptCount: index.promptCount,
      auditPassed: Number(audit.passed || 0),
      auditFailed: Number(audit.failed || 0),
      sampleReadable: Boolean(sample?.sections.length),
      contractVersion: String(contractAudit.version || ""),
      contractCount: Number(contractAudit.contractCount || 0),
      shortSectionCoveragePercent: Number(contractAudit.shortSectionCoveragePercent || 0),
      longSectionCoveragePercent: Number(contractAudit.longSectionCoveragePercent || 0),
      structureProfileCount: Object.keys(index.sectionProfiles || {}).length,
    };
  } catch (error) {
    dataset = {
      ready: false,
      error: error instanceof Error ? error.message : "Developer dataset unavailable.",
    };
  }

  const promptSnapshot = await loadPromptOverrides();
  const promptSync: DeveloperToolsHealth["promptSync"] = {
    ready:
      promptSnapshot.sync.configured &&
      promptSnapshot.sync.source === "github" &&
      !promptSnapshot.sync.error,
    configured: promptSnapshot.sync.configured,
    source: promptSnapshot.sync.source,
    repository: promptSnapshot.sync.repository,
    branch: promptSnapshot.sync.branch,
    path: promptSnapshot.sync.path,
    ...(promptSnapshot.sync.error ? { error: promptSnapshot.sync.error } : {}),
  };

  const health: DeveloperToolsHealth = {
    ok: dataset.ready && promptSync.ready,
    checkedAt,
    dataset,
    promptSync,
    rca: { configuredProviders },
  };
  return NextResponse.json(health, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
