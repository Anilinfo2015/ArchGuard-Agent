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

**Decided: Extant.** It names the question the gate asks before every addition — *does an
approved instance of this already exist?* — rather than a security posture, and no architecture,
governance or code-analysis project ships under it. The rationale, the runners-up and the
mechanical rename checklist are recorded in
[the final idea](./00-final-idea.md#the-name).

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
| Architecture rules as code | ArchUnit, ArchUnitNET, ts-arch, NetArchTest, Konsist, PHPat, deptrac, import-linter, dependency-cruiser | **Solved.** Mature and trusted. Rules must be written in code by someone who knows the API — and every one of them is repository-scoped and dependency-shaped |
| Inventories of what the organization owns | Backstage, service catalogs, CMDBs, cloud resource graphs | **Solved, and inert.** They record the fortieth application. Backstage exposes a Catalog API a check could call, but none of them ships a gate |
| AI pull-request review with a prose rule file | `archguard-labs/action`, CodeRabbit custom instructions, Cursor rule packs | **Crowded.** All re-run the model per pull request |
| C4 as code, visualisation | Structurizr, ArchGuard workbench | **Solved.** No enforcement |
| Terraform drift against live infrastructure | Terraform Cloud, Spacelift, env0 | **Solved.** Wrong kind of drift |
| Fitness functions as a concept | *Building Evolutionary Architectures*, ArchGuard | **Established.** Not novel to claim |
| Declared C4 model versus planned IaC topology | — | **Unoccupied** |
| **Org-wide cardinality and reuse of shared platform assets, gated on a pull request** | — | **Unoccupied.** The catalogs that know what exists ship no gate; the gates that can block ship no view past one repository. Assemblable from parts today; shipped by nobody |
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
> model in the decision path — evaluated against one graph spanning code structure, deployed
> topology, and the shared platform assets the organization already owns, so a change can be
> judged not only on whether it points the wrong way, but on whether it should exist at all.**

Neither half is shipped anywhere. The compile-and-review loop exists in research, in a different
domain. The declared-model-versus-planned-infrastructure comparison does not appear to exist at
all. And the last clause — **cardinality of an asset class across an organization, enforced on a
pull request** — is not shipped by any product in any of the categories above, because each one
holds only half of what the check requires.

Stated more bluntly, for a judge: **everyone else asks the model on every pull request. We ask it
once, make a human sign the answer, and then never ask again — and the question we ask is one no
shipped product asks at all.**

### Why "they could just add it" is a fair question with a real answer

This is the hardest question in the room. It deserves an honest answer, because the dishonest one
is easy to falsify from the vendor documentation and would take the rest of the pitch down with
it.

**Concede the technical point immediately.** Open Policy Agent evaluates over arbitrary external
data and Conftest accepts it with `--data`. Backstage's Catalog API is callable from a required
status check. ArchUnit accepts a custom `ArchCondition` that can query anything reachable from a
JVM. Nobody is *technically barred* from building this. A capable platform team could wire a
version of it together in a quarter — several probably have, privately, and thrown it away when
its author changed teams.

**Then make the claim that is actually true:** the check is the small part. What the product has
to own is three things at once, and no incumbent owns more than one.

- **The ontology.** Asset classes, capabilities, providers, scopes and their identity scheme —
  including the provisional identity of an asset that does not exist yet, which is the only thing
  that makes a pull-request gate possible at all. ArchUnit and CodeQL model symbols. Checkov
  models resources. Neither models *an organizational asset*.
- **The governance of the registry as an input.** The registry has to be a reviewed artifact with
  a coverage contract and a freshness window, or the rule silently passes on a stale export.
  Backstage holds the data and governs nothing about how it is consumed by a gate.
- **The authoring experience.** A platform architect writes one English sentence and gets a
  reviewed predicate. The alternative is Rego, which is precisely why the OPA-based version of
  this exists in so few organizations despite being possible in all of them.

Each incumbent is missing a different one of the three, and the missing pieces are structural to
what each product *is*, not gaps anyone forgot to fill. **The contribution is the join, plus the
governance that makes the join trustworthy** — not a capability nobody could implement.

## 6. Where novelty and demonstrability agree

An earlier draft of this document recorded that novelty and demonstrability pointed in opposite
directions: the C4-versus-IaC drift capability was the most novel, the design-level loop the most
demonstrable, and the demo had to choose. **The proliferation wedge removes that trade-off**,
which is the strongest single argument for leading with it.

- **Most novel:** org-wide asset cardinality gated on a pull request. No product occupies it, and
  section 5 explains why the parts have never been assembled.
- **Most demonstrable:** the same thing. It needs one chart, one English sentence, and one pull
  request that adds an application registration. No C4 literacy required, no mental model of two
  file formats, no jargon.
- **Most *felt*:** also the same thing. Every engineer in the room has watched this happen at
  their own employer and been unable to name it. Recognition is worth more than explanation.

Drift detection still needs a Structurizr workspace, a Terraform plan and a mental model of both
before the audience can see why the result matters — a long setup for a short slot. It is
therefore demoted to a twenty-second second act whose only job is to prove **reach**: one rule
format, one graph, two very different kinds of evidence.

**Lead with the proliferation loop; land drift as evidence of reach.**

## 7. Cut list

The concept is currently two components, five scopes, ten rule families, eight reports. That is a
roadmap. A demo that gestures at all of it will land nothing.

**Build and show:**

1. **The proliferation loop, end to end.** One chart of first-party applications owned over
   twenty-four months. One English sentence forbidding the forty-first. One pull request that
   adds an application registration, blocked — with the sentence quoted back, `file:line`
   evidence in both the infrastructure plan and the service configuration, the name of the
   application it should have reused, and the annual effort exposure it just took on.
2. The compilation agent: restatement, predicate, generated fixtures, self-critique, and the
   clarifying question it asks instead of guessing — *do development-tenant registrations count?*
3. The policy pull request: a human approving a five-line predicate.
4. One rerun proving byte-identical output with the model switched off.
5. Twenty seconds of reach: the same rule format catching declared-C4-versus-Terraform drift.

**Do not show:** the order-and-inventory scenario, the full tier hierarchy, all ten design
families, the report catalogue, the exception register, ADR generation, C4 or DDD vocabulary.
Keep them in the written submission where they demonstrate depth without consuming the clock.

The refusal in step 2 is worth more than three extra passing rules. Any demo can show a tool
succeeding; showing a tool that knows what it cannot prove is what makes an architect trust it.

And the cliché scenario is worth cutting specifically. *"Order API must not call the Inventory
database"* has been the opening slide of every architecture-testing tool since ArchUnit shipped.
Leading with it invites exactly one question — *how is this different from ArchUnit?* — and
spends the rest of the slot answering it. Leading with the fortieth application invites a
different question: *how did you even check that?*

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
| Name collides with an established project and a live Marketplace action | **Resolved.** Renamed to *Extant*; the mechanical rename is its own change |
| Compilation fidelity below what architects will trust | **High.** The literature's own number is 82.2%. Mitigated by review, fixtures, `UNKNOWN`, refusal — never by claiming it is solved |
| **The organization has no usable asset registry** | **High, and the main adoption dependency.** Without one, every proliferation rule is `UNKNOWN`. Mitigated by saying so loudly rather than inferring an inventory from code, which would make the headline metric untrustworthy |
| **Proliferation recall is bounded** — assets created by portal click-ops never reach a pull request | **Medium.** Mitigated by publishing the limit, and by the scheduled sweep whose gap report is a deliverable in its own right |
| "A check turns red" is visually flat | **Medium.** Now mitigated by the twenty-four-month chart, which does the emotional work before the check ever runs |
| Scope reads as a roadmap, not a build | **High.** Mitigated by the cut list |
| Determinism reads as less AI | **Medium.** Mitigated by section 8 |
| Requires too much prior context from the audience | **Low, now.** The proliferation scenario needs no C4 literacy: one chart, one sentence, one registration |
| Underlying architecture-test providers are mature and unglamorous | **Low, and an asset.** Standing on ArchUnit and import-linter is a credibility argument, not a weakness |
| **Judges read asset counting as inventory management, not architecture** | **Medium.** Mitigated by `must-obtain-capability-via`: the rule states the intended design and names the provider, so the remediation is a design move rather than a quota |
