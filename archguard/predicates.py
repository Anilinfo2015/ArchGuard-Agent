"""Deterministic replay of compiled predicates: the gate decision, with no model in it.

Every rule resolves to one of five verdicts. A rule that finds nothing to check
is `UNKNOWN`, never `PASS`, because vacuous truth is how an architecture gate
quietly stops working.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import date
from fnmatch import fnmatchcase
from pathlib import PurePath
from typing import Any, Callable, Iterable

from .model import ArchitectureGraph, Edge, Node
from .policy import Rule

PASS = "PASS"
FAIL = "FAIL"
UNKNOWN = "UNKNOWN"
ERROR = "ERROR"
SKIPPED = "SKIPPED"

#: Types this evaluator deliberately never decides at pull-request time.
DEFERRED_TYPES = {
    "operational": "operational rules are reported as a trend on a schedule and never gate a pull request",
    "holistic": "holistic and trade-off rules are routed to the architecture review board",
}

#: Which observed edges each declared evidence source is allowed to be derived from.
EDGE_FILTERS: dict[str, Callable[[Edge], bool]] = {
    "architecture-model": lambda edge: edge.tier == "hld",
    "implementation": lambda edge: edge.tier == "lld" and edge.relation == "CALLS",
    "infrastructure-plan": lambda edge: edge.tier == "lld" and edge.relation == "DEPLOYS_WITH",
}

SELECTOR_KINDS = ("tag", "name", "context", "path", "system", "container", "component", "person")


class SelectorError(ValueError):
    """A selector we cannot resolve; never silently treated as matching nothing."""


@dataclass(frozen=True)
class RuleFinding:
    message: str
    evidence: str
    path: tuple[str, ...] = ()


@dataclass(frozen=True)
class RuleResult:
    rule: Rule
    verdict: str
    reason: str
    findings: tuple[RuleFinding, ...] = ()
    review_overdue: bool = False

    @property
    def blocking(self) -> bool:
        """Errors always block the check; findings block only where the rule says so."""
        if self.verdict == ERROR:
            return True
        return self.verdict == FAIL and self.rule.blocking


def _context(node: Node) -> str:
    return (node.context or PurePath(node.name).parts[0]).lower().replace(" ", "")


def _matches(node: Node, selector: str) -> bool:
    kind, separator, value = selector.partition(":")
    if not separator:
        raise SelectorError(f"selector {selector!r} must be written as '<kind>:<value>'")
    kind, value = kind.strip().lower(), value.strip()
    if kind not in SELECTOR_KINDS:
        raise SelectorError(f"unsupported selector kind {kind!r}; expected one of {list(SELECTOR_KINDS)}")
    if kind == "tag":
        return any(tag.lower() == value.lower() for tag in node.tags)
    if kind == "name":
        return node.name.lower() == value.lower()
    if kind == "context":
        return _context(node) == value.lower().replace(" ", "")
    if kind == "path":
        return fnmatchcase(node.name, value)
    return node.kind.lower() == kind and node.name.lower() == value.lower()


def resolve(graph: ArchitectureGraph, selectors: Iterable[str]) -> set[str]:
    selectors = list(selectors)
    return {
        identifier for identifier, node in graph.nodes.items()
        if any(_matches(node, selector) for selector in selectors)
    }


def _selectors(predicate: dict[str, Any], key: str) -> list[str]:
    value = predicate.get(key)
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list) or not value or not all(isinstance(item, str) for item in value):
        raise SelectorError(f"predicate field {key!r} must be a non-empty list of selectors")
    return value


def _describe(graph: ArchitectureGraph, identifier: str) -> str:
    return graph.nodes[identifier].name


def _paths(graph: ArchitectureGraph, edges: list[Edge], sources: set[str], targets: set[str]) -> list[list[Edge]]:
    """Shortest observed path from each source into the target set, breadth first."""
    outgoing: dict[str, list[Edge]] = {}
    for edge in edges:
        outgoing.setdefault(edge.source, []).append(edge)
    results: list[list[Edge]] = []
    for start in sorted(sources):
        seen = {start}
        queue: deque[tuple[str, list[Edge]]] = deque([(start, [])])
        while queue:
            current, trail = queue.popleft()
            if trail and current in targets:
                results.append(trail)
                break
            for edge in outgoing.get(current, []):
                if edge.target in seen:
                    continue
                seen.add(edge.target)
                queue.append((edge.target, trail + [edge]))
    return results


MODE_PHRASES = {"sync": "synchronously", "async": "asynchronously"}


def _finding_for_path(graph: ArchitectureGraph, rule: Rule, trail: list[Edge]) -> RuleFinding:
    names = [_describe(graph, trail[0].source)] + [_describe(graph, edge.target) for edge in trail]
    mode = rule.predicate.get("mode")
    qualifier = f" {MODE_PHRASES.get(mode, f'via {mode}')}" if mode else ""
    return RuleFinding(
        f"{names[0]} must not depend{qualifier} on {names[-1]}: {' → '.join(names)}.",
        trail[0].evidence.location, tuple(edge.evidence.location for edge in trail),
    )


def _may_not_depend_on(graph: ArchitectureGraph, rule: Rule, edges: list[Edge],
                       sources: set[str]) -> tuple[str, str, list[RuleFinding]]:
    predicate = rule.predicate
    targets = resolve(graph, _selectors(predicate, "target"))
    if not targets:
        return UNKNOWN, "the target selector matched no elements, so the rule proves nothing", []
    required_mode = predicate.get("mode")
    if required_mode is not None and not isinstance(required_mode, str):
        raise SelectorError("predicate field 'mode' must be a string when present")
    if predicate.get("transitive"):
        if required_mode:
            raise SelectorError("a mode qualifier cannot be combined with transitive reachability")
        reachable = [_finding_for_path(graph, rule, trail) for trail in _paths(graph, edges, sources, targets)]
        return (FAIL if reachable else PASS), "", reachable
    findings: list[RuleFinding] = []
    undetermined = 0
    for edge in edges:
        if edge.source not in sources or edge.target not in targets:
            continue
        if required_mode and edge.mode is None:
            undetermined += 1
            continue
        if required_mode and edge.mode != required_mode:
            continue
        findings.append(_finding_for_path(graph, rule, [edge]))
    if findings:
        return FAIL, "", findings
    if undetermined:
        return UNKNOWN, (
            f"{undetermined} observed dependencies carry no communication mode, "
            f"so a {required_mode} dependency can be neither proven nor excluded"
        ), []
    return PASS, "", []


def _must_cross_via(graph: ArchitectureGraph, rule: Rule, edges: list[Edge],
                    sources: set[str]) -> tuple[str, str, list[RuleFinding]]:
    targets = resolve(graph, _selectors(rule.predicate, "target"))
    if not targets:
        return UNKNOWN, "the target selector matched no elements, so the rule proves nothing", []
    mediators = resolve(graph, _selectors(rule.predicate, "via"))
    if not mediators:
        return UNKNOWN, "the required intermediary matched no elements, so the rule cannot be satisfied", []
    findings = [
        RuleFinding(
            f"{_describe(graph, edge.source)} reaches {_describe(graph, edge.target)} directly, "
            f"bypassing {' or '.join(sorted(_describe(graph, item) for item in mediators))}.",
            edge.evidence.location, (edge.evidence.location,),
        )
        for edge in edges
        if edge.source in sources and edge.target in targets and edge.target not in mediators
    ]
    return (FAIL if findings else PASS), "", findings


def _must_not_exceed(graph: ArchitectureGraph, rule: Rule, edges: list[Edge],
                     selected: set[str]) -> tuple[str, str, list[RuleFinding]]:
    metric = rule.predicate.get("metric")
    if metric not in {"fan-out", "fan-in"}:
        raise SelectorError(f"unsupported metric {metric!r}; expected 'fan-out' or 'fan-in'")
    budget = rule.predicate.get("budget")
    if not isinstance(budget, int) or isinstance(budget, bool) or budget < 0:
        raise SelectorError("predicate field 'budget' must be a non-negative integer")
    counted: dict[str, set[str]] = {identifier: set() for identifier in selected}
    for edge in edges:
        if metric == "fan-out" and edge.source in counted:
            counted[edge.source].add(edge.target)
        if metric == "fan-in" and edge.target in counted:
            counted[edge.target].add(edge.source)
    findings = [
        RuleFinding(
            f"{_describe(graph, identifier)} has {metric} {len(neighbours)}, "
            f"above the budget of {budget}. Reported as a named proxy, not as proof.",
            graph.nodes[identifier].evidence.location,
        )
        for identifier, neighbours in sorted(counted.items()) if len(neighbours) > budget
    ]
    return (FAIL if findings else PASS), "", findings


PRIMITIVE_EVALUATORS = {
    "may-not-depend-on": _may_not_depend_on,
    "must-cross-via": _must_cross_via,
    "must-not-exceed": _must_not_exceed,
}

SOURCE_FIELD = {"may-not-depend-on": "source", "must-cross-via": "source", "must-not-exceed": "selector"}


def evaluate_rule(graph: ArchitectureGraph, rule: Rule, today: date | None = None) -> RuleResult:
    """Replay one compiled predicate. Same graph and same artifact, same verdict."""
    overdue = rule.review_overdue(today or date.today())
    def result(verdict: str, reason: str = "", findings: Iterable[RuleFinding] = ()) -> RuleResult:
        return RuleResult(rule, verdict, reason, tuple(findings), overdue)

    if rule.type in DEFERRED_TYPES:
        return result(SKIPPED, DEFERRED_TYPES[rule.type])
    if rule.type == "staleness":
        return result(UNKNOWN, "no evaluator is bound for threat-model staleness rules in this build")
    if rule.evidence not in graph.sources:
        return result(UNKNOWN, f"the {rule.evidence} evidence provider was not supplied to this run")
    try:
        scope = resolve(graph, rule.scope)
        if not scope:
            return result(UNKNOWN, "the rule scope matched no elements in this graph")
        primitive = rule.predicate["primitive"]
        evaluator = PRIMITIVE_EVALUATORS[primitive]
        selected = resolve(graph, _selectors(rule.predicate, SOURCE_FIELD[primitive])) & scope
        if not selected:
            return result(UNKNOWN, "no element is both in scope and matched by the predicate")
        edges = [edge for edge in graph.edges if EDGE_FILTERS[rule.evidence](edge)]
        verdict, reason, findings = evaluator(graph, rule, edges, selected)
    except (SelectorError, KeyError, TypeError) as error:
        return result(ERROR, f"the compiled artifact could not be executed: {error}")
    return result(verdict, reason, findings)


def evaluate_rules(graph: ArchitectureGraph, rules: Iterable[Rule], today: date | None = None) -> list[RuleResult]:
    return [evaluate_rule(graph, rule, today) for rule in rules]
