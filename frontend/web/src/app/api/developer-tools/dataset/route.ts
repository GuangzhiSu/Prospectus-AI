import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperIndex } from "@/lib/developer-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const index = await loadDeveloperIndex();
    return NextResponse.json(index, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dataset unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
