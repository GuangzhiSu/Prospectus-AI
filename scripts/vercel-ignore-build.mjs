const message = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
const promptOnly = /^chore\(prompts\):/i.test(message.trim());

if (promptOnly) {
  process.stdout.write("Skipping deployment for a runtime Prompt-only commit.\n");
  process.exit(0);
}

process.exit(1);
