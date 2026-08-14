# ArchGuard AI Hackathon Idea Pack

Goal: shape **ArchGuard AI** into a hackathon-winning demo: an automated Architecture Review Board that runs inside CI/CD, reads Architecture as Code, checks architecture policies, blocks risky pull requests, and suggests safer designs.

The wedge it leads with: **teams stand up a new first-party application for every feature instead of reusing the one their team already owns.** Every one of those was approved in a pull request nobody could reasonably have rejected, because no reviewer remembers the previous thirty-nine. Nothing on the market checks that, and [section 5 of Idea 9](./09-prior-art-and-positioning.md) explains why nothing on the market easily can.

> **Note on the name.** The product is renamed **Extant**; two projects already ship as ArchGuard, one of them an AI architecture reviewer on the GitHub Marketplace. The rename is mechanical and deferred to its own change, so this pack still reads `ArchGuard AI` and `ArchGuard-Agent` throughout. See [The name](./00-final-idea.md#the-name).

This folder is intentionally documentation-only. It captures product ideas, demo narratives, and research-backed positioning before implementation starts.

## Start here

**[The Final Idea](./00-final-idea.md) is the decided scope**, with architecture diagrams. It leads with the failure mode the product exists for — **architecture does not die from violations, it dies from additions every reviewer approved** — and settles the product into two policy packs over one multilevel graph: **Design Rules** for low-level design such as SOLID, layering and dependency inversion, and **Fitness Functions** for high-level architecture defined at org, domain, team and service scope, including the `proliferation` type that gates shared-asset reuse. It also fixes the closed primitive set, the capability registry level, and the guardrail that keeps the tool architectural instead of becoming CodeQL.

Ideas 1 to 7 below remain valid as detail and demo material; idea 0 decides what the product *is*, [Idea 8](./08-vs-ai-review-agents.md) answers the inevitable "how is this different from a review skill or an AI review agent?", and [Idea 9](./09-prior-art-and-positioning.md) checks the whole thing against what already exists — including a tool already shipping under this name.

## Research signals

- **Architecture as Code is the right entry point.** Structurizr/C4 models are text-based, versionable, reviewable, and designed for architecture modeling as code, which makes them suitable for pull-request validation instead of trying to reverse-engineer every codebase immediately.
- **Fitness functions make architecture enforceable.** The architecture fitness function pattern frames architectural rules as automated checks that continuously validate system characteristics in delivery pipelines.
- **CI/CD is the natural enforcement layer.** GitHub Actions and similar systems can run checks on pull requests, publish comments, and use required status checks to block merges when governance rules fail.
- **AI belongs at policy authoring time, not at gate time.** A model that judges a policy live on every pull request is non-deterministic and un-auditable, and a single wrong `FAIL` on a required check destroys developer trust. Natural-language policy should be compiled into a deterministic check once, reviewed by humans, and then replayed mechanically.
- **Existing architecture tooling is dependency-shaped and repository-scoped.** ArchUnit, import-linter, dependency-cruiser and NetArchTest all answer "is this edge permitted?" inside one compilation unit. None can answer "how many of these does the organization already own?", which is why the proliferation wedge is unoccupied.
- **Hackathon winners need a story, not just features.** Strong judging narratives emphasize impact, feasibility, novelty, and a clear before/after demo moment.

## Competitive white space

The strongest research-backed positioning is **shift-left Architecture Review Board as a GitHub Action**. Existing tools cover pieces of the problem, but not the full loop:

| Existing category | What it covers | Gap ArchGuard AI can own |
|---|---|---|
| Structurizr CLI | Validates and exports architecture models | Does not enforce organization-specific policy or comment on PR risk. |
| ArchUnit / NetArchTest | Code-level architecture tests | Repository-scoped and dependency-shaped. Does not understand C4 models, IaC topology, or natural-language policies — and cannot ask how many of something the organization owns. |
| OPA / Checkov / tfsec | Policy-as-code and IaC compliance | Sees one plan in isolation. Can ban a resource type; cannot tell a duplicate from a first instance. |
| Backstage / service catalogs / CMDBs | Inventory of what the organization owns | Records the fortieth first-party app; never blocks the fortieth pull request. |
| Terraform drift tools | Infrastructure drift | Does not compare deployed topology to approved C4 architecture. |
| ADR/documentation tools | Records decisions | Does not enforce decisions against live pull requests. |
| Generic AI review agents and review skills | Model-judged review comments on a pull request | Re-decides on every run, so verdicts are irreproducible, untestable, and cannot be a required check. See [Idea 8](./08-vs-ai-review-agents.md). |
| Microsoft Threat Modeling Tool (TMT) | STRIDE threat analysis over a hand-drawn data-flow diagram, as a point-in-time design activity | Security-scoped, desktop-based, and disconnected from CI/CD. It cannot block a PR, and it cannot tell you when the design changed underneath it. |
| IriusRisk / OWASP Threat Dragon | Threat modeling with more automation, some of it pipeline-friendly | Still security-scoped and threat-library-driven. Does not evaluate team-authored architecture quality policies or compare C4 intent with IaC reality. |

This creates a defensible hackathon claim: **ArchGuard AI connects architecture intent, infrastructure reality, the organization's existing asset registry, natural-language policy, and PR enforcement in one workflow.** The registry join is the part no incumbent can add cheaply: the catalogs that know what exists cannot gate, and the gates that can block cannot see past one repository.

## How this differs from threat modeling tools

Expect the question *“isn’t this just threat modeling?”* Two wedges answer it:

1. **Trigger and enforcement, not just domain.** Threat modeling tools are workshop artifacts; ArchGuard AI is a control in the delivery pipeline. Even a perfect threat model cannot stop the pull request that violates it.
2. **Intent versus reality.** Threat modeling validates the trust boundaries you *asserted*. ArchGuard AI verifies the boundaries you actually *deployed*.

The winning move is to make the threat model an **input** rather than a competitor, so the security organization becomes an ally. See [Idea 7](./07-threat-model-bridge.md) for the full comparison table and the “threat model staleness” behavior: **TMT tells you what threats exist in the design you drew; ArchGuard AI tells you the moment the design changed and the threat model stopped being true.**

## Recommended winning angle

Lead with the **proliferation loop**: the rule that a feature must not introduce a new first-party application, compiled from English by the model in **Idea 6: Per-Team Fitness Functions** and enforced through the pull-request surface in **Idea 1: Automated Architecture Review Board**. Land **Idea 2: Architecture Drift Radar** as a twenty-second second act that proves reach rather than as the headline. If time allows, add the interactive question-answer experience from **Idea 4: Policy Playground and PR Conversation Simulator**. Keep **Idea 7: Threat Model Bridge** ready as the one-slide answer to the inevitable “isn’t this threat modeling?” question.

The most compelling demo is:

1. Open on a **chart, not a diagram**: first-party applications owned by the organization over twenty-four months, climbing. “Every one of these was approved. No pull request was wrong. The architecture is.”
2. A platform architect writes one English sentence — *a feature must not introduce a new first-party application; it authenticates through its team's registered application* — and ArchGuard replies with its canonical restatement, the compiled predicate, generated pass/fail fixtures, and **a clarifying question it refuses to guess at**: do development-tenant registrations count?
3. A human approves the interpretation in a policy pull request. Five reviewable lines.
4. A feature pull request adds a new application registration and a new client id. It is blocked, with the team's own sentence quoted back, `file:line` evidence in both the infrastructure plan and the service configuration, the name of the application it should have reused, the permission delta showing that application already covers the need, the carrying cost this change would commit the organization to, and a link to request a time-boxed exception.
5. The check is re-run with the model switched off and produces byte-identical output.
6. Twenty seconds of reach: the same rule format catching a declared-C4-versus-Terraform drift, proving one spine over two very different kinds of evidence.
7. A judge comments `@archguard what is the blast radius of removing the API gateway?` and receives a short Mermaid-backed architecture answer.

Judges see AI enforcing and explaining system-level engineering quality, not just generating code — and see it catch something no tool they know of can express.

The order-and-inventory scenario stays in the written submission. It has opened every architecture-testing demo since ArchUnit shipped, and leading with it invites exactly one question: *how is this different from ArchUnit?*

## The ideas

| # | Idea | Best for | Why it can win |
|---|------|----------|----------------|
| 0 | [**The Final Idea**](./00-final-idea.md) | **Decided scope** | Leads with erosion by approved addition, settles the product into two policy packs over one graph, and adds the reuse primitives no incumbent can express. |
| 1 | [Automated Architecture Review Board for PRs](./01-automated-arb-pr-review.md) | Core MVP | Converts architecture governance into developer-native PR feedback. |
| 2 | [Architecture Drift Radar](./02-architecture-drift-radar.md) | Wow factor | Proves the tool compares intended architecture with deployed reality. |
| 3 | [Remediation Copilot for Architecture Fixes](./03-remediation-copilot.md) | Demo magic | Turns violations into concrete, reviewable repair guidance. |
| 4 | [Policy Playground and PR Conversation Simulator](./04-policy-playground.md) | Judge interaction | Lets judges test rules live and ask architecture questions inside a PR. |
| 5 | [Executive Risk Scorecard and ADR Generator](./05-risk-scorecard-adr.md) | Enterprise value | Connects PR-level findings to leadership-ready architecture decisions. |
| 6 | [Per-Team Fitness Functions in Natural Language](./06-team-fitness-functions.md) | Scale and credibility | Team-owned policy in plain English, compiled once and enforced deterministically. |
| 7 | [Threat Model Bridge](./07-threat-model-bridge.md) | Objection handling | Turns the mandated security process from a competitor into an input. |
| 8 | [Versus AI Review Agents](./08-vs-ai-review-agents.md) | Objection handling | Answers "isn't this just a Claude skill?" with compilation, not adjectives. |
| 9 | [Prior Art and Positioning](./09-prior-art-and-positioning.md) | Competitive reality | What already exists, the name collision, the one defensible claim, and the cut list. |

## Suggested hackathon build sequence

1. **Day 1:** Prepare the asset registry export, one team's registered first-party application, the org-tier proliferation rule, and a feature branch that adds a new application registration.
2. **Day 2:** Build the CI workflow concept, the authoring-time policy compile step including the clarifying question, and the PR comment output format with carrying cost.
3. **Day 3:** Add the reused-asset and permission-delta explanation, policy pass/fail fixtures running in CI, the twenty-four-month asset chart, and a clean dashboard/report artifact.
4. **Demo polish:** Script the erosion-by-addition narrative, prepare one live `@archguard` PR question, rehearse the threat-modeling and the "why can't ArchUnit do this" answers, and keep a fallback recording ready.

## Reference links

- Structurizr “Why as code?”: https://docs.structurizr.com/as-code
- Structurizr DSL docs: https://docs.structurizr.com/dsl
- C4 model: https://c4model.com/
- Architecture fitness functions: https://martinfowler.com/bliki/ArchitectureFitnessFunction.html
- GitHub Actions continuous integration: https://docs.github.com/en/actions/get-started/continuous-integration
- GitHub required status checks: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub CODEOWNERS: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Microsoft Threat Modeling Tool: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool
