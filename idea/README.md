# ArchGuard AI Hackathon Idea Pack

Goal: shape **ArchGuard AI** into a hackathon-winning demo: an automated Architecture Review Board that runs inside CI/CD, reads Architecture as Code, checks architecture policies, blocks risky pull requests, and suggests safer designs.

This folder is intentionally documentation-only. It captures product ideas, demo narratives, and research-backed positioning before implementation starts.

## Start here

**[The Final Idea](./00-final-idea.md) is the decided scope**, with architecture diagrams. It settles the product into two policy packs over one multilevel graph — **Design Rules** for low-level design such as SOLID, layering and dependency inversion, and **Fitness Functions** for high-level architecture defined at org, domain, team and service scope — plus the guardrail that keeps the tool architectural instead of becoming CodeQL.

Ideas 1 to 7 below remain valid as detail and demo material; idea 0 decides what the product *is*, and [Idea 8](./08-vs-ai-review-agents.md) answers the inevitable "how is this different from a review skill or an AI review agent?"

## Research signals

- **Architecture as Code is the right entry point.** Structurizr/C4 models are text-based, versionable, reviewable, and designed for architecture modeling as code, which makes them suitable for pull-request validation instead of trying to reverse-engineer every codebase immediately.
- **Fitness functions make architecture enforceable.** The architecture fitness function pattern frames architectural rules as automated checks that continuously validate system characteristics in delivery pipelines.
- **CI/CD is the natural enforcement layer.** GitHub Actions and similar systems can run checks on pull requests, publish comments, and use required status checks to block merges when governance rules fail.
- **AI belongs at policy authoring time, not at gate time.** A model that judges a policy live on every pull request is non-deterministic and un-auditable, and a single wrong `FAIL` on a required check destroys developer trust. Natural-language policy should be compiled into a deterministic check once, reviewed by humans, and then replayed mechanically.
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
| Generic AI review agents and review skills | Model-judged review comments on a pull request | Re-decides on every run, so verdicts are irreproducible, untestable, and cannot be a required check. See [Idea 8](./08-vs-ai-review-agents.md). |
| Microsoft Threat Modeling Tool (TMT) | STRIDE threat analysis over a hand-drawn data-flow diagram, as a point-in-time design activity | Security-scoped, desktop-based, and disconnected from CI/CD. It cannot block a PR, and it cannot tell you when the design changed underneath it. |
| IriusRisk / OWASP Threat Dragon | Threat modeling with more automation, some of it pipeline-friendly | Still security-scoped and threat-library-driven. Does not evaluate team-authored architecture quality policies or compare C4 intent with IaC reality. |

This creates a defensible hackathon claim: **ArchGuard AI connects architecture intent, infrastructure reality, natural-language policy, and PR enforcement in one workflow.**

## How this differs from threat modeling tools

Expect the question *“isn’t this just threat modeling?”* Two wedges answer it:

1. **Trigger and enforcement, not just domain.** Threat modeling tools are workshop artifacts; ArchGuard AI is a control in the delivery pipeline. Even a perfect threat model cannot stop the pull request that violates it.
2. **Intent versus reality.** Threat modeling validates the trust boundaries you *asserted*. ArchGuard AI verifies the boundaries you actually *deployed*.

The winning move is to make the threat model an **input** rather than a competitor, so the security organization becomes an ally. See [Idea 7](./07-threat-model-bridge.md) for the full comparison table and the “threat model staleness” behavior: **TMT tells you what threats exist in the design you drew; ArchGuard AI tells you the moment the design changed and the threat model stopped being true.**

## Recommended winning angle

Lead with **Idea 1: Automated Architecture Review Board for Pull Requests**, powered by the policy model in **Idea 6: Per-Team Fitness Functions**, then add the strongest “wow” layer from **Idea 2: Architecture Drift Radar**. If time allows, add the interactive question-answer experience from **Idea 4: Policy Playground and PR Conversation Simulator**. Keep **Idea 7: Threat Model Bridge** ready as the one-slide answer to the inevitable “isn’t this threat modeling?” question.

The most compelling demo is:

1. Show a clean C4/Structurizr architecture for a microservices system.
2. Open a pull request that introduces a forbidden direct dependency, such as an Order API calling an Inventory database directly.
3. ArchGuard AI runs in CI, compares the architecture delta with the org-tier and team-tier fitness functions, and posts a PR review.
4. The PR is blocked with a precise violation, the impacted policy quoted in the team’s own words, risk explanation, and a safer event-driven remediation.
5. A judge comments `@archguard what is the blast radius of removing the API gateway?` and receives a short Mermaid-backed architecture answer.
6. Judges see that AI is enforcing and explaining system-level engineering quality, not just generating code.

## The ideas

| # | Idea | Best for | Why it can win |
|---|------|----------|----------------|
| 0 | [**The Final Idea**](./00-final-idea.md) | **Decided scope** | Settles the product into two policy packs over one graph, with the diagrams, the capability matrix, and the anti-CodeQL guardrail. |
| 1 | [Automated Architecture Review Board for PRs](./01-automated-arb-pr-review.md) | Core MVP | Converts architecture governance into developer-native PR feedback. |
| 2 | [Architecture Drift Radar](./02-architecture-drift-radar.md) | Wow factor | Proves the tool compares intended architecture with deployed reality. |
| 3 | [Remediation Copilot for Architecture Fixes](./03-remediation-copilot.md) | Demo magic | Turns violations into concrete, reviewable repair guidance. |
| 4 | [Policy Playground and PR Conversation Simulator](./04-policy-playground.md) | Judge interaction | Lets judges test rules live and ask architecture questions inside a PR. |
| 5 | [Executive Risk Scorecard and ADR Generator](./05-risk-scorecard-adr.md) | Enterprise value | Connects PR-level findings to leadership-ready architecture decisions. |
| 6 | [Per-Team Fitness Functions in Natural Language](./06-team-fitness-functions.md) | Scale and credibility | Team-owned policy in plain English, compiled once and enforced deterministically. |
| 7 | [Threat Model Bridge](./07-threat-model-bridge.md) | Objection handling | Turns the mandated security process from a competitor into an input. |
| 8 | [Versus AI Review Agents](./08-vs-ai-review-agents.md) | Objection handling | Answers "isn't this just a Claude skill?" with compilation, not adjectives. |

## Suggested hackathon build sequence

1. **Day 1:** Prepare sample Structurizr DSL, the org-tier and team-tier fitness function set, and a broken PR scenario.
2. **Day 2:** Build the CI workflow concept, the authoring-time policy compile step, and the PR comment output format.
3. **Day 3:** Add remediation explanation, policy pass/fail fixtures running in CI, and a clean dashboard/report artifact.
4. **Demo polish:** Script the catastrophic mistake narrative, prepare one live `@archguard` PR question, rehearse the threat-modeling answer, and keep a fallback recording ready.

## Reference links

- Structurizr “Why as code?”: https://docs.structurizr.com/as-code
- Structurizr DSL docs: https://docs.structurizr.com/dsl
- C4 model: https://c4model.com/
- Architecture fitness functions: https://martinfowler.com/bliki/ArchitectureFitnessFunction.html
- GitHub Actions continuous integration: https://docs.github.com/en/actions/get-started/continuous-integration
- GitHub required status checks: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Microsoft Threat Modeling Tool: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool
