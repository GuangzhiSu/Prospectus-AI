import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { callDeveloperModel } from "@/lib/developer-llm";
import type { ModelConfig } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { model?: ModelConfig };
    if (!body.model?.provider || !body.model.model?.trim()) {
      return NextResponse.json({ error: "缺少模型提供商或模型名称。" }, { status: 400 });
    }
    const result = await callDeveloperModel(
      body.model,
      [
        { role: "system", content: "Reply with exactly OK." },
        { role: "user", content: "RCA connection preflight." },
      ],
      16
    );
    if (!result.text) throw new Error("模型连接成功，但返回了空响应。");
    return NextResponse.json({
      ok: true,
      provider: result.config.provider,
      model: result.config.model,
      message: "模型凭据与端点预检通过。",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RCA 模型预检失败。" },
      { status: 502 }
    );
  }
}
