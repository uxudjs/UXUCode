---
name: status
description: "Explicit UXUCode status command: show current mode, task progress, tests, and release-gate state."
---

# Status

Read `.uxucode-state.json` when present and inspect current task files. Display:

- active mode, defaulting to `standard`;
- current task and completed/total count;
- latest known test state, clearly marked stale when not from this run;
- release gate and blockers;
- next recommended command.

Do not alter state. Distinguish recorded status from checks executed in the current session.
