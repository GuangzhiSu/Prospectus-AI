import { NextResponse } from "next/server";
import OpenAI from "openai";
import { readSettings, getProviderTestCredentials } from "@/lib/app-settings";
import { PROVIDER_UI } from "@/lib/llm-provider-config";

export const runtime = "nodejs";

async function testAnthropic(apiKey: string, model: string): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 500) || `Anthropic HTTP ${res.status}`);
  }
}

/**
 * Verifies saved API settings with a minimal request. Does not accept keys in the body.
 */
export async function POST() {
  try {
    const s = await readSettings();
    const creds = getProviderTestCredentials(s);
    if (!creds.ok) {
      return NextResponse.json({ ok: false, error: creds.error }, { status: 400 });
    }

    const label = PROVIDER_UI[s.llmProvider].label;

    if (s.llmProvider === "anthropic") {
      await testAnthropic(creds.apiKey, creds.model);
      return NextResponse.json({
        ok: true,
        message: `${label} — model ${creds.model} responded.`,
      });
    }

    const client = new OpenAI({
      apiKey: creds.apiKey,
      baseURL: creds.baseUrl,
    });
    await client.chat.completions.create({
      model: creds.model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return NextResponse.json({
      ok: true,
      message: `${label} — model ${creds.model} responded.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
