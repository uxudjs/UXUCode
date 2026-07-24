#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');
const {
  BEGIN_MARKER,
  END_MARKER,
  VALID_MODES
} = require('./validate-profile');

const MODE_PATTERN = /<!-- UXUCODE:MODE ([a-z]+) -->/g;

function parseArgs(argv) {
  const options = {};
  const seen = new Set();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!['--workspace', '--mode', '--dry-run'].includes(argument)) {
      throw new Error(`unknown argument: ${argument}`);
    }
    if (seen.has(argument)) throw new Error(`duplicate ${argument}`);
    seen.add(argument);

    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
    options[argument.slice(2)] = value;
    index += 1;
  }

  if (!options.workspace) throw new Error('--workspace is required');
  options.mode ||= 'standard';
  if (!VALID_MODES.includes(options.mode)) throw new Error(`invalid mode: ${options.mode}`);
  return options;
}

function newlineFor(content) {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

function renderProfile(fragment, mode, newline = '\n') {
  if (!VALID_MODES.includes(mode)) throw new Error(`invalid mode: ${mode}`);
  const declarations = [...fragment.matchAll(MODE_PATTERN)];
  if (declarations.length !== 1) throw new Error('source profile must contain exactly one mode declaration');

  return fragment
    .replace(MODE_PATTERN, `<!-- UXUCODE:MODE ${mode} -->`)
    .replace(/\r\n|\r|\n/g, newline)
    .replace(new RegExp(`${newline.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}$`), '');
}

function inspectManagedBlock(content) {
  const beginCount = content.split(BEGIN_MARKER).length - 1;
  const endCount = content.split(END_MARKER).length - 1;
  if (beginCount === 0 && endCount === 0) return null;
  if (beginCount !== 1 || endCount !== 1) throw new Error('AGENTS.md has malformed managed markers');

  const start = content.indexOf(BEGIN_MARKER);
  const end = content.indexOf(END_MARKER);
  if (start > end) throw new Error('AGENTS.md has malformed managed markers');

  const endExclusive = end + END_MARKER.length;
  const block = content.slice(start, endExclusive);
  const modes = [...block.matchAll(MODE_PATTERN)].map((match) => match[1]);
  if (modes.length !== 1 || !VALID_MODES.includes(modes[0])) {
    throw new Error('AGENTS.md managed block has an invalid mode declaration');
  }
  return { start, endExclusive, block };
}

function appendBlock(content, block, newline) {
  if (content.length === 0) return block;
  if (content.endsWith(newline + newline)) return content + block;
  if (content.endsWith(newline)) return content + newline + block;
  return content + newline + newline + block;
}

function writeVerified(targetPath, content) {
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.uxucode-${process.pid}-${Date.now()}.tmp`
  );
  try {
    fs.writeFileSync(temporaryPath, content, { flag: 'wx' });
    const expected = Buffer.from(content, 'utf8');
    if (!fs.readFileSync(temporaryPath).equals(expected)) {
      throw new Error(`failed to verify temporary write: ${temporaryPath}`);
    }
    fs.renameSync(temporaryPath, targetPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
  }
}

function nextBackupPath(agentsPath, now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const base = `${agentsPath}.uxucode-backup-${timestamp}`;
  let candidate = base;
  let suffix = 1;
  while (fs.existsSync(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function createVerifiedBackup(agentsPath, original, now) {
  const backupPath = nextBackupPath(agentsPath, now);
  fs.copyFileSync(agentsPath, backupPath, fs.constants.COPYFILE_EXCL);
  if (!fs.readFileSync(backupPath).equals(original)) {
    fs.rmSync(backupPath);
    throw new Error(`failed to verify backup: ${backupPath}`);
  }
  return backupPath;
}

function resolveWorkspace(workspace) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace)) {
    throw new Error('workspace path must be absolute');
  }
  if (!fs.existsSync(workspace)) throw new Error(`workspace does not exist: ${workspace}`);
  const exact = fs.realpathSync.native(workspace);
  if (!fs.statSync(exact).isDirectory()) throw new Error(`workspace is not a directory: ${workspace}`);
  return exact;
}

function installProfile(options, dependencies = {}) {
  const log = dependencies.log || console.log;
  const now = dependencies.now || new Date();
  const mode = options.mode || 'standard';
  if (!VALID_MODES.includes(mode)) throw new Error(`invalid mode: ${mode}`);

  const workspace = resolveWorkspace(options.workspace);
  const agentsPath = path.join(workspace, 'AGENTS.md');
  const fragmentPath = path.resolve(__dirname, '..', 'AGENTS.fragment.md');
  const fragment = fs.readFileSync(fragmentPath, 'utf8');
  const exists = fs.existsSync(agentsPath);
  if (exists && !fs.lstatSync(agentsPath).isFile()) {
    throw new Error('workspace AGENTS.md must be a regular file, not a directory or symbolic link');
  }
  const original = exists ? fs.readFileSync(agentsPath) : Buffer.alloc(0);
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(original);
  } catch {
    throw new Error('workspace AGENTS.md must contain valid UTF-8');
  }
  const current = original.toString('utf8');
  const managed = inspectManagedBlock(current);
  const newline = newlineFor(current);
  const rendered = renderProfile(fragment, mode, newline);
  const next = managed
    ? current.slice(0, managed.start) + rendered + current.slice(managed.endExclusive)
    : appendBlock(current, rendered, newline);

  if (Buffer.from(next, 'utf8').equals(original)) {
    log(`AGENTS.md already has the requested UXUCode ${mode} profile; no changes.`);
    return { action: 'unchanged', agentsPath };
  }

  const plannedAction = !exists ? 'create' : managed ? 'update' : 'merge';
  if (options.dryRun) {
    log(`Dry run: would ${plannedAction} ${agentsPath} with UXUCode mode ${mode}.`);
    return { action: `would-${plannedAction}`, agentsPath };
  }

  let backupPath;
  if (managed) backupPath = createVerifiedBackup(agentsPath, original, now);
  writeVerified(agentsPath, next);
  log(`UXUCode OpenClaw profile ${plannedAction}d at ${agentsPath} with mode ${mode}.`);
  return {
    action: `${plannedAction}${plannedAction.endsWith('e') ? 'd' : 'ed'}`,
    agentsPath,
    backupPath
  };
}

function main() {
  try {
    installProfile(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`OpenClaw profile installation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  installProfile,
  inspectManagedBlock,
  parseArgs,
  renderProfile
};
