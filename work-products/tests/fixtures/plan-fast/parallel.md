# Parallel fast-plan fixture

Expected strategy: fast
Fast requested: yes
Safe concurrency limit: 2
Expected ready wave: P1 + P2
Write-set intersection: empty
Focused-read intersection: empty

## P1

- State: pending
- Dependencies: none
- Read: `../../../../Claude/skills/plan/SKILL.md`
- Write: `../../../../Claude/references/workflows/planning-and-task-breakdown/SKILL.md`
- Shared mutable resources: none
- Focused validation: plan-only; parallel-safe

## P2

- State: pending
- Dependencies: none
- Read: `../../../../Codex/skills/build/SKILL.md`
- Write: `../../../../Codex/references/orchestration-patterns.md`
- Shared mutable resources: none
- Focused validation: build-only; parallel-safe

## Barrier

The main agent validates both receipts and integrates shared checks only after P1 and P2 finish.
