from __future__ import annotations

import json
import math
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

from prospectus_graph.config import SECTION_FACT_SCHEMA, SECTION_TO_AGENT1_IDS
from prospectus_graph.state import EvidenceChunk, RetrievedFact

TOKEN_RE = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_\-./%]*")
SEMANTIC_MODEL = "all-MiniLM-L6-v2"


def _tokenize(text: str) -> set[str]:
    tokens = set()
    for match in TOKEN_RE.findall((text or "").lower()):
        token = match.strip("._-/")
        if len(token) >= 2:
            tokens.add(token)
    return tokens


def build_context(chunks: list[EvidenceChunk]) -> str:
    """Build an evidence context string from retrieved chunks.
    Skips chunks with identical text to avoid redundant context that can trigger LLM repetition loops.
    """
    seen_texts: set[str] = set()
    parts = []
    idx = 1
    for chunk in chunks:
        text = chunk.get("text", "")
        normalized = text.strip()
        if normalized and normalized in seen_texts:
            continue
        if normalized:
            seen_texts.add(normalized)
        src = chunk.get("source_file", "unknown")
        sheet_name = chunk.get("sheet_name")
        source_label = f"{src} / {sheet_name}" if sheet_name else src
        parts.append(f"[{idx}] (Source: {source_label})\n{text}")
        idx += 1
    return "\n\n".join(parts)


@dataclass
class RetrievalResult:
    chunks: list[EvidenceChunk]
    context: str
    notes: list[str]


@dataclass
class HybridRetrievalResult:
    text_evidence: list[EvidenceChunk] = field(default_factory=list)
    facts: list[RetrievedFact] = field(default_factory=list)
    formatted_facts: str = ""
    retrieval_context: str = ""  # merged text + facts for backward compat
    notes: list[str] = field(default_factory=list)


def format_facts_for_prompt(
    facts: list[RetrievedFact], max_facts: int = 80, max_items_per_group: int = 12
) -> str:
    """Format facts for injection into section-writer prompt (structured, human-readable).
    Deduplicates identical values and caps item-type enumeration to avoid LLM repetition loops.
    """
    if not facts:
        return ""
    lines: list[str] = []
    by_prefix: dict[str, list[RetrievedFact]] = {}
    for f in facts[:max_facts]:
        prefix = (f.get("field") or "").split(".")[0]
        by_prefix.setdefault(prefix, []).append(f)
    for prefix, group in sorted(by_prefix.items()):
        if not group:
            continue
        header = prefix.replace("_", " ").title()
        lines.append(f"\n{header.upper()} FACTS")
        seen_values: set[str] = set()
        item_lines: list[str] = []
        other_lines: list[str] = []
        for g in group:
            period = g.get("period") or ""
            metric = g.get("metric", "")
            value = g.get("value")
            unit = g.get("unit") or ""
            if value is None:
                continue
            val_str = str(value).strip()
            if val_str in seen_values:
                continue
            seen_values.add(val_str)
            if isinstance(value, float) and 0 < value < 1:
                pct = f"{value * 100:.1f}%"
                line = f"{period} {metric}: {pct}".strip() if period else f"{metric}: {pct}"
                other_lines.append(line)
            elif isinstance(value, (int, float)) and value >= 1000:
                fmt = f"{value:,.0f}" if isinstance(value, (int, float)) and value == int(value) else f"{value:,.2f}"
                line = f"{period} {metric}: {unit} {fmt}".strip() if unit else f"{period} {metric}: {fmt}".strip()
                other_lines.append(line)
            else:
                line = f"{period} {metric}: {value} {unit}".strip() if unit else f"{period} {metric}: {value}".strip()
                if metric == "item":
                    item_lines.append(line)
                else:
                    other_lines.append(line)
        for line in other_lines:
            lines.append(line)
        if item_lines:
            capped = item_lines[:max_items_per_group]
            for line in capped:
                lines.append(line)
            if len(item_lines) > max_items_per_group:
                n_more = len(item_lines) - max_items_per_group
                lines.append(f"item: [and {n_more} more items - summarize by category in prose]")
    return "\n".join(lines) if lines else ""


class BaseKnowledgeBase(ABC):
    """Abstract source of evidence chunks for retrieval."""

    @abstractmethod
    def load_chunks(self) -> list[EvidenceChunk]:
        raise NotImplementedError


class Agent1JsonlKnowledgeBase(BaseKnowledgeBase):
    """
    Knowledge base backed by `agent1_output/rag_chunks.jsonl`.

    This is Excel-only today, but it already normalizes data into a generic
    `EvidenceChunk` shape so future adapters can expose non-Excel sources
    through the same interface.
    """

    def __init__(self, rag_dir: str | Path):
        self.rag_dir = Path(rag_dir)
        self._chunks: list[EvidenceChunk] | None = None

    def load_chunks(self) -> list[EvidenceChunk]:
        if self._chunks is not None:
            return self._chunks

        main_path = self.rag_dir / "rag_chunks.jsonl"
        if not main_path.exists():
            raise FileNotFoundError(f"Run agent1 first. Expected: {main_path}")

        chunks: list[EvidenceChunk] = []
        with open(main_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                raw = json.loads(line)
                raw.setdefault("source_type", "excel_sheet")
                raw.setdefault("metadata", {})
                chunks.append(raw)

        self._chunks = chunks
        return chunks


class BaseRetriever(ABC):
    """Abstract retriever for section-scoped evidence retrieval."""

    @abstractmethod
    def retrieve(
        self,
        *,
        section_id: str,
        section_name: str,
        requirements: str,
        max_context_chars: int,
    ) -> RetrievalResult:
        raise NotImplementedError


class SectionAwareRAGRetriever(BaseRetriever):
    """
    Lightweight RAG retriever for section drafting.

    Current behavior:
    - loads chunks from one or more knowledge bases
    - scores them against section name + requirements
    - boosts chunks routed to the preferred Agent1 A-H buckets
    - returns the highest-scoring chunks that fit in the context window

    This keeps the current Excel-only pipeline working, but the retriever is now
    decoupled from `agent2.py` and can be extended with new knowledge base
    adapters later (PDF, JSON, DB rows, expert reports, etc.).
    """

    def __init__(
        self,
        knowledge_bases: Iterable[BaseKnowledgeBase],
        *,
        section_mapping: dict[str, list[str]] | None = None,
    ):
        self.knowledge_bases = list(knowledge_bases)
        self.section_mapping = section_mapping or SECTION_TO_AGENT1_IDS

    def _load_all_chunks(self) -> list[EvidenceChunk]:
        chunks: list[EvidenceChunk] = []
        for kb in self.knowledge_bases:
            chunks.extend(kb.load_chunks())
        return chunks

    def _score_chunk(
        self,
        *,
        query_tokens: set[str],
        preferred_ids: set[str],
        chunk: EvidenceChunk,
    ) -> float:
        text_tokens = _tokenize(chunk.get("text", ""))
        summary_tokens = _tokenize(chunk.get("sheet_summary", ""))
        file_tokens = _tokenize(chunk.get("source_file", ""))
        combined = text_tokens | summary_tokens | file_tokens
        if not combined:
            return 0.0

        overlap = len(query_tokens & combined)
        summary_overlap = len(query_tokens & summary_tokens)
        file_overlap = len(query_tokens & file_tokens)
        preferred_boost = 3.0 if chunk.get("section_id") in preferred_ids else 0.0

        # Small length normalization so extremely long chunks do not dominate.
        length_penalty = math.sqrt(max(len(text_tokens), 1))
        return (
            preferred_boost
            + overlap
            + (0.75 * summary_overlap)
            + (0.5 * file_overlap)
            + (0.2 * len(query_tokens & _tokenize(chunk.get("section", ""))))
        ) / length_penalty

    def retrieve(
        self,
        *,
        section_id: str,
        section_name: str,
        requirements: str,
        max_context_chars: int,
    ) -> RetrievalResult:
        all_chunks = self._load_all_chunks()
        if not all_chunks:
            return RetrievalResult(chunks=[], context="", notes=["No evidence chunks were available."])

        query_text = f"{section_name}\n{requirements}"
        query_tokens = _tokenize(query_text)
        preferred_ids = set(self.section_mapping.get(section_id, []))

        scored: list[tuple[float, EvidenceChunk]] = []
        for chunk in all_chunks:
            score = self._score_chunk(
                query_tokens=query_tokens,
                preferred_ids=preferred_ids,
                chunk=chunk,
            )
            if score > 0:
                scored.append((score, chunk))

        if not scored:
            # Fallback to preferred routed chunks if lexical retrieval returns nothing.
            fallback = [
                chunk
                for chunk in all_chunks
                if chunk.get("section_id") in preferred_ids
            ]
            context_chunks: list[EvidenceChunk] = []
            total_chars = 0
            for chunk in fallback:
                text = chunk.get("text", "")
                if total_chars + len(text) > max_context_chars:
                    break
                context_chunks.append(chunk)
                total_chars += len(text)
            notes = [
                "Retriever fallback used: no lexical matches found, so preferred routed chunks were returned."
            ]
            return RetrievalResult(
                chunks=context_chunks,
                context=build_context(context_chunks),
                notes=notes,
            )

        scored.sort(key=lambda item: item[0], reverse=True)

        selected: list[EvidenceChunk] = []
        seen_sources: set[str] = set()
        total_chars = 0
        for _, chunk in scored:
            text = chunk.get("text", "")
            source_key = f"{chunk.get('source_file', '')}:{chunk.get('sheet_name', '')}:{chunk.get('chunk_index', '')}"
            if source_key in seen_sources:
                continue
            if total_chars + len(text) > max_context_chars:
                continue
            selected.append(chunk)
            seen_sources.add(source_key)
            total_chars += len(text)
            if total_chars >= max_context_chars:
                break

        if not selected:
            # Last-resort selection in case all top-scored chunks were too large.
            top_chunk = scored[0][1]
            selected = [top_chunk]

        notes = [
            f"Retriever selected {len(selected)} chunk(s) for section {section_id}.",
            (
                "Preferred Agent1 buckets: "
                + (", ".join(sorted(preferred_ids)) if preferred_ids else "none")
            ),
        ]
        return RetrievalResult(
            chunks=selected,
            context=build_context(selected),
            notes=notes,
        )


# -----------------------------------------------------------------------------
# Hybrid retriever: semantic search + fact store
# -----------------------------------------------------------------------------


class TextChunkKnowledgeBase:
    """Loads text_chunks.jsonl (narrative content)."""

    def __init__(self, rag_dir: str | Path):
        self.rag_dir = Path(rag_dir)
        self._chunks: list[dict[str, Any]] | None = None

    def load_chunks(self) -> list[dict[str, Any]]:
        if self._chunks is not None:
            return self._chunks
        path = self.rag_dir / "text_chunks.jsonl"
        if not path.exists():
            path = self.rag_dir / "rag_chunks.jsonl"
        if not path.exists():
            return []
        chunks: list[dict[str, Any]] = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                chunks.append(json.loads(line))
        self._chunks = chunks
        return chunks


def load_facts(rag_dir: str | Path) -> list[RetrievedFact]:
    """Load fact_store.jsonl."""
    path = Path(rag_dir) / "fact_store.jsonl"
    if not path.exists():
        return []
    facts: list[RetrievedFact] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            facts.append(json.loads(line))
    return facts


class HybridRetriever:
    """
    Hybrid retrieval: semantic search over text_chunks + structured filter over fact_store.
    Returns {text_evidence, facts, formatted_facts}.
    """

    def __init__(
        self,
        rag_dir: str | Path,
        *,
        section_mapping: dict[str, list[str]] | None = None,
        text_limit_chars: int = 8000,
        fact_limit: int = 80,
        use_semantic: bool = True,
    ):
        self.rag_dir = Path(rag_dir)
        self.section_mapping = section_mapping or SECTION_TO_AGENT1_IDS
        self.text_limit_chars = text_limit_chars
        self.fact_limit = fact_limit
        self.use_semantic = use_semantic
        self._text_chunks: list[dict[str, Any]] | None = None
        self._facts: list[RetrievedFact] | None = None
        self._model = None

    def _get_text_chunks(self) -> list[dict[str, Any]]:
        if self._text_chunks is None:
            kb = TextChunkKnowledgeBase(self.rag_dir)
            self._text_chunks = kb.load_chunks()
        return self._text_chunks

    def _get_facts(self) -> list[RetrievedFact]:
        if self._facts is None:
            self._facts = load_facts(self.rag_dir)
        return self._facts

    def _load_embedding_model(self):
        if self._model is not None:
            return self._model
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(SEMANTIC_MODEL)
        except ImportError:
            self._model = None
        return self._model

    def _semantic_search(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        preferred_ids: set[str],
        max_chars: int,
    ) -> list[dict[str, Any]]:
        model = self._load_embedding_model()
        if model is None:
            return self._lexical_fallback(query, chunks, preferred_ids, max_chars)
        query_embedding = model.encode(query, convert_to_tensor=True)
        texts = [c.get("text", "") for c in chunks]
        if not texts:
            return []
        emb = model.encode(texts, convert_to_tensor=True)
        from sentence_transformers import util as st_util
        scores = st_util.cos_sim(query_embedding, emb)[0]
        scored: list[tuple[float, dict]] = []
        for i, chunk in enumerate(chunks):
            s = float(scores[i])
            sh = chunk.get("section_hint") or chunk.get("section_id")
            if sh in preferred_ids:
                s += 0.15
            scored.append((s, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        selected: list[dict] = []
        total = 0
        for _, ch in scored:
            if total + len(ch.get("text", "")) > max_chars:
                continue
            selected.append(ch)
            total += len(ch.get("text", ""))
        return selected

    def _select_facts_schema_aware(
        self,
        facts_raw: list[RetrievedFact],
        section_id: str,
        preferred_ids: set[str],
    ) -> list[RetrievedFact]:
        """
        Schema-aware fact selection: when SECTION_FACT_SCHEMA exists for section,
        MUST include facts from each required prefix. Otherwise fallback to section_hint filter.
        """
        required_prefixes = SECTION_FACT_SCHEMA.get(section_id)
        if not required_prefixes:
            return [
                f for f in facts_raw
                if (f.get("metadata") or {}).get("section_hint") in preferred_ids
            ][: self.fact_limit]

        # Group facts by which required prefix they match (field starts with prefix)
        by_prefix: dict[str, list[RetrievedFact]] = {p: [] for p in required_prefixes}
        other: list[RetrievedFact] = []

        for f in facts_raw:
            field = f.get("field") or ""
            matched = False
            for p in required_prefixes:
                if field == p or field.startswith(p + "."):
                    by_prefix[p].append(f)
                    matched = True
                    break
            if not matched and (f.get("metadata") or {}).get("section_hint") in preferred_ids:
                other.append(f)

        # Ensure at least some facts from each required schema; fill remainder
        per_prefix = max(5, self.fact_limit // len(required_prefixes))
        selected: list[RetrievedFact] = []
        seen: set[tuple] = set()

        for p in required_prefixes:
            for f in by_prefix[p][:per_prefix]:
                key = (f.get("field"), f.get("period"), f.get("metric"), f.get("value"))
                if key not in seen:
                    seen.add(key)
                    selected.append(f)

        for f in other:
            if len(selected) >= self.fact_limit:
                break
            key = (f.get("field"), f.get("period"), f.get("metric"), f.get("value"))
            if key not in seen:
                seen.add(key)
                selected.append(f)

        return selected[: self.fact_limit]

    def _lexical_fallback(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        preferred_ids: set[str],
        max_chars: int,
    ) -> list[dict[str, Any]]:
        query_tokens = _tokenize(query)
        scored: list[tuple[float, dict]] = []
        for ch in chunks:
            text_tokens = _tokenize(ch.get("text", ""))
            topic_tokens = _tokenize(ch.get("topic", ch.get("sheet_summary", "")))
            overlap = len(query_tokens & (text_tokens | topic_tokens))
            sh = ch.get("section_hint") or ch.get("section_id")
            boost = 2.0 if sh in preferred_ids else 0.0
            score = boost + overlap / max(math.sqrt(len(text_tokens)), 1)
            if score > 0:
                scored.append((score, ch))
        scored.sort(key=lambda x: x[0], reverse=True)
        selected = []
        total = 0
        for _, ch in scored:
            if total + len(ch.get("text", "")) > max_chars:
                continue
            selected.append(ch)
            total += len(ch.get("text", ""))
        return selected

    def retrieve(
        self,
        *,
        section_id: str,
        section_name: str,
        requirements: str,
        max_context_chars: int,
    ) -> HybridRetrievalResult:
        query = f"{section_name}\n{requirements}"
        preferred_ids = set(self.section_mapping.get(section_id, []))

        text_chunks = self._get_text_chunks()
        text_budget = max_context_chars // 2
        if self.use_semantic:
            text_evidence_raw = self._semantic_search(
                query, text_chunks, preferred_ids, self.text_limit_chars
            )
        else:
            text_evidence_raw = self._lexical_fallback(
                query, text_chunks, preferred_ids, self.text_limit_chars
            )
        text_evidence: list[EvidenceChunk] = []
        for ch in text_evidence_raw:
            text_evidence.append({
                "chunk_id": ch.get("chunk_id", ""),
                "section_id": ch.get("section_hint") or ch.get("section_id", ""),
                "source_file": ch.get("source_file", ""),
                "sheet_name": ch.get("sheet_name", ch.get("topic", "")),
                "text": ch.get("text", ""),
                "sheet_summary": ch.get("topic", ch.get("sheet_summary", "")),
            })

        facts_raw = self._get_facts()
        facts = self._select_facts_schema_aware(
            facts_raw, section_id, preferred_ids
        )
        formatted = format_facts_for_prompt(facts, max_facts=self.fact_limit)

        text_context = build_context(text_evidence) if text_evidence else ""
        full_context = text_context
        if formatted:
            full_context = f"{full_context}\n\n---\nSTRUCTURED FACTS (use for figures, dates, metrics):\n{formatted}" if full_context else f"STRUCTURED FACTS:\n{formatted}"

        notes = [
            f"Hybrid retriever: {len(text_evidence)} text chunks, {len(facts)} facts for {section_id}.",
        ]
        return HybridRetrievalResult(
            text_evidence=text_evidence,
            facts=facts,
            formatted_facts=formatted,
            retrieval_context=full_context or "[No evidence retrieved.]",
            notes=notes,
        )
