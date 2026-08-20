---
name: help
description: Show the UXUCode command catalog, workflow, modes, and language-specific guide path.
---

# UXUCode Help

Use the host-native command form: Claude Code uses `/uxu-code:<command>`; Codex uses `@<command>`.

List exactly these public commands: `help`, `spec`, `plan`, `build`, `debug`, `test`, `review`, `simplify`, `ship`, `mode`, `audit`, `debt`, `commit`, `compress`, `stats`, `status`, and `clean`.

Recommend this workflow: run `spec` when requirements or material risks are unresolved, then use `plan → build → review → simplify → ship`. Allow `plan` to start from thorough debug evidence or clear user requirements. Explain that `build auto` requires an approved stable plan and reliable tests.

Explain that `plan fast` uses `fast` only as the exact lowercase first argument, does not force parallel execution, and does not add `build fast`. The approved plan stays immutable; todo is the atomic execution-state ledger; partial-wave reentry does not rerun completed tasks. For a valid fast plan, default `build` executes only the next safe wave, while `build auto` may continue across waves within its existing authorization boundaries.

## Ordinary Approval Boundary

Judge ordinary approval from the whole sentence and the current candidate context, never from a keyword or regular-expression match. Ordinary specification or plan approval never requires the user to provide, copy, or repeat an internal identifier. Negation, questions, quotations, conditions, requests to edit first, and requests to continue review are not approval. Ordinary approval does not invoke the next public command or authorize auto execution, commit, push, network access, payment, training, external writes, release, or deployment.

Explain that clear natural language can approve one current specification or plan and that the wording is not fixed. Explain that the system preserves and stream-compares exact raw bytes; the user never has to reproduce an internal identifier.

Run legacy approval preflight before any general approval-snapshot check. Explain that todo approval state and receipt remain authoritative for an existing approved plan even when the immutable plan has a stale pre-approval label. Explain that legacy top-level candidate metadata is read-only history and never a task, attempt, worker, or terminal-receipt gate. Explain that an all-pending approved plan with complete raw-byte and canonical-path capture and verification needs no mode field, plan edit, or renewed approval. Explain that a legacy receipt without an approval snapshot receives one atomic preflight migration inside a plan-declared permitted root; failure or drift blocks with zero workers.

Only after an approval has a verified raw-byte snapshot, whether original or created by legacy preflight, may a fresh session reuse its persisted receipt by stream-comparing the current plan with that snapshot. Explain that a valid persisted approval is reused across fresh sessions and drift recovery asks for ordinary approval after a human-readable difference. Explain that approved project action-scoped authorization remains separate and cannot be created, replaced, or widened by ordinary approval.

Explain that every newly created UXUCode process, plan, task, review, ship, and test file belongs under `work-products/`, with tests specifically under `work-products/tests/`. Test artifacts must reference repository files with relative paths from their final location, never machine-specific absolute paths; product source and deliverables keep their project-native locations.

Explain that `clean` is not a delete command. No argument is a zero-write report v2 preview, while the exact `apply` argument executes one atomic validated plan. Test-like names are discovery only; fixed legacy mappings or exact `work-products/clean-migration.json` entries authorize moves. The manifest controls tracked/local targets and reference/preserve-content/mutable-patch policy; incomplete `tasks/`, unsafe targets, ambiguous references, or integrity coupling return `BLOCKED` without writes.

Return the guide matching the user's language:
- 简体中文: `docs/USAGE.zh-CN.md`
- 繁體中文: `docs/USAGE.zh-TW.md`
- English: `docs/USAGE.en.md`
