"""The compiled rule artifact: the only thing the gate is allowed to execute.

A rule is authored in English and compiled once, at authoring time, into the
declarative document loaded here. The compiler never emits executable code, and
no model participates in the gate decision: this module only parses and
validates what a human already approved in a policy pull request.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from .model import ArchitectureGraph, Edge, Evidence, Node

TIERS = frozenset({"regulatory", "org", "domain", "team", "service"})
TYPES = frozenset({"structural", "realization", "deployment", "staleness", "operational", "holistic"})
MODES = frozenset({"blocking", "advisory"})
EVIDENCE_SOURCES = frozenset({"architecture-model", "implementation", "infrastructure-plan"})
PRIMITIVES = frozenset({"may-not-depend-on", "must-cross-via", "must-not-exceed"})

REQUIRED_FIELDS = (
    "id", "title", "tier", "owner", "scope", "type",
    "severity", "mode", "evidence", "review_by", "body", "predicate",
)


class RuleError(ValueError):
    """A compiled artifact that cannot be trusted to execute."""


@dataclass(frozen=True)
class Fixture:
    """A miniature graph a rule must pass or fail, replayed on every policy change."""

    name: str
    expect: str
    nodes: tuple[dict[str, Any], ...]
    edges: tuple[dict[str, Any], ...]


@dataclass(frozen=True)
class Rule:
    id: str
    title: str
    tier: str
    owner: str
    scope: tuple[str, ...]
    type: str
    severity: str
    mode: str
    evidence: str
    review_by: str
    body: str
    predicate: dict[str, Any]
    restatement: str = ""
    artifact: str = ""
    fixtures: tuple[Fixture, ...] = ()
    pinned: dict[str, str] = field(default_factory=dict)

    @property
    def blocking(self) -> bool:
        return self.mode == "blocking"

    def review_overdue(self, today: date) -> bool:
        return date.fromisoformat(self.review_by) < today


def _require(document: dict[str, Any], source: str) -> None:
    missing = [name for name in REQUIRED_FIELDS if name not in document]
    if missing:
        raise RuleError(f"{source}: compiled rule is missing required fields: {', '.join(missing)}")


def _one_of(value: Any, allowed: frozenset[str], label: str, source: str) -> str:
    if not isinstance(value, str) or value not in allowed:
        raise RuleError(f"{source}: unsupported {label} {value!r}; expected one of {sorted(allowed)}")
    return value


def _fixtures(document: dict[str, Any], source: str) -> tuple[Fixture, ...]:
    fixtures = []
    for entry in document.get("fixtures", []):
        expect = _one_of(entry.get("expect"), frozenset({"PASS", "FAIL"}), "fixture expectation", source)
        fixtures.append(Fixture(
            name=str(entry.get("name", expect)), expect=expect,
            nodes=tuple(entry.get("nodes", [])), edges=tuple(entry.get("edges", [])),
        ))
    return tuple(fixtures)


def parse_rule(document: dict[str, Any], source: str = "<memory>") -> Rule:
    """Validate a compiled artifact; an artifact we cannot validate never runs."""
    if not isinstance(document, dict):
        raise RuleError(f"{source}: compiled rule must be a JSON object")
    _require(document, source)
    predicate = document["predicate"]
    if not isinstance(predicate, dict):
        raise RuleError(f"{source}: predicate must be a JSON object")
    _one_of(predicate.get("primitive"), PRIMITIVES, "primitive", source)
    scope = document["scope"]
    if not isinstance(scope, list) or not scope or not all(isinstance(item, str) for item in scope):
        raise RuleError(f"{source}: scope must be a non-empty list of selector strings")
    try:
        date.fromisoformat(str(document["review_by"]))
    except ValueError as error:
        raise RuleError(f"{source}: review_by must be an ISO date: {error}") from error
    return Rule(
        id=str(document["id"]), title=str(document["title"]),
        tier=_one_of(document["tier"], TIERS, "tier", source),
        owner=str(document["owner"]), scope=tuple(scope),
        type=_one_of(document["type"], TYPES, "type", source),
        severity=str(document["severity"]),
        mode=_one_of(document["mode"], MODES, "mode", source),
        evidence=_one_of(document["evidence"], EVIDENCE_SOURCES, "evidence source", source),
        review_by=str(document["review_by"]), body=str(document["body"]).strip(),
        predicate=predicate, restatement=str(document.get("restatement", "")).strip(),
        artifact=source, fixtures=_fixtures(document, source),
        pinned={str(key): str(value) for key, value in document.get("pinned", {}).items()},
    )


def load_rules(path: Path) -> list[Rule]:
    """Load compiled artifacts from a file or a directory, ordered by rule id."""
    files = sorted(path.glob("**/*.json")) if path.is_dir() else [path]
    rules = [parse_rule(json.loads(file.read_text()), str(file)) for file in files]
    duplicates = {rule.id for rule in rules if [item.id for item in rules].count(rule.id) > 1}
    if duplicates:
        raise RuleError(f"rule ids are never reused, but these are duplicated: {sorted(duplicates)}")
    return sorted(rules, key=lambda rule: rule.id)


def fixture_graph(fixture: Fixture, evidence_source: str) -> ArchitectureGraph:
    """Build the miniature graph a fixture describes, with evidence on every fact."""
    graph = ArchitectureGraph()
    graph.sources.add(evidence_source)
    for node in fixture.nodes:
        graph.add_node(Node(
            id=str(node["id"]), name=str(node.get("name", node["id"])),
            tier=str(node.get("tier", "hld")), kind=str(node.get("kind", "element")),
            evidence=Evidence(str(node.get("artifact", fixture.name))),
            context=node.get("context"), tags=tuple(node.get("tags", [])),
        ))
    for edge in fixture.edges:
        graph.add_edge(Edge(
            source=str(edge["source"]), target=str(edge["target"]),
            tier=str(edge.get("tier", "hld")), relation=str(edge.get("relation", "CALLS")),
            mode=edge.get("mode"),
            evidence=Evidence(str(edge.get("artifact", fixture.name)), edge.get("line")),
        ))
    return graph
