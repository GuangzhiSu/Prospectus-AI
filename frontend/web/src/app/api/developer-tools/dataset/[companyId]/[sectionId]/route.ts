import { NextResponse } from "next/server";

import { hasDeveloperSession } from "@/lib/developer-auth";
import { loadDeveloperSection } from "@/lib/developer-data";
import type { DeveloperSection, DeveloperSectionPage } from "@/lib/developer-tools-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ATOM_PAGE_SIZE = 200;
const MAX_ATOM_PAGE_SIZE = 500;

function integerParam(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compactSection(section: DeveloperSection): DeveloperSection {
  const preparedData = { ...section.preparedData };
  delete preparedData.evidence_atoms;
  if (Array.isArray(preparedData.section_units)) {
    preparedData.section_units = preparedData.section_units.map((rawUnit) => {
      if (!rawUnit || typeof rawUnit !== "object") return rawUnit;
      const unit = { ...(rawUnit as Record<string, unknown>) };
      delete unit.evidenceAtomIds;
      return unit;
    });
  }
  return {
    ...section,
    preparedData,
    subsections: undefined,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ companyId: string; sectionId: string }> }
) {
  if (!(await hasDeveloperSession())) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const { companyId, sectionId } = await context.params;
    const url = new URL(request.url);
    const requestedOffset = Math.max(0, integerParam(url.searchParams.get("atomOffset"), 0));
    const limit = Math.max(
      1,
      Math.min(MAX_ATOM_PAGE_SIZE, integerParam(url.searchParams.get("atomLimit"), DEFAULT_ATOM_PAGE_SIZE))
    );
    const { section } = await loadDeveloperSection(companyId, sectionId);
    const atoms = Array.isArray(section.preparedData.evidence_atoms)
      ? (section.preparedData.evidence_atoms as Array<Record<string, unknown>>)
      : [];
    const offset = Math.min(requestedOffset, Math.max(0, atoms.length - (atoms.length % limit || limit)));
    const response: DeveloperSectionPage = {
      section: compactSection(section),
      evidenceAtoms: atoms.slice(offset, offset + limit),
      evidenceAtomPage: {
        offset,
        limit,
        total: atoms.length,
        hasPrevious: offset > 0,
        hasNext: offset + limit < atoms.length,
      },
    };
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Section dataset unavailable.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
