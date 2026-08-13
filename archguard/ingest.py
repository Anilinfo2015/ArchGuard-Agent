from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable

from .model import ArchitectureGraph, Edge, Evidence, Node

ARCHITECTURE_MODEL = "architecture-model"
IMPLEMENTATION = "implementation"
INFRASTRUCTURE_PLAN = "infrastructure-plan"


def _mode(value: str | None) -> str | None:
    value = (value or "").lower()
    if any(word in value for word in ("kafka", "event", "queue", "async")):
        return "async"
    if any(word in value for word in ("http", "rest", "grpc", "jdbc", "sql", "sync")):
        return "sync"
    return None


def _elements(model: dict[str, Any]) -> Iterable[tuple[str, dict[str, Any]]]:
    """Yield each model element with the C4 kind implied by where it is declared."""
    for kind, collection in (("person", "people"), ("software-system", "softwareSystems"),
                             ("deployment-node", "deploymentNodes")):
        for element in model.get(collection, []):
            yield kind, element
    for system in model.get("softwareSystems", []):
        for container in system.get("containers", []):
            yield "container", container
            for component in container.get("components", []):
                yield "component", component


def _tags(element: dict[str, Any]) -> tuple[str, ...]:
    raw = element.get("tags", "")
    values = raw.split(",") if isinstance(raw, str) else list(raw)
    return tuple(tag.strip() for tag in values if tag and tag.strip())


def ingest_structurizr(export_file: Path, graph: ArchitectureGraph) -> None:
    """Ingest JSON produced by `structurizr-cli export -format json`."""
    data = json.loads(export_file.read_text())
    model = data.get("model", data)
    elements = list(_elements(model))
    graph.sources.add(ARCHITECTURE_MODEL)
    for kind, element in elements:
        identifier = str(element["id"])
        graph.add_node(Node(
            id=f"hld:{identifier}", name=element.get("name", identifier), tier="hld",
            kind=element.get("type", kind), context=element.get("name"),
            evidence=Evidence(str(export_file), confidence=1.0), tags=_tags(element),
        ))
    for _, element in elements:
        for relationship in element.get("relationships", []):
            target = str(relationship.get("destinationId", ""))
            source = f"hld:{element['id']}"
            destination = f"hld:{target}"
            if destination not in graph.nodes:
                continue
            technology = relationship.get("technology", "")
            graph.add_edge(Edge(
                source, destination, "hld", "ALLOWS", _mode(technology),
                Evidence(str(export_file), confidence=1.0),
                {"description": relationship.get("description", ""), "technology": technology},
            ))


def _line_for_import(path: Path, target: str) -> int | None:
    try:
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            if target in line and re.search(r"\b(import|require)\b", line):
                return number
    except (OSError, UnicodeDecodeError):
        pass
    return None


def ingest_dependency_cruiser(report_file: Path, graph: ArchitectureGraph) -> None:
    """Ingest JSON produced by `dependency-cruiser --output-type json`."""
    report = json.loads(report_file.read_text())
    graph.sources.add(IMPLEMENTATION)
    for module in report.get("modules", []):
        source = Path(module["source"])
        node_id = f"lld:module:{module['source']}"
        graph.add_node(Node(
            node_id, module["source"], "lld", "module",
            Evidence(str(source), confidence=1.0), source.parts[0] if source.parts else None,
        ))
    for module in report.get("modules", []):
        source_id = f"lld:module:{module['source']}"
        for dependency in module.get("dependencies", []):
            resolved = dependency.get("resolved")
            target_id = f"lld:module:{resolved}"
            if not resolved or target_id not in graph.nodes:
                continue
            source = Path(module["source"])
            line = dependency.get("line") or _line_for_import(source, dependency.get("module", ""))
            graph.add_edge(Edge(
                source_id, target_id, "lld", "CALLS", "sync",
                Evidence(str(source), line, 1.0),
            ))


def ingest_terraform_plan(plan_file: Path, graph: ArchitectureGraph) -> None:
    """Ingest an evidence-bearing Terraform plan JSON (`terraform show -json`)."""
    data = json.loads(plan_file.read_text())
    graph.sources.add(INFRASTRUCTURE_PLAN)
    resources = data.get("planned_values", {}).get("root_module", {}).get("resources", [])
    addresses = {resource["address"] for resource in resources}
    configured_references: dict[str, set[str]] = {}
    for resource in data.get("configuration", {}).get("root_module", {}).get("resources", []):
        references = {
            reference
            for expression in resource.get("expressions", {}).values()
            for reference in expression.get("references", [])
        }
        configured_references[resource["address"]] = references
    for resource in resources:
        address = resource["address"]
        graph.add_node(Node(
            f"lld:iac:{address}", address, "lld", "cloud-resource",
            Evidence(str(plan_file), confidence=1.0), address.split(".")[0],
        ))
    for resource in resources:
        for reference in configured_references.get(resource["address"], set()):
            address = next(
                (candidate for candidate in addresses if reference == candidate or reference.startswith(f"{candidate}.")),
                None,
            )
            if address and address != resource["address"]:
                graph.add_edge(Edge(
                    f"lld:iac:{resource['address']}", f"lld:iac:{address}", "lld",
                    "DEPLOYS_WITH", None, Evidence(str(plan_file), confidence=0.8),
                ))
