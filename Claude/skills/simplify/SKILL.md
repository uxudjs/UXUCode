---
name: simplify
description: Reduce verified complexity without changing observable behavior.
---

# Simplification

Run only after behavior and tests are known to be correct. Look for avoidable nesting, long functions, duplication, speculative abstraction, unnecessary dependencies, and dead code within the authorized scope.

Make one behavior-preserving simplification at a time and validate immediately. Prefer existing code, standard libraries, and platform-native capabilities. Do not optimize for fewer lines at the cost of safety, accessibility, data integrity, or clarity.

Use `references/workflows/code-simplification/` and `context-engineering/` for deeper techniques while the internal `implementation-policy` remains authoritative.
