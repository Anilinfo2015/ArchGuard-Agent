# ArchGuard-AI

ArchGuard AI is a PR-scoped architecture drift checker. It ingests parser-derived
facts from a Structurizr export, TypeScript dependency-cruiser report, and Terraform
plan, then deterministically checks whether implementation dependencies realize the
declared architecture.

## Guarantees

- Every finding includes a policy ID and `file:line` evidence.
- Runtime evaluation does not use an LLM or invent graph edges.
- High-confidence undeclared cross-context dependencies block; lower-confidence
  evidence is advisory.
- Synchronization suggestions are emitted only after an in-memory re-evaluation
  proves that the suggested declared relationship resolves the finding.

## Run locally

First export the model and reports with their native parsers:

```sh
structurizr-cli export -workspace workspace.dsl -format json -output build
dependency-cruiser --output-type json src > build/dependencies.json
terraform show -json plan.tfplan > build/terraform-plan.json
python -m archguard.cli --structurizr build/workspace.json \
  --dependency-cruiser build/dependencies.json \
  --terraform-plan build/terraform-plan.json
```

The command writes `archguard-results.json` and exits non-zero only for blocking
findings. Use `action.yml` from a GitHub Actions workflow to run the same check.
