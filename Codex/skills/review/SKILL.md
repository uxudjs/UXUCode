---
name: review
description: "Explicit UXUCode review command: review current changes across correctness, readability, architecture, security, performance, and complexity."
---

# Review

Review the requested diff, staged changes, branch, or commits. If scope is ambiguous, state the chosen scope.

Evaluate:

1. Correctness and edge cases.
2. Readability and maintainability.
3. Architecture and fit with existing patterns.
4. Security and data integrity.
5. Performance and bounded resource use.
6. Complexity, duplication, and over-design.

List findings first as `Critical`, `Important`, or `Suggestion`. Each finding needs a precise `file:line`, impact, evidence, and actionable fix. If no findings exist, say so and name residual testing or verification gaps.

Use the security, performance, accessibility, observability, testing, and definition-of-done references when they apply to the changed surface.
