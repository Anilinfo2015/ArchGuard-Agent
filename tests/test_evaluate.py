import unittest

from archguard.evaluate import evaluate, validated_sync_patch
from archguard.model import ArchitectureGraph, Edge, Evidence, Node


def graph_with_nodes() -> ArchitectureGraph:
    graph = ArchitectureGraph()
    for identifier, name, tier, context in (
        ("hld:order", "order", "hld", "order"),
        ("hld:inventory", "inventory", "hld", "inventory"),
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

    def test_mode_mismatch_blocks_and_patch_is_validated(self) -> None:
        graph = graph_with_nodes()
        graph.add_edge(Edge("hld:order", "hld:inventory", "hld", "ALLOWS", "async", Evidence("workspace.json")))
        graph.add_edge(Edge("lld:order", "lld:legacy", "lld", "CALLS", "sync", Evidence("client.ts", 18)))
        findings = evaluate(graph)

        self.assertEqual(findings[0].policy_id, "ARC-DEP-002")
        self.assertEqual(
            validated_sync_patch(graph, findings[0]),
            'src/order/client.ts -> src/legacy/client.ts "Declared implementation dependency" "sync"',
        )
        self.assertTrue(any(finding.policy_id == "ARC-PHA-006" for finding in findings))


if __name__ == "__main__":
    unittest.main()
