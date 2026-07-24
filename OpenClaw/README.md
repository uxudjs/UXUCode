# UXUCode for OpenClaw

UXUCode for OpenClaw is a compact workspace policy for a personal assistant and coordination runtime. It is not a third coding-CLI plugin and does not copy the Claude Code or Codex engineering command set.

The MVP installs one managed policy block into an agent workspace `AGENTS.md`. OpenClaw loads that file when a session starts. The profile adds no OpenClaw plugin, hook, skill, telemetry, conversation access, credential access, or shared global UXUCode configuration.

## Prerequisites

- A local checkout of this repository on the OpenClaw Gateway host.
- Node.js available as `node`; no package installation is required.
- The absolute path of the intended OpenClaw agent workspace.

OpenClaw may host multiple agents with different workspaces. Run the installer separately for each intended workspace. Do not point it at `~/.openclaw`, credentials, sessions, or the OpenClaw configuration directory.

## Install

Preview the default `standard` profile first:

```text
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard --dry-run
```

Apply it after reviewing the exact target:

```text
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard
```

The installer:

- creates `AGENTS.md` when it is missing;
- otherwise appends or replaces only the block between `<!-- UXUCODE:OPENCLAW:BEGIN -->` and `<!-- UXUCODE:OPENCLAW:END -->`;
- preserves existing UTF-8 content outside that block byte-for-byte;
- rejects duplicate, nested, incomplete, or out-of-order markers;
- verifies a timestamped `AGENTS.md.uxucode-backup-*` copy before replacing an existing managed block;
- makes an identical reinstall a no-op with no unnecessary backup.

Start a fresh OpenClaw session after installation so the workspace bootstrap files are loaded again.

## Modes

| Mode | Behavior |
|---|---|
| `standard` | Concise, complete, exact scope, with brief evidence. Shipped default. |
| `lite` | Adds conversational or educational context while remaining bounded. |
| `full` | Adds assumptions, evidence, and verification for complex work. |
| `ultra` | Shortest sufficient response and execution for simple, low-risk work. Explicit opt-in. |
| `off` | Disables UXUCode compactness and scope controls only; OpenClaw and project safety rules remain active. |

Change a workspace mode by rerunning the installer, preferably with `--dry-run` first:

```text
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode ultra --dry-run
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode ultra
```

Every mode restores full ordered detail for destructive actions, authentication, privacy, payment, messaging, deployment, migration, rollback, recovery, and physical safety.

## Native OpenClaw controls

UXUCode modes do not replace OpenClaw runtime controls. Continue to use OpenClaw's native `/usage`, `/compact`, `/verbose`, `/reasoning`, `/think`, and `/model` surfaces for provider usage, context compaction, verbosity, reasoning, and model selection.

## Update

1. Update this repository with the project's normal Git workflow.
2. Run the profile validator.
3. Preview the intended workspace update with `--dry-run`.
4. Rerun the installer with that workspace's selected mode.
5. Start a fresh OpenClaw session and confirm the intended behavior.

```text
node OpenClaw/scripts/validate-profile.js
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard
```

An update that changes an existing managed block creates and verifies a timestamped backup before writing.

## Remove

There is no automatic remove command in the MVP. To avoid deleting user-authored instructions:

1. Copy `AGENTS.md` to a separate recovery file.
2. Confirm there is exactly one begin marker and one end marker in the correct order.
3. Remove only those markers and the content between them.
4. Preserve every byte outside the managed block.
5. Start a fresh OpenClaw session and verify the remaining instructions.

If markers are missing, duplicated, nested, or out of order, stop. Do not overwrite the whole file. Restore a known-good backup or repair the marker structure only after comparing the current file with that backup.

## Roll back

Before restoring, retain a copy of the current `AGENTS.md`. Select the timestamped `AGENTS.md.uxucode-backup-*` created for the update, verify it belongs to the same workspace, compare it with the current file, and then copy that backup over `AGENTS.md`. Start a fresh session and verify the restored policy.

A backup is created only when an existing managed block is replaced. Initial creation and first merge do not create one.

## Validate

Repository validation:

```text
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js
```

The validator enforces the compact profile contract and confirms that the OpenClaw package contains no plugin, hook, or skill scaffolding.

## Limitations and privacy

- The profile influences model behavior; it is not a hard provider token cap or billing control.
- Token reduction claims require the pinned paired evaluation described by this repository. Static validation alone is not evidence of savings.
- The MVP has no runtime mode command. Mode is stored per workspace in the managed block.
- The installer reads only its source fragment and the selected workspace `AGENTS.md`. It never edits `SOUL.md`, `USER.md`, `MEMORY.md`, `HEARTBEAT.md`, OpenClaw configuration, credentials, or sessions.
- Keep workspaces and backups private when they contain personal instructions. Never commit credentials, raw private conversations, or OpenClaw state directories.
