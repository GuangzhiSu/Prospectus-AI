from __future__ import annotations

from typing import Callable

from langgraph.graph import END, START, StateGraph

from prospectus_graph.state import SectionDraftState

NodeFn = Callable[[SectionDraftState], dict]


def build_section_graph(
    *,
    retriever_node: NodeFn,
    section_writer_node: NodeFn,
    verifier_node: NodeFn,
    assembler_node: NodeFn,
):
    """
    Build the fixed LangGraph used for section drafting.

    Planner is intentionally omitted because the repository already maintains
    per-section drafting requirements in configuration.
    """

    graph = StateGraph(SectionDraftState)
    graph.add_node("retriever", retriever_node)
    graph.add_node("section_writer", section_writer_node)
    graph.add_node("verifier", verifier_node)
    graph.add_node("assembler", assembler_node)

    graph.add_edge(START, "retriever")
    graph.add_edge("retriever", "section_writer")
    graph.add_edge("section_writer", "verifier")
    graph.add_edge("verifier", "assembler")
    graph.add_edge("assembler", END)

    return graph.compile()
