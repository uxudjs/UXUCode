---
name: help
description: Show the UXUCode command catalog, workflow, modes, and language-specific guide path.
---

# UXUCode Help

Use the host-native command form: Claude Code uses `/uxu-code:<command>`; Codex uses `@<command>`.

List exactly these public commands: `help`, `spec`, `plan`, `build`, `debug`, `test`, `review`, `simplify`, `ship`, `mode`, `audit`, `debt`, `commit`, `compress`, `stats`, and `status`.

Recommend `spec → plan → build → review → simplify → ship` for non-trivial features. Explain that `build auto` requires an approved stable plan and reliable tests.

Return the guide matching the user's language:
- 简体中文: `docs/USAGE.zh-CN.md`
- 繁體中文: `docs/USAGE.zh-TW.md`
- English: `docs/USAGE.en.md`

