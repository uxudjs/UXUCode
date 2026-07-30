---
name: help
description: Show the UXUCode command catalog, workflow, modes, and language-specific guide path.
---

# UXUCode Help

Use the host-native command form: Claude Code uses `/uxu-code:<command>`; Codex uses `@<command>`.

List exactly these public commands: `help`, `spec`, `plan`, `build`, `debug`, `test`, `review`, `simplify`, `ship`, `mode`, `audit`, `debt`, `commit`, `compress`, `stats`, `status`, and `clean`.

Recommend `spec? → plan → build → review → simplify → ship`: use `spec` when requirements or material risks are unresolved, but allow `plan` to start from thorough debug evidence or clear user requirements. Explain that `build auto` requires an approved stable plan and reliable tests.

Explain that every newly created UXUCode process, plan, task, review, ship, and test file belongs under `work-products/`, with tests specifically under `work-products/tests/`. Test artifacts must reference repository files with relative paths from their final location, never machine-specific absolute paths; product source and deliverables keep their project-native locations.

Explain that `clean` organizes confirmed misplaced UXUCode process artifacts; it is not a delete command. No argument previews with zero writes, while the exact `apply` argument executes the validated moves, reference updates, and repository `.gitignore` synchronization.

Return the guide matching the user's language:
- 简体中文: `docs/USAGE.zh-CN.md`
- 繁體中文: `docs/USAGE.zh-TW.md`
- English: `docs/USAGE.en.md`

