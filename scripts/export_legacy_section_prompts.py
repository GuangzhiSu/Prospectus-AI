#!/usr/bin/env python3
"""Export legacy web section prompts and system prompt from SSOT requirements."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_AI_MODULE = _REPO_ROOT / "ai-module"
if str(_AI_MODULE) not in sys.path:
    sys.path.insert(0, str(_AI_MODULE))

from prospectus_graph.config import SECTIONS, load_section_requirements  # noqa: E402
from prompts.composer import compose_legacy_writer_system  # noqa: E402
from prompts.paths import resolve_requirements_path  # noqa: E402


def export_legacy_section_prompts(
    *,
    web_dir: Path,
    requirements_path: Path | None = None,
) -> dict[str, int]:
    req_path = requirements_path or resolve_requirements_path()
    requirements = load_section_requirements(req_path)
    if not requirements:
        raise FileNotFoundError(f"No section requirements loaded from {req_path}")

    sections_out: list[dict[str, str]] = []
    for section_id, display_name in SECTIONS:
        entry = requirements.get(section_id, {})
        content = (entry.get("requirements") or "").strip()
        if not content:
            content = f"Write the {display_name} section for an Exchange prospectus."
        sections_out.append({"section": display_name, "content": content})

    prompts_dir = web_dir / "prompts"
    prompts_dir.mkdir(parents=True, exist_ok=True)

    legacy_json = {
        "document_title": "Guidelines for Writing Prospectus Sections",
        "sections": sections_out,
    }
    json_path = web_dir / "prospectus_section_prompts.json"
    json_path.write_text(
        json.dumps(legacy_json, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    system_path = prompts_dir / "legacy_writer_system.txt"
    system_path.write_text(compose_legacy_writer_system() + "\n", encoding="utf-8")

    return {
        "sections": len(sections_out),
        "requirements_path": str(req_path),
        "json_path": str(json_path),
        "system_path": str(system_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--web-dir",
        type=Path,
        default=_REPO_ROOT / "frontend" / "web",
        help="Next.js web app directory",
    )
    parser.add_argument(
        "--requirements",
        type=Path,
        default=None,
        help="Override requirements JSON path",
    )
    args = parser.parse_args()
    summary = export_legacy_section_prompts(
        web_dir=args.web_dir,
        requirements_path=args.requirements,
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
