"""Orchestrate all Part 5 exports into JSON / JSONL / CSV artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from prospectus_docgraph.export.alias_dataset import AliasTrainingExporter
from prospectus_docgraph.export.generator_examples import GeneratorTrainingExporter
from prospectus_docgraph.export.models import (
    AliasTrainingRecord,
    GeneratorTrainingExample,
    PlannerTrainingExample,
    SectionSchemaCard,
)
from prospectus_docgraph.export.planner_examples import PlannerTrainingExporter
from prospectus_docgraph.export.schema_cards import SectionSchemaCardExporter
from prospectus_docgraph.export.serializers import (
    pydantic_to_jsonl,
    write_csv,
    write_json,
)
from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.parser.structure import ParsedDocument


@dataclass
class ExportConfig:
    """Which serializers to emit under ``output_dir``."""

    formats: tuple[str, ...] = ("json", "jsonl", "csv")
    alias_low_confidence_threshold: float = 0.88


class TrainingDataBundleExporter:
    """
    Export schema cards, planner rows, generator rows, and alias review records.

    Parsed documents are optional; when provided, generator/planner fields that depend on
    body text or ``metadata.conditions`` are filled.
    """

    def __init__(self, config: ExportConfig | None = None) -> None:
        self.config = config if config is not None else ExportConfig()

    def export_all(
        self,
        manager: GraphManager,
        output_dir: Path,
        parsed_by_doc: dict[str, ParsedDocument] | None = None,
    ) -> dict[str, Any]:
        output_dir.mkdir(parents=True, exist_ok=True)
        parsed_by_doc = parsed_by_doc or {}
        cards = SectionSchemaCardExporter().export_records(manager)
        planners = PlannerTrainingExporter().export_records(manager, parsed_by_doc)
        gens = GeneratorTrainingExporter().export_records(manager, parsed_by_doc)
        aliases = AliasTrainingExporter(
            low_confidence_threshold=self.config.alias_low_confidence_threshold,
        ).export_records(manager)

        summary: dict[str, Any] = {
            "section_schema_cards": len(cards),
            "planner_examples": len(planners),
            "generator_examples": len(gens),
            "alias_records": len(aliases),
            "output_dir": str(output_dir),
        }

        fmt = set(self.config.formats)
        if "json" in fmt:
            write_json(output_dir / "section_schema_cards.json", [c.model_dump() for c in cards])
            write_json(output_dir / "planner_training.json", [p.model_dump() for p in planners])
            write_json(output_dir / "generator_training.json", [g.model_dump() for g in gens])
            write_json(output_dir / "alias_training.json", [a.model_dump() for a in aliases])
            write_json(output_dir / "export_summary.json", summary)

        if "jsonl" in fmt:
            pydantic_to_jsonl(output_dir / "section_schema_cards.jsonl", cards)
            pydantic_to_jsonl(output_dir / "planner_training.jsonl", planners)
            pydantic_to_jsonl(output_dir / "generator_training.jsonl", gens)
            pydantic_to_jsonl(output_dir / "alias_training.jsonl", aliases)

        if "csv" in fmt:
            self._write_csv_tables(output_dir, cards, planners, gens, aliases)

        return summary

    def _write_csv_tables(
        self,
        output_dir: Path,
        cards: list[SectionSchemaCard],
        planners: list[PlannerTrainingExample],
        gens: list[GeneratorTrainingExample],
        aliases: list[AliasTrainingRecord],
    ) -> None:
        write_csv(
            output_dir / "section_schema_cards_summary.csv",
            [
                {
                    "section_id": c.section_id,
                    "canonical_name": c.canonical_name,
                    "mandatory": c.mandatory,
                    "typical_order_index": c.typical_order_index,
                    "num_common_subsections": len(c.common_subsections),
                    "num_optional_subsections": len(c.optional_subsections),
                    "num_predecessors": len(c.typical_predecessors),
                    "num_successors": len(c.typical_successors),
                }
                for c in cards
            ],
            fieldnames=[
                "section_id",
                "canonical_name",
                "mandatory",
                "typical_order_index",
                "num_common_subsections",
                "num_optional_subsections",
                "num_predecessors",
                "num_successors",
            ],
        )
        write_csv(
            output_dir / "planner_training_summary.csv",
            [
                {
                    "document_id": p.document_id,
                    "canonical_section": p.canonical_section,
                    "section_instance_id": p.section_instance_id,
                    "num_subsections": len(p.observed_subsections),
                    "missing_count": len(p.missing_canonical_subsections),
                    "page_start": p.page_start,
                    "page_end": p.page_end,
                }
                for p in planners
            ],
            fieldnames=[
                "document_id",
                "canonical_section",
                "section_instance_id",
                "num_subsections",
                "missing_count",
                "page_start",
                "page_end",
            ],
        )
        write_csv(
            output_dir / "generator_training_summary.csv",
            [
                {
                    "document_id": g.document_id,
                    "instance_kind": g.instance_kind,
                    "canonical_section": g.canonical_section,
                    "canonical_subsection": g.canonical_subsection,
                    "text_len": len(g.text or ""),
                }
                for g in gens
            ],
            fieldnames=[
                "document_id",
                "instance_kind",
                "canonical_section",
                "canonical_subsection",
                "text_len",
            ],
        )
        write_csv(
            output_dir / "alias_training_summary.csv",
            [
                {
                    "kind": a.kind,
                    "document_id": a.document_id,
                    "canonical_id": a.canonical_id,
                    "confidence": a.confidence,
                    "reason": a.reason,
                }
                for a in aliases
            ],
            fieldnames=["kind", "document_id", "canonical_id", "confidence", "reason"],
        )
