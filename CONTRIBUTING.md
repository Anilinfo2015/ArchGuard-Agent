# Contributing — parallel workstreams

ArchGuard is a monorepo split into four independent areas so the team can work in
parallel without collisions. Each area has one owner and a clear boundary.

| Area | Folder | Owner | What you build |
| --- | --- | --- | --- |
| Skill / Authoring | [`skill/`](./skill/) | _assign_ | Natural-language rules → architecture-as-code via LLM ([`SKILL.md`](./skill/SKILL.md)) |
| Engine | [`engine/`](./engine/) | _assign_ | Deterministic evaluator, ingest, model, CLI |
| Pipeline | [`pipeline/`](./pipeline/) | _assign_ | Trigger rules from CI, GitHub Action, workflows |
| UI | [`ui/`](./ui/) | _assign_ | Architect authoring + developer review experience |

## Ground rules

- Work directly on `main` — this is a hackathon. Keep commits small and green.
- Stay inside your folder. Cross-folder changes need a heads-up to the other owner.
- The contract between areas is **architecture-as-code JSON** (`skill/generated/*.json`)
  consumed by the engine, and the engine's `archguard-results.json` consumed by CI/UI.
- The LLM is used **only** in `skill/` at authoring time. Runtime is deterministic.

## Local setup

```sh
python -m pip install -e ./engine
python -m pytest engine/tests -q
```

## Interfaces you can rely on

- Engine CLI: `python -m archguard.cli --structurizr ... --changed-file ...`
- Rule compiler: `python skill/generate_architecture.py --rules ... --out ...`
- Action: `uses: Anilinfo2015/ArchGuard-Agent@main`
