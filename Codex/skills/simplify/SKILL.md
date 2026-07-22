---
name: simplify
description: "Explicit UXUCode simplify command: reduce verified code complexity without changing external behavior."
---

# Simplify

Run only after behavior is correct and relevant tests pass.

1. Identify one concrete source of unnecessary nesting, duplication, indirection, or abstraction.
2. Establish a passing behavioral baseline.
3. Make one minimal simplification.
4. Re-run the relevant checks immediately.
5. Continue only while each change improves clarity without weakening safety, accessibility, data integrity, or requested behavior.
6. Present the clean diff and verification evidence.

Do not optimize for fewer lines at the expense of clarity. Do not simplify unverified or actively changing behavior.
