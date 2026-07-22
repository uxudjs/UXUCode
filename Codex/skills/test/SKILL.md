---
name: test
description: "Explicit UXUCode test command: design, add, or run risk-based tests and report exact evidence."
---

# Test

Choose the smallest test level that proves the requested behavior, then expand according to risk:

1. Map acceptance criteria and failure modes to tests.
2. Prefer deterministic unit or contract tests for logic and focused integration tests for boundaries.
3. Add end-to-end tests only when cross-system behavior requires them.
4. Run the most relevant checks and preserve exact commands and results.
5. Report passed, failed, skipped, and unverified areas.

Never claim a test passed unless it was actually executed. Do not replace verification with visual inspection alone when executable checks exist.

Use `references/testing-patterns.md` for test selection, determinism, boundaries, and evidence conventions.
