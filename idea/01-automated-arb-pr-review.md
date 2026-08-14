# Idea 1: Automated Architecture Review Board for Pull Requests

> **Superseded in part by [Idea 0, the final idea](./00-final-idea.md).** Kept as detail and demo
> material. Where the two disagree on scope, tiers, verdicts or what may gate, Idea 0 wins.

## One-line pitch

ArchGuard AI becomes an always-on Architecture Review Board that reviews every architecture-changing pull request before it can merge.

## Problem

Architecture review usually happens too late: in meetings, design docs, or production incidents. Developers can accidentally introduce cross-domain calls, circular dependencies, or forbidden infrastructure shortcuts because the architecture rules are not checked where changes happen.

## Proposed experience

- Developers update Architecture as Code files such as Structurizr DSL, Terraform, or Bicep.
- A CI job detects architecture-impacting files in the pull request.
- ArchGuard AI parses the architecture delta and loads the applicable fitness functions: the non-negotiable org tier plus the owning team’s tier, as defined in [Idea 6](./06-team-fitness-functions.md).
- It posts a PR review with:
  - pass/fail status,
  - violated policy, quoted in the wording its authors wrote,
  - affected components,
  - risk explanation,
  - suggested remediation.
- Required checks block the PR only for high-confidence violations. Rules the policy compiler could not express deterministically stay in advisory mode.

## Demo story

A rushed developer adds a direct synchronous dependency from `Order API` to `Inventory Database`. ArchGuard AI comments:

> Violation: Direct database access across domain boundaries violates Loose Coupling Policy 3.4. Replace the direct dependency with an event published to the Inventory updates stream.

The status check fails, and the PR cannot merge until the architecture is corrected.

## MVP scope

- Input: one sample Structurizr DSL file and a small fitness function set with one org-tier and one team-tier rule.
- Output: a markdown PR compliance report.
- Detection focus: direct database access, forbidden synchronous dependency, and circular service relationships.
- Integration concept: GitHub Actions check plus PR comment.

## Wow factor

The tool does not just say “lint failed.” It explains the architectural risk in plain language and ties it back to the organization’s own policy wording.

## Why judges will care

- **Impact:** prevents costly architecture erosion before merge.
- **Feasibility:** starts with versioned architecture files instead of whole-codebase static analysis.
- **Novelty:** applies agentic AI to enterprise architecture governance.
- **Clarity:** the mistake-and-catch PR demo is easy to understand.

## Risks and mitigations

- **Risk:** LLM hallucination creates noisy reviews.
  - **Mitigation:** require structured parsed architecture input, cite exact policy text, and keep the model out of the gate decision by evaluating policies compiled ahead of time ([Idea 6](./06-team-fitness-functions.md)).
- **Risk:** teams resist blocked PRs.
  - **Mitigation:** start in advisory mode, then enforce only high-confidence rules.
- **Risk:** architecture files drift from real systems.
  - **Mitigation:** pair this with Idea 2, Architecture Drift Radar.
