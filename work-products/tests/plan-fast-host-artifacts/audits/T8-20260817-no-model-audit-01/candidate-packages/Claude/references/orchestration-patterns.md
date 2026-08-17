# UXUCode Orchestration Patterns for Claude Code

## Choose the Smallest Pattern

Use one agent for a bounded task. Use independent subagents only when evidence can be collected in parallel. Use collaborative agent teams only when investigators must challenge each other directly.

## Sequential Workflow

For a non-trivial feature, use `spec` only when requirements or material risks remain unresolved; otherwise start at `plan`:

    [run /uxu-code:spec when needed] → /uxu-code:plan → /uxu-code:build → /uxu-code:test → /uxu-code:review → /uxu-code:ship

Planning may use an approved specification, thorough debug evidence, or clear user requirements. Each phase must consume a verified planning basis or verified output from the previous phase. Do not invoke later phases merely to appear complete.

## Fast Plan Consumption

Validate the complete plan and todo before starting any worker. A fast plan is valid only when its plan-level strategy, fast-request flag, concurrency limit, task schema, dependency graph, waves, barriers, immutable plan SHA-256, and todo mirror agree. Reject a missing required field, duplicate task ID, unknown dependency, dependency cycle, task assigned to multiple waves, plan/todo mismatch, checkbox/state mismatch, or wave width above the declared limit.

Normalize and compare canonical paths. On Windows also compare Windows case-insensitive aliases. Resolve ancestor/descendant overlap, symbolic-link and realpath aliases, generated-output aliases, and any shared lock, cache, or temporary directory before declaring independence. Never launch a producer and its consumer together or start every ready task unconditionally. Runtime evidence may only lower concurrency.

The main agent is the only writer of `work-products/todo.md`. Legal state changes are `pending → in_progress → completed | blocked`. It must atomically record the attempt and write-set before-hash before execution, and atomically record a verified receipt with terminal state afterward. A leftover `in_progress` state, interrupted todo replacement, plan/todo mismatch, before-hash drift, missing receipt, or unclear change ownership is `BLOCKED` with zero workers.

During partial-wave reentry, never rerun a completed task. Revalidate unfinished tasks before scheduling them against current dependencies and write-set baselines; schedule only still-ready work, and do not unlock downstream work until the whole wave and its serial barrier pass.

Workers receive only their task, acceptance criteria, allowed read/write scope, and focused validation. Workers must not write the plan or todo, start nested workers, integrate shared files, or perform external mutations. The main agent checks actual diffs and receipts, owns shared integration checks, and stops the wave on any failure.

If fast metadata is invalid but the defect is structural rather than a state or ownership failure, todo is otherwise valid, the write set equals its baseline, and exactly one safe next task exists, fall back to one uniquely safe next task with zero workers and report the reason; otherwise return `BLOCKED` with zero workers. A valid fast plan makes default `build` execute the next safe wave; only `build auto` may continue across waves.

## Parallel Review

The `/uxu-code:ship` gate may run `reviewer`, `security-reviewer`, and `test-reviewer` independently. Launch parallel Agent calls in one assistant turn when the host supports it. Merge results in the parent, deduplicate them, and classify them as Blocker, Recommended, or Acknowledged.

Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility always receive full review. Parallelism never authorizes writes or deployment.

## Adversarial Investigation

Use an agent team only when competing hypotheses must be debated, such as a complex production incident. A normal `/uxu-code:debug` investigation should remain single-owner unless independent evidence gathering will materially reduce time.

## Internal Agents

Plugin agents live in `agents/`: `investigator`, `builder`, `reviewer`, `security-reviewer`, and `test-reviewer`. Users do not invoke them directly; public skills coordinate them.

## Anti-Patterns

- An orchestrator that calls every workflow regardless of task size.
- Nested coordinators that add no evidence or decision.
- Parallel agents editing the same files.
- A release gate that silently commits, pushes, or deploys.
- A compact mode that removes safety, validation, migration, or rollback detail.
