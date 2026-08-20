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

Execution strategy is exactly `fast` or `serial`; every other value is invalid. For tasks A and B, any normalized overlap between A's write or generated-output scope and B's read, write, or generated-output scope is a conflict, and the same check applies from B to A. A write/read overlap is exempt only when the read bytes are preserved in an attempt-owned no-replace snapshot before the wave and no wave task can write any alias of that frozen input.

Record plan-level execution strategy, whether fast was requested, safe concurrency limit, and serial reason. Give every task a stable unique task ID, objective and acceptance criteria, dependencies, read scope, write scope, shared mutable resources, focused validation command and whether it may run in parallel, failure retention and rollback, wave and start conditions, and main-agent integration responsibility. Preserve any approved task-owned attempt, snapshot, or baseline root inside that task's write scope; when none is declared, the write scope must explicitly permit any intended standard default. Waves must list ready tasks, frozen tasks, barriers, and unlock conditions.

An approved `work-products/plan.md` is immutable. `work-products/todo.md` is the only mutable execution-state ledger; initialize every task as `pending` and state that task checkboxes are an atomic derived mirror of explicit state. Do not duplicate conflict rules into todo.

## Ordinary Approval Boundary

Judge ordinary approval from the whole sentence and the current candidate context, never from a keyword or regular-expression match. Ordinary specification or plan approval never requires the user to provide, copy, or repeat an internal identifier. Negation, questions, quotations, conditions, requests to edit first, and requests to continue review are not approval. Ordinary approval does not invoke the next public command or authorize auto execution, commit, push, network access, payment, training, external writes, release, or deployment.

Before presenting a plan candidate, create the candidate-owned raw-byte approval snapshot under `work-products/debug/approval-baselines/<candidate-id>/` with create-new/no-replace semantics, preserve the exact `work-products/plan.md` bytes, and record the candidate ID, snapshot reference, and pending state in `work-products/todo.md`. On clear approval, stream-compare the current plan bytes with that snapshot and atomically record approval state and receipt only in todo. Do not add a selectable execution-baseline mode, trust a user-supplied internal identifier, or write approval into .uxucode-state.json. A fresh session reuses a valid persisted receipt only when the current plan stream-compares equal to its no-replace snapshot; drift requires a human-readable candidate difference and ordinary approval again. A plan may only reference a high-risk action_id already enumerated by an approved project specification; it cannot create or widen one.

Write `work-products/plan.md` and `work-products/todo.md`. Put every planned test file under `work-products/tests/` and require test references to use paths relative to their final location. Do not modify business code. Surface unresolved decisions instead of hiding them.

Use `references/workflows/planning-and-task-breakdown/`, `context-engineering/`, and `doubt-driven-development/` when deeper planning guidance is required.
