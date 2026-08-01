import OpenAI from "openai";

import type { ModelConfig, ModelProviderId } from "@/lib/developer-tools-types";

const DEFAULTS: Record<
  ModelProviderId,
  { baseUrl?: string; model: string; apiKeyEnv: string; modelEnv: string; baseUrlEnv?: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_CHAT_MODEL",
    baseUrlEnv: "OPENAI_BASE_URL",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
  },
  qwen_api: {
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    apiKeyEnv: "DASHSCOPE_API_KEY",
    modelEnv: "DASHSCOPE_MODEL",
    baseUrlEnv: "DASHSCOPE_BASE_URL",
  },
  anthropic: {
    model: "claude-sonnet-4-6",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
  },
};

function safeBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("模型 Base URL 无效。");
  }
  const host = parsed.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (parsed.protocol !== "https:" || privateHost) {
    throw new Error("在线 RCA 仅允许公开 HTTPS 模型端点。");
  }
  return parsed.toString().replace(/\/$/, "");
}
export function resolveModelConfig(input: ModelConfig): Required<ModelConfig> {
  const defaults = DEFAULTS[input.provider];
  if (!defaults) throw new Error("不支持的模型提供商。");
  const apiKey = input.apiKey?.trim() || process.env[defaults.apiKeyEnv]?.trim() || "";
  if (!apiKey) throw new Error("请填写模型 API Key，或在服务端配置对应密钥。");
  const model = input.model?.trim() || process.env[defaults.modelEnv]?.trim() || defaults.model;
  const configuredBase = defaults.baseUrlEnv ? process.env[defaults.baseUrlEnv]?.trim() : undefined;
  const baseUrl =
    input.provider === "anthropic"
      ? "https://api.anthropic.com"
      : safeBaseUrl(input.baseUrl?.trim() || configuredBase || defaults.baseUrl || "");
  return { provider: input.provider, apiKey, model, baseUrl };
}

type ModelMessage = { role: "system" | "user"; content: string };

async function callAnthropic(config: Required<ModelConfig>, messages: ModelMessage[], maxTokens: number) {
  const system = messages.find((message) => message.role === "system")?.content || "";
  const user = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      system,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic ${response.status}: ${text.slice(0, 500)}`);
  }
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  return payload.content?.filter((item) => item.type === "text").map((item) => item.text || "").join("\n").trim() || "";
}

export async function callDeveloperModel(
  input: ModelConfig,
  messages: ModelMessage[],
  maxTokens = 6000
): Promise<{ text: string; config: Required<ModelConfig> }> {
  const config = resolveModelConfig(input);
  if (config.provider === "anthropic") {
    return { text: await callAnthropic(config, messages, maxTokens), config };
  }

  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  const tokenField = config.model.startsWith("gpt-5")
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
  const completion = await client.chat.completions.create({
    model: config.model,
    messages,
    ...tokenField,
  });
  return {
    text: completion.choices[0]?.message?.content?.trim() || "",
    config,
  };
}

export function parseModelJson<T>(text: string): T {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(stripped) as T;
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1)) as T;
    throw new Error("模型没有返回有效 JSON。");
  }
}

export function sampledText(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) return text;
  const third = Math.floor(maxCharacters / 3);
  const middleStart = Math.max(0, Math.floor(text.length / 2) - Math.floor(third / 2));
  return [
    text.slice(0, third),
    `\n\n[... 中间省略 ${text.length - maxCharacters} 个字符以适配模型上下文；保留首、中、尾样本 ...]\n\n`,
    text.slice(middleStart, middleStart + third),
    "\n\n[... 尾部样本 ...]\n\n",
    text.slice(-third),
  ].join("");
}
