import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperCompanyArchive } from "@/lib/developer-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyId: string }> }
) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const { companyId } = await context.params;
    const packed = await loadDeveloperCompanyArchive(companyId);
    // Evidence-rich company payloads can exceed Vercel's function response
    // limit after inflation. Preserve the on-disk gzip representation; fetch
    // transparently decodes it before the UI calls response.json().
    return new Response(new Uint8Array(packed), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Encoding": "gzip",
        "Content-Length": String(packed.length),
        "Content-Type": "application/json; charset=utf-8",
        "Vary": "Accept-Encoding",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Company dataset unavailable.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
