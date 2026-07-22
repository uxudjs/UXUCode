# UXUCode Usage Guide

UXUCode v3.0.0

<!-- section:1 -->
## 1. What UXUCode Is

UXUCode is a unified software engineering workflow system for Claude Code and Codex. It combines requirement clarification, specification, planning, incremental implementation, testing, review, minimal correct implementation, concise technical communication, context compression, and release gates. The hosts remain internally independent while command names, arguments, behavior, and output semantics stay aligned.

<!-- section:2 -->
## 2. Project Features

| Feature | Description |
|---|---|
| Complete engineering flow | Covers requirements, specification, planning, implementation, testing, review, simplification, migration, and release |
| Specification driven | Establishes a verifiable specification before non-trivial work |
| Incremental implementation | Completes vertical slices with independent verification |
| Minimal correct implementation | Prefers repository reuse, standard libraries, and platform capabilities |
| Verification first | Requires test, build, or runtime evidence |
| Multidimensional review | Checks correctness, readability, architecture, security, performance, and complexity |
| Concise communication | Removes repetition while preserving necessary technical detail |
| Release gate | Returns Blocker, Recommended, Acknowledged, and GO/NO-GO |
| Context compression | Preserves code, commands, paths, links, and structure |
| Consistent dual CLI | Keeps adapters independent and workflow semantics aligned |

<!-- section:3 -->
## 3. Installation and Updates

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Temporarily load Claude Code with `claude --plugin-dir ./Claude`. For a persistent install, run `/plugin marketplace add ./Claude` and `/plugin install uxu-code@uxu-code-claude` in Claude Code.

For Codex, run `codex plugin marketplace add ./Codex` and `codex plugin add uxu-code@uxu-code-codex`. To update, run `git pull` and refresh the host plugin. Either host package can be installed independently; no symlink or cross-directory runtime reference is used.

<!-- section:4 -->
## 4. Claude Code and Codex Command Formats

| Host | Official form | Example |
|---|---|---|
| Claude Code | `/uxu-code:<command> [arguments]` | `/uxu-code:spec Add login rate limiting` |
| Codex | `@<command> [arguments]` | `@spec Add login rate limiting` |

Only the host prefix differs. Do not treat ordinary prompt text as an official command entry.

<!-- section:5 -->
## 5. Recommended Development Flow

New feature: `spec → plan → build → review → simplify → ship`. Use `build auto` for a stable, approved plan. Defect: `debug → review → ship`.

`build` executes one task at a time. `build auto` may continue only when the specification is stable, acceptance criteria are clear, automated tests are reliable, and the user explicitly authorizes continuous execution.

<!-- section:6 -->
## 6. Core Command Details

| Command | Use when | Do not use when | Result |
|---|---|---|---|
| `spec` | New feature, cross-module change, or unclear acceptance | One-line fix or approved specification exists | Create and confirm SPEC.md |
| `plan` | Approved specification with dependent tasks | Simple isolated edit | Create tasks/plan.md and tasks/todo.md without business-code edits |
| `build` | Execute the next approved plan item | No stable specification or plan | Implement and verify one vertical slice, then stop |
| `build auto` | Stable plan, reliable tests, continuous execution authorized | Risky migration, changing requirements, or missing critical tests | Execute tasks in order and stop immediately on a blocker |
| `debug` | Observable error, log, or incorrect behavior | Speculative optimization without evidence | Return reproduction, root cause, minimal fix, and regression verification |
| `test` | Design, add, or run tests | Claim success from checks not run | Return commands, passes, failures, skips, and unverified areas |
| `review` | Implementation complete, before PR, or after refactor | Substitute for executable tests | Return six-axis findings as Critical, Important, or Suggestion |
| `simplify` | Behavior verified and tests pass | Behavior uncertain or tests fail | Reduce complexity incrementally without behavior change |
| `ship` | Before merge, version, or release | Development just started, only a commit is needed, or many TODOs remain | Return GO/NO-GO, release steps, and rollback plan |

ship is the release or merge readiness check after implementation is complete. It is not a normal commit command and does not deploy production. It combines code quality, security, testing, and rollback readiness into a GO or NO-GO decision. Authentication, payment, permissions, data migration, production configuration, security fixes, and public API compatibility must never skip the full gate.

<!-- section:7 -->
## 7. Auxiliary Commands

| Command | Purpose |
|---|---|
| `help` | Show commands and the current language guide |
| `mode <level>` | Set implementation and output strategy together |
| `audit` | Read-only scan for removable, reusable, or replaceable complexity |
| `debt` | Summarize bounded uxucode-debt: markers and upgrade triggers |
| `commit` | Generate a message from a verified diff without committing or pushing |
| `compress <file>` | Back up and safely compress explanatory files; never overwrite on failed validation |
| `stats` | Show reproducible, verified metrics |
| `status` | Show mode, task, tests, and release-gate state |

<!-- section:8 -->
## 8. Mode Settings

| Mode | Implementation | Output | Use case |
|---|---|---|---|
| `standard` | Default minimal correct implementation | Complete sentences without obvious redundancy | Daily work; default |
| `lite` | Suggest simpler options without changing specified structure | More explanation | New repositories, teaching, discussion |
| `full` | Enforce reuse, YAGNI, and minimal maintainable changes | Conclusion first and compact | Routine work in a familiar repository |
| `ultra` | Aggressively remove valueless complexity | Extremely short | Clear, low-risk small fixes |
| `off` | Disable global simplification | Host-default output | Diagnose mode effects |

Priority is fixed: correctness and safety > explicit user requirements > workflow and verification evidence > minimal correct implementation > brevity. Security, irreversible deletion, migration, authentication, payment, permissions, deployment, architecture, and rollback automatically restore complete expression.

<!-- section:9 -->
## 9. Common Task Examples

```text
# Claude Code: new feature
/uxu-code:spec Add login rate limiting
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship

# Codex: bug fix
@debug User is occasionally redirected to login after signing in
@review
@ship
```

To compress a context file, use `/uxu-code:compress CLAUDE.md` in Claude Code or `@compress AGENTS.md` in Codex.

<!-- section:10 -->
## 10. Configuration and State

The configuration file is `%APPDATA%\uxucode\config.json` on Windows or `~/.config/uxucode/config.json` on macOS/Linux. Project state is stored in `.uxucode-state.json`; the status line is `[UXUCODE:STANDARD] task 3/8 · tests ✓`.

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

<!-- section:11 -->
## 11. Frequently Asked Questions

**Can both hosts share one runtime directory?** They do not need to; each host package is complete and independent.

**Why does plan not write code?** It only converts an approved specification into verifiable tasks.

**When should I use ship?** After implementation and before merge, versioning, or release; any blocker or missing critical evidence requires NO-GO.

**Can ultra omit a security risk?** No. Correctness, safety, evidence, and explicit requirements always outrank brevity.
