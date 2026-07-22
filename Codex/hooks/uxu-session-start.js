#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const modes = new Set(['standard', 'lite', 'full', 'ultra', 'off']);
const configDir = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode')
  : path.join(os.homedir(), '.config', 'uxucode');
const configPath = path.join(configDir, 'config.json');
const statePath = path.join(process.cwd(), '.uxucode-state.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return fallback; }
}

const config = readJson(configPath, {});
const mode = modes.has(config.mode) ? config.mode : 'standard';
const state = readJson(statePath, {});
const context = [
  `UXUCode is active in ${mode} mode.`,
  'Use only @<command> public entries and never infer aliases.',
  'Apply the internal implementation-policy and output-policy unless mode is off.',
  'Correctness, safety, explicit requirements, and validation evidence outrank compactness.',
  state.currentTask ? `Current task: ${state.currentTask}.` : '',
  state.tests ? `Last recorded tests: ${state.tests}.` : ''
].filter(Boolean).join(' ');

process.stdout.write(JSON.stringify({
  systemMessage: `UXUCODE:${mode.toUpperCase()}`,
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context }
}));

