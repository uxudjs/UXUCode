#!/usr/bin/env node

const { readConfig, readStateStatus } = require('./hook-state');
const { resolveMode } = require('./mode-policy');

function statusSnapshot() {
  const config = readConfig();
  const { status, state } = readStateStatus();
  const mode = resolveMode(config.mode).toUpperCase();
  const task = status === 'fresh' ? `${state.task}/${state.total}` : 'unknown';
  const tests = status === 'fresh' && state.tests ? state.tests : 'unknown';
  const gate = status === 'fresh' && state.gate ? state.gate : 'unknown';

  return {
    line: `[UXUCODE:${mode}] task ${task} · tests ${tests} · gate ${gate}`,
    currentTask: status === 'fresh' && state.currentTask ? state.currentTask : 'unknown',
    updatedAt: status === 'fresh' ? state.updatedAt : 'unknown'
  };
}

if (require.main === module) process.stdout.write(statusSnapshot().line);

module.exports = { statusSnapshot };

