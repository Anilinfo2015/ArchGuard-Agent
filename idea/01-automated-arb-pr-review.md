# Idea 1: Automated Architecture Review Board for Pull Requests

## One-line pitch

ArchGuard AI becomes an always-on Architecture Review Board that reviews every architecture-changing pull request before it can merge.

## Problem

Architecture review usually happens too late: in meetings, design docs, or production incidents. Developers can accidentally introduce cross-domain calls, circular dependencies, or forbidden infrastructure shortcuts because the architecture rules are not checked where changes happen.

## Proposed experience

- Developers update Architecture as Code files such as Structurizr DSL, Terraform, or Bicep.
- A CI job detects architecture-impacting files in the pull request.
- ArchGuard AI parses the architecture delta and reads `org-guidelines.md`.
- It posts a PR review with:
  - pass/fail status,
  - violated policy,
  - affected components,
  - risk explanation,
  - suggested remediation.
- Required checks block the PR only for high-confidence violations.

## Demo story

A rushed developer adds a direct synchronous dependency from `Order API` to `Inventory Database`. ArchGuard AI comments:

> Violation: Direct database access across domain boundaries violates Loose Coupling Policy 3.4. Replace the direct dependency with an event published to the Inventory updates stream.

The status check fails, and the PR cannot merge until the architecture is corrected.

## MVP scope

- Input: one sample Structurizr DSL file and one natural-language policy file.
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
  - **Mitigation:** require structured parsed architecture input and cite exact policy text.
- **Risk:** teams resist blocked PRs.
  - **Mitigation:** start in advisory mode, then enforce only high-confidence rules.
- **Risk:** architecture files drift from real systems.
  - **Mitigation:** pair this with Idea 2, Architecture Drift Radar.
