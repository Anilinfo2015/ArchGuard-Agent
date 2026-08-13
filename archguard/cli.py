from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .evaluate import evaluate, validated_sync_patch
from .ingest import ingest_dependency_cruiser, ingest_structurizr, ingest_terraform_plan
from .model import ArchitectureGraph
from .policy import RuleError, load_rules
from .predicates import RuleResult, evaluate_rules


def rule_report(result: RuleResult) -> dict[str, Any]:
    """Quote the rule in its owner's words next to the verdict it produced."""
    return {
        "ruleId": result.rule.id,
        "title": result.rule.title,
        "tier": result.rule.tier,
        "owner": result.rule.owner,
        "severity": result.rule.severity,
        "mode": result.rule.mode,
        "verdict": result.verdict,
        "reason": result.reason,
        "quotedPolicy": result.rule.body,
        "restatement": result.rule.restatement,
        "reviewOverdue": result.review_overdue,
        "findings": [
            {"message": finding.message, "evidence": finding.evidence, "path": list(finding.path)}
            for finding in result.findings
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Evidence-bound PR architecture delta checker")
    parser.add_argument("--structurizr", type=Path, required=True)
    parser.add_argument("--dependency-cruiser", type=Path)
    parser.add_argument("--terraform-plan", type=Path)
    parser.add_argument("--rules", type=Path, help="a compiled rule artifact, or a directory of them")
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
    blocking = any(finding.blocking for finding in findings)
    report: dict[str, Any] = {
        "findings": [
            {
                "policyId": finding.policy_id, "severity": finding.severity,
                "message": finding.message, "evidence": finding.evidence,
                "suggestion": validated_sync_patch(graph, finding),
            }
            for finding in findings
        ],
        "rules": [],
    }
    if args.rules:
        try:
            results = evaluate_rules(graph, load_rules(args.rules))
        except (RuleError, ValueError, OSError) as error:
            print(f"compiled rules could not be loaded, so this check cannot report green: {error}")
            return 1
        report["rules"] = [rule_report(result) for result in results]
        blocking = blocking or any(result.blocking for result in results)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 1 if blocking else 0


if __name__ == "__main__":
    raise SystemExit(main())
