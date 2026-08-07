const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const packages = ['Claude', 'Codex'];
const expectedModes = ['standard', 'lite', 'full', 'ultra', 'off'];
const claudePolicy = require('../../Claude/hooks/mode-policy');
const codexPolicy = require('../../Codex/hooks/mode-policy');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function runHook(pkg, script, mode, prompt = '') {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-environment-policy-'));
  const appData = path.join(tempRoot, 'appdata');
  const home = path.join(tempRoot, 'home');
  const workspace = path.join(tempRoot, 'workspace');
  const configPath = path.join(appData, 'uxucode', 'config.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(configPath, JSON.stringify({ mode }));

  try {
    const result = childProcess.spawnSync(
      process.execPath,
      [path.join(root, pkg, 'hooks', script)],
      {
        cwd: workspace,
        env: { ...process.env, APPDATA: appData, HOME: home, USERPROFILE: home },
        input: prompt ? JSON.stringify({ prompt }) : '',
        encoding: 'utf8'
      }
    );
    assert.equal(result.status, 0, result.stderr);
    if (pkg === 'Claude' && script !== 'uxu-subagent-start.js') return result.stdout;
    return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('Claude/Codex core policy is equivalent and injected by every hook in every mode', () => {
  assert.equal(codexPolicy.environmentPolicy, claudePolicy.environmentPolicy);
  assert.equal(typeof codexPolicy.environmentPolicy, 'string');
  assert.match(codexPolicy.environmentPolicy, /project.*environment/i);
  assert.match(codexPolicy.environmentPolicy, /\.venv\//);
  assert.match(codexPolicy.environmentPolicy, /global.*fallback/i);
  assert.match(codexPolicy.environmentPolicy, /explicit authorization/i);
  assert.match(codexPolicy.environmentPolicy, /environment change outside the repository/i);
  assert.doesNotMatch(codexPolicy.environmentPolicy, /Any change outside the repository/i);
  assert.ok(codexPolicy.workflowPolicy.includes(codexPolicy.environmentPolicy));

  for (const pkg of packages) {
    const implementationPolicy = read(`${pkg}/skills/implementation-policy/SKILL.md`);
    for (const pattern of [
      /project instructions|project contract/i,
      /\.venv\//,
      /exact.*interpreter/i,
      /read-only request/i,
      /environment change outside.*repository.*explicit authorization/i,
      /build, fix, test, or setup request may authorize.*repository-local environment change/i,
      /stop.*global|global.*stop/i
    ]) assert.match(implementationPolicy, pattern);

    const prompt = pkg === 'Claude' ? '/uxu-code:build' : '@build';
    for (const mode of expectedModes) {
      for (const script of ['uxu-session-start.js', 'uxu-prompt-router.js', 'uxu-subagent-start.js']) {
        assert.ok(runHook(pkg, script, mode, prompt).includes(codexPolicy.environmentPolicy));
      }
    }
  }
});

test('host rules preserve the same environment boundary', () => {
  for (const relativePath of ['Claude/CLAUDE.md', 'Codex/AGENTS.md']) {
    const content = read(relativePath);
    for (const pattern of [
      /项目指令|專案指令|project instructions|project contract/i,
      /项目.*环境|專案.*環境|project.*environment/i,
      /\.venv\//,
      /只读请求|唯讀請求|read-only request/i,
      /environment change outside.*repository.*explicit authorization/i,
      /build, fix, test, or setup request may authorize.*repository-local environment change/i,
      /停止|stop/i
    ]) assert.match(content, pattern, `${relativePath}: ${pattern}`);
    assert.doesNotMatch(content, /Any change outside the repository/i);
  }

  const rootRules = read('AGENTS.md');
  assert.match(rootRules, /仓库外环境修改.*明确授权/);
  assert.match(rootRules, /构建、修复、测试或配置.*项目内环境/);
  assert.doesNotMatch(rootRules, /任何仓库外修改/);
});

test('OpenClaw profile and validator enforce environment isolation', () => {
  const profile = read('OpenClaw/AGENTS.fragment.md');
  const { validateProfile } = require('../../OpenClaw/scripts/validate-profile');
  assert.match(profile, /## Environment isolation/);
  for (const pattern of [
    /project.*environment/i,
    /uv.*Poetry.*Pipenv.*Conda.*Dev Container/is,
    /\.venv\//,
    /exact.*interpreter/i,
    /read-only request/i,
    /environment change outside.*repository.*explicit authorization/i,
    /build, fix, test, or setup requests may create.*repository-local environment/i,
    /exact command/i,
    /rollback/i,
    /stop/i
  ]) assert.match(profile, pattern);
  assert.deepEqual(validateProfile(profile), []);

  for (const mutation of [
    (value) => value.replace('## Environment isolation', '## Environment'),
    (value) => value.replace(/explicit authorization/i, 'permission'),
    (value) => value.replace(/rollback/i, 'recovery')
  ]) {
    assert.ok(validateProfile(mutation(profile)).some((failure) => /environment/i.test(failure)));
  }
});

test('documentation states the aligned environment boundary', () => {
  const documents = [
    'README.md',
    'docs/USAGE.zh-CN.md',
    'docs/USAGE.zh-TW.md',
    'docs/USAGE.en.md',
    'OpenClaw/README.md'
  ];
  const localizedPatterns = [
    /项目环境|專案環境|project environment/i,
    /\.venv\//,
    /明确授权|明確授權|explicit authorization/i,
    /仓库外环境|儲存庫外環境|environment change outside/i,
    /只读|唯讀|read-only/i,
    /系统级沙箱|系統級沙箱|operating-system sandbox/i
  ];
  for (const relativePath of documents) {
    const content = read(relativePath);
    for (const pattern of localizedPatterns) assert.match(content, pattern, `${relativePath}: ${pattern}`);
  }
});

test('unified gate includes the environment isolation contract', () => {
  const { steps } = require('../../scripts/validate-all');
  const workflowStep = steps.find((step) => step.name === 'workflow contracts');
  assert.ok(workflowStep);
  assert.ok(workflowStep.args.includes('work-products/tests/environment-isolation-contract.test.js'));
});
