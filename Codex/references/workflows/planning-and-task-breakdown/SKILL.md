---
name: planning-and-task-breakdown
description: 将工作分解为有序任务。适用于有规格说明或明确需求、需要将工作拆分为可实施任务的场景。适用于任务感觉太大无法开始、需要估算范围、或可并行工作的情况。
---

# Planning and Task Breakdown

## Overview

Decompose work into small, verifiable tasks with explicit acceptance criteria. Good task breakdown is the difference between an agent that completes work reliably and one that produces a tangled mess. Every task should be small enough to implement, test, and verify in a single focused session.

Size tasks by dependencies, risk, and verifiability. File count is planning context, not a pass/fail limit: do not reject, split, or approve a task solely because it touches a fixed number of files. Split only when the dependency graph contains independently verifiable work or the task cannot be reviewed and validated as one coherent unit.

## When to Use

- You have a spec and need to break it into implementable units
- A task feels too large or vague to start
- Work needs to be parallelized across multiple agents or sessions
- You need to communicate scope to a human
- The implementation order isn't obvious

**When NOT to use:** Single-file changes with obvious scope, or when the spec already contains well-defined tasks.

## The Planning Process

### Step 1: Enter Plan Mode

Before writing any code, operate in read-only mode:

- Read the spec and relevant codebase sections
- Identify existing patterns and conventions
- Map dependencies between components
- Note risks and unknowns

**Do NOT write code during planning.** The output is a plan document saved to `work-products/plan.md` and a task list saved to `work-products/todo.md`, not implementation.

### Step 2: Identify the Dependency Graph

Map what depends on what:

```
Database schema
    │
    ├── API models/types
    │       │
    │       ├── API endpoints
    │       │       │
    │       │       └── Frontend API client
    │       │               │
    │       │               └── UI components
    │       │
    │       └── Validation logic
    │
    └── Seed data / migrations
```

Implementation order follows the dependency graph bottom-up: build foundations first.

Before proposing parallel work, also map each task's read scope, write scope, generated outputs, and shared mutable resources. Treat same file, ancestor/descendant paths, generated outputs, shared mutable resources, or logical dependencies as conflicts. Normalize repository-relative paths, resolve links when possible, and treat an unprovable boundary as serial.

### Step 3: Slice Vertically

Instead of building all the database, then all the API, then all the UI — build one complete feature path at a time:

**Bad (horizontal slicing):**
```
Task 1: Build entire database schema
Task 2: Build all API endpoints
Task 3: Build all UI components
Task 4: Connect everything
```

**Good (vertical slicing):**
```
Task 1: User can create an account (schema + API + UI for registration)
Task 2: User can log in (auth schema + API + UI for login)
Task 3: User can create a task (task schema + API + UI for creation)
Task 4: User can view task list (query + API + UI for list view)
```

Each vertical slice delivers working, testable functionality.

### Step 4: Write Tasks

Each task follows this structure:

```markdown
## Task [N]: [Short descriptive title]

**Description:** One paragraph explaining what this task accomplishes.

**Acceptance criteria:**
- [ ] [Specific, testable condition]
- [ ] [Specific, testable condition]

**Verification:**
- [ ] Tests pass: [the repository's focused-test command]
- [ ] Build succeeds: [the repository's build command]
- [ ] Manual check: [description of what to verify]

**Dependencies:** [Task numbers this depends on, or "None"]

**Files likely touched:**
- `src/path/to/file.ts`
- `tests/path/to/test.ts`

**Estimated scope:** [Small: 1-2 files | Medium: 3-5 files | Large: 5+ files]
```

For an executable UXUCode plan, replace that compact example with the complete task contract: stable unique task ID; objective and acceptance criteria; dependencies; read scope; write scope; shared mutable resources; focused validation command and whether it may run in parallel; failure retention and rollback; wave and start conditions; and main-agent integration responsibility.

### Step 5: Order and Checkpoint

Arrange tasks so that:

1. Dependencies are satisfied (build foundation first)
2. Each task leaves the system in a working state
3. Verification checkpoints occur after every 2-3 tasks
4. High-risk tasks are early (fail fast)

Add explicit checkpoints:

```markdown
## Checkpoint: After Tasks 1-3
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] Review with human before proceeding
```

## Task Sizing Guidelines

| Size | Scope | Example |
|------|-------|---------|
| **XS** | One local behavior with direct verification | Add a validation rule |
| **S** | One coherent component or endpoint | Add a new API endpoint |
| **M** | One feature slice with dependent parts | User registration flow |
| **L** | Cross-component work that remains one verifiable unit | Search with filtering and pagination |
| **XL** | Multiple independently verifiable dependency subgraphs | Split along those dependency boundaries |

Prefer reviewable tasks, but do not split a coherent change solely because of its size label or file count.

**When to break a task down further:**
- It would take more than one focused session (roughly 2+ hours of agent work)
- You cannot describe the acceptance criteria in 3 or fewer bullet points
- It touches two or more independent subsystems (e.g., auth and billing)
- You find yourself writing "and" in the task title (a sign it is two tasks)

## Output Files

- **Plan document:** Save the implementation plan to `work-products/plan.md`.
- **Task list:** Save the checklist-style task list to `work-products/todo.md`.

Create the `work-products/` directory if it does not exist. These paths are the convention expected by the `@build` command and other downstream tooling.

## Plan Document Template

```markdown
# Implementation Plan: [Feature/Project Name]

## Overview
[One paragraph summary of what we're building]

## Architecture Decisions
- [Key decision 1 and rationale]
- [Key decision 2 and rationale]

## Task List

### Phase 1: Foundation
- [ ] Task 1: ...
- [ ] Task 2: ...

### Checkpoint: Foundation
- [ ] Tests pass, builds clean

### Phase 2: Core Features
- [ ] Task 3: ...
- [ ] Task 4: ...

### Checkpoint: Core Features
- [ ] End-to-end flow works

### Phase 3: Polish
- [ ] Task 5: ...
- [ ] Task 6: ...

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Strategy] |

## Open Questions
- [Question needing human input]
```

## Parallelization Opportunities

### Exact fast input

Only the exact lowercase first argument `fast` enables fast planning. Remove that first `fast` token before treating the remaining inline text and lines as the planning request. Do not infer fast mode from `FAST`, `parallel`, `quick`, punctuation variants, a non-first `fast`, or natural-language requests for speed.

The planning basis, read-only analysis, approval, test placement, and authorization gates remain unchanged. A fast request does not require parallel output. If dependencies are linear, paths or resources overlap, link identity is unclear, host parallelism is unavailable, risk is too high, or orchestration cost is not worthwhile, produce a serial plan and explain the serial reason.

### Plan, task, and wave schema

At plan level record the execution strategy, fast requested value, safe concurrency limit, and serial reason. For every task use the complete task contract above. Assign each ready task to exactly one wave. Every wave records ready tasks, frozen tasks, the concurrency limit, whether editing and focused validation may run in parallel, its serial integration barrier, and the receipt conditions that unlock downstream work.

Execution strategy is exactly `fast` or `serial`; every other value is invalid. For tasks A and B, any normalized overlap between A's write or generated-output scope and B's read, write, or generated-output scope is a conflict, and the same check applies from B to A. A write/read overlap is exempt only when the read bytes are preserved in an attempt-owned no-replace snapshot before the wave and no wave task can write any alias of that frozen input.

An approved `work-products/plan.md` is immutable. `work-products/todo.md` is the only mutable execution-state ledger. Todo mirrors task IDs, waves, and dependencies, initializes one explicit `pending` state per task, and declares the main agent as its only writer. Its task checkboxes are an atomic derived mirror of explicit state: only `completed` is checked.

### Approval snapshot and receipt

Create the candidate-owned raw-byte approval snapshot under `work-products/debug/approval-baselines/<candidate-id>/` with create-new/no-replace semantics, preserve the exact `work-products/plan.md` bytes, and record the candidate ID, snapshot reference, and pending state only in `work-products/todo.md` before presentation. After clear whole-sentence approval, stream-compare the current plan bytes with that snapshot, then atomically record approval state and receipt only in todo. The user never has to provide, copy, or repeat an internal identifier; a conflicting user-supplied identifier is a candidate-target conflict, not proof.

Run legacy approval preflight before any general approval-snapshot check. For an existing approved plan, todo approval state and receipt remain authoritative despite a stale pre-approval status label in the immutable plan. Preserve legacy top-level candidate metadata only as read-only history; never propagate it into task, attempt, worker, or terminal-receipt gates. A plan that already defines complete raw-byte and canonical-path capture and verification for all-pending tasks needs no mode field, plan edit, or renewed approval. When its legacy receipt lacks a raw-byte approval snapshot, approval preflight performs exactly one atomic todo-and-snapshot migration inside a plan-declared permitted root; a missing or conflicting identity, incomplete receipt, unavailable root, failed snapshot creation, or later byte drift blocks execution with zero workers.

Only after an approval has a verified raw-byte snapshot, whether original or created by legacy preflight, may a fresh session reuse its persisted receipt by stream-comparing the current plan with that snapshot. Drift recovery shows a human-readable difference and asks for ordinary approval again. Do not store approval in the immutable plan or treat hook freshness state as an approval ledger. Planning may reference but never create or widen a high-risk action_id enumerated by an approved project specification.

Use the exact attempt, snapshot, or baseline root declared by the approved plan and keep it inside that task's write scope; use the standard default only when the plan omits a root and its approved write scope already permits that location. An existing complete raw-byte plan must not create a new baseline directory outside its approved write scope.

Fast planning must not create a second state file, copy conflict logic into todo, invent a `build fast` interface, or treat more workers as evidence of success.

When multiple agents or sessions are available:

- **Safe to parallelize:** Independent feature slices, tests for already-implemented features, documentation
- **Must be sequential:** Database migrations, shared state changes, dependency chains
- **Needs coordination:** Features that share an API contract (define the contract first, then parallelize)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go" | That's how you end up with a tangled mess and rework. 10 minutes of planning saves hours. |
| "The tasks are obvious" | Write them down anyway. Explicit tasks surface hidden dependencies and forgotten edge cases. |
| "Planning is overhead" | Planning is the task. Implementation without a plan is just typing. |
| "I can hold it all in my head" | Context windows are finite. Written plans survive session boundaries and compaction. |

## Red Flags

- Starting implementation without a written task list
- Tasks that say "implement the feature" without acceptance criteria
- No verification steps in the plan
- All tasks are XL-sized
- No checkpoints between tasks
- Dependency order isn't considered

## Verification

Before starting implementation, confirm:

- [ ] Every task has acceptance criteria
- [ ] Every task has a verification step
- [ ] Task dependencies are identified and ordered correctly
- [ ] No task is split, rejected, or approved solely because of a fixed file count
- [ ] Checkpoints exist between major phases
- [ ] The human has reviewed and approved the plan

## See Also

Acceptance criteria are per-task and answer "did we build the right thing?". They sit on top of the project-wide Definition of Done, the standing bar every task clears before it counts as done. See [Definition of Done](../../references/definition-of-done.md).
