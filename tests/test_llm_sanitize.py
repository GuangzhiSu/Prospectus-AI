"""Tests for strip_model_reasoning."""

from llm_sanitize import still_contains_thinking, strip_model_reasoning


def test_strip_xml_thinking_tag():
    raw = "reasoning here\u003c/thinking\u003e\n\n# SUMMARY\n\nBody text."
    cleaned = strip_model_reasoning(raw)
    assert cleaned.startswith("# SUMMARY")
    assert "Analyze" not in cleaned


def test_strip_thinking_process_block():
    raw = """Thinking Process:

1. **Analyze the Request:**
    Some chain of thought.

# SUMMARY

Overview paragraph."""
    cleaned = strip_model_reasoning(raw)
    assert cleaned.startswith("# SUMMARY")
    assert "Thinking Process" not in cleaned
    assert "Analyze the Request" not in cleaned


def test_thinking_only_returns_empty():
    raw = """Thinking Process:

1. **Analyze the Request:**
    No section heading follows."""
    cleaned = strip_model_reasoning(raw)
    assert cleaned == ""
    assert still_contains_thinking(raw)


def test_plain_prose_unchanged():
    raw = "# Glossary\n\nTerm A — definition."
    cleaned = strip_model_reasoning(raw)
    assert cleaned == raw
