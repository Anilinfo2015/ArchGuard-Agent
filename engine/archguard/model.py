from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Evidence:
    artifact: str
    line: int | None = None
    confidence: float = 1.0


@dataclass(frozen=True)
class Node:
    id: str
    name: str
    tier: str  # hld or lld
    kind: str
    evidence: Evidence
    context: str | None = None


@dataclass(frozen=True)
class Edge:
    source: str
    target: str
    tier: str
    relation: str
    mode: str | None
    evidence: Evidence
    metadata: dict[str, str] = field(default_factory=dict)


class ArchitectureGraph:
    """Small, dependency-free graph with evidence on every fact."""

    def __init__(self) -> None:
        self.nodes: dict[str, Node] = {}
        self.edges: list[Edge] = []

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node

    def add_edge(self, edge: Edge) -> None:
        if edge.source not in self.nodes or edge.target not in self.nodes:
            raise ValueError(f"edge references unknown nodes: {edge.source} -> {edge.target}")
        self.edges.append(edge)

    def copy(self) -> "ArchitectureGraph":
        result = ArchitectureGraph()
        result.nodes = self.nodes.copy()
        result.edges = self.edges.copy()
        return result

