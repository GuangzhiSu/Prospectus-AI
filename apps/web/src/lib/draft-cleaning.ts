const VERIFICATION_NOTES_BLOCK_RE =
  /\n### Verification Notes[\s\S]*?(?=\n## [^\n]+|\s*$)/g;

export function stripVerificationNotes(markdown: string): string {
  if (!markdown) return markdown;

  const stripped = markdown
    .replace(VERIFICATION_NOTES_BLOCK_RE, "")
    .replace(/\n{3,}(?=## )/g, "\n\n")
    .trimEnd();

  return stripped ? `${stripped}\n` : stripped;
}
