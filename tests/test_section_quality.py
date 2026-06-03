"""Tests for section_quality."""

from section_quality import analyze_section_quality, section_quality_ok


def test_exempt_expected_timetable():
    body = "[[AI:TODO|placeholder only]]"
    assert section_quality_ok(body, "ExpectedTimetable")


def test_empty_body_fails():
    assert not section_quality_ok("", "Summary")
    rep = analyze_section_quality("", "Summary")
    assert "empty_body" in rep.fail_reasons


def test_title_only_skeleton_fails():
    body = """# SUMMARY

## 1 Overview

**DATA_MISSING**

## 2 Business

**DATA_MISSING**
"""
    rep = analyze_section_quality(body, "Summary")
    assert not rep.ok
    assert rep.thin_h2_count >= 2


def test_realistic_section_passes():
    para = (
        "This is a supported overview paragraph with more than eighty characters "
        "of actual sponsor-counsel prose for testing purposes in the summary section."
    )
    body = "\n\n".join(
        [f"## {i} Section\n\n{para}" for i in range(1, 16)]
    )
    rep = analyze_section_quality(body, "Summary")
    assert rep.ok
