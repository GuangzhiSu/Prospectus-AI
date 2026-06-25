"""
Rule-based + fuzzy title normalization to canonical section/subsection ids.

LLM-assisted path is intentionally not implemented; use :meth:`infer_with_llm` hook later.
"""

from __future__ import annotations

import difflib
import re
import unicodedata
from typing import Sequence

from prospectus_docgraph.models.enums import NodeType
from prospectus_docgraph.normalizer.aliases_seed import (
    DEFAULT_SECTION_ALIAS_REGEX,
    DEFAULT_SECTION_ALIASES,
)
from prospectus_docgraph.normalizer.match_result import MatchAlternative, MatchResult
from prospectus_docgraph.schema.seed import CANONICAL_SECTION_SPECS

try:
    from rapidfuzz import fuzz as rf_fuzz
    from rapidfuzz import process as rf_process

    _HAS_RAPIDFUZZ = True
except ImportError:
    _HAS_RAPIDFUZZ = False


def _slug_from_words(s: str) -> str:
    """Turn a loose title into an underscored slug (fallback subsection id)."""
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[-\s]+", "_", s.strip())
    return s.strip("_") or "subsection"


class TitleNormalizer:
    """
    Map raw TOC strings to canonical graph node ids.

    Priority: exact id/display → registered aliases → fuzzy match (rapidfuzz or difflib).
    """

    def __init__(
        self,
        *,
        fuzzy_cutoff: float = 0.82,
        max_alternatives: int = 5,
    ) -> None:
        self.fuzzy_cutoff = fuzzy_cutoff
        self.max_alternatives = max_alternatives
        self._section_display: dict[str, str] = {
            sid: name for sid, name, _m, _o in CANONICAL_SECTION_SPECS
        }
        self._alias_to_section: dict[str, str] = dict(DEFAULT_SECTION_ALIASES)
        # (parent_section_id, normalized_alias) -> subsection canonical slug
        self._subsection_alias: dict[tuple[str, str], str] = {}

    # ------------------------------------------------------------------
    def normalize_text(self, raw_title: str) -> str:
        """Lowercase, NFKC, strip numbering prefixes, collapse whitespace."""
        s = unicodedata.normalize("NFKC", raw_title or "")
        s = s.strip().lower()
        s = re.sub(r"^\s*(chapter\s+)?[\divxlcdm\.]+\s*[:\.\)\-–—]*\s*", "", s, flags=re.I)
        s = re.sub(r"^\s*[\d]+(?:\.\d+)*\s*[:\.\)\-–—]*\s*", "", s)
        s = re.sub(r"\s+", " ", s)
        return s.strip()

    def register_alias(self, canonical_name: str, alias: str) -> None:
        """Register an alias (normalized on write) for a canonical **section** id."""
        key = self.normalize_text(alias)
        self._alias_to_section[key] = canonical_name

    def register_subsection_alias(
        self,
        parent_section_id: str,
        alias: str,
        canonical_subsection_slug: str,
    ) -> None:
        """Register alias for a subsection under a known parent section id."""
        key = (parent_section_id, self.normalize_text(alias))
        self._subsection_alias[key] = canonical_subsection_slug

    # ------------------------------------------------------------------
    def _section_candidate_keys(self) -> dict[str, str]:
        """Map normalized lookup string -> canonical section id (last wins on dup)."""
        m: dict[str, str] = {}
        for sid, display, _m, _o in CANONICAL_SECTION_SPECS:
            m[self.normalize_text(sid.replace("_", " "))] = sid
            m[self.normalize_text(sid)] = sid
            m[self.normalize_text(display)] = sid
        m.update({k: v for k, v in self._alias_to_section.items()})
        return m

    def _best_fuzzy(
        self,
        query_norm: str,
        choices: dict[str, str],
    ) -> tuple[str | None, float, list[MatchAlternative]]:
        """
        Return (canonical_id, confidence 0..1, alternatives).

        ``choices`` maps normalized_string -> canonical_id.
        """
        if not query_norm or not choices:
            return None, 0.0, []

        norms = list(choices.keys())
        alts: list[MatchAlternative] = []

        if _HAS_RAPIDFUZZ:
            matches = rf_process.extract(
                query_norm,
                norms,
                scorer=rf_fuzz.WRatio,
                limit=min(len(norms), self.max_alternatives + 5),
            )
            for norm, score, _idx in matches:
                cid = choices[norm]
                conf = min(1.0, float(score) / 100.0 * 0.92)
                alts.append(
                    MatchAlternative(
                        canonical_name=cid,
                        confidence=conf,
                        match_method="fuzzy_rapidfuzz",
                    )
                )
            # Dedupe by canonical_name keeping best score
            by_cid: dict[str, MatchAlternative] = {}
            for a in alts:
                prev = by_cid.get(a.canonical_name)
                if prev is None or a.confidence > prev.confidence:
                    by_cid[a.canonical_name] = a
            merged = sorted(by_cid.values(), key=lambda x: -x.confidence)
            if merged and merged[0].confidence >= self.fuzzy_cutoff:
                top = merged[0]
                rest = [x for x in merged[1:] if x.canonical_name != top.canonical_name][
                    : self.max_alternatives
                ]
                return top.canonical_name, top.confidence, rest
            return None, 0.0, merged[: self.max_alternatives]

        # difflib fallback: best ratio per canonical id
        by_cid_score: dict[str, float] = {}
        by_cid_norm: dict[str, str] = {}
        for norm, cid in choices.items():
            r = difflib.SequenceMatcher(None, query_norm, norm).ratio()
            if cid not in by_cid_score or r > by_cid_score[cid]:
                by_cid_score[cid] = r
                by_cid_norm[cid] = norm
        for cid, r in by_cid_score.items():
            alts.append(
                MatchAlternative(
                    canonical_name=cid,
                    confidence=r * 0.92,
                    match_method="fuzzy_difflib",
                )
            )
        alts.sort(key=lambda x: -x.confidence)
        if alts and alts[0].confidence >= self.fuzzy_cutoff:
            top = alts[0]
            return top.canonical_name, top.confidence, alts[1 : self.max_alternatives + 1]
        return None, 0.0, alts[: self.max_alternatives]

    def match_section(self, raw_title: str) -> MatchResult:
        """Resolve a raw heading to a canonical **section** id."""
        nt = self.normalize_text(raw_title)
        choices = self._section_candidate_keys()

        # 1) Exact canonical id (underscore or spaced)
        for sid, _name, _m, _o in CANONICAL_SECTION_SPECS:
            if nt == self.normalize_text(sid) or nt == self.normalize_text(
                sid.replace("_", " ")
            ):
                return MatchResult(
                    raw_title=raw_title,
                    normalized_title=nt,
                    canonical_name=sid,
                    node_type=NodeType.SECTION,
                    confidence=1.0,
                    match_method="exact_id",
                    alternatives=[],
                )

        # 2) Exact display title
        for sid, disp in self._section_display.items():
            if nt == self.normalize_text(disp):
                return MatchResult(
                    raw_title=raw_title,
                    normalized_title=nt,
                    canonical_name=sid,
                    node_type=NodeType.SECTION,
                    confidence=0.99,
                    match_method="exact_display",
                    alternatives=[],
                )

        # 3) Alias table (seed + registered)
        if nt in self._alias_to_section:
            return MatchResult(
                raw_title=raw_title,
                normalized_title=nt,
                canonical_name=self._alias_to_section[nt],
                node_type=NodeType.SECTION,
                confidence=0.95,
                match_method="alias",
                alternatives=[],
            )

        # 3b) Regex fallback (e.g. "APPENDIX I — ACCOUNTANTS' REPORT" -> Appendices).
        for pattern, canonical in DEFAULT_SECTION_ALIAS_REGEX:
            if pattern.search(nt):
                return MatchResult(
                    raw_title=raw_title,
                    normalized_title=nt,
                    canonical_name=canonical,
                    node_type=NodeType.SECTION,
                    confidence=0.9,
                    match_method="regex_alias",
                    alternatives=[],
                )

        # 4) Fuzzy over full candidate map
        cid, conf, alts = self._best_fuzzy(nt, choices)
        if cid:
            return MatchResult(
                raw_title=raw_title,
                normalized_title=nt,
                canonical_name=cid,
                node_type=NodeType.SECTION,
                confidence=conf,
                match_method="fuzzy",
                alternatives=alts,
            )

        return MatchResult(
            raw_title=raw_title,
            normalized_title=nt,
            canonical_name=None,
            node_type=NodeType.SECTION,
            confidence=0.0,
            match_method="none",
            alternatives=alts,
        )

    def match_subsection(
        self,
        raw_title: str,
        parent_section: str | None,
    ) -> MatchResult:
        """
        Resolve a subsection heading.

        Without a corpus-specific subsection registry, this uses:
        (1) registered (parent, alias) pairs,
        (2) fuzzy match only among aliases registered for that parent,
        (3) otherwise returns a low-confidence synthetic slug or ``none``.
        """
        nt = self.normalize_text(raw_title)
        ps = parent_section.strip() if parent_section else None

        if ps and (ps, nt) in self._subsection_alias:
            sub_id = self._subsection_alias[(ps, nt)]
            return MatchResult(
                raw_title=raw_title,
                normalized_title=nt,
                canonical_name=sub_id,
                node_type=NodeType.SUBSECTION,
                confidence=0.96,
                match_method="alias",
                alternatives=[],
            )

        # Scoped fuzzy: only subsection aliases for this parent
        if ps:
            scoped: dict[str, str] = {}
            for (p, akey), subslug in self._subsection_alias.items():
                if p == ps:
                    scoped[akey] = subslug
            if scoped:
                cid, conf, alts = self._best_fuzzy(nt, scoped)
                if cid:
                    return MatchResult(
                        raw_title=raw_title,
                        normalized_title=nt,
                        canonical_name=cid,
                        node_type=NodeType.SUBSECTION,
                        confidence=conf,
                        match_method="fuzzy",
                        alternatives=alts,
                    )

        # No registry hit: optional synthetic id for downstream LLM
        if nt:
            syn = f"{ps + '__' if ps else ''}{_slug_from_words(raw_title)}"
            return MatchResult(
                raw_title=raw_title,
                normalized_title=nt,
                canonical_name=syn,
                node_type=NodeType.SUBSECTION,
                confidence=0.25,
                match_method="none_synthetic_slug",
                alternatives=[],
            )

        return MatchResult(
            raw_title=raw_title,
            normalized_title=nt,
            canonical_name=None,
            node_type=NodeType.SUBSECTION,
            confidence=0.0,
            match_method="none",
            alternatives=[],
        )

    def batch_match(self, titles: Sequence[str]) -> list[MatchResult]:
        """Match each string as a **section** title."""
        return [self.match_section(t) for t in titles]

    def infer_with_llm(self, raw_title: str, context: str | None = None) -> MatchResult:
        """
        Reserved hook for LLM-assisted disambiguation.

        Raises
        ------
        NotImplementedError
            Until an LLM backend is wired.
        """
        raise NotImplementedError(
            "LLM-assisted normalization is not implemented; "
            "override or inject a client in a future subclass."
        )
