"""Tests for the simplified Agent2 model-call policy."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AI_MODULE = ROOT / "ai-module"
sys.path.insert(0, str(AI_MODULE))

import agent2  # noqa: E402


def _state(section_id: str, *, revision_count: int = 0) -> dict:
    return {
        "section_id": section_id,
        "section_name": section_id,
        "requirements": "Use supported facts and neutral drafting.",
        "retrieval_context": "The Group provides software services.",
        "draft_text": "The Group provides software services.",
        "revision_count": revision_count,
        "max_revision_loops": 1,
    }


def test_clean_low_risk_section_skips_llm_reviewer(monkeypatch):
    calls: list[str] = []
    monkeypatch.delenv("AGENT2_REVIEW_MODE", raising=False)
    monkeypatch.setattr(agent2, "generate_with_llm", lambda *a, **k: calls.append("llm"))

    result = agent2.VerifierAgent(model_name="test")(_state("Summary"))

    assert calls == []
    assert result["llm_review_performed"] is False
    assert result["verifier_passed"] is True


def test_high_risk_section_gets_one_llm_review(monkeypatch):
    calls: list[str] = []
    monkeypatch.delenv("AGENT2_REVIEW_MODE", raising=False)

    def fake_generate(*args, **kwargs):
        calls.append(kwargs.get("role", ""))
        return '{"pass": true, "summary": "Supported.", "issues": [], "revision_instructions": []}'

    monkeypatch.setattr(agent2, "generate_with_llm", fake_generate)
    result = agent2.VerifierAgent(model_name="test")(_state("RiskFactors"))

    assert calls == ["verifier"]
    assert result["llm_review_performed"] is True


def test_detected_issue_triggers_review_even_for_low_risk_section(monkeypatch):
    calls: list[str] = []
    monkeypatch.delenv("AGENT2_REVIEW_MODE", raising=False)

    def fake_generate(*args, **kwargs):
        calls.append(kwargs.get("role", ""))
        return '{"pass": true, "summary": "Reviewed.", "issues": [], "revision_instructions": []}'

    monkeypatch.setattr(agent2, "generate_with_llm", fake_generate)
    state = _state("Summary")
    state["draft_text"] = "The Group provides world-class software services."
    result = agent2.VerifierAgent(model_name="test")(state)

    assert calls == ["verifier"]
    assert result["mechanical_verification_issues"]


def test_post_revision_check_never_calls_llm_reviewer(monkeypatch):
    calls: list[str] = []
    monkeypatch.delenv("AGENT2_REVIEW_MODE", raising=False)
    monkeypatch.setattr(agent2, "generate_with_llm", lambda *a, **k: calls.append("llm"))

    result = agent2.VerifierAgent(model_name="test")(
        _state("RiskFactors", revision_count=1)
    )

    assert calls == []
    assert result["llm_review_performed"] is False


def test_planner_is_opt_in_and_limited_to_complex_sections(tmp_path, monkeypatch):
    (tmp_path / "text_chunks.jsonl").write_text("", encoding="utf-8")
    monkeypatch.delenv("AGENT2_ENABLE_PLANNER", raising=False)
    assert agent2._planner_enabled("Business", tmp_path) is False

    monkeypatch.setenv("AGENT2_ENABLE_PLANNER", "1")
    assert agent2._planner_enabled("Business", tmp_path) is True
    assert agent2._planner_enabled("Cover", tmp_path) is False

    monkeypatch.setenv("AGENT2_ENABLE_PLANNER", "all")
    assert agent2._planner_enabled("Cover", tmp_path) is True


def test_default_state_uses_single_spec_outline_and_caps_revision(tmp_path):
    requirements = agent2._build_requirements_map()
    state = agent2._build_section_state(
        section_id="Business",
        requirements_map=requirements,
        rag_dir=tmp_path,
        output_dir=tmp_path / "out",
        max_context_chars=1000,
        model_name="test",
        max_revision_loops=4,
    )

    assert "MANDATORY STRUCTURE" in state["requirements"]
    assert not state.get("planner_outline")
    assert state["max_revision_loops"] == 1
