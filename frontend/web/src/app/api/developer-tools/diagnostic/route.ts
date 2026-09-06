import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDiagnosticCatalog } from "@/lib/developer-diagnostic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const catalog = await loadDiagnosticCatalog();
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IPO Diagnostic catalog unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
