---
name: commit
description: "Explicit UXUCode commit command: generate a repository-conformant commit message from verified changes."
---

# Commit

Inspect the intended change scope and repository conventions. Generate a concise commit subject and, only when useful, a body explaining why, behavioral impact, migration, and verification.

Do not stage, commit, push, or rewrite history unless the user explicitly requests those actions. Do not include claims unsupported by the diff or test evidence. Keep unrelated changes out of the message.
