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
findings. Use `action.yml` from a GitHub Actions workflow to run the same check;
provide its required `changed-files` input as a newline-separated PR file list.

## Where this is going

This CLI is the first evaluator of a larger product. See
[`idea/00-final-idea.md`](./idea/00-final-idea.md) for the finalized scope: two policy
packs over one multilevel architecture graph — **Design Rules** for low-level design
such as SOLID, layering and dependency inversion, and **Fitness Functions** for
high-level architecture at org, domain, team and service scope — where an LLM compiles
plain-English rules into deterministic predicates at authoring time and never
participates in the gate decision.

## UI prototype

A front-end-only prototype of the product experience lives in [`ui/`](./ui/). It is a
no-backend, no-build static app (open `ui/index.html`, or serve the folder with
`python3 -m http.server`) that mocks both personas — the **Architect** who authors
governance and the **Developer** who consumes it in the pipeline — and demonstrates
**continuous architecture review** across LLD and HLD. See [`ui/README.md`](./ui/README.md).

