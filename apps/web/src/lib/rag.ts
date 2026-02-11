import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import OpenAI from "openai";
import { createRequire } from "module";
import mammoth from "mammoth";

export type RagChunk = {
  id: string;
  docStoredName: string;
  docName: string;
  text: string;
  embedding: number[];
};

export type RagDocIndex = {
  docStoredName: string;
  docName: string;
  createdAt: string;
  chunks: RagChunk[];
};

export type SectionRequirement = {
  section: string;
  content: string;
};

const RAG_DIR = path.join(process.cwd(), "rag");
const RAW_DIR = path.join(process.cwd(), "rag_raw");
const PROVIDER = process.env.RAG_PROVIDER || "openai";
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8000";

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

const HF_API_URL = "https://router.huggingface.co/hf-inference/models";
const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const HF_CHAT_MODEL =
  process.env.HF_CHAT_MODEL || "HuggingFaceH4/zephyr-7b-beta";

let openaiClient: OpenAI | null = null;
type PdfParseFn = (data: Buffer) => Promise<{ text?: string }>;
let pdfParseFn: PdfParseFn | null = null;

function getPdfParse() {
  if (!pdfParseFn) {
    const require = createRequire(import.meta.url);
    // pdf-parse v1 exports a function.
    // Use the internal entry to avoid debug side-effects in index.js.
    const mod = require("pdf-parse/lib/pdf-parse.js");
    pdfParseFn = (mod?.default || mod) as PdfParseFn;
  }
  if (!pdfParseFn) {
    throw new Error("Failed to load pdf-parse.");
  }
  return pdfParseFn;
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return openaiClient;
}

function normalizeText(input: string) {
  return input
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text: string, maxChars = 1200, overlap = 200) {
  const cleaned = normalizeText(text);
  if (!cleaned) return [];

  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(i + maxChars, cleaned.length);
    const slice = cleaned.slice(i, end).trim();
    if (slice) chunks.push(slice);
    i = end - overlap;
    if (i < 0) i = 0;
    if (end === cleaned.length) break;
  }
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function meanPool(vectors: number[][]) {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const sums = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sums[i] += v[i] || 0;
  }
  return sums.map((x) => x / vectors.length);
}

async function hfRequest(model: string, payload: any) {
  if (!process.env.HF_API_KEY) {
    throw new Error("Missing HF_API_KEY.");
  }
  const res = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HF ${res.status} (${model}): ${text}`);
  }
  return res.json();
}

async function hfEmbedding(text: string) {
  const data = await hfRequest(HF_EMBEDDING_MODEL, { inputs: text });
  if (!Array.isArray(data)) return [];
  if (Array.isArray(data[0]) && typeof data[0][0] === "number") {
    // token embeddings -> mean pool
    return meanPool(data as number[][]);
  }
  if (typeof data[0] === "number") {
    return data as number[];
  }
  return [];
}

async function embedTexts(texts: string[]) {
  if (PROVIDER === "local") {
    const res = await fetch(`${LOCAL_LLM_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: texts }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Local embed ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { embeddings?: number[][] };
    return Array.isArray(data.embeddings) ? data.embeddings : [];
  }

  if (PROVIDER === "hf") {
    const out: number[][] = [];
    for (const t of texts) {
      out.push(await hfEmbedding(t));
    }
    return out;
  }

  const openai = getOpenAI();
  const batchSize = 32;
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    embeddings.push(...res.data.map((d) => d.embedding));
  }
  return embeddings;
}

async function completeChat(opts: {
  system: string;
  user: string;
  temperature: number;
}) {
  if (PROVIDER === "local") {
    const res = await fetch(`${LOCAL_LLM_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: opts.system,
        user: opts.user,
        temperature: opts.temperature,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Local chat ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { text?: string };
    return (data.text || "").trim();
  }

  if (PROVIDER === "hf") {
    const prompt = `${opts.system}\n\nUser: ${opts.user}\n\nAssistant:`;
    const data = await hfRequest(HF_CHAT_MODEL, {
      inputs: prompt,
      parameters: {
        max_new_tokens: 512,
        temperature: opts.temperature,
        return_full_text: true,
      },
    });
    const text =
      Array.isArray(data) && data[0]?.generated_text
        ? data[0].generated_text
        : data?.generated_text || "";
    return text.startsWith(prompt) ? text.slice(prompt.length).trim() : text.trim();
  }

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: opts.temperature,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}

async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string,
  mime: string
) {
  const lower = filename.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const pdfParse = getPdfParse();
    const result = await pdfParse(buffer);
    return result.text || "";
  }
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  return "";
}

async function ensureRagDir() {
  await fs.mkdir(RAG_DIR, { recursive: true });
}

async function ensureRawDir() {
  await fs.mkdir(RAW_DIR, { recursive: true });
}

function safeName(input: string) {
  return input.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function indexDocumentFromBuffer(opts: {
  buffer: Buffer;
  storedName: string;
  originalName: string;
  mime: string;
}) {
  const raw = await extractTextFromBuffer(
    opts.buffer,
    opts.originalName,
    opts.mime
  );
  const chunks = chunkText(raw);
  if (chunks.length === 0) return null;

  const embeddings = await embedTexts(chunks);
  const doc: RagDocIndex = {
    docStoredName: opts.storedName,
    docName: opts.originalName,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((text, idx) => ({
      id: crypto.randomUUID(),
      docStoredName: opts.storedName,
      docName: opts.originalName,
      text,
      embedding: embeddings[idx],
    })),
  };

  await ensureRagDir();
  const filePath = path.join(RAG_DIR, `${opts.storedName}.json`);
  await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
  return doc;
}

export async function loadAllChunks() {
  try {
    await ensureRagDir();
    const names = await fs.readdir(RAG_DIR);
    const jsonFiles = names.filter((n) => n.endsWith(".json"));
    const docs = await Promise.all(
      jsonFiles.map(async (name) => {
        const full = path.join(RAG_DIR, name);
        const raw = await fs.readFile(full, "utf8");
        return JSON.parse(raw) as RagDocIndex;
      })
    );
    return docs.flatMap((d) => d.chunks || []);
  } catch {
    return [];
  }
}

function buildContext(topChunks: RagChunk[]) {
  return topChunks
    .map(
      (c, idx) =>
        `[${idx + 1}] ${c.docName}\n${c.text.replace(/\n{3,}/g, "\n\n")}`
    )
    .join("\n\n");
}

function buildPlainContext(topChunks: RagChunk[]) {
  return topChunks
    .map((c) => c.text.replace(/\n{3,}/g, "\n\n"))
    .join("\n\n");
}

function cleanDraftOutput(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  const cleaned = lines.filter((line) => {
    const lower = line.toLowerCase();
    const hasMarker =
      lower.includes("<system>") ||
      lower.includes("<user>") ||
      lower.includes("<assistant>") ||
      lower.includes("system:") ||
      lower.includes("user:") ||
      lower.includes("assistant:") ||
      lower.includes("section:") ||
      lower.includes("requirements:") ||
      lower.includes("context:");
    if (hasMarker) {
      return false;
    }
    if (
      lower.startsWith("sources:") ||
      lower.startsWith("source:") ||
      line.startsWith("来源：")
    ) {
      return false;
    }
    return true;
  });
  const joined = cleaned.join("\n").trim();
  return joined.replace(/^\[\d+\]\s*/gm, "").trim();
}

function extractBetweenMarkers(
  text: string,
  startMarker: string,
  endMarker: string
) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start + startMarker.length, end).trim();
}

function extractAfterAssistantTag(text: string) {
  const tag = "<|assistant|>";
  const idx = text.lastIndexOf(tag);
  if (idx === -1) return null;
  return text.slice(idx + tag.length).trim();
}

export async function retrieveTopChunks(question: string, topK = 6) {
  const chunks = await loadAllChunks();
  if (chunks.length === 0) return [];

  const [queryEmbedding] = await embedTexts([question]);
  const scored = chunks.map((c) => ({
    chunk: c,
    score: cosineSimilarity(queryEmbedding, c.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

export async function answerWithRag(question: string, topChunks: RagChunk[]) {
  if (topChunks.length === 0) {
    return "目前没有可检索的文档内容，请先上传 PDF/DOCX 并发送问题。";
  }

  const context = buildContext(topChunks);

  const answer = await completeChat({
    system:
      "你是文档问答助手。只能使用提供的上下文回答，若上下文不足以回答问题，请明确说明无法从文档中找到答案，不要编造。",
    user: `问题：${question}\n\n上下文：\n${context}`,
    temperature: 0.2,
  });

  const sources = Array.from(
    new Set(topChunks.map((c) => c.docName))
  ).slice(0, 6);

  if (!answer) return "模型未返回有效回答。";
  const sourcesBlock = sources.length
    ? `\n\n来源：\n${sources.map((s) => `- ${s}`).join("\n")}`
    : "";
  return `${answer}${sourcesBlock}`;
}

export async function answerWithoutRag(question: string) {
  const answer = await completeChat({
    system: "你是通用助手，请使用用户的语言简洁回答。",
    user: question,
    temperature: 0.7,
  });
  return answer || "模型未返回有效回答。";
}

export async function generateSectionDraft(
  sectionTitle: string,
  requirementText: string,
  topChunks: RagChunk[]
) {
  if (PROVIDER === "local") {
    const res = await fetch(`${LOCAL_LLM_URL}/draft_section`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: sectionTitle,
        requirements: requirementText,
        top_k: 6,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Local draft ${res.status}: ${text}`);
    }
    const data = (await res.json()) as { text?: string };
    return (data.text || "").trim() || "TBD: Model returned an empty response.";
  }

  if (topChunks.length === 0) {
    return "TBD: No relevant evidence found in the uploaded documents.";
  }

  const context = buildPlainContext(topChunks);
  const startMarker = "<<<SECTION_START>>>";
  const endMarker = "<<<SECTION_END>>>";
  const answer = await completeChat({
    system:
      "You are drafting a prospectus section. Follow the requirements exactly. " +
      "Use only the provided context. " +
      `Wrap the output between ${startMarker} and ${endMarker}. ` +
      "If the context is insufficient, say so explicitly and keep placeholders concise.",
    user:
      `Section: ${sectionTitle}\n\n` +
      `Requirements:\n${requirementText}\n\n` +
      `Context:\n${context}\n\n` +
      `Return only:\n${startMarker}\n<SECTION_CONTENT>\n${endMarker}`,
    temperature: 0.2,
  });

  try {
    await ensureRawDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${stamp}__${safeName(sectionTitle)}.txt`;
    await fs.writeFile(path.join(RAW_DIR, fileName), answer || "");
  } catch {
    // ignore raw output write errors
  }

  const afterAssistant = extractAfterAssistantTag(answer || "");
  const extracted = extractBetweenMarkers(answer || "", startMarker, endMarker);
  const content = (afterAssistant ?? extracted ?? answer ?? "").trim();
  return content || "TBD: Model returned an empty response.";
}
