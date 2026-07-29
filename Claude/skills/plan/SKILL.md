---
name: plan
description: Convert sufficient requirements or evidence into dependency-ordered, verifiable tasks without modifying business code.
---

# Planning

Establish the planning basis from an approved specification, thorough debug evidence, or clear user requirements. Require `spec` only when the objective, scope, constraints, or verifiable acceptance criteria are missing, or when material interface, data, security, architecture, compatibility, or rollback decisions remain unresolved. Do not require a specification merely because the work is non-trivial.

Analyze read-only, identify dependencies, and split work into vertical slices. Record the planning basis and why it is sufficient. Every task must include scope, acceptance criteria, validation, and rollback notes where relevant.

Write `work-products/plan.md` and `work-products/todo.md`. Create every other process or test file only under `work-products/`. Do not modify business code. Surface unresolved decisions instead of hiding them.

Use `references/workflows/planning-and-task-breakdown/`, `context-engineering/`, and `doubt-driven-development/` when deeper planning guidance is required.
