/** Remove Qwen / model reasoning blocks from draft markdown for display. */

const END_REDACTED = "\u003c/redacted_thinking\u003e";
const END_THINKING = "\u003c/thinking\u003e";
const START_THINK = "\u003cthink";

const THINKING_PROCESS_HEADER_RE = /(?:^|\n)\s*Thinking Process:\s*\n/i;

const ORPHAN_END_TAG_LINE_RE = new RegExp(
  `^\\s*(?:${END_REDACTED.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${END_THINKING.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\s*$`,
  "gim"
);

const PROSE_START_PATTERNS = [
  /^#\s+\S/m,
  /^##\s+(?!Verification Notes\b)/im,
  /^###\s+(?!Verification Notes\b)/im,
  /^\d+\s+[A-Za-z]/m,
  /^##\s+\d+\s+\S/m,
];

const THINKING_ONLY_PREFIX_RE = new RegExp(
  `^\\s*(?:Thinking Process:|\\d+\\.\\s+\\*\\*Analyze\\b|${START_THINK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
  "i"
);

function findFirstProseStart(text: string): number | null {
  let best: number | null = null;
  for (const pattern of PROSE_START_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.index !== undefined && (best === null || match.index < best)) {
      best = match.index;
    }
  }
  return best;
}

export function stillContainsThinking(text: string): boolean {
  if (!text) return false;
  if (THINKING_PROCESS_HEADER_RE.test(text)) return true;
  if (THINKING_ONLY_PREFIX_RE.test(text)) return true;
  const lower = text.toLowerCase();
  return lower.includes(END_REDACTED.toLowerCase()) || lower.includes(END_THINKING.toLowerCase());
}

export function stripModelReasoning(text: string): string {
  if (!text) return "";

  let cleaned = text.replace(/\r\n/g, "\n");
  let lower = cleaned.toLowerCase();

  for (const tag of [END_REDACTED, END_THINKING]) {
    const idx = lower.lastIndexOf(tag.toLowerCase());
    if (idx >= 0) {
      cleaned = cleaned.slice(idx + tag.length);
      lower = cleaned.toLowerCase();
    }
  }

  cleaned = cleaned.replace(ORPHAN_END_TAG_LINE_RE, "");

  const tp = THINKING_PROCESS_HEADER_RE.exec(cleaned);
  if (tp) {
    const after = cleaned.slice(tp.index + tp[0].length);
    const proseAt = findFirstProseStart(after);
    cleaned = proseAt !== null ? after.slice(proseAt) : "";
  } else if (THINKING_ONLY_PREFIX_RE.test(cleaned)) {
    const proseAt = findFirstProseStart(cleaned);
    cleaned = proseAt !== null && proseAt > 0 ? cleaned.slice(proseAt) : "";
  }

  return cleaned.trimStart();
}
