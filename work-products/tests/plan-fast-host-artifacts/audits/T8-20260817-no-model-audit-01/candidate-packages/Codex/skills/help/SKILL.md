---
name: help
description: Show the UXUCode command catalog, workflow, modes, and language-specific guide path.
---

# UXUCode Help

Use the host-native command form: Claude Code uses `/uxu-code:<command>`; Codex uses `@<command>`.

List exactly these public commands: `help`, `spec`, `plan`, `build`, `debug`, `test`, `review`, `simplify`, `ship`, `mode`, `audit`, `debt`, `commit`, `compress`, `stats`, `status`, and `clean`.

Recommend this workflow: run `spec` when requirements or material risks are unresolved, then use `plan → build → review → simplify → ship`. Allow `plan` to start from thorough debug evidence or clear user requirements. Explain that `build auto` requires an approved stable plan and reliable tests.

Explain that `plan fast` uses `fast` only as the exact lowercase first argument, does not force parallel execution, and does not add `build fast`. The approved plan stays immutable; todo is the atomic execution-state ledger; partial-wave reentry does not rerun completed tasks. For a valid fast plan, default `build` executes only the next safe wave, while `build auto` may continue across waves within its existing authorization boundaries.

Explain that every newly created UXUCode process, plan, task, review, ship, and test file belongs under `work-products/`, with tests specifically under `work-products/tests/`. Test artifacts must reference repository files with relative paths from their final location, never machine-specific absolute paths; product source and deliverables keep their project-native locations.

Explain that `clean` is not a delete command. No argument is a zero-write report v2 preview, while the exact `apply` argument executes one atomic validated plan. Test-like names are discovery only; fixed legacy mappings or exact `work-products/clean-migration.json` entries authorize moves. The manifest controls tracked/local targets and reference/preserve-content/mutable-patch policy; incomplete `tasks/`, unsafe targets, ambiguous references, or checksum coupling return `BLOCKED` without writes.

Return the guide matching the user's language:
- 简体中文: `docs/USAGE.zh-CN.md`
- 繁體中文: `docs/USAGE.zh-TW.md`
- English: `docs/USAGE.en.md`
