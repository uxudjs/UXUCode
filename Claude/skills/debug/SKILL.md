---
name: debug
description: Reproduce an observed failure, locate its root cause, implement the smallest fix, and prove the regression is covered.
argument-hint: "<problem-or-error>"
---

# Debugging

Capture the observed behavior and reproduction conditions. Form testable hypotheses, inspect evidence, isolate the root cause, and add a failing regression test when practical. Implement the smallest root-cause fix and run targeted plus relevant regression validation.

Report reproduction, root cause, changed behavior, tests, and any remaining uncertainty. Do not broaden the refactor beyond the failure.

Use `references/workflows/debugging-and-error-recovery/`, `source-driven-development/`, `observability-and-instrumentation/`, or `browser-testing-with-devtools/` according to the evidence source.
