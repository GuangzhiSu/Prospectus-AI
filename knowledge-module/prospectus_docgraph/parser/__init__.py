"""Parsed document structure (headings); PDF extraction is out of scope for Part 2."""

from prospectus_docgraph.parser.interfaces import ParsedHeading, ProspectusParser
from prospectus_docgraph.parser.structure import (
    ParsedChunk,
    ParsedDocument,
    ParsedHeadingBase,
    ParsedSection,
    ParsedSubsection,
)

__all__ = [
    "ParsedHeading",
    "ProspectusParser",
    "ParsedHeadingBase",
    "ParsedDocument",
    "ParsedSection",
    "ParsedSubsection",
    "ParsedChunk",
]
