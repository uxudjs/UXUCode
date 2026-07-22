#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode', 'config.json')
  : path.join(os.homedir(), '.config', 'uxucode', 'config.json');
const statePath = path.join(process.cwd(), '.uxucode-state.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return {}; }
}

const config = readJson(configPath);
const state = readJson(statePath);
const mode = String(state.mode || config.mode || 'standard').toUpperCase();
const task = Number.isInteger(state.task) && Number.isInteger(state.total)
  ? ` task ${state.task}/${state.total}`
  : '';
const tests = state.tests ? ` · tests ${state.tests}` : '';
const gate = state.gate ? ` · gate ${state.gate}` : '';

process.stdout.write(`[UXUCODE:${mode}]${task}${tests}${gate}`);

