---
name: build
description: Implement the next approved task, or execute a stable plan with the explicit auto argument.
argument-hint: "[auto]"
---

# Build

Without arguments, read `work-products/plan.md` and `work-products/todo.md`. For a serial plan, complete exactly the next valid `pending` task. A valid fast plan makes default `build` execute the next safe wave; only `build auto` may continue across waves. Implement the smallest complete slices, test them, verify them, update task state, create an intentional commit only when authorized, then stop and report evidence.

With `auto`, continue across the approved plan only when requirements are stable, acceptance criteria are clear, automated tests are reliable, and the user explicitly allowed continuous execution. Keep tasks independently verifiable and reversible. Stop on ambiguity, failed validation, high-risk migration, or an external dependency that has not been verified.

Validate the complete plan and todo before starting any worker. Reject a missing required field, duplicate task ID, unknown dependency, dependency cycle, task assigned to multiple waves, plan/todo mismatch, checkbox/state mismatch, or wave width above the declared limit. When invalid fast metadata is structural rather than a state or ownership failure, todo remains valid, the write set still equals its recorded baseline, and one safe next task is unique, fall back to one uniquely safe next task with zero workers and report why; otherwise return `BLOCKED` with zero workers.

For conflict checks, compare canonical paths, Windows case-insensitive aliases, ancestor/descendant overlap, symbolic-link and realpath aliases, generated-output aliases, and any shared lock, cache, or temporary directory. Never launch a producer and its consumer together or start every ready task unconditionally. Runtime evidence may only lower concurrency.

The main agent is the only writer of `work-products/todo.md`; state transitions are `pending → in_progress → completed | blocked`. Before task execution, atomically record the attempt and write-set before-hash. A leftover `in_progress` state, interrupted todo replacement, plan/todo mismatch, before-hash drift, missing receipt, or unclear change ownership is `BLOCKED` with zero workers. Never rerun a completed task during partial-wave reentry. Revalidate unfinished tasks before scheduling them, and do not unlock downstream work until the whole wave and its serial barrier pass.

Workers receive one bounded task and its allowed read/write scope. Workers must not write the plan or todo, start nested workers, integrate shared files, or perform external mutations. The main agent verifies receipts and actual diffs, runs shared integration gates serially, records terminal state atomically, and stops the wave on any failure.

Create product source and deliverables in their project-native locations. Create all process files only under `work-products/`, and all new test files under `work-products/tests/`. When a test artifact refers to repository files, use relative paths from the test artifact's final location; never persist a machine-specific absolute path.

When maintaining UXUCode itself, every completed bug fix or optimization must update the release version consistently in both host manifests, the Claude marketplace, and both validators before completion.

Select only relevant internal references from `references/workflows/`: `incremental-implementation`, `test-driven-development`, `api-and-interface-design`, `frontend-ui-engineering`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `observability-and-instrumentation`, and `deprecation-and-migration`.
