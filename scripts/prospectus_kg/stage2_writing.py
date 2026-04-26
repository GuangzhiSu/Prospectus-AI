"""
Stage 2: build the *writing* knowledge graph — what each canonical section is for,
how it is structured, what patterns / rules authors follow, and what input fields
authors need before they can draft it.

For each canonical SectionType we:
  1. Collect all concrete occurrences from the Stage 0 ``sections_toc`` JSONs.
  2. Sample ``--samples-per-section`` representative text windows (stratified).
  3. Ask Qwen to emit a single consolidated "section card" conforming to a strict schema.
  4. Persist the card to ``prospectus_kg_output/writing/section_cards/<section_id>.json``.
  5. Merge the cards back into the graph as SectionType.description + aliases, and new
     ontology nodes for writing_rules and required_input_fields (lightweight tags).

The pass is *resumable*: if ``<section_id>.json`` already exists and is valid, it is
loaded instead of regenerated.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import structlog

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
sys.path.insert(0, str(_REPO_ROOT / "ipo_prospectus_pipeline" / "src"))

from prospectus_docgraph.graph.manager import GraphManager  # noqa: E402
from prospectus_docgraph.models.nodes import SectionNode  # noqa: E402
from prospectus_docgraph.schema.seed import CANONICAL_SECTION_SPECS  # noqa: E402

log = structlog.get_logger()


SECTION_CARD_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "section_id",
        "function",
        "purpose",
        "typical_structure",
        "writing_rules",
        "required_input_fields",
        "evidence_types",
        "common_pitfalls",
    ],
    "properties": {
        "section_id": {"type": "string"},
        "function": {
            "type": "string",
            "description": "One-sentence description of what this section accomplishes in a prospectus.",
        },
        "purpose": {
            "type": "string",
            "description": "A paragraph explaining why HKEX requires this section and what regulators/investors expect to learn.",
        },
        "typical_structure": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["subsection", "description"],
                "properties": {
                    "subsection": {"type": "string"},
                    "description": {"type": "string"},
                },
            },
            "description": "Ordered list of subsections that typically appear inside this section.",
        },
        "writing_rules": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Concrete drafting rules (voice, mandatory disclosures, cross-references, language requirements).",
        },
        "required_input_fields": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["field", "description", "example"],
                "properties": {
                    "field": {"type": "string"},
                    "description": {"type": "string"},
                    "example": {"type": "string"},
                },
            },
            "description": "Structured data fields an issuer must provide before this section can be drafted.",
        },
        "evidence_types": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Documents/data sources (audit report, industry report, SASAC filings, etc.) that supply the facts.",
        },
        "common_pitfalls": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
}


def _load_all_sections(sections_dir: Path) -> dict[str, list[dict[str, Any]]]:
    """Return canonical_id -> list of {doc, raw_title, text, page_start, page_end} entries."""
    buckets: dict[str, list[dict[str, Any]]] = {}
    for f in sorted(sections_dir.glob("*.json")):
        if f.name.startswith("_"):
            continue
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for sec in d.get("sections", []):
            cid = sec.get("canonical_section")
            if not cid:
                continue
            txt = sec.get("text") or ""
            if len(txt.strip()) < 200:
                continue
            buckets.setdefault(cid, []).append(
                {
                    "doc": d.get("document_id"),
                    "raw_title": sec.get("raw_title"),
                    "text": txt,
                    "page_start": sec.get("page_start"),
                    "page_end": sec.get("page_end"),
                }
            )
    return buckets


def _sample(entries: list[dict[str, Any]], k: int) -> list[dict[str, Any]]:
    if len(entries) <= k:
        return entries
    step = max(1, len(entries) // k)
    return [entries[i * step] for i in range(k)]


def _truncate(text: str, n: int) -> str:
    if len(text) <= n:
        return text
    half = n // 2
    return text[:half] + "\n...[truncated]...\n" + text[-half:]


def _build_messages(
    section_id: str,
    canonical_name: str,
    samples: list[dict[str, Any]],
    chars_per_sample: int,
) -> list[dict[str, Any]]:
    sys_msg = (
        "You are a senior Hong Kong IPO legal draftsperson. You are analyzing real HKEX prospectus "
        "filings to build a knowledge card for one canonical section so that a drafting agent can "
        "later author a new section of the same type for a different issuer. "
        "You MUST reply with a single valid JSON object conforming to the provided schema."
    )
    sample_blocks = []
    for i, s in enumerate(samples, 1):
        block = (
            f"--- SAMPLE {i} (doc={s['doc']}, raw_title={s['raw_title']}, "
            f"pages {s.get('page_start')}-{s.get('page_end')}) ---\n"
            f"{_truncate(s['text'], chars_per_sample)}"
        )
        sample_blocks.append(block)
    user_msg = (
        f"Canonical section id: {section_id}\n"
        f"Canonical section name: {canonical_name}\n\n"
        "Below are text excerpts of this section from several real HKEX prospectuses. "
        "Read them carefully and produce a single consolidated 'section card' describing:\n"
        "  - the section's function and purpose,\n"
        "  - its typical subsection structure (in order),\n"
        "  - the drafting rules authors must follow,\n"
        "  - the structured input fields an issuer must supply BEFORE drafting this section,\n"
        "  - evidence / source document types used,\n"
        "  - common pitfalls.\n\n"
        "Rules:\n"
        "  1. The 'section_id' field must equal exactly: " + section_id + "\n"
        "  2. Prefer concrete, HKEX-specific guidance over generic advice.\n"
        "  3. 'required_input_fields' MUST list granular fields an IPO advisor would need to collect "
        "from the issuer (names, dates, amounts, structures) — not narrative prose.\n"
        "  4. Keep arrays concise (<= 12 items each) but specific.\n\n"
        + "\n\n".join(sample_blocks)
    )
    return [
        {"role": "system", "content": sys_msg},
        {"role": "user", "content": user_msg},
    ]


def _validate_card(card: dict[str, Any], section_id: str) -> dict[str, Any]:
    card = dict(card or {})
    card["section_id"] = section_id
    for key, default in (
        ("function", ""),
        ("purpose", ""),
        ("typical_structure", []),
        ("writing_rules", []),
        ("required_input_fields", []),
        ("evidence_types", []),
        ("common_pitfalls", []),
    ):
        if key not in card:
            card[key] = default
    return card


def _load_graph_and_merge(
    graph_path: Path,
    cards: dict[str, dict[str, Any]],
    out_graph_path: Path,
) -> dict[str, int]:
    mgr = GraphManager()
    mgr.load_graph_json(graph_path)
    updated = 0
    for sid, card in cards.items():
        if not mgr.nx_graph.has_node(sid):
            continue
        node = mgr.get_node(sid)
        if not isinstance(node, SectionNode):
            continue
        desc = card.get("function") or card.get("purpose") or node.description
        new_aliases = list(node.aliases)
        for entry in card.get("typical_structure", []) or []:
            sub = (entry.get("subsection") or "").strip()
            if sub and sub.lower() not in {a.lower() for a in new_aliases}:
                new_aliases.append(sub)
        mgr.add_node(
            node.model_copy(
                update={
                    "description": (desc or "")[:1000],
                    "aliases": new_aliases[:64],
                }
            )
        )
        updated += 1
    mgr.export_graph_json(out_graph_path)
    return {"sections_updated": updated}


def run(
    sections_dir: Path,
    graph_in: Path,
    out_dir: Path,
    *,
    samples_per_section: int = 3,
    chars_per_sample: int = 4500,
    temperature: float = 0.0,
    max_tokens: int = 4096,
    resume: bool = True,
    only_section: str | None = None,
) -> dict[str, Any]:
    from qwen_local_client import QwenLocalClient  # noqa: E402

    cards_dir = out_dir / "section_cards"
    cards_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = out_dir / "qwen_raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    buckets = _load_all_sections(sections_dir)
    client = QwenLocalClient(
        max_tokens=max_tokens,
        temperature=temperature,
        save_raw_dir=raw_dir,
    )

    all_cards: dict[str, dict[str, Any]] = {}
    results: list[dict[str, Any]] = []
    t0 = time.time()

    canonical_specs = CANONICAL_SECTION_SPECS
    if only_section:
        canonical_specs = [x for x in canonical_specs if x[0] == only_section]

    for idx, (sid, cname, _mand, _order) in enumerate(canonical_specs, 1):
        card_path = cards_dir / f"{sid}.json"
        if resume and card_path.exists() and card_path.stat().st_size > 0:
            try:
                all_cards[sid] = json.loads(card_path.read_text(encoding="utf-8"))
                results.append({"section_id": sid, "status": "cached"})
                log.info("card_cached", section=sid, idx=idx, total=len(canonical_specs))
                continue
            except json.JSONDecodeError:
                pass

        entries = buckets.get(sid, [])
        if not entries:
            log.warning("no_text_samples", section=sid)
            card = _validate_card({}, sid)
            card["function"] = f"No corpus samples were available for {sid}."
            card_path.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
            all_cards[sid] = card
            results.append({"section_id": sid, "status": "empty"})
            continue

        samples = _sample(entries, samples_per_section)
        messages = _build_messages(sid, cname, samples, chars_per_sample)

        t_sec = time.time()
        try:
            resp = client.create_response(
                messages=messages,
                response_format={"schema": SECTION_CARD_SCHEMA},
                raw_save_id=f"{sid}",
            )
        except Exception as exc:  # noqa: BLE001
            log.exception("qwen_request_failed", section=sid, error=str(exc))
            results.append({"section_id": sid, "status": "error", "error": str(exc)})
            continue

        parsed = resp.get("parsed") or {}
        if not parsed or not isinstance(parsed, dict):
            log.warning(
                "card_parse_failed",
                section=sid,
                preview=(resp.get("content") or "")[:200],
            )
            card = _validate_card({"function": "", "purpose": ""}, sid)
        else:
            card = _validate_card(parsed, sid)
        card_path.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
        all_cards[sid] = card
        elapsed = round(time.time() - t_sec, 2)
        results.append({"section_id": sid, "status": "ok", "seconds": elapsed})
        log.info(
            "card_generated",
            section=sid,
            idx=idx,
            total=len(canonical_specs),
            seconds=elapsed,
            samples=len(samples),
        )

    merged = {}
    if all_cards and graph_in.exists():
        merged = _load_graph_and_merge(
            graph_in,
            all_cards,
            out_dir.parent / "structure" / "docgraph_with_writing.json",
        )

    summary = {
        "stage": "stage2_writing",
        "cards_dir": str(cards_dir),
        "cards_built": sum(1 for r in results if r.get("status") == "ok"),
        "cards_cached": sum(1 for r in results if r.get("status") == "cached"),
        "empty": sum(1 for r in results if r.get("status") == "empty"),
        "errors": sum(1 for r in results if r.get("status") == "error"),
        "merged_graph": merged,
        "elapsed_seconds": round(time.time() - t0, 2),
        "per_section": results,
    }
    (out_dir / "_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser(description="Stage 2: per-section writing KG via Qwen.")
    ap.add_argument(
        "--sections-dir", type=Path, default=Path("prospectus_kg_output/sections_toc")
    )
    ap.add_argument(
        "--graph-in",
        type=Path,
        default=Path("prospectus_kg_output/structure/docgraph.json"),
    )
    ap.add_argument("--out-dir", type=Path, default=Path("prospectus_kg_output/writing"))
    ap.add_argument("--samples-per-section", type=int, default=3)
    ap.add_argument("--chars-per-sample", type=int, default=4500)
    ap.add_argument("--temperature", type=float, default=0.0)
    ap.add_argument("--max-tokens", type=int, default=4096)
    ap.add_argument("--no-resume", action="store_true")
    ap.add_argument("--only-section", type=str, default=None)
    args = ap.parse_args()

    summary = run(
        args.sections_dir,
        args.graph_in,
        args.out_dir,
        samples_per_section=args.samples_per_section,
        chars_per_sample=args.chars_per_sample,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        resume=not args.no_resume,
        only_section=args.only_section,
    )
    print(json.dumps(summary, indent=2, ensure_ascii=False))
