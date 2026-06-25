"""
Walk instance nodes in a :class:`~prospectus_docgraph.graph.manager.GraphManager` and
aggregate section/subsection statistics for Part 4 mining.
"""

from __future__ import annotations

import itertools
from collections import defaultdict
from typing import Any

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.enums import EdgeType, GraphLayer
from prospectus_docgraph.models.nodes import (
    DocumentNode,
    DocumentSectionInstanceNode,
    DocumentSubsectionInstanceNode,
)

from prospectus_docgraph.mining.models import (
    MinedCorpusSnapshot,
    SectionMinedStats,
    SubsectionMinedStats,
)


def _token_len(raw: str) -> int:
    return len((raw or "").split())


def _norm_sub_key(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a <= b else (b, a)


def collect_from_graph(
    manager: GraphManager,
    *,
    low_confidence_threshold: float = 0.88,
) -> MinedCorpusSnapshot:
    """
    Scan all Document/section/subsection instance nodes and build a :class:`MinedCorpusSnapshot`.

    Parameters
    ----------
    low_confidence_threshold
        Used to populate ``low_confidence_events`` for resolved instances.
    """
    doc_nodes: list[DocumentNode] = []
    for node in manager.iter_nodes_by_layer(GraphLayer.INSTANCE):
        if isinstance(node, DocumentNode):
            doc_nodes.append(node)

    total_documents = len(doc_nodes)

    # Per section id: aggregate
    doc_sets: dict[str, set[str]] = defaultdict(set)
    support_counts: dict[str, int] = defaultdict(int)
    order_sum: dict[str, float] = defaultdict(float)
    token_sum: dict[str, float] = defaultdict(float)
    conf_sum: dict[str, float] = defaultdict(float)
    pred_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    succ_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    cooc_section: dict[tuple[str, str], int] = defaultdict(int)
    transition_counts: dict[tuple[str, str], int] = defaultdict(int)

    # Subsection: parent_section_id -> subsection_id -> aggregates
    sub_doc_sets: dict[tuple[str, str], set[str]] = defaultdict(set)
    sub_support: dict[tuple[str, str], int] = defaultdict(int)
    sub_order_sum: dict[tuple[str, str], float] = defaultdict(float)
    sub_conf_sum: dict[tuple[str, str], float] = defaultdict(float)
    sub_cooc: dict[tuple[str, tuple[str, str]], int] = defaultdict(int)
    # key: (parent_section_id, sorted pair)

    low_confidence_events: list[dict[str, Any]] = []
    unmatched_headings: list[dict[str, Any]] = []

    for doc in doc_nodes:
        doc_id = doc.document_id
        sec_children = _section_instances_under_document(manager, doc.id)
        sec_children.sort(key=lambda s: s.order_index)

        ordered_canon: list[str | None] = []
        for sec in sec_children:
            cid = sec.canonical_section_id
            if cid is None or not manager.nx_graph.has_node(cid):
                if cid is not None and not manager.nx_graph.has_node(cid):
                    unmatched_headings.append(
                        {
                            "kind": "section",
                            "raw_title": sec.raw_title,
                            "normalized_title": sec.normalized_title,
                            "document_id": doc_id,
                            "match_method": sec.match_method,
                            "canonical_section_id": cid,
                        }
                    )
                elif cid is None:
                    unmatched_headings.append(
                        {
                            "kind": "section",
                            "raw_title": sec.raw_title,
                            "normalized_title": sec.normalized_title,
                            "document_id": doc_id,
                            "match_method": sec.match_method,
                        }
                    )
                ordered_canon.append(None)
                continue

            ordered_canon.append(cid)
            doc_sets[cid].add(doc_id)
            support_counts[cid] += 1
            order_sum[cid] += float(sec.order_index)
            token_sum[cid] += float(_token_len(sec.raw_title))
            conf_sum[cid] += float(sec.confidence)

            if sec.confidence < low_confidence_threshold and cid:
                low_confidence_events.append(
                    {
                        "kind": "section",
                        "canonical_id": cid,
                        "raw_title": sec.raw_title,
                        "normalized_title": sec.normalized_title,
                        "confidence": sec.confidence,
                        "match_method": sec.match_method,
                        "document_id": doc_id,
                    }
                )

        # Section co-occurrence (same document, unordered pairs)
        distinct = {c for c in ordered_canon if c is not None}
        for a, b in itertools.combinations(sorted(distinct), 2):
            cooc_section[(a, b)] += 1

        # Transitions (adjacent in TOC order)
        prev: str | None = None
        for c in ordered_canon:
            if c is None:
                prev = None
                continue
            if prev is not None:
                transition_counts[(prev, c)] += 1
                pred_counts[c][prev] += 1
                succ_counts[prev][c] += 1
            prev = c

        # Subsections per section instance
        for sec in sec_children:
            parent_c = sec.canonical_section_id
            subs = _subsection_instances_under_section(manager, sec.id)
            canon_subs: list[str | None] = []
            for sub in subs:
                sid = sub.canonical_subsection_id
                if sid is None or not manager.nx_graph.has_node(sid):
                    if sid is not None and not manager.nx_graph.has_node(sid):
                        unmatched_headings.append(
                            {
                                "kind": "subsection",
                                "raw_title": sub.raw_title,
                                "normalized_title": sub.normalized_title,
                                "document_id": doc_id,
                                "parent_section_instance_id": sec.id,
                                "match_method": sub.match_method,
                                "canonical_subsection_id": sid,
                            }
                        )
                    elif sid is None:
                        unmatched_headings.append(
                            {
                                "kind": "subsection",
                                "raw_title": sub.raw_title,
                                "normalized_title": sub.normalized_title,
                                "document_id": doc_id,
                                "parent_section_instance_id": sec.id,
                                "match_method": sub.match_method,
                            }
                        )
                    canon_subs.append(None)
                    continue

                parent_key = parent_c if parent_c is not None else "__unresolved__"
                sub_doc_sets[(parent_key, sid)].add(doc_id)
                sub_support[(parent_key, sid)] += 1
                sub_order_sum[(parent_key, sid)] += float(sub.order_index)
                sub_conf_sum[(parent_key, sid)] += float(sub.confidence)
                canon_subs.append(sid)

                if sub.confidence < low_confidence_threshold:
                    low_confidence_events.append(
                        {
                            "kind": "subsection",
                            "canonical_id": sid,
                            "parent_section_id": parent_key,
                            "raw_title": sub.raw_title,
                            "normalized_title": sub.normalized_title,
                            "confidence": sub.confidence,
                            "match_method": sub.match_method,
                            "document_id": doc_id,
                        }
                    )

            distinct_sub = {s for s in canon_subs if s is not None}
            for a, b in itertools.combinations(sorted(distinct_sub), 2):
                key = _norm_sub_key(a, b)
                parent_key = parent_c if parent_c is not None else "__unresolved__"
                sub_cooc[(parent_key, key)] += 1

    section_stats: dict[str, SectionMinedStats] = {}
    for sid, docs in doc_sets.items():
        n_inst = support_counts[sid]
        if n_inst == 0:
            continue
        # co-occurring sections: merge cooc_section into per-section
        cooc_for_sid: dict[str, int] = {}
        for (a, b), cnt in cooc_section.items():
            if a == sid:
                cooc_for_sid[b] = cooc_for_sid.get(b, 0) + cnt
            elif b == sid:
                cooc_for_sid[a] = cooc_for_sid.get(a, 0) + cnt

        section_stats[sid] = SectionMinedStats(
            section_id=sid,
            document_frequency=len(docs),
            support_count=n_inst,
            average_order_index=order_sum[sid] / n_inst,
            average_token_length=token_sum[sid] / n_inst,
            predecessor_counts=dict(pred_counts[sid]),
            successor_counts=dict(succ_counts[sid]),
            mean_mapping_confidence=conf_sum[sid] / n_inst,
            cooccurrence_counts=cooc_for_sid,
        )

    subsection_stats: dict[str, dict[str, SubsectionMinedStats]] = defaultdict(dict)
    for (parent_key, sub_id), docs in sub_doc_sets.items():
        n = sub_support[(parent_key, sub_id)]
        if n == 0:
            continue
        subsection_stats[parent_key][sub_id] = SubsectionMinedStats(
            parent_section_id=parent_key,
            subsection_id=sub_id,
            document_frequency=len(docs),
            support_count=n,
            average_order_index_within_parent=sub_order_sum[(parent_key, sub_id)] / n,
            mean_mapping_confidence=sub_conf_sum[(parent_key, sub_id)] / n,
            cooccurrence_with={},
        )

    for (parent_key, (a, b)), cnt in sub_cooc.items():
        pmap = subsection_stats.get(parent_key)
        if not pmap:
            continue
        if a in pmap:
            pmap[a].cooccurrence_with[b] = cnt
        if b in pmap:
            pmap[b].cooccurrence_with[a] = cnt

    return MinedCorpusSnapshot(
        total_documents=total_documents,
        section_stats=section_stats,
        subsection_stats=dict(subsection_stats),
        section_transition_counts=dict(transition_counts),
        low_confidence_events=low_confidence_events,
        unmatched_headings=unmatched_headings,
    )


def _section_instances_under_document(manager: GraphManager, doc_node_id: str) -> list[DocumentSectionInstanceNode]:
    out: list[DocumentSectionInstanceNode] = []
    for nid, et, _te in manager.get_neighbors(
        doc_node_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        node = manager.get_node(nid)
        if isinstance(node, DocumentSectionInstanceNode):
            out.append(node)
    return out


def _subsection_instances_under_section(
    manager: GraphManager,
    section_instance_id: str,
) -> list[DocumentSubsectionInstanceNode]:
    """
    Flat list of subsection instances whose direct parent is this section instance
    (same as Part 3 ingestion model).
    """
    out: list[DocumentSubsectionInstanceNode] = []
    for nid, et, _te in manager.get_neighbors(
        section_instance_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        node = manager.get_node(nid)
        if isinstance(node, DocumentSubsectionInstanceNode):
            out.append(node)
    return out
