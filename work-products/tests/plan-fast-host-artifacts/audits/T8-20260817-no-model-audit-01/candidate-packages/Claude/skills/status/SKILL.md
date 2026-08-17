---
name: status
description: Show the current UXUCode mode, task progress, validation state, and release gate.
---

# Status

Use the canonical status payload supplied by the current host's `UserPromptSubmit` hook. Use its status line exactly as the compact first line; do not run a shell command or reconstruct project state from prose or inference. If the canonical payload is absent, report the status as unavailable.

Treat `.uxucode-state.json` as optional and read it only when present. Its absence alone is not a blocker: resolve the active mode only from the shared config or its validated default, treat any `state.mode` as ignored, keep unavailable project fields unknown, and do not report the state file as missing.

Trust project state only when schema version, canonical workspace, current branch or detached identity, current plan digest, and task range match. The last update must be no more than 24 hours old and no more than 5 minutes in the future. Do not delete or refresh invalid state.

Report the active mode, current task and total, last test state, release gate, and last update. Treat a missing, stale, or invalid task, tests, gate, or last update as unknown rather than successful; never infer `passed` or `GO`.

Use the compact form `[UXUCODE:MODE] task n/m · tests state · gate state`, followed by blockers only when present.

