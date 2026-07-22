---
name: plan
description: "Explicit UXUCode plan command: turn an approved specification into dependent, verifiable vertical tasks."
---

# Plan

Use after `SPEC.md` is approved and the work needs more than one small change.

1. Read the specification and current repository.
2. Identify dependencies, risks, and validation gates.
3. Split work into the smallest useful vertical slices.
4. Give every task a deliverable, acceptance criteria, test or verification command, and rollback boundary.
5. Write `tasks/plan.md` and `tasks/todo.md`.
6. Do not modify business code.

Order tasks so each completed slice is independently reviewable and, where practical, committable.
