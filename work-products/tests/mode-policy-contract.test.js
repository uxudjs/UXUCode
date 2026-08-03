const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
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

function runHook(script, mode, input = '', state) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-mode-policy-'));
  const fixture = createHookTestEnvironment(tempRoot);
  const workspace = path.join(tempRoot, 'workspace');
  const configPath = fixture.configPath;
  const statePath = path.join(workspace, '.uxucode-state.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(configPath, JSON.stringify({ mode }));
  if (state) fs.writeFileSync(statePath, JSON.stringify(state));

  try {
    const result = childProcess.spawnSync(process.execPath, [script], {
      cwd: workspace,
      env: fixture.env,
      input,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    return {
      stdout: result.stdout,
      config: JSON.parse(fs.readFileSync(configPath, 'utf8')),
      state: fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
        : null
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runCodexHook(script, mode, input = '') {
  return JSON.parse(runHook(script, mode, input).stdout);
}

function runClaudeHook(script, mode, input = '') {
  return runHook(script, mode, input).stdout;
}

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

test('both status lines preserve state precedence and exact formatting', () => {
  for (const pkg of ['Claude', 'Codex']) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-statusline.js');
    const result = runHook(script, 'lite', '', {
      mode: 'full',
      task: 2,
      total: 3,
      tests: 'passed',
      gate: 'GO'
    });

    assert.equal(result.stdout, '[UXUCODE:FULL] task 2/3 · tests passed · gate GO');
  }
});

test('both mode routes preserve the shared config and state write contract', () => {
  for (const [pkg, prompt] of [
    ['Claude', '/uxu-code:mode ultra'],
    ['Codex', '@mode ultra']
  ]) {
    const script = path.join(__dirname, '..', '..', pkg, 'hooks', 'uxu-prompt-router.js');
    const result = runHook(script, 'standard', JSON.stringify({ prompt }));

    assert.deepEqual(result.config, {
      mode: 'ultra',
      language: 'auto',
      compactReview: true,
      contextCompression: false,
      mcpDescriptionCompression: false
    });
    assert.equal(result.state.mode, 'ultra');
    assert.ok(!Number.isNaN(Date.parse(result.state.updatedAt)));
    assert.match(result.stdout, /UXUCode mode changed to ultra\./);
  }
});

test('static host guidance delegates mode selection to the session hook', () => {
  for (const guide of ['Codex/AGENTS.md', 'Claude/CLAUDE.md']) {
    const content = fs.readFileSync(path.join(__dirname, '..', '..', guide), 'utf8');
    assert.doesNotMatch(content, /Default to UXUCode `standard` mode\./);
    assert.match(content, /session hook selects the configured UXUCode mode/);
  }
});
