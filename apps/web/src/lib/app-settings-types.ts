/**
 * Client-safe settings types and validation (no Node fs/path).
 */

import type { LlmProviderId } from "@/lib/llm-provider-config";

export type LlmProvider = LlmProviderId;

export type AppSettings = {
  llmProvider: LlmProvider;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  openaiModel?: string;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  dashscopeApiKey?: string;
  dashscopeBaseUrl?: string;
  dashscopeModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  qwenModel?: string;
  useCpu?: boolean;
  cudaDevice?: string;
};

export type MaskedAppSettings = AppSettings & {
  openaiApiKeySet: boolean;
  deepseekApiKeySet: boolean;
  dashscopeApiKeySet: boolean;
  anthropicApiKeySet: boolean;
};

/** Reject pasted HTTP/API error bodies saved as “keys”. */
export function validateApiKeyInput(
  key: string,
  fieldLabel = "API key"
): string | null {
  const k = key.trim();
  if (!k || k.startsWith("••")) return null;
  if (/^40[0-9]\s/.test(k)) {
    return `${fieldLabel} looks like an HTTP error message, not a key. Paste the key from your provider console (usually starts with sk-).`;
  }
  if (/incorrect api key/i.test(k) || /apikey-error/i.test(k)) {
    return `${fieldLabel} looks like an API error response. Use the key from the console, not the error text.`;
  }
  if (/help\.aliyun\.com/i.test(k) && k.length > 60) {
    return `${fieldLabel} contains a help URL — likely pasted error text, not a key.`;
  }
  if (k.length < 8) {
    return `${fieldLabel} is too short to be valid.`;
  }
  return null;
}
