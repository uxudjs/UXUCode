const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
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

function collectMarkdownFiles(relativeDirectory) {
  const directory = path.join(root, ...relativeDirectory.split('/'));
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) {
      return collectMarkdownFiles(relativePath);
    }
    return entry.isFile() && entry.name.endsWith('.md') ? [relativePath] : [];
  });
}

test('model-facing guidance omits digest-algorithm terminology', () => {
  const acronym = String.fromCharCode(115, 104, 97);
  const forbidden = new RegExp(`(?:^|[^A-Za-z]|before|after|namespace|plan)${acronym}(?=[^A-Za-z]|$)`, 'i');
  const files = [
    ...collectMarkdownFiles('Claude/skills'),
    ...collectMarkdownFiles('Claude/agents'),
    ...collectMarkdownFiles('Claude/references'),
    ...collectMarkdownFiles('Codex/skills'),
    ...collectMarkdownFiles('Codex/agents'),
    ...collectMarkdownFiles('Codex/references'),
    ...collectMarkdownFiles('docs'),
    'work-products/SPEC.md',
    'work-products/plan.md',
    'work-products/todo.md',
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), forbidden, `${file}: digest algorithm terminology is model-facing`);
  }
});

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

test('plan approval snapshots use the canonical candidate-owned no-replace root', () => {
  const required = [
    'candidate-owned raw-byte approval snapshot',
    '`work-products/debug/approval-baselines/<candidate-id>/`',
    'create-new/no-replace',
  ];
  for (const host of ['Claude', 'Codex']) {
    const plan = read(`${host}/skills/plan/SKILL.md`);
    const planning = read(`${host}/references/workflows/planning-and-task-breakdown/SKILL.md`);
    assertClauses(plan, required, `${host} plan approval snapshot`);
    assertClauses(planning, required, `${host} planning approval snapshot`);
    for (const [surface, content] of [['plan', plan], ['planning', planning]]) {
      assert.doesNotMatch(
        content,
        /attempt-owned no-replace snapshot of the exact work-products\/plan\.md bytes/i,
        `${host} ${surface}: plan approval snapshot is incorrectly attempt-owned`
      );
    }
  }
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
        'A write/read overlap is exempt only when the read bytes are preserved in an attempt-owned no-replace snapshot before the wave and no wave task can write any alias of that frozen input.',
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
      'Before any execution, including main-agent fallback, atomically record each selected attempt and raw-byte write-set baseline;',
      'For an allowed directory, record its complete sorted canonical descendant set and preserve every regular file as exact raw bytes;',
      'For a missing path, record the missing state and require exclusive no-replace creation;',
      'Immediately before the first write, stream-compare live bytes and re-enumerate directory descendants against the attempt-owned snapshot;',
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
      'Treat the assigned task ID, attempt ID, parent-recorded raw-byte write-set baseline, read/write scope, acceptance criteria, and focused validation as hard boundaries.',
      'Immediately before the first write to each target, stream-compare its exact bytes or re-enumerate its complete canonical descendant set; on any byte, existence, path-set, type, link, alias, or ownership drift, do not write and return `blocked`.',
      'Do not modify `work-products/plan.md` or `work-products/todo.md`, start nested workers, integrate shared files, or perform external mutations.',
      'Do not commit, push, install, publish, deploy, reset, checkout, or delete user or other-worker changes.',
      'Return exactly one terminal receipt containing task ID, attempt ID, `completed | blocked` status, actual changed canonical paths with present or missing state, focused validation command and exit code, concise output summary, scope exceptions, and any blocker or remaining work.',
      'The main agent stream-compares exact bytes and reconciles the actual diff against the todo baseline; a missing, malformed, or mismatched receipt cannot complete the task.',
    ], `${host} builder receipt`);
    assertSafeContract(builder, `${host} builder authority`);
    assert.throws(
      () => assertSafeContract(`${builder}\nWorkers may write todo.`, `${host} builder unsafe mutation`)
    );
  }
});

test('existing approved raw-byte plans support one scoped preflight migration without plan edits or renewed approval', () => {
  const contracts = [
    'Run legacy approval preflight before any general approval-snapshot check.',
    'For an existing approved plan, todo approval state and receipt are authoritative even if the immutable plan still contains a stale pre-approval status label.',
    'Preserve a legacy todo top-level candidate identity and approval receipt as read-only history; never copy, compare, or enforce them in a task, attempt, worker prompt, or terminal receipt.',
    'When every task is pending and the approved plan already defines complete raw-byte and canonical-path capture and verification, execute without adding a mode field, editing the plan, or requesting approval again.',
    "Use the exact attempt, snapshot, or baseline root declared by the approved plan and keep it inside that task's write scope; use the standard default only when the plan omits a root and its approved write scope already permits that location.",
    'An existing complete raw-byte plan must not create a new baseline directory outside its approved write scope.',
    'If an approved legacy receipt has no raw-byte approval snapshot, verify the current plan once with its read-only top-level candidate identity, create the snapshot atomically inside a plan-declared permitted root, and record the snapshot reference in todo before any task starts.',
    'That one-time migration may read the legacy identity only at approval preflight; it must never copy it into a task, attempt, worker prompt, execution baseline, or terminal receipt.',
    'A missing or conflicting legacy identity, incomplete receipt, unavailable permitted root, snapshot creation failure, or post-verification byte drift is `BLOCKED` with zero workers.',
    'When the approved plan already declares a permitted root, this migration requires no plan edit, mode field, or renewed approval; it performs exactly one todo-and-snapshot write before execution.',
    'Only after an approval has a verified raw-byte snapshot, whether original or created by legacy preflight, may a fresh session reuse its persisted receipt by stream-comparing the current plan with that snapshot.',
  ];
  for (const host of ['Claude', 'Codex']) {
    const build = read(`${host}/skills/build/SKILL.md`);
    const planning = read(`${host}/references/workflows/planning-and-task-breakdown/SKILL.md`);
    const orchestration = section(
      read(`${host}/references/orchestration-patterns.md`),
      '## Fast Plan Consumption'
    );
    const help = read(`${host}/skills/help/SKILL.md`);
    assertClauses(`${build}\n${planning}\n${orchestration}\n${help}`, contracts, `${host} compatibility`);
    for (const [surface, content] of [
      ['build', build],
      ['planning', planning],
      ['orchestration', orchestration],
      ['help', help],
    ]) {
      assertOrderedClauses(content, [contracts[0], contracts.at(-1)], `${host} ${surface} legacy preflight order`);
    }
    for (const [surface, content] of [['build', build], ['orchestration', orchestration]]) {
      assertOrderedClauses(content, [
        "Use the exact attempt, snapshot, or baseline root declared by the approved plan and keep it inside that task's write scope; use the standard default only when the plan omits a root and its approved write scope already permits that location.",
        'using `work-products/debug/execution-baselines/<attempt-id>/` only as the permitted standard default',
      ], `${host} ${surface} root priority`);
    }
  }

  const fixture = read('work-products/tests/fixtures/raw-byte-compat/existing-approved.md');
  assertClauses(fixture, [
    'Plan header state: CANDIDATE_AWAITING_APPROVAL',
    'Todo approval state: approved',
    'Legacy top-level candidate identity: read-only',
    'Task count: 15 pending',
    'Approval snapshot state: missing',
    'Approved snapshot root: work-products/tests/.tmp/GUARD/{attempt_id}/approval-plan.raw',
    'Approved execution root: work-products/tests/.tmp/GUARD/{attempt_id}/',
    'Expected preflight writes: todo snapshot reference + approved snapshot root only',
    'Forbidden path: work-products/debug/execution-baselines/',
    'Plan bytes: unchanged',
    'Renewed approval: no',
    'Mode field: absent',
    'Missing or conflicting legacy identity: BLOCKED with zero workers',
    'Unavailable approved root or snapshot creation failure: BLOCKED with zero workers',
    'Post-verification byte drift: BLOCKED with zero workers',
  ], 'existing approved compatibility fixture');
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
  assert.deepEqual(filtered.stdout, fs.readFileSync(path.join(root, ...staticPath.split('/'))));
});
