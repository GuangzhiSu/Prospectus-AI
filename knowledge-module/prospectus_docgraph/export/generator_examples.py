"""Generator training examples (section + subsection instances with text when available)."""

from __future__ import annotations

from prospectus_docgraph.export.models import GeneratorTrainingExample
from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.enums import EdgeType, GraphLayer
from prospectus_docgraph.models.nodes import (
    DocumentNode,
    DocumentSectionInstanceNode,
    DocumentSubsectionInstanceNode,
)
from prospectus_docgraph.parser.structure import ParsedDocument, ParsedSection, ParsedSubsection


class GeneratorTrainingExporter:
    """Emit one record per section instance and per subsection instance."""

    def export_records(
        self,
        manager: GraphManager,
        parsed_by_doc: dict[str, ParsedDocument] | None = None,
    ) -> list[GeneratorTrainingExample]:
        parsed_by_doc = parsed_by_doc or {}
        out: list[GeneratorTrainingExample] = []
        for node in manager.iter_nodes_by_layer(GraphLayer.INSTANCE):
            if not isinstance(node, DocumentNode):
                continue
            parsed = parsed_by_doc.get(node.document_id)
            secs = _section_instances_under_document(manager, node.id)
            secs.sort(key=lambda s: s.order_index)
            for sec in secs:
                ps = _match_parsed_section(parsed, sec)
                out.append(self._section_example(sec, ps))
                subs = _subsection_instances_under_section(manager, sec.id)
                subs.sort(key=lambda s: s.order_index)
                flat = _flatten_parsed_subsections(ps) if ps is not None else []
                for i, sub in enumerate(subs):
                    psub = flat[i] if i < len(flat) else None
                    out.append(self._subsection_example(sec, sub, ps, psub))
        return out

    def _section_example(
        self,
        sec: DocumentSectionInstanceNode,
        ps: ParsedSection | None,
    ) -> GeneratorTrainingExample:
        text = ps.text if ps is not None else ""
        return GeneratorTrainingExample(
            document_id=sec.document_id,
            instance_id=sec.id,
            instance_kind="section",
            canonical_section=sec.canonical_section_id,
            canonical_subsection=None,
            raw_title=sec.raw_title,
            text=text,
            parent_context="",
            structural_tags=["DocumentSectionInstance", "section_body"],
            ordering_tags={
                "order_index": sec.order_index,
                "depth": 0,
            },
        )

    def _subsection_example(
        self,
        sec: DocumentSectionInstanceNode,
        sub: DocumentSubsectionInstanceNode,
        ps: ParsedSection | None,
        psub: ParsedSubsection | None,
    ) -> GeneratorTrainingExample:
        text = psub.text if psub is not None else ""
        parent_ctx = sec.raw_title
        if ps is not None and ps.parent_title:
            parent_ctx = f"{ps.parent_title} > {sec.raw_title}"
        tags = [
            "DocumentSubsectionInstance",
            "subsection_body",
        ]
        if sub.canonical_subsection_id:
            tags.append(f"canonical_sub:{sub.canonical_subsection_id}")
        return GeneratorTrainingExample(
            document_id=sub.document_id,
            instance_id=sub.id,
            instance_kind="subsection",
            canonical_section=sec.canonical_section_id,
            canonical_subsection=sub.canonical_subsection_id,
            raw_title=sub.raw_title,
            text=text,
            parent_context=parent_ctx,
            structural_tags=tags,
            ordering_tags={
                "order_index": sub.order_index,
                "depth": 1 + sub.instance_key.count("."),
            },
        )


def _match_parsed_section(
    parsed: ParsedDocument | None,
    sec: DocumentSectionInstanceNode,
) -> ParsedSection | None:
    if parsed is None:
        return None
    cid = sec.canonical_section_id
    if cid:
        for p in parsed.sections:
            if p.canonical_section == cid:
                return p
    idx = sec.order_index
    if 0 <= idx < len(parsed.sections):
        return parsed.sections[idx]
    return None


def _flatten_parsed_subsections(ps: ParsedSection) -> list[ParsedSubsection]:
    out: list[ParsedSubsection] = []

    def walk(p: ParsedSubsection) -> None:
        out.append(p)
        for c in p.subsections:
            walk(c)

    for top in ps.subsections:
        walk(top)
    return out


def _section_instances_under_document(manager: GraphManager, doc_id: str) -> list[DocumentSectionInstanceNode]:
    out: list[DocumentSectionInstanceNode] = []
    for nid, _t, _e in manager.get_neighbors(
        doc_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        n = manager.get_node(nid)
        if isinstance(n, DocumentSectionInstanceNode):
            out.append(n)
    return out


def _subsection_instances_under_section(
    manager: GraphManager,
    section_instance_id: str,
) -> list[DocumentSubsectionInstanceNode]:
    out: list[DocumentSubsectionInstanceNode] = []
    for nid, _t, _e in manager.get_neighbors(
        section_instance_id,
        direction="out",
        edge_types={EdgeType.HAS_CHILD_INSTANCE},
    ):
        n = manager.get_node(nid)
        if isinstance(n, DocumentSubsectionInstanceNode):
            out.append(n)
    return out
