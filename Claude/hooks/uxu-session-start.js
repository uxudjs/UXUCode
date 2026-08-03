#!/usr/bin/env node

const { readConfig, readState } = require('./hook-state');
const { policyFor, resolveMode, workflowPolicy } = require('./mode-policy');

const config = readConfig();
const mode = resolveMode(config.mode);
const state = readState();
const context = [
  `UXUCode is active in ${mode} mode.`,
  'Use only /uxu-code:<command> public entries and never infer aliases.',
  policyFor(mode),
  workflowPolicy,
  state.currentTask ? `Current task: ${state.currentTask}.` : '',
  state.tests ? `Last recorded tests: ${state.tests}.` : ''
].filter(Boolean).join(' ');

process.stdout.write(context);

