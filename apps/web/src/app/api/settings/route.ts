import { NextResponse } from "next/server";
import {
  readSettings,
  writeSettings,
  maskSettingsForClient,
  type AppSettings,
} from "@/lib/app-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const s = await readSettings();
    return NextResponse.json(maskSettingsForClient(s));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<AppSettings>;
    const patch: Partial<AppSettings> = {};
    if (body.llmProvider === "qwen_local" || body.llmProvider === "openai") {
      patch.llmProvider = body.llmProvider;
    }
    if (typeof body.openaiBaseUrl === "string") {
      patch.openaiBaseUrl = body.openaiBaseUrl.trim() || undefined;
    }
    if (typeof body.openaiModel === "string") {
      patch.openaiModel = body.openaiModel.trim() || undefined;
    }
    if (typeof body.qwenModel === "string") {
      patch.qwenModel = body.qwenModel.trim() || undefined;
    }
    if (typeof body.useCpu === "boolean") {
      patch.useCpu = body.useCpu;
    }
    if (typeof body.cudaDevice === "string") {
      patch.cudaDevice = body.cudaDevice.trim();
    }
    if (typeof body.openaiApiKey === "string") {
      const k = body.openaiApiKey.trim();
      // Ignore masked placeholder from client
      if (k && !k.startsWith("••")) {
        patch.openaiApiKey = k;
      }
    }

    const next = await writeSettings(patch);
    return NextResponse.json(maskSettingsForClient(next));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
