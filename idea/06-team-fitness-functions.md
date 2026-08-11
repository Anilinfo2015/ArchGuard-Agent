# Idea 6: Per-Team Fitness Functions Written in Natural Language

## One-line pitch

Every team writes its own architecture fitness functions in plain English, ArchGuard AI compiles them into deterministic checks once at authoring time, and every pull request is then judged by a repeatable evaluator instead of a live model opinion.

## Problem

A single organization-wide `org-guidelines.md` does not survive contact with a real enterprise. Different domains have genuinely different constraints: a payments team needs stricter data-residency and isolation rules than an internal reporting team. But letting each team hand-write policy creates two failure modes: rules that contradict the organization’s own standards, and rules that nobody can evaluate consistently.

The obvious implementation is also the trap. If natural-language policy goes straight into a model on every pull request and the model returns pass or fail, the result is non-deterministic, un-auditable, and impossible to defend in a design review. One hallucinated `FAIL` on a required status check permanently destroys developer trust in the tool.

**The fix is to move the AI to authoring time, not evaluation time.**

## Two-tier policy model

| Tier | Owner | Scope | Change path |
|---|---|---|---|
| **Org tier** | Architecture Review Board | Inherited by every team, non-negotiable | ARB review |
| **Team tier** | The owning team | Only the systems and containers that team owns | Normal team pull request |

- A team fitness function may only be **stricter** than the org tier, never weaker. The compiler rejects a team rule that would relax an inherited org rule.
- Relaxations are not a policy edit. They go through the time-boxed ADR exception path in [Idea 5](./05-risk-scorecard-adr.md), with a named approver and an expiry date, so every deviation is visible and self-terminating.
- Ownership is enforced structurally: fitness functions live in `fitness/<team>/` next to that team’s architecture model, and `CODEOWNERS` maps each directory to its team. A team cannot silently edit another team’s rules or the org set.

## Every fitness function is a small document, not a sentence

The prose is what makes the rule human. The metadata is what makes it routable, reportable, and scorecard-able.

| Field | Purpose |
|---|---|
| `id` | Stable identifier, cited in PR comments and scorecards, never reused |
| `title` | Short human name |
| `tier` | `org` or `team` |
| `owner` | Owning team, matched against `CODEOWNERS` |
| `scope` | Which C4 elements, tags, or domains the rule applies to |
| `type` | Which evaluator runs it: `structural`, `deployment`, or `operational` |
| `severity` | Risk weight used for ranking and scorecard roll-up |
| `mode` | `blocking` or `advisory` |
| `evidence` | Which input the verdict must be derived from: architecture model, IaC plan, or metric source |
| `review_by` | Date the rule must be re-confirmed, so stale rules surface instead of rotting |
| `body` | The policy in the team’s own words, quoted verbatim in every PR comment |

An illustrative fitness function document:

```yaml
id: PAY-014
title: Checkout must not synchronously depend on customer profile
tier: team
owner: payments
scope: [ "tag:payments", "container:Checkout API" ]
type: structural
severity: high
mode: blocking
evidence: architecture-model
review_by: 2026-12-31
body: >
  During checkout, payment systems must not make a synchronous call to any
  customer profile service. Profile data needed at checkout must come from a
  locally owned projection kept up to date by events.
```

## Classify fitness functions by type, because each type needs a different evaluator

Being explicit about type prevents the classic failure where a team writes an operational service level objective as a rule and the pull-request gate cannot possibly evaluate it.

| Type | Evaluated against | When it runs | Can it block a PR? |
|---|---|---|---|
| **Structural** | The C4/Structurizr architecture graph, for example “no direct database access across domain boundaries” | Every architecture-affecting pull request | Yes, deterministic |
| **Deployment / drift** | Terraform or Bicep plan, as in [Idea 2](./02-architecture-drift-radar.md) | Pull request plus scheduled sweep | Yes, when the drift is unambiguous |
| **Operational / evolutionary** | A bound metric source, for example “p99 checkout latency stays under the agreed budget” or “coupling score must not increase” | Trend evaluation on a schedule | No, reported as trend only |

An operational rule with no metric binding is rejected at authoring time with an explanation, rather than silently passing forever.

[Idea 7](./07-threat-model-bridge.md) adds a fourth type, **threat model staleness**, evaluated against trust boundaries imported from the organization’s existing threat model.

## The key mechanism: compile natural language into checkable intent, once

1. A team adds or edits a fitness function.
2. The agent **compiles** the prose into a typed assertion over the architecture graph, drawn from a small closed set of predicate primitives:
   - no path between A and B,
   - must traverse a required component,
   - relationship must be asynchronous,
   - no shared datastore between domains,
   - layering and direction constraints,
   - ownership constraints,
   - fan-in and fan-out thresholds,
   - tag-based constraints,
   - numeric budget or threshold.
3. The compiled predicate, the confidence score, and the agent’s **canonical restatement** of the rule are committed alongside the prose and reviewed in the policy pull request. Humans approve the interpretation once, in the open, with a diff.
4. At pull-request time the evaluator is deterministic: it replays the compiled predicate over the graph. Same input, same verdict, every time, with the traversal path as evidence.
5. The PR comment still quotes the team’s original prose, so governance still *reads* as natural language even though enforcement is mechanical.

Anything the compiler cannot express in the primitive set is confidence-flagged and lands in **advisory mode only**. It appears as a comment for a human to judge; it never becomes a merge blocker.

This is also the honest answer to “how do you stop the LLM hallucinating a blocked PR?” — at enforcement time there is no LLM in the decision path.

## Policies get their own tests

Each fitness function ships with at least one architecture snippet it must **pass** and one it must **fail**. These run in CI whenever a policy changes.

- Ambiguous wording is caught the moment it is written, not months later on a live pull request.
- A policy edit cannot silently un-block half the organization, because the failing fixture would start passing and CI would flag it.
- It earns the line judges remember: **our architecture policies have unit tests.**

## Adoption mechanics

- **Starter catalog.** Ship roughly ten templated fitness functions so about 80 percent of a team’s rules are picked from the catalog and only the bespoke 20 percent is free-form natural language. Fragmentation across teams is the main scaling risk, and a good catalog is the main defense.
- **Ambiguity handling.** When the compiler is unsure it returns `clarify` with a suggested rewording, instead of guessing and encoding the wrong rule.
- **Scorecard roll-up.** Per team in [Idea 5](./05-risk-scorecard-adr.md): own-rule pass rate, org-rule pass rate, active exceptions and their expiry dates, and recurring violations.
- **False-positive rate is a first-class product metric.** A rule that exceeds the agreed threshold is automatically demoted to advisory mode and routed back to its owner, so the gate stays trusted.

## Demo story

A payments engineer writes a new rule in plain English and opens a policy pull request. ArchGuard AI replies in that same PR with its canonical restatement, the compiled predicate, a confidence score, and the two generated fixtures showing one architecture that passes and one that fails. The engineer approves the interpretation and merges.

Minutes later, a different pull request adds the exact synchronous dependency the rule forbids. The check fails deterministically, quotes the team’s own sentence back to them, and shows the offending path through the architecture graph.

## MVP scope

- Two teams, one shared org tier, and the precedence check between them.
- Four or five predicate primitives, enough to cover the demo violations.
- The authoring-time compile step with visible canonical restatement and confidence score.
- Pass and fail fixtures for each demo policy, running as a CI job.

## Wow factor

Judges see natural-language governance that is still deterministic. The team wrote English; the gate ran a repeatable check; the comment quoted the English back. Most demos have to trade one for the other.

## Why judges will care

- **Impact:** turns architecture governance into a multi-tenant, versioned, team-owned artifact instead of a wiki page nobody reads.
- **Feasibility:** the hard AI work happens once per policy, not on every pull request, so latency and cost stay bounded.
- **Novelty:** natural-language policy authoring with a compiled, testable, deterministic enforcement path.
- **Credibility:** it answers the first question every experienced engineer asks about an AI gate — “what happens when it is wrong?”

## Risks and mitigations

- **Risk:** teams write rules that contradict the org tier.
  - **Mitigation:** precedence check at compile time; only-stricter is enforceable, relaxation requires an ADR exception with an expiry date.
- **Risk:** the compiler encodes a subtly wrong interpretation.
  - **Mitigation:** the canonical restatement and generated fixtures are human-reviewed in the policy pull request before the rule can block anything.
- **Risk:** policy sprawl across many teams.
  - **Mitigation:** starter catalog, mandatory `review_by` date, and scorecard visibility on unused or noisy rules.
- **Risk:** a noisy rule erodes trust in the gate.
  - **Mitigation:** false-positive tracking with automatic demotion to advisory mode.

## What this changes in the idea pack

- [Idea 1](./01-automated-arb-pr-review.md) no longer assumes a single `org-guidelines.md`; it reads the org tier plus the owning team’s tier.
- [Idea 4](./04-policy-playground.md) becomes the authoring surface for this model, not just a judge-facing playground.
- [Idea 5](./05-risk-scorecard-adr.md) gains a per-team dimension and owns the exception path that keeps the only-stricter rule honest.
