---
name: clean
description: Preview or safely organize explicitly authorized UXUCode process artifacts outside work-products/, with report v2, reference, integrity, and repository .gitignore synchronization. Run without arguments for a zero-write preview and with the exact apply argument to execute.
---

# Clean

Accept either no argument or the exact argument `apply`. Reject every other argument without writing.

Resolve the plugin package from this loaded Skill, then run its own `scripts/clean-work-products.js` with Node.js. Do not call the other host package or reimplement classification in the conversation.

If the report contains a structured subprocess permission error such as `errorCode: "EPERM"`, and the host offers sandbox approval, rerun the same engine command with the same arguments through that approval at most once. Preview must never be upgraded to `apply`. Do not retry ordinary Git failures or ignore semantic conflicts. If approval is unavailable or denied, keep the result `BLOCKED` and report the exact error.

- With no argument, run the engine without arguments and report its zero-write preview.
- With `apply`, run the engine with the exact `apply` argument. Execute only the complete prevalidated plan.
- `work-products/clean-migration.json` is optional. When it is absent, there are no manifest-authorized entries; continue with fixed mappings and the ordinary preview. Its absence alone is not a blocker: do not create it and do not report it as missing.
- Treat supported cross-language `test`/`spec` filenames only as discovery candidates. Move a file only through a fixed legacy mapping or an exact valid entry in `work-products/clean-migration.json`; otherwise preserve it as `preservedProductFiles`.
- Require the version 1 manifest schema to provide exact `source`, `target`, `tracking`, and `rewritePolicy` values. Reject unknown fields, unsafe paths, duplicates, fixed-fact overrides, conflicts, links, and repository escape.
- Reconcile every root `tasks/` entry before removing `/tasks/`; any unmapped or unsupported entry is `unclassifiedLegacyFiles`, makes the whole operation `BLOCKED`, and leaves `.gitignore` unchanged.
- Use `tracking: tracked` only with the narrow target exceptions verified by Git; keep `tracking: local` targets ignored.
- Apply `references`, `preserve-content`, and `mutable-patch` exactly as declared. Use `mutable-patch` only when the source or target is `.patch` or `.diff`; those files cannot use `references`. Preserve protected bytes and hashes, and block checksum-coupled mutable artifacts.
- Interpret report `version: 2` fields including `moves`, `preservedProductFiles`, `unclassifiedLegacyFiles`, `integrityProtectedFiles`, `inactiveManifestEntries`, `referenceUpdates`, `gitignoreChanges`, `externalIgnoreSources`, `skipped`, and `blockers`.
- For `BLOCKED`, report every blocker and leave all files unchanged. For `APPLIED`, summarize the validated changes. For `NO_CHANGES`, state that no writes are needed even when preserved or inactive entries are reported.

Never broaden this into general deletion. Leave project source, deliverables, ambiguous files, checksums, Git index/history, user-level excludes, and `.git/info/exclude` unchanged.
