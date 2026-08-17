# UXUCode Orchestration Patterns for Codex

## Choose the Smallest Pattern

Use one agent for a bounded task. Use independent subagents only when evidence can be collected in parallel. Use collaborative agent teams only when investigators must challenge each other directly.

## Sequential Workflow

For a non-trivial feature, use `spec` only when requirements or material risks remain unresolved; otherwise start at `plan`:

    [run @spec when needed] → @plan → @build → @test → @review → @ship

Planning may use an approved specification, thorough debug evidence, or clear user requirements. Each phase must consume a verified planning basis or verified output from the previous phase. Do not invoke later phases merely to appear complete.

## Parallel Review

The `@ship` gate may start generic native subagents with the `reviewer`, `security-reviewer`, or `test-reviewer` prompt duties. Select roles from actual risk instead of launching every role mechanically. Launch independent reviews together when the host supports it. Merge results in the parent, deduplicate them, and classify them as Blocker, Recommended, or Acknowledged.

Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility always receive full review. Parallelism never authorizes writes or deployment.

## Adversarial Investigation

Use an agent team only when competing hypotheses must be debated, such as a complex production incident. A normal `@debug` investigation should remain single-owner unless independent evidence gathering will materially reduce time.

## Internal Role Prompts

The plugin-root files `agents/reviewer.md`, `agents/security-reviewer.md`, and `agents/test-reviewer.md` are read-only role prompt assets, not registered custom agents. Public skills may read the matching asset and pass its duties explicitly to a generic native subagent launched with `spawn_agent` and `fork_turns: "none"`.

Do not create or write user or project `.codex/agents/*.toml` registrations. Host registration is outside plugin orchestration and is not required for these prompt assets.

## Anti-Patterns

- An orchestrator that calls every workflow regardless of task size.
- Nested coordinators that add no evidence or decision.
- Parallel agents editing the same files.
- A release gate that silently commits, pushes, or deploys.
- A compact mode that removes safety, validation, migration, or rollback detail.
