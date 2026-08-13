import json
import unittest
from datetime import date
from pathlib import Path

from archguard.model import ArchitectureGraph, Edge, Evidence, Node
from archguard.policy import RuleError, fixture_graph, load_rules, parse_rule
from archguard.predicates import ERROR, FAIL, PASS, SKIPPED, UNKNOWN, evaluate_rule

CATALOG = Path(__file__).resolve().parent.parent / "governance" / "catalog"

COMPILED = {
    "id": "TST-001",
    "title": "Web must not depend on legacy",
    "tier": "team",
    "owner": "web",
    "scope": ["tag:web"],
    "type": "structural",
    "severity": "high",
    "mode": "blocking",
    "evidence": "architecture-model",
    "review_by": "2099-01-01",
    "body": "The web tier must not depend on the legacy platform.",
    "predicate": {"primitive": "may-not-depend-on", "source": ["tag:web"], "target": ["tag:legacy"]},
}


def rule(**overrides):
    document = json.loads(json.dumps(COMPILED))
    predicate = overrides.pop("predicate", None)
    if predicate:
        document["predicate"].update(predicate)
    document.update(overrides)
    return parse_rule(document, "tests")


def graph_with(*, tags=(("web", "web"), ("legacy", "legacy")), edges=(), source="architecture-model"):
    graph = ArchitectureGraph()
    graph.sources.add(source)
    for identifier, tag in tags:
        graph.add_node(Node(identifier, identifier, "hld", "container", Evidence("workspace.json"), None, (tag,)))
    for edge in edges:
        graph.add_edge(edge)
    return graph


def hld_edge(source, target, mode="sync", line=7):
    return Edge(source, target, "hld", "ALLOWS", mode, Evidence("workspace.json", line))


class CatalogFixtureTests(unittest.TestCase):
    """Every catalog rule ships an architecture it must pass and one it must fail."""

    def test_every_catalog_rule_replays_its_fixtures(self) -> None:
        rules = load_rules(CATALOG)
        self.assertTrue(rules, "the starter catalog must not be empty")
        for compiled in rules:
            self.assertTrue(compiled.fixtures, f"{compiled.id} ships no fixtures")
            self.assertEqual(
                {fixture.expect for fixture in compiled.fixtures}, {PASS, FAIL},
                f"{compiled.id} needs both a passing and a failing fixture",
            )
            for fixture in compiled.fixtures:
                with self.subTest(rule=compiled.id, fixture=fixture.name):
                    result = evaluate_rule(fixture_graph(fixture, compiled.evidence), compiled)
                    self.assertEqual(result.verdict, fixture.expect, result.reason)

    def test_catalog_rules_are_not_overdue_for_review(self) -> None:
        for compiled in load_rules(CATALOG):
            self.assertFalse(compiled.review_overdue(date.today()), f"{compiled.id} is overdue for review")


class VerdictTests(unittest.TestCase):
    def test_observed_dependency_fails_with_file_line_evidence(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy")])

        result = evaluate_rule(graph, rule())

        self.assertEqual(result.verdict, FAIL)
        self.assertTrue(result.blocking)
        self.assertEqual(result.findings[0].evidence, "workspace.json:7")

    def test_advisory_failure_does_not_block(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy")])

        self.assertFalse(evaluate_rule(graph, rule(mode="advisory")).blocking)

    def test_absent_dependency_passes(self) -> None:
        self.assertEqual(evaluate_rule(graph_with(), rule()).verdict, PASS)

    def test_vacuous_scope_is_unknown_never_pass(self) -> None:
        graph = graph_with(tags=(("legacy", "legacy"),))

        result = evaluate_rule(graph, rule())

        self.assertEqual(result.verdict, UNKNOWN)
        self.assertIn("matched no elements", result.reason)

    def test_vacuous_target_is_unknown_never_pass(self) -> None:
        graph = graph_with(tags=(("web", "web"),))

        self.assertEqual(evaluate_rule(graph, rule()).verdict, UNKNOWN)

    def test_unbound_evidence_provider_is_unknown_never_pass(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy")])

        result = evaluate_rule(graph, rule(evidence="infrastructure-plan"))

        self.assertEqual(result.verdict, UNKNOWN)
        self.assertIn("was not supplied", result.reason)

    def test_unqualified_mode_cannot_prove_a_synchronous_dependency(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy", mode=None)])

        result = evaluate_rule(graph, rule(predicate={"mode": "sync"}))

        self.assertEqual(result.verdict, UNKNOWN)

    def test_mode_qualifier_ignores_a_different_mode(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy", mode="async")])

        self.assertEqual(evaluate_rule(graph, rule(predicate={"mode": "sync"})).verdict, PASS)

    def test_operational_rules_are_skipped_at_pull_request_time(self) -> None:
        result = evaluate_rule(graph_with(), rule(type="operational"))

        self.assertEqual(result.verdict, SKIPPED)
        self.assertFalse(result.blocking)

    def test_unresolvable_selector_is_an_error_and_blocks(self) -> None:
        result = evaluate_rule(graph_with(), rule(scope=["stereotype:controller"]))

        self.assertEqual(result.verdict, ERROR)
        self.assertTrue(result.blocking)

    def test_overdue_review_is_reported_without_changing_the_verdict(self) -> None:
        result = evaluate_rule(graph_with(), rule(review_by="2020-01-01"))

        self.assertTrue(result.review_overdue)
        self.assertEqual(result.verdict, PASS)


class TransitiveTests(unittest.TestCase):
    def test_transitive_reachability_reports_the_offending_path(self) -> None:
        graph = graph_with(
            tags=(("web", "web"), ("shared", "shared"), ("legacy", "legacy")),
            edges=[hld_edge("web", "shared", line=3), hld_edge("shared", "legacy", line=9)],
        )

        result = evaluate_rule(graph, rule(predicate={"transitive": True}))

        self.assertEqual(result.verdict, FAIL)
        self.assertEqual(result.findings[0].path, ("workspace.json:3", "workspace.json:9"))
        self.assertIn("web → shared → legacy", result.findings[0].message)

    def test_transitive_with_a_mode_qualifier_is_rejected_as_an_error(self) -> None:
        graph = graph_with(edges=[hld_edge("web", "legacy")])

        self.assertEqual(evaluate_rule(graph, rule(predicate={"transitive": True, "mode": "sync"})).verdict, ERROR)


class BudgetTests(unittest.TestCase):
    def budget_rule(self, budget=1, metric="fan-out"):
        return rule(predicate={"primitive": "must-not-exceed", "selector": ["tag:web"],
                               "metric": metric, "budget": budget})

    def test_fan_out_above_budget_fails(self) -> None:
        graph = graph_with(
            tags=(("web", "web"), ("a", "other"), ("b", "other")),
            edges=[hld_edge("web", "a"), hld_edge("web", "b")],
        )

        result = evaluate_rule(graph, self.budget_rule())

        self.assertEqual(result.verdict, FAIL)
        self.assertIn("proxy", result.findings[0].message)

    def test_repeated_edges_count_once(self) -> None:
        graph = graph_with(
            tags=(("web", "web"), ("a", "other")),
            edges=[hld_edge("web", "a"), hld_edge("web", "a", line=8)],
        )

        self.assertEqual(evaluate_rule(graph, self.budget_rule()).verdict, PASS)

    def test_negative_budget_is_an_error(self) -> None:
        self.assertEqual(evaluate_rule(graph_with(), self.budget_rule(budget=-1)).verdict, ERROR)

    def test_unsupported_metric_is_an_error(self) -> None:
        self.assertEqual(evaluate_rule(graph_with(), self.budget_rule(metric="cost")).verdict, ERROR)


class SchemaTests(unittest.TestCase):
    def test_missing_field_is_rejected(self) -> None:
        document = json.loads(json.dumps(COMPILED))
        del document["owner"]

        with self.assertRaises(RuleError):
            parse_rule(document, "tests")

    def test_primitive_outside_the_closed_set_is_rejected(self) -> None:
        document = json.loads(json.dumps(COMPILED))
        document["predicate"] = {"primitive": "must-not-call-eval"}

        with self.assertRaises(RuleError):
            parse_rule(document, "tests")

    def test_non_iso_review_date_is_rejected(self) -> None:
        document = json.loads(json.dumps(COMPILED))
        document["review_by"] = "next year"

        with self.assertRaises(RuleError):
            parse_rule(document, "tests")

    def test_rules_load_from_a_directory_in_id_order(self) -> None:
        self.assertEqual([item.id for item in load_rules(CATALOG)], sorted(item.id for item in load_rules(CATALOG)))


if __name__ == "__main__":
    unittest.main()
