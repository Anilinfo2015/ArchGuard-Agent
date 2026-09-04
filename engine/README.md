# Engine — deterministic architecture drift evaluator

The engine ingests parser-derived facts and checks whether implementation dependencies
realize the declared architecture. **No LLM runs here.** Every finding carries a policy
ID and `file:line` evidence, and the gate decision is fully reproducible.

## Layout

- [`archguard/model.py`](./archguard/model.py) — evidence-bearing graph (nodes, edges).
- [`archguard/ingest.py`](./archguard/ingest.py) — Structurizr, dependency-cruiser, Terraform parsers.
- [`archguard/evaluate.py`](./archguard/evaluate.py) — deterministic policy evaluation and validated sync suggestions.
- [`archguard/cli.py`](./archguard/cli.py) — command-line entry point.
- [`tests/`](./tests/) — unit tests.

## Develop

```sh
python -m pip install -e .
python -m pytest tests -q
```

## Run

```sh
python -m archguard.cli \
  --structurizr build/workspace.json \
  --dependency-cruiser build/dependencies.json \
  --terraform-plan build/terraform-plan.json \
  --changed-file src/payments/client.ts
```

Writes `archguard-results.json`; exits non-zero only for blocking findings.
