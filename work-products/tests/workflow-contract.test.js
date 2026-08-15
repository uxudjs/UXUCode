const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const packages = ['Claude', 'Codex'];
const codexPolicy = require('../../Codex/hooks/mode-policy');
const claudePolicy = require('../../Claude/hooks/mode-policy');

function readSkill(pkg, name) {
  return fs.readFileSync(path.join(root, pkg, 'skills', name, 'SKILL.md'), 'utf8');
}

function runHook(pkg, script, prompt) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-workflow-contract-'));
  const appData = path.join(tempRoot, 'appdata');
  const workspace = path.join(tempRoot, 'workspace');
  fs.mkdirSync(path.join(appData, 'uxucode'), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(
    path.join(appData, 'uxucode', 'config.json'),
    JSON.stringify({ mode: 'off' })
  );

  try {
    const result = childProcess.spawnSync(
      process.execPath,
      [path.join(root, pkg, 'hooks', script)],
      {
        cwd: workspace,
        env: { ...process.env, APPDATA: appData },
        input: prompt ? JSON.stringify({ prompt }) : '',
        encoding: 'utf8'
      }
    );
    assert.equal(result.status, 0, result.stderr);
    if (pkg === 'Claude' && script !== 'uxu-subagent-start.js') return result.stdout;
    if (!result.stdout) return '';
    return JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runLegacyValidatorFixture(relativePath, content) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-legacy-validator-'));
  const scriptDirectory = path.join(tempRoot, 'scripts');
  const expectedHooks = [
    'hook-state.js',
    'hooks.json',
    'mode-policy.js',
    'uxu-prompt-router.js',
    'uxu-session-start.js',
    'uxu-statusline.js',
    'uxu-subagent-start.js'
  ];

  try {
    fs.mkdirSync(scriptDirectory);
    fs.copyFileSync(
      path.join(root, 'scripts', 'validate-no-legacy-commands.js'),
      path.join(scriptDirectory, 'validate-no-legacy-commands.js')
    );
    for (const pkg of packages) {
      const hooksDirectory = path.join(tempRoot, pkg, 'hooks');
      fs.mkdirSync(hooksDirectory, { recursive: true });
      for (const hook of expectedHooks) fs.writeFileSync(path.join(hooksDirectory, hook), '');
    }
    const fixturePath = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, content);

    return childProcess.spawnSync(
      process.execPath,
      [path.join(scriptDirectory, 'validate-no-legacy-commands.js')],
      { encoding: 'utf8' }
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('both hosts route only exact clean invocations and reject aliases or invalid arguments', () => {
  const cases = [
    ['Claude', '/uxu-code:clean', 'arguments ""'],
    ['Claude', '/uxu-code:clean apply', 'arguments "apply"'],
    ['Codex', '@clean', 'arguments ""'],
    ['Codex', '@clean apply', 'arguments "apply"']
  ];
  for (const [pkg, prompt, expected] of cases) {
    const output = runHook(pkg, 'uxu-prompt-router.js', prompt);
    assert.match(output, /"clean" skill/);
    assert.ok(output.includes(expected), `${pkg} ${prompt}: ${output}`);
  }

  for (const [pkg, prompt] of [
    ['Claude', '/uxu-code:organize'],
    ['Claude', '/uxu-code:clean!'],
    ['Claude', '/uxu-code:clean force'],
    ['Codex', '@organize'],
    ['Codex', '@clean!'],
    ['Codex', '@clean force']
  ]) {
    const output = runHook(pkg, 'uxu-prompt-router.js', prompt);
    assert.doesNotMatch(output, /Route this request to the "clean" skill/);
  }
});

test('both clean skills retry only structured sandbox permission failures', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'clean');

    assert.match(skill, /structured subprocess permission error/i);
    assert.match(skill, /sandbox approval/i);
    assert.match(skill, /same arguments/i);
    assert.match(skill, /at most once/i);
    assert.match(skill, /preview must never be upgraded to `apply`/i);
  }
});

test('both clean and help skills describe manifest authorization and report v2', () => {
  for (const pkg of packages) {
    const clean = readSkill(pkg, 'clean');
    const help = readSkill(pkg, 'help');

    assert.match(clean, /only as discovery candidates/i);
    assert.match(clean, /work-products\/clean-migration\.json/);
    assert.match(clean, /preservedProductFiles/);
    assert.match(clean, /unclassifiedLegacyFiles/);
    assert.match(clean, /integrityProtectedFiles/);
    assert.match(clean, /inactiveManifestEntries/);
    assert.match(clean, /`version: 2`/);
    assert.match(clean, /mutable-patch.*only when.*\.patch.*\.diff/i);
    assert.match(clean, /`preserve-content`/);
    assert.match(clean, /`mutable-patch`/);
    assert.match(clean, /checksum-coupled mutable artifacts/);
    assert.match(help, /zero-write report v2 preview/);
    assert.match(help, /Test-like names are discovery only/);
    assert.match(help, /work-products\/clean-migration\.json/);
  }
});

test('optional state and migration artifacts stay silent when absent', () => {
  for (const pkg of packages) {
    const status = readSkill(pkg, 'status');
    const clean = readSkill(pkg, 'clean');

    assert.match(status, /\.uxucode-state\.json.*optional/is);
    assert.match(status, /absence alone.*not.*blocker/is);
    assert.match(status, /do not report.*missing/is);
    assert.match(clean, /clean-migration\.json.*optional/is);
    assert.match(clean, /when.*absent.*no manifest-authorized entries/is);
    assert.match(clean, /do not report.*missing/is);

    const sessionContext = runHook(pkg, 'uxu-session-start.js');
    assert.doesNotMatch(sessionContext, /\.uxucode-state\.json|missing|not found/i);
  }
});

function ignoredPathsInTemporaryRepository(relativePaths) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-gitignore-contract-'));
  const globalExcludes = path.join(tempRoot, 'global-excludes');

  try {
    fs.copyFileSync(path.join(root, '.gitignore'), path.join(tempRoot, '.gitignore'));
    fs.writeFileSync(globalExcludes, '');
    for (const relativePath of relativePaths) {
      const fixturePath = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
      fs.writeFileSync(fixturePath, '');
    }

    const init = childProcess.spawnSync('git', ['init', '--quiet'], {
      cwd: tempRoot,
      encoding: 'utf8'
    });
    assert.equal(init.status, 0, init.stderr);
    fs.writeFileSync(path.join(tempRoot, '.git', 'info', 'exclude'), '');

    return relativePaths.filter((relativePath) => {
      const result = childProcess.spawnSync(
        'git',
        [
          '-c',
          `core.excludesFile=${globalExcludes}`,
          'check-ignore',
          '--no-index',
          '--quiet',
          '--',
          relativePath
        ],
        { cwd: tempRoot, encoding: 'utf8' }
      );
      assert.ok(
        result.status === 0 || result.status === 1,
        result.stderr || `git check-ignore exited with status ${result.status}`
      );
      return result.status === 0;
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('gitignore tracks canonical facts and does not hide unsupported legacy paths', () => {
  const trackable = [
    'SPEC.md',
    'tasks/plan.md',
    'tasks/todo.md',
    'work-products/SPEC.md',
    'work-products/plan.md',
    'work-products/todo.md',
    'work-products/tests/workflow-contract.test.js'
  ];
  const ignored = [
    'work-products/debug/local.md',
    'work-products/reviews/local.md',
    'work-products/ship/local.md',
    'work-products/scratch.md'
  ];

  assert.deepEqual(ignoredPathsInTemporaryRepository([...trackable, ...ignored]), ignored);
});

test('both hosts expose one mode-independent workflow artifact policy', () => {
  assert.equal(codexPolicy.workflowPolicy, claudePolicy.workflowPolicy);
  assert.match(codexPolicy.workflowPolicy, /only under `work-products\/`/);
  assert.match(codexPolicy.workflowPolicy, /including test files/);
  assert.match(codexPolicy.workflowPolicy, /work-products\/tests\//);
  assert.match(codexPolicy.workflowPolicy, /relative paths/i);
  assert.match(codexPolicy.workflowPolicy, /machine-specific absolute paths/i);
});

test('every hook injects the workflow artifact policy even in off mode', () => {
  const hooks = [
    ['uxu-session-start.js'],
    ['uxu-prompt-router.js'],
    ['uxu-subagent-start.js']
  ];

  for (const pkg of packages) {
    const prompt = pkg === 'Claude' ? '/uxu-code:build' : '@build';
    for (const [script] of hooks) {
      assert.ok(runHook(pkg, script, prompt).includes(codexPolicy.workflowPolicy));
    }
  }
});

test('plan accepts a sufficient planning basis instead of always requiring spec', () => {
  for (const pkg of packages) {
    const content = readSkill(pkg, 'plan');
    assert.match(
      content,
      /approved specification, thorough debug evidence, or clear user requirements/
    );
    assert.match(content, /Require `spec` only when/);
    assert.match(content, /work-products\/plan\.md/);
    assert.match(content, /work-products\/todo\.md/);
    assert.doesNotMatch(content, /Require an approved `SPEC\.md`/);
  }
});

test('relevant skills keep every newly created workflow and test file in work-products', () => {
  const expectedPaths = {
    spec: ['work-products/SPEC.md'],
    plan: ['work-products/plan.md', 'work-products/todo.md'],
    build: ['work-products/plan.md', 'work-products/todo.md', 'work-products/tests/'],
    debug: ['work-products/debug/', 'work-products/tests/'],
    test: ['work-products/tests/'],
    review: ['work-products/reviews/'],
    ship: ['work-products/ship/']
  };

  for (const pkg of packages) {
    for (const [skill, paths] of Object.entries(expectedPaths)) {
      const content = readSkill(pkg, skill);
      for (const expectedPath of paths) assert.ok(content.includes(expectedPath));
    }
  }
});

test('test-creating operations require canonical placement and relative paths', () => {
  for (const pkg of packages) {
    for (const skill of ['build', 'debug', 'test']) {
      const content = readSkill(pkg, skill);
      assert.match(content, /work-products\/tests\//);
      assert.match(content, /relative path/i);
      assert.match(content, /machine-specific absolute path/i);
    }

    const tdd = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'test-driven-development', 'SKILL.md'),
      'utf8'
    );
    assert.match(tdd, /work-products\/tests\//);
    assert.match(tdd, /relative path/i);
    assert.match(tdd, /machine-specific absolute path/i);
  }
});

test('the internal router permits direct planning from clear requirements or debug evidence', () => {
  for (const pkg of packages) {
    const content = readSkill(pkg, 'using-uxucode');
    assert.match(content, /clear multi-step request or thorough debug evidence.*`plan`/);
    assert.match(content, /unclear or high-risk feature.*`spec`/);
  }
});

test('loaded planning references use only the new canonical artifact paths', () => {
  const references = [
    'planning-and-task-breakdown/SKILL.md',
    'spec-driven-development/SKILL.md'
  ];

  for (const pkg of packages) {
    for (const reference of references) {
      const content = fs.readFileSync(
        path.join(root, pkg, 'references', 'workflows', reference),
        'utf8'
      );
      assert.match(content, /work-products\/plan\.md/);
      assert.match(content, /work-products\/todo\.md/);
      assert.doesNotMatch(content, /tasks\/(?:plan|todo)\.md/);
      assert.doesNotMatch(content, /`tasks\/` directory/);
    }
  }
});

test('spec contracts keep the canonical specification normally trackable in both hosts', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'spec');
    const reference = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'spec-driven-development', 'SKILL.md'),
      'utf8'
    );

    for (const content of [skill, reference]) {
      assert.match(content, /`work-products\/SPEC\.md`/);
      assert.match(content, /version control|version-controlled/);
      assert.match(content, /normal Git tracking/);
      assert.match(content, /never depend on `git add -f`/);
    }
  }
});

test('legacy validation ignores internal work products but still rejects public legacy entries', () => {
  const legacySourceName = Buffer.from('cG9ueXRhaWw=', 'base64').toString('utf8');
  const internalResult = runLegacyValidatorFixture(
    'work-products/SPEC.md',
    `Research provenance: ${legacySourceName}`
  );
  assert.equal(internalResult.status, 0, internalResult.stderr);

  const publicResult = runLegacyValidatorFixture(
    'docs/guide.md',
    `Public command: @${legacySourceName}`
  );
  assert.equal(publicResult.status, 1);
  assert.match(publicResult.stderr, /docs\/guide\.md: forbidden legacy\/source entry/);
});

test('unified validation covers every repository gate and propagates the first failure', () => {
  const { runSteps, steps } = require('../../scripts/validate-all');
  assert.deepEqual(
    steps.map((step) => step.name),
    [
      'Codex plugin',
      'Claude plugin',
      'command parity',
      'skill parity',
      'guide parity',
      'README scope',
      'legacy commands',
      'third-party notices',
      'workflow contracts',
      'OpenClaw profile',
      'OpenClaw tests',
      'git diff check'
    ]
  );
  assert.deepEqual(
    steps.find((step) => step.name === 'workflow contracts').args,
    [
      '--test',
      'work-products/tests/clean-contract.test.js',
      'work-products/tests/environment-isolation-contract.test.js',
      'work-products/tests/subagent-cross-validation-contract.test.js',
      'work-products/tests/workflow-contract.test.js',
      'work-products/tests/mode-policy-contract.test.js',
      'work-products/tests/documentation-validator-contract.test.js'
    ]
  );
  assert.deepEqual(
    steps.find((step) => step.name === 'OpenClaw tests').args,
    [
      '--test',
      'work-products/tests/OpenClaw/tests/validate-profile.test.js',
      'work-products/tests/OpenClaw/tests/evaluation.test.js'
    ]
  );

  const calls = [];
  const exitCode = runSteps(
    steps.slice(0, 3),
    (command, args) => {
      calls.push([command, ...args].join(' '));
      return { status: calls.length === 2 ? 7 : 0 };
    },
    { log() {}, error() {} }
  );
  assert.equal(exitCode, 7);
  assert.equal(calls.length, 2);
});

test('public guides and README describe optional spec, canonical paths, and tracking boundaries', () => {
  const guides = [
    [
      'USAGE.en.md',
      /\[run spec first when needed\] → plan → build → review → simplify → ship/,
      /formal project facts that can be tracked in version control/,
      /other undeclared process files remain local by default/,
      /repository static validation does not mean the installed plugin cache has reloaded/
    ],
    [
      'USAGE.zh-CN.md',
      /\[需要时先运行 spec\] → plan → build → review → simplify → ship/,
      /可进入版本控制的正式项目事实/,
      /其他未声明过程文件默认只保留在本地/,
      /仓库静态校验通过不代表已安装的插件缓存已经重新加载/
    ],
    [
      'USAGE.zh-TW.md',
      /\[需要時先執行 spec\] → plan → build → review → simplify → ship/,
      /可納入版本控制的正式專案事實/,
      /其他未聲明的過程檔案預設只保留在本機/,
      /儲存庫靜態驗證通過不代表已安裝的外掛快取已重新載入/
    ]
  ];

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const [guide, workflow, tracked, local, cache] of guides) {
    const content = fs.readFileSync(path.join(root, 'docs', guide), 'utf8');
    assert.match(content, workflow);
    assert.doesNotMatch(content, /spec\?/);
    assert.match(content, /work-products\/SPEC\.md/);
    assert.match(content, /work-products\/plan\.md/);
    assert.match(content, /work-products\/todo\.md/);
    assert.match(content, /node scripts\/validate-all\.js/);
    assert.doesNotMatch(content, /tasks\/(?:plan|todo)\.md/);
    for (const contract of [tracked, local, cache]) {
      assert.match(content, contract);
      assert.match(readme, contract);
    }
  }

  for (const pkg of packages) {
    const content = fs.readFileSync(
      path.join(root, pkg, 'references', 'orchestration-patterns.md'),
      'utf8'
    );
    const help = readSkill(pkg, 'help');
    const commandPrefix = pkg === 'Claude' ? '/uxu-code:' : '@';
    assert.doesNotMatch(help, /`spec\?/);
    assert.match(help, /run `spec` when/i);
    assert.doesNotMatch(content, /(?:@|\/uxu-code:)spec\?/);
    assert.ok(content.includes(
      `[run ${commandPrefix}spec when needed] → ${commandPrefix}plan`
    ));
    assert.match(content, /plan.*build.*test.*review.*ship/);
    assert.match(content, /thorough debug evidence, or clear user requirements/);
  }
});

test('testing workflows discover project-native commands and label JS examples accurately', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const tdd = fs.readFileSync(
      path.join(workflowRoot, 'test-driven-development', 'SKILL.md'),
      'utf8'
    );
    assert.match(tdd, /## Discover the Stack First/);
    assert.match(tdd, /Never assume a default like `npm test`/);
    assert.match(tdd, /TypeScript for illustration/);

    const incremental = fs.readFileSync(
      path.join(workflowRoot, 'incremental-implementation', 'SKILL.md'),
      'utf8'
    );
    assert.match(incremental, /repository's test and build commands/);
    assert.match(incremental, /`npm test`, `\.\/gradlew test`, `pytest`/);

    const debugging = fs.readFileSync(
      path.join(workflowRoot, 'debugging-and-error-recovery', 'SKILL.md'),
      'utf8'
    );
    assert.match(debugging, /substitute the repository's own test command/);
    assert.match(debugging, /repository's own commands \(npm shown\)/);

    const planning = fs.readFileSync(
      path.join(workflowRoot, 'planning-and-task-breakdown', 'SKILL.md'),
      'utf8'
    );
    assert.match(planning, /\[the repository's focused-test command\]/);
    assert.match(planning, /\[the repository's build command\]/);

    const patterns = fs.readFileSync(
      path.join(root, pkg, 'references', 'testing-patterns.md'),
      'utf8'
    );
    assert.match(patterns, /Testing Patterns Reference \(JavaScript\/TypeScript\)/);
    assert.match(patterns, /syntax and tooling shown here are JS\/TS-specific/);
  }
});

test('audit and performance guidance stays ecosystem-neutral and evidence-gated', () => {
  for (const pkg of packages) {
    const shipping = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'shipping-and-launch', 'SKILL.md'),
      'utf8'
    );
    assert.match(shipping, /ecosystem's dependency audit \(`npm audit`, `pip-audit`, `cargo audit`, \.\.\.\)/);

    const security = fs.readFileSync(
      path.join(root, pkg, 'references', 'security-checklist.md'),
      'utf8'
    );
    assert.match(security, /ecosystem's dependency audit/);

    const performance = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'performance-optimization', 'SKILL.md'),
      'utf8'
    );
    assert.match(performance, /### Step 4: Verify \(Keep or Revert\)/);
    assert.match(performance, /same command, same conditions/);
    assert.match(performance, /Beat the noise/);
    assert.match(performance, /Within noise or worse.*Revert/s);
    assert.match(performance, /Improved, but a test went red.*Revert/s);
    assert.match(performance, /Log every attempt, including the reverted ones/);
  }

  const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notices, /7829ffd90d973b6325f5f12f1b1226dcace74443/);
  assert.match(notices, /project-native test commands/);
  assert.match(notices, /same-condition performance verification/);
  assert.match(notices, /Excluded from adoption:/);
});

test('release metadata and maintenance workflows enforce the 5.0.10 version contract', () => {
  const expectedVersion = '5.0.10';
  const maintenanceContract =
    /every completed bug fix or optimization must update the release version consistently/;
  const claudeManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'Claude', '.claude-plugin', 'plugin.json'), 'utf8')
  );
  const claudeMarketplace = JSON.parse(
    fs.readFileSync(path.join(root, 'Claude', '.claude-plugin', 'marketplace.json'), 'utf8')
  );
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'Codex', '.codex-plugin', 'plugin.json'), 'utf8')
  );

  assert.equal(claudeManifest.version, expectedVersion);
  assert.equal(claudeMarketplace.plugins[0].version, expectedVersion);
  assert.equal(codexManifest.version, expectedVersion);

  for (const pkg of packages) {
    const validator = fs.readFileSync(
      path.join(root, pkg, 'scripts', 'validate-plugin.js'),
      'utf8'
    );
    assert.match(validator, /expected version 5\.0\.10/);
    for (const skill of ['build', 'debug', 'simplify']) {
      assert.match(readSkill(pkg, skill), maintenanceContract);
    }
  }
});
