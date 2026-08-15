---
name: status
description: Show the current UXUCode mode, task progress, validation state, and release gate.
---

# Status

Treat `.uxucode-state.json` as optional and read it only when present. Its absence alone is not a blocker: resolve the active mode from the shared configuration or default, keep unavailable project fields unknown, and do not report the state file as missing.

Report the active mode, current task and total, last test state, release gate, and last update. Treat missing or stale fields as unknown rather than successful.

Use the compact form `[UXUCODE:MODE] task n/m · tests state · gate state`, followed by blockers only when present.

