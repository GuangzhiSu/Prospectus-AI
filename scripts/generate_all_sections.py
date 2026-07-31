#!/usr/bin/env python3
"""Generate all Agent2 sections via configured LLM (Qwen API), retry failures, rebuild draft."""

from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AI_MODULE = ROOT / "ai-module"
for path in (ROOT, AI_MODULE):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from agent2 import (  # noqa: E402
    SECTIONS,
    _rebuild_all_sections,
    _section_body_from_file,
    run_agent2_single,
)
from section_quality import (  # noqa: E402
    analyze_section_quality,
    section_quality_ok,
)


def _workspace_default(name: str) -> str:
    workspace_root = os.environ.get("WORKSPACE_ROOT", "").strip()
    return str(Path(workspace_root) / name) if workspace_root else name


def _load_settings_env() -> None:
    settings_path = Path.home() / ".config" / "ProspectusAI" / "settings.json"
    if not settings_path.is_file():
        print(f"WARNING: settings not found at {settings_path}; using process env.")
        return
    settings = json.loads(settings_path.read_text(encoding="utf-8"))
    provider = settings.get("llmProvider", "qwen_local")
    provider_map = {
        "qwen_api": "qwen_api",
        "openai": "openai",
        "deepseek": "deepseek",
        "anthropic": "anthropic",
        "qwen_local": "qwen_local",
    }
    os.environ["LLM_PROVIDER"] = provider_map.get(provider, "qwen_local")
    if provider == "qwen_api":
        if settings.get("dashscopeApiKey"):
            os.environ["DASHSCOPE_API_KEY"] = settings["dashscopeApiKey"]
        if settings.get("dashscopeBaseUrl"):
            os.environ["DASHSCOPE_BASE_URL"] = settings["dashscopeBaseUrl"]
    if settings.get("dashscopeModel"):
        os.environ["DASHSCOPE_MODEL"] = settings["dashscopeModel"]
    # Plus model is more reliable for long prospectus sections (flash hits content filters).
    os.environ.setdefault("DASHSCOPE_MODEL", "qwen3.5-plus")
    os.environ["DASHSCOPE_MODEL"] = os.environ.get("DASHSCOPE_MODEL") or "qwen3.5-plus"
    if os.environ.get("DASHSCOPE_MODEL", "").endswith("-flash"):
        os.environ["DASHSCOPE_MODEL"] = "qwen3.5-plus"
        print("Using qwen3.5-plus (flash triggers content inspection on long drafts).")
    os.environ.setdefault("QWEN_ENABLE_THINKING", "0")


def _section_file(out_path: Path, section_id: str) -> Path | None:
    for path in out_path.glob("section_*.md"):
        if f"section_{section_id}_" in path.name or path.name.startswith(
            f"section_{section_id}_"
        ):
            return path
    return None


def _section_ok(out_path: Path, section_id: str, rag_path: Path) -> bool:
    if section_id == "Contents":
        return True
    path = _section_file(out_path, section_id)
    if path is None:
        return False
    body = _section_body_from_file(path.read_text(encoding="utf-8"))
    manifest = rag_path / "manifest.json"
    return section_quality_ok(
        body, section_id, manifest_path=manifest if manifest.is_file() else None
    )


def _delete_section(out_path: Path, section_id: str) -> tuple[bytes | None, Path | None]:
    path = _section_file(out_path, section_id)
    if path and path.is_file():
        backup = path.read_bytes()
        path.unlink()
        print(f"Deleted: {path}")
        return backup, path
    return None, None


def _quality_todo(out_path: Path, rag_path: Path) -> list[str]:
    """Sections failing quality checks (GENERATION_GAP only)."""
    manifest = rag_path / "manifest.json"
    mp = manifest if manifest.is_file() else None
    todo: list[str] = []
    for sid, _ in SECTIONS:
        if sid == "Contents":
            continue
        path = _section_file(out_path, sid)
        body = ""
        if path:
            body = _section_body_from_file(path.read_text(encoding="utf-8"))
        rep = analyze_section_quality(body, sid, manifest_path=mp)
        if not rep.ok and rep.gap_kind != "EVIDENCE_GAP":
            todo.append(sid)
    return todo


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate all Agent2 prospectus sections.")
    parser.add_argument("--rag-dir", default=_workspace_default("agent1_output"))
    parser.add_argument("--output-dir", default=_workspace_default("agent2_output"))
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--max-revisions", type=int, default=1)
    parser.add_argument("--force-all", action="store_true", help="Regenerate every section")
    parser.add_argument(
        "--sections",
        nargs="*",
        default=None,
        help="Optional subset of section ids",
    )
    args = parser.parse_args()

    _load_settings_env()
    output_arg = Path(args.output_dir)
    rag_arg = Path(args.rag_dir)
    out_path = (output_arg if output_arg.is_absolute() else ROOT / output_arg).resolve()
    rag_path = (rag_arg if rag_arg.is_absolute() else ROOT / rag_arg).resolve()
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"LLM_PROVIDER={os.environ.get('LLM_PROVIDER')}")
    print(f"RAG dir: {rag_path}")
    print(f"Output dir: {out_path}")

    if args.force_all:
        todo = [sid for sid, _ in SECTIONS if sid != "Contents"]
    elif args.sections:
        todo = list(args.sections)
    else:
        todo = _quality_todo(out_path, rag_path)

    if not todo:
        print("All sections already OK.")
        _rebuild_all_sections(out_path)
        return 0

    print(f"Sections to generate ({len(todo)}): {', '.join(todo)}")

    failed: list[str] = []
    for sid in todo:
        orig_path = _section_file(out_path, sid)
        backup = orig_path.read_bytes() if orig_path else None
        backup_path = orig_path
        for attempt in range(1, args.max_retries + 2):
            print(f"\n=== {sid} (attempt {attempt}) ===")
            _delete_section(out_path, sid)
            try:
                run_agent2_single(
                    sid,
                    rag_dir=str(rag_path),
                    output_dir=str(out_path),
                    max_revision_loops=args.max_revisions,
                    finalize_bundle=False,
                )
            except Exception as exc:
                print(f"ERROR generating {sid}: {exc}")
                traceback.print_exc()
                if backup is not None and backup_path is not None:
                    backup_path.write_bytes(backup)
                    print(f"Restored backup: {backup_path}")
                continue

            if _section_ok(out_path, sid, rag_path):
                print(f"OK: {sid}")
                _rebuild_all_sections(out_path)
                break
            print(f"Still invalid after attempt {attempt} for {sid}")
        else:
            failed.append(sid)

    _rebuild_all_sections(out_path)

    remaining = _quality_todo(out_path, rag_path)
    print("\n=== Summary ===")
    print(f"Generated: {len(todo) - len(failed)}/{len(todo)} requested")
    if remaining:
        print("Still missing or invalid:")
        for sid in remaining:
            print(f"  - {sid}")
        return 1
    print(f"All sections OK. Draft: {out_path / 'all_sections.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
