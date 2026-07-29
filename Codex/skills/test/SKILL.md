---
name: test
description: Design, add, or run tests with explicit evidence.
---

# Testing

For new behavior use RED → GREEN → REFACTOR: first prove the test fails for the expected reason, implement the minimum change, then refactor only while tests remain green. For bugs, add a reproducer that fails before the fix and passes after it.

Choose unit, integration, contract, end-to-end, security, performance, or accessibility checks according to risk. Never claim a test passed unless its output was observed. Report commands, scope, results, and untested areas.

Create every new test file, fixture, snapshot, report, or other test artifact only under `work-products/tests/`. Existing test files outside that directory may be edited in place, but do not create new ones there.

Use `references/workflows/test-driven-development/`, `browser-testing-with-devtools/`, `security-and-hardening/`, `performance-optimization/`, and the checklists under `references/` as appropriate.
