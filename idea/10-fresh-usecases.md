# Idea 10: Fresh use cases to win — beyond the PR gate

The pack so far (ideas 1–9) settles the core: compile an English rule once into a fitness
function, review it as a diff, replay it deterministically on every PR. Drift radar (2),
remediation (3), policy playground (4), ADR scorecard (5), and the threat-model bridge (7)
are already claimed. This document proposes **use cases that are not yet in the pack** and
that are still mostly unoccupied by shipping tools — each reusing the same engine (one
graph + compile-once-replay) so they cost little to add.

Ranked by *fresh × demonstrable × cheap-on-this-engine*.

---

## FRESH-1 — Declared vs **observed** topology (runtime evidence provider)

**The gap.** Every architecture-testing tool on the market — ArchUnit, dependency-cruiser,
deptrac, import-linter, even the ArchGuard workbench — reasons over **static** evidence:
imports, C4 DSL, IaC plans. None of them check the architecture your system *actually
exhibits at runtime*.

**The idea.** Add an evidence provider that ingests **OpenTelemetry / distributed-trace**
data (or service-mesh access logs) and turns observed service-to-service calls into `lld`
edges with `confidence` from call volume. Now the same fitness function — "payments must not
call legacy-billing synchronously" — is checked against what was *designed* (C4), what was
*deployed* (IaC), **and what is actually happening in production**.

**Why it wins.** "Declared vs observed" is a genuinely new axis. It catches the drift that
static analysis structurally cannot see: a runtime dependency introduced by configuration,
a feature flag, or a dynamic client. It also produces the killer line: *"Your diagram says
async. Production disagrees — here are 4,102 synchronous calls last hour."*

**On this engine.** `Edge` already carries `mode` and `Evidence(confidence=...)`; the
evaluator already compares `lld` edges to `hld` declarations. This is a new `ingest_*`
function, nothing more.

**Effort:** low–medium. **Novelty:** high. **Demo:** replay a rule against a captured trace file.

---

## FRESH-2 — The IDE Architecture Oracle (shift left of the PR)

**The gap.** Idea 4 answers questions *on the PR*. But the developer's real question comes
*before* they write the code: "Am I even allowed to call this?" Today the answer lives in an
architect's head or an email thread.

**The idea.** Ship the compiled fitness functions as a **Copilot / MCP skill** that answers,
deterministically and in the editor: *"Can `orders` call `payments` directly?"* → "No —
policy `ARC-COM-003` requires async; here is the rule in your architect's own words and the
approved event path." Same engine, same verdict as the gate, just answered earlier and
conversationally.

**Why it wins.** It turns governance from a *gate that says no* into a *guide that says how*,
directly addressing the two-sided problem: the developer gets architecture context on demand;
the architect stops answering the same email. It also scores well on an AI rubric — the model
routes the natural-language question, but the **answer is deterministic** from compiled rules.

**On this engine.** A thin query layer over `evaluate()` and the graph. No new evaluator.

**Effort:** medium. **Novelty:** medium–high. **Demo:** ask a question in the editor, get a cited answer.

---

## FRESH-3 — Governance-of-governance: rule conflict & coverage linting

**The gap.** Every rules-as-code tool assumes the rule set is coherent. None of them tell an
architect when their *own rules* contradict each other, duplicate each other, or leave a
declared boundary completely unchecked. As the rule set grows past ~30 rules, this is the
silent failure mode.

**The idea.** At **authoring time**, run the compiled predicates against each other and
against the graph to detect:
- **Contradiction** — two rules that can never both pass (block async *and* block sync on the
  same edge).
- **Redundancy / subsumption** — one rule strictly implies another.
- **Coverage gaps** — declared boundaries or domains with zero enforcing rule.
- **Dead rules** — predicates that no current evidence could ever trigger.

**Why it wins.** This is "a linter for your architecture policy" — nobody offers it, and it
directly attacks *"rules are hard to update / they contradict each other and get ignored"*
from the problem statement. It makes the architect trust the system enough to keep adding rules.

**On this engine.** Pure authoring-time analysis over the compiled predicate set; no runtime path.

**Effort:** medium. **Novelty:** high. **Demo:** add a rule that contradicts an existing one; get flagged before merge.

---

## FRESH-4 — Executable ADRs (bind decisions to enforcement, both ways)

**The gap.** Idea 5 *generates* an ADR from a finding. The fresh move is the **bidirectional
binding**: every Architecture Decision Record links to the fitness function that enforces it,
and every fitness function links back to the ADR that justifies it.

**The idea.** From that binding, surface two reports nobody produces today:
- **Unenforced decisions** — ADRs marked "accepted" with no rule enforcing them (governance
  theatre).
- **Orphan rules** — enforced predicates with no ADR explaining *why* (undocumented gates
  developers can't understand).

When a PR is blocked, the finding quotes the **ADR**, not just the rule — the developer sees
the reasoning, not only the verdict.

**Why it wins.** It makes ADRs *living and executable* instead of write-once markdown. Strong,
legible narrative: "your decisions become tests, and your tests cite your decisions."

**On this engine.** A `source`/`adr` field on the policy pack plus two set-difference reports.

**Effort:** low. **Novelty:** medium. **Demo:** show an accepted ADR with no enforcing rule, then bind and enforce it.

---

## FRESH-5 — The cross-repo / polyrepo org graph

**The gap.** Almost every architecture-testing tool checks *within one repository*. Real orgs
are polyrepo, and the most important fitness functions are **between** teams' repos: "no
team-A repo may import team-B's internal package", "every service that reads the payments DB
must be in the payments domain".

**The idea.** Compose per-repo graphs (published as small evidence artifacts by each repo's CI)
into one **org-level architecture graph**, and evaluate org-tier fitness functions across it.
Each repo stays independent; the org graph is assembled at check time.

**Why it wins.** This is the org/domain tier from idea 0 made real, and it is genuinely
unoccupied for the polyrepo case. It is also the CTO-level story: architecture governance that
spans the whole estate, not one codebase.

**On this engine.** `ArchitectureGraph` already merges nodes/edges; this is a graph-composition
step plus a scope filter. The evaluator is unchanged.

**Effort:** medium–high. **Novelty:** high. **Demo:** two repos, one importing the other's internal module, blocked at the org tier.

---

## Bonus — FinOps / GreenOps fitness functions

Compile rules like *"no new cross-AZ data transfer in the hot path"* or *"batch workloads must
request spot capacity"* against the Terraform plan. Architecture governance meets cost and
carbon. Under-served, and it broadens the audience beyond architects to platform and finance.
Low novelty risk because it is just another predicate family over the IaC evidence already
ingested.

---

## Recommendation for the hackathon

Keep the **PR gate as the spine** (already built). Add **one** fresh act that is both novel and
fast to show:

1. **Lead differentiator: FRESH-1 (declared vs observed).** It is the single most surprising
   moment — production traces contradicting the diagram — and it reuses the engine almost
   verbatim.
2. **Trust differentiator: FRESH-3 (rule linter).** It answers the judge who asks "what happens
   when you have 200 rules?" — and no competitor has an answer.
3. **Experience differentiator: FRESH-2 (IDE oracle).** It closes the loop on the two-sided
   problem and puts the "AI" where a rubric can see it, without putting a model in the gate.

Everything else stays in this document as depth. One fresh act, landed cleanly, beats five gestured at.
