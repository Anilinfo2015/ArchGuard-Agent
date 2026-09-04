"""Compile natural-language governance rules into architecture-as-code.

The LLM runs only here, at authoring time. The compiled policy pack it produces is
what the deterministic engine evaluates on every PR. Run with ``ARCHGUARD_LLM=1`` to
use a live model; otherwise a deterministic offline compiler keeps the demo working
with no network.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

SYSTEM_PROMPT = (Path(__file__).parent / "prompts" / "authoring-system-prompt.md")


def _read_prompt() -> str:
    return SYSTEM_PROMPT.read_text() if SYSTEM_PROMPT.exists() else ""


def _scope_from_rules(text: str) -> str:
    match = re.search(r"Scope:\s*`([^`]+)`", text)
    return match.group(1) if match else "org"


def _numbered_rules(text: str) -> list[str]:
    rules: list[str] = []
    for raw in re.findall(r"^\s*\d+\.\s+(.*(?:\n\s{3,}.*)*)", text, flags=re.MULTILINE):
        rules.append(re.sub(r"\s+", " ", raw).strip())
    return rules


def _offline_compile(rule: str, scope: str) -> dict | None:
    """Deterministic fallback: map well-known phrasings to engine predicates."""
    lowered = rule.lower()
    contexts = re.findall(r"`([a-z0-9\-/*]+)`", rule)
    if "async" in lowered and "synchronous" in lowered and len(contexts) >= 1:
        target = next((c for c in contexts if "legacy" in c), contexts[0])
        return {
            "policyId": "ARC-COM-003",
            "scope": scope,
            "tier": "lld",
            "severity": "block",
            "predicate": f"require_async_cross_context(target='{target}')",
        }
    if "must not import" in lowered or ("may" in lowered and "import from" in lowered) or (
        "no module" in lowered and "import" in lowered
    ):
        globs = [c for c in contexts if "*" in c or "/" in c]
        source = globs[0] if globs else "src/**"
        target = globs[1] if len(globs) > 1 else "src/legacy/**"
        return {
            "policyId": "ARC-DEP-002",
            "scope": scope,
            "tier": "lld",
            "severity": "block",
            "predicate": f"no_import(source='{source}', target='{target}')",
        }
    if "only be called by" in lowered or "may only be called" in lowered:
        allowed = [c for c in contexts if "/" not in c]
        return {
            "policyId": "ARC-DEP-001",
            "scope": scope,
            "tier": "hld",
            "severity": "advisory",
            "predicate": f"allowed_callers({json.dumps(allowed)})",
        }
    if "dependency inversion" in lowered or "not on concrete" in lowered:
        return {
            "policyId": "ARC-SOL-005",
            "scope": scope,
            "tier": "lld",
            "severity": "advisory",
            "predicate": "depend_on_abstraction()",
        }
    return None


def _llm_compile(rule: str, scope: str) -> dict | None:  # pragma: no cover - network
    """Call a live model. Kept import-local so offline mode needs no dependency."""
    from openai import OpenAI

    client = OpenAI()
    response = client.chat.completions.create(
        model=os.environ.get("ARCHGUARD_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _read_prompt()},
            {"role": "user", "content": f"scope={scope}\nrule={rule}"},
        ],
    )
    return json.loads(response.choices[0].message.content)


def compile_rules(rules_text: str) -> list[dict]:
    scope = _scope_from_rules(rules_text)
    use_llm = os.environ.get("ARCHGUARD_LLM") == "1"
    policies: list[dict] = []
    for index, rule in enumerate(_numbered_rules(rules_text), start=1):
        policy = _llm_compile(rule, scope) if use_llm else _offline_compile(rule, scope)
        if policy is None:
            policy = {
                "policyId": f"ARC-UNMAPPED-{index:03d}",
                "scope": scope,
                "tier": "hld",
                "severity": "inform",
                "predicate": "manual_review_required()",
            }
        policy["source"] = f"{scope}#rule-{index}"
        policy["rationale"] = rule
        policies.append(policy)
    return policies


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rules", type=Path, required=True)
    parser.add_argument("--structurizr", type=Path, help="Optional HLD facts for name binding")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    policies = compile_rules(args.rules.read_text())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({"policies": policies}, indent=2) + "\n")
    print(json.dumps({"policies": policies}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
