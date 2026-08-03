#!/usr/bin/env node

const { readConfig, readState } = require('./hook-state');

const config = readConfig();
const state = readState();
const mode = String(state.mode || config.mode || 'standard').toUpperCase();
const task = Number.isInteger(state.task) && Number.isInteger(state.total)
  ? ` task ${state.task}/${state.total}`
  : '';
const tests = state.tests ? ` · tests ${state.tests}` : '';
const gate = state.gate ? ` · gate ${state.gate}` : '';

process.stdout.write(`[UXUCODE:${mode}]${task}${tests}${gate}`);

