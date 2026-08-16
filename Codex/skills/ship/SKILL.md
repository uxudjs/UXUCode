---
name: ship
description: Perform the final merge or release gate and return GO or NO-GO; never deploy merely because this skill was invoked.
---

# Ship Gate

Use only after development is complete and a merge, version, or release decision is needed. This is not a normal commit command and does not directly deploy production.

Review code quality, security, tests/builds, compatibility, operational readiness, migration impact, and rollback readiness. Never shortcut authentication, payment, permissions, data migration, production configuration, security fixes, or public API compatibility.

Use the highest applicable evidence layer, in this order:

1. Current explicit user requirements that apply to the change;
2. An approved `work-products/SPEC.md` that applies to the change;
3. An existing applicable `work-products/plan.md` and its acceptance criteria;
4. Sufficient, reproducible debug evidence;
5. A verifiable objective reconstructed from the current diff, tests, project contracts, and historical intent.

Only stop for an irreconcilable conflict inside the highest applicable layer, or when no verifiable objective, scope, or acceptance criteria can be established. Lower-priority evidence may fill gaps left by higher-priority evidence, but must not rewrite its objective; when lower-priority evidence conflicts with a higher layer, treat it as inapplicable and ignore it. A missing plan is not itself a blocker.

Evaluate an accumulated candidate by change lineage: apply each approved specification, explicit user request, or reproducible debug increment only to the changes it authorized. A later release-version increment required by a completed `build`, `debug`, or `simplify` workflow does not conflict merely because an older applicable specification names an earlier candidate version; do not treat that version as a permanent ceiling. Verify current release metadata, and limit cache or fresh-host claims to the exact version actually measured.

Deduplicate results into `Blocker`, `Recommended`, and `Acknowledged`. Return `GO` only when no blocker remains and required evidence exists; otherwise return `NO-GO`. Include release steps, rollback steps, and anything not verified.

A `GO` means only that the evaluated gate is ready; it does not authorize commit, push, installation, publication, or deployment. Return the gate in the conversation by default. If a ship report or other process file is created, place it only under `work-products/ship/`.

Use `references/workflows/shipping-and-launch/`, `ci-cd-and-automation/`, `git-workflow-and-versioning/`, `deprecation-and-migration/`, `observability-and-instrumentation/`, `security-and-hardening/`, and `test-driven-development/` according to release risk.
