# ArchGuard UI — Continuous Architecture Review (prototype)

A **front-end-only** prototype for the ArchGuard idea: architecture governance that
runs on **every pull request**, like CI/CD — not a one-time manual document review.

> **No backend. No build. No live LLM.** Everything is mock data and a deterministic
> client-side evaluator, so the whole flow can be demoed offline from a single folder.

The prototype exists to *show the shape of the product* for a hackathon: the two
personas, the two levels of review (LLD + HLD), and — most importantly — the idea that
architecture review is **continuous and incremental**, because architecture keeps
evolving.

---

## Run it

It is plain HTML/CSS/JS with zero dependencies. Two ways to open it:

**Option A — just open the file**

Open `ui/index.html` in any modern browser (double-click, or drag it onto a browser
window). It works from `file://`.

**Option B — serve it (recommended)**

```bash
cd ui
python3 -m http.server 8099
# then browse to http://localhost:8099/
```

No `npm install`, no bundler, no server code.

---

## The idea in one line

> Architects author org architecture & governance rules in plain English; the rules are
> compiled **once** into deterministic predicates; the pipeline then **replays** them on
> every change — so review happens continuously, at both **LLD** (SOLID, layering) and
> **HLD** (fitness functions) levels.

The AI lives at **authoring time only** — it turns an English sentence into a reviewable
predicate. At gate time there is **no LLM in the decision path**, so the same PR always
gets the same verdict.

---

## Two personas (switch with the toggle in the header)

### ◑ Architect — *authors the governance*
| Screen | What it demonstrates |
| --- | --- |
| **Overview** | Governance posture, drift trend, continuous-review activity feed |
| **Author rule** | Type a rule in English → compile to a predicate. Returns **expressible**, **needs clarification**, or **rejected** (outside the closed vocabulary). Never guesses. |
| **Rule catalog** | Every rule as versioned governance-as-code (ID, owner, predicate, prose, fixtures) |
| **Architecture model** | The multilevel graph — HLD system landscape + LLD design layering — with a toggle to preview a proposed violation |
| **Scorecards** | Team / org posture derived from the same findings the gate produces |
| **Exceptions** | Time-boxed, audited waivers (the `X` tier) |
| **Rule health** | False-positive / UNKNOWN / vacuously-true rates so rules stay trustworthy |

### ◐ Developer — *consumes the rules in the pipeline or via a skill*
| Screen | What it demonstrates |
| --- | --- |
| **PR checks** | The gate on a pull request. Switch between four scenarios (clean / boundary break / shared DB / dependency cycle) to see all five verdicts and the policy-resolution trace |
| **Iterate — live** | The headline: change the proposed design and the gate **re-evaluates instantly** — the exact same engine that runs on every commit |
| **Ask ArchGuard** | The rules as a developer skill: ask about blast radius, single points of failure, or why a rule fails |
| **My scorecard** | A team's standing against its own design rules + inherited org fitness functions |

---

## What's faithful to the design docs

This UI mirrors the decisions in [`../idea/00-final-idea.md`](../idea/00-final-idea.md):

- **Two policy packs over one graph** — *Design Rules* (LLD) and *Fitness Functions* (HLD).
- **A closed primitive set** (11 structural + 4 reuse primitives) — the guardrail that
  keeps ArchGuard *architectural* and stops it from drifting into a CodeQL/lint clone.
  Rules that need value or control-flow inspection are deliberately **rejected**.
- **Five verdicts** — `PASS`, `FAIL`, `UNKNOWN`, `ERROR`, `SKIPPED`. A zero-match
  selector is `UNKNOWN` (surfaced), never a silent pass.
- **Evidence on every finding** — `file:line`, confidence, and the citing rule ID.

The client-side evaluator in `app.js` reproduces the semantics of
[`../archguard/evaluate.py`](../archguard/evaluate.py) (policy IDs `ARC-DEP-002`,
`ARC-COM-003`, `ARC-PHA-006`, the `confidence ≥ 0.9` block threshold, and context
derivation) so the **Iterate** and **PR checks** screens behave like the real engine.

---

## Files

| File | Purpose |
| --- | --- |
| `index.html` | App shell (header, persona switch, mount points) |
| `styles.css` | Design system + light/dark theme, all component styles |
| `data.js` | `window.ArchGuardData` — all mock rules, scenarios, graphs, feeds |
| `app.js` | Hash router, deterministic evaluator, authoring-time compiler, all views |

> **Prototype scope:** this is a UI mock. It does not call a server or an LLM, does not
> read a real repository, and is not wired to the Python package. It exists to
> communicate the product experience.
