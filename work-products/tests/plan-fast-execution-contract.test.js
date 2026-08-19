const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
}

function section(content, heading) {
  const start = content.indexOf(heading);
  assert.notEqual(start, -1, `missing section: ${heading}`);
  const remainder = content.slice(start + heading.length);
  const next = remainder.search(/\n## /);
  return next === -1 ? remainder : remainder.slice(0, next);
}

function assertClauses(content, clauses, label) {
  for (const clause of clauses) {
    assert.ok(content.includes(clause), `${label}: missing contract clause: ${clause}`);
  }
}

function assertOrderedClauses(content, clauses, label) {
  let cursor = -1;
  for (const clause of clauses) {
    const index = content.indexOf(clause);
    assert.ok(index !== -1, `${label}: missing lifecycle clause: ${clause}`);
    assert.ok(index > cursor, `${label}: lifecycle clause is out of order: ${clause}`);
    cursor = index;
  }
  assertSafeContract(content, label);
}

function assertSafeContract(content, label) {
  assert.doesNotMatch(content, /workers? may write .*todo/i, `${label}: worker may write todo`);
  assert.doesNotMatch(content, /state defects may use serial fallback/i, `${label}: state defect falls back`);
  assert.doesNotMatch(content, /continue downstream after .*failure/i, `${label}: failure unlocks downstream`);
  assert.doesNotMatch(content, /runtime evidence may (?:raise|increase) concurrency/i, `${label}: runtime raises concurrency`);
}

test('plan-fast uses the approved fast | serial strategy enum everywhere', () => {
  for (const host of ['Claude', 'Codex']) {
    const planSkill = read(`${host}/skills/plan/SKILL.md`);
    const planning = read(`${host}/references/workflows/planning-and-task-breakdown/SKILL.md`);
    const build = read(`${host}/skills/build/SKILL.md`);
    const orchestration = section(
      read(`${host}/references/orchestration-patterns.md`),
      '## Fast Plan Consumption'
    );
    for (const [surface, content] of [
      ['plan skill', planSkill],
      ['planning reference', planning],
      ['build skill', build],
      ['orchestration reference', orchestration],
    ]) {
      assertClauses(content, [
        'Execution strategy is exactly `fast` or `serial`; every other value is invalid.',
      ], `${host} ${surface} enum`);
    }
  }

  const fixture = read('work-products/tests/fixtures/plan-fast/parallel.md');
  const collisions = read('work-products/tests/fixtures/plan-fast/path-collisions.md');
  assert.match(fixture, /^Expected strategy: fast$/m);
  assert.doesNotMatch(fixture, /^Expected strategy: parallel$/m);
  assert.match(collisions, /\| write\/read cross-scope \|[^\n]+\| conflict \|/);
  assert.match(collisions, /\| generated\/read cross-scope \|[^\n]+\| conflict \|/);
  assert.match(collisions, /two tasks that only read the same immutable path[^.]+file-scope independent/);
});

test('plan-fast build contract classifies conflicts and fallback without guessing', () => {
  for (const host of ['Claude', 'Codex']) {
    const build = read(`${host}/skills/build/SKILL.md`);
    const orchestration = section(
      read(`${host}/references/orchestration-patterns.md`),
      '## Fast Plan Consumption'
    );
    for (const [surface, content] of [['build skill', build], ['orchestration reference', orchestration]]) {
      assertClauses(content, [
        "For tasks A and B, any normalized overlap between A's write or generated-output scope and B's read, write, or generated-output scope is a conflict, and the same check applies from B to A.",
        'A write/read overlap is exempt only when the read bytes are frozen by SHA-256 before the wave and no wave task can write any alias of that frozen input.',
        'Only defects in fast-only scheduling metadata may use serial fallback:',
        'Plan/todo identity, task schema, dependency graph, state, attempt, baseline, ownership, and path-identity defects are never fallback-safe.',
        'With a safe serial fallback or zero available native worker slots, the main agent executes exactly one uniquely safe task itself',
      ], `${host} ${surface} fallback`);
      assertOrderedClauses(content, [
        'First hard-block a missing required field in the task schema or scope',
        'Only after those checks pass',
        'Only defects in fast-only scheduling metadata may use serial fallback:',
      ], `${host} ${surface} hard-block before fallback`);
      for (const unsafe of [
        'Workers may write todo.',
        'State defects may use serial fallback.',
        'Continue downstream after one worker failure.',
        'Runtime evidence may raise concurrency.',
      ]) {
        assert.throws(
          () => assertSafeContract(`${content}\n${unsafe}`, `${host} ${surface} unsafe mutation`),
          `${host} ${surface}: accepted ${unsafe}`
        );
      }
    }

    assertClauses(build, [
      'Before any execution, including main-agent fallback, atomically record each selected attempt and write-set baseline;',
      'For an allowed directory, record its canonical descendant snapshot and namespace SHA-256;',
      'If a launch is proven not to have started or written, convert its recorded attempt to `blocked` with a launch-failure terminal record;',
      'if launch or ownership is uncertain, preserve the `in_progress` crash evidence and return `BLOCKED`.',
      'Before returning after a launch stop, reconcile every pre-recorded attempt:',
      'Before executing any plan with fast requested or strategy `fast`, read and follow the plugin-root `references/orchestration-patterns.md` section `Fast Plan Consumption`.',
    ], `${host} build reachability and crash handling`);
  }
});

test('plan-fast maps the generic worker protocol to each host native lifecycle', () => {
  const codex = section(read('Codex/references/orchestration-patterns.md'), '## Fast Plan Consumption');
  const codexLifecycle = [
    'Validate the complete plan and todo before starting any worker.',
    'effective width is the minimum of that availability, the plan limit, and ready non-conflicting tasks.',
    'After selecting that bounded batch and before the first launch, the main agent atomically records its attempts and write-set baselines.',
    'Read the plugin-root `agents/builder.md` duties and pass them explicitly',
    '`spawn_agent`, `fork_turns: "none"`',
    'Issue every selected `spawn_agent` call before the first `wait_agent` call; never interleave spawn and wait.',
    'After every launch call has returned, use `wait_agent` and `list_agents` until every started worker is terminal.',
    'On failure, start no new or downstream worker;',
    'Reconcile every pre-recorded attempt before returning',
    'Do not unlock the barrier until every started worker has reached a terminal state and its receipt and actual diff have been reconciled.',
  ];
  assertOrderedClauses(codex, codexLifecycle, 'Codex native lifecycle');
  assert.ok(codex.includes('`interrupt_agent`'), 'Codex native lifecycle: unsafe cancellation is missing');

  const claude = section(read('Claude/references/orchestration-patterns.md'), '## Fast Plan Consumption');
  const claudeLifecycle = [
    'Validate the complete plan and todo before starting any worker.',
    'Use the host-advertised native `Agent` tool capacity; effective width is the minimum of that availability, the plan limit, and ready non-conflicting tasks.',
    'After selecting that bounded batch and before the first launch, the main agent atomically records its attempts and write-set baselines.',
    'dispatch the selected independent Agent calls together',
    'through the plugin `builder` agent',
    'collect every started Agent result',
    'On failure, start no new or downstream call;',
    'If the native batch is only partly accepted, reconcile every pre-recorded attempt',
    'Do not unlock the barrier until every started worker has reached a terminal state and its receipt and actual diff have been reconciled.',
  ];
  assertOrderedClauses(claude, claudeLifecycle, 'Claude native lifecycle');

  for (const [label, content, lifecycle] of [
    ['Codex', codex, codexLifecycle],
    ['Claude', claude, claudeLifecycle],
  ]) {
    for (const clause of lifecycle) {
      assert.throws(
        () => assertOrderedClauses(content.replace(clause, ''), lifecycle, `${label} removed clause`),
        `${label}: deleting ${clause} must fail`
      );
    }
    assert.throws(
      () => assertOrderedClauses(`${content}\nWorkers may write todo.`, lifecycle, `${label} unsafe authority`)
    );
    assert.throws(
      () => assertOrderedClauses(`${content}\nContinue downstream after one worker failure.`, lifecycle, `${label} unsafe failure`)
    );
    assert.throws(
      () => assertOrderedClauses(`${content}\nRuntime evidence may raise concurrency.`, lifecycle, `${label} unsafe capacity`)
    );
  }
});

test('plan-fast workers have a bounded authority and terminal receipt schema', () => {
  for (const host of ['Claude', 'Codex']) {
    const builder = read(`${host}/agents/builder.md`);
    assertClauses(builder, [
      'Treat the assigned task ID, attempt ID, plan SHA-256, parent-recorded write-set baseline, read/write scope, acceptance criteria, and focused validation as hard boundaries.',
      'Immediately before the first write to each target, re-read its path or directory-namespace baseline; on any existence, hash, or namespace drift, do not write and return `blocked`.',
      'Do not modify `work-products/plan.md` or `work-products/todo.md`, start nested workers, integrate shared files, or perform external mutations.',
      'Do not commit, push, install, publish, deploy, reset, checkout, or delete user or other-worker changes.',
      'Return exactly one terminal receipt containing task ID, attempt ID, plan SHA-256, `completed | blocked` status, actual changed paths with `{ exists, afterSha256 | null }`, focused validation command and exit code, concise output summary, scope exceptions, and any blocker or remaining work.',
      'The main agent recomputes diffs and hashes against the todo baseline; a missing, malformed, or mismatched receipt cannot complete the task.',
    ], `${host} builder receipt`);
    assertSafeContract(builder, `${host} builder authority`);
    assert.throws(
      () => assertSafeContract(`${builder}\nWorkers may write todo.`, `${host} builder unsafe mutation`)
    );
  }
});

test('plan-fast historical evidence keeps LF bytes in every checkout', () => {
  const probes = [
    'work-products/tests/plan-fast-host-artifacts/fixture-specs.json',
    'work-products/tests/plan-fast-host-artifacts/5.0.19/Codex/skills/build/SKILL.md',
    'work-products/tests/plan-fast-host-artifacts/audits/T8-20260817-no-model-audit-01/candidate-install.json',
  ];
  const result = childProcess.spawnSync(
    'git',
    ['check-attr', 'text', 'eol', '--', ...probes],
    { cwd: root, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr);
  for (const probe of probes) {
    assert.match(result.stdout, new RegExp(`${probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: text: set`));
    assert.match(result.stdout, new RegExp(`${probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: eol: lf`));
  }

  const staticPath = 'work-products/tests/plan-fast-host-artifacts/5.0.19/Codex/skills/build/SKILL.md';
  const filtered = childProcess.spawnSync(
    'git',
    ['cat-file', '--filters', `--path=${staticPath}`, `HEAD:${staticPath}`],
    { cwd: root, encoding: null }
  );
  assert.equal(filtered.status, 0, Buffer.from(filtered.stderr || '').toString('utf8'));
  const manifest = JSON.parse(read('work-products/tests/plan-fast-host-artifacts/manifest.json'));
  const expected = manifest.packages.Codex.files.find((entry) => entry.path === 'skills/build/SKILL.md');
  assert.ok(expected, 'frozen Codex build skill is missing from manifest');
  assert.equal(filtered.stdout.length, expected.size);
  assert.equal(crypto.createHash('sha256').update(filtered.stdout).digest('hex'), expected.sha256);
});
