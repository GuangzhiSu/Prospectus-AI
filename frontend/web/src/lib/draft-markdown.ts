const VERIFICATION_NOTES_BLOCK_RE =
  /\n### Verification Notes\n[\s\S]*?(?=\n## |\s*$)/g;

export function stripVerificationNotes(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const sanitized = markdown
    .replace(VERIFICATION_NOTES_BLOCK_RE, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();

  return sanitized ? `${sanitized}\n` : "";
}
