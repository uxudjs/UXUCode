---
name: build
description: "Explicit UXUCode build command: implement the next approved task, or the full stable plan only with the auto argument."
---

# Build

Without arguments, execute exactly the next incomplete task:

1. Read `SPEC.md`, `tasks/plan.md`, and `tasks/todo.md`.
2. Implement the smallest complete vertical slice.
3. Add or update relevant tests.
4. Run focused checks, then broader checks proportional to risk.
5. Update task state and report evidence.
6. Stop after one task.

Use `references/testing-patterns.md` and `references/definition-of-done.md` as applicable. For security, performance, accessibility, or observability-sensitive changes, also apply the matching checklist.

With `auto`, continue through the approved plan only when requirements are stable, acceptance criteria are clear, tests are reliable, and the user has authorized continuous execution. Stop on ambiguity, failing validation, risky migration, or external behavior that cannot be verified. Each task must remain independently reviewable and reversible.
