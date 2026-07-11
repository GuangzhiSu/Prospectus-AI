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


def test_requirements_have_structured_spec_fields():
    path = resolve_requirements_path()
    data = json.loads(path.read_text(encoding="utf-8"))
    valid_modes = {
        "controlled_template_fill",
        "evidence_based_drafting",
        "legal_checklist_drafting",
        "professional_source_assembly_only",
    }
    valid_groups = {"FrontMatter", "CoreBody", "Offering", "Appendices", "BackMatter"}
    for sid, reqs in data.items():
        assert reqs.get("section_group") in valid_groups, sid
        assert reqs.get("generation_mode") in valid_modes, sid
        assert isinstance(reqs.get("requires_verified_source"), bool), sid
        assert reqs.get("section_function"), sid
        assert reqs.get("fallback_if_missing_data"), sid


def test_structured_spec_compiles_into_prompt():
    path = resolve_requirements_path()
    data = json.loads(path.read_text(encoding="utf-8"))
    reqs = data["Cover"]
    text = augment_requirements("Cover", reqs["requirements"], None, reqs=reqs)
    assert "SECTION DRAFTING SPECIFICATION" in text
    assert "GENERATION MODE: controlled_template_fill" in text
    assert "NEGATIVE RULES" in text
    assert "VALIDATION CHECKLIST" in text
    # Default metadata (all flags false): WVR conditional wording must be filtered out.
    assert "weighted voting rights upon Listing" not in text


def test_conditional_rules_filtered_by_issuer_metadata(tmp_path):
    path = resolve_requirements_path()
    data = json.loads(path.read_text(encoding="utf-8"))
    meta_path = tmp_path / "issuer_metadata.json"
    meta_path.write_text(
        json.dumps({"is_wr": True, "issuer_type": "gaming_IP"}), encoding="utf-8"
    )
    cover = augment_requirements(
        "Cover", data["Cover"]["requirements"], meta_path, reqs=data["Cover"]
    )
    assert "weighted voting rights upon Listing" in cover
    summary = augment_requirements(
        "Summary", data["Summary"]["requirements"], meta_path, reqs=data["Summary"]
    )
    assert "ARPPU" in summary
    assert "model suite and modalities" not in summary


def test_master_instruction_and_source_gating_in_writer_prompt():
    prompt = compose_writer_prompt(
        section_id="Summary",
        section_name="Summary",
        requirements="Draft a balanced summary.",
        context="Revenue was HKD 1m in 2024.",
    )
    assert "MASTER INSTRUCTION" in prompt
    assert "GLOBAL SOURCE GATING RULES" in prompt
    assert "[\u25cf]" in prompt


def test_cross_section_validation():
    sys.path.insert(0, str(AI_MODULE))
    from prospectus_graph.cross_validation import (
        collect_missing_inputs,
        run_cross_section_validation,
        split_sections,
    )

    doc = (
        "## Summary\n\n### Key risks\n"
        "- We may fail to renew our licenses.\n\n"
        "Stock Code: 91234\n\n"
        "## Risk Factors\n\n"
        "We may fail to renew our licenses during the Track Record Period.\n\n"
        "## Share Capital\n\nStock Code: 91234\n\n"
        "## Structure of the Global Offering\n\n"
        "100,000,000 Shares at HK$10.00 to HK$12.00.\n"
        "**DATA_MISSING** clawback thresholds\n"
    )
    result = run_cross_section_validation(doc)
    assert "stock_code_consistent" in result["passed_checks"]
    assert not result["errors"]
    assert result["missing_inputs"]

    mismatched = doc.replace("## Share Capital\n\nStock Code: 91234", "## Share Capital\n\nStock Code: 95678")
    result2 = run_cross_section_validation(mismatched)
    assert any(i["code"] == "stock_code_mismatch" for i in result2["errors"])

    sections = split_sections(doc)
    assert set(sections) >= {"Summary", "RiskFactors", "ShareCapital", "GlobalOfferingStructure"}
    assert collect_missing_inputs(sections)[0]["severity"] == "medium"


def test_issuer_metadata_extended_fields(tmp_path):
    sys.path.insert(0, str(AI_MODULE))
    from prospectus_graph.issuer_metadata import (
        conditional_section_emphasis,
        load_issuer_metadata,
    )

    meta_path = tmp_path / "meta.json"
    meta_path.write_text(
        json.dumps({"issuer_type": "AI_foundation_model", "is_loss_making": True}),
        encoding="utf-8",
    )
    meta = load_issuer_metadata(meta_path)
    assert meta["issuer_type"] == "AI_foundation_model"
    assert meta["is_loss_making"] is True
    emphasis = conditional_section_emphasis(meta)
    assert "foundation model" in emphasis
    assert "sustainability" in emphasis
    # Unknown issuer_type falls back to "other"
    meta_path.write_text(json.dumps({"issuer_type": "bogus"}), encoding="utf-8")
    assert load_issuer_metadata(meta_path)["issuer_type"] == "other"


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
