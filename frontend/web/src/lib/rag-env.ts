import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request overrides for RAG/chat (from app settings). Falls back to process.env. */
const ragEnvStore = new AsyncLocalStorage<Record<string, string | undefined>>();

export function runWithRagEnv<T>(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  return ragEnvStore.run(overrides, fn);
}

export function ragGetEnv(key: string): string | undefined {
  const o = ragEnvStore.getStore();
  if (o && Object.prototype.hasOwnProperty.call(o, key)) {
    const v = o[key];
    if (v !== undefined) return v;
  }
  return process.env[key];
}

export function effectiveRagProvider(): string {
  return (ragGetEnv("RAG_PROVIDER") || "openai").trim().toLowerCase();
}

export function effectiveLocalLlmUrl(): string {
  return ragGetEnv("LOCAL_LLM_URL") || "http://127.0.0.1:8000";
}
