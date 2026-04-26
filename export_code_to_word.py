#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Export project source code to a Word document with fixed layout:
- A4 paper
- 50 lines per page
- 60 pages total (3000 lines)

Usage:
  python export_code_to_word.py \
    --src /path/to/your/project \
    --out submission_code.docx
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from docx import Document
from docx.enum.text import WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Cm, Pt


DEFAULT_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".swift",
    ".kt",
    ".kts",
    ".scala",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
    ".html",
    ".css",
    ".scss",
    ".json",
    ".yaml",
    ".yml",
    ".md",
}

DEFAULT_EXCLUDE_DIRS = {
    ".git",
    ".idea",
    ".vscode",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".next",
    ".venv",
    "venv",
    "target",
    "coverage",
    ".pytest_cache",
}


@dataclass
class Config:
    src: Path
    out: Path
    lines_per_page: int
    pages: int
    include_exts: set[str]
    exclude_dirs: set[str]
    include_hidden: bool
    add_line_numbers: bool


def parse_args() -> Config:
    parser = argparse.ArgumentParser(description="Export source code to a formatted Word doc.")
    parser.add_argument("--src", required=True, help="Source project directory")
    parser.add_argument("--out", required=True, help="Output .docx path")
    parser.add_argument("--lines-per-page", type=int, default=50, help="Lines per page (default: 50)")
    parser.add_argument("--pages", type=int, default=60, help="Total pages (default: 60)")
    parser.add_argument(
        "--exts",
        default=",".join(sorted(DEFAULT_EXTENSIONS)),
        help="Comma-separated extensions to include, e.g. .py,.js,.ts",
    )
    parser.add_argument(
        "--exclude-dirs",
        default=",".join(sorted(DEFAULT_EXCLUDE_DIRS)),
        help="Comma-separated directory names to exclude",
    )
    parser.add_argument("--include-hidden", action="store_true", help="Include hidden files/dirs")
    parser.add_argument("--line-numbers", action="store_true", help="Prefix each line with line number")
    args = parser.parse_args()

    exts = {
        e.strip().lower() if e.strip().startswith(".") else f".{e.strip().lower()}"
        for e in args.exts.split(",")
        if e.strip()
    }
    exclude_dirs = {d.strip() for d in args.exclude_dirs.split(",") if d.strip()}

    return Config(
        src=Path(args.src).resolve(),
        out=Path(args.out).resolve(),
        lines_per_page=max(1, args.lines_per_page),
        pages=max(1, args.pages),
        include_exts=exts,
        exclude_dirs=exclude_dirs,
        include_hidden=args.include_hidden,
        add_line_numbers=args.line_numbers,
    )


def is_hidden(path: Path) -> bool:
    return any(part.startswith(".") for part in path.parts)


def should_include_file(file_path: Path, cfg: Config) -> bool:
    if not cfg.include_hidden and is_hidden(file_path):
        return False
    return file_path.suffix.lower() in cfg.include_exts


def iter_source_files(root: Path, cfg: Config) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_dir():
            continue
        skip = False
        for parent in path.parents:
            if parent == root.parent:
                break
            if parent.name in cfg.exclude_dirs:
                skip = True
                break
        if skip:
            continue
        if should_include_file(path, cfg):
            yield path


def safe_read_lines(path: Path) -> list[str]:
    for enc in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            text = path.read_text(encoding=enc, errors="strict")
            return text.splitlines()
        except Exception:
            continue
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
        return text.splitlines()
    except Exception:
        return [f"[UNREADABLE FILE] {path}"]


def collect_code_lines(cfg: Config) -> tuple[list[str], list[tuple[str, int]]]:
    lines: list[str] = []
    file_stats: list[tuple[str, int]] = []

    for file_path in iter_source_files(cfg.src, cfg):
        rel = file_path.relative_to(cfg.src).as_posix()
        file_lines = safe_read_lines(file_path)

        lines.append(f"===== FILE: {rel} =====")
        if not file_lines:
            lines.append("")

        for idx, line in enumerate(file_lines, start=1):
            if cfg.add_line_numbers:
                lines.append(f"{idx:05d}: {line}")
            else:
                lines.append(line)

        lines.append("")
        file_stats.append((rel, len(file_lines)))

    return lines, file_stats


def pad_or_trim_to_target(lines: list[str], target_lines: int) -> list[str]:
    if len(lines) >= target_lines:
        return lines[:target_lines]
    padded = list(lines)
    while len(padded) < target_lines:
        padded.append("// filler line to meet required total line count")
    return padded


def setup_document_layout(doc: Document) -> None:
    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.54)
    section.bottom_margin = Cm(2.54)
    section.left_margin = Cm(2.54)
    section.right_margin = Cm(2.54)


def write_lines_to_docx(doc: Document, lines: list[str], lines_per_page: int) -> None:
    style = doc.styles["Normal"]
    style.font.name = "Consolas"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    style.font.size = Pt(9)

    for i, line in enumerate(lines, start=1):
        p = doc.add_paragraph(line)
        p_format = p.paragraph_format
        p_format.space_before = Pt(0)
        p_format.space_after = Pt(0)
        p_format.line_spacing = 1.0

        if i % lines_per_page == 0 and i < len(lines):
            p.add_run().add_break(WD_BREAK.PAGE)


def main() -> None:
    cfg = parse_args()
    if not cfg.src.exists() or not cfg.src.is_dir():
        raise SystemExit(f"[ERROR] Source directory not found: {cfg.src}")

    raw_lines, file_stats = collect_code_lines(cfg)
    target_total_lines = cfg.lines_per_page * cfg.pages
    final_lines = pad_or_trim_to_target(raw_lines, target_total_lines)

    doc = Document()
    setup_document_layout(doc)
    write_lines_to_docx(doc, final_lines, cfg.lines_per_page)
    doc.save(str(cfg.out))

    code_lines_only = sum(n for _, n in file_stats)
    print("Done.")
    print(f"Source dir: {cfg.src}")
    print(f"Output doc: {cfg.out}")
    print(f"Files included: {len(file_stats)}")
    print(f"Original collected lines (with file headers/spacers): {len(raw_lines)}")
    print(f"Code lines only (raw source): {code_lines_only}")
    print(f"Final lines written: {len(final_lines)}")
    print(f"Layout target: {cfg.lines_per_page} lines/page x {cfg.pages} pages = {target_total_lines} lines")


if __name__ == "__main__":
    main()