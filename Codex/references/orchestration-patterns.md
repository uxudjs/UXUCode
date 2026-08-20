# UXUCode Orchestration Patterns for Codex

## Choose the Smallest Pattern

Use one agent for a bounded task. Use independent subagents only when evidence can be collected in parallel. Use collaborative agent teams only when investigators must challenge each other directly.

## Sequential Workflow

For a non-trivial feature, use `spec` only when requirements or material risks remain unresolved; otherwise start at `plan`:

    [run @spec when needed] → @plan → @build → @test → @review → @ship

Planning may use an approved specification, thorough debug evidence, or clear user requirements. Each phase must consume a verified planning basis or verified output from the previous phase. Do not invoke later phases merely to appear complete.

## Fast Plan Consumption

Run legacy approval preflight before any general approval-snapshot check. For an existing approved plan, todo approval state and receipt remain authoritative despite a stale pre-approval status label in the immutable plan. Preserve legacy top-level candidate metadata only as read-only history; never propagate it into task, attempt, worker, or terminal-receipt gates. A plan that already defines complete raw-byte and canonical-path capture and verification for all-pending tasks needs no mode field, plan edit, or renewed approval. If an approved legacy receipt has no raw-byte approval snapshot, verify the current plan once with its read-only top-level candidate identity, create the snapshot atomically inside a plan-declared permitted root, and record the snapshot reference in todo before any task starts. That one-time migration may read the legacy identity only at approval preflight; it must never copy it into a task, attempt, worker prompt, execution baseline, or terminal receipt. A missing or conflicting legacy identity, incomplete receipt, unavailable permitted root, snapshot creation failure, or post-verification byte drift is `BLOCKED` with zero workers. When the approved plan already declares a permitted root, this migration requires no plan edit, mode field, or renewed approval; it performs exactly one todo-and-snapshot write before execution.

Only after an approval has a verified raw-byte snapshot, whether original or created by legacy preflight, may a fresh session reuse its persisted receipt by stream-comparing the current plan with that snapshot. .uxucode-state.json planId is session-freshness evidence only and never an approval ledger. Byte drift, target conflict, or an incomplete receipt is BLOCKED and recovered with a human-readable difference plus ordinary approval, never a required identifier reply.

Use the exact attempt, snapshot, or baseline root declared by the approved plan and keep it inside that task's write scope; use the standard default only when the plan omits a root and its approved write scope already permits that location. An existing complete raw-byte plan must not create a new baseline directory outside its approved write scope.

An action-scoped exact-set gate is valid only when the approved project specification directly enumerates its stable action_id, concrete side effect, target environment or account, exact input set, cost or time limit, retry and invalidation semantics, and non-authorized scope. Ordinary approval cannot create, replace, or widen action authorization, and action authorization cannot approve another workflow stage. Routine stage transitions, local code or tests, and todo repair never qualify for this exception.

Validate the complete plan and todo before starting any worker. First hard-block a missing required field in the task schema or scope, duplicate task ID, unknown dependency, dependency cycle, plan/todo mismatch, checkbox/state mismatch, invalid attempt or receipt, baseline or ownership drift, or unresolved path identity; return `BLOCKED` with zero workers. Only after those checks pass, validate plan-level strategy, fast-request flag, positive concurrency limit, wave grouping and assignment, parallel-validation flags, barriers, and unlock conditions against the immutable plan and todo mirror. Execution strategy is exactly `fast` or `serial`; every other value is invalid. A task assigned to multiple waves or wave width above the declared limit is a fast-only scheduling defect, never an invitation to guess a parallel schedule.

Normalize and compare canonical paths. On Windows also compare Windows case-insensitive aliases. Resolve ancestor/descendant overlap, symbolic-link and realpath aliases, generated-output aliases, and any shared lock, cache, or temporary directory before declaring independence. For tasks A and B, any normalized overlap between A's write or generated-output scope and B's read, write, or generated-output scope is a conflict, and the same check applies from B to A. A write/read overlap is exempt only when the read bytes are preserved in an attempt-owned no-replace snapshot before the wave and no wave task can write any alias of that frozen input. Never launch a producer and its consumer together or start every ready task unconditionally. Runtime evidence may only lower concurrency.

The main agent is the only writer of `work-products/todo.md`. Legal state changes are `pending → in_progress → completed | blocked`. Before any execution it must atomically record the attempt ID, owner, sorted canonical path set, per-path state, snapshot root, and `no_replace: true`, then atomically record a verified receipt with terminal state afterward. Each path state is `present-file | present-directory | missing`; create the selected attempt-owned snapshot root with create-new/no-replace semantics, using `work-products/debug/execution-baselines/<attempt-id>/` only as the permitted standard default. Preserve every present regular file as exact raw bytes, record every directory's complete sorted canonical descendant set plus each regular file's exact bytes, and require a missing path to remain missing until exclusive no-replace creation. Immediately before the first write, stream-compare live bytes and re-enumerate directory descendants. A leftover `in_progress` state, interrupted todo replacement, plan/snapshot mismatch, raw-byte drift, missing snapshot or receipt, snapshot replacement, or unclear change ownership is `BLOCKED` with zero workers.

During partial-wave reentry, never rerun a completed task. Revalidate unfinished tasks before scheduling them against current dependencies and write-set baselines; schedule only still-ready work, and do not unlock downstream work until the whole wave and its serial barrier pass.

Workers receive only their task, acceptance criteria, allowed read/write scope, and focused validation. Workers must not write the plan or todo, start nested workers, integrate shared files, or perform external mutations.

Use the host-advertised agent limit and `list_agents` to determine available native slots; effective width is the minimum of that availability, the plan limit, and ready non-conflicting tasks. After selecting that bounded batch and before the first launch, the main agent atomically records its attempts and write-set baselines. Read the plugin-root `agents/builder.md` duties and pass them explicitly when launching each selected task with `spawn_agent`, `fork_turns: "none"`, and a prompt containing its task ID, attempt ID, parent-recorded raw-byte baseline, authority boundaries, acceptance criteria, and receipt schema. Issue every selected `spawn_agent` call before the first `wait_agent` call; never interleave spawn and wait. After every launch call has returned, use `wait_agent` and `list_agents` until every started worker is terminal. On failure, start no new or downstream worker; use `interrupt_agent` only when continued work would be unsafe, then still collect and reconcile that terminal result. Reconcile every pre-recorded attempt before returning, using a main-agent `blocked/not-launched` record only when the host proves it was never dispatched and preserving `in_progress` whenever launch is uncertain. Do not unlock the barrier until every started worker has reached a terminal state and its receipt and actual diff have been reconciled.

Only defects in fast-only scheduling metadata may use serial fallback: a missing or invalid strategy, fast-request flag, positive concurrency limit, wave grouping or assignment, parallel-validation flag, barrier, or unlock condition. Plan/todo identity, task schema, dependency graph, state, attempt, baseline, ownership, and path-identity defects are never fallback-safe. If todo is otherwise valid, the write set equals its baseline, and exactly one safe next task exists, the main agent executes it serially with zero child workers and reports the reason; otherwise return `BLOCKED` with zero workers. With a safe serial fallback or zero available native worker slots, the main agent executes exactly one uniquely safe task itself. A valid fast plan makes default `build` execute the next safe wave; only `build auto` may continue across waves.

## Parallel Review

The `@ship` gate may start generic native subagents with the `reviewer`, `security-reviewer`, or `test-reviewer` prompt duties. Select roles from actual risk instead of launching every role mechanically. Launch independent reviews together when the host supports it. Merge results in the parent, deduplicate them, and classify them as Blocker, Recommended, or Acknowledged.

Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility always receive full review. Parallelism never authorizes writes or deployment.

## Adversarial Investigation

Use an agent team only when competing hypotheses must be debated, such as a complex production incident. A normal `@debug` investigation should remain single-owner unless independent evidence gathering will materially reduce time.

## Internal Role Prompts

The plugin-root files `agents/builder.md`, `agents/reviewer.md`, `agents/security-reviewer.md`, and `agents/test-reviewer.md` are read-only role prompt assets, not registered custom agents. Public skills may read the matching asset and pass its duties explicitly to a generic native subagent launched with `spawn_agent` and `fork_turns: "none"`.

Do not create or write user or project `.codex/agents/*.toml` registrations. Host registration is outside plugin orchestration and is not required for these prompt assets.

## Anti-Patterns

- An orchestrator that calls every workflow regardless of task size.
- Nested coordinators that add no evidence or decision.
- Parallel agents editing the same files.
- A release gate that silently commits, pushes, or deploys.
- A compact mode that removes safety, validation, migration, or rollback detail.
