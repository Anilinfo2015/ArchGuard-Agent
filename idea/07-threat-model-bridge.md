# Idea 7: Threat Model Bridge — Making TMT an Input, Not a Competitor

## One-line pitch

ArchGuard AI consumes the organization’s existing threat model as architecture-graph annotations, and then tells teams the moment a pull request changes the design so much that the threat model has stopped being true.

## Problem

Someone in the room will ask: *“isn’t this just threat modeling?”* You need a one-slide answer.

The Microsoft Threat Modeling Tool (TMT) is STRIDE-driven. It works off a data-flow diagram drawn by hand and stored in a proprietary `.tm7` file in a Windows desktop application. It is run as a point-in-time design activity, usually by the security team, and it produces a triage report. It has no native CI/CD or pull-request integration and no merge gate.

That is a different job from ArchGuard AI, but the overlap is close enough that the distinction has to be stated explicitly and early.

## How ArchGuard AI is different

| Dimension | Microsoft TMT | ArchGuard AI |
|---|---|---|
| **Concern** | Security threats only, via the STRIDE taxonomy | All architecture quality attributes: coupling, boundaries, resilience, evolvability, data residency, cost. Security is one lens, not the product. |
| **Source of truth** | A data-flow diagram drawn by hand, stored separately from the code | The artifacts engineers already version: Structurizr/C4 DSL and Terraform/Bicep. No parallel diagram to maintain. |
| **Who writes the rules** | Security template maintainers, via a fixed stencil and template ruleset | Each team, in their own natural language, reviewed in Git like code |
| **When it runs** | Once, at design time; goes stale the moment code ships | Every architecture-affecting pull request, continuously |
| **Output** | A threat report to triage offline | A blocking status check, inline PR review, cited policy text, and a remediation path |
| **Grounding** | Reasons only about the diagram you drew; it cannot know whether the diagram matches reality | Compares declared intent against deployed infrastructure reality |
| **Audience** | Security reviewers | Developers, in their own loop |

### The two sharpest wedges

1. **Trigger and enforcement, not just domain.** TMT is a workshop artifact; ArchGuard AI is a control in the delivery pipeline. Even a hypothetically perfect threat model cannot stop the pull request that violates it.
2. **Intent versus reality.** TMT validates the trust boundaries you *asserted*. ArchGuard AI verifies the boundaries you actually *deployed*. No amount of threat modeling catches a Terraform change that opens a path the data-flow diagram never showed.

## The positioning move: make TMT an input

Enterprise security organizations already have TMT mandated. Competing with it is a losing argument, and it turns the security org into an objector. Making it an input turns them into an ally.

- **Ingest trust boundaries and asset or sensitivity classifications** from the existing threat model and attach them as annotations on the architecture graph. ArchGuard AI’s policies then become security-aware for free: a rule can say “no unencrypted relationship may cross a trust boundary” without the team having to re-describe the boundary.
- **Add a fitness function type: threat model staleness.** This is a fourth evaluator type alongside the structural, deployment and operational types in [Idea 6](./06-team-fitness-functions.md). When a pull request introduces a relationship that crosses a declared trust boundary, ArchGuard AI comments in the pull request:

  > This change crosses trust boundary `Payments/PCI`. Your threat model no longer covers it. Re-run threat modeling before merge.

- That single behavior is the answer to the TMT question: **TMT tells you what threats exist in the design you drew; ArchGuard AI tells you the moment the design changed and the threat model stopped being true.**

## Demo story

A pull request adds a new relationship from a service inside the PCI trust boundary to an analytics service outside it. ArchGuard AI’s structural check passes because no coupling rule forbids it, and then the threat-model staleness check fires anyway: the boundary annotation came from the team’s own `.tm7` export, the relationship crosses it, and the threat model has not been updated since.

The security reviewer is added automatically and the pull request is flagged for re-modeling. Nobody drew a new diagram to get this, and nobody had to remember.

## MVP scope

- Import a small set of trust boundaries and asset classifications from one exported threat model; no full `.tm7` fidelity required for the demo.
- Attach boundaries to the sample architecture model as annotations.
- One staleness rule: any new or modified relationship that crosses a boundary marks the threat model as stale.
- Advisory mode by default, with the option to require a security reviewer.

## Wow factor

The tool that looked like it competed with the security team’s mandated process instead makes that process continuously accurate. Judges see the moment a design change invalidates an approved threat model, caught automatically in a pull request.

## Why judges will care

- **Impact:** stale threat models are a real and widely acknowledged enterprise gap.
- **Feasibility:** the demo only needs boundary and classification metadata, not full threat re-derivation.
- **Novelty:** connects an established security artifact to continuous pull-request enforcement.
- **Positioning:** it converts the most likely judging objection into a strength.

## Risks and mitigations

- **Risk:** it looks like ArchGuard AI is claiming to replace threat modeling.
  - **Mitigation:** state clearly and repeatedly that the threat model is an input; ArchGuard AI never generates threats or claims STRIDE coverage.
- **Risk:** threat model exports vary in format and fidelity across organizations.
  - **Mitigation:** define a minimal boundary and classification interchange shape, and support a single exporter for the hackathon.
- **Risk:** staleness alerts become noise on large systems.
  - **Mitigation:** scope staleness to boundary-crossing changes only, keep it advisory by default, and let the security org opt into blocking.

## Related tools

The same comparison answers the CI-oriented threat modeling tools such as IriusRisk and OWASP Threat Dragon. They automate threat modeling and some of them do run in a pipeline, but they stay security-scoped and threat-library-driven. None of them evaluate team-authored architecture quality policies, and none of them compare C4 intent against infrastructure-as-code reality.
