# The Final Idea: ArchGuard-Agent in Two Components

This document supersedes the exploratory framing in ideas 1 to 7 and fixes the scope of the
product. Ideas 1 to 7 remain valid as detail and demo material; this page decides what
ArchGuard-Agent *is*.

## One sentence

ArchGuard-Agent is Architecture as Code governance in the pull-request loop, delivered as two
policy packs — **Design Rules** for low-level design and **Fitness Functions** for high-level
architecture — over one multilevel graph, one rule format, one compiler, one evaluator, and one
report surface.

## The two components

| | **Component 1: Design Rules** | **Component 2: Fitness Functions** |
|---|---|---|
| Altitude | Low-level design, inside a service | High-level architecture, between services |
| Question | Is this code shaped the way we said we design? | Is this system shaped the way we said we architect? |
| Graph level | Design level: modules, types, ports, layers, stereotypes, aggregates | System and deployment levels: systems, containers, components, planned infrastructure, trust boundaries |
| Declared in | Per-service design declarations | Structurizr/C4 DSL plus infrastructure as code |
| Rules authored by | The owning team | Five tiers, from regulatory down to a single service |
| Examples | SOLID, layering direction, dependency inversion, aggregate access, transaction boundary placement | No synchronous payments-to-profile dependency, no shared datastore across domains, no undeclared planned path |
| Replaces | The design review comment a senior engineer repeats every sprint | The architecture review board meeting |

**They are policy packs and reporting views, not separate systems.** They are presented
separately because that is how organizations are structured — teams own design, architects own
architecture — but they compile to the same predicate language and run on the same graph. That
matters, because the most valuable rules span both levels.

The prototype in this repository already anticipates this: every `Node` carries a `tier` of
`hld` or `lld` in a single `ArchitectureGraph`, and `evaluate()` compares implementation edges
against declared edges across those tiers. Nothing here is thrown away.

## Architecture

### One graph, two policy packs

```mermaid
flowchart TB
    subgraph G["Single multilevel architecture graph"]
        direction TB
        L1["Design level<br/>modules, types, ports, layers, stereotypes"]
        L2["System level<br/>systems, containers, components, boundaries"]
        L3["Deployment level<br/>planned infrastructure resources"]
        L1 -- "implemented-by" --> L2
        L2 -- "deployed-as" --> L3
    end

    P1["Pack 1<br/>Design Rules"] -.-> L1
    P2["Pack 2<br/>Fitness Functions"] -.-> L2
    P2 -.-> L3
    P3["Realization rules<br/>span levels"] -.-> G
```

- The graph carries three levels in one structure, with explicit cross-level edges
  `implemented-by` and `deployed-as`.
- Pack 1, Design Rules, evaluates the design level.
- Pack 2, Fitness Functions, evaluates the system and deployment levels.
- Realization rules span levels and are the designated home for any rule that needs more than
  one level at once. A rule that needs a cross-level join the graph cannot express is rejected
  at authoring time, with that reason.

### Components and data flow

```mermaid
flowchart LR
    subgraph AAC["Architecture as Code"]
        A1["C4 / Structurizr DSL"]
        A2["Service design declarations"]
        A3["Terraform / Bicep plan"]
        A4["Source code"]
        A5["Threat model export"]
    end

    subgraph EP["Evidence providers"]
        E1["Structurizr parser"]
        E2["ArchUnit / Roslyn / dependency-cruiser"]
        E3["IaC plan parser"]
        E4["Trust boundary importer"]
    end

    GB["Graph builder"]
    GR["Multilevel graph<br/>base and head"]

    subgraph GAC["Governance as Code"]
        R1["Rule documents<br/>English prose"]
        R2["Compiled predicates<br/>+ fixtures"]
        R3["Baselines"]
        R4["Exceptions"]
    end

    CMP["Compiler<br/>authoring time only"]
    EVA["Deterministic evaluator"]
    FIN["Findings with evidence"]
    OUT["Report surface"]

    A1 --> E1
    A2 --> E2
    A4 --> E2
    A3 --> E3
    A5 --> E4
    E1 --> GB
    E2 --> GB
    E3 --> GB
    E4 --> GB
    GB --> GR
    R1 --> CMP
    CMP --> R2
    GR --> EVA
    R2 --> EVA
    R3 --> EVA
    R4 --> EVA
    EVA --> FIN
    FIN --> OUT
```

- Architecture as Code artifacts are read only by their native parsers, wrapped as evidence
  providers. ArchGuard never writes a compiler frontend.
- The graph builder assembles one multilevel graph, twice per pull request: once for the base
  commit and once for the head commit.
- Governance as Code holds the English rule documents, the compiled predicates and their
  fixtures, the ratchet baselines, and the exception register.
- The compiler runs at authoring time only. It is the only place a language model appears in
  this diagram.
- The deterministic evaluator reads the graph and the compiled predicates and produces
  findings, each carrying its evidence.
- The report surface renders those findings for developers, teams, architects and leadership.

### Authoring time: the model compiles

```mermaid
flowchart LR
    S["Team writes rule in English"] --> C{"Compiler"}
    C -- "expressible" --> K["Canonical restatement<br/>predicate + pass/fail fixtures"]
    C -- "ambiguous" --> Q["clarify<br/>suggested rewording"]
    C -- "outside vocabulary" --> X["Rejected<br/>with non-goal reason"]
    K --> PR["Policy pull request"]
    PR --> H{"Human approval"}
    H -- "changes requested" --> S
    Q --> S
    H -- "approved" --> V["Versioned compiled artifact"]
    V --> CI["Fixtures run in CI on every policy change"]
```

- A team writes the rule as a plain-English sentence.
- The compiler attempts to express it in the closed primitive set.
- If it is expressible, the compiler emits a canonical restatement, the predicate, and
  generated pass and fail fixtures.
- If it is ambiguous, the compiler returns `clarify` with a suggested rewording and the author
  edits the sentence. It does not guess.
- If it is outside the vocabulary, it is rejected and the matching non-goal is quoted back.
- The three artifacts are reviewed by a human in a policy pull request, as a diff.
- On approval the compiled artifact is versioned into the repository.
- The fixtures then run in CI on every subsequent policy change, so a later edit cannot
  silently unblock the organization.

### Gate time: no model in the decision path

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CI as CI workflow
    participant GB as Graph builder
    participant EV as Evaluator
    participant RP as Report

    Dev->>CI: Open pull request
    CI->>GB: Build base graph
    CI->>GB: Build head graph
    GB-->>EV: Base and head graphs
    EV->>EV: Replay compiled predicates over both graphs
    EV->>EV: Subtract base findings from head findings
    EV-->>RP: New findings, plus recorded debt and skipped rules
    RP-->>Dev: Verdict, quoted rule, evidence path, resolution trace
```

- The developer opens a pull request.
- The workflow builds the full graph twice: once at the base commit, once at the head commit.
- The evaluator replays every applicable compiled predicate over **both** complete graphs.
- It subtracts the base findings from the head findings to determine what this change
  introduced.
- It emits new findings for the gate, pre-existing findings as recorded debt, and the list of
  rules that did not apply.
- The report returns the verdict, the rule quoted in the team's own words, the evidence path,
  and the policy resolution trace.

## The core mechanism: compile once, replay every pull request

This is the whole product. Everything else is scaffolding around it.

An English sentence is compiled **once** into a typed predicate, that predicate is reviewed by a
human as a diff, and every pull request thereafter **replays** it. There is no model in the
gate decision. Same inputs, same verdict, every time, with the traversal path as evidence.

See [Idea 8](./08-vs-ai-review-agents.md) for why this is materially different from running a
review skill or an AI review agent on every pull request.

### The precise claim, and its limits

The defensible claim is narrow, and stating it narrowly is what makes it survive review:

> **An approved predicate executes deterministically against a pinned set of semantic
> dependencies.**

It does not follow that the interpretation is durable, that the evidence is complete, or that
the verdict is correct. Three consequences follow, and the product must handle all three.

**1. Compile once *per semantic dependency set*, not once forever.** A compiled predicate is a
build output whose meaning depends on inputs that drift. Every compiled artifact therefore pins
and hashes: the rule text, the primitive-set semantics version, the graph schema version, the
declaration bindings it resolved against (layers, stereotype mappings, ownership), and the
evidence-provider versions *and their declared capabilities*. When any pinned input changes, the
rule is revalidated and, where the change could alter meaning, sent back for re-approval.
Generated fixtures test predicate logic; they do not test extraction coverage or symbol binding,
so pinning is the only defence.

**2. `UNKNOWN` is a first-class verdict.** If a selector resolves to nothing, or the evidence
provider cannot see the construct in question, the result is `UNKNOWN` — never `PASS`. Selectors
carry cardinality and coverage assertions, so a rule that quietly stops matching anything is
loud rather than silent. A rule that passes because it found nothing to check is the single most
dangerous failure mode for a governance gate, and the rule-health report names those rules
**vacuously true**.

**3. Evidence has recall limits, and they are published.** An observed edge gives confidence in
what *is*; it says nothing about what the parser could not see. Reflection, dynamic dispatch,
generated code and runtime wiring are invisible to static providers. So high confidence in a
positive finding does not license high confidence in an absence, and the declared-but-unrealized
check is therefore informational only, never a gate.

## The execution model: two stages, not one

The natural first design is: **English → LLM → executable test code (ArchUnit, ArchUnitNET,
pytest-archon) → run it with `pytest` or `mvn test` → gate**, with the generated code committed
back to the repository and regenerated only when the rules file changes.

That instinct is right about the three things that matter — **compile only when the rules
change, commit the artifact, and let mature deterministic runners do the evaluation**. It is
wrong about one thing: what the LLM should emit.

### Why generating test code directly does not survive review

**It does not actually run.** Consider the canonical illustration of the approach:

```python
archrule("Exception Base Check") \
    .match("*.exceptions.*") \
    .should_inherit_from("*.BaseApplicationException") \
    .check()
```

Two defects in eight lines, both verifiable against the
[pytest-archon README](https://github.com/jwbargsten/pytest-archon):

1. `should_inherit_from` **does not exist**. pytest-archon is an *import-boundary* tool. Its
   entire vocabulary is `match`, `exclude`, `should_import`, `should_not_import`, `may_import`
   and `should(predicate)`. Inheritance is not expressible at all, so this rule cannot be
   enforced by this provider. ArchUnit *can* express it. The model does not know that, and it
   produced plausible code for a method that was never there.
2. `.check()` is called with no argument, but it "needs either a module object or a string".
   It would raise at collection time.
3. Subtler and worse: **pytest-archon checks transitive imports by default.** The intended
   architecture — `Controller → Service → Repository` — therefore *violates*
   `should_not_import("*.repositories.*")`. The generated rule fails the very design it was
   written to protect. Nothing about the code looks wrong; the provider's default semantics are
   wrong for the sentence.

And even had it run, it would not mean what the sentence means. It matches *modules*, not
"Controller classes" — a controller elsewhere is missed, and unrelated classes inside a
controller module are caught. "Must only talk to Service interfaces" is a positive
whitelist; forbidding two package globs still permits database clients, gateways and arbitrary
infrastructure classes.

This is not a prompt-quality problem to be tuned away. It is the predictable behaviour of
free-form code generation against a third-party fluent API, and it is why the **capability
matrix must be per provider** rather than per rule family.

**It is a code-execution vector.** The pipeline would commit model-generated code and then
execute it in CI with repository credentials. The rules file, the source code and the topology
file are all untrusted inputs to the generator, so prompt injection anywhere in that surface
becomes code execution in the build. Mitigations exist; removing the class of problem is
better.

**It destroys the anti-CodeQL guardrail.** The whole scope discipline rests on a closed
vocabulary. Free-form Python or Java can express anything — a lint, a secret scanner, a network
call — so the guardrail evaporates the moment arbitrary code generation is allowed.

**It only looks auditable.** Determinism comes from a human approving the artifact, and nobody
reliably verifies that 40 lines of generated Java faithfully encode one English sentence.
Committing generated imperative code produces the *appearance* of auditability while making the
review harder.

### The correction: compile to a declarative predicate, render deterministically

Split the single translation step in two. The model does the hard part — understanding intent.
Ordinary code we write and test does the mechanical part — emitting runner syntax.

```mermaid
flowchart LR
    EN["English rule<br/>rules.md"] --> LLM["Compiler agent<br/>LLM, authoring time only"]
    LLM --> PRED["Declarative predicate<br/>closed vocabulary, 5-10 lines"]
    LLM --> FIX["Generated pass/fail fixtures"]
    PRED --> REV["Human review<br/>policy pull request diff"]
    FIX --> REV
    REV --> COMMIT["Committed artifact<br/>+ pinned dependency set"]
    COMMIT --> REN["Renderer<br/>deterministic, hand-written, unit-tested"]
    REN --> B1["ArchUnit / ArchUnitNET"]
    REN --> B2["pytest-archon / import-linter"]
    REN --> B3["JSON topology matcher"]
    B1 --> RUN["Standard runners<br/>mvn test, pytest"]
    B2 --> RUN
    B3 --> RUN
    RUN --> GATE["Pass / fail gate"]
```

- The English rule is compiled by the agent at authoring time only, when `rules.md` changes.
- The agent emits a **declarative predicate** in the closed vocabulary, plus pass and fail
  fixtures.
- A human reviews both as a diff in a policy pull request — five to ten reviewable lines, not
  forty lines of generated Java.
- The approved artifact is committed with its pinned dependency set.
- A **renderer that we write, test and version** — not a model — translates the predicate into
  the native syntax of whichever provider can actually evaluate it.
- Standard runners execute it: ArchUnit or ArchUnitNET for JVM and .NET, pytest-archon or
  import-linter for Python, a JSON matcher for topology and infrastructure plans.
- The runner's verdict is the gate.

Rendered output is a **build artifact, not a reviewed artifact**: regenerable, ignorable in
review, and never the source of truth. If the renderer has a bug, it is fixed once, with a test,
for every rule — rather than being re-hallucinated per rule.

Three constraints keep this honest:

- **No escape hatch.** pytest-archon exposes `should(predicate)` and ArchUnit exposes custom
  `ArchCondition`. Both are arbitrary code. Neither is ever a compilation target, because one
  escape hatch reopens every problem above.
- **Renderers encode operands as data.** Naive string interpolation into a template recreates
  injection at the last step.
- **Fixtures are a correlated oracle.** Predicate and fixtures come from the same model in the
  same pass, so the same misreading can appear in both and the tests will happily agree with the
  bug. Generated fixtures raise confidence; they do not establish correctness, and the human
  review step is what actually catches a plausible-but-wrong compilation.

This is not an exotic design. [import-linter](https://github.com/seddonym/import-linter) already
proves declarative architecture contracts work: `type = forbidden`, `source_modules`,
`forbidden_modules` in a config file, no generated code anywhere. The contribution here is
compiling English into that shape, and reviewing the compilation.

### What the two-stage model keeps and what it costs

**Keeps** every benefit of the original instinct: mature runners do the evaluation, real source
code is scanned, no model runs at gate time, CI is fast and cheap, and the artifact is committed
and diffable.

**Costs** expressiveness. Anything outside the vocabulary cannot be compiled — which is
precisely the intended constraint, and why `clarify`, advisory routing and the human
classification step exist as escape hatches. The vocabulary must then grow deliberately, through
a reviewed change to the renderer, with the fixtures that come with it.

### Caching, stated correctly

"Recompile only when the rules file changes" is the right instinct but the wrong trigger. The
compiled predicate binds to package structure, declared stereotypes, framework conventions and
the topology file — so the rules file can be untouched while the artifact silently becomes
wrong. A rename from `repositories` to `persistence` leaves `should_not_import("*.repositories.*")`
matching nothing and passing forever.

The correct trigger is the **pinned dependency set**: rule text, primitive semantics, graph
schema, declaration bindings and provider capabilities. Any change to those revalidates the
rule; a change that could alter meaning sends it back for approval. Combined with `UNKNOWN`
verdicts and coverage assertions, this is what makes "the same codebase never randomly passes or
fails" actually true rather than merely intended.



The most common way a governance tool loses credibility is claiming to prove something its
evidence cannot support. So the primitive-to-evidence relationship is published as a capability
matrix, and **only structurally observable properties with adequate coverage may block a merge**.

| Rule family | What the graph can actually prove | Gate status |
|---|---|---|
| Layering direction, allowed dependencies, cycles, module exports, placement | Directly observable structural relationships | **May block** |
| Dependency inversion, aggregate access path, cross-cutting concern placement, data access placement | Directly observable, given declared stereotypes and layers | **May block** |
| Interface segregation width, fan-in and fan-out, coupling and instability budgets | Directly computed metrics over observed edges | **May block** as a named proxy, once rule health allows |
| Single responsibility, open-closed | **Not provable.** Stereotype uniqueness and dependency budgets are *proxies*, and are labelled as proxies in every report | Advisory, or blocking only by explicit team opt-in |
| Liskov substitution, semantic contract compatibility | **Not provable structurally.** `must-implement` proves a relationship exists, not that the contract is honoured | Advisory only, flagged for human review |
| Resilience policy, idempotency | Only that a policy was **declared**, never that it is effective at runtime | Advisory only |
| Deployment and drift | A Terraform or Bicep plan is **proposed** state, not deployed reality | May block on plan divergence; true deployed drift requires the scheduled sweep against live state |
| Operational metrics, latency, cost, error budget | Requires a bound external metric source | **Never gates.** Trend only |
| Trade-off and judgement | Nothing | **Never gates.** Routed to the ARB |

Two disciplines follow. Proxies are always named as proxies in the report, so nobody believes
the tool proved SOLID. And the documentation distinguishes **implemented** capability from
**roadmap**: today's prototype ships three structural checks, not ten families.

## The scope guardrail: staying architecture, not becoming CodeQL

### Two tests, honestly separated

An earlier draft claimed a four-part "admission test" enforced by the compiler. Two of those
four parts are human judgement, and dressing judgement up as a mechanism is exactly the kind of
overclaim this product is meant to avoid. So they are separated.

**Test A — expressibility and evidence capability. Mechanical, decided by the compiler.**

1. Every scope selector must bind to a **declared** design element — a layer, port, stereotype,
   aggregate, module, context, team or service that a human wrote into the model.
2. The predicate must be drawn **only from the closed primitive set**, which contains no
   dataflow, no control-flow, no statement-level and no value-inspection primitives.
3. The evidence required must be within the declared capability of an available provider.
4. The rule must bind to an owner, a tier and a severity.

**Test B — architecture-governance classification. Human, in the policy pull request.**

The compiler *asks*; a person *answers*: would violating this be raised in a design review or
recorded in an ADR, and can the remediation be stated as a design move — move, invert, split,
introduce an abstraction, decouple?

Test A does most of the work, because the guardrail is the **expressive limit of the primitive
set**: nothing CodeQL-shaped can be written down. But Test A alone is not sufficient, and the
counter-examples show why:

- *"Controllers may not call `Runtime.exec`; they must cross through `CommandExecutionPort`"*
  passes Test A — it is a legitimate `must-cross-via` over declared stereotypes — while being
  substantially a prohibited-API check. Test B is where a human decides whether port discipline
  is the real intent or whether this is a security rule wearing architecture's clothes.
- *"Every internet-facing service must have a threat model reviewed within 90 days"* fails the
  design-move question and is still legitimate governance. It is admitted as a **staleness**
  type rule, which is why that type exists as a first-class category rather than being forced
  through the structural vocabulary.

The claim, stated correctly: **the compiler enforces expressibility; humans classify
governance.**

**The line to remember:** if the fix changes **where code lives or who may talk to whom**, it is
ArchGuard; if it changes **what a line does**, it is CodeQL's job.

### Permanent non-goals

Quoted back to the author in every rejection: injection, XSS, SSRF and CWE detection · taint
tracking · null dereference, resource leaks, off-by-one · dead code · formatting and naming-only
lint · secret scanning · SCA, CVE and licence checks · coverage-percentage policing ·
performance micro-optimisation · generic code-smell scoring · statement-level fix suggestions.

ArchGuard **consumes** those tools' outputs as evidence where useful. It never re-implements
them.

## Component 1: Design Rules (low-level design)

### The design level of the graph

Assembled from parsers that already exist — ArchUnit, Roslyn, dependency-cruiser, tree-sitter —
wrapped as evidence providers that **declare their own capabilities and blind spots**.

- **Nodes:** module, package or namespace, type, interface or port, public member, layer,
  stereotype, aggregate, test type.
- **Edges:** depends-on, implements, extends, instantiates, injects, calls-across-boundary,
  exports, annotated-with.
- **Declarations** — the Architecture as Code for low-level design: declared layers and their
  allowed direction, module public surface, stereotype mappings, aggregate roots, framework and
  infrastructure namespaces, and modules tagged `deprecated` or `strangler-legacy`.

If a fact is neither declared nor parser-derived, no rule may reference it.

### What comes under Architecture as Code for low-level design

Ten families. These ship as the starter catalog, so most of a team's rules are picked rather
than written. Gate status per family is governed by the capability matrix above.

| Family | Representative rules |
|---|---|
| **A. SOLID** | **SRP:** one declared stereotype per type; fan-out, member-count and injected-dependency budgets *as proxies*. **OCP:** types tagged `closed` are extended, not edited; no type-switch over a declared hierarchy *as a proxy*. **LSP:** overrides flagged for review when they narrow a declared contract; advisory only. **ISP:** interface width budget; depend on role interfaces, not fat ones. **DIP:** domain and application depend only on abstractions; no direct construction of infrastructure types in the domain. |
| **B. Layering and boundaries** | Declared layer direction; no layer skipping; domain must not reference framework namespaces; module public surface control; package and class acyclicity. |
| **C. DDD tactical design** | Aggregate root is the only entry point; one repository per aggregate; value objects immutable; domain events raised only inside aggregates; anti-corruption layer at a declared external boundary; ORM entities must not cross the API boundary. |
| **D. Contracts and compatibility** | Contract and DTO shape; no inheritance in wire contracts; exported-interface breaking-change detection against the base branch; domain throws domain errors, adapters translate. |
| **E. Cross-cutting concern placement** | Logging, telemetry and audit only via the declared abstraction and only in permitted layers; authentication and authorization at the declared boundary; **transaction boundaries start in application services**, not controllers or repositories; caching only in the declared adapter; config and secrets only through the declared port; feature flags via the declared abstraction; tenant context propagated across the declared boundary. |
| **F. Resilience by design** | Every outbound adapter **declares** timeout, retry and circuit-breaker policy; message handlers declared idempotent; no unbounded fan-out. Declaration only — effectiveness is unprovable statically and is never gated. |
| **G. Evolvability budgets** | Afferent and efferent coupling, instability, abstractness, distance from the main sequence, cohesion, fan-in and fan-out — as budgets and ratchets, never as an absolute quality score. Complexity appears only as an SRP proxy, never as a lint. |
| **H. Test architecture** | Domain unit tests must not touch infrastructure; test placement mirrors module structure; every declared integration point has a contract test. |
| **I. Data access design** | Raw SQL only inside repository adapters; no cross-aggregate joins; no cross-service database access; schema-affecting entity changes require a migration artifact. |
| **J. Ownership and lifecycle** | Modules changed only by the owning team or with owner review; no *new* dependencies on `deprecated` modules; new code must not increase dependence on a `strangler-legacy` module. |

### The closed primitive set

`may-not-depend-on` · `must-depend-only-on-abstractions` · `must-be-instantiated-via` ·
`must-reside-in` · `must-implement` · `must-not-be-exported` · `must-not-cycle` ·
`must-not-exceed(metric, budget)` · `must-not-regress(finding-set)` · `must-be-annotated-with` ·
`must-cross-via`.

Note what is absent: no primitive inspects a value, follows data, or reasons about control flow.
That absence *is* the CodeQL boundary.

## Evaluation: complete graphs, delta reporting

Diff-only evaluation is fatal for an architecture tool, because architectural meaning is
graph-global and the evidence for a violation is frequently **not** in the diff. Reclassifying a
module from infrastructure to domain forbids an `A → B` edge whose source line nobody touched.
Removing a gateway invalidates paths across the whole system. A one-line import closes a cycle
made of unchanged edges.

So the model is: **evaluate completely, report on the delta.**

1. Build the complete graph at base and at head.
2. Replay every applicable predicate over **both**.
3. Gate on the difference in **finding sets**: findings present at head and absent at base.
4. Report pre-existing findings as recorded debt, attributed to the baseline rather than to this
   author.
5. Re-evaluate at the merge-queue head, so two independently clean pull requests that together
   introduce a violation are caught on the second merge instead of blaming the wrong person.
6. Run a scheduled full evaluation, and a cross-repository sweep, to catch drift originating
   outside any single pull request.

Attribution and inline comment placement are presentation concerns, solved after the verdict.
They never restrict what is evaluated.

### The ratchet, corrected

A ratchet is not a predicate over one graph, so it is defined over a pinned pair.

- **Finding-set ratchets, not score ratchets.** "No new cycles" and "no new cross-boundary
  dependencies" are stable and attributable. Aggregate scores drift with parser upgrades,
  renames and aggregation changes, so they are **reported as trends and do not gate**.
- **Pinned inputs.** Every ratchet comparison pins the base and head commits, the metric
  provider version, and the element identity scheme, so a provider upgrade cannot masquerade as
  a regression.
- **Merge-order safety.** Ratchets are re-evaluated at the merge-queue head, which is where
  concurrent pull requests are reconciled.
- **Legitimate regressions.** A staged migration may honestly worsen a metric. That is a
  time-boxed migration budget approved through the exception path — never a silently raised
  threshold.

This also resolves an inconsistency in the earlier draft: **finding-set ratchets may gate;
evolutionary metric scores never do.**

## Component 2: Fitness Functions (high-level architecture)

### Multi-tier scope model

| Tier | Owner | Scope | Change path |
|---|---|---|---|
| **T0 Regulatory** | Security and the ARB | Everything: data residency, PCI, isolation | Formal ARB. No exception, no demotion, ever |
| **T1 Org** | Architecture Review Board | All systems | ARB review |
| **T2 Domain** | Domain architect | One domain or bounded-context group | Domain review |
| **T3 Team** | Owning team | Systems and containers the team owns | Normal team pull request |
| **T4 Service** | Service owner | One service or one repository | Service owner pull request |
| **X Exception** | Named approver | One rule, one scope, one expiry date | ADR-backed, time-boxed, self-terminating |

### Precedence: conjunctive inheritance, not override

"A team rule may only be stricter than the org rule" is **undecidable** for arbitrary
predicates, and pretending otherwise creates a loophole. Consider: the org says *domain may
never depend on legacy*; the team says *domain may depend on legacy only through an
anti-corruption layer*. The team rule sounds more constrained and is in fact a relaxation. Or:
`fan-out <= 5` versus `must-not-regress(fan-out)` — which is stricter depends entirely on the
current value.

ArchGuard therefore does not attempt general implication. It removes the problem instead:

- **Inherited rules stay conjunctively active.** A lower tier never replaces a higher-tier rule.
  Both evaluate. Adding a rule can only add constraints, so a new rule is always admissible.
- **Supersession is allowed only within a formally ordered family** — the same primitive with a
  comparable parameter, such as budget 3 superseding budget 5, or an allowed set that is a
  strict subset, or `advisory` becoming `blocking`.
- **Everything else is incomparable.** Not accepted, not rejected: routed as an **unprovable
  override** to the owner of the tier being overridden. The compiler's honest answer is "I
  cannot prove this is stricter."
- **Scope narrowing is a relaxation.** Excluding elements from an inherited rule's scope is an
  exception with an expiry date, not a policy edit. This closes the loophole where a team obeys
  the letter of only-stricter while scoping the rule down to nothing.

### Fitness function types, and which may gate

| Type | Evaluated against | Cadence | May block? |
|---|---|---|---|
| **Structural** | The system level of the graph | Pull-request triggered | Yes, deterministic |
| **Realization** | Design level versus system level, through `implemented-by` | Pull-request triggered | Yes, for positive findings at high confidence; absence of evidence is informational |
| **Deployment and drift** | Terraform or Bicep **plan**, which is proposed state | Pull request, plus a sweep against live state | Yes on plan divergence; deployed-reality drift only from the sweep |
| **Staleness** | Freshness of a required artifact, such as a threat model against imported trust boundaries | Pull-request triggered | Advisory by default; the owning function may opt in |
| **Operational and evolutionary** | A bound external metric source | Continuous or scheduled | **No.** Trend only |
| **Holistic and judgement** | Explicitly not automatable | On demand | **No.** Routed to the ARB with a prepared packet |

An operational rule with no metric binding is rejected at authoring time rather than passing
silently forever.

### The policy resolution trace

Every report prints the effective rule set: which rules applied, which returned `UNKNOWN`, and
which were skipped and why — out of scope, superseded within an ordered family, or suppressed by
exception `N` expiring on a given date. An automated gate that cannot explain **why it stayed
silent** is as untrustworthy as one that cannot explain why it fired.

### What actually replaces the manual architecture review

- The architect's checklist becomes versioned rules with `id`, `owner`, `severity`, `mode`,
  `evidence`, `review_by`, and the original prose.
- The agent prepares the **ARB review packet** for the residual human decisions: the
  architecture delta, impacted rules, evidence, risk and remediation options.
- The board's work shifts from *reading every pull request* to **curating rules, deciding
  exceptions, and reviewing rule health**.
- The holistic and judgement type exists precisely so the product never claims to have automated
  taste. Architecture is trade-offs, and trade-offs need people.

## The shared spine

Both packs use the same rule document, compiler, expressibility test, evaluator contract, and
exception path.

```yaml
id: PAY-014                 # stable, cited in every report, never reused
title: Checkout must not synchronously depend on customer profile
tier: team                  # T0 | org | domain | team | service
owner: payments             # matched against CODEOWNERS
scope: [ "tag:payments", "container:Checkout API" ]
type: structural            # structural | realization | deployment | staleness | operational | holistic
severity: high
mode: blocking              # blocking | advisory
evidence: architecture-model
review_by: 2026-12-31       # mandatory, so stale rules surface instead of rotting
body: >
  During checkout, payment systems must not make a synchronous call to any customer
  profile service. Profile data needed at checkout must come from a locally owned
  projection kept up to date by events.
```

**The end-to-end story:** an org fitness function says *payments must not synchronously depend
on customer profile* at the system level. The payments team's design rule says *the checkout
domain layer may depend only on ports, and the profile projection is the only permitted source*
at the design level. One pull request, one report, two levels, one graph. No single existing
tool does both.

## Repository layout and ownership

```
architecture/                          # System level: Structurizr/C4 DSL, trust boundaries
design/                                # Design level: layers, ports, stereotypes, aggregates, legacy tags
governance/
  fitness/{org,domain,team,service}/   # Pack 2 rules
  design-rules/<team>/                 # Pack 1 rules
  catalog/                             # starter templates for both
  exceptions/                          # ADR-backed, expiring
  compiled/                            # restatement + predicate + fixtures + pinned dependency set
  baseline/                            # ratchet baselines and recorded debt
```

`CODEOWNERS` maps each directory to its owner, so a team structurally cannot edit another team's
rules or the org tier.

### Five verdicts, and the move that defeats every gate

A gate that answers only pass or fail will lie. Missing topology, an unsupported language, a
parser crash, a selector that matches nothing — each is a *failure to know*, and each becomes a
silent pass under a binary verdict. Every rule therefore resolves to one of five:

| Verdict | Meaning | Gate behaviour |
|---|---|---|
| `PASS` | Evaluated; no violation | Proceed |
| `FAIL` | Evaluated; violation found | Blocks at T0–T1 |
| `UNKNOWN` | Not decidable on available evidence | Never a pass; surfaces, and blocks only where the rule declares it must |
| `ERROR` | Provider, parse or binding failure | Blocks the check itself; never silently green |
| `SKIPPED` | Out of scope, superseded, or covered by a live exception | Reported with the reason |

A selector matching zero elements is `UNKNOWN`, never `PASS`. Vacuous truth is the most common
way an architecture gate quietly stops working.

**The self-approval hole.** Rules bind to declarations — stereotypes, layer membership, service
tags, bounded-context assignment. If a developer can change code *and* its classification in the
same pull request, the cheapest way past any rule is to relabel: move the class out of
`controllers`, drop the `web-service` tag, redraw the edge. The gate goes green and the
architecture is worse.

Declarations are therefore governed inputs, not developer-editable code. `architecture/` and
`design/` are owned separately from implementation; a change to them is a policy change that
routes to the architecture owner even when it arrives in a feature pull request. Every
classification change is diffed and reported — a pull request that removes a stereotype and the
finding attached to it is exactly the event a reviewer needs to see, and is reported as a
governance event rather than an absence.

## Reports

| Report | Audience | Contents |
|---|---|---|
| **Pull-request check and inline review** | Developer | Verdict, the rule quoted in the team's own words, `file:line` evidence and graph path, policy resolution trace, design-level remediation, exception request link |
| **SARIF and JSON artifact** | Tooling | Renders natively in the Files changed view and the Checks tab |
| **Team scorecard** | Team lead | Own-rule and org-rule pass rates, active exceptions with expiry, recurring violations, ratchet trends, recorded debt |
| **Org and domain scorecard** | ARB, leadership | Risk posture by domain and severity, blocked high-risk changes, drift backlog |
| **Drift and trend report** | Architects | Scheduled sweep: plan and live state versus declared model, coupling trend, stale artifacts |
| **Exception register** | Governance | Every deviation, approver and expiry; expired exceptions become findings in their own right |
| **Rule-health report** | Rule owners | Fire count, false-positive rate, `UNKNOWN` rate, vacuously-true and unused rules, overdue `review_by`. **Recommends** a demotion pull request; never changes effective mode by itself |
| **ADR draft** | Team and ARB | Generated only for accepted exceptions and high-impact decisions |

### Demotion is a governed change, not an automatic one

An earlier draft had noisy rules auto-demoted to advisory. That is a relaxation with no
approver, no expiry and no record — and it would have silently downgraded a T0 rule that cannot
be excepted at all. Corrected: **rule health opens a pull request proposing demotion, and a
human merges it.** The mechanism that keeps the gate trusted must itself be governed.

For the same reason, prose that never compiled cannot "land as an advisory result": there is no
predicate to execute. It is routed as a human-review task and labelled as such, never presented
as an evaluated verdict.

## Where the ideas land

| Idea | Lands in |
|---|---|
| [1 Automated ARB for PRs](./01-automated-arb-pr-review.md) | The pull-request surface shared by both packs |
| [2 Drift Radar](./02-architecture-drift-radar.md) | Pack 2, deployment and drift type |
| [3 Remediation Copilot](./03-remediation-copilot.md) | The report layer, constrained to design moves |
| [4 Policy Playground](./04-policy-playground.md) | The authoring surface for the compiler |
| [5 Scorecard and ADR](./05-risk-scorecard-adr.md) | The report layer and the exception path |
| [6 Per-team fitness functions](./06-team-fitness-functions.md) | Pack 2's tier model, extended down into Pack 1 |
| [7 Threat model bridge](./07-threat-model-bridge.md) | Pack 2, staleness type |
| [8 Versus AI review agents](./08-vs-ai-review-agents.md) | The positioning answer for the compile-once mechanism |

## Delivery phases

- **Phase 0 — Scope freeze.** Ratify the expressibility test, the non-goals and the capability
  matrix; fix the rule schema, the evaluator contract and the primitive set.
- **Phase 1 — Pack 1 MVP.** One language, one service: design declarations, the design-level
  graph builder over existing parsers, five or six primitives, roughly ten catalog rules across
  layering and dependency inversion, fixtures in CI, and a pull-request report with `file:line`
  evidence.
- **Phase 2 — Pack 2 MVP.** Tiers T0 to T4, the scope resolver, conjunctive inheritance with the
  unprovable-override path, the policy resolution trace, structural and realization evaluators
  gating, and the expiring exception path.
- **Phase 3 — Correctness scaffolding.** Base-and-head evaluation, finding-set deltas, pinned
  dependency sets, `UNKNOWN` handling, merge-queue re-evaluation.
- **Phase 4 — Reports.** SARIF, team and org scorecards, exception register, rule health, ADR
  drafting.
- **Phase 5 — Beyond the pull request.** Scheduled sweep against live state, operational metric
  bindings as trends, staleness types, ARB review packet.
- **Phase 6 — Adoption.** Starter catalog, baselines and recorded debt for legacy code,
  advisory-first rollout, false-positive governance through proposed demotion pull requests.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope creep into CodeQL and lint | The closed primitive set makes non-architectural rules inexpressible; the human classification step handles the residue; non-goals are quoted in rejections |
| The compiler encodes a subtly wrong interpretation | Canonical restatement plus generated fixtures reviewed as a diff before a rule may block |
| **The compiled predicate goes semantically stale** | Every artifact pins its rule text, primitive semantics, graph schema, declaration bindings and provider capabilities; changes trigger revalidation or re-approval |
| **A rule silently stops matching anything** | Cardinality and coverage assertions on selectors; `UNKNOWN` never degrades to `PASS`; vacuously-true rules surfaced by rule health |
| **The tool claims to prove what it cannot** | Published capability matrix; proxies labelled as proxies in every report; only structurally observable properties may gate |
| Legacy codebases drown in violations | Complete evaluation with finding-set deltas; pre-existing findings recorded as debt, not attributed to this author |
| Concurrent pull requests defeat the gate | Re-evaluation at the merge-queue head, plus a scheduled full sweep |
| Teams contradict the org tier | Conjunctive inheritance; supersession only within a formally ordered family; everything else routed as an unprovable override; scope narrowing counts as an exception |
| A noisy rule destroys trust in the gate | False-positive rate is a first-class metric, and demotion is a proposed, human-merged pull request rather than an automatic relaxation |
| Over-claiming that architecture review is automated | The explicit holistic and judgement type, routed to the ARB with a prepared packet |
| **A developer relabels their way past a rule** | Declarations are governed inputs owned separately from implementation; every classification change is diffed and reported as a governance event |
| **Compilation fidelity is below what architects will trust** | The nearest published work reports a 82.2% positive-test pass rate in a narrower domain; review, fixtures, `UNKNOWN` and refusal are load-bearing, and fidelity is never claimed as solved |
| **Name collision** with the established open-source ArchGuard project **and with a live "ArchGuard AI Reviewer" Marketplace action** | Rename before public release; credit the prior art rather than obscure it. See [Idea 9](./09-prior-art-and-positioning.md) |

## Success metrics

Blocked high-severity violations · false-positive rate per rule against the agreed threshold ·
`UNKNOWN` and vacuously-true rule counts · share of rules taken from the catalog versus bespoke ·
exception count and mean age to expiry · recorded debt burn-down per team · reduction in manual
ARB pull-request reviews · rules overdue for `review_by`.

## Open decisions

1. **First language for the design level:** Java or Kotlin (ArchUnit is the natural evidence
   provider), C# (Roslyn), or TypeScript (dependency-cruiser, already wired into this
   repository).
2. **Declared versus bootstrapped design declarations:** hand-written from the start, or
   inferred from folder conventions and then confirmed?
3. **Does "service level" mean per-repository or per-service inside a monorepo?** This decides
   how the scope resolver keys rules.
4. **Advisory-first or gating from day one** for Pack 1.
5. **Where reports live:** the pull-request check only, or also a cross-repository dashboard.
6. **The name.** Two projects already ship under it, one of them an AI architecture reviewer on
   the GitHub Marketplace. This is now a decision with a deadline, not an open question.
