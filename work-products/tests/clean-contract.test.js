const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const packages = ['Claude', 'Codex'];
const requiredIgnoreRules = [
  '/work-products/*',
  '!/work-products/SPEC.md',
  '!/work-products/plan.md',
  '!/work-products/todo.md',
  '!/work-products/tests/',
  '!/work-products/tests/**'
];

function enginePath(pkg) {
  return path.join(root, pkg, 'scripts', 'clean-work-products.js');
}

function writeFixture(workspace, relativePath, content) {
  const target = path.join(workspace, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createWorkspace(files) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-clean-contract-'));
  const init = childProcess.spawnSync('git', ['init', '--quiet'], {
    cwd: workspace,
    encoding: 'utf8'
  });
  assert.equal(init.status, 0, init.stderr);
  for (const [relativePath, content] of Object.entries(files)) {
    writeFixture(workspace, relativePath, content);
  }
  return workspace;
}

function workspaceSnapshot(workspace) {
  const entries = [];

  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      if (!prefix && entry.name === '.git') continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        entries.push([relativePath, 'directory']);
        visit(absolutePath, relativePath);
      } else if (entry.isSymbolicLink()) {
        entries.push([relativePath, 'symlink', fs.readlinkSync(absolutePath)]);
      } else {
        entries.push([relativePath, 'file', fs.readFileSync(absolutePath).toString('base64')]);
      }
    }
  }

  visit(workspace);
  return entries;
}

function runEngine(pkg, workspace, args = [], environment = {}) {
  return childProcess.spawnSync(process.execPath, [enginePath(pkg), ...args], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, ...environment }
  });
}

function runPreview(pkg, workspace) {
  const result = runEngine(pkg, workspace);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('preview classifies internal tests repository-wide and writes nothing', () => {
  const reports = [];

  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': '/SPEC.md\n/tasks/\n/custom/\n',
      'SPEC.md': '# Legacy UXUCode specification\n',
      'tasks/plan.md': '# UXUCode implementation plan\n',
      'tasks/todo.md': '# UXUCode task list\n',
      'tests/mode-policy-contract.test.js':
        "// UXUCode work-product\nconst policy = require('../Codex/hooks/mode-policy');\nvoid policy;\n",
      'tests/product.test.js': "require('../src/product');\n",
      'src/product.js': 'module.exports = {};\n'
    });

    try {
      const before = workspaceSnapshot(workspace);
      const report = runPreview(pkg, workspace);
      const after = workspaceSnapshot(workspace);

      assert.deepEqual(after, before);
      assert.equal(report.version, 1);
      assert.equal(report.mode, 'preview');
      assert.equal(report.status, 'READY');
      assert.deepEqual(report.moves, [
        {
          source: 'SPEC.md',
          target: 'work-products/SPEC.md',
          reason: 'legacy-spec-path'
        },
        {
          source: 'tasks/plan.md',
          target: 'work-products/plan.md',
          reason: 'legacy-plan-path'
        },
        {
          source: 'tasks/todo.md',
          target: 'work-products/todo.md',
          reason: 'legacy-todo-path'
        },
        {
          source: 'tests/mode-policy-contract.test.js',
          target: 'work-products/tests/mode-policy-contract.test.js',
          reason: 'internal-test-artifact'
        },
        {
          source: 'tests/product.test.js',
          target: 'work-products/tests/product.test.js',
          reason: 'internal-test-artifact'
        }
      ]);
      assert.deepEqual(report.referenceUpdates, []);
      assert.deepEqual(report.gitignoreChanges, {
        add: requiredIgnoreRules,
        remove: ['/SPEC.md', '/tasks/']
      });
      assert.deepEqual(report.blockers, []);
      assert.deepEqual(report.skipped, []);
      reports.push(report);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }

  assert.deepEqual(reports[1], reports[0]);
});

test('preview returns NO_CHANGES for a compliant workspace without candidates', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'src/product.js': 'module.exports = {};\n',
    'src/dir/consumer.js': "module.exports = require('../dir/../target.js');\n",
    'src/target.js': 'module.exports = {};\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'NO_CHANGES');
    assert.deepEqual(report.moves, []);
    assert.deepEqual(report.referenceUpdates, []);
    assert.deepEqual(report.gitignoreChanges, { add: [], remove: [] });
    assert.deepEqual(report.blockers, []);
    assert.deepEqual(report.skipped, []);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview ignores generated Python bytecode caches', () => {
  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
      'tests/__pycache__/test_product.cpython-312.pyc': Buffer.from([0, 1, 2])
    });

    try {
      const before = workspaceSnapshot(workspace);
      const report = runPreview(pkg, workspace);

      assert.equal(report.status, 'NO_CHANGES');
      assert.deepEqual(report.moves, []);
      assert.deepEqual(report.blockers, []);
      assert.deepEqual(workspaceSnapshot(workspace), before);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test('preview keeps a non-test Python patch helper and rewrites proven repository paths', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'tests/test_lifecycle_reconstruction.py':
      'def test_lifecycle_reconstruction():\n    assert True\n',
    'work/patches/fix_302_test.py':
      'from pathlib import Path\n' +
      'import difflib\n' +
      "block = '''\ndef test_generated_patch_target():\n    assert True\n'''\n" +
      'p = Path("tests/test_lifecycle_reconstruction.py")\n' +
      'old = p.read_text(encoding="utf-8")\n' +
      "patch = ''.join(difflib.unified_diff(\n" +
      "    old.splitlines(True), old.splitlines(True),\n" +
      "    fromfile='a/tests/test_lifecycle_reconstruction.py',\n" +
      "    tofile='b/tests/test_lifecycle_reconstruction.py',\n" +
      '))\n',
    'work/patches/test_lifecycle_reconstruction.py.new':
      'def test_staged_copy():\n    assert True\n',
    'work/patches/lifecycle.patch':
      'diff --git a/tests/test_lifecycle_reconstruction.py ' +
      'b/tests/test_lifecycle_reconstruction.py\n' +
      '--- a/tests/test_lifecycle_reconstruction.py\n' +
      '+++ b/tests/test_lifecycle_reconstruction.py\n'
  });

  try {
    const preview = runPreview('Codex', workspace);

    assert.equal(preview.status, 'READY');
    assert.deepEqual(preview.moves, [
      {
        source: 'tests/test_lifecycle_reconstruction.py',
        target: 'work-products/tests/test_lifecycle_reconstruction.py',
        reason: 'internal-test-artifact'
      }
    ]);
    assert.deepEqual(preview.blockers, []);

    const result = runEngine('Codex', workspace, ['apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'APPLIED');
    assert.equal(
      fs.readFileSync(path.join(workspace, 'work', 'patches', 'fix_302_test.py'), 'utf8'),
      'from pathlib import Path\n' +
      'import difflib\n' +
      "block = '''\ndef test_generated_patch_target():\n    assert True\n'''\n" +
      'p = Path("work-products/tests/test_lifecycle_reconstruction.py")\n' +
      'old = p.read_text(encoding="utf-8")\n' +
      "patch = ''.join(difflib.unified_diff(\n" +
      "    old.splitlines(True), old.splitlines(True),\n" +
      "    fromfile='a/work-products/tests/test_lifecycle_reconstruction.py',\n" +
      "    tofile='b/work-products/tests/test_lifecycle_reconstruction.py',\n" +
      '))\n'
    );
    assert.equal(
      fs.existsSync(path.join(
        workspace,
        'work',
        'patches',
        'test_lifecycle_reconstruction.py.new'
      )),
      true
    );
    assert.equal(
      fs.readFileSync(path.join(workspace, 'work', 'patches', 'lifecycle.patch'), 'utf8'),
      'diff --git a/work-products/tests/test_lifecycle_reconstruction.py ' +
      'b/work-products/tests/test_lifecycle_reconstruction.py\n' +
      '--- a/work-products/tests/test_lifecycle_reconstruction.py\n' +
      '+++ b/work-products/tests/test_lifecycle_reconstruction.py\n'
    );
    assert.equal(runPreview('Codex', workspace).status, 'NO_CHANGES');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply rewrites proven repository-root process paths and their coupled metadata', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'tasks/plan.md': '# Plan\n',
    'tasks/todo.md': '# Todo\n',
    'work/patches/make_checkpoint_a_patch.py':
      'from pathlib import Path\n' +
      'root = Path.cwd()\n' +
      'changes = {}\n' +
      "plan_path = root / 'tasks/plan.md'\n" +
      "changes['tasks/plan.md'] = (plan_path, plan_path)\n" +
      "todo_path = root / 'tasks/todo.md'\n" +
      "changes['tasks/todo.md'] = (todo_path, todo_path)\n"
  });

  try {
    const preview = runPreview('Claude', workspace);

    assert.equal(preview.status, 'READY');
    assert.deepEqual(preview.blockers, []);
    assert.deepEqual(preview.moves.map(({ source, target }) => ({ source, target })), [
      { source: 'tasks/plan.md', target: 'work-products/plan.md' },
      { source: 'tasks/todo.md', target: 'work-products/todo.md' }
    ]);

    const result = runEngine('Claude', workspace, ['apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'APPLIED');
    assert.equal(
      fs.readFileSync(
        path.join(workspace, 'work', 'patches', 'make_checkpoint_a_patch.py'),
        'utf8'
      ),
      'from pathlib import Path\n' +
      'root = Path.cwd()\n' +
      'changes = {}\n' +
      "plan_path = root / 'work-products/plan.md'\n" +
      "changes['work-products/plan.md'] = (plan_path, plan_path)\n" +
      "todo_path = root / 'work-products/todo.md'\n" +
      "changes['work-products/todo.md'] = (todo_path, todo_path)\n"
    );
    assert.equal(runPreview('Claude', workspace).status, 'NO_CHANGES');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview rejects Path-looking examples and unrelated same-value strings', () => {
  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
      'tasks/plan.md': '# Plan\n',
      'docs/example.js':
        "const snippet = 'Path(\"tasks/plan.md\")';\n" +
        '// Path("tasks/plan.md")\n' +
        "const expected = 'tasks/plan.md';\n",
      'work/patches/mixed.py':
        'from pathlib import Path\n' +
        'changes = {}\n' +
        'plan_path = Path("tasks/plan.md")\n' +
        'changes["tasks/plan.md"] = (plan_path, plan_path)\n' +
        'example = "tasks/plan.md"\n'
    });

    try {
      const before = workspaceSnapshot(workspace);
      const report = runPreview(pkg, workspace);

      assert.equal(report.status, 'BLOCKED');
      assert.deepEqual(report.blockers, [
        {
          code: 'AMBIGUOUS_REFERENCE',
          file: 'docs/example.js',
          reference: 'tasks/plan.md',
          target: 'work-products/plan.md'
        },
        {
          code: 'AMBIGUOUS_REFERENCE',
          file: 'work/patches/mixed.py',
          reference: 'tasks/plan.md',
          target: 'work-products/plan.md'
        }
      ]);
      assert.equal(report.referenceUpdates.length, 2);
      assert.equal(
        report.referenceUpdates.every((update) => update.file === 'work/patches/mixed.py'),
        true
      );
      assert.deepEqual(workspaceSnapshot(workspace), before);
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test('preview does not retain every repository text file in the JavaScript heap', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`
  });
  const payload = `${'x'.repeat(1024 * 1024 - 1)}\n`;

  try {
    for (let index = 0; index < 80; index += 1) {
      writeFixture(workspace, `data/chunk-${String(index).padStart(2, '0')}.txt`, payload);
    }
    const result = runEngine(
      'Codex',
      workspace,
      [],
      { NODE_OPTIONS: '--max-old-space-size=64' }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'NO_CHANGES');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('classification reports target conflicts as BLOCKED without modifying either file', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'SPEC.md': '# Misplaced specification\n',
    'work-products/SPEC.md': '# Canonical specification\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Claude', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.blockers, [
      {
        code: 'TARGET_EXISTS',
        source: 'SPEC.md',
        target: 'work-products/SPEC.md'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview blocks multiple sources that map to the same target', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'product.test.js': 'module.exports = "root";\n',
    'tests/product.test.js': 'module.exports = "tests";\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.blockers, [
      {
        code: 'TARGET_COLLISION',
        target: 'work-products/tests/product.test.js',
        sources: ['product.test.js', 'tests/product.test.js']
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview blocks a symbolic-link target parent outside the repository', (context) => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'product.test.js': 'module.exports = {};\n',
    'work-products/.keep': ''
  });
  const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-clean-target-'));
  const linkedTests = path.join(workspace, 'work-products', 'tests');

  try {
    fs.symlinkSync(
      externalDirectory,
      linkedTests,
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      context.skip(`symbolic links are unavailable: ${error.code}`);
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(externalDirectory, { recursive: true, force: true });
      return;
    }
    throw error;
  }

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.blockers, [
      {
        code: 'TARGET_PARENT_SYMLINK',
        path: 'work-products/tests',
        target: 'work-products/tests/product.test.js'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
    assert.deepEqual(fs.readdirSync(externalDirectory), []);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(externalDirectory, { recursive: true, force: true });
  }
});

test('preview blocks a non-directory target ancestor', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'product.test.js': 'module.exports = {};\n',
    'work-products': 'not a directory\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.blockers, [
      {
        code: 'TARGET_PARENT_NOT_DIRECTORY',
        path: 'work-products',
        target: 'work-products/tests/product.test.js'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview skips nested dependency and version-control directories', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'packages/app/src/product.test.js': 'module.exports = "internal";\n',
    'packages/app/node_modules/dependency/library.test.js': 'module.exports = "dependency";\n',
    'packages/app/.git/hooks/hook.test.js': 'module.exports = "metadata";\n'
  });

  try {
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'READY');
    assert.deepEqual(report.moves, [
      {
        source: 'packages/app/src/product.test.js',
        target: 'work-products/tests/packages/app/src/product.test.js',
        reason: 'internal-test-artifact'
      }
    ]);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview recognizes supported cross-language test names', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'frontend/component.test.ts': 'export {};\n',
    'frontend/view.spec.tsx': 'export {};\n',
    'python/test_worker.py': 'pass\n',
    'python/worker_test.py': 'def test_worker():\n    assert True\n',
    'go/worker_test.go': 'package worker\n',
    'fixtures/api.test.json': '{}\n',
    'agents/test-reviewer.md': '# Review agent\n',
    'agents/unit-test-reviewer.md': '# Unit test review agent\n'
  });

  try {
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'READY');
    assert.deepEqual(report.moves.map(({ source, target }) => ({ source, target })), [
      {
        source: 'fixtures/api.test.json',
        target: 'work-products/tests/fixtures/api.test.json'
      },
      {
        source: 'frontend/component.test.ts',
        target: 'work-products/tests/frontend/component.test.ts'
      },
      {
        source: 'frontend/view.spec.tsx',
        target: 'work-products/tests/frontend/view.spec.tsx'
      },
      {
        source: 'go/worker_test.go',
        target: 'work-products/tests/go/worker_test.go'
      },
      {
        source: 'python/test_worker.py',
        target: 'work-products/tests/python/test_worker.py'
      },
      {
        source: 'python/worker_test.py',
        target: 'work-products/tests/python/worker_test.py'
      }
    ]);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview blocks ambiguous bare strings that match a moved test source', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'frontend.test.js': 'module.exports = {};\n',
    'work-products/tests/fixture-contract.test.js':
      "const expectedFileName = 'frontend.test.js';\n" +
      "const moduleName = require('frontend.test.js');\n" +
      "void expectedFileName;\nvoid moduleName;\n"
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.referenceUpdates, []);
    assert.deepEqual(report.blockers, [
      {
        code: 'AMBIGUOUS_REFERENCE',
        file: 'work-products/tests/fixture-contract.test.js',
        reference: 'frontend.test.js',
        target: 'work-products/tests/frontend.test.js'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview blocks ambiguous bare strings that match a moved process source', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'SPEC.md': '# Legacy specification\n',
    'docs/reference.md': "Canonical source: 'SPEC.md'\n"
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.referenceUpdates, []);
    assert.deepEqual(report.blockers, [
      {
        code: 'AMBIGUOUS_REFERENCE',
        file: 'docs/reference.md',
        reference: 'SPEC.md',
        target: 'work-products/SPEC.md'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('preview does not follow symbolic links into possible test artifacts', (context) => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`
  });
  const externalDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-clean-external-'));
  writeFixture(
    externalDirectory,
    'mode-policy-contract.test.js',
    "require('../Codex/hooks/mode-policy');\n"
  );
  const testsDirectory = path.join(workspace, 'tests');
  const linkedDirectory = path.join(testsDirectory, 'linked-contracts');
  fs.mkdirSync(testsDirectory);

  try {
    fs.symlinkSync(
      externalDirectory,
      linkedDirectory,
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      context.skip(`symbolic links are unavailable: ${error.code}`);
      fs.rmSync(workspace, { recursive: true, force: true });
      fs.rmSync(externalDirectory, { recursive: true, force: true });
      return;
    }
    throw error;
  }

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'NO_CHANGES');
    assert.deepEqual(report.moves, []);
    assert.deepEqual(report.skipped, [
      {
        path: 'tests/linked-contracts',
        reason: 'symbolic-link'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(externalDirectory, { recursive: true, force: true });
  }
});

test('classification keeps both host preview engines byte-identical', () => {
  assert.deepEqual(
    fs.readFileSync(enginePath('Claude')),
    fs.readFileSync(enginePath('Codex'))
  );
});

test('classification treats project-native test files as internal artifacts', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'Codex/hooks/mode-policy.js': 'module.exports = {};\n',
    'tests/product-native.test.js':
      "require('../Codex/hooks/mode-policy.js');\n"
  });

  try {
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'READY');
    assert.deepEqual(report.moves, [
      {
        source: 'tests/product-native.test.js',
        target: 'work-products/tests/product-native.test.js',
        reason: 'internal-test-artifact'
      }
    ]);
    assert.deepEqual(report.skipped, []);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply gathers internal tests repository-wide and relativizes project-local paths', () => {
  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
      'Codex/hooks/mode-policy.js': 'module.exports = {};\n',
      'admin/index.html': '<main></main>\n',
      'frontend-performance.test.mjs': "import './admin/index.html';\n",
      'scripts/run-tests.js':
        "const testFile = '../frontend-performance.test.mjs';\nvoid testFile;\n",
      'work-products/tests/existing-contract.test.js':
        "// UXUCode work-product\nrequire('../../Codex/hooks/mode-policy.js');\n"
    });
    const absolutePolicyPath = path.join(workspace, 'Codex', 'hooks', 'mode-policy.js')
      .split(path.sep)
      .join('/');
    writeFixture(
      workspace,
      'mode-policy-contract.test.mjs',
      `// UXUCode work-product\nrequire('${absolutePolicyPath}');\n`
    );
    writeFixture(
      workspace,
      'quality/nested-contract.spec.cjs',
      "// UXUCode work-product\nrequire('../Codex/hooks/mode-policy.js');\n"
    );

    try {
      const preview = runPreview(pkg, workspace);

      assert.equal(preview.status, 'READY');
      assert.deepEqual(preview.moves, [
        {
          source: 'frontend-performance.test.mjs',
          target: 'work-products/tests/frontend-performance.test.mjs',
          reason: 'internal-test-artifact'
        },
        {
          source: 'mode-policy-contract.test.mjs',
          target: 'work-products/tests/mode-policy-contract.test.mjs',
          reason: 'internal-test-artifact'
        },
        {
          source: 'quality/nested-contract.spec.cjs',
          target: 'work-products/tests/quality/nested-contract.spec.cjs',
          reason: 'internal-test-artifact'
        }
      ]);
      assert.deepEqual(preview.referenceUpdates, [
        {
          file: 'scripts/run-tests.js',
          from: '../frontend-performance.test.mjs',
          to: '../work-products/tests/frontend-performance.test.mjs',
          count: 1
        },
        {
          file: 'work-products/tests/frontend-performance.test.mjs',
          from: './admin/index.html',
          to: '../../admin/index.html',
          count: 1
        },
        {
          file: 'work-products/tests/mode-policy-contract.test.mjs',
          from: absolutePolicyPath,
          to: '../../Codex/hooks/mode-policy.js',
          count: 1
        },
        {
          file: 'work-products/tests/quality/nested-contract.spec.cjs',
          from: '../Codex/hooks/mode-policy.js',
          to: '../../../Codex/hooks/mode-policy.js',
          count: 1
        }
      ]);
      assert.deepEqual(preview.skipped, []);

      const result = runEngine(pkg, workspace, ['apply']);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).status, 'APPLIED');
      assert.equal(
        fs.readFileSync(
          path.join(workspace, 'work-products', 'tests', 'mode-policy-contract.test.mjs'),
          'utf8'
        ),
        "// UXUCode work-product\nrequire('../../Codex/hooks/mode-policy.js');\n"
      );
      assert.equal(
        fs.readFileSync(
          path.join(
            workspace,
            'work-products',
            'tests',
            'quality',
            'nested-contract.spec.cjs'
          ),
          'utf8'
        ),
        "// UXUCode work-product\nrequire('../../../Codex/hooks/mode-policy.js');\n"
      );
      assert.equal(
        fs.readFileSync(
          path.join(workspace, 'work-products', 'tests', 'frontend-performance.test.mjs'),
          'utf8'
        ),
        "import '../../admin/index.html';\n"
      );
      assert.equal(
        fs.readFileSync(path.join(workspace, 'scripts', 'run-tests.js'), 'utf8'),
        "const testFile = '../work-products/tests/frontend-performance.test.mjs';\n" +
        'void testFile;\n'
      );
      assert.equal(fs.existsSync(path.join(workspace, 'frontend-performance.test.mjs')), false);
      assert.equal(
        fs.existsSync(
          path.join(workspace, 'work-products', 'tests', 'existing-contract.test.js')
        ),
        true
      );
      assert.equal(runPreview(pkg, workspace).status, 'NO_CHANGES');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test('apply moves evidenced artifacts and rewrites only resolvable references', () => {
  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
      'SPEC.md': '# Specification\n\n[Plan](tasks/plan.md)\n',
      'tasks/plan.md':
        '# Plan\n\n[Spec](../SPEC.md)\n[Source](../src/product.js)\n' +
        '[Encoded](../src/My%20File.js)\n[Angle](<../src/My File.js>)\n',
      'tasks/todo.md': '# Tasks\n\n[Plan](plan.md)\n',
      'tests/mode-policy-contract.test.js':
        "// UXUCode work-product\nconst policy = require('../Codex/hooks/mode-policy.js');\nvoid policy;\n",
      'Codex/hooks/mode-policy.js': 'module.exports = {};\n',
      'README.md':
        '[Specification](SPEC.md "approved") and [Plan](<tasks/plan.md>).\n' +
        'Examples: SPEC.md and tasks/plan.md.\n',
      'scripts/legacy-map.js':
        "const legacyFiles = [['../SPEC.md', '../work-products/SPEC.md']];\n",
      'src/product.js': 'module.exports = {};\n',
      'src/My File.js': 'module.exports = {};\n'
    });

    try {
      const result = runEngine(pkg, workspace, ['apply']);
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);

      assert.equal(report.status, 'APPLIED');
      assert.equal(fs.existsSync(path.join(workspace, 'SPEC.md')), false);
      assert.equal(fs.existsSync(path.join(workspace, 'tasks', 'plan.md')), false);
      assert.equal(fs.existsSync(path.join(workspace, 'tasks', 'todo.md')), false);
      assert.equal(
        fs.existsSync(path.join(workspace, 'tests', 'mode-policy-contract.test.js')),
        false
      );
      assert.equal(
        fs.readFileSync(path.join(workspace, 'work-products', 'SPEC.md'), 'utf8'),
        '# Specification\n\n[Plan](plan.md)\n'
      );
      assert.equal(
        fs.readFileSync(path.join(workspace, 'work-products', 'plan.md'), 'utf8'),
        '# Plan\n\n[Spec](SPEC.md)\n[Source](../src/product.js)\n' +
        '[Encoded](../src/My%20File.js)\n[Angle](<../src/My File.js>)\n'
      );
      assert.equal(
        fs.readFileSync(path.join(workspace, 'work-products', 'todo.md'), 'utf8'),
        '# Tasks\n\n[Plan](plan.md)\n'
      );
      assert.equal(
        fs.readFileSync(
          path.join(workspace, 'work-products', 'tests', 'mode-policy-contract.test.js'),
          'utf8'
        ),
        "// UXUCode work-product\nconst policy = require('../../Codex/hooks/mode-policy.js');\nvoid policy;\n"
      );
      assert.equal(
        fs.readFileSync(path.join(workspace, 'README.md'), 'utf8'),
        '[Specification](work-products/SPEC.md "approved") and ' +
        '[Plan](<work-products/plan.md>).\n' +
        'Examples: SPEC.md and tasks/plan.md.\n'
      );
      assert.equal(fs.readFileSync(path.join(workspace, 'src', 'product.js'), 'utf8'),
        'module.exports = {};\n');
      assert.equal(
        fs.readFileSync(path.join(workspace, 'scripts', 'legacy-map.js'), 'utf8'),
        "const legacyFiles = [['../work-products/SPEC.md', '../work-products/SPEC.md']];\n"
      );
      assert.equal(runPreview(pkg, workspace).status, 'NO_CHANGES');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test('preview blocks a non-text candidate instead of failing or moving it', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'SPEC.md': Buffer.from([0xff, 0xfe, 0x00])
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.moves, []);
    assert.deepEqual(report.blockers, [
      {
        code: 'CANDIDATE_UNREADABLE',
        path: 'SPEC.md',
        reason: 'not-utf8-text'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply leaves a BLOCKED workspace byte-identical', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'SPEC.md': '# Misplaced specification\n',
    'work-products/SPEC.md': '# Canonical specification\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const result = runEngine('Codex', workspace, ['apply']);

    assert.notEqual(result.status, 0);
    assert.equal(JSON.parse(result.stdout).status, 'BLOCKED');
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply rolls back moves and text changes after an injected failure', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`,
    'SPEC.md': '# Specification\n',
    'tasks/plan.md': '# Plan\n\n[Spec](../SPEC.md)\n',
    'README.md': 'See tasks/plan.md.\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const engine = require(enginePath('Claude'));

    assert.throws(
      () => engine.applyWorkspace(workspace, {
        afterOperation(operationCount) {
          if (operationCount === 2) throw new Error('injected failure');
        }
      }),
      /injected failure/
    );
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply synchronizes only UXUCode gitignore rules and remains idempotent', () => {
  for (const pkg of packages) {
    const workspace = createWorkspace({
      '.gitignore': '# custom rule\r\n/dist/\r\n/SPEC.md\r\n/tasks/\r\n'
    });

    try {
      const before = fs.readFileSync(path.join(workspace, '.gitignore'));
      const preview = runPreview(pkg, workspace);
      assert.deepEqual(preview.gitignoreChanges, {
        add: requiredIgnoreRules,
        remove: ['/SPEC.md', '/tasks/']
      });
      assert.deepEqual(fs.readFileSync(path.join(workspace, '.gitignore')), before);

      const result = runEngine(pkg, workspace, ['apply']);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).status, 'APPLIED');
      assert.equal(
        fs.readFileSync(path.join(workspace, '.gitignore'), 'utf8'),
        `# custom rule\r\n/dist/\r\n${requiredIgnoreRules.join('\r\n')}\r\n`
      );
      const isolatedGlobalConfig = path.join(workspace, '.git', 'isolated-global-config');
      fs.writeFileSync(isolatedGlobalConfig, '');
      for (const [probe, expectedStatus] of [
        ['work-products/SPEC.md', 1],
        ['work-products/plan.md', 1],
        ['work-products/todo.md', 1],
        ['work-products/tests/contract.test.js', 1],
        ['work-products/debug/local.md', 0]
      ]) {
        const semanticCheck = childProcess.spawnSync(
          'git',
          ['check-ignore', '--no-index', probe],
          {
            cwd: workspace,
            encoding: 'utf8',
            env: {
              ...process.env,
              GIT_CONFIG_GLOBAL: isolatedGlobalConfig,
              GIT_CONFIG_NOSYSTEM: '1'
            }
          }
        );
        assert.equal(semanticCheck.status, expectedStatus, `${probe}: ${semanticCheck.stderr}`);
      }
      assert.equal(runPreview(pkg, workspace).status, 'NO_CHANGES');
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }
});

test('preview blocks gitignore rules whose effective semantics hide canonical facts', () => {
  const workspace = createWorkspace({
    '.gitignore':
      `${requiredIgnoreRules.join('\n')}\n` +
      '/work-products/SPEC.md\n'
  });

  try {
    const before = workspaceSnapshot(workspace);
    const report = runPreview('Codex', workspace);

    assert.equal(report.status, 'BLOCKED');
    assert.deepEqual(report.gitignoreChanges, { add: [], remove: [] });
    assert.deepEqual(report.blockers, [
      {
        code: 'GITIGNORE_SEMANTIC_CONFLICT',
        path: 'work-products/SPEC.md',
        expected: 'tracked'
      }
    ]);
    assert.deepEqual(workspaceSnapshot(workspace), before);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('apply creates a missing gitignore with only canonical UXUCode rules', () => {
  const workspace = createWorkspace({});

  try {
    const result = runEngine('Codex', workspace, ['apply']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'APPLIED');
    assert.equal(
      fs.readFileSync(path.join(workspace, '.gitignore'), 'utf8'),
      `${requiredIgnoreRules.join('\n')}\n`
    );
    assert.equal(runPreview('Codex', workspace).status, 'NO_CHANGES');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('external Git excludes are reported but never modified', () => {
  const workspace = createWorkspace({
    '.gitignore': `${requiredIgnoreRules.join('\n')}\n`
  });
  const globalIgnore = path.join(workspace, '.git', 'global-ignore');
  const globalConfig = path.join(workspace, '.git', 'global-config');
  const infoExclude = path.join(workspace, '.git', 'info', 'exclude');
  fs.writeFileSync(globalIgnore, '/work-products/SPEC.md\n');
  fs.writeFileSync(
    globalConfig,
    `[core]\n\texcludesFile = ${globalIgnore.replace(/\\/g, '/')}\n`
  );
  fs.writeFileSync(infoExclude, '/work-products/plan.md\n');
  const environment = {
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: '1'
  };

  try {
    const globalBefore = fs.readFileSync(globalIgnore);
    const infoBefore = fs.readFileSync(infoExclude);
    const preview = runEngine('Codex', workspace, [], environment);
    assert.equal(preview.status, 0, preview.stderr);
    const report = JSON.parse(preview.stdout);

    assert.deepEqual(
      report.externalIgnoreSources.map(({ scope, path: affectedPath }) => ({
        scope,
        path: affectedPath
      })),
      [
        { scope: 'global', path: 'work-products/SPEC.md' },
        { scope: 'repository', path: 'work-products/plan.md' }
      ]
    );

    const applied = runEngine('Codex', workspace, ['apply'], environment);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).status, 'NO_CHANGES');
    assert.deepEqual(fs.readFileSync(globalIgnore), globalBefore);
    assert.deepEqual(fs.readFileSync(infoExclude), infoBefore);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('unified validation registers the clean contract suite', () => {
  const { steps } = require('../../scripts/validate-all.js');
  const contractStep = steps.find((step) => step.name === 'workflow contracts');

  assert.ok(contractStep);
  assert.ok(contractStep.args.includes('work-products/tests/clean-contract.test.js'));
});
