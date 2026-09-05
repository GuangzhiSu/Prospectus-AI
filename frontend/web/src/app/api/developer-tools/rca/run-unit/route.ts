import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperPrompts, loadDeveloperSection } from "@/lib/developer-data";
import { callDeveloperModel } from "@/lib/developer-llm";
import {
  cleanAnnotatedDraft,
  evidenceForUnit,
  evaluateDraft,
  mergeEvidenceUnits,
} from "@/lib/prospectus-evaluation";
import type { ModelConfig, RcaUnitResult } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      companyId?: string;
      sectionId?: string;
      unitId?: string;
      targetCharacters?: number;
      prompt?: string;
      contractSourceHash?: string;
      model?: ModelConfig;
    };
    if (!body.companyId || !body.sectionId || !body.unitId || !body.prompt || !body.model) {
      return NextResponse.json(
        { error: "companyId、sectionId、unitId、prompt 和 model 均为必填。" },
        { status: 400 }
      );
    }
    if (body.prompt.length > 100_000) {
      return NextResponse.json({ error: "Prompt 超过 100,000 字符限制。" }, { status: 400 });
    }
    const [{ company, section }, prompts] = await Promise.all([
      loadDeveloperSection(body.companyId, body.sectionId),
      loadDeveloperPrompts(),
    ]);
    const prompt = prompts.find((item) => item.sectionId === section.id);
    const contract = prompt?.executionContract;
    if (!contract) {
      return NextResponse.json({ error: `Section ${section.id} 缺少执行契约。` }, { status: 422 });
    }
    if (body.contractSourceHash && body.contractSourceHash !== contract.sourceHash) {
      return NextResponse.json(
        { error: "执行契约已更新，请重新建立 RCA plan。" },
        { status: 409 }
      );
    }
    const contractUnit = mergeEvidenceUnits(contract, section.preparedData).find(
      (item) => item.unitId === body.unitId
    );
    if (!contractUnit) {
      return NextResponse.json({ error: `未知的 section unit: ${body.unitId}` }, { status: 404 });
    }
    const requestedTarget = Number(body.targetCharacters);
    const unit = {
      ...contractUnit,
      targetCharacters: Number.isFinite(requestedTarget)
        ? Math.max(1200, Math.min(24_000, Math.round(requestedTarget)))
        : contractUnit.targetCharacters,
    };
    const evidence = evidenceForUnit(section.preparedData, contract, unit);
    const evidenceRaw = JSON.stringify(evidence, null, 2);
    if (evidenceRaw.length > 90_000) {
      return NextResponse.json(
        { error: "该 evidence unit 超过安全上下文限制，请重新建立分段 plan。" },
        { status: 422 }
      );
    }
    // Contents combines a two-page notice with a long navigation table.  Its
    // annotated form can be materially longer than the clean filing text, so
    // the ordinary character-to-token estimate used for narrative units can
    // truncate the final table rows and leave a partial citation tag.
    const maxTokens = section.id === "Contents"
      ? Math.max(6000, Math.min(8000, Math.ceil(unit.targetCharacters / 2)))
      : Math.max(1200, Math.min(8000, Math.ceil(unit.targetCharacters / 3)));
    const generated = await callDeveloperModel(
      body.model,
      [
        {
          role: "system",
          content:
            body.prompt +
            "\n\nUNIT EXECUTION OVERRIDE\n" +
            `Draft only this unit: ${unit.title}.\n` +
            `Required disclosure: ${unit.instruction}\n` +
            `Target length: up to ${unit.targetCharacters} characters, scaled down when evidence is incomplete.\n` +
            "Do not infer WVR, Chapter 18C, Pre-Commercial status, compliance status, approvals, transaction mechanics or professional conclusions from industry knowledge. " +
            "Do not reproduce a complete reference prospectus. Output one ## heading followed by the unit draft. Preserve evidence tags in this annotated draft. " +
            (section.id === "Contents"
              ? "For Contents, render every structured ordered_contents_entries row exactly once in order, keep its printed page label in the same row, reproduce supplied front-matter notices before the table, and use at most one source citation for the entire table."
              : ""),
        },
        {
          role: "user",
          content:
            `Company: ${company.name}\nSection: ${section.title}\nUnit: ${unit.title}\n\n` +
            "Use only the versioned EvidenceAtom and contract values below. The real filed section is not present in this request.\n\n" +
            `UNIT EVIDENCE\n${evidenceRaw}`,
        },
      ],
      maxTokens
    );
    if (!generated.text) throw new Error("模型返回了空的生成结果。");
    const scopedContract = {
      ...contract,
      fields: contract.fields.filter((field) => unit.requiredFieldIds.includes(field.fieldId)),
      units: [unit],
    };
    const verify = (annotatedDraft: string) => {
      const cleanDraft = cleanAnnotatedDraft(annotatedDraft);
      return {
        cleanDraft,
        evaluation: evaluateDraft({
          contract: scopedContract,
          prepared: evidence,
          annotatedDraft,
          cleanDraft,
        }),
      };
    };
    let checked = verify(generated.text);
    const verificationIssues = [
      ...checked.evaluation.hardFailures,
      ...(checked.evaluation.numericFidelity.recall < 90
        ? [`numeric_recall_${checked.evaluation.numericFidelity.recall}`]
        : []),
      ...(checked.evaluation.requiredFactRecall < 85
        ? [`required_fact_recall_${checked.evaluation.requiredFactRecall}`]
        : []),
      ...(checked.evaluation.structureCoverage < 90
        ? [`structure_coverage_${checked.evaluation.structureCoverage}`]
        : []),
      ...(checked.evaluation.placeholderIntegrity < 100
        ? [`placeholder_integrity_${checked.evaluation.placeholderIntegrity}`]
        : []),
    ];
    let revisionApplied = false;
    let annotatedDraft = generated.text;
    if (verificationIssues.length) {
      const revised = await callDeveloperModel(
        body.model,
        [
          {
            role: "system",
            content:
              body.prompt +
              "\n\nDETERMINISTIC REVISION PASS\n" +
              "Revise the supplied unit exactly once. Remove every unsupported number, date and legal entity; restore missing evidence-backed priority facts and exact units/periods; preserve [●] placeholders only for genuinely missing fields; keep the required unit heading and evidence tags. Do not add any new fact or use the filed reference section.",
          },
          {
            role: "user",
            content:
              `Unit: ${unit.title}\nDeterministic issues: ${verificationIssues.join(", ")}\n` +
              `Unsupported numbers: ${checked.evaluation.unsupportedNumbers.join(", ") || "none"}\n` +
              `Unsupported dates: ${checked.evaluation.unsupportedDates.join(", ") || "none"}\n` +
              `Unsupported entities: ${checked.evaluation.unsupportedEntities.join(", ") || "none"}\n` +
              `Missing priority facts: ${checked.evaluation.missingFacts.slice(0, 20).join(" | ") || "none"}\n\n` +
              `CURRENT ANNOTATED DRAFT\n${generated.text}\n\nUNIT EVIDENCE\n${evidenceRaw}`,
          },
        ],
        maxTokens
      );
      if (!revised.text) throw new Error("模型修订返回了空结果。");
      revisionApplied = true;
      annotatedDraft = revised.text;
      checked = verify(annotatedDraft);
    }
    const verificationRecord = revisionApplied
      ? `[[AI:REVISION|unit=${unit.unitId}|trigger=${verificationIssues.join(",")}]]`
      : `[[AI:VERIFY|unit=${unit.unitId}|status=passed]]`;
    annotatedDraft = `${annotatedDraft.trim()}\n\n${verificationRecord}`;
    const response: RcaUnitResult = {
      unitId: unit.unitId,
      annotatedDraft,
      cleanDraft: checked.cleanDraft,
      deterministicEvaluation: checked.evaluation,
      revisionApplied,
      verificationIssues,
      model: generated.config.model,
      provider: generated.config.provider,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RCA unit generation failed." },
      { status: 502 }
    );
  }
}
