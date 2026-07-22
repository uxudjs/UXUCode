---
name: compress
description: "Explicit UXUCode compress command: safely reduce an explanatory context file while preserving exact technical tokens and structure."
---

# Compress

Require one explanatory Markdown or text file path.

1. Create a recoverable backup before modification.
2. Remove repetition, filler, and redundant explanation.
3. Preserve code blocks, inline code, URLs, commands, paths, environment variables, versions, numbers, ordering constraints, and safety or rollback information exactly.
4. Validate Markdown structure and compare protected tokens.
5. Replace the source only after validation succeeds.
6. On any validation failure, retain the original and report the failure.

Do not use this workflow to minify source code or generated binary formats.
