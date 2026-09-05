import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperIndex, loadDeveloperPrompts, loadDeveloperSection } from "@/lib/developer-data";
import { contractCoverage, mergeEvidenceUnits, promptSha } from "@/lib/prospectus-evaluation";
import type { RcaPlanResponse } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      companyId?: string;
      sectionId?: string;
      prompt?: string;
    };
    if (!body.companyId || !body.sectionId || !body.prompt) {
      return NextResponse.json(
        { error: "companyId、sectionId 和 prompt 均为必填。" },
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
    if (!prompt || !contract) {
      return NextResponse.json({ error: `Section ${section.id} 缺少执行契约。` }, { status: 422 });
    }
    const structureProfile = index.sectionProfiles?.[section.id];
    const baseUnits = mergeEvidenceUnits(contract, section.preparedData);
    const baseTarget = baseUnits.reduce((total, unit) => total + unit.targetCharacters, 0);
    const profileTarget = structureProfile?.lengthCharacters.median || baseTarget;
    const targetScale = baseTarget ? profileTarget / baseTarget : 1;
    const units = baseUnits.map((unit) => ({
      ...unit,
      targetCharacters: Math.max(
        1200,
        Math.min(24_000, Math.round(unit.targetCharacters * targetScale))
      ),
    }));
    const response: RcaPlanResponse = {
      companyId: company.id,
      companyName: company.name,
      sectionId: section.id,
      sectionName: section.title,
      contract,
      units,
      inputCoverage: contractCoverage(contract, section.preparedData),
      promptSha: promptSha(body.prompt),
      structureProfile,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RCA plan failed." },
      { status: 500 }
    );
  }
}
