const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const codex = require('../Codex/hooks/mode-policy');
const claude = require('../Claude/hooks/mode-policy');

const expectedModes = ['standard', 'lite', 'full', 'ultra', 'off'];

function runCodexHook(script, mode, input = '') {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-mode-policy-'));
  const appData = path.join(tempRoot, 'appdata');
  const workspace = path.join(tempRoot, 'workspace');
  fs.mkdirSync(path.join(appData, 'uxucode'), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(appData, 'uxucode', 'config.json'), JSON.stringify({ mode }));

  try {
    const result = childProcess.spawnSync(process.execPath, [script], {
      cwd: workspace,
      env: { ...process.env, APPDATA: appData },
      input,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runClaudeHook(script, mode, input = '') {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-mode-policy-'));
  const appData = path.join(tempRoot, 'appdata');
  const workspace = path.join(tempRoot, 'workspace');
  fs.mkdirSync(path.join(appData, 'uxucode'), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(appData, 'uxucode', 'config.json'), JSON.stringify({ mode }));

  try {
    const result = childProcess.spawnSync(process.execPath, [script], {
      cwd: workspace,
      env: { ...process.env, APPDATA: appData },
      input,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
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
      const output = runCodexHook(path.join(__dirname, '..', 'Codex', 'hooks', script), mode, input);
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
      const output = runClaudeHook(path.join(__dirname, '..', 'Claude', 'hooks', script), mode, input);
      const context = script === 'uxu-subagent-start.js' ? JSON.parse(output).hookSpecificOutput.additionalContext : output;
      assert.ok(context.includes(claude.policyFor(mode)));
    }
  }
});

test('static host guidance delegates mode selection to the session hook', () => {
  for (const guide of ['Codex/AGENTS.md', 'Claude/CLAUDE.md']) {
    const content = fs.readFileSync(path.join(__dirname, '..', guide), 'utf8');
    assert.doesNotMatch(content, /Default to UXUCode `standard` mode\./);
    assert.match(content, /session hook selects the configured UXUCode mode/);
  }
});
