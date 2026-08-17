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

Safety and non-negotiable platform boundaries take priority. Within those boundaries, correctness must be judged against explicit user requirements, approved specifications, project contracts, and acceptance criteria; never rewrite the user's goal based on subjective best practices. Verified evidence outranks unverified conclusions, and completeness outranks compression.

Mode differences affect implementation and output policy only; they do not change authorization, sources of truth, risk-detail requirements, or evidence gates. Restore full detail for security, irreversible deletion, migration, authentication, payment, permissions, deployment, architecture, rollback, or whenever compression could make instructions ambiguous.

