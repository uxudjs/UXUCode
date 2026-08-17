---
name: plan
description: Convert sufficient requirements or evidence into dependency-ordered, verifiable tasks without modifying business code.
argument-hint: "[fast]"
---

# Planning

Establish the planning basis from an approved specification, thorough debug evidence, or clear user requirements. Require `spec` only when the objective, scope, constraints, or verifiable acceptance criteria are missing, or when material interface, data, security, architecture, compatibility, or rollback decisions remain unresolved. Do not require a specification merely because the work is non-trivial.

Analyze read-only, identify dependencies, and split work into vertical slices. Record the planning basis and why it is sufficient. Every task must include scope, acceptance criteria, validation, and rollback notes where relevant.

Only the exact lowercase first argument `fast` enables fast planning. Remove that first `fast` token before treating the remaining inline text and lines as the planning request. Do not infer fast mode from `FAST`, `parallel`, `quick`, punctuation variants, a non-first `fast`, or natural-language requests for speed.

For fast planning, first establish the dependency graph, read and write boundaries, generated outputs, and shared mutable resources. Then form waves only from ready tasks proven independent. A fast request does not require parallel output. Use a serial strategy with a recorded reason whenever safety or coordination cost does not justify parallel work.

Record plan-level execution strategy, whether fast was requested, safe concurrency limit, and serial reason. Give every task a stable unique task ID, objective and acceptance criteria, dependencies, read scope, write scope, shared mutable resources, focused validation command and whether it may run in parallel, failure retention and rollback, wave and start conditions, and main-agent integration responsibility. Waves must list ready tasks, frozen tasks, barriers, and unlock conditions.

An approved `work-products/plan.md` is immutable. `work-products/todo.md` is the only mutable execution-state ledger; initialize every task as `pending`, bind it to the plan SHA-256, and state that task checkboxes are an atomic derived mirror of explicit state. Do not duplicate conflict rules into todo.

Write `work-products/plan.md` and `work-products/todo.md`. Put every planned test file under `work-products/tests/` and require test references to use paths relative to their final location. Do not modify business code. Surface unresolved decisions instead of hiding them.

Use `references/workflows/planning-and-task-breakdown/`, `context-engineering/`, and `doubt-driven-development/` when deeper planning guidance is required.
