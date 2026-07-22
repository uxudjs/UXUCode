# UXUCode Orchestration Patterns for Codex

## Choose the Smallest Pattern

Use one agent for a bounded task. Use independent subagents only when evidence can be collected in parallel. Use collaborative agent teams only when investigators must challenge each other directly.

## Sequential Workflow

For a non-trivial feature, route through:

    @spec → @plan → @build → @test → @review → @ship

Each phase must consume verified output from the previous phase. Do not invoke later phases merely to appear complete.

## Parallel Review

The `@ship` gate may run `reviewer`, `security-reviewer`, and `test-reviewer` independently. Launch parallel agent calls together when the host supports it. Merge results in the parent, deduplicate them, and classify them as Blocker, Recommended, or Acknowledged.

Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility always receive full review. Parallelism never authorizes writes or deployment.

## Adversarial Investigation

Use an agent team only when competing hypotheses must be debated, such as a complex production incident. A normal `@debug` investigation should remain single-owner unless independent evidence gathering will materially reduce time.

## Internal Agents

Plugin agents live in `agents/`: `investigator`, `builder`, `reviewer`, `security-reviewer`, and `test-reviewer`. Users do not invoke them directly; public skills coordinate them.

## Anti-Patterns

- An orchestrator that calls every workflow regardless of task size.
- Nested coordinators that add no evidence or decision.
- Parallel agents editing the same files.
- A release gate that silently commits, pushes, or deploys.
- A compact mode that removes safety, validation, migration, or rollback detail.
