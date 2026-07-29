---
name: clean
description: Preview or safely organize confirmed UXUCode process artifacts misplaced outside work-products/, including required relative-reference and repository .gitignore synchronization. Use when the workspace may contain misplaced SPEC, task, or UXUCode auxiliary test files; run without arguments for a zero-write preview and with the exact apply argument to execute.
---

# Clean

Accept either no argument or the exact argument `apply`. Reject every other argument without writing.

Resolve the plugin package from this loaded Skill, then run its own `scripts/clean-work-products.js` with Node.js. Do not call the other host package or reimplement candidate classification in the conversation.

- With no argument, run the engine without arguments and report its preview. Do not modify the workspace.
- With `apply`, run the engine with the exact `apply` argument. Execute only the complete prevalidated plan.
- For `BLOCKED`, report every blocker and leave all files unchanged.
- For `APPLIED`, summarize moved files, reference updates, `.gitignore` changes, and read-only external exclude findings.
- For `NO_CHANGES`, state that the workspace already satisfies the contract.

Never broaden this into general cleanup. Leave project source, project-native tests, deliverables, ambiguous files, Git index/history, user-level excludes, and `.git/info/exclude` unchanged.
