import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperIndex, loadDeveloperPrompts, loadDeveloperSection } from "@/lib/developer-data";
import { callDeveloperModel, parseModelJson, sampledText } from "@/lib/developer-llm";
import { cleanAnnotatedDraft, crossSectionConsistencyScore, evaluateDraft, mergeEvidenceUnits, promptSha } from "@/lib/prospectus-evaluation";
import type {
  ModelConfig,
  ModelProviderId,
  RcaAttribution,
  RcaCaseResult,
  RcaDiagnosis,
} from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function score(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
    : [];
}

async function runLegacyModelJudge({
  model,
  cleanDraft,
  referenceText,
  deterministicSummary,
}: {
  model: ModelConfig;
  cleanDraft: string;
  referenceText: string;
  deterministicSummary: unknown;
}): Promise<RcaDiagnosis> {
  const response = await callDeveloperModel(
    model,
    [
      {
        role: "system",
        content:
          "You are an optional legacy qualitative evaluator. Compare the generated prospectus working draft with the filed reference for structure, factual completeness and filing tone. Do not override deterministic metrics and do not suggest auto-editing any prompt. Return JSON only with keys primaryAttribution, confidence, summary, evidence, dataGaps, promptGaps, modelLimitations, recommendedAction, dimensions. dimensions contains completeness, factuality, structure, style scores from 0 to 100. primaryAttribution must be data_incomplete, prompt_or_workflow, model_limitation or none. Do not include chain-of-thought.",
      },
      {
        role: "user",
        content:
          `DETERMINISTIC RESULT\n${JSON.stringify(deterministicSummary)}\n\n` +
          `GENERATED DRAFT\n${sampledText(cleanDraft, 24_000)}\n\n` +
          `FILED REFERENCE (evaluation only)\n${sampledText(referenceText, 24_000)}`,
      },
    ],
    1800
  );
  const raw = parseModelJson<Record<string, unknown>>(response.text);
  const allowed = new Set<RcaAttribution>([
    "data_incomplete",
    "prompt_or_workflow",
    "model_limitation",
    "none",
  ]);
  const primary = String(raw.primaryAttribution || "none") as RcaAttribution;
  const dimensions = (raw.dimensions || {}) as Record<string, unknown>;
  return {
    primaryAttribution: allowed.has(primary) ? primary : "none",
    confidence: score(raw.confidence),
    summary: String(raw.summary || "Legacy model judge returned no summary.").slice(0, 2000),
    evidence: stringList(raw.evidence),
    dataGaps: stringList(raw.dataGaps),
    promptGaps: stringList(raw.promptGaps),
    modelLimitations: stringList(raw.modelLimitations),
    recommendedAction: String(raw.recommendedAction || "Manual review required.").slice(0, 2000),
    dimensions: {
      completeness: score(dimensions.completeness),
      factuality: score(dimensions.factuality),
      structure: score(dimensions.structure),
      style: score(dimensions.style),
    },
  };
}

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      companyId?: string;
      sectionId?: string;
      prompt?: string;
      contractSourceHash?: string;
      unitDrafts?: Array<{ unitId?: string; annotatedDraft?: string; cleanDraft?: string }>;
      model?: string;
      provider?: ModelProviderId;
      legacyModelJudge?: boolean;
      judgeModel?: ModelConfig;
    };
    if (!body.companyId || !body.sectionId || !body.prompt || !body.unitDrafts?.length) {
      return NextResponse.json(
        { error: "companyId、sectionId、prompt 和 unitDrafts 均为必填。" },
        { status: 400 }
      );
    }
    const [{ company, section }, prompts, index] = await Promise.all([
      loadDeveloperSection(body.companyId, body.sectionId),
      loadDeveloperPrompts(),
      loadDeveloperIndex(),
    ]);
    const prompt = prompts.find((item) => item.sectionId === section.id);
    const contract = prompt?.executionContract;
    if (!contract) {
      return NextResponse.json({ error: `Section ${section.id} 缺少执行契约。` }, { status: 422 });
    }
    if (body.contractSourceHash && body.contractSourceHash !== contract.sourceHash) {
      return NextResponse.json(
        { error: "执行契约已更新，请重新运行本章节。" },
        { status: 409 }
      );
    }
    const plannedUnits = mergeEvidenceUnits(contract, section.preparedData);
    const ordered = [...body.unitDrafts].sort((left, right) => {
      const a = plannedUnits.find((unit) => unit.unitId === left.unitId)?.order || 0;
      const b = plannedUnits.find((unit) => unit.unitId === right.unitId)?.order || 0;
      return a - b;
    });
    const annotatedDraft = ordered.map((item) => item.annotatedDraft || "").join("\n\n").trim();
    const cleanDraft = ordered
      .map((item) => item.cleanDraft || cleanAnnotatedDraft(item.annotatedDraft || ""))
      .join("\n\n")
      .trim();
    const deterministicEvaluation = evaluateDraft({
      contract,
      prepared: section.preparedData,
      annotatedDraft,
      cleanDraft,
      referenceText: section.referenceText,
      crossSectionConsistency: crossSectionConsistencyScore(cleanDraft, company.sections),
    });
    const provider = body.provider || "deepseek";
    const model = body.model || "unknown";
    let legacyModelJudge: RcaDiagnosis | undefined;
    let legacyModelJudgeError: string | undefined;
    if (body.legacyModelJudge && body.judgeModel) {
      try {
        legacyModelJudge = await runLegacyModelJudge({
          model: body.judgeModel,
          cleanDraft,
          referenceText: section.referenceText,
          deterministicSummary: deterministicEvaluation,
        });
      } catch (judgeError) {
        legacyModelJudgeError =
          judgeError instanceof Error ? judgeError.message : "Legacy model judge failed.";
      }
    }
    const result: RcaCaseResult = {
      generatedOutput: cleanDraft,
      cleanDraft,
      annotatedDraft,
      deterministicEvaluation,
      legacyModelJudge,
      legacyModelJudgeError,
      diagnosis: {
        primaryAttribution: deterministicEvaluation.rootCause,
        confidence: deterministicEvaluation.hardFailures.length ? 100 : 90,
        summary: `确定性评测总分 ${deterministicEvaluation.overallScore}。`,
        evidence: deterministicEvaluation.hardFailures,
        dataGaps: deterministicEvaluation.missingFields,
        promptGaps:
          deterministicEvaluation.rootCause === "prompt_or_workflow"
            ? deterministicEvaluation.missingFacts
            : [],
        modelLimitations:
          deterministicEvaluation.rootCause === "model_limitation"
            ? deterministicEvaluation.hardFailures
            : [],
        recommendedAction:
          deterministicEvaluation.rootCause === "data_incomplete"
            ? "补充缺失的可追溯事实后再生成。"
            : deterministicEvaluation.rootCause === "prompt_or_workflow"
              ? "检查该 section 的 unit contract、证据路由和 Prompt。"
              : deterministicEvaluation.hardFailures.length
                ? "修订违反硬门槛的生成单元。"
                : "确定性门槛通过，继续人工复核。",
        dimensions: {
          completeness: deterministicEvaluation.requiredFactRecall,
          factuality: deterministicEvaluation.numericFidelity.precision,
          structure: deterministicEvaluation.structureCoverage,
          style: deterministicEvaluation.lengthProfile,
        },
      },
      model,
      provider,
      generatedAt: new Date().toISOString(),
      runManifest: {
        contractVersion: contract.version,
        contractSourceHash: contract.sourceHash,
        promptSha: promptSha(body.prompt),
        datasetGeneratedAt: index.generatedAt,
        dataAuditVersion: `ground_truth_audit:${String(index.groundTruthAudit?.passed ?? "unknown")}/${String(index.groundTruthAudit?.documents_audited ?? "unknown")}`,
        structureProfileSource: index.sectionProfiles?.[section.id]?.source,
        model,
        provider,
      },
      contextCoverage: {
        preparedDataCharacters: JSON.stringify(section.preparedData).length,
        preparedDataCharactersUsed: JSON.stringify(section.preparedData).length,
        referenceCharacters: section.referenceText.length,
        referenceCharactersUsed: section.referenceText.length,
      },
    };
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RCA evaluation failed." },
      { status: 500 }
    );
  }
}
