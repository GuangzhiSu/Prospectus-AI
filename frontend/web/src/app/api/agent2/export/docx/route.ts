// GET /api/agent2/export/docx - Export all_sections.md to Word (.docx)
// Uses docx npm package - no Python spawn, fast in-process export
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import {
  Document,
  Paragraph,
  TextRun,
  PageBreak,
  Packer,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import { getProspectusRoot, workspacePaths } from "@/lib/prospectus-root";
import { stripVerificationNotes } from "@/lib/draft-cleaning";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text.slice(i, i + 2) === "**") {
      const end = text.indexOf("**", i + 2);
      if (end >= 0) {
        runs.push(new TextRun({ text: text.slice(i + 2, end), bold: true }));
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end >= 0) {
        runs.push(new TextRun({ text: text.slice(i + 1, end), italics: true }));
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "\n") {
      runs.push(new TextRun({ text: " " }));
      i++;
      continue;
    }
    let j = i;
    while (j < n && text[j] !== "*" && text[j] !== "\n") j++;
    if (j > i) {
      runs.push(new TextRun({ text: text.slice(i, j) }));
      i = j;
      continue;
    }
    runs.push(new TextRun({ text: text[i] }));
    i++;
  }
  return runs;
}

type DocxChild = Paragraph | Table;

function isMarkdownTableLine(line: string): boolean {
  const s = line.trim();
  return s.startsWith("|") && s.endsWith("|") && s.includes("|");
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function markdownTableToDocx(lines: string[]): Table {
  const rows = lines
    .filter((line) => !isMarkdownTableSeparator(line))
    .map((line, rowIndex) => {
      const cells = tableCells(line);
      return new TableRow({
        children: cells.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: parseInlineFormatting(cell),
                  spacing: { after: 80 },
                }),
              ],
              margins: {
                top: 80,
                bottom: 80,
                left: 100,
                right: 100,
              },
              shading: rowIndex === 0 ? { fill: "F2F4F7" } : undefined,
            })
        ),
      });
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "AAB2BD" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "AAB2BD" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "AAB2BD" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "AAB2BD" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "D3DAE3" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "D3DAE3" },
    },
    rows,
  });
}

function paragraphFromText(text: string, opts: { bullet?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: parseInlineFormatting(text),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 276 },
    bullet: opts.bullet ? { level: 0 } : undefined,
  });
}

function markdownToDocxChildren(md: string): DocxChild[] {
  const paragraphs: DocxChild[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isMarkdownTableLine(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isMarkdownTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) paragraphs.push(markdownTableToDocx(tableLines));
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(4).trim(),
          heading: HeadingLevel.HEADING_2,
        })
      );
      i++;
    } else if (line.startsWith("#### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(5).trim(),
          heading: HeadingLevel.HEADING_3,
        })
      );
      i++;
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_1,
        })
      );
      i++;
    } else if (/^\s*[-*]\s+/.test(line)) {
      paragraphs.push(paragraphFromText(line.replace(/^\s*[-*]\s+/, ""), { bullet: true }));
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      const parts: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !lines[i].startsWith("#") &&
        !isMarkdownTableLine(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i])
      ) {
        parts.push(lines[i]);
        i++;
      }
      if (parts.length > 0) {
        const paraText = parts.join("\n");
        if (paraText.trim()) paragraphs.push(paragraphFromText(paraText));
      }
    }
  }
  return paragraphs;
}

export async function GET() {
  try {
    const root = getProspectusRoot();
    const draftPath = path.join(workspacePaths(root).agent2Output, "all_sections.md");

    let content: string;
    try {
      content = await fs.readFile(draftPath, "utf8");
    } catch {
      return NextResponse.json(
        { error: "No draft found. Run Agent2 to generate sections first." },
        { status: 404 }
      );
    }

    if (
      !content ||
      content.includes("(Your generated prospectus will appear here.)")
    ) {
      return NextResponse.json(
        { error: "Draft is empty. Generate sections first." },
        { status: 404 }
      );
    }

    content = stripVerificationNotes(content);

    const children: DocxChild[] = [];

    children.push(
      new Paragraph({
        text: "PROSPECTUS DRAFT",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );

    const blocks = content.split(/\n## /);
    for (let idx = 1; idx < blocks.length; idx++) {
      const block = blocks[idx];
      const firstLineEnd = block.indexOf("\n");
      const firstLine =
        firstLineEnd >= 0 ? block.slice(0, firstLineEnd).trim() : block.trim();
      const sectionBody =
        firstLineEnd >= 0 ? block.slice(firstLineEnd + 1).trim() : "";
      const sectionTitle = firstLine.replace(/^Section [^:]+: /, "").trim();

      if (!sectionTitle && !sectionBody) continue;

      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(
        new Paragraph({
          text: sectionTitle,
          heading: HeadingLevel.HEADING_1,
        })
      );
      children.push(...markdownToDocxChildren(sectionBody));
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 21,
            },
            paragraph: {
              spacing: { after: 120, line: 276 },
            },
          },
        },
        paragraphStyles: [
          {
            id: "Title",
            name: "Title",
            basedOn: "Normal",
            next: "Normal",
            run: { font: "Times New Roman", size: 28, bold: true },
            paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            basedOn: "Normal",
            next: "Normal",
            run: { font: "Times New Roman", size: 24, bold: true },
            paragraph: { spacing: { before: 220, after: 160 } },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            basedOn: "Normal",
            next: "Normal",
            run: { font: "Times New Roman", size: 22, bold: true },
            paragraph: { spacing: { before: 180, after: 120 } },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            basedOn: "Normal",
            next: "Normal",
            run: { font: "Times New Roman", size: 21, bold: true, italics: true },
            paragraph: { spacing: { before: 140, after: 100 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.85),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(0.85),
              },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `prospectus-draft-${new Date().toISOString().slice(0, 10)}.docx`;
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
