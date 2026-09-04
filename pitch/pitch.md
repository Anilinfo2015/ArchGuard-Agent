---
marp: true
theme: default
paginate: true
title: ArchGuard-AI — Continuous Architecture Review
---

# ArchGuard-AI

### Continuous architecture review at every step — not once

Architecture governance that runs on **every pull request**, deterministically.

_Internal hackathon pitch_

---

## The problem

Architecture review today is a **point-in-time event, not a continuous practice**:

- **Reviewed once, then it drifts.** Signed off at kickoff, maybe revisited at an ARB
  every ~6 months. Code drifts in between and nobody notices until it's expensive.
- **Rules are hard to enforce because they're hard to update.** They live in wikis,
  slides, and senior engineers' heads — so they go stale and get ignored.
- **Developers can't follow what they can't see.** Guidance is verbal and tribal, never
  expressed as **architecture-as-code**, so there's no check on the PR.

> Architecture intent is never turned into an executable, always-on check that runs
> where developers work — the pull request.


---

## The idea

1. Architects write rules in **plain English** (org / domain / team / service, HLD + LLD)
   — via a Markdown PR or the UI.
2. An **LLM compiles** each rule into **architecture-as-code** — once, at authoring time.
3. The **pipeline** runs the compiled rules **deterministically** on every PR.
4. Findings carry a **policy ID + `file:line`**. High-confidence drift **blocks**.

> The model proposes at authoring time. The compiled rule decides at runtime.

---

## Flow diagram

```mermaid
flowchart LR
  subgraph Author["Author once (LLM)"]
    NL[Rules in English<br/>MD via PR or UI] --> GEN[LLM compiler<br/>skill/] --> AAC[Architecture-as-code<br/>policy pack]
  end
  subgraph Enforce["Enforce every PR (deterministic)"]
    PR[Pull request] --> EV[Native parsers<br/>Structurizr / dep-cruiser / Terraform]
    AAC --> ENG[Engine evaluates<br/>engine/]
    EV --> ENG
    ENG --> B{Blocking?}
    B -->|yes| FAIL[PR check fails<br/>policyId + file:line]
    B -->|no| WARN[Advisory comment]
  end
```

---

## Sequence diagram

```mermaid
sequenceDiagram
  participant A as Architect
  participant UI as UI / PR
  participant S as Skill (LLM)
  participant R as Repo (main)
  participant D as Developer
  participant CI as Pipeline
  participant E as Engine

  A->>UI: Write rule in English
  UI->>S: Submit rule
  S->>S: Compile to architecture-as-code
  S->>R: PR with policy pack
  A->>R: Review & merge
  D->>CI: Open pull request
  CI->>CI: Run native parsers -> evidence
  CI->>E: Evaluate evidence vs policy pack
  E-->>CI: Findings (policyId + file:line)
  CI-->>D: Block on drift / advise otherwise
```

---

## Role diagram

```mermaid
flowchart TB
  subgraph Architect["Architect"]
    a1[Authors org/team rules in English]
    a2[Reviews compiled architecture-as-code]
  end
  subgraph Skill["Skill / LLM — authoring time"]
    s1[Compiles English -> predicates]
  end
  subgraph Developer["Developer"]
    d1[Opens PR]
    d2[Fixes flagged drift]
  end
  subgraph Pipeline["Pipeline — runtime"]
    p1[Runs parsers + engine on every PR]
  end
  a1 --> s1 --> a2
  a2 --> p1
  d1 --> p1 --> d2
```

---

## What "architecture-as-code" looks like

English rule:
> "Modules in `payments` must not call `legacy-billing` synchronously."

Compiled policy (deterministic, reviewed in a PR):

```json
{
  "policyId": "ARC-COM-003",
  "scope": "domain:payments",
  "tier": "lld",
  "severity": "block",
  "predicate": "require_async_cross_context(target='legacy-billing')",
  "source": "rules/payments.md#rule-1"
}
```

---

## Repo is built for parallel work

| Area | Folder | Owner |
| --- | --- | --- |
| Skill / Authoring (LLM) | `skill/` | _name_ |
| Engine (deterministic) | `engine/` | _name_ |
| Pipeline (CI trigger) | `pipeline/` | _name_ |
| UI (author + review) | `ui/` | _name_ |
| Pitch | `pitch/` | _name_ |

Four independent workstreams, one JSON contract between them.

---

## Why it wins

- **Deterministic gate** — reproducible, auditable, unlike generic AI reviewers.
- **Evidence-bound** — every finding has a policy ID and `file:line`.
- **Author once, enforce always** — LLM effort is spent at authoring, not per PR.
- **Continuous** — architecture review at every step, seamless for developers.

---

## The ask

- Pick your area and grab it in `CODEOWNERS`.
- Demo goal: English rule → compiled policy → blocked PR, end to end.
- Stretch: live UI authoring + advisory comments on a real PR.

**Let's ship continuous architecture review.**
