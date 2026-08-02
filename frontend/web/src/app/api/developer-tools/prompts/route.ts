import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperPrompts } from "@/lib/developer-data";
import {
  loadPromptOverrides,
  removePromptOverride,
  savePromptOverride,
} from "@/lib/developer-prompt-sync";
import type { DeveloperPromptOverride } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const [prompts, snapshot] = await Promise.all([
      loadDeveloperPrompts(),
      loadPromptOverrides(),
    ]);
    return NextResponse.json({
      prompts,
      overrides: snapshot.overrides,
      sync: snapshot.sync,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompts unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function knownPromptId(id: string): Promise<boolean> {
  const prompts = await loadDeveloperPrompts();
  return prompts.some((prompt) => prompt.id === id);
}

function mutationError(error: unknown) {
  const message = error instanceof Error ? error.message : "Prompt sync failed.";
  const status = message.includes("not configured") ? 503 : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function PUT(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as {
      id?: unknown;
      requirements?: unknown;
      source?: unknown;
    };
    if (typeof body.id !== "string" || !(await knownPromptId(body.id))) {
      return NextResponse.json({ error: "Unknown prompt id." }, { status: 404 });
    }
    if (typeof body.requirements !== "string") {
      return NextResponse.json({ error: "Section requirements are required." }, { status: 400 });
    }
    const source: DeveloperPromptOverride["source"] =
      body.source === "rca" ? "rca" : "manual";
    return NextResponse.json(
      await savePromptOverride(body.id, body.requirements, source),
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { id?: unknown };
    if (typeof body.id !== "string" || !(await knownPromptId(body.id))) {
      return NextResponse.json({ error: "Unknown prompt id." }, { status: 404 });
    }
    return NextResponse.json(await removePromptOverride(body.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return mutationError(error);
  }
}
