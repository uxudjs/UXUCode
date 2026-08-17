# Serial fast-plan fixture

Expected strategy: serial
Fast requested: yes
Safe concurrency limit: 1
Serial reason: S1 and S2 have ancestor/descendant write overlap and share a shared lock.

## S1

- State: pending
- Write: `../../../../docs/`
- Shared mutable resources: `guide-parity-lock`

## S2

- State: pending
- Write: `../../../../docs/USAGE.en.md`
- Shared mutable resources: `guide-parity-lock`

The planner must keep S1 then S2 serial even though fast was requested.
