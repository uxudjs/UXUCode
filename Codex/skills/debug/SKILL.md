---
name: debug
description: "Explicit UXUCode debug command: reproduce an observed failure, identify its root cause, fix minimally, and verify regression coverage."
---

# Debug

Use when there is an observable failure, error, log, or incorrect behavior.

1. Record the expected and actual behavior.
2. Reproduce the problem with the smallest reliable case.
3. Gather evidence and identify the root cause.
4. Add a regression test when feasible.
5. Fix the root cause with the smallest correct change.
6. Run the regression test and relevant surrounding checks.
7. Report reproduction, root cause, changed files, and verification evidence.

Do not guess at a fix when the failure cannot be reproduced or supported by evidence.
