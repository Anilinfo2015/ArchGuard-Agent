# ArchGuard AI Hackathon Idea Pack

Goal: shape **ArchGuard AI** into a hackathon-winning demo: an automated Architecture Review Board that runs inside CI/CD, reads Architecture as Code, checks architecture policies, blocks risky pull requests, and suggests safer designs.

This folder is intentionally documentation-only. It captures product ideas, demo narratives, and research-backed positioning before implementation starts.

## Research signals

- **Architecture as Code is the right entry point.** Structurizr/C4 models are text-based, versionable, reviewable, and designed for architecture modeling as code, which makes them suitable for pull-request validation instead of trying to reverse-engineer every codebase immediately.
- **Fitness functions make architecture enforceable.** The architecture fitness function pattern frames architectural rules as automated checks that continuously validate system characteristics in delivery pipelines.
- **CI/CD is the natural enforcement layer.** GitHub Actions and similar systems can run checks on pull requests, publish comments, and use required status checks to block merges when governance rules fail.
- **Hackathon winners need a story, not just features.** Strong judging narratives emphasize impact, feasibility, novelty, and a clear before/after demo moment.

## Competitive white space

The strongest research-backed positioning is **shift-left Architecture Review Board as a GitHub Action**. Existing tools cover pieces of the problem, but not the full loop:

| Existing category | What it covers | Gap ArchGuard AI can own |
|---|---|---|
| Structurizr CLI | Validates and exports architecture models | Does not enforce organization-specific policy or comment on PR risk. |
| ArchUnit / NetArchTest | Code-level architecture tests | Does not understand C4 models, IaC topology, or natural-language policies. |
| OPA / Checkov / tfsec | Policy-as-code and IaC compliance | Does not reason about architecture intent or domain boundaries. |
| Terraform drift tools | Infrastructure drift | Does not compare deployed topology to approved C4 architecture. |
| ADR/documentation tools | Records decisions | Does not enforce decisions against live pull requests. |

This creates a defensible hackathon claim: **ArchGuard AI connects architecture intent, infrastructure reality, natural-language policy, and PR enforcement in one workflow.**

## Recommended winning angle

Lead with **Idea 1: Automated Architecture Review Board for Pull Requests**, then add the strongest “wow” layer from **Idea 2: Architecture Drift Radar**. If time allows, add the interactive question-answer experience from **Idea 4: Policy Playground and PR Conversation Simulator**.

The most compelling demo is:

1. Show a clean C4/Structurizr architecture for a microservices system.
2. Open a pull request that introduces a forbidden direct dependency, such as an Order API calling an Inventory database directly.
3. ArchGuard AI runs in CI, compares the architecture delta with organization policies, and posts a PR review.
4. The PR is blocked with a precise violation, the impacted policy, risk explanation, and a safer event-driven remediation.
5. A judge comments `@archguard what is the blast radius of removing the API gateway?` and receives a short Mermaid-backed architecture answer.
6. Judges see that AI is enforcing and explaining system-level engineering quality, not just generating code.

## The 5 ideas

| # | Idea | Best for | Why it can win |
|---|------|----------|----------------|
| 1 | [Automated Architecture Review Board for PRs](./01-automated-arb-pr-review.md) | Core MVP | Converts architecture governance into developer-native PR feedback. |
| 2 | [Architecture Drift Radar](./02-architecture-drift-radar.md) | Wow factor | Proves the tool compares intended architecture with deployed reality. |
| 3 | [Remediation Copilot for Architecture Fixes](./03-remediation-copilot.md) | Demo magic | Turns violations into concrete, reviewable repair guidance. |
| 4 | [Policy Playground and PR Conversation Simulator](./04-policy-playground.md) | Judge interaction | Lets judges test rules live and ask architecture questions inside a PR. |
| 5 | [Executive Risk Scorecard and ADR Generator](./05-risk-scorecard-adr.md) | Enterprise value | Connects PR-level findings to leadership-ready architecture decisions. |

## Suggested hackathon build sequence

1. **Day 1:** Prepare sample Structurizr DSL, sample org guidelines, and a broken PR scenario.
2. **Day 2:** Build the CI workflow concept and PR comment output format.
3. **Day 3:** Add remediation explanation and a clean dashboard/report artifact.
4. **Demo polish:** Script the catastrophic mistake narrative, prepare one live `@archguard` PR question, and keep a fallback recording ready.

## Reference links

- Structurizr “Why as code?”: https://docs.structurizr.com/as-code
- Structurizr DSL docs: https://docs.structurizr.com/dsl
- C4 model: https://c4model.com/
- Architecture fitness functions: https://martinfowler.com/bliki/ArchitectureFitnessFunction.html
- GitHub Actions continuous integration: https://docs.github.com/en/actions/get-started/continuous-integration
- GitHub required status checks: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
