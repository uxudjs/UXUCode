---
name: build
description: Implement the next approved task, or execute a stable plan with the explicit auto argument.
argument-hint: "[auto]"
---

# Build

Without arguments, complete exactly the next unchecked task: read `work-products/plan.md` and `work-products/todo.md`, implement the smallest complete vertical slice, test it, verify it, update task state, create an intentional commit when authorized, then stop and report evidence.

With `auto`, continue across the approved plan only when requirements are stable, acceptance criteria are clear, automated tests are reliable, and the user explicitly allowed continuous execution. Keep tasks independently verifiable and reversible. Stop on ambiguity, failed validation, high-risk migration, or an external dependency that has not been verified.

Create product source and deliverables in their project-native locations. Create all process files only under `work-products/`, and all new test files under `work-products/tests/`. When a test artifact refers to repository files, use relative paths from the test artifact's final location; never persist a machine-specific absolute path.

When maintaining UXUCode itself, every completed bug fix or optimization must update the release version consistently in both host manifests, the Claude marketplace, and both validators before completion.

Select only relevant internal references from `references/workflows/`: `incremental-implementation`, `test-driven-development`, `api-and-interface-design`, `frontend-ui-engineering`, `ci-cd-and-automation`, `git-workflow-and-versioning`, `observability-and-instrumentation`, and `deprecation-and-migration`.
