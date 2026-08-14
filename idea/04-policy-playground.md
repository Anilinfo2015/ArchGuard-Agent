# Idea 4: Policy Playground and PR Conversation Simulator

> **Superseded in part by [Idea 0, the final idea](./00-final-idea.md).** Kept as detail and demo
> material. Where the two disagree on scope, tiers, verdicts or what may gate, Idea 0 wins.

## One-line pitch

A live sandbox and PR bot where architects and judges type natural-language policies, mutate architecture scenarios, ask architecture questions, and instantly see which designs pass or fail.

## Problem

Enterprise architecture policies are often trapped in PDFs or wikis. Teams do not know whether a proposed design violates them until late review. A simulator makes policy intent testable before teams commit to a design.

## Proposed experience

- User selects a sample architecture scenario.
- User writes or edits policy text in natural language.
- ArchGuard AI compiles the text into a checkable assertion and shows its canonical restatement plus a confidence score, so the user can confirm the interpretation before it is saved. This is the authoring surface for the fitness function model in [Idea 6](./06-team-fitness-functions.md).
- User applies a proposed architecture change.
- ArchGuard AI explains whether the change passes, fails, or needs human review.
- In a PR thread, a reviewer can ask questions such as `@archguard what is the blast radius of removing the API gateway?`.
- The output includes policy traceability, suggested wording improvements, and a small affected-architecture summary or Mermaid subgraph.

## Demo story

A judge adds a rule live:

> Payment systems must not synchronously depend on customer profile services during checkout.

Then the judge toggles a proposed synchronous dependency. ArchGuard AI immediately flags the violation and recommends an event-backed profile projection. For a final wow moment, the judge asks a PR-thread question about blast radius and gets an architecture-aware answer.

## MVP scope

- No production integration required for the first demo.
- Use 3 prepared architecture scenarios:
  - clean baseline,
  - direct database boundary violation,
  - circular dependency.
- Use 5 starter policy examples that judges can edit.
- Support 2 canned PR questions: blast radius and single point of failure.

## Wow factor

The demo becomes interactive. Judges can create a new rule on the spot, ask an architecture question in the PR, and watch the architecture review adapt without a hardcoded rule change.

## Why judges will care

- **Impact:** turns static architecture guidelines into testable governance.
- **Feasibility:** can be implemented with sample graphs and policy prompts first.
- **Novelty:** natural-language policy-to-fitness-function experience.
- **Presentation:** highly engaging for live judging.

## Risks and mitigations

- **Risk:** natural-language rules are ambiguous.
  - **Mitigation:** the compiler returns `clarify` with a suggested rewording and a confidence score instead of guessing, and low-confidence rules stay advisory ([Idea 6](./06-team-fitness-functions.md)).
- **Risk:** judges may type unsupported policies.
  - **Mitigation:** clearly frame the supported policy categories in the UI, and offer the starter catalog as one-click examples.
