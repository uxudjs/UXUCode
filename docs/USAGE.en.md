# UXUCode Usage Guide

[Back to README](../README.md)

## 1. Positioning and Use Cases

UXUCode gives Claude Code and Codex the same software-engineering workflow, connecting requirement clarification, planning, implementation, debugging, testing, review, simplification, and release gates into a verifiable process. The hosts use different command prefixes, but each task has the same meaning and outcome.

UXUCode is useful when:

- a new feature, cross-module change, or acceptance criteria still need definition;
- the request is clear and needs a dependency-ordered implementation plan;
- an observed failure must be reproduced before it is fixed;
- quality, security, compatibility, and rollback readiness need review before merge or release;
- verified behavior should be kept while complexity is safely reduced.

If you also use OpenClaw, you can apply UXUCode's execution and output policies to a selected workspace. Install it separately from the Claude Code and Codex plugins.

## 2. Quick Start

1. Choose and install a host in section 3.
2. Run the shortest verification command in section 4.
3. Choose a workflow from section 5 based on whether the scope needs definition first.

Claude Code uses `/uxu-code:<command>` and Codex uses `@<command>`. For example:

```text
/uxu-code:plan
@plan
```

`ship` only returns a merge or release-readiness decision. It does not commit, push, or deploy by itself.

## 3. Install by Host

In a system terminal, clone the repository and enter it:

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

### 3.1 Claude Code

In a system terminal, from the UXUCode repository root, run:

```bash
claude
```

After entering the Claude Code session, run:

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

The local Marketplace entry references the cloned directory, so keep that directory available.

### 3.2 Codex CLI

In a system terminal, from the UXUCode repository root, run:

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

Restart Codex after installation. The local Marketplace entry references the cloned directory, so keep that directory available.

### 3.3 OpenClaw

In a system terminal, from the UXUCode repository root, replace the quoted placeholder with the absolute path to the target workspace, then preview and install:

```text
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard
```

Start a new OpenClaw session after installation so it reloads the workspace files.

## 4. First Use

### 4.1 Claude Code

Inside the Claude Code session, run:

```text
/uxu-code:help
```

If the command catalog and English guide path appear, the plugin entry is available.

### 4.2 Codex CLI

In Codex, run:

```text
@help
```

If the command catalog and English guide path appear, the plugin entry is available.

### 4.3 OpenClaw

Start a new OpenClaw session and confirm that the target workspace loaded the installed `AGENTS.md`, `SOUL.md`, and `IDENTITY.md` files. If they were not loaded, first confirm the workspace path used during installation.

## 5. Recommended Workflow

Run `spec` first when the scope or acceptance criteria still need definition. When the request is already clear, go directly to `plan`:

```text
[run spec first when needed] → plan → build → review → simplify → ship
```

The brackets describe an optional stage; they are not part of a command. Common choices:

| Task | Recommended flow |
|---|---|
| New feature or high-impact change | `spec → plan → build → review → simplify → ship` |
| Clear request and acceptance criteria | `plan → build → review → simplify → ship` |
| Observed failure | `debug → review → ship` |
| Independent check of existing changes | `review` or `test` |

One `build` run completes only the next task by default, which keeps review and rollback manageable. Use `/uxu-code:build auto` or `@build auto` only when the plan is stable, acceptance criteria are clear, automated tests are reliable, the user explicitly allows continuous execution, and every task can be rolled back independently.

## 6. Command Reference

### 6.1 Core Workflow

| Purpose | Claude Code | Codex | What you get |
|---|---|---|---|
| Define a specification | `/uxu-code:spec <request>` | `@spec <request>` | Goals, scope, constraints, risks, and acceptance criteria |
| Create a plan | `/uxu-code:plan` | `@plan` | Dependency-ordered, independently verifiable tasks |
| Implement a task | `/uxu-code:build` | `@build` | The next complete slice and its test evidence |
| Fix a failure | `/uxu-code:debug <problem>` | `@debug <problem>` | Reproduction, root cause, minimal fix, and regression evidence |
| Design or run tests | `/uxu-code:test` | `@test` | Test scope, results, and evidence boundaries |
| Review changes | `/uxu-code:review` | `@review` | Severity-ordered findings and recommendations |
| Reduce complexity | `/uxu-code:simplify` | `@simplify` | Behavior-preserving simplification and validation |
| Check release readiness | `/uxu-code:ship` | `@ship` | Blocker, Recommended, Acknowledged, and GO/NO-GO |

### 6.2 Supporting Commands

| Purpose | Claude Code | Codex | What you get |
|---|---|---|---|
| Show help | `/uxu-code:help` | `@help` | Command catalog, workflow, and guide path |
| Select a mode | `/uxu-code:mode full` | `@mode full` | Current implementation and output policy |
| Audit complexity | `/uxu-code:audit` | `@audit` | Candidates to remove, reuse, or replace |
| Inventory debt | `/uxu-code:debt` | `@debt` | Debt boundaries and upgrade conditions |
| Draft a commit message | `/uxu-code:commit` | `@commit` | A suggestion based on the observed diff |
| Compress a context file | `/uxu-code:compress <file>` | `@compress <file>` | A recoverable reduction that preserves technical tokens |
| Show verifiable metrics | `/uxu-code:stats` | `@stats` | Sources, scope, and derivable metrics |
| Show current status | `/uxu-code:status` | `@status` | Mode, task progress, validation, and gate state |
| Organize misplaced process files | `/uxu-code:clean` | `@clean` | A zero-write preview plus move, reference, and ignore changes |

`clean` is not a delete command. Calling it without arguments produces only a zero-write preview; after reviewing the complete mapping, references, and repository `.gitignore` changes, only `/uxu-code:clean apply` or `@clean apply` executes them. Test naming is only for cross-language candidate discovery and does not prove ownership; project-native tests without a fixed legacy mapping or an exact entry in `work-products/clean-migration.json` remain in place. Every entry in this version 1 manifest must explicitly declare `source`, `target`, `tracking`, and `rewritePolicy`.
Scanning skips dependency, version-control, and `__pycache__` directories at any depth.

The `tracked` or `local` value of `tracking` controls whether the target remains trackable or locally ignored. The `references`, `preserve-content`, and `mutable-patch` values of `rewritePolicy` respectively permit safe reference rewriting, require byte-for-byte content preservation, or permit unified-diff path rewriting only for an explicitly authorized `.patch` or `.diff`. Recognized checksums such as `SHA256SUMS` protect bound content and stop incompatible policies or mismatches. Nested `<prefix>/work-products/tests/<rest>` paths are normalized to root-level `work-products/tests/<prefix>/<rest>`, and only non-root ignore-rule families exactly matching the root contract are removed; adjacent comments, partial matches, and other rules remain unchanged.

Root `tasks/` is fully reconciled first; any unmapped entry returns `BLOCKED` and preserves the directory. Duplicate targets, linked or escaping target ancestors, bare strings without path-structure evidence, or unsafe rewrites also return `BLOCKED` before any write. The `version: 2` report distinguishes preserved, unclassified, integrity-protected, and satisfied or inactive manifest entries through `preservedProductFiles`, `unclassifiedLegacyFiles`, `integrityProtectedFiles`, and `inactiveManifestEntries`; a compliant workspace returns `NO_CHANGES`.

## 7. Choose a Mode

| Mode | Behavior | Suggested use |
|---|---|---|
| `standard` | Smallest correct implementation with complete, concise output | Everyday default |
| `lite` | More teaching context and suggestions for simpler options | New repositories, teaching, discussion |
| `full` | Stronger reuse, scope, and maintainability discipline | Routine work in a familiar project |
| `ultra` | More aggressive removal of valueless complexity and shorter output | Clear, low-risk, small tasks |
| `off` | Disables global simplification and compression policies | Isolating policy effects or special tasks |

Correctness and safety always take priority. Deletion, migration, authentication, payment, permissions, deployment, architecture, and rollback restore full detail in every mode.

## 8. Generated File Locations

UXUCode keeps the process artifacts it creates in these locations:

| Content | Default location |
|---|---|
| Specification | `work-products/SPEC.md` |
| Implementation plan | `work-products/plan.md` |
| Task list | `work-products/todo.md` |
| Debug records | `work-products/debug/` |
| Review reports | `work-products/reviews/` |
| Release-gate reports | `work-products/ship/` |
| New tests, test data, and reports | `work-products/tests/` |

Under `work-products/`, formal specifications, implementation plans, task lists, and tests are formal project facts that can be tracked in version control; debug records, review reports, release-gate reports, and other undeclared process files remain local by default. Passing repository static validation does not mean the installed plugin cache has reloaded these changes.

Before development, testing, dependency installation, or tool configuration, read the project contract, lock files, and wrappers, then prefer the project environment. When Python has no other declared contract, use the repository-root `.venv/` and run dependency commands through its exact interpreter; never hide a missing environment with bare `pip` or a global fallback. A build, fix, test, or setup request may authorize a required repository-local environment change; a read-only request must not create an environment or install dependencies. Any environment change outside the repository requires the exact command, target, reason a project-local option is unavailable, impact, verification, and rollback before explicit authorization; stop when safe creation or repair is impossible, ownership conflicts, or the boundary is unclear. This policy is a behavioral contract, not an operating-system sandbox or mandatory command interceptor.

`clean apply` minimally synchronizes the repository's own `.gitignore`: formal facts remain trackable, other local process artifacts stay ignored by default, and no old root-path rule is retained. User-level `core.excludesFile` and repository `.git/info/exclude` effects are reported but never modified.

Product source and final deliverables remain in project-native locations. Every operation that creates a test or related test artifact must place it under `work-products/tests/`. Tests must reference repository files with relative paths from their final location, never machine-specific absolute paths. Explicit old paths in test-framework, CI, or packaging rules must be updated with the migration.

## 9. Update, Remove, and Troubleshoot

### 9.1 Updating

First update the local repository in a system terminal:

```bash
cd UXUCode
git pull --ff-only
```

#### Claude Code

After entering the Claude Code session, run:

```text
/plugin marketplace update uxu-code-claude
/plugin update uxu-code@uxu-code-claude
/reload-plugins
```

#### Codex CLI

After updating the local repository, restart Codex so it reloads the plugin.

#### OpenClaw

In a system terminal, rerun `OpenClaw/scripts/install-profile.js` for each target workspace: preview with `--dry-run`, install with that workspace's selected mode, then start a new session.

### 9.2 Removal and Rollback

For Claude Code and Codex, use the host's plugin-management entry to remove the plugin. Do not only delete a repository directory that the local Marketplace still references.

For OpenClaw removal, back up `AGENTS.md`, then delete only the paired boundaries marked by UXUCode and the content between them. To roll back an update, inspect and restore the matching workspace's `AGENTS.md.uxucode-backup-*`. Stop and use the dedicated guide if the boundaries are missing, duplicated, nested, or out of order.

### 9.3 Troubleshooting

- Claude Code: confirm that `/plugin ...` commands run inside a Claude Code session, then run `/reload-plugins` after installation or update.
- Codex: confirm that commands run from the repository root, the cloned directory still exists, and Codex was restarted after installation or update.
- OpenClaw: confirm that `--workspace` is an absolute path, inspect `--dry-run` first, then start a new session.
- Clean: retry only for a structured permission error when the host offers approval, using the same arguments at most once; a preview is never upgraded to `apply`. Other Git or ignore errors remain `BLOCKED`.
- If a command entry is unavailable, repeat the `help` check in section 4 before inspecting the host's plugin status.

## 10. Advanced Configuration

### 10.1 Claude Code and Codex Configuration

Default configuration:

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

Claude Code and Codex use `%APPDATA%\uxucode\config.json` on Windows and `~/.config/uxucode/config.json` on macOS/Linux. Project-level state is stored in `.uxucode-state.json`. OpenClaw does not read this shared configuration or state.

### 10.2 Session State and Output

At session start, Codex prints `UXUCODE:<MODE>` and Claude Code prints `UXUCode is active in <mode> mode.` These messages only confirm the current policy mode; they do not mean a task is complete or its tests passed. Use `status` for task and gate state.

## 11. OpenClaw

### 11.1 User Value

The OpenClaw installation applies UXUCode's scope control, execution discipline, output style, and high-risk information safeguards to a selected workspace. `standard` is the default; `ultra` suits clear, simple, low-risk tasks. Each workspace can use a different mode.

### 11.2 File Protection and Native Controls

The installer only updates one UXUCode-marked section of `AGENTS.md` and creates a backup first. If `SOUL.md` or `IDENTITY.md` is missing, it creates the file from a template; an existing file with the same name is never read, edited, or overwritten.

Continue using OpenClaw's native `/usage`, `/compact`, `/verbose`, `/reasoning`, `/think`, and `/model` controls. UXUCode does not duplicate them.

### 11.3 Detailed Documentation

- Installation, file protection, updates, removal, and rollback: [OpenClaw/README.md](../OpenClaw/README.md)
- Independent evaluation process and evidence requirements: [OpenClaw/evaluation/README.md](../OpenClaw/evaluation/README.md)

## 12. Validation Appendix for Project Maintainers

### 12.1 Unified Validation Entry

From the repository root, run:

```text
node scripts/validate-all.js
```

The entry stops on the first failure and identifies the failing step. Run the reported individual validator or test only when further diagnosis is needed. Before committing, also run the diff, formatting, and platform checks required by the project.

### 12.2 Evidence Boundary

The unified entry provides repository static-validation and local-test evidence; it does not prove a live Marketplace installation, actual Hook loading, or OpenClaw Gateway runtime behavior. A merge or release decision must state which checks ran and which live-host validations remain incomplete.
