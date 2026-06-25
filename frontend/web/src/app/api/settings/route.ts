import { NextResponse } from "next/server";
import {
  readSettings,
  writeSettings,
  maskSettingsForClient,
  validateApiKeyInput,
  type AppSettings,
} from "@/lib/app-settings";
import { isLlmProviderId } from "@/lib/llm-provider-config";

export const runtime = "nodejs";

const API_KEY_FIELDS: { field: keyof AppSettings; label: string }[] = [
  { field: "openaiApiKey", label: "OpenAI API key" },
  { field: "deepseekApiKey", label: "DeepSeek API key" },
  { field: "dashscopeApiKey", label: "DashScope API key" },
  { field: "anthropicApiKey", label: "Anthropic API key" },
];

function applyApiKeyPatch(
  patch: Partial<AppSettings>,
  body: Partial<AppSettings>,
  field: keyof AppSettings,
  label: string
): string | null {
  const raw = body[field];
  if (typeof raw !== "string") return null;
  const k = raw.trim();
  if (!k || k.startsWith("••")) return null;
  const err = validateApiKeyInput(k, label);
  if (err) return err;
  (patch as Record<string, string>)[field] = k;
  return null;
}

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

    if (typeof body.llmProvider === "string" && isLlmProviderId(body.llmProvider)) {
      patch.llmProvider = body.llmProvider;
    }

    const trimOpt = (v: unknown) =>
      typeof v === "string" ? v.trim() || undefined : undefined;

    if (body.openaiBaseUrl !== undefined) patch.openaiBaseUrl = trimOpt(body.openaiBaseUrl);
    if (body.openaiModel !== undefined) patch.openaiModel = trimOpt(body.openaiModel);
    if (body.deepseekBaseUrl !== undefined) patch.deepseekBaseUrl = trimOpt(body.deepseekBaseUrl);
    if (body.deepseekModel !== undefined) patch.deepseekModel = trimOpt(body.deepseekModel);
    if (body.dashscopeBaseUrl !== undefined) patch.dashscopeBaseUrl = trimOpt(body.dashscopeBaseUrl);
    if (body.dashscopeModel !== undefined) patch.dashscopeModel = trimOpt(body.dashscopeModel);
    if (body.anthropicModel !== undefined) patch.anthropicModel = trimOpt(body.anthropicModel);
    if (body.qwenModel !== undefined) patch.qwenModel = trimOpt(body.qwenModel);

    if (typeof body.useCpu === "boolean") patch.useCpu = body.useCpu;
    if (typeof body.cudaDevice === "string") patch.cudaDevice = body.cudaDevice.trim();

    for (const { field, label } of API_KEY_FIELDS) {
      const keyErr = applyApiKeyPatch(patch, body, field, label);
      if (keyErr) {
        return NextResponse.json({ error: keyErr }, { status: 400 });
      }
    }

    const next = await writeSettings(patch);
    return NextResponse.json(maskSettingsForClient(next));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
