# Partial-wave reentry fixture

- Plan raw-byte snapshot: stream-compares equal
- P1: completed
- P2: pending
- P3: pending and downstream-locked
- Expected schedule: P2 only
- P1 must not rerun
- P2 requires a fresh attempt-owned no-replace raw-byte snapshot and focused revalidation
- P3 remains locked until the wave barrier passes

P1 writes `../../../../Claude/skills/plan/SKILL.md`; P2 writes `../../../../Codex/skills/plan/SKILL.md`; P3 depends on the completed P1+P2 wave.
