from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePath

from .model import ArchitectureGraph, Edge


@dataclass(frozen=True)
class Finding:
    policy_id: str
    severity: str
    message: str
    evidence: str
    edge: Edge

    @property
    def blocking(self) -> bool:
        return self.severity == "block"


def _context(graph: ArchitectureGraph, identifier: str) -> str:
    node = graph.nodes[identifier]
    return (node.context or PurePath(node.name).parts[0]).lower().replace(" ", "")


def _approved(graph: ArchitectureGraph) -> dict[tuple[str, str], Edge]:
    return {
        (_context(graph, edge.source), _context(graph, edge.target)): edge
        for edge in graph.edges if edge.tier == "hld"
    }


def evaluate(graph: ArchitectureGraph, changed_artifacts: set[str] | None = None) -> list[Finding]:
    """Deterministically evaluate parser-derived facts; never infer edges."""
    findings: list[Finding] = []
    approved = _approved(graph)
    realized: set[tuple[str, str]] = set()
    for edge in graph.edges:
        if edge.tier != "lld" or edge.relation not in {"CALLS", "DEPLOYS_WITH"}:
            continue
        pair = (_context(graph, edge.source), _context(graph, edge.target))
        if pair in approved:
            realized.add(pair)
        if changed_artifacts and edge.evidence.artifact not in changed_artifacts:
            continue
        if pair[0] == pair[1]:
            continue
        declared = approved.get(pair)
        if not declared:
            severity = "block" if edge.evidence.confidence >= 0.9 else "advisory"
            findings.append(Finding(
                "ARC-DEP-002", severity,
                f"Undeclared cross-context dependency: {pair[0]} → {pair[1]}.",
                edge.evidence.location, edge,
            ))
            continue
        if declared.mode and edge.mode and declared.mode != edge.mode:
            findings.append(Finding(
                "ARC-COM-003", "block",
                f"Communication mode is {edge.mode}; declared architecture requires {declared.mode}.",
                edge.evidence.location, edge,
            ))
    for pair, declared in approved.items():
        if pair not in realized:
            findings.append(Finding(
                "ARC-PHA-006", "inform",
                f"Declared relationship {pair[0]} → {pair[1]} has no implementation evidence.",
                declared.evidence.location, declared,
            ))
    return findings


def validated_sync_patch(graph: ArchitectureGraph, finding: Finding) -> str | None:
    """Return only a suggestion which clears its deterministic finding in-memory."""
    if finding.policy_id != "ARC-DEP-002" or finding.edge.evidence.confidence < 0.9:
        return None
    source_context = _context(graph, finding.edge.source)
    target_context = _context(graph, finding.edge.target)
    hld_nodes = {
        _context(graph, identifier): identifier
        for identifier, node in graph.nodes.items() if node.tier == "hld"
    }
    source = hld_nodes.get(source_context)
    target = hld_nodes.get(target_context)
    if not source or not target:
        return None
    candidate = graph.copy()
    candidate.add_edge(Edge(
        source, target, "hld", "ALLOWS", finding.edge.mode,
        finding.edge.evidence,
    ))
    remaining = evaluate(candidate)
    if any(item.policy_id == finding.policy_id and item.evidence == finding.evidence for item in remaining):
        return None
    return (
        f'{graph.nodes[source].name} -> {graph.nodes[target].name} '
        f'"Declared implementation dependency" "{finding.edge.mode or "unknown"}"'
    )
