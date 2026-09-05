import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperIndex, loadDeveloperPrompts, loadDeveloperSection } from "@/lib/developer-data";
import { callDeveloperModel, sampledText } from "@/lib/developer-llm";
import {
  cleanAnnotatedDraft,
  crossSectionConsistencyScore,
  evaluateDraft,
  evidenceForUnit,
  mergeEvidenceUnits,
  promptSha,
} from "@/lib/prospectus-evaluation";
import type { ModelConfig, RcaCaseResult } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RunBody = {
  companyId?: string;
  sectionId?: string;
  prompt?: string;
  model?: ModelConfig;
};

/** Backward-compatible single-call endpoint for short sections only. */
export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as RunBody;
    if (!body.companyId || !body.sectionId || !body.prompt || !body.model) {
      return NextResponse.json(
        { error: "companyId、sectionId、prompt 和 model 均为必填。" },
        { status: 400 }
      );
    }
    if (body.prompt.length > 100_000) {
      return NextResponse.json({ error: "Prompt 超过 100,000 字符限制。" }, { status: 400 });
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
    const plannedUnits = mergeEvidenceUnits(contract, section.preparedData);
    if (contract.isLongSection || contract.units.length !== 1 || plannedUnits.length !== 1) {
      return NextResponse.json(
        {
          error:
            "该章节必须使用分段 RCA workflow（plan → run-unit → evaluate），旧单次接口已阻止截断生成。",
        },
        { status: 422 }
      );
    }
    const unit = plannedUnits[0];
    const evidence = evidenceForUnit(section.preparedData, contract, unit);
    const evidenceRaw = JSON.stringify(evidence, null, 2);
    const generated = await callDeveloperModel(
      body.model,
      [
        {
          role: "system",
          content:
            body.prompt +
            "\n\nUse only the supplied versioned evidence. Do not infer WVR, Chapter 18C, " +
            "Pre-Commercial status, compliance status, approvals or transaction mechanics.",
        },
        {
          role: "user",
          content:
            `Company: ${company.name}\nSection: ${section.title}\n\n` +
            "The real filed section is not present in this generation request.\n\n" +
            `UNIT EVIDENCE\n${sampledText(evidenceRaw, 90_000)}`,
        },
      ],
      Math.max(1600, Math.min(8000, Math.ceil(unit.targetCharacters / 3)))
    );
    if (!generated.text) throw new Error("模型返回了空的生成结果。");
    const annotatedDraft = generated.text;
    const cleanDraft = cleanAnnotatedDraft(annotatedDraft);
    const deterministicEvaluation = evaluateDraft({
      contract,
      prepared: section.preparedData,
      annotatedDraft,
      cleanDraft,
      referenceText: section.referenceText,
      crossSectionConsistency: crossSectionConsistencyScore(cleanDraft, company.sections),
    });
    const result: RcaCaseResult = {
      generatedOutput: cleanDraft,
      cleanDraft,
      annotatedDraft,
      deterministicEvaluation,
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
        recommendedAction: deterministicEvaluation.hardFailures.length
          ? "先解决硬失败，再进行人工复核。"
          : "确定性门槛通过，继续人工复核。",
        dimensions: {
          completeness: deterministicEvaluation.requiredFactRecall,
          factuality: deterministicEvaluation.numericFidelity.precision,
          structure: deterministicEvaluation.structureCoverage,
          style: deterministicEvaluation.lengthProfile,
        },
      },
      model: generated.config.model,
      provider: generated.config.provider,
      generatedAt: new Date().toISOString(),
      runManifest: {
        contractVersion: contract.version,
        contractSourceHash: contract.sourceHash,
        promptSha: promptSha(body.prompt),
        datasetGeneratedAt: index.generatedAt,
        dataAuditVersion: `ground_truth_audit:${String(index.groundTruthAudit?.passed ?? "unknown")}/${String(index.groundTruthAudit?.documents_audited ?? "unknown")}`,
        structureProfileSource: index.sectionProfiles?.[section.id]?.source,
        model: generated.config.model,
        provider: generated.config.provider,
      },
      contextCoverage: {
        preparedDataCharacters: evidenceRaw.length,
        preparedDataCharactersUsed: Math.min(evidenceRaw.length, 90_000),
        referenceCharacters: section.referenceText.length,
        referenceCharactersUsed: section.referenceText.length,
      },
    };
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RCA experiment failed." },
      { status: 502 }
    );
  }
}
