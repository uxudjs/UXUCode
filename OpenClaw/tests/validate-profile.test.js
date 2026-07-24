const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  BEGIN_MARKER,
  END_MARKER,
  validatePackage,
  validateProfile
} = require('../scripts/validate-profile');
const {
  installProfile,
  parseArgs,
  renderProfile
} = require('../scripts/install-profile');

const root = path.resolve(__dirname, '..');
const fragmentPath = path.join(root, 'AGENTS.fragment.md');

function canonicalFragment() {
  return fs.readFileSync(fragmentPath, 'utf8');
}

function expectFailure(content, expectedMessage) {
  const failures = validateProfile(content);
  assert.ok(
    failures.some((failure) => failure.includes(expectedMessage)),
    `Expected ${JSON.stringify(failures)} to include ${JSON.stringify(expectedMessage)}`
  );
}

test('profile: canonical fragment satisfies the OpenClaw contract', () => {
  assert.deepEqual(validatePackage(root), []);
});

test('profile: rejects missing, duplicate, nested, and incomplete markers', () => {
  const fragment = canonicalFragment();

  expectFailure(fragment.replace(BEGIN_MARKER, ''), 'exactly one begin marker');
  expectFailure(`${BEGIN_MARKER}\n${fragment}`, 'exactly one begin marker');
  expectFailure(fragment.replace('\n\n', `\n${BEGIN_MARKER}\n\n`), 'nested managed markers');
  expectFailure(fragment.replace(END_MARKER, ''), 'exactly one end marker');
});

test('profile: rejects invalid or multiple mode declarations', () => {
  const fragment = canonicalFragment();

  expectFailure(fragment.replace('standard -->', 'turbo -->'), 'invalid mode');
  expectFailure(
    fragment.replace('<!-- UXUCODE:MODE standard -->', '<!-- UXUCODE:MODE standard -->\n<!-- UXUCODE:MODE ultra -->'),
    'exactly one mode declaration'
  );
});

test('profile: rejects shared configuration references', () => {
  expectFailure(
    `${canonicalFragment()}\nUse %APPDATA%\\uxucode\\config.json.`,
    'forbidden shared configuration'
  );
});

test('profile: requires complete SOUL.md and IDENTITY.md workspace templates', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-openclaw-templates-'));
  try {
    fs.writeFileSync(path.join(temporaryRoot, 'AGENTS.fragment.md'), canonicalFragment());
    fs.mkdirSync(path.join(temporaryRoot, 'templates'));
    fs.writeFileSync(path.join(temporaryRoot, 'templates', 'SOUL.md'), '# SOUL.md\n');
    fs.writeFileSync(path.join(temporaryRoot, 'templates', 'IDENTITY.md'), '# IDENTITY.md\n');

    const failures = validatePackage(temporaryRoot);
    assert.ok(failures.some((failure) => failure.includes('SOUL.md is missing required value')));
    assert.ok(failures.some((failure) => failure.includes('IDENTITY.md is missing required value')));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('profile: rejects plugin, hook, and skill scaffolding', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-openclaw-profile-'));
  try {
    fs.writeFileSync(path.join(temporaryRoot, 'AGENTS.fragment.md'), canonicalFragment());
    fs.mkdirSync(path.join(temporaryRoot, 'hooks'));
    fs.writeFileSync(path.join(temporaryRoot, 'plugin.json'), '{}');
    fs.mkdirSync(path.join(temporaryRoot, 'skills'));

    const failures = validatePackage(temporaryRoot);
    assert.ok(failures.some((failure) => failure.includes('plugin scaffolding')));
    assert.ok(failures.some((failure) => failure.includes('hook scaffolding')));
    assert.ok(failures.some((failure) => failure.includes('skill scaffolding')));
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

function withWorkspace(run) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-openclaw-installer-'));
  try {
    return run(workspace);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

function backupNames(workspace) {
  return fs.readdirSync(workspace).filter((name) => name.startsWith('AGENTS.md.uxucode-backup-'));
}

test('installer: creates AGENTS.md with standard mode by default', () => {
  withWorkspace((workspace) => {
    const result = installProfile({ workspace });
    const content = fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf8');

    assert.equal(result.action, 'created');
    assert.match(content, /<!-- UXUCODE:MODE standard -->/);
    assert.deepEqual(backupNames(workspace), []);
  });
});

test('installer: supports all five modes without shared state', () => {
  for (const mode of ['standard', 'lite', 'full', 'ultra', 'off']) {
    withWorkspace((workspace) => {
      installProfile({ workspace, mode });
      const content = fs.readFileSync(path.join(workspace, 'AGENTS.md'), 'utf8');
      assert.match(content, new RegExp(`<!-- UXUCODE:MODE ${mode} -->`));
    });
  }
});

test('installer: merges into existing CRLF content without changing existing bytes', () => {
  withWorkspace((workspace) => {
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const original = Buffer.from('# Existing rules\r\n\r\nKeep this exact.\r\n', 'utf8');
    fs.writeFileSync(agentsPath, original);

    const result = installProfile({ workspace, mode: 'lite' });
    const installed = fs.readFileSync(agentsPath);

    assert.equal(result.action, 'merged');
    assert.ok(installed.subarray(0, original.length).equals(original));
    assert.match(installed.toString('utf8'), /<!-- UXUCODE:MODE lite -->/);
    assert.ok(!/(?<!\r)\n/.test(installed.toString('utf8')));
    assert.deepEqual(backupNames(workspace), []);
  });
});

test('installer: updates only the managed block and verifies a timestamped backup', () => {
  withWorkspace((workspace) => {
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const prefix = Buffer.from('# Before\r\n\r\n', 'utf8');
    const suffix = Buffer.from('\r\n\r\n# After\r\nDo not change.\r\n', 'utf8');
    const original = Buffer.concat([
      prefix,
      Buffer.from(renderProfile(canonicalFragment(), 'standard', '\r\n'), 'utf8'),
      suffix
    ]);
    fs.writeFileSync(agentsPath, original);

    const result = installProfile({ workspace, mode: 'ultra' });
    const updated = fs.readFileSync(agentsPath);
    const backups = backupNames(workspace);

    assert.equal(result.action, 'updated');
    assert.equal(backups.length, 1);
    assert.ok(fs.readFileSync(path.join(workspace, backups[0])).equals(original));
    assert.ok(updated.subarray(0, prefix.length).equals(prefix));
    assert.ok(updated.subarray(updated.length - suffix.length).equals(suffix));
    assert.match(updated.toString('utf8'), /<!-- UXUCODE:MODE ultra -->/);
  });
});

test('installer: identical reinstall is idempotent and creates no backup', () => {
  withWorkspace((workspace) => {
    installProfile({ workspace, mode: 'full' });
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const before = fs.readFileSync(agentsPath);

    const result = installProfile({ workspace, mode: 'full' });

    assert.equal(result.action, 'unchanged');
    assert.ok(fs.readFileSync(agentsPath).equals(before));
    assert.deepEqual(backupNames(workspace), []);
  });
});

test('installer: dry-run reports intent without writing', () => {
  withWorkspace((workspace) => {
    const messages = [];
    const result = installProfile({ workspace, mode: 'standard', dryRun: true }, {
      log: (message) => messages.push(message)
    });

    assert.equal(result.action, 'would-create');
    assert.equal(fs.existsSync(path.join(workspace, 'AGENTS.md')), false);
    assert.match(messages.join('\n'), /would create/i);
  });
});

test('installer: update dry-run creates neither a write nor a backup', () => {
  withWorkspace((workspace) => {
    installProfile({ workspace, mode: 'standard' });
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const before = fs.readFileSync(agentsPath);
    const result = installProfile({ workspace, mode: 'ultra', dryRun: true }, { log: () => {} });

    assert.equal(result.action, 'would-update');
    assert.ok(fs.readFileSync(agentsPath).equals(before));
    assert.deepEqual(backupNames(workspace), []);
  });
});

test('installer: rejects invalid paths, modes, arguments, and malformed markers without writing', () => {
  assert.throws(() => installProfile({ workspace: 'relative/path' }), /absolute/);
  assert.throws(() => installProfile({ workspace: path.join(os.tmpdir(), 'missing-uxucode-workspace') }), /exist/);
  assert.throws(() => parseArgs(['--workspace', 'C:\\tmp', '--mode', 'turbo']), /invalid mode/);
  assert.throws(() => parseArgs(['--workspace', 'C:\\tmp', '--workspace', 'C:\\other']), /duplicate --workspace/);
  assert.throws(() => parseArgs(['--workspace', 'C:\\tmp', '--dry-run', '--dry-run']), /duplicate --dry-run/);

  for (const malformedText of [
    `# Existing\n${BEGIN_MARKER}\nmissing end\n`,
    `${BEGIN_MARKER}\n${BEGIN_MARKER}\n${END_MARKER}\n`,
    `${END_MARKER}\n${BEGIN_MARKER}\n`,
    `${BEGIN_MARKER}\n<!-- UXUCODE:MODE standard -->\n<!-- UXUCODE:MODE ultra -->\n${END_MARKER}\n`
  ]) {
    withWorkspace((workspace) => {
      const agentsPath = path.join(workspace, 'AGENTS.md');
      const malformed = Buffer.from(malformedText, 'utf8');
      fs.writeFileSync(agentsPath, malformed);

      assert.throws(() => installProfile({ workspace }), /malformed managed markers|invalid mode declaration/);
      assert.ok(fs.readFileSync(agentsPath).equals(malformed));
      assert.deepEqual(backupNames(workspace), []);
    });
  }
});

test('installer: rejects non-file and invalid UTF-8 AGENTS.md targets without writing', () => {
  withWorkspace((workspace) => {
    const agentsPath = path.join(workspace, 'AGENTS.md');
    fs.mkdirSync(agentsPath);
    assert.throws(() => installProfile({ workspace }), /regular file/);
    assert.equal(fs.statSync(agentsPath).isDirectory(), true);
  });

  withWorkspace((workspace) => {
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const invalidUtf8 = Buffer.from([0xc3, 0x28]);
    fs.writeFileSync(agentsPath, invalidUtf8);
    assert.throws(() => installProfile({ workspace }), /valid UTF-8/);
    assert.ok(fs.readFileSync(agentsPath).equals(invalidUtf8));
  });
});

test('installer: changes only AGENTS.md and an allowed replacement backup', () => {
  withWorkspace((workspace) => {
    const unrelatedPath = path.join(workspace, 'MEMORY.md');
    fs.writeFileSync(unrelatedPath, 'private memory stays untouched\n');
    installProfile({ workspace, mode: 'standard' });
    installProfile({ workspace, mode: 'lite' });

    assert.equal(fs.readFileSync(unrelatedPath, 'utf8'), 'private memory stays untouched\n');
    const names = fs.readdirSync(workspace).sort();
    assert.equal(names.filter((name) => name === 'AGENTS.md').length, 1);
    assert.equal(names.filter((name) => name === 'MEMORY.md').length, 1);
    assert.equal(backupNames(workspace).length, 1);
    assert.equal(names.length, 3);
  });
});

test('installer: documented backup rollback restores the previous AGENTS.md exactly', () => {
  withWorkspace((workspace) => {
    installProfile({ workspace, mode: 'standard' });
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const standard = fs.readFileSync(agentsPath);
    const update = installProfile({ workspace, mode: 'ultra' });

    fs.copyFileSync(update.backupPath, agentsPath);

    assert.ok(fs.readFileSync(agentsPath).equals(standard));
    assert.match(fs.readFileSync(agentsPath, 'utf8'), /<!-- UXUCODE:MODE standard -->/);
  });
});

test('installer: documented manual removal preserves all surrounding bytes', () => {
  withWorkspace((workspace) => {
    const agentsPath = path.join(workspace, 'AGENTS.md');
    const original = Buffer.from('# User rules\r\n\r\nKeep exactly.\r\n', 'utf8');
    fs.writeFileSync(agentsPath, original);
    installProfile({ workspace, mode: 'standard' });
    const installed = fs.readFileSync(agentsPath, 'utf8');
    const start = installed.indexOf(BEGIN_MARKER);
    const end = installed.indexOf(END_MARKER) + END_MARKER.length;

    fs.writeFileSync(agentsPath, installed.slice(0, start) + installed.slice(end));

    const removed = fs.readFileSync(agentsPath);
    assert.ok(removed.subarray(0, original.length).equals(original));
    assert.equal(removed.includes(Buffer.from(BEGIN_MARKER)), false);
    assert.equal(removed.includes(Buffer.from(END_MARKER)), false);
  });
});
