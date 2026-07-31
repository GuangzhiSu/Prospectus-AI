#!/usr/bin/env python3
"""Strip model thinking from agent2_output markdown and rebuild all_sections.md."""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AI_MODULE = ROOT / "ai-module"
for path in (ROOT, AI_MODULE):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from agent2 import SECTIONS, _rebuild_all_sections, _section_body_from_file  # noqa: E402
from llm_sanitize import still_contains_thinking, strip_model_reasoning  # noqa: E402
from prospectus_graph.output_bundle import strip_verification_notes  # noqa: E402


def _workspace_default(name: str) -> Path:
    workspace_root = os.environ.get("WORKSPACE_ROOT", "").strip()
    return Path(workspace_root) / name if workspace_root else ROOT / name


def _section_id_from_path(path: Path) -> str | None:
    name = path.stem
    for sid, sname in SECTIONS:
        safe = sname.replace(" ", "_").replace("&", "and")
        if f"section_{sid}_{safe}" in name or name.startswith(f"section_{sid}_"):
            return sid
    return None


def _clean_section_file(path: Path, *, dry_run: bool) -> tuple[str | None, str | None]:
    """Return (section_id, warning) after cleaning a section_*.md file."""
    sid = _section_id_from_path(path)
    raw = path.read_text(encoding="utf-8")
    parts = raw.split("\n\n", 1)
    header = parts[0] if len(parts) > 1 else ""
    cleaned = strip_verification_notes(_section_body_from_file(raw))

    warning: str | None = None
    if not cleaned.strip():
        warning = f"{path}: empty after strip (regenerate section)"
    elif still_contains_thinking(cleaned):
        warning = f"{path}: still contains thinking after strip"

    if not dry_run:
        body = cleaned if cleaned else ""
        if header:
            path.write_text(f"{header}\n\n{body}", encoding="utf-8")
        else:
            path.write_text(body, encoding="utf-8")

    return sid, warning


_TOP_LEVEL_SECTION_SPLIT = re.compile(r"\n(?=## Section )")


def _clean_combined_file(path: Path, *, dry_run: bool) -> list[str]:
    """Strip thinking from each top-level ## Section block in a combined markdown file."""
    if not path.is_file():
        return []

    warnings: list[str] = []
    raw = path.read_text(encoding="utf-8")
    blocks = _TOP_LEVEL_SECTION_SPLIT.split(raw)
    if len(blocks) <= 1 and not raw.lstrip().startswith("## Section "):
        cleaned = strip_model_reasoning(raw)
        if not dry_run:
            path.write_text(cleaned, encoding="utf-8")
        if not cleaned.strip():
            warnings.append(f"{path}: empty after strip")
        elif still_contains_thinking(cleaned):
            warnings.append(f"{path}: still contains thinking after strip")
        return warnings

    header = blocks[0].rstrip()
    out_parts = [header, ""]
    for block in blocks[1:]:
        lines = block.split("\n", 1)
        title_line = lines[0].strip()
        body = lines[1].strip() if len(lines) > 1 else ""
        cleaned_body = strip_model_reasoning(body)
        out_parts.append(title_line)
        out_parts.append("")
        out_parts.append(cleaned_body)
        out_parts.append("")
        if not cleaned_body.strip():
            warnings.append(f"{path} [{title_line}]: empty after strip (regenerate section)")
        elif still_contains_thinking(cleaned_body):
            warnings.append(f"{path} [{title_line}]: still contains thinking after strip")

    if not dry_run:
        path.write_text("\n".join(out_parts).rstrip() + "\n", encoding="utf-8")
    return warnings


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Remove Thinking Process / model reasoning from agent2_output files."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=_workspace_default("agent2_output"),
        help="agent2 output directory (default: ./agent2_output, or $WORKSPACE_ROOT/agent2_output)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report warnings only; do not write files",
    )
    parser.add_argument(
        "--no-rebuild",
        action="store_true",
        help="Do not rebuild all_sections.md from section files",
    )
    args = parser.parse_args()

    out_path = args.output_dir.resolve()
    if not out_path.is_dir():
        print(f"ERROR: output directory not found: {out_path}", file=sys.stderr)
        return 1

    warnings: list[str] = []

    section_files = sorted({p.resolve() for p in out_path.glob("section_*.md")})
    section_files.extend(sorted({p.resolve() for p in out_path.glob("**/section_*.md")}))
    seen: set[Path] = set()
    for path in section_files:
        if path in seen:
            continue
        seen.add(path)
        _, warn = _clean_section_file(path, dry_run=args.dry_run)
        if warn:
            warnings.append(warn)

    combined_targets: set[Path] = set()
    for name in ("all_sections.md", "draft_clean.md"):
        combined = out_path / name
        if combined.is_file():
            combined_targets.add(combined.resolve())
        for combined in out_path.glob(f"**/{name}"):
            if combined.is_file():
                combined_targets.add(combined.resolve())

    for combined in sorted(combined_targets):
        warnings.extend(_clean_combined_file(combined, dry_run=args.dry_run))

    if not args.no_rebuild and not args.dry_run:
        _rebuild_all_sections(out_path)

    if warnings:
        print("Warnings (sections may need regeneration):")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("No warnings — all cleaned sections look OK.")

    action = "Would clean" if args.dry_run else "Cleaned"
    print(f"{action} {len(seen)} section file(s) under {out_path}")
    if not args.no_rebuild and not args.dry_run:
        print(f"Rebuilt: {out_path / 'all_sections.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
