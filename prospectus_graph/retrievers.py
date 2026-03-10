from __future__ import annotations

import json
import math
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from prospectus_graph.config import SECTION_TO_AGENT1_IDS
from prospectus_graph.state import EvidenceChunk

TOKEN_RE = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9_\-./%]*")


def _tokenize(text: str) -> set[str]:
    tokens = set()
    for match in TOKEN_RE.findall((text or "").lower()):
        token = match.strip("._-/")
        if len(token) >= 2:
            tokens.add(token)
    return tokens


def build_context(chunks: list[EvidenceChunk]) -> str:
    """Build an evidence context string from retrieved chunks."""
    parts = []
    for i, chunk in enumerate(chunks):
        src = chunk.get("source_file", "unknown")
        sheet_name = chunk.get("sheet_name")
        source_label = f"{src} / {sheet_name}" if sheet_name else src
        parts.append(f"[{i + 1}] (Source: {source_label})\n{chunk.get('text', '')}")
    return "\n\n".join(parts)


@dataclass
class RetrievalResult:
    chunks: list[EvidenceChunk]
    context: str
    notes: list[str]


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
