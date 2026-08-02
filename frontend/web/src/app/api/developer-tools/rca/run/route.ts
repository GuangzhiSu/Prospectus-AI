import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperSection } from "@/lib/developer-data";
import { callDeveloperModel, parseModelJson, sampledText } from "@/lib/developer-llm";
import type {
  ModelConfig,
  RcaCaseResult,
  RcaDiagnosis,
} from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RunBody = {
  companyId?: string;
  sectionId?: string;
  prompt?: string;
  model?: ModelConfig;
};

function validDiagnosis(raw: Partial<RcaDiagnosis>): RcaDiagnosis {
  const attribution = ["data_incomplete", "prompt_incomplete", "model_limitation"].includes(
    raw.primaryAttribution || ""
  )
    ? raw.primaryAttribution!
    : "model_limitation";
  const score = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 12) : [];
  return {
    primaryAttribution: attribution,
    confidence: score(raw.confidence),
    summary: typeof raw.summary === "string" ? raw.summary : "模型未提供摘要。",
    evidence: list(raw.evidence),
    dataGaps: list(raw.dataGaps),
    promptGaps: list(raw.promptGaps),
    modelLimitations: list(raw.modelLimitations),
    recommendedAction:
      typeof raw.recommendedAction === "string" ? raw.recommendedAction : "需要人工复核。",
    dimensions: {
      completeness: score(raw.dimensions?.completeness),
      factuality: score(raw.dimensions?.factuality),
      structure: score(raw.dimensions?.structure),
      style: score(raw.dimensions?.style),
    },
  };
}
export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as RunBody;
    if (!body.companyId || !body.sectionId || !body.prompt || !body.model) {
      return NextResponse.json({ error: "companyId、sectionId、prompt 和 model 均为必填。" }, { status: 400 });
    }
    if (body.prompt.length > 100_000) {
      return NextResponse.json({ error: "Prompt 超过 100,000 字符限制。" }, { status: 400 });
    }

    const { company, section } = await loadDeveloperSection(body.companyId, body.sectionId);
    const preparedRaw = JSON.stringify(section.preparedData, null, 2);
    const preparedForModel = sampledText(preparedRaw, 70_000);

    const generated = await callDeveloperModel(
      body.model,
      [
        { role: "system", content: body.prompt },
        {
          role: "user",
          content:
            `Company: ${company.name}\nSection: ${section.title}\n\n` +
            "The following is the complete prepared dataset available to this experiment (or a representative head/middle/tail sample when the payload exceeds the context budget). " +
            "Generate this prospectus section using only these facts. Do not consult or reproduce the reference prospectus.\n\n" +
            `PREPARED DATA\n${preparedForModel}`,
        },
      ],
      7000
    );
    if (!generated.text) throw new Error("模型返回了空的生成结果。");

    const referenceForModel = sampledText(section.referenceText, 70_000);
    const outputForModel = sampledText(generated.text, 45_000);
    const promptForModel = sampledText(body.prompt, 45_000);
    const diagnosisResponse = await callDeveloperModel(
      { ...body.model, model: generated.config.model },
      [
        {
          role: "system",
          content:
            "You are an IPO prospectus RCA evaluator. Compare the generated section against the real filed section, the exact generation prompt, and the prepared input data. " +
            "Identify one PRIMARY root cause only: data_incomplete (needed facts were absent from prepared data), prompt_incomplete (available facts or required form were not elicited by the prompt), or model_limitation (prompt and data were adequate but execution failed). " +
            "Do not blame the prompt for facts absent from data. Do not propose prompt wording here; prompt changes are synthesized once per batch. Return JSON only, no chain-of-thought.",
        },
        {
          role: "user",
          content:
            `COMPANY\n${company.name}\n\nSECTION\n${section.title}\n\n` +
            `CURRENT PROMPT\n${promptForModel}\n\nPREPARED DATA\n${preparedForModel}\n\n` +
            `GENERATED OUTPUT\n${outputForModel}\n\nREAL FILED SECTION\n${referenceForModel}\n\n` +
            "Return exactly this JSON shape: {\"primaryAttribution\":\"data_incomplete|prompt_incomplete|model_limitation\",\"confidence\":0-100,\"summary\":\"concise Chinese summary\",\"evidence\":[\"specific comparison\"],\"dataGaps\":[\"missing fact\"],\"promptGaps\":[\"missing universal instruction\"],\"modelLimitations\":[\"execution failure\"],\"recommendedAction\":\"next action in Chinese\",\"dimensions\":{\"completeness\":0-100,\"factuality\":0-100,\"structure\":0-100,\"style\":0-100}}",
        },
      ],
      2600
    );

    const result: RcaCaseResult = {
      generatedOutput: generated.text,
      diagnosis: validDiagnosis(parseModelJson<Partial<RcaDiagnosis>>(diagnosisResponse.text)),
      model: generated.config.model,
      provider: generated.config.provider,
      generatedAt: new Date().toISOString(),
      contextCoverage: {
        preparedDataCharacters: preparedRaw.length,
        preparedDataCharactersUsed: Math.min(preparedRaw.length, 70_000),
        referenceCharacters: section.referenceText.length,
        referenceCharactersUsed: Math.min(section.referenceText.length, 70_000),
      },
    };
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RCA experiment failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
