# ArchGuard UI — portal prototype

A **front-end-only** portal for the ArchGuard idea: architecture governance that runs on
**every pull request**, like CI/CD — not a one-time manual document review.

> **No backend. No build step.** It is a static multi-page site built with
> [Bootstrap 5](https://getbootstrap.com/) (CSS) and [Alpine.js](https://alpinejs.dev/)
> (a ~15 KB JS sprinkle), both loaded from a CDN. All content is mock data from `data.js`.

Built for the age of AI-generated code: when agents open, review and auto-merge pull
requests, a deterministic architecture gate is the guardrail that stops a boundary from
breaking at the HLD or LLD level.

---

## Run it locally

The pages load Bootstrap, Bootstrap Icons and Alpine from a CDN, so you need a network
connection and a static server (opening from `file://` can trip CORS on some browsers).

**Recommended — serve the folder:**

```bash
cd ui
python3 -m http.server 8099
# then open http://localhost:8099/
```

Any static server works just as well:

```bash
npx serve ui          # Node
php -S localhost:8099 # PHP
```

No `npm install`, no bundler, no server code. To force a fresh CDN fetch, hard-reload
(Ctrl/Cmd + Shift + R).

---

## Pages (menu)

The left sidebar is the portal menu, grouped by audience.

**Overview**

| Page | File | Shows |
| --- | --- | --- |
| Dashboard | `index.html` | Posture stats, continuous-review activity, why the gate matters for AI-driven PRs |
| How it works | `how-it-works.html` | The **Define → Automate → Enforce** loop |

**For architects**

| Page | File | Shows |
| --- | --- | --- |
| Author a rule | `author.html` | Type English → compile to a predicate: **expressible**, **needs clarification**, or **rejected**. Never guesses. |
| Rule catalog | `catalog.html` | Every rule as versioned governance-as-code (ID, owner, predicate, prose, fixtures) |
| Architecture model | `model.html` | HLD system landscape + LLD design layering, with a toggle to preview a violation |
| Scorecards | `scorecards.html` | Team / org posture from the same findings the gate produces |
| Exceptions | `exceptions.html` | Time-boxed, ADR-backed waivers |

**For developers**

| Page | File | Shows |
| --- | --- | --- |
| PR checks | `pr-checks.html` | The gate on a PR. Switch scenarios to see all five verdicts + the resolution trace |
| Ask ArchGuard | `ask.html` | The rules as a developer skill: blast radius, single points of failure, why a rule fails |

---

## What's faithful to the design docs

This UI mirrors the decisions in [`../idea/00-final-idea.md`](../idea/00-final-idea.md):

- **Two policy packs over one graph** — *Design Rules* (LLD) and *Fitness Functions* (HLD).
- **A closed primitive set** — the guardrail that keeps ArchGuard *architectural* and stops
  it from drifting into a CodeQL/lint clone. Rules that need value or control-flow
  inspection are deliberately **rejected**.
- **Five verdicts** — `PASS`, `FAIL`, `UNKNOWN`, `ERROR`, `SKIPPED`. A zero-match selector
  is `UNKNOWN` (surfaced), never a silent pass.
- **AI at authoring time only** — the compiler turns English into a reviewable predicate;
  the gate decision runs deterministic predicates with no model in the path.

---

## Files

| File | Purpose |
| --- | --- |
| `*.html` | One file per page; each holds its content in `<main id="ag-content">` |
| `portal.js` | Injects the shared navbar + sidebar, exposes render helpers (`window.AG`) and the mock authoring-time compiler |
| `portal.css` | A light custom layer over Bootstrap: app shell, sidebar, schematic SVGs, code/chat blocks |
| `data.js` | `window.ArchGuardData` — all mock rules, scenarios, graphs and feeds |

> **Prototype scope:** this is a UI mock. It does not call a server or an LLM, does not
> read a real repository, and is not wired to the Python engine. It exists to communicate
> the product experience.
