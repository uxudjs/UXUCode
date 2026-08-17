const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const workspaceRoot = process.cwd();
const configPath = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode', 'config.json')
  : path.join(os.homedir(), '.config', 'uxucode', 'config.json');
const statePath = path.join(workspaceRoot, '.uxucode-state.json');
const planPath = path.join(workspaceRoot, 'work-products', 'plan.md');
const stateMaxAgeMs = 24 * 60 * 60 * 1000;
const futureToleranceMs = 5 * 60 * 1000;

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return {}; }
}

function writeConfig(value) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(value, null, 2) + '\n');
}

function normalizeWorkspaceId(value) {
  if (typeof value !== 'string' || !value) return null;
  const normalized = path.normalize(value).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function currentWorkspaceId() {
  try { return normalizeWorkspaceId(fs.realpathSync.native(workspaceRoot)); }
  catch { return normalizeWorkspaceId(path.resolve(workspaceRoot)); }
}

function gitOutput(args) {
  try {
    const result = childProcess.spawnSync('git', args, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      shell: false,
      timeout: 1000,
      windowsHide: true
    });
    if (result.error || result.signal || result.status === null) {
      return { ok: false, value: null };
    }
    return { ok: true, status: result.status, value: result.stdout.trim() };
  } catch {
    return { ok: false, value: null };
  }
}

function hasGitMetadata() {
  if (process.env.GIT_DIR || process.env.GIT_WORK_TREE) return { ok: true, value: true };
  let directory = workspaceRoot;
  while (true) {
    try {
      fs.lstatSync(path.join(directory, '.git'));
      return { ok: true, value: true };
    } catch (error) {
      if (error.code !== 'ENOENT') return { ok: false, value: false };
    }
    const parent = path.dirname(directory);
    if (parent === directory) return { ok: true, value: false };
    directory = parent;
  }
}

function currentBranchId() {
  const metadata = hasGitMetadata();
  if (!metadata.ok) return { ok: false, value: null };
  const branch = gitOutput(['symbolic-ref', '--quiet', '--short', 'HEAD']);
  if (!branch.ok) return branch;
  if (branch.status === 0) {
    return branch.value ? { ok: true, value: branch.value } : { ok: false, value: null };
  }
  if (!metadata.value) {
    return branch.status === 128 ? { ok: true, value: null } : { ok: false, value: null };
  }
  if (branch.status !== 1) return { ok: false, value: null };
  const head = gitOutput(['rev-parse', '--verify', 'HEAD']);
  if (!head.ok || head.status !== 0 || !head.value) return { ok: false, value: null };
  return { ok: true, value: `detached:${head.value}` };
}

function currentPlanId() {
  try {
    return {
      ok: true,
      value: crypto.createHash('sha256').update(fs.readFileSync(planPath)).digest('hex')
    };
  } catch (error) {
    return { ok: error.code === 'ENOENT', value: null };
  }
}

function staleState(status = 'stale') {
  return { status, state: {} };
}

function readStateStatus(now = Date.now()) {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    return staleState(error.code === 'ENOENT' ? 'missing' : 'stale');
  }

  if (!state || Array.isArray(state) || typeof state !== 'object') return staleState();
  const workspaceId = currentWorkspaceId();
  const branchIdentity = currentBranchId();
  const planIdentity = currentPlanId();
  if (!branchIdentity.ok || !planIdentity.ok) return staleState();
  const branchId = branchIdentity.value;
  const planId = planIdentity.value;
  const updatedAt = typeof state.updatedAt === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(state.updatedAt)
    ? Date.parse(state.updatedAt)
    : NaN;
  const taskRangeValid = Number.isInteger(state.task) && state.task > 0 &&
    Number.isInteger(state.total) && state.total > 0 && state.task <= state.total;
  const optionalTextValid = ['currentTask', 'tests', 'gate'].every((field) =>
    state[field] === undefined || (typeof state[field] === 'string' && state[field].trim())
  );

  if (state.schemaVersion !== 1 ||
      normalizeWorkspaceId(state.workspaceId) !== workspaceId ||
      state.branchId !== branchId || state.planId !== planId ||
      !Number.isFinite(updatedAt) || updatedAt > now + futureToleranceMs ||
      now - updatedAt > stateMaxAgeMs || !taskRangeValid || !optionalTextValid) {
    return staleState();
  }

  return {
    status: 'fresh',
    state: {
      schemaVersion: 1,
      workspaceId,
      branchId,
      planId,
      updatedAt: state.updatedAt,
      ...(state.currentTask === undefined ? {} : { currentTask: state.currentTask }),
      task: state.task,
      total: state.total,
      ...(state.tests === undefined ? {} : { tests: state.tests }),
      ...(state.gate === undefined ? {} : { gate: state.gate })
    }
  };
}

module.exports = {
  readConfig,
  readState: () => readStateStatus().state,
  readStateStatus,
  writeConfig
};
