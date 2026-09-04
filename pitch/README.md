# Pitch — internal deck

Two formats of the same pitch:

- [`pitch.md`](./pitch.md) — Markdown slides with **flow, sequence, and role diagrams**
  as Mermaid. Renders directly on GitHub, or present with [Marp](https://marp.app/).
- `ArchGuard-Pitch.pptx` — a real, editable PowerPoint with the diagrams drawn as native
  shapes. Regenerate any time:

```sh
python -m pip install python-pptx
python pitch/build_deck.py
```

Owner: the **Pitch** contributor (see [`../CODEOWNERS`](../CODEOWNERS)).
