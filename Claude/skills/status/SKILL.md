---
name: status
description: Show the current UXUCode mode, task progress, validation state, and release gate.
---

# Status

Read `.uxucode-state.json` when present. Report the active mode, current task and total, last test state, release gate, and last update. Treat missing or stale fields as unknown rather than successful.

Use the compact form `[UXUCODE:MODE] task n/m · tests state · gate state`, followed by blockers only when present.

