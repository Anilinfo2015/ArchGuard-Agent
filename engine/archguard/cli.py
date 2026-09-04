from __future__ import annotations

import argparse
import json
from pathlib import Path

from .evaluate import evaluate, validated_sync_patch
from .ingest import ingest_dependency_cruiser, ingest_structurizr, ingest_terraform_plan
from .model import ArchitectureGraph


def main() -> int:
    parser = argparse.ArgumentParser(description="Evidence-bound PR architecture delta checker")
    parser.add_argument("--structurizr", type=Path, required=True)
    parser.add_argument("--dependency-cruiser", type=Path)
    parser.add_argument("--terraform-plan", type=Path)
    parser.add_argument("--changed-file", action="append", default=[])
    parser.add_argument("--output", type=Path, default=Path("archguard-results.json"))
    args = parser.parse_args()

    graph = ArchitectureGraph()
    ingest_structurizr(args.structurizr, graph)
    if args.dependency_cruiser:
        ingest_dependency_cruiser(args.dependency_cruiser, graph)
    if args.terraform_plan:
        ingest_terraform_plan(args.terraform_plan, graph)
    findings = evaluate(graph, set(args.changed_file) or None)
    result = [
        {
            "policyId": finding.policy_id, "severity": finding.severity,
            "message": finding.message, "evidence": finding.evidence,
            "suggestion": validated_sync_patch(graph, finding),
        }
        for finding in findings
    ]
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 1 if any(finding.blocking for finding in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())

