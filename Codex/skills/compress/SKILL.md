---
name: compress
description: Safely reduce a prose context file while preserving exact technical tokens and recoverability.
argument-hint: "<file>"
---

# Context Compression

Accept one explicit explanatory or instruction file. Before modifying it, create a recoverable backup. Preserve code blocks, inline code, URLs, commands, paths, environment variables, API names, error text, versions, numbers, hierarchy, safety warnings, validation evidence, migration steps, and rollback steps exactly.

Remove greetings, filler, repeated conclusions, and explanations already expressed by preserved technical content. Validate Markdown structure and compare protected tokens. If any validation fails, keep the original file and report the failure.

