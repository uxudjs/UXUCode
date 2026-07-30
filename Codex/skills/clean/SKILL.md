---
name: clean
description: Preview or safely organize UXUCode process artifacts and supported internal test files misplaced outside work-products/, including required project-local reference and repository .gitignore synchronization. Run without arguments for a zero-write preview and with the exact apply argument to execute.
---

# Clean

Accept either no argument or the exact argument `apply`. Reject every other argument without writing.

Resolve the plugin package from this loaded Skill, then run its own `scripts/clean-work-products.js` with Node.js. Do not call the other host package or reimplement candidate classification in the conversation.

- With no argument, run the engine without arguments and report its preview. Do not modify the workspace.
- With `apply`, run the engine with the exact `apply` argument. Execute only the complete prevalidated plan.
- Scan test candidates repository-wide across supported cross-language `test`/`spec` filename boundaries while excluding version-control, dependency, Python bytecode-cache, and derived patch-artifact paths. Require real static test evidence for Python `*_test.py` files outside test directories.
- Rewrite proven repository-root path expressions and unified-diff paths together with moved-file relative references. Block target collisions, linked or escaping target ancestors, and bare strings without path-structure evidence.
- For `BLOCKED`, report every blocker and leave all files unchanged.
- For `APPLIED`, summarize moved files, reference updates, `.gitignore` changes, and read-only external exclude findings.
- For `NO_CHANGES`, state that the workspace already satisfies the contract.

Never broaden this into general deletion. Leave project source, deliverables, ambiguous non-test files, Git index/history, user-level excludes, and `.git/info/exclude` unchanged.
