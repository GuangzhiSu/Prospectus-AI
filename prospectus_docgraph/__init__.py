"""
Schema-first structural knowledge graph for HKEX technology IPO prospectuses.

Models *document organization*, not issuer-specific facts. Lives in ``prospectus_docgraph``
to avoid clashing with the legacy ``prospectus_graph`` Agent2 package (which has ``graph.py``).
"""

from prospectus_docgraph.graph.manager import GraphManager
from prospectus_docgraph.models.enums import EdgeType, NodeType
from prospectus_docgraph.schema.seed import seed_canonical_sections

__all__ = [
    "NodeType",
    "EdgeType",
    "GraphManager",
    "seed_canonical_sections",
    "__version__",
]

__version__ = "0.2.0"
