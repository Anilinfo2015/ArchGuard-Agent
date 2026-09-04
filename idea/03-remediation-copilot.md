# Idea 3: Remediation Copilot for Architecture Fixes

## One-line pitch

ArchGuard AI does not stop at finding architecture violations; it proposes the safer target architecture and a migration path.

## Problem

Architecture review tools often fail developer adoption because they only say “no.” Developers under delivery pressure need a fast path to fix the issue without waiting for an architect to rewrite the design.

## Proposed experience

For each violation, ArchGuard AI returns:

- what changed,
- why it violates policy,
- what risk it creates,
- the recommended target pattern,
- a before/after architecture explanation,
- an implementation checklist for the developer.

## Demo story

A PR adds a direct call from Billing to User Profile. ArchGuard AI suggests replacing it with a domain event and gives a migration checklist:

1. Publish `UserProfileChanged` event from User Profile.
2. Subscribe Billing to the event.
3. Store only the billing-owned projection fields.
4. Remove synchronous runtime dependency.
5. Update the architecture model to show event flow.

## MVP scope

- Focus on 3 remediation patterns:
  - direct service call to event-driven integration,
  - cross-domain database access to service-owned API/event projection,
  - circular dependency to dependency inversion or event mediation.
- Provide textual architecture patch guidance rather than code implementation.

## Wow factor

The PR comment becomes a mini architecture coaching session. It feels like having a senior architect review instantly, consistently, and politely.

## Why judges will care

- **Impact:** lowers friction to follow good architecture.
- **Feasibility:** remediation can be generated from policy plus known patterns.
- **Novelty:** moves from policy enforcement to guided architecture transformation.
- **Story:** “AI saved the developer and the platform” is memorable.

## Risks and mitigations

- **Risk:** recommendations may be too generic.
  - **Mitigation:** include component names, policy citations, and architecture graph paths.
- **Risk:** suggested fixes may over-engineer simple flows.
  - **Mitigation:** include severity and confidence, and allow advisory mode for low-risk cases.
