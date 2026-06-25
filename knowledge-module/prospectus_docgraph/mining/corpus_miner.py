"""
Corpus mining over ingested instance nodes: statistics + interpretable refinement proposals.
"""

from __future__ import annotations

from collections import defaultdict

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.mining.collector import collect_from_graph
from prospectus_docgraph.mining.config import MiningConfig
from prospectus_docgraph.mining.models import MinedCorpusSnapshot
from prospectus_docgraph.mining.report_models import (
    AliasRecommendation,
    GraphRefinementReport,
    LowConfidenceMapping,
    OrderingRecommendation,
    PrecedenceRecommendation,
    SectionCooccurrenceInsight,
    SectionRecommendation,
    SubsectionRecommendation,
    UnmatchedHeading,
)
from prospectus_docgraph.models.nodes import SectionNode, SubsectionNode


class CorpusMiner:
    """
    Build a :class:`GraphRefinementReport` from a mined snapshot or a live graph.

    Does **not** mutate the ontology; call :func:`~prospectus_docgraph.mining.refinement.apply_refinement`
    after human review.
    """

    def __init__(self, config: MiningConfig | None = None) -> None:
        self.config = config if config is not None else MiningConfig()

    def mine_graph(self, manager: GraphManager) -> GraphRefinementReport:
        """Collect statistics from instance nodes, then infer recommendations."""
        snap = collect_from_graph(
            manager,
            low_confidence_threshold=self.config.low_confidence_threshold,
        )
        return self.mine_snapshot(snap, manager=manager)

    def mine_snapshot(
        self,
        snapshot: MinedCorpusSnapshot,
        *,
        manager: GraphManager | None = None,
    ) -> GraphRefinementReport:
        """
        Infer a report from pre-computed statistics (used by tests with mocked corpora).

        ``manager`` is optional; when provided, ``current_*`` fields are filled from ontology nodes.
        """
        td = max(1, snapshot.total_documents)
        cfg = self.config

        section_recs = self._section_recommendations(snapshot, td, manager)
        sub_recs = self._subsection_recommendations(snapshot, td, manager)
        order_recs = self._ordering_recommendations(snapshot)
        prec_recs = self._precedence_recommendations(snapshot, td)
        alias_recs = self._alias_recommendations(snapshot)
        cooc = self._cooccurrence_insights(snapshot, td)

        low_conf = [
            LowConfidenceMapping.model_validate(x) for x in snapshot.low_confidence_events
        ]
        unmatched = [UnmatchedHeading.model_validate(x) for x in snapshot.unmatched_headings]

        report = GraphRefinementReport(
            total_documents=snapshot.total_documents,
            mining_config_summary={
                "mandatory_threshold": cfg.mandatory_threshold,
                "frequent_optional_threshold": cfg.frequent_optional_threshold,
                "rare_optional_threshold": cfg.rare_optional_threshold,
                "mandatory_like_subsection_threshold": cfg.mandatory_like_subsection_threshold,
                "precedence_threshold": cfg.precedence_threshold,
                "min_precedence_pair_count": cfg.min_precedence_pair_count,
                "alias_suggestion_threshold": cfg.alias_suggestion_threshold,
                "low_confidence_threshold": cfg.low_confidence_threshold,
                "section_optional_threshold": cfg.section_optional_threshold,
            },
            section_recommendations=section_recs,
            subsection_recommendations=sub_recs,
            ordering_recommendations=order_recs,
            precedence_recommendations=prec_recs,
            alias_recommendations=alias_recs,
            low_confidence_mappings=low_conf,
            unmatched_headings=unmatched,
            section_cooccurrence_insights=cooc,
        )
        if manager is not None:
            report = self.fill_current_ordering_from_graph(report, manager)
        return report

    def _section_recommendations(
        self,
        snap: MinedCorpusSnapshot,
        td: int,
        manager: GraphManager | None,
    ) -> list[SectionRecommendation]:
        out: list[SectionRecommendation] = []
        for sid, st in sorted(snap.section_stats.items()):
            ratio = st.document_frequency / td
            cur = None
            if manager is not None and manager.nx_graph.has_node(sid):
                node = manager.get_node(sid)
                if isinstance(node, SectionNode):
                    cur = node.mandatory
            rec_mand = ratio >= self.config.mandatory_threshold
            rationale = (
                f"Observed in {st.document_frequency}/{td} documents ({ratio:.2%}). "
                f"Mean mapping confidence {st.mean_mapping_confidence:.3f}."
            )
            if ratio < self.config.section_optional_threshold:
                rationale += " Treated as optional by section_optional_threshold."
            out.append(
                SectionRecommendation(
                    section_id=sid,
                    document_frequency=st.document_frequency,
                    support_count=st.support_count,
                    total_documents=snap.total_documents,
                    frequency_ratio=ratio,
                    mean_mapping_confidence=st.mean_mapping_confidence,
                    current_mandatory=cur,
                    recommended_mandatory=rec_mand,
                    rationale=rationale,
                )
            )
        return out

    def _subsection_recommendations(
        self,
        snap: MinedCorpusSnapshot,
        td: int,
        manager: GraphManager | None,
    ) -> list[SubsectionRecommendation]:
        out: list[SubsectionRecommendation] = []
        for parent_id, submap in sorted(snap.subsection_stats.items()):
            for sub_id, st in sorted(submap.items()):
                ratio = st.document_frequency / td
                cur = None
                if manager is not None and manager.nx_graph.has_node(sub_id):
                    node = manager.get_node(sub_id)
                    if isinstance(node, SubsectionNode):
                        cur = node.mandatory

                cfg = self.config
                if ratio >= cfg.mandatory_like_subsection_threshold:
                    tier = "mandatory_like"
                    rec_mand = True
                    rationale = "High doc-frequency within corpus; treat as mandatory-like."
                elif ratio >= cfg.frequent_optional_threshold:
                    tier = "frequent_optional"
                    rec_mand = False
                    rationale = "Moderate frequency; optional but common."
                else:
                    tier = "rare_optional"
                    rec_mand = False
                    rationale = "Below frequent_optional_threshold; rare optional heading."
                if ratio < cfg.rare_optional_threshold:
                    rationale += f" Very rare (below rare_optional_threshold={cfg.rare_optional_threshold:.2%})."

                rationale += (
                    f" Seen under parent {parent_id} in {st.document_frequency}/{td} docs "
                    f"({ratio:.2%}); mean confidence {st.mean_mapping_confidence:.3f}."
                )
                out.append(
                    SubsectionRecommendation(
                        parent_section_id=parent_id,
                        subsection_id=sub_id,
                        document_frequency=st.document_frequency,
                        support_count=st.support_count,
                        total_documents=snap.total_documents,
                        frequency_ratio_within_parent=ratio,
                        mean_mapping_confidence=st.mean_mapping_confidence,
                        tier=tier,
                        current_mandatory=cur,
                        recommended_mandatory=rec_mand,
                        rationale=rationale,
                    )
                )
        return out

    def _ordering_recommendations(self, snap: MinedCorpusSnapshot) -> list[OrderingRecommendation]:
        out: list[OrderingRecommendation] = []
        for sid, st in sorted(snap.section_stats.items()):
            rec_order = int(round(st.average_order_index))
            out.append(
                OrderingRecommendation(
                    section_id=sid,
                    current_typical_order_index=None,
                    recommended_typical_order_index=rec_order,
                    average_order_index_observed=st.average_order_index,
                )
            )
        return out

    def _precedence_recommendations(
        self,
        snap: MinedCorpusSnapshot,
        td: int,
    ) -> list[PrecedenceRecommendation]:
        cfg = self.config
        out: list[PrecedenceRecommendation] = []
        for (a, b), cnt in sorted(
            snap.section_transition_counts.items(),
            key=lambda x: -x[1],
        ):
            frac = cnt / td
            if cnt < cfg.min_precedence_pair_count:
                continue
            if frac < cfg.precedence_threshold:
                continue
            out.append(
                PrecedenceRecommendation(
                    predecessor_id=a,
                    successor_id=b,
                    transition_count=cnt,
                    transition_fraction_of_corpus=frac,
                    rationale=(
                        f"Observed transition {a} → {b} in {cnt} documents "
                        f"({frac:.2%} of corpus, threshold {cfg.precedence_threshold:.2%})."
                    ),
                )
            )
        return out

    def _alias_recommendations(self, snap: MinedCorpusSnapshot) -> list[AliasRecommendation]:
        """
        Group low-confidence resolved mappings by (kind, canonical id, normalized title).

        Suggests adding normalized surface form as an alias when below ``alias_suggestion_threshold``.
        """
        cfg = self.config
        groups: dict[tuple[str, str, str, str | None], list[dict]] = defaultdict(list)
        for ev in snap.low_confidence_events:
            conf = float(ev.get("confidence", 0.0))
            if conf >= cfg.alias_suggestion_threshold:
                continue
            cid = ev.get("canonical_id")
            if not cid:
                continue
            kind = str(ev.get("kind", "section"))
            nt = str(ev.get("normalized_title") or ev.get("raw_title") or "").strip()
            if not nt:
                continue
            parent = ev.get("parent_section_id") if kind == "subsection" else None
            key = (kind, cid, nt, parent if isinstance(parent, str) else None)
            groups[key].append(ev)

        out: list[AliasRecommendation] = []
        for (kind, cid, nt, parent), events in sorted(groups.items(), key=lambda x: -len(x[1])):
            samples = [str(e.get("raw_title", "")) for e in events[:5]]
            mean_c = sum(float(e.get("confidence", 0.0)) for e in events) / len(events)
            out.append(
                AliasRecommendation(
                    target_kind="section" if kind == "section" else "subsection",
                    target_id=cid,
                    parent_section_id=parent,
                    suggested_alias=nt,
                    sample_raw_titles=samples,
                    evidence_count=len(events),
                    mean_confidence_when_seen=mean_c,
                )
            )
        return out

    def _cooccurrence_insights(
        self,
        snap: MinedCorpusSnapshot,
        td: int,
    ) -> list[SectionCooccurrenceInsight]:
        """Top unordered section pairs by co-document frequency."""
        seen: set[tuple[str, str]] = set()
        out: list[SectionCooccurrenceInsight] = []
        for sid, st in snap.section_stats.items():
            for other, cnt in st.cooccurrence_counts.items():
                key = (sid, other) if sid < other else (other, sid)
                if key in seen:
                    continue
                seen.add(key)
                out.append(
                    SectionCooccurrenceInsight(
                        section_a=key[0],
                        section_b=key[1],
                        co_document_count=cnt,
                        fraction_of_documents=cnt / td,
                    )
                )
        out.sort(key=lambda x: -x.co_document_count)
        return out[:200]

    def fill_current_ordering_from_graph(
        self,
        report: GraphRefinementReport,
        manager: GraphManager,
    ) -> GraphRefinementReport:
        """Mutate a copy of ordering recommendations with current ``typical_order_index`` from the graph."""
        updates: list[OrderingRecommendation] = []
        for o in report.ordering_recommendations:
            cur = None
            if manager.nx_graph.has_node(o.section_id):
                node = manager.get_node(o.section_id)
                if isinstance(node, SectionNode):
                    cur = node.typical_order_index
            updates.append(
                o.model_copy(update={"current_typical_order_index": cur})
            )
        return report.model_copy(update={"ordering_recommendations": updates})
