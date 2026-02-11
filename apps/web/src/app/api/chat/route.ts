// app/api/chat/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import {
  answerWithRag,
  answerWithoutRag,
  generateSectionDraft,
  indexDocumentFromBuffer,
  loadAllChunks,
  retrieveTopChunks,
} from "@/lib/rag";

export const runtime = "nodejs";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  attachments?: { name: string; size: number; type: string }[];
};

const ALLOWED_EXT = [".pdf", ".docx"];
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function isAllowedFile(name: string, type: string) {
  const lower = name.toLowerCase();
  const extOk = ALLOWED_EXT.some((ext) => lower.endsWith(ext));
  const mimeOk = type ? ALLOWED_MIME.has(type) : false;
  // accept if either matches (some browsers give empty MIME)
  return extOk || mimeOk;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

function makeStoredName(originalName: string) {
  const safe = sanitizeFilename(originalName);
  return `${Date.now()}_${crypto.randomUUID()}__${safe}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const messagesRaw = form.get("messages");
    const files = form.getAll("files") as File[];

    const messages: Message[] = messagesRaw ? JSON.parse(String(messagesRaw)) : [];

    // Ensure uploads folder exists
    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const stored_files: Array<{
      storedName: string;
      originalName: string;
      size: number;
      type: string;
    }> = [];
    const indexErrors: string[] = [];
    const storedPaths: string[] = [];
    const provider = process.env.RAG_PROVIDER || "openai";

    for (const f of files) {
      if (f.size > MAX_BYTES) {
        return new NextResponse(
          `File too large: ${f.name}. Max is ${MAX_BYTES} bytes.`,
          { status: 400 }
        );
      }
      const type = f.type || "";
      if (!isAllowedFile(f.name, type)) {
        return new NextResponse(
          `File type not allowed: ${f.name}. Only PDF/DOCX are allowed.`,
          { status: 400 }
        );
      }

      const storedName = makeStoredName(f.name);
      const fullPath = path.join(uploadDir, storedName);
      const body = Buffer.from(await f.arrayBuffer());
      await fs.writeFile(fullPath, body);
      storedPaths.push(fullPath);

      stored_files.push({
        storedName,
        originalName: f.name,
        size: f.size,
        type: type || "application/octet-stream",
      });

      if (provider !== "local") {
        try {
          await indexDocumentFromBuffer({
            buffer: body,
            storedName,
            originalName: f.name,
            mime: type || "",
          });
        } catch (err: any) {
          indexErrors.push(
            `${f.name}: ${err?.message ? String(err.message) : "索引失败"}`
          );
        }
      }
    }

    if (provider === "local" && storedPaths.length) {
      try {
        const res = await fetch("http://127.0.0.1:8000/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: storedPaths }),
        });
        if (!res.ok) {
          const text = await res.text();
          indexErrors.push(`local ingest: ${text}`);
        }
      } catch (err: any) {
        indexErrors.push(
          `local ingest: ${err?.message ? String(err.message) : "failed"}`
        );
      }
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userAsk = lastUser?.content ?? "";

    const trimmedAsk = userAsk.trim();
    let assistant_message = "";
    if (!trimmedAsk || trimmedAsk === "(uploaded files)") {
      assistant_message =
        `✅ 已保存 ${stored_files.length} 个文件，并尝试建立索引。` +
        (stored_files.length
          ? `\n- ${stored_files.map((x) => x.originalName).join("\n- ")}`
          : "\n（未上传文件）") +
        "\n\n请在输入框里提出具体问题。";
    } else {
      const requirementsPath = path.join(
        process.cwd(),
        "prospectus_section_prompts.json"
      );
      const raw = await fs.readFile(requirementsPath, "utf8");
      const parsed = JSON.parse(raw) as {
        sections?: Array<{ section: string; content: string }>;
      };
      const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
      if (sections.length === 0) {
        throw new Error("prospectus_section_prompts.json has no sections.");
      }

      if (provider !== "local") {
        const allChunks = await loadAllChunks();
        if (allChunks.length === 0) {
          assistant_message =
            "当前没有可用的文档索引，请先上传 PDF/DOCX 再生成草稿。";
        } else {
          const progressPath = path.join(process.cwd(), ".progress.json");
          await fs.writeFile(
            progressPath,
            JSON.stringify(
              { status: "running", completed: 0, total: sections.length },
              null,
              2
            )
          );

          const draftParts: string[] = [];
          let completed = 0;
          for (const s of sections) {
            const query = `${s.section}\n${s.content}`;
            const topChunks = await retrieveTopChunks(query, 8);
            const sectionText = await generateSectionDraft(
              s.section,
              s.content,
              topChunks
            );
            draftParts.push(`## ${s.section}\n\n${sectionText}`);
            completed += 1;
            await fs.writeFile(
              progressPath,
              JSON.stringify(
                { status: "running", completed, total: sections.length },
                null,
                2
              )
            );
          }

          const draft_markdown = draftParts.join("\n\n");
          await fs.writeFile(
            progressPath,
            JSON.stringify(
              { status: "done", completed: sections.length, total: sections.length },
              null,
              2
            )
          );
          assistant_message =
            "✅ Draft generated based on uploaded documents and section requirements.";

          if (indexErrors.length) {
            assistant_message +=
              `\n\n⚠️ 有部分文件未能建立索引：\n- ${indexErrors.join("\n- ")}`;
          }

          return NextResponse.json({
            assistant_message,
            draft_markdown,
            stored_files,
          });
        }
      } else {
        const progressPath = path.join(process.cwd(), ".progress.json");
        await fs.writeFile(
          progressPath,
          JSON.stringify(
            { status: "running", completed: 0, total: sections.length },
            null,
            2
          )
        );

        const draftParts: string[] = [];
        let completed = 0;
        for (const s of sections) {
          const sectionText = await generateSectionDraft(s.section, s.content, []);
          draftParts.push(`## ${s.section}\n\n${sectionText}`);
          completed += 1;
          await fs.writeFile(
            progressPath,
            JSON.stringify(
              { status: "running", completed, total: sections.length },
              null,
              2
            )
          );
        }

        const draft_markdown = draftParts.join("\n\n");
        await fs.writeFile(
          progressPath,
          JSON.stringify(
            { status: "done", completed: sections.length, total: sections.length },
            null,
            2
          )
        );
        assistant_message =
          "✅ Draft generated based on uploaded documents and section requirements.";

        if (indexErrors.length) {
          assistant_message +=
            `\n\n⚠️ 有部分文件未能建立索引：\n- ${indexErrors.join("\n- ")}`;
        }

        return NextResponse.json({
          assistant_message,
          draft_markdown,
          stored_files,
        });
      }
    }

    if (indexErrors.length) {
      assistant_message +=
        `\n\n⚠️ 有部分文件未能建立索引：\n- ${indexErrors.join("\n- ")}`;
    }

    return NextResponse.json({
      assistant_message,
      stored_files,
    });
  } catch (err: any) {
    return new NextResponse(err?.message ? String(err.message) : "Server error", {
      status: 500,
    });
  }
}
