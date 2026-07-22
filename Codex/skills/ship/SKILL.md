---
name: ship
description: "Explicit UXUCode ship command: run the final merge or release readiness gate and return GO or NO-GO."
---

# Ship

`ship` is a readiness check after development is complete. It is not a normal commit command and does not deploy production.

1. Review code quality, security, test and build readiness, migration impact, observability, deployment steps, and rollback preparation.
2. Use internal reviewer, security-reviewer, and test-reviewer roles in parallel when the host supports it; otherwise run the checks sequentially.
3. Deduplicate findings into `Blocker`, `Recommended`, and `Acknowledged`.
4. Return `GO` only when no blocker remains and required evidence exists; otherwise return `NO-GO`.
5. Include release steps, rollback plan, and explicitly unverified items.

Never take a fast path for authentication, payment, permissions, data migration, production configuration, security fixes, or public API compatibility.

Apply `references/definition-of-done.md` plus every domain checklist relevant to the release. Use `references/orchestration-patterns.md` when coordinating internal review roles.
