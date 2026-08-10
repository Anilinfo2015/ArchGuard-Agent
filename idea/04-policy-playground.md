# Idea 4: Policy Playground and What-If Simulator

## One-line pitch

A live sandbox where architects and judges type natural-language policies, mutate architecture scenarios, and instantly see which designs pass or fail.

## Problem

Enterprise architecture policies are often trapped in PDFs or wikis. Teams do not know whether a proposed design violates them until late review. A simulator makes policy intent testable before teams commit to a design.

## Proposed experience

- User selects a sample architecture scenario.
- User writes or edits policy text in natural language.
- User applies a proposed architecture change.
- ArchGuard AI explains whether the change passes, fails, or needs human review.
- The output includes policy traceability and suggested wording improvements.

## Demo story

A judge adds a rule live:

> Payment systems must not synchronously depend on customer profile services during checkout.

Then the judge toggles a proposed synchronous dependency. ArchGuard AI immediately flags the violation and recommends an event-backed profile projection.

## MVP scope

- No production integration required for the first demo.
- Use 3 prepared architecture scenarios:
  - clean baseline,
  - direct database boundary violation,
  - circular dependency.
- Use 5 starter policy examples that judges can edit.

## Wow factor

The demo becomes interactive. Judges can create a new rule on the spot and watch the architecture review adapt without a hardcoded rule change.

## Why judges will care

- **Impact:** turns static architecture guidelines into testable governance.
- **Feasibility:** can be implemented with sample graphs and policy prompts first.
- **Novelty:** natural-language policy-to-fitness-function experience.
- **Presentation:** highly engaging for live judging.

## Risks and mitigations

- **Risk:** natural-language rules are ambiguous.
  - **Mitigation:** ask the model to classify confidence and request clarification for ambiguous policies.
- **Risk:** judges may type unsupported policies.
  - **Mitigation:** clearly frame the supported policy categories in the UI.
