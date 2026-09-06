import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { diagnosticFixtures, traceDiagnostic } from "@/lib/developer-diagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  return NextResponse.json({ fixtures: diagnosticFixtures() });
}

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      issuer?: Record<string, unknown>;
      profile?: Record<string, unknown>;
      marketKey?: string;
      rulesetNames?: string[];
      fixture?: string;
    };
    const result = await traceDiagnostic({
      issuer: body.issuer,
      profile: body.profile,
      marketKey: body.marketKey,
      rulesetNames: Array.isArray(body.rulesetNames) ? body.rulesetNames : undefined,
      fixture: body.fixture,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnostic trace failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
