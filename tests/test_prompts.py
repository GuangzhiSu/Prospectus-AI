"""Tests for the unified prompts package."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
AI_MODULE = ROOT / "ai-module"
sys.path.insert(0, str(AI_MODULE))

from prompts.composer import (  # noqa: E402
    augment_requirements,
    build_prompt,
    compose_writer_prompt,
)
from prompts.loader import load_template
from prompts.paths import resolve_requirements_path


def test_resolve_requirements_path_prefers_canonical():
    path = resolve_requirements_path()
    assert path.name == "requirements.json"
    assert "prompts" in path.parts
    assert path.is_file()


def test_load_template_substitutes_keys():
    text = load_template(
        "agent1_table_summary",
        filename="demo.xlsx",
        sheet_name="Sheet1",
        text_sample="revenue 100",
    )
    assert "demo.xlsx" in text
    assert "Sheet1" in text
    assert "revenue 100" in text
    assert "{{filename}}" not in text


def test_compose_writer_prompt_includes_slots_once():
    prompt = compose_writer_prompt(
        section_id="Summary",
        section_name="Summary",
        requirements="Draft a balanced summary.",
        context="Revenue was HKD 1m in 2024.",
    )
    assert "Summary" in prompt
    assert "Draft a balanced summary." in prompt
    assert "Revenue was HKD 1m" in prompt
    assert "CRITICAL FORMAT REQUIREMENTS" in prompt
    assert prompt.count("CRITICAL FORMAT REQUIREMENTS") == 1
    assert "UNIFIED MACHINE-PARSEABLE AI TAGS" in prompt


def test_build_prompt_positional_wrapper():
    prompt = build_prompt(
        "Summary",
        "Summary",
        "Write summary.",
        "Context line.",
    )
    assert "Write summary." in prompt
    assert "Context line." in prompt


def test_augment_requirements_injects_generation_rules():
    text = augment_requirements(
        "RiskFactors",
        "Base risk requirements.",
        issuer_metadata_path=None,
        reqs=None,
    )
    assert "Base risk requirements." in text
    assert "SECTION GENERATION RULES" in text
    assert "mitigation language" in text.lower()


def test_export_legacy_section_prompts_matches_sections():
    script = ROOT / "scripts" / "export_legacy_section_prompts.py"
    proc = subprocess.run(
        [sys.executable, str(script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    summary = json.loads(proc.stdout)
    assert summary["sections"] >= 24

    web_json = ROOT / "frontend" / "web" / "prospectus_section_prompts.json"
    data = json.loads(web_json.read_text(encoding="utf-8"))
    sections = data.get("sections") or []
    assert len(sections) == summary["sections"]
    assert sections[0].get("section")
    assert sections[0].get("content")

    system_path = ROOT / "frontend" / "web" / "prompts" / "legacy_writer_system.txt"
    assert system_path.is_file()
    system_text = system_path.read_text(encoding="utf-8")
    assert "sponsor-counsel" in system_text.lower()
