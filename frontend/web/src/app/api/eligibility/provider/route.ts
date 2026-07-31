// GET /api/eligibility/provider — current inference backend (same as drafting Settings)
import { NextResponse } from "next/server";
import { readEligibilitySettings } from "@/lib/app-settings";
import { PROVIDER_UI } from "@/lib/llm-provider-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await readEligibilitySettings();
    const id = settings.llmProvider;
    const meta = PROVIDER_UI[id];
    const modelField = meta.modelField;
    const model = modelField
      ? ((settings[modelField] as string | undefined) || meta.defaultModel)
      : meta.defaultModel;

    let hasCredentials = !meta.needsApiKey;
    if (id === "openai") hasCredentials = Boolean(settings.openaiApiKey?.trim());
    if (id === "deepseek") hasCredentials = Boolean(settings.deepseekApiKey?.trim());
    if (id === "qwen_api") hasCredentials = Boolean(settings.dashscopeApiKey?.trim());
    if (id === "anthropic") hasCredentials = Boolean(settings.anthropicApiKey?.trim());

    return NextResponse.json({
      provider: id,
      label: meta.label,
      description: meta.description,
      model,
      needsApiKey: meta.needsApiKey,
      hasCredentials,
      settingsHref: "/diagnostic/settings",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
