---
name: build
description: Implement the next approved task, or execute a stable plan with the explicit auto argument.
argument-hint: "[auto]"
---

# Build

Without arguments, complete exactly the next unchecked task: read the plan, implement the smallest complete vertical slice, test it, verify it, update task state, create an intentional commit when authorized, then stop and report evidence.

With `auto`, continue across the approved plan only when requirements are stable, acceptance criteria are clear, automated tests are reliable, and the user explicitly allowed continuous execution. Keep tasks independently verifiable and reversible. Stop on ambiguity, failed validation, high-risk migration, or an external dependency that has not been verified.

Select only relevant internal references from `references/workflows/`: `incremental-implementation`, `test-driven-development`, `api-and-interface-design`, `frontend-ui-engineering`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `observability-and-instrumentation`, and `deprecation-and-migration`.
