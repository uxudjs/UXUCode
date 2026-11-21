'use strict';

const fs = require('node:fs');

const metrics = ['costUsd', 'freshInputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens'];

const conditions = ['host', 'model', 'effort', 'tools', 'cache', 'workload'];

function summarize(pairs, side) {
  const totals = Object.fromEntries(metrics.map(name => [name, 0]));
  const missing = new Set();
  let accepted = 0;

  for (const pair of pairs) {
    const run = pair[side];
    if (typeof run?.accepted !== 'boolean') {
      throw new Error(pair.id + '.' + side + '.accepted must be true or false');
    }
    if (run.accepted) accepted++;

    for (const name of metrics) {
      const value = run[name];
      if (value == null) {
        missing.add(name);
        continue;
      }
      const valid = name === 'costUsd' ? Number.isFinite(value) : Number.isSafeInteger(value);
      if (!valid || value < 0) throw new Error(pair.id + '.' + side + ' has invalid ' + name);
      const sum = totals[name] + value;
      if (!Number.isFinite(sum) || (name !== 'costUsd' && !Number.isSafeInteger(sum))) {
        throw new Error(side + ' total exceeds the range for ' + name);
      }
      totals[name] = sum;
    }
  }

  for (const name of missing) totals[name] = null;
  const costPerAcceptedUsd = accepted > 0 && totals.costUsd !== null ? totals.costUsd / accepted : null;
  return { accepted, ...totals, costPerAcceptedUsd };
}

function compare(input) {
  const pairs = input?.pairs;
  if (!Array.isArray(pairs) || !pairs.length) throw new Error('pairs must be a nonempty array');
  const ids = new Set();
  for (const pair of pairs) {
    const id = pair?.id;
    if (typeof id !== 'string' || !id.trim() || id !== id.trim()) throw new Error('invalid task id in pairs');
    if (ids.has(id)) throw new Error('duplicate task id: ' + id);
    ids.add(id);
  }

  const baseline = summarize(pairs, 'baseline');
  const candidate = summarize(pairs, 'candidate');
  const qualityRegressions = pairs.filter(pair => pair.baseline.accepted && !pair.candidate.accepted)
    .map(pair => pair.id);
  const unmatchedConditions = [];
  for (const pair of pairs) {
    const fields = conditions.filter(field => {
      const value = pair.baseline[field];
      return typeof value !== 'string' || !value.trim() || value !== pair.candidate[field];
    });
    if (fields.length) unmatchedConditions.push({ id: pair.id, fields });
  }
  let costReductionPercent = null;
  if (!qualityRegressions.length && !unmatchedConditions.length &&
      baseline.costPerAcceptedUsd > 0 && candidate.costPerAcceptedUsd !== null) {
    const change = (1 - candidate.costPerAcceptedUsd / baseline.costPerAcceptedUsd) * 100;
    if (Number.isFinite(change)) costReductionPercent = Number(change.toFixed(2));
  }
  return { pairCount: pairs.length, baseline, candidate, qualityRegressions, unmatchedConditions, costReductionPercent };
}

try {
  if (process.argv.length !== 3) throw new Error('usage: node compare-usage.js <paired-runs.json>');
  const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  console.log(JSON.stringify(compare(input), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
