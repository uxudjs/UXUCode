---
name: test
description: Design, add, or run tests with explicit evidence.
---

# Testing

For new behavior use RED → GREEN → REFACTOR: first prove the test fails for the expected reason, implement the minimum change, then refactor only while tests remain green. For bugs, add a reproducer that fails before the fix and passes after it.

Choose unit, integration, contract, end-to-end, security, performance, or accessibility checks according to risk. Never claim a test passed unless its output was observed. Report commands, scope, results, and untested areas.

Use `references/workflows/test-driven-development/`, `browser-testing-with-devtools/`, `security-and-hardening/`, `performance-optimization/`, and the checklists under `references/` as appropriate.
