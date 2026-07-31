/** Parse prospectus draft placeholders (AI tags, DATA_MISSING, etc.) for UI bubbles. */

export type PlaceholderKind =
  | "verify"
  | "cite"
  | "xref"
  | "lpd"
  | "locked"
  | "todo"
  | "dd"
  | "missing"
  | "counsel"
  | "info_gap"
  | "other";

export type PlaceholderMeta = {
  id: number;
  raw: string;
  kind: PlaceholderKind;
  shortLabel: string;
  tooltip: string;
};

/** Matches [[AI:...]], **DATA_MISSING**, counsel / info-gap markers. */
export const PLACEHOLDER_RE =
  /\[\[AI:[^\]]+\]\]|\*\*(?:DATA_MISSING|COUNSEL_INPUT_REQUIRED)\*\*|\[COUNSEL_INPUT_REQUIRED\]|\[Information not provided(?: in the documents)?\]/gi;

const AI_TAG_RE = /^\[\[AI:\s*([^|\]]+)(?:\|([^\]]*))?\]\]$/i;

export function parsePlaceholder(raw: string, id: number): PlaceholderMeta {
  const trimmed = raw.trim();

  if (/^\*\*DATA_MISSING\*\*$/i.test(trimmed)) {
    return {
      id,
      raw: trimmed,
      kind: "missing",
      shortLabel: "Missing",
      tooltip: "Required information is not in the source documents.",
    };
  }

  if (
    /^\*\*COUNSEL_INPUT_REQUIRED\*\*$/i.test(trimmed) ||
    /^\[COUNSEL_INPUT_REQUIRED\]$/i.test(trimmed)
  ) {
    return {
      id,
      raw: trimmed,
      kind: "counsel",
      shortLabel: "Counsel",
      tooltip: "Sponsor-counsel input required before filing.",
    };
  }

  if (/^\[Information not provided/i.test(trimmed)) {
    return {
      id,
      raw: trimmed,
      kind: "info_gap",
      shortLabel: "No data",
      tooltip: trimmed,
    };
  }

  const ai = trimmed.match(AI_TAG_RE);
  if (ai) {
    const head = ai[1].trim().toUpperCase().replace(/\s+/g, " ");
    const body = (ai[2] ?? "").trim();

    if (head.startsWith("DD EVIDENCE NEEDED") || head === "DD") {
      const field = body.replace(/^—\s*/, "").trim();
      return {
        id,
        raw: trimmed,
        kind: "dd",
        shortLabel: "DD",
        tooltip: field
          ? `Due diligence evidence needed: ${field}`
          : "Due diligence evidence needed",
      };
    }

    if (head === "VERIFY" || head.startsWith("VERIFY")) {
      return {
        id,
        raw: trimmed,
        kind: "verify",
        shortLabel: "Verify",
        tooltip: body ? `Review required — ${body}` : "Human review required",
      };
    }

    if (head === "CITE") {
      const source = body.match(/source=([^;|]+)/i)?.[1]?.trim();
      return {
        id,
        raw: trimmed,
        kind: "cite",
        shortLabel: "Cite",
        tooltip: source ? `Citation needed — source: ${source}` : "Citation / source traceability",
      };
    }

    if (head === "XREF") {
      const to = body.match(/to=([^;|]+)/i)?.[1]?.trim();
      return {
        id,
        raw: trimmed,
        kind: "xref",
        shortLabel: to ? `→ ${to}` : "Xref",
        tooltip: to ? `Cross-reference to ${to}` : "Cross-reference",
      };
    }

    if (head === "LPD") {
      return {
        id,
        raw: trimmed,
        kind: "lpd",
        shortLabel: "LPD",
        tooltip: body || "Latest practicable date / refresh marker",
      };
    }

    if (head === "LOCKED") {
      return {
        id,
        raw: trimmed,
        kind: "locked",
        shortLabel: "Locked",
        tooltip: "Mandatory regulatory text — do not paraphrase",
      };
    }

    if (head === "TODO") {
      return {
        id,
        raw: trimmed,
        kind: "todo",
        shortLabel: "Todo",
        tooltip: body || "Template / data item pending",
      };
    }

    return {
      id,
      raw: trimmed,
      kind: "other",
      shortLabel: head.slice(0, 8),
      tooltip: body || trimmed,
    };
  }

  return {
    id,
    raw: trimmed,
    kind: "other",
    shortLabel: "Check",
    tooltip: trimmed,
  };
}

const FENCED_CODE_RE = /(```[\s\S]*?```)/g;
const INLINE_CODE_RE = /(`[^`\n]+`)/g;

function transformSegment(text: string, registry: PlaceholderMeta[]): string {
  return text.replace(PLACEHOLDER_RE, (raw) => {
    const id = registry.length;
    registry.push(parsePlaceholder(raw, id));
    const label = registry[id].shortLabel.replace(/\]/g, "\\]");
    return `\u00A0[${label}](#prospectus-ph-${id})`;
  });
}

/** Replace placeholders with markdown links rendered as inline bubbles. */
export function transformPlaceholdersInText(
  text: string,
  registry: PlaceholderMeta[]
): string {
  return text
    .split(INLINE_CODE_RE)
    .map((part, i) => (i % 2 === 1 ? part : transformSegment(part, registry)))
    .join("");
}

/** Transform placeholders in markdown while preserving fenced code blocks. */
export function preprocessProspectusMarkdown(markdown: string): {
  text: string;
  registry: PlaceholderMeta[];
} {
  const registry: PlaceholderMeta[] = [];
  const parts = markdown.split(FENCED_CODE_RE);
  const text = parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return transformPlaceholdersInText(part, registry);
    })
    .join("");
  return { text, registry };
}

export function getPlaceholderByHref(
  registry: PlaceholderMeta[],
  href: string | undefined
): PlaceholderMeta | null {
  if (!href?.startsWith("#prospectus-ph-")) return null;
  const id = Number.parseInt(href.slice("#prospectus-ph-".length), 10);
  if (Number.isNaN(id) || id < 0 || id >= registry.length) return null;
  return registry[id] ?? null;
}
