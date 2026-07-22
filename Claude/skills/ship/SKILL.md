---
name: ship
description: Perform the final merge or release gate and return GO or NO-GO; never deploy merely because this skill was invoked.
---

# Ship Gate

Use only after development is complete and a merge, version, or release decision is needed. This is not a normal commit command and does not directly deploy production.

Review code quality, security, tests/builds, compatibility, operational readiness, migration impact, and rollback readiness. Never shortcut authentication, payment, permissions, data migration, production configuration, security fixes, or public API compatibility.

Deduplicate results into `Blocker`, `Recommended`, and `Acknowledged`. Return `GO` only when no blocker remains and required evidence exists; otherwise return `NO-GO`. Include release steps, rollback steps, and anything not verified.

Use `references/workflows/shipping-and-launch/`, `ci-cd-and-automation/`, `git-workflow-and-versioning/`, `deprecation-and-migration/`, `observability-and-instrumentation/`, `security-and-hardening/`, and `test-driven-development/` according to release risk.
