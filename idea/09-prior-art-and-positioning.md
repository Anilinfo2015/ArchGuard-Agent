# Prior art, honest novelty, and how this wins

This document exists because the idea is only worth building if it is not already built. Every
claim below was checked against the primary source. Where the answer was uncomfortable, the
uncomfortable answer is recorded.

## 1. The name is taken. Twice.

**`archguard/archguard`** — around 670 stars, initiated by Thoughtworks, latest release v2.3.0
in February 2025. It is an architecture governance workbench: C4-based visualisation,
architecture fitness functions, code-smell rules, a CI/CD scanner, Gradle and Maven plugins,
multi-language analysis. It also has an AI sub-project, **Co-mate** (`unit-mesh/co-mate`), an
"AI-powered architecture copilot" driving a Kotlin architecture DSL with an LLM.

This is not a distant namesake. It is the same problem domain, the same vocabulary — fitness
functions, C4, governance — and it already has an AI story.

**`archguard-labs/action`** — a GitHub Action published on the Marketplace as **"ArchGuard AI
Reviewer"**. From its own README: an "AI Architect Agent for GitHub Actions that automatically
audits Pull Requests for clean architecture boundaries", which "acts as a virtual Senior Software
Architect embedded in your CI/CD pipeline". It reads a **`.archguardrules` file from the
repository root** to enforce "your team's unique guidelines", runs Llama 3.x / Mistral on
Cloudflare Workers behind OIDC, offers one-click fix suggestions, a `@archguard-ai` ChatOps bot,
and a technical-debt dashboard.

Read that again: *plain-text architecture rules in a repository file, enforced on pull requests
by an AI agent, under this exact name.*

**Conclusion: rename.** Keeping the name means competing for search results against an
established project while being confused with an unrelated one whose design this document
explicitly argues against. The name is the single cheapest thing to change and the most expensive
thing to leave wrong.

## 2. What that competitor proves — in both directions

**For us:** somebody shipped it. Teams do want to write architecture rules in English and have
them enforced on pull requests. The demand is real and no longer hypothetical.

**Against us:** the obvious implementation is now a weekend's work, so "AI reviews your
architecture on a PR" is not a differentiator. Anyone can build it. Several people have.

**And most usefully:** it is a live demonstration of both failure modes this project is designed
around.

- *The LLM is in the decision path.* `.archguardrules` is prose injected into a prompt on every
  pull request. Same code, same rules, two runs, potentially two answers. Nothing is compiled,
  nothing is reviewed before it starts blocking, and there is no artifact to point at when a
  developer asks why.
- *The scope boundary collapsed.* Its advertised checks include mass assignment, hardcoded
  secrets and missing global error handlers. Those are security and lint findings. This is
  precisely the drift into CodeQL's territory that Test A and Test B exist to prevent — and it
  happened to a tool whose stated purpose was architecture.

That is the argument, delivered by a competitor rather than by us.

## 3. Everything else that already exists

| Space | Who owns it | Verdict |
|---|---|---|
| Architecture rules as code | ArchUnit, ArchUnitNET, ts-arch, NetArchTest, Konsist, PHPat, deptrac, import-linter, dependency-cruiser | **Solved.** Mature and trusted. Rules must be written in code by someone who knows the API |
| AI pull-request review with a prose rule file | `archguard-labs/action`, CodeRabbit custom instructions, Cursor rule packs | **Crowded.** All re-run the model per pull request |
| C4 as code, visualisation | Structurizr, ArchGuard workbench | **Solved.** No enforcement |
| Terraform drift against live infrastructure | Terraform Cloud, Spacelift, env0 | **Solved.** Wrong kind of drift |
| Fitness functions as a concept | *Building Evolutionary Architectures*, ArchGuard | **Established.** Not novel to claim |
| Declared C4 model versus planned IaC topology | — | **Unoccupied** |
| English compiled once into a reviewed, versioned architecture predicate | — | **Unoccupied in this domain** |

Two things to take from the table. First, **do not claim to have invented fitness functions,
architecture testing, or AI code review.** Every judge who knows the space will discount the
whole pitch on the strength of one overclaim. Second, the remaining white space is narrow, real,
and worth exactly what it is.

## 4. The nearest real prior art, and the number that matters

**Prose2Policy (P2P)** — *"A Practical LLM Pipeline for Translating Natural Language Access
Control Policies into Rego"*, arXiv:2603.15799 — is the closest published work: an LLM pipeline
that compiles natural-language access-control policy into Rego, with automatically generated test
fixtures. Reported results: **95.3% compile rate, 82.2% positive-test pass rate, 98.9%
negative-test pass rate.**

Different domain — access control, not software architecture — and it does not centre the
human review of the compiled artifact. But it is the strongest evidence that the mechanism
works, and it should be cited as related work rather than quietly ignored.

That 82.2% is the most important number in this document. Roughly one in six compiled policies
failed its own generated tests, in a narrower domain, with a well-specified target language. Two
consequences follow:

1. **The human review step is not a nicety, it is the product.** Anyone claiming clean
   English-to-policy compilation without review is claiming something the literature does not
   support.
2. **`UNKNOWN` and `clarify` must be first-class outputs**, because a meaningful share of
   sentences will not compile faithfully, and the honest response is to say so rather than to
   approximate.

It also explains why fixtures alone cannot be the acceptance criterion: they are generated by
the same model, in the same pass, from the same misreading.

## 5. The one defensible claim

> **Architecture rules written in English, compiled once by an agent into a reviewed,
> version-controlled predicate, and replayed deterministically on every pull request with no
> model in the decision path — evaluated against one graph spanning code structure and deployed
> topology, so the same rule can be checked against what was designed and what is actually being
> deployed.**

Neither half is shipped anywhere. The compile-and-review loop exists in research, in a different
domain. The declared-model-versus-planned-infrastructure comparison does not appear to exist at
all.

Stated more bluntly, for a judge: **everyone else asks the model on every pull request. We ask it
once, make a human sign the answer, and then never ask again.**

## 6. Where novelty and demonstrability disagree

They point in opposite directions, and pretending otherwise is how a good project loses.

- **Most novel:** the C4-versus-IaC drift capability. Nothing occupies it.
- **Most demonstrable:** the design-level loop. English sentence in, predicate out, human
  approves, pull request blocked, violating edge drawn in red — all of it visible in three
  minutes, on real code, in a familiar surface.

Drift detection needs a Structurizr workspace, a Terraform plan and a mental model of both before
the audience can see why the result matters. That is a long setup for a short slot.

**Lead with the design-level loop; land drift as the second act.** The loop earns attention
because it is legible, and drift is what makes it more than a wrapper around ArchUnit. Present
drift as evidence of reach — one rule format, one graph, two very different kinds of evidence —
rather than as the headline.

## 7. Cut list

The concept is currently two components, five scopes, ten rule families, eight reports. That is a
roadmap. A demo that gestures at all of it will land nothing.

**Build and show:**

1. One team's `rules.md`, in genuinely plain English, with one sentence that is deliberately
   ambiguous.
2. The compilation agent: restatement, predicate, generated fixtures, self-critique, and one
   sentence it refuses to compile — asking a clarifying question instead.
3. The policy pull request: a human approving a five-line predicate.
4. The gate: a violating pull request blocked, with the annotated graph and the team's own
   sentence quoted back.
5. One rerun proving byte-identical output with the model switched off.

**Do not show:** the full tier hierarchy, all ten families, the report catalogue, the exception
register, ADR generation, C4 or DDD vocabulary. Keep them in the written submission where they
demonstrate depth without consuming the clock.

The refusal in step 2 is worth more than three extra passing rules. Any demo can show a tool
succeeding; showing a tool that knows what it cannot prove is what makes an architect trust it.

## 8. Making "no AI at gate time" score on an AI rubric

There is a real risk here. On a rubric that rewards AI innovation, "we deliberately removed the
AI from the runtime path" can read as *less* AI rather than better engineering, and quietly costs
points.

The framing that fixes it: **the agent is not smaller, it is doing the harder job.** It reads an
ambiguous human sentence, resolves it against the actual codebase, produces a formal predicate
and its own adversarial test fixtures, runs them, criticises its own output, iterates until the
restatement and the fixtures agree, and refuses when the sentence cannot be proven with available
evidence.

That is a full agentic loop with tool use, self-critique and calibrated refusal. It simply runs
once, at authoring time, under human supervision — which is the point. Say the loud version:
*any agent can review a pull request; this one has to be right the first time, because after
approval it never gets to think again.*

Then show determinism as the payoff, not as an absence: same input, same verdict, every time,
with the receipts.

## 9. Honest risk register

| Risk | Assessment |
|---|---|
| Name collides with an established project and a live Marketplace action | **High.** Rename before submission |
| Compilation fidelity below what architects will trust | **High.** The literature's own number is 82.2%. Mitigated by review, fixtures, `UNKNOWN`, refusal — never by claiming it is solved |
| "A check turns red" is visually flat | **Medium-high.** Mitigated only by investing real effort in the annotated graph |
| Scope reads as a roadmap, not a build | **High.** Mitigated by the cut list |
| Determinism reads as less AI | **Medium.** Mitigated by section 8 |
| Requires too much prior context from the audience | **Medium-high.** Use one plain sentence about one controller and one repository; drop the jargon |
| Underlying architecture-test providers are mature and unglamorous | **Low, and an asset.** Standing on ArchUnit and import-linter is a credibility argument, not a weakness |
