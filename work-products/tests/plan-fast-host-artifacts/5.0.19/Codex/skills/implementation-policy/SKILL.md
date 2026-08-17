---
name: implementation-policy
description: Internal policy for the smallest correct, safe, and maintainable implementation.
user-invocable: false
---

# Implementation Policy

Confirm the behavior is needed. Reuse repository code first, then standard libraries and platform-native capabilities. Avoid abstractions not proven by current requirements. Fix root causes, not symptoms. Keep the change surgical and independently verifiable.

Minimal does not mean careless: preserve correctness, security, accessibility, data integrity, compatibility decisions, observability, and rollback needs. A bounded shortcut may use `uxucode-debt:` only with a clear limit and measurable upgrade condition.

## Environment isolation

Before development, testing, dependency installation, or tool configuration, read the project contract, lock files, wrappers, runtime declarations, and existing local environments. Confirm which repository and package manager own the command, then locate the exact runtime instead of trusting activation state or a bare command name.

Reuse the declared project mechanism first. For Python, prefer the project wrapper or declared uv, Poetry, Pipenv, Conda, Dev Container, or equivalent workflow; only when no other project contract exists, use a repository-root `.venv/` and run dependencies through its exact interpreter. Never create a second toolchain or use a global fallback when a project environment is missing or damaged.

A build, fix, test, or setup request may authorize a required repository-local environment change. A read-only request must not create an environment or install dependencies. Any environment change outside the repository, including user or system packages, shared environments, global tools, persistent `PATH`, profiles, registries, services, or host caches, requires explicit authorization for the exact command and target after explaining why a project-local option is unavailable, the broader impact, verification, and rollback.

Stop when ownership, environment health, competing contracts, or the safe repair boundary is unclear. Report the blocker and smallest recovery options; never continue by silently modifying or using a global environment.

