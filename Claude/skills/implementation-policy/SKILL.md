---
name: implementation-policy
description: "Internal UXUCode policy used by workflows to choose the smallest correct, maintainable implementation."
---

# Implementation Policy

1. Confirm the behavior is required and understand its acceptance criteria.
2. Reuse existing repository code before adding new code.
3. Prefer standard-library and platform-native capabilities.
4. Avoid abstractions, options, dependencies, and error paths not justified by current requirements.
5. Fix root causes rather than masking symptoms.
6. Preserve correctness, security, data integrity, accessibility, compatibility, and required verification.
7. Keep changes surgical and remove only artifacts made obsolete by the current change.
8. Record an intentional bounded compromise only as `uxucode-debt: <limit>; upgrade when <measurable trigger>`.

Minimal means no smaller correct and maintainable solution exists; it does not mean the fewest lines.
