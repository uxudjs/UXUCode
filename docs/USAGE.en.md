# UXUCode Usage Guide

## 1. What UXUCode Is

UXUCode is a unified software-engineering workflow for Claude Code and Codex. It combines requirement clarification, specifications, planning, incremental implementation, testing, review, security, performance, minimal correct implementation, concise communication, context compression, and release gates. The two runtime packages remain independent while command names, arguments, and result semantics stay aligned.

## 2. Project Features

| Feature | Description |
|---|---|
| Complete engineering workflow | Covers requirements, specifications, planning, implementation, testing, review, simplification, migration, and release |
| Specification-driven | Creates a verifiable specification before non-trivial work |
| Incremental implementation | Completes independently verifiable vertical slices |
| Minimal correct implementation | Prefers reuse, standard libraries, and platform-native capabilities |
| Validation first | Requires test, build, or runtime evidence for completion |
| Multi-dimensional review | Checks correctness, readability, architecture, security, performance, and complexity |
| Concise technical communication | Removes redundancy while preserving precision and risk information |
| Release gate | Returns Blocker, Recommended, Acknowledged, and GO/NO-GO |
| Context compression | Preserves code, commands, paths, links, and structure exactly |
| Consistent dual-CLI experience | Keeps adapters independent while workflow semantics remain aligned |

## 3. Installation and Updates

Clone the repository and enter it:

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Claude Code:

```text
claude --plugin-dir ./Claude
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

Codex:

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

OpenClaw:

```text
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<replace-with-absolute-openclaw-workspace-path>" --mode standard
```

Before running either command, replace the quoted placeholder with the absolute path to the actual OpenClaw workspace.

To update, first run `git pull` in the repository. Refresh Claude Code and Codex through their host plugin flows. For each OpenClaw workspace, run `--dry-run`, then rerun the installer with its selected mode. Do not delete the cloned directory referenced by a local Marketplace or OpenClaw Gateway.

## 4. Claude Code and Codex Command Formats

Claude Code uses:

```text
/uxu-code:<command> [arguments]
```

Codex uses:

```text
@<command> [arguments]
```

Only the prefix differs. For example:

```text
/uxu-code:spec Add rate limiting to the login API
/uxu-code:mode full
@spec Add rate limiting to the login API
@mode full
```

## 5. Recommended Development Workflow

For a non-trivial feature, use:

```text
spec → plan → build → review → simplify → ship
```

For a small, well-defined fix, use `debug → review → ship`. Use `build auto` only when the specification and plan are stable, tests are reliable, and the user explicitly authorizes continuous execution.

## 6. Core Command Details

### 6.1 spec

```text
/uxu-code:spec <requirement>
@spec <requirement>
```

Use for new features, cross-module changes, unclear acceptance criteria, or decisions about interfaces and risk. It is usually unnecessary for an obvious one-line fix or an already approved `SPEC.md`. It produces the objective, scope, non-goals, constraints, interfaces, test strategy, risks, acceptance criteria, and `SPEC.md`.

### 6.2 plan

```text
/uxu-code:plan
@plan
```

Use after `SPEC.md` is approved and the work cannot be completed as one small change. It performs read-only analysis, identifies dependencies, divides work into vertical slices, and creates `tasks/plan.md` and `tasks/todo.md` with acceptance and validation steps. It does not modify business code.

### 6.3 build

```text
/uxu-code:build
@build
```

Use with an approved plan to execute the next task. It completes one minimal vertical slice, tests and verifies it, updates task state, commits only when authorized, and then stops with evidence so the change remains reviewable and reversible.

### 6.4 build auto

```text
/uxu-code:build auto
@build auto
```

Use only when the specification and plan are stable, acceptance criteria are clear, automated tests are reliable, continuous execution is authorized, and each task is independently reversible. Do not use while requirements are changing, key tests are missing, migrations are high risk, or external behavior is unverified. Stop on ambiguity or failed validation.

### 6.5 debug

```text
/uxu-code:debug <problem-or-error>
@debug <problem-or-error>
```

Use for an observed failure, log, or abnormal behavior. Reproduce it, identify the root cause, add regression coverage, implement the smallest fix, and verify it. Report reproduction conditions, root cause, repair, test evidence, and unresolved uncertainty.

### 6.6 review

```text
/uxu-code:review
@review
```

Use after a feature or fix is complete, before merge, for model-generated code, or after a refactor. Review correctness, readability, architecture, security, performance, and complexity. Return Critical, Important, and Suggestion findings with precise `file:line`, impact, evidence, and repairs.

### 6.7 simplify

```text
/uxu-code:simplify
@simplify
```

Use only after behavior is correct and tests pass. Remove unnecessary nesting, duplication, abstractions, or dependencies one change at a time, validating after every step. Do not use while tests fail, requirements change, or merely to reduce line count. Never sacrifice security, accessibility, data integrity, or clarity.

### 6.8 ship

```text
/uxu-code:ship
@ship
```

`ship` is the merge or release readiness check used after implementation is complete. It is not a normal commit command and does not directly deploy production. It combines code quality, security, tests, compatibility, operational readiness, and rollback readiness; deduplicates findings into Blocker, Recommended, and Acknowledged; and returns GO or NO-GO.

Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility never use a fast path. Any blocker or missing required evidence means NO-GO.

## 7. Supporting Commands

| Command | Claude Code | Codex | Result |
|---|---|---|---|
| Help | `/uxu-code:help` | `@help` | Commands, workflow, and guide paths |
| Test | `/uxu-code:test` | `@test` | Test design, execution, and evidence |
| Audit | `/uxu-code:audit` | `@audit` | Complexity that can be deleted, reused, or replaced |
| Debt | `/uxu-code:debt` | `@debt` | `uxucode-debt:` items and escalation conditions |
| Commit message | `/uxu-code:commit` | `@commit` | A message derived from the real diff |
| Compress | `/uxu-code:compress <file>` | `@compress <file>` | Recoverable, protected context compression |
| Stats | `/uxu-code:stats` | `@stats` | Verifiable scope, source, and metrics |
| Status | `/uxu-code:status` | `@status` | Mode, task, test, and gate state |

`compress` must create a recoverable backup before editing. It must not change code blocks, inline code, URLs, commands, paths, environment variables, APIs, errors, versions, or numbers. If Markdown or protected-content validation fails, it preserves the original file.

## 8. Mode Settings

```text
/uxu-code:mode standard
@mode standard
```

| Mode | Implementation and output policy | Best use |
|---|---|---|
| `standard` | Minimal correct implementation with complete concise output | Everyday default |
| `lite` | Preserves more teaching context and only suggests simpler alternatives | New repositories, teaching, discussion |
| `full` | Enforces reuse, YAGNI, minimal maintainable changes, and conclusion-first output | Routine work in a familiar project |
| `ultra` | Aggressively removes valueless complexity and uses very short output | Clear small fixes and status updates |
| `off` | Disables global UXUCode simplification and compact-output policies | Diagnosing policy impact or special tasks |

The fixed priority is correctness and safety > explicit user requirements > workflow and validation evidence > minimal correct implementation > compactness. Security, irreversible deletion, migration, authentication, payment, permissions, deployment, architecture, and rollback automatically restore full detail.

## 9. Common Task Examples

New feature:

```text
/uxu-code:spec Add login rate limiting
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship
```

Use the same flow in Codex with `@spec`, `@plan`, `@build`, `@review`, `@simplify`, and `@ship`. For a bug fix, use `debug → review → ship`.

## 10. Configuration and State

The following is the Claude Code and Codex default configuration:

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

The shared Claude Code and Codex configuration path is `%APPDATA%\uxucode\config.json` on Windows and `~/.config/uxucode/config.json` on macOS/Linux. Project state for those two hosts is stored in `.uxucode-state.json`. The status line format is `[UXUCODE:STANDARD] task 3/8 · tests ✓`. OpenClaw uses neither this shared configuration nor this project state file.

## 11. Frequently Asked Questions

**Why are the prefixes different?** Each host has a different native entry point, while command names, arguments, and behavior remain aligned.

**Does `ship` commit or deploy?** No. It returns the merge or release gate, steps, and rollback plan.

**When should I use `build auto`?** Only when a stable plan, reliable tests, explicit authorization, and reversible tasks all exist.

**What happens when compression fails?** The original and backup are preserved, the failure is reported, and the original content is not overwritten.

## 12. OpenClaw Workspace Profile

OpenClaw is a general personal-assistant and coordination runtime, not a third coding CLI. The MVP only writes a compact policy into the selected workspace `AGENTS.md`. It has no plugin, hook, skill, telemetry, conversation access, or shared global configuration, and it is not included in Claude/Codex 16-command or skill parity. See `OpenClaw/README.md` for the complete boundaries.

### 12.1 Modes and Boundaries

OpenClaw retains the conceptual modes `standard`, `lite`, `full`, `ultra`, and `off`, but stores the selection per workspace in the managed block. `standard` is the shipped default. `ultra` is an explicit choice for simple, low-risk work. Every mode restores full detail for destructive actions, authentication, privacy, payment, messaging, deployment, migration, rollback, and safety.

The project provides `OpenClaw/templates/SOUL.md` and `OpenClaw/templates/IDENTITY.md` as optional starting templates. `SOUL.md` defines persona, tone, and boundaries; `IDENTITY.md` defines name, role, vibe, emoji, and avatar. Review and customize them before copying them to the workspace root. The installer manages only `AGENTS.md` and never creates or overwrites these files.

### 12.2 Update, Removal, and Rollback

After updating the repository, run `--dry-run` for each workspace, then rerun the installer with that workspace's selected mode. To remove the profile, first copy `AGENTS.md`, then delete only the paired managed markers and their contents. To roll back an update, verify and restore that workspace's `AGENTS.md.uxucode-backup-*`. Stop on missing, duplicate, nested, or out-of-order markers instead of overwriting the whole file.

### 12.3 Native Runtime Controls

Continue using OpenClaw's native `/usage`, `/compact`, `/verbose`, `/reasoning`, `/think`, and `/model` controls. UXUCode does not duplicate them and provides no MVP runtime mode command.

### 12.4 Validation and Limitations

```text
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

See `OpenClaw/evaluation/README.md` for the complete protocol. The evaluation contains 52 sanitized cases and must pair an unprofiled baseline workspace with a profiled workspace under the same pinned OpenClaw version, provider, model, thinking level, tools, and runtime settings. The release gate requires at least 35% lower median output tokens, at least 95% low-risk correctness, zero unsolicited external mutations, and zero missing required risk information.

Static validation and synthetic results only prove the scoring logic; they do not prove real token savings. Retain only pinned environment metadata and sanitized aggregate evidence. Never commit credentials, raw private conversations, real personal data, or OpenClaw state directories.
