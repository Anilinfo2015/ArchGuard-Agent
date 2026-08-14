# Idea 8: Why This Is Not a Review Skill or an AI Review Agent

## The question

Every reviewer asks it: *teams already run Copilot or Claude with an architecture-review skill,
so what does ArchGuard-Agent add?*

## The one-sentence answer

**ArchGuard compiles English into a reviewed, versioned predicate once, at authoring time. A
skill interprets English again on every pull request.** One re-plays; the other re-decides.

## First, the honest correction

An Agent Skill is a folder containing a `SKILL.md` plus optional bundled scripts, and the agent
can execute those scripts. So "we run real code and they only prompt" is **not** the difference,
and claiming it invites an immediate and deserved correction.

Two things remain true even when a skill bundles a script:

1. The model still sits in the decision path on every run. It decides whether the skill
   activates, how to apply it to this diff, what to weigh, and what to report.
2. The **rule itself** is still prose in a markdown file, with no owner, no tier, no expiry, no
   fixtures, and no diffable compiled form.

The difference is not code versus prose. It is **where the rule lives and whether it is
governed**.

## The comparison

| | Review skill or AI review agent | ArchGuard-Agent |
|---|---|---|
| Where the rule lives | Prose re-read into context each run | A compiled predicate committed to git |
| Who decides | The model, every invocation | A human, once, approving the compiled predicate |
| Reproducibility | Re-decides; verdicts drift run to run | Re-plays; same input, same verdict |
| Consistency at scale | 200 repositories, 200 private interpretations of one sentence | One predicate, evaluated identically everywhere |
| Version stability | Governance changes silently when the model is upgraded | Governance changes only when a pull request merges |
| What it sees | Whatever fits the context window, usually the diff | A graph assembled from parser facts across model, code and infrastructure |
| Evidence | A prose opinion | Rule id, `file:line`, traversal path, policy resolution trace |
| Can it be a required check? | No. Nobody blocks merges on a verdict they cannot reproduce or appeal | Yes. That is the point |
| Testability | You cannot unit-test a prompt's judgement | Every rule ships a pass fixture and a fail fixture that run in CI |
| Governance | None. A skill has no notion of "the team rule may not relax the org rule" | Conjunctive tier inheritance, CODEOWNERS, expiring exceptions, `review_by` |
| When it is wrong | You argue with it | You open a pull request against the predicate, or file an expiring exception |
| Memory | Stateless | Scorecards, ratchets, exception register, per-rule false-positive rate |
| Cost and latency | A model call per rule, per pull request, per repository | One compile per rule *edit*; evaluation is graph traversal |

## The concept is compilation

Name it explicitly, because it is a discipline engineers already trust.

- **Source:** the team's English sentence.
- **Target:** a typed predicate over the architecture graph, from a closed primitive set.
- **The review gate:** the compiler emits a canonical restatement — *here is what I understood
  you to mean* — and a human approves **that**, in a pull request, with a diff. A skill has no
  equivalent step.
- **The test suite:** generated pass and fail fixtures, so an ambiguous sentence is caught the
  day it is written rather than months later on someone's live pull request.
- **The output:** a versioned artifact, not an ephemeral inference.
- **The escape hatch:** anything that will not compile returns `clarify` or is refused. It never
  blocks — and, per [Idea 0](./00-final-idea.md), it is routed as a human-review task rather than
  presented as an evaluated advisory verdict, because there is no predicate to execute.

We compile for the reasons we always compile: repeatability, auditability, cost, and the
ability to **test the output before shipping it**.

## "You are still trusting the model, just earlier"

Correct, and that is the point. The trust becomes bounded, visible and falsifiable.

- You review a **small predicate and two fixtures**, not an unbounded set of future inferences.
- You review it **once per rule**, not once per pull request, so careful review is affordable.
- If the compiler misread the sentence, the failing fixture exposes it **before** the rule can
  block anyone.
- You cannot review a judgement that has not happened yet. That asymmetry is the entire
  argument.

## Where skills genuinely win, and how ArchGuard uses them

Stating this plainly makes the position stronger, not weaker. Skills need no infrastructure,
work on any repository immediately, handle the fuzzy long tail no predicate language can
express, and are very good at *explaining*.

So ArchGuard uses a model for exactly those jobs — **authoring** (compiling the prose),
**explanation** (why this violation matters), **remediation** (the design move that fixes it),
and **routing to human review** for anything that did not compile. It is removed from the one
place it must never be: the gate decision.

They are complementary. The authoring and playground experience can itself ship as a skill or a
Copilot extension:

> **A skill is a fine way to invoke ArchGuard. It is not a substitute for it.**

## The three sentences for the demo

1. A skill makes the model better at judging your architecture. ArchGuard removes the model
   from the judgement.
2. A skill re-decides. ArchGuard re-plays.
3. A skill is a prompt you hope everyone runs the same way. ArchGuard is an artifact you can
   review, test, version, own, expire, and block a merge on.

And the closing line, which is the one enterprises actually feel:

> Ask a skill the same architecture question across 200 repositories and you get 200 answers
> nobody can diff. That is not governance. It is 200 opinions with a CI badge.
