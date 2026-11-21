'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const hosts = ['Claude', 'Codex'];
const helper = 'skills/stats/scripts/compare-usage.js';

function compare(host, input) {
  const temp = path.join(__dirname, '.tmp');
  fs.mkdirSync(temp, { recursive: true });
  const dir = fs.mkdtempSync(path.join(temp, 'task-cost-'));
  assert.equal(path.dirname(dir), temp);
  try {
    const file = path.join(dir, 'paired runs.json');
    const bytes = '\uFEFF' + JSON.stringify(input);
    fs.writeFileSync(file, bytes);
    const result = spawnSync(process.execPath, [path.join(root, host, helper), file], {
      cwd: dir, encoding: 'utf8', windowsHide: true
    });
    assert.ifError(result.error);
    assert.equal(fs.readFileSync(file, 'utf8'), bytes);
    assert.deepEqual(fs.readdirSync(dir), ['paired runs.json']);
    return result;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const measured = {
  accepted: true, costUsd: 1.25, freshInputTokens: 100, cacheReadTokens: 70,
  cacheWriteTokens: 15, outputTokens: 20, host: 'Codex/test', model: 'model-A',
  effort: 'medium', tools: 'review-set', cache: 'cold', workload: 'suite-A/order-1'
};
const failed = { ...measured, accepted: false, costUsd: 0.75 };
const pairs = [
  { id: 'first', baseline: measured, candidate: { ...measured, costUsd: 0.75 } },
  { id: 'retry', baseline: failed, candidate: failed }
];

for (const host of hosts) {
  test(host + ' compares measured task costs including failed work', () => {
    const result = compare(host, { pairs });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.baseline, {
      accepted: 1, costUsd: 2, costPerAcceptedUsd: 2, freshInputTokens: 200,
      cacheReadTokens: 140, cacheWriteTokens: 30, outputTokens: 40
    });
    assert.equal(report.pairCount, 2);
    assert.equal(report.candidate.costPerAcceptedUsd, 1.5);
    assert.equal(report.costReductionPercent, 25);
    assert.deepEqual(report.qualityRegressions, []);
    assert.deepEqual(report.unmatchedConditions, []);
  });

  test(host + ' keeps the complete workflow and environment policy within its input budget', () => {
    const { workflowPolicy, environmentPolicy } = require(path.join(root, host, 'hooks/mode-policy.js'));
    // The 5.2.0 workflow policy was 1,254 ASCII characters at each hook.
    assert.ok(workflowPolicy.length <= 1000, 'workflow policy has ' + workflowPolicy.length + ' characters');
    assert.ok(workflowPolicy.includes(environmentPolicy));
    assert.match(environmentPolicy, /For Python[^.]*repo-root .?\.venv\//i);
    for (const requirement of [/verifiable acceptance/i, /ambiguity or risk/i, /exact interpreter/i,
      /read-only/i, /command.*target.*local.*impact.*verification.*rollback/i,
      /stop.*(unsafe|impossible).*ownership.*(boundar|scope)/i]) {
      assert.match(workflowPolicy, requirement);
    }
  });

  test(host + ' exposes cost comparison and progress-aware debugging through existing skills', () => {
    const skill = (name) => fs.readFileSync(path.join(root, host, 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill('stats'), /scripts\/compare-usage\.js/);
    const debug = skill('debug');
    assert.match(debug, /same failure/i);
    assert.match(debug, /new evidence/i);
    assert.match(debug, /expected.*(RED|fail).*poll/i);
  });
}

test('missing measurements, free runs, and zero accepted tasks keep undefined metrics null', () => {
  const rows = [
    { id: 'one', baseline: measured, candidate: failed },
    { id: 'two', baseline: { accepted: false, freshInputTokens: 0 }, candidate: failed }
  ];
  const result = compare('Codex', { pairs: rows });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.baseline.costUsd, null);
  assert.equal(report.baseline.costPerAcceptedUsd, null);
  assert.equal(report.baseline.freshInputTokens, 100);
  assert.equal(report.baseline.cacheReadTokens, null);
  assert.equal(report.candidate.costUsd, 1.5);
  assert.equal(report.candidate.costPerAcceptedUsd, null);
  assert.equal(report.costReductionPercent, null);

  const free = { accepted: true, costUsd: 0 };
  const freeRun = compare('Codex', { pairs: [{ id: 'free', baseline: free, candidate: free }] });
  assert.equal(freeRun.status, 0, freeRun.stderr);
  assert.equal(JSON.parse(freeRun.stdout).costReductionPercent, null);
});

test('a newly accepted task cannot hide a different task regressing', () => {
  const rows = [
    { id: 'regressed', baseline: measured, candidate: failed },
    { id: 'improved', baseline: failed, candidate: { ...measured, costUsd: 0 } }
  ];
  const result = compare('Codex', { pairs: rows });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.qualityRegressions, ['regressed']);
  assert.equal(report.costReductionPercent, null);
  assert.equal(report.candidate.costPerAcceptedUsd, 0.75);
});

test('raw costs remain available when a cheaper run changed or omitted a comparison condition', () => {
  for (const field of ['host', 'model', 'effort', 'tools', 'cache', 'workload']) {
    for (const value of [undefined, 'different']) {
      const rows = [{ id: 'one', baseline: measured, candidate: { ...measured, costUsd: 0.25, [field]: value } }];
      const result = compare('Codex', { pairs: rows });
      assert.equal(result.status, 0, result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.candidate.costPerAcceptedUsd, 0.25);
      assert.equal(report.costReductionPercent, null);
      assert.deepEqual(report.unmatchedConditions, [{ id: 'one', fields: [field] }]);
    }
  }
  const unlabelled = { accepted: true, costUsd: 1 };
  const run = compare('Codex', { pairs: [{ id: 'two', baseline: unlabelled, candidate: unlabelled }] });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).costReductionPercent, null);
});

test('incomplete usage still validates every known measurement regardless of order', () => {
  const rows = [null, Number.MAX_SAFE_INTEGER, 1].map((freshInputTokens, index) => ({
    id: String(index), baseline: { accepted: true, freshInputTokens }, candidate: measured
  }));
  for (const ordered of [rows, [...rows].reverse()]) {
    const result = compare('Codex', { pairs: ordered });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /freshInputTokens/);
    assert.equal(result.stdout, '');
  }
});

test('the two independently installed stats skills ship the same calculator', () => {
  for (const file of [helper, 'skills/stats/paired-costs.md']) {
    assert.deepEqual(fs.readFileSync(path.join(root, 'Claude', file)), fs.readFileSync(path.join(root, 'Codex', file)));
  }
});

test('bad or unpaired records fail without a partial report', () => {
  const row = pairs[0];
  for (const input of [
    { pairs: [] }, { pairs: [row, row] }, { pairs: [{ ...row, candidate: null }] },
    { pairs: [{ ...row, baseline: { accepted: 'false' } }] },
    { pairs: [{ ...row, baseline: { accepted: true, outputTokens: 0.5 } }] },
    { pairs: [{ ...row, baseline: { accepted: true, costUsd: -1 } }] },
    { pairs: [{ ...row, candidate: { accepted: true, freshInputTokens: Number.MAX_SAFE_INTEGER } }, pairs[1]] }
  ]) {
    const result = compare('Codex', input);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /pairs|accepted|outputTokens|costUsd|freshInputTokens|candidate|duplicate/i);
    assert.equal(result.stdout, '');
  }
});
