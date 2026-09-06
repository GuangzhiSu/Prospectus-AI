import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { patchDiagnosticGate } from "@/lib/developer-diagnostic";
import type { DiagnosticGatePatch } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<DiagnosticGatePatch>;
    if (typeof body.sourceFile !== "string" || typeof body.gateId !== "string") {
      return NextResponse.json({ error: "sourceFile and gateId are required." }, { status: 400 });
    }
    const result = await patchDiagnosticGate({
      sourceFile: body.sourceFile,
      gateId: body.gateId,
      evaluated: body.evaluated,
      stubReason: body.stubReason,
      title: body.title,
      ruleRef: body.ruleRef,
      checks: body.checks,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save diagnostic gate.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
