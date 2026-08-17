---
name: debug
description: Reproduce an observed failure, locate its root cause, implement the smallest fix, and prove the regression is covered.
argument-hint: "<problem-or-error>"
---

# Debugging

Capture the observed behavior and reproduction conditions. Form testable hypotheses, inspect evidence, isolate the root cause, and add a failing regression test under `work-products/tests/` when practical. When a test artifact refers to repository files, use relative paths from the test artifact's final location; never persist a machine-specific absolute path. Implement the smallest root-cause fix and run targeted plus relevant regression validation.

Create debug notes and other process files only under `work-products/debug/`. Report reproduction, root cause, changed behavior, tests, and any remaining uncertainty. Do not broaden the refactor beyond the failure.

When maintaining UXUCode itself, every completed bug fix or optimization must update the release version consistently in both host manifests, the Claude marketplace, and both validators before completion.

Use `references/workflows/debugging-and-error-recovery/`, `source-driven-development/`, `observability-and-instrumentation/`, or `browser-testing-with-devtools/` according to the evidence source.
