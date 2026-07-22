---
name: mode
description: Set the unified implementation and output policy.
argument-hint: "<standard|lite|full|ultra|off>"
---

# Mode

Accept exactly `standard`, `lite`, `full`, `ultra`, or `off`.

- `standard`: smallest correct implementation and concise complete explanations; default.
- `lite`: preserve more teaching context and suggest simpler alternatives without changing requested structure.
- `full`: strongly enforce reuse, YAGNI, minimal maintainable changes, and conclusion-first output.
- `ultra`: aggressively remove valueless complexity and use very short output.
- `off`: disable UXUCode's global simplification and compact-output policies only.

Correctness and safety outrank explicit user requirements, workflow evidence, minimal implementation, and compactness. Restore full detail for security, irreversible deletion, migration, authentication, payment, permissions, deployment, architecture, rollback, or whenever compression could make instructions ambiguous.

