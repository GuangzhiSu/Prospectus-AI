import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { callDeveloperModel, parseModelJson, sampledText } from "@/lib/developer-llm";
import type {
  ModelConfig,
  PromptSuggestion,
  RcaDiagnosis,
} from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type SuggestBody = {
  sectionId?: string;
  sectionName?: string;
  prompt?: string;
  requirements?: string;
  diagnoses?: Array<{ companyName: string; diagnosis: RcaDiagnosis }>;
  model?: ModelConfig;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 20)
    : [];
}

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as SuggestBody;
    if (!body.sectionId || !body.sectionName || !body.prompt || !body.requirements || !body.model || !body.diagnoses?.length) {
      return NextResponse.json({ error: "缺少 section、prompt、模型配置或 RCA case。" }, { status: 400 });
    }
    const diagnosisInput = sampledText(JSON.stringify(body.diagnoses, null, 2), 80_000);
    const response = await callDeveloperModel(
      body.model,
      [
        {
          role: "system",
          content:
            "You are improving a reusable section-level prompt for technology-company Hong Kong IPO prospectuses. " +
            "Use the batch RCA evidence to propose exactly ONE conservative revision round. Generalize across issuers; do not add company-specific facts, names, metrics, or phrasing. " +
            "Avoid overfitting and ignore failures attributed only to missing data or model limitations unless a universal prompt guardrail can genuinely help. " +
            "The revised section requirements must explain what the section should contain, its expected format, evidence rules, and useful good/bad drafting examples without duplicating shared system rules. " +
            "The user alone decides whether to adopt the diff. Return JSON only.",
        },
        {
          role: "user",
          content:
            `SECTION\n${body.sectionName} (${body.sectionId})\n\nCURRENT SECTION REQUIREMENTS\n${sampledText(body.requirements, 40_000)}\n\n` +
            `ASSEMBLED PROMPT (read-only context)\n${sampledText(body.prompt, 60_000)}\n\n` +
            `BATCH RCA RESULTS (${body.diagnoses.length} cases)\n${diagnosisInput}\n\n` +
            "Return exactly: {\"summary\":\"Chinese summary\",\"rationale\":\"why this is general, not overfit\",\"additions\":[\"universal addition\"],\"removals\":[\"weak/redundant instruction\"],\"goodExample\":\"short good drafting example\",\"badExample\":\"short bad drafting example\",\"revisedRequirements\":\"complete replacement section requirements only; do not repeat shared system/template rules\",\"caution\":\"limitations and human-review note\"}",
        },
      ],
      8000
    );
    const raw = parseModelJson<Partial<PromptSuggestion>>(response.text);
    const suggestion: PromptSuggestion = {
      summary: typeof raw.summary === "string" ? raw.summary : "本轮没有形成有效摘要。",
      rationale: typeof raw.rationale === "string" ? raw.rationale : "",
      additions: strings(raw.additions),
      removals: strings(raw.removals),
      goodExample: typeof raw.goodExample === "string" ? raw.goodExample : "",
      badExample: typeof raw.badExample === "string" ? raw.badExample : "",
      revisedRequirements:
        typeof raw.revisedRequirements === "string" && raw.revisedRequirements.trim()
          ? raw.revisedRequirements.trim()
          : body.requirements,
      caution: typeof raw.caution === "string" ? raw.caution : "需由用户复核后决定是否采纳。",
      basedOnCaseCount: body.diagnoses.length,
      suggestionRound: 1,
    };
    return NextResponse.json(suggestion, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt suggestion failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
