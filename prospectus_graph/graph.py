from __future__ import annotations

from typing import Callable

from langgraph.graph import END, START, StateGraph

from prospectus_graph.state import SectionDraftState

NodeFn = Callable[[SectionDraftState], dict]


def build_section_graph(
    *,
    retriever_node: NodeFn,
    section_writer_agent: NodeFn,
    verifier_agent: NodeFn,
    revision_agent: NodeFn,
    assembler_node: NodeFn,
    planner_node: NodeFn | None = None,
):
    """
    Build the LangGraph for section drafting.

    Flow: Retriever → [Planner] → Section Writer → Verifier → Revision/Assembler
    If planner_node is provided, it runs between retriever and section_writer.
    """

    graph = StateGraph(SectionDraftState)
    graph.add_node("retriever", retriever_node)
    graph.add_node("section_writer", section_writer_agent)
    graph.add_node("verifier", verifier_agent)
    graph.add_node("revision", revision_agent)
    graph.add_node("assembler", assembler_node)

    graph.add_edge(START, "retriever")
    if planner_node is not None:
        graph.add_node("planner", planner_node)
        graph.add_edge("retriever", "planner")
        graph.add_edge("planner", "section_writer")
    else:
        graph.add_edge("retriever", "section_writer")
    graph.add_edge("section_writer", "verifier")
    graph.add_conditional_edges(
        "verifier",
        _route_after_verifier,
        {
            "revision": "revision",
            "assembler": "assembler",
        },
    )
    graph.add_edge("revision", "verifier")
    graph.add_edge("assembler", END)

    return graph.compile()


def _route_after_verifier(state: SectionDraftState) -> str:
    if state.get("should_revise"):
        return "revision"
    return "assembler"
