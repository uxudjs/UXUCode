const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const codex = require('../../Codex/hooks/mode-policy');
const claude = require('../../Claude/hooks/mode-policy');

const expectedModes = ['standard', 'lite', 'full', 'ultra', 'off'];

function createHookTestEnvironment(tempRoot, platform = process.platform) {
  const appData = path.join(tempRoot, 'appdata');
  const home = path.join(tempRoot, 'home');
  const configPath = platform === 'win32'
    ? path.join(appData, 'uxucode', 'config.json')
    : path.join(home, '.config', 'uxucode', 'config.json');

  return {
    appData,
    home,
    configPath,
    env: { ...process.env, APPDATA: appData, HOME: home, USERPROFILE: home }
  };
}

test('mode hook fixtures isolate Windows and POSIX user configuration roots', () => {
  const tempRoot = path.join('tmp', 'uxucode-mode-policy');
  const windows = createHookTestEnvironment(tempRoot, 'win32');
  const posix = createHookTestEnvironment(tempRoot, 'linux');

  assert.equal(windows.configPath, path.join(windows.appData, 'uxucode', 'config.json'));
  assert.equal(posix.configPath, path.join(posix.home, '.config', 'uxucode', 'config.json'));
  assert.equal(windows.env.APPDATA, windows.appData);
  assert.equal(posix.env.HOME, posix.home);
  assert.equal(posix.env.USERPROFILE, posix.home);
});

function runWorkspaceCommand(args, {
  mode = 'standard',
  input = '',
  state,
  rawState = false,
  setupWorkspace,
  beforeSpawn,
  env = {}
} = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-mode-policy-'));
  const fixture = createHookTestEnvironment(tempRoot);
  const workspace = path.join(tempRoot, 'workspace');
  const configPath = fixture.configPath;
  const statePath = path.join(workspace, '.uxucode-state.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(workspace);
  if (setupWorkspace) setupWorkspace(workspace);
  fs.writeFileSync(configPath, JSON.stringify({ mode }));
  const initialState = typeof state === 'function' ? state(workspace) : state;
  if (initialState !== undefined) {
    fs.writeFileSync(statePath, rawState ? initialState : JSON.stringify(initialState));
  }
  if (beforeSpawn) beforeSpawn(workspace, statePath);
  const runtimeEnv = { ...fixture.env };
  for (const [key, value] of Object.entries(env)) {
    const existingKey = Object.keys(runtimeEnv).find((candidate) =>
      candidate.toLowerCase() === key.toLowerCase()
    );
    if (existingKey) delete runtimeEnv[existingKey];
    runtimeEnv[key] = value;
  }

  try {
    const result = childProcess.spawnSync(process.execPath, args, {
      cwd: workspace,
      env: runtimeEnv,
      input,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    const stateExists = fs.existsSync(statePath);
    const stateText = stateExists ? fs.readFileSync(statePath, 'utf8') : null;
    let parsedState = null;
    if (stateText !== null) {
      try { parsedState = JSON.parse(stateText); }
      catch { parsedState = null; }
    }
    return {
      stdout: result.stdout,
      config: JSON.parse(fs.readFileSync(configPath, 'utf8')),
      state: parsedState,
      stateExists,
      stateText
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runHook(script, mode, input = '', state, options = {}) {
  return runWorkspaceCommand([script], { ...options, mode, input, state });
}

function git(workspace, args) {
  const result = childProcess.spawnSync('git', args, {
    cwd: workspace,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function initializeGitWorkspace(workspace) {
  git(workspace, ['init', '-b', 'main']);
  fs.writeFileSync(path.join(workspace, 'fixture.txt'), 'fixture\n');
  git(workspace, ['add', 'fixture.txt']);
  git(workspace, [
    '-c', 'user.name=UXUCode Test',
    '-c', 'user.email=uxucode@example.invalid',
    'commit', '-m', 'fixture'
  ]);
}

function writePlan(workspace, content = '# Fixture plan\n') {
  const planPath = path.join(workspace, 'work-products', 'plan.md');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, content);
}

function currentPlanId(workspace) {
  const planPath = path.join(workspace, 'work-products', 'plan.md');
  return fs.existsSync(planPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(planPath)).digest('hex')
    : null;
}

function currentBranchId(workspace) {
  const branch = childProcess.spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
    cwd: workspace,
    encoding: 'utf8'
  });
  if (branch.status === 0) return branch.stdout.trim();

  const head = childProcess.spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: workspace,
    encoding: 'utf8'
  });
  return head.status === 0 ? `detached:${head.stdout.trim()}` : null;
}

function completeState(workspace, overrides = {}) {
  return {
    schemaVersion: 1,
    workspaceId: fs.realpathSync(workspace),
    branchId: currentBranchId(workspace),
    planId: currentPlanId(workspace),
    updatedAt: new Date().toISOString(),
    currentTask: 'verify state lifecycle',
    task: 2,
    total: 4,
    tests: 'passed',
    gate: 'GO',
    ...overrides
  };
}

function readHookState(host, state, options = {}) {
  const hookStatePath = path.join(__dirname, '..', '..', host, 'hooks', 'hook-state.js');
  const source = `process.stdout.write(JSON.stringify(require(${JSON.stringify(hookStatePath)}).readState()))`;
  const result = runWorkspaceCommand(['-e', source], { ...options, state });
  return { ...result, value: JSON.parse(result.stdout) };
}

function runCodexHook(script, mode, input = '') {
  return JSON.parse(runHook(script, mode, input).stdout);
}

function runClaudeHook(script, mode, input = '') {
  return runHook(script, mode, input).stdout;
}

const routerHosts = [
  {
    name: 'Claude',
    prefix: '/uxu-code:',
    help: '/uxu-code:help',
    syntax: '/uxu-code:<command>',
    context: (stdout) => stdout,
    rejection: (stdout) => JSON.parse(stdout)
  },
  {
    name: 'Codex',
    prefix: '@',
    help: '@help',
    syntax: '@<command>',
    context: (stdout) => stdout
      ? JSON.parse(stdout).hookSpecificOutput.additionalContext
      : '',
    rejection: (stdout) => JSON.parse(stdout)
  }
];

function runPromptRouter(host, prompt, state, options = {}) {
  const script = path.join(__dirname, '..', '..', host.name, 'hooks', 'uxu-prompt-router.js');
  return runHook(script, 'standard', JSON.stringify({ prompt }), state, options);
}

function assertRejectedWithoutWrites(host, prompt, expectedMessage) {
  const initialState = { currentTask: 'preserve this task', tests: 'not run' };
  const result = runPromptRouter(host, prompt, initialState);
  const rejection = host.rejection(result.stdout);

  assert.equal(rejection.decision, 'block');
  assert.match(rejection.reason, expectedMessage);
  assert.deepEqual(result.config, { mode: 'standard' });
  assert.deepEqual(result.state, initialState);
}

for (const host of routerHosts) {
  test(`${host.name} multiline routes preserve LF, CRLF, inline arguments, and body line breaks`, () => {
    const cases = [
      {
        prompt: `${host.prefix}audit inspect gates`,
        expectedArguments: 'inspect gates'
      },
      {
        prompt: `\uFEFF${host.prefix}audit inspect gates`,
        expectedArguments: 'inspect gates'
      },
      {
        prompt: `${host.prefix}audit\ninspect gates\ndo not modify files`,
        expectedArguments: 'inspect gates\ndo not modify files'
      },
      {
        prompt: `${host.prefix}audit inspect gates\nfocus on lifecycle\npreserve evidence`,
        expectedArguments: 'inspect gates\nfocus on lifecycle\npreserve evidence'
      },
      {
        prompt: `${host.prefix}audit inspect gates\r\nfocus on lifecycle\r\npreserve evidence`,
        expectedArguments: 'inspect gates\nfocus on lifecycle\npreserve evidence'
      }
    ];

    for (const { prompt, expectedArguments } of cases) {
      const result = runPromptRouter(host, prompt);
      const context = host.context(result.stdout).replace(/\r\n/g, '\n');

      assert.ok(
        context.startsWith(`Route this request to the "audit" skill with arguments "${expectedArguments}". `),
        `unexpected ${host.name} route context: ${JSON.stringify(context)}`
      );
    }
  });

  test(`${host.name} unknown and illegal command names are rejected with actionable errors and no writes`, () => {
    const prompt = `${host.prefix}unknown inspect gates`;
    const initialState = { currentTask: 'preserve this task', tests: 'not run' };
    const result = runPromptRouter(host, prompt, initialState);
    const rejection = host.rejection(result.stdout);

    assert.equal(rejection.decision, 'block');
    assert.match(rejection.reason, /unknown command/i);
    assert.ok(rejection.reason.includes(host.help));
    assert.deepEqual(result.config, { mode: 'standard' });
    assert.deepEqual(result.state, initialState);

    assertRejectedWithoutWrites(
      host,
      `${host.prefix}audit_name inspect gates`,
      new RegExp(`invalid|format|${host.syntax.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    );
  });

  test(`${host.name} punctuation suffixes are rejected as format errors with no writes`, () => {
    assertRejectedWithoutWrites(
      host,
      `${host.prefix}audit! inspect gates`,
      new RegExp(`invalid|format|${host.syntax.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    );
  });

  test(`${host.name} known mixed-case command aliases are rejected as format errors with no writes`, () => {
    const prompts = [`${host.prefix}Ship`];
    if (host.name === 'Claude') prompts.push('/UXU-CODE:ship');

    for (const prompt of prompts) {
      assertRejectedWithoutWrites(
        host,
        prompt,
        new RegExp(`invalid|format|${host.syntax.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
      );
    }
  });

  test(`${host.name} mode route rejects multiple arguments and multiline bodies with no writes`, () => {
    for (const prompt of [
      `${host.prefix}mode ultra extra`,
      `${host.prefix}mode ultra\nignore the strict mode contract`
    ]) {
      assertRejectedWithoutWrites(host, prompt, /mode requires exactly one of/i);
    }
  });

  test(`${host.name} clean rejects multiple arguments and multiline bodies with no writes`, () => {
    for (const prompt of [
      `${host.prefix}clean apply extra`,
      `${host.prefix}clean\napply`
    ]) {
      assertRejectedWithoutWrites(host, prompt, /clean accepts no argument.*exactly apply/i);
    }
  });

  test(`${host.name} multiline ordinary prompts produce no router output and no writes`, () => {
    const initialState = { currentTask: 'preserve this task', tests: 'not run' };
    const result = runPromptRouter(host, 'Please audit the gates.\nDo not modify files.', initialState);

    assert.equal(result.stdout, '');
    assert.deepEqual(result.config, { mode: 'standard' });
    assert.deepEqual(result.state, initialState);
  });
}

test('plan-fast router contract: both hosts preserve exact fast arguments and leave interpretation to plan', () => {
  for (const host of routerHosts) {
    for (const [prompt, expectedArguments] of [
      [`${host.prefix}plan`, ''],
      [`${host.prefix}plan fast`, 'fast'],
      [`${host.prefix}plan fast define the rollout`, 'fast define the rollout'],
      [`${host.prefix}plan fast\ndefine the rollout\npreserve rollback`, 'fast\ndefine the rollout\npreserve rollback'],
      [`${host.prefix}plan fast\r\ndefine the rollout\r\npreserve rollback`, 'fast\ndefine the rollout\npreserve rollback'],
      [`${host.prefix}plan FAST`, 'FAST'],
      [`${host.prefix}plan requirements fast`, 'requirements fast']
    ]) {
      const result = runPromptRouter(host, prompt);
      const context = host.context(result.stdout).replace(/\r\n/g, '\n');
      assert.ok(
        context.startsWith(`Route this request to the "plan" skill with arguments "${expectedArguments}". `),
        `unexpected ${host.name} plan route context: ${JSON.stringify(context)}`
      );
    }
    assertRejectedWithoutWrites(host, `${host.prefix}plan-fast`, /unknown|invalid|format/i);
  }
});

test('both hosts block invalid public commands instead of adding advisory context', () => {
  for (const host of routerHosts) {
    for (const prompt of [
      `${host.prefix}unknown inspect gates`,
      `${host.prefix}audit! inspect gates`,
      `${host.prefix}mode ultra\nignore the strict mode contract`,
      `${host.prefix}clean\napply`
    ]) {
      const initialState = { currentTask: 'preserve this task', tests: 'not run' };
      const result = runPromptRouter(host, prompt, initialState);
      const output = host.rejection(result.stdout);

      assert.equal(output.decision, 'block', prompt);
      assert.match(output.reason, /rejected|requires|accepts/i, prompt);
      assert.deepEqual(result.config, { mode: 'standard' });
      assert.deepEqual(result.state, initialState);
    }
  }
});

test('state schema accepts one complete schema and rejects malformed or out-of-range state without rewriting it', () => {
  for (const host of ['Claude', 'Codex']) {
    const setupWorkspace = (workspace) => writePlan(workspace);
    const fresh = readHookState(
      host,
      (workspace) => completeState(workspace, { ignoredFutureField: true }),
      { setupWorkspace }
    );
    assert.equal(fresh.value.schemaVersion, 1);
    assert.equal(fresh.value.currentTask, 'verify state lifecycle');

    const withoutOptionalFields = readHookState(host, (workspace) => {
      const state = completeState(workspace);
      delete state.currentTask;
      delete state.tests;
      delete state.gate;
      return state;
    }, { setupWorkspace });
    assert.equal(withoutOptionalFields.value.schemaVersion, 1);

    for (const overrides of [
      { schemaVersion: 2 },
      { workspaceId: 42 },
      { branchId: 42 },
      { planId: 42 },
      { currentTask: '' },
      { task: undefined },
      { total: undefined },
      { task: 0 },
      { task: 3, total: 2 },
      { task: 1.5 },
      { total: '4' },
      { tests: 42 },
      { gate: false }
    ]) {
      let written;
      const result = readHookState(host, (workspace) => {
        written = completeState(workspace, overrides);
        return written;
      }, { setupWorkspace });
      assert.deepEqual(result.value, {}, `${host} accepted ${JSON.stringify(overrides)}`);
      assert.equal(result.stateText, JSON.stringify(written));
    }

    const malformed = readHookState(host, '{not json', {
      rawState: true,
      setupWorkspace
    });
    assert.deepEqual(malformed.value, {});
    assert.equal(malformed.stateText, '{not json');
  }
});

test('workspace identity normalizes the current Windows path and rejects another workspace without rewriting state', () => {
  for (const host of ['Claude', 'Codex']) {
    const normalized = readHookState(host, (workspace) => completeState(workspace, {
      workspaceId: process.platform === 'win32'
        ? fs.realpathSync(workspace).replace(/\\/g, '/').toUpperCase()
        : fs.realpathSync(workspace)
    }));
    assert.equal(normalized.value.currentTask, 'verify state lifecycle');

    let written;
    const mismatched = readHookState(host, (workspace) => {
      written = completeState(workspace, {
        workspaceId: path.join(fs.realpathSync(workspace), 'different-workspace')
      });
      return written;
    });
    assert.deepEqual(mismatched.value, {});
    assert.equal(mismatched.stateText, JSON.stringify(written));
  }
});

test('branch identity binds named branches, detached HEAD, and non-Git workspaces deterministically', () => {
  for (const host of ['Claude', 'Codex']) {
    const named = readHookState(host, (workspace) => completeState(workspace), {
      setupWorkspace: initializeGitWorkspace
    });
    assert.equal(named.value.branchId, 'main');

    const changed = readHookState(host, (workspace) => completeState(workspace), {
      setupWorkspace: initializeGitWorkspace,
      beforeSpawn: (workspace) => git(workspace, ['switch', '-c', 'other'])
    });
    assert.deepEqual(changed.value, {});

    const detached = readHookState(host, (workspace) => completeState(workspace), {
      setupWorkspace: (workspace) => {
        initializeGitWorkspace(workspace);
        git(workspace, ['checkout', '--detach']);
      }
    });
    assert.match(detached.value.branchId, /^detached:[0-9a-f]{40,64}$/);

    const nonGit = readHookState(host, (workspace) => completeState(workspace));
    assert.equal(nonGit.value.branchId, null);
  }
});

test('plan identity hashes plan bytes, rejects changed plans, and accepts null when no plan exists', () => {
  for (const host of ['Claude', 'Codex']) {
    const withPlan = readHookState(host, (workspace) => completeState(workspace), {
      setupWorkspace: (workspace) => writePlan(workspace, '# Plan A\n')
    });
    assert.match(withPlan.value.planId, /^[0-9a-f]{64}$/);

    const changed = readHookState(host, (workspace) => completeState(workspace), {
      setupWorkspace: (workspace) => writePlan(workspace, '# Plan A\n'),
      beforeSpawn: (workspace) => writePlan(workspace, '# Plan B\n')
    });
    assert.deepEqual(changed.value, {});

    const withoutPlan = readHookState(host, (workspace) => completeState(workspace));
    assert.equal(withoutPlan.value.planId, null);
  }
});

test('identity probe execution and plan read failures fail closed instead of matching legal null identities', () => {
  for (const host of ['Claude', 'Codex']) {
    const gitProbeFailure = readHookState(host, (workspace) => completeState(workspace), {
      env: { PATH: '' }
    });
    assert.deepEqual(gitProbeFailure.value, {}, `${host} accepted a failed Git identity probe`);

    const gitProbeExitFailure = readHookState(host, (workspace) => completeState(workspace, {
      branchId: null
    }), {
      setupWorkspace: initializeGitWorkspace,
      env: { GIT_DIR: 'missing-git-dir' }
    });
    assert.deepEqual(
      gitProbeExitFailure.value,
      {},
      `${host} accepted an abnormal Git identity probe exit`
    );

    const unreadablePlan = readHookState(host, (workspace) => completeState(workspace, {
      planId: null
    }), {
      setupWorkspace: writePlan,
      beforeSpawn: (workspace) => {
        const planPath = path.join(workspace, 'work-products', 'plan.md');
        fs.rmSync(planPath);
        fs.mkdirSync(planPath);
      }
    });
    assert.deepEqual(unreadablePlan.value, {}, `${host} accepted a failed plan identity probe`);
  }
});

test('freshness accepts current timestamps and rejects expired, future, or malformed timestamps', () => {
  for (const host of ['Claude', 'Codex']) {
    const current = readHookState(host, (workspace) => completeState(workspace));
    assert.equal(current.value.currentTask, 'verify state lifecycle');

    for (const updatedAt of [
      new Date(Date.now() - (24 * 60 + 1) * 60 * 1000).toISOString(),
      new Date(Date.now() + 6 * 60 * 1000).toISOString(),
      'not-a-date'
    ]) {
      let written;
      const result = readHookState(host, (workspace) => {
        written = completeState(workspace, { updatedAt });
        return written;
      });
      assert.deepEqual(result.value, {}, `${host} accepted ${updatedAt}`);
      assert.equal(result.stateText, JSON.stringify(written));
    }
  }
});

test('both host mode policies expose the documented five-mode contract', () => {
  for (const policy of [codex, claude]) {
    assert.deepEqual(policy.supportedModes, expectedModes);
    assert.equal(policy.resolveMode(), 'standard');
    assert.equal(policy.resolveMode('invalid'), 'standard');
  }

  for (const mode of expectedModes) {
    assert.equal(codex.resolveMode(mode), mode);
    assert.equal(codex.policyFor(mode), claude.policyFor(mode));
  }
});

test('enabled modes retain safety and validation while preserving their distinct guidance', () => {
  for (const mode of expectedModes.filter((mode) => mode !== 'off')) {
    const policy = codex.policyFor(mode);
    assert.match(policy, /Correctness, safety, explicit requirements, and validation evidence outrank compactness\./);
  }

  assert.match(codex.policyFor('standard'), /smallest correct implementation/i);
  assert.match(codex.policyFor('lite'), /teaching context/i);
  assert.match(codex.policyFor('full'), /reuse, YAGNI/i);
  assert.match(codex.policyFor('ultra'), /very short outcome-first output/i);
});

test('off omits compact-output and simplification instructions but retains safety boundaries', () => {
  const policy = codex.policyFor('off');

  assert.match(policy, /Correctness, safety, explicit requirements, and validation evidence remain required\./);
  assert.doesNotMatch(policy, /compact-output/i);
  assert.doesNotMatch(policy, /simplification/i);
});

test('every Codex hook includes the configured mode policy', () => {
  const hooks = [
    ['uxu-session-start.js'],
    ['uxu-prompt-router.js', JSON.stringify({ prompt: '@build' })],
    ['uxu-subagent-start.js']
  ];

  for (const mode of expectedModes) {
    for (const [script, input] of hooks) {
      const output = runCodexHook(path.join(__dirname, '..', '..', 'Codex', 'hooks', script), mode, input);
      assert.ok(output.hookSpecificOutput.additionalContext.includes(codex.policyFor(mode)));
    }
  }
});

test('every Claude hook includes the configured mode policy', () => {
  const hooks = [
    ['uxu-session-start.js'],
    ['uxu-prompt-router.js', JSON.stringify({ prompt: '/uxu-code:build' })],
    ['uxu-subagent-start.js']
  ];

  for (const mode of expectedModes) {
    for (const [script, input] of hooks) {
      const output = runClaudeHook(path.join(__dirname, '..', '..', 'Claude', 'hooks', script), mode, input);
      const context = script === 'uxu-subagent-start.js' ? JSON.parse(output).hookSpecificOutput.additionalContext : output;
      assert.ok(context.includes(claude.policyFor(mode)));
    }
  }
});

test('mode route updates shared config without creating, refreshing, or rewriting project state', () => {
  for (const [pkg, prompt] of [
    ['Claude', '/uxu-code:mode ultra'],
    ['Codex', '@mode ultra']
  ]) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-prompt-router.js');
    const absent = runHook(script, 'standard', JSON.stringify({ prompt }));
    assert.equal(absent.stateExists, false);
    assert.equal(absent.config.mode, 'ultra');
    assert.match(absent.stdout, /UXUCode mode changed to ultra\./);

    const preservedText = '{\n  "schemaVersion": 0,\n  "mode": "full",\n  "legacy": true\n}\n';
    const existing = runHook(script, 'standard', JSON.stringify({ prompt }), preservedText, {
      rawState: true
    });
    assert.equal(existing.config.mode, 'ultra');
    assert.equal(existing.stateText, preservedText);
  }
});

test('SessionStart state uses the shared mode source, injects fresh state, and ignores stale state and state.mode', () => {
  for (const host of routerHosts) {
    const script = path.join(__dirname, '..', '..', host.name, 'hooks', 'uxu-session-start.js');
    const fresh = runHook(
      script,
      'lite',
      '',
      (workspace) => completeState(workspace, { mode: 'full' }),
      { setupWorkspace: writePlan }
    );
    const freshContext = host.context(fresh.stdout);
    assert.match(freshContext, /UXUCode is active in lite mode\./);
    assert.match(freshContext, /Current task: verify state lifecycle\./);
    assert.match(freshContext, /Last recorded tests: passed\./);

    const stale = runHook(script, 'lite', '', (workspace) => completeState(workspace, {
      workspaceId: path.join(workspace, 'other'),
      mode: 'ultra'
    }), { setupWorkspace: writePlan });
    const staleContext = host.context(stale.stdout);
    assert.match(staleContext, /UXUCode is active in lite mode\./);
    assert.doesNotMatch(staleContext, /Current task:/);
    assert.doesNotMatch(staleContext, /Last recorded tests:/);
  }
});

test('state writer interface is absent after the mode route has no state-writing caller', () => {
  for (const host of ['Claude', 'Codex']) {
    const hookStatePath = path.join(__dirname, '..', '..', host, 'hooks', 'hook-state.js');
    const hookState = require(hookStatePath);
    const source = fs.readFileSync(hookStatePath, 'utf8');

    assert.equal(hookState.writeState, undefined);
    assert.doesNotMatch(source, /\bwriteState\b/);
  }
});

test('status line uses shared-config mode and shows only fresh task, tests, and gate fields', () => {
  for (const pkg of ['Claude', 'Codex']) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-statusline.js');
    const result = runHook(
      script,
      'lite',
      '',
      (workspace) => completeState(workspace, { mode: 'full', task: 2, total: 3 }),
      { setupWorkspace: writePlan }
    );

    assert.equal(result.stdout, '[UXUCODE:LITE] task 2/3 · tests passed · gate GO');
  }
});

test('status route supplies the canonical payload without plugin-root shell variables', () => {
  for (const host of routerHosts) {
    const result = runPromptRouter(
      host,
      `${host.prefix}status`,
      (workspace) => completeState(workspace, { task: 2, total: 3 }),
      { setupWorkspace: writePlan }
    );
    const context = host.context(result.stdout);
    const skillPath = path.join(__dirname, '..', '..', host.name, 'skills', 'status', 'SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');

    assert.match(context, /Canonical UXUCode status payload:/);
    assert.match(context, /\[UXUCODE:STANDARD\] task 2\/3 · tests passed · gate GO/);
    assert.match(context, /Current task: verify state lifecycle/);
    assert.match(context, /Last update: \d{4}-\d{2}-\d{2}T/);
    assert.doesNotMatch(skill, /process\.env\.(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)/);
    assert.match(skill, /canonical status payload supplied by .*`UserPromptSubmit` hook/i);
    if (host.name === 'Codex') {
      assert.match(context, /answer this status request directly/i);
      assert.match(context, /do not load a skill, call tools, run commands, or inspect files/i);
      assert.doesNotMatch(context, /Route this request to the "status" skill/i);
    }
  }
});

test('stale status shows unknown fields and never exposes passed or GO', () => {
  for (const pkg of ['Claude', 'Codex']) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-statusline.js');
    const result = runHook(script, 'lite', '', (workspace) => completeState(workspace, {
      updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      mode: 'full'
    }));

    assert.equal(result.stdout, '[UXUCODE:LITE] task unknown · tests unknown · gate unknown');
    assert.doesNotMatch(result.stdout, /passed|GO/);
  }
});

test('optional state is silent and non-blocking while status fields remain unknown', () => {
  for (const pkg of ['Claude', 'Codex']) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-statusline.js');
    const result = runHook(script, 'lite');
    assert.equal(result.stdout, '[UXUCODE:LITE] task unknown · tests unknown · gate unknown');

    const skillPath = path.join(__dirname, '..', '..', pkg, 'skills', 'status', 'SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    assert.match(skill, /shared config/i);
    assert.match(skill, /state\.mode.*ignore/i);
    assert.match(skill, /24 hours?/i);
    assert.match(skill, /5 minutes?/i);
    assert.match(skill, /last update.*unknown/i);
    assert.match(skill, /optional/i);
    assert.doesNotMatch(skill, /process\.env\.(?:CLAUDE_PLUGIN_ROOT|PLUGIN_ROOT)/);
    assert.match(skill, /`UserPromptSubmit` hook/i);
    assert.match(skill, /canonical status payload/i);
    assert.match(skill, /status line exactly/i);
  }
});

test('static host guidance delegates mode selection to the session hook', () => {
  for (const guide of ['Codex/AGENTS.md', 'Claude/CLAUDE.md']) {
    const content = fs.readFileSync(path.join(__dirname, '..', '..', guide), 'utf8');
    assert.doesNotMatch(content, /Default to UXUCode `standard` mode\./);
    assert.match(content, /session hook selects the configured UXUCode mode/);
  }
});
