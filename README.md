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
- A rule that finds nothing to check reports `UNKNOWN`, never `PASS`.

## Compiled rules

An English rule is compiled **once**, at authoring time, into a declarative artifact
in `governance/catalog/`. The gate only ever replays that artifact, so the same graph
and the same artifact always produce the same verdict.

The artifact carries the routing metadata (`id`, `tier`, `owner`, `scope`, `type`,
`severity`, `mode`, `evidence`, `review_by`), the rule `body` quoted verbatim in every
report, the compiler's canonical `restatement`, the `pinned` dependency set the
compilation is bound to, the `predicate`, and the fixtures the rule must pass and fail.

Predicates are limited to a closed vocabulary — nothing in it inspects a value,
follows data, or reasons about control flow. Three primitives are implemented today:

| Primitive | Fields | Proves |
|---|---|---|
| `may-not-depend-on` | `source`, `target`, optional `mode`, optional `transitive` | No dependency exists from the source set into the target set, optionally restricted to one communication mode or extended to a reachable path |
| `must-cross-via` | `source`, `target`, `via` | No dependency reaches the target set while bypassing a required intermediary |
| `must-not-exceed` | `selector`, `metric` (`fan-out` or `fan-in`), `budget` | A counted metric stays within budget. Reported as a named proxy, never as proof |

Selectors are written as `<kind>:<value>`, where kind is one of `tag`, `name`,
`context`, `path`, `system`, `container`, `component` or `person`. An unsupported
selector is an `ERROR`, never a silent non-match.

Every rule resolves to one of five verdicts: `PASS`, `FAIL`, `UNKNOWN` when the
evidence cannot decide it, `ERROR` when the artifact cannot be executed, and `SKIPPED`
when the rule type is not evaluated at pull-request time. `FAIL` blocks only when the
rule declares `mode: blocking`; `ERROR` always blocks, because a check that could not
run must never report green.

## Run locally

First export the model and reports with their native parsers:

```sh
structurizr-cli export -workspace workspace.dsl -format json -output build
dependency-cruiser --output-type json src > build/dependencies.json
terraform show -json plan.tfplan > build/terraform-plan.json
python -m archguard.cli --structurizr build/workspace.json \
  --dependency-cruiser build/dependencies.json \
  --terraform-plan build/terraform-plan.json \
  --rules governance/catalog
```

The command writes `archguard-results.json` — an object with `findings` from the
built-in drift checks and `rules` holding one verdict per compiled rule — and exits
non-zero only for blocking results. Use `action.yml` from a GitHub Actions workflow to
run the same check; provide its required `changed-files` input as a newline-separated
PR file list.

Every catalog rule ships one architecture it must pass and one it must fail. Replay
them with `python -m unittest discover -s tests`, so a policy edit cannot silently
unblock the organization.

## Where this is going

This CLI is the first evaluator of a larger product. See
[`idea/00-final-idea.md`](./idea/00-final-idea.md) for the finalized scope: two policy
packs over one multilevel architecture graph — **Design Rules** for low-level design
such as SOLID, layering and dependency inversion, and **Fitness Functions** for
high-level architecture at org, domain, team and service scope — where an LLM compiles
plain-English rules into deterministic predicates at authoring time and never
participates in the gate decision.
