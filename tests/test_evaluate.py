import unittest

from archguard.evaluate import evaluate, validated_sync_patch
from archguard.model import ArchitectureGraph, Edge, Evidence, Node


def graph_with_nodes() -> ArchitectureGraph:
    graph = ArchitectureGraph()
    for identifier, name, tier, context in (
        ("hld:order", "order", "hld", "order"),
        ("hld:legacy", "legacy", "hld", "legacy"),
        ("lld:order", "src/order/client.ts", "lld", "order"),
        ("lld:legacy", "src/legacy/client.ts", "lld", "legacy"),
    ):
        graph.add_node(Node(identifier, name, tier, "module", Evidence("model.dsl"), context))
    return graph


class EvaluateTests(unittest.TestCase):
    def test_blocks_high_confidence_undeclared_dependency(self) -> None:
        graph = graph_with_nodes()
        edge = Edge("lld:order", "lld:legacy", "lld", "CALLS", "sync", Evidence("src/order/client.ts", 18))
        graph.add_edge(edge)

        finding = evaluate(graph)[0]

        self.assertEqual(finding.policy_id, "ARC-DEP-002")
        self.assertTrue(finding.blocking)
        self.assertEqual(finding.evidence, "src/order/client.ts:18")

    def test_low_confidence_dependency_is_advisory(self) -> None:
        graph = graph_with_nodes()
        graph.add_edge(Edge("lld:order", "lld:legacy", "lld", "CALLS", "sync", Evidence("client.ts", 1, 0.7)))

        self.assertEqual(evaluate(graph)[0].severity, "advisory")

    def test_mode_mismatch_blocks(self) -> None:
        graph = graph_with_nodes()
        graph.add_edge(Edge("hld:order", "hld:legacy", "hld", "ALLOWS", "async", Evidence("workspace.json")))
        graph.add_edge(Edge("lld:order", "lld:legacy", "lld", "CALLS", "sync", Evidence("client.ts", 18)))
        findings = evaluate(graph)

        self.assertEqual(findings[0].policy_id, "ARC-COM-003")

    def test_patch_is_validated_against_hld_nodes(self) -> None:
        graph = graph_with_nodes()
        graph.add_edge(Edge("lld:order", "lld:legacy", "lld", "CALLS", "sync", Evidence("client.ts", 18)))
        finding = evaluate(graph)[0]

        self.assertEqual(
            validated_sync_patch(graph, finding),
            'order -> legacy "Declared implementation dependency" "sync"',
        )


if __name__ == "__main__":
    unittest.main()
