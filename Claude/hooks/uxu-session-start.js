#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const { policyFor, resolveMode, workflowPolicy } = require('./mode-policy');
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
const mode = resolveMode(config.mode);
const state = readJson(statePath, {});
const context = [
  `UXUCode is active in ${mode} mode.`,
  'Use only /uxu-code:<command> public entries and never infer aliases.',
  policyFor(mode),
  workflowPolicy,
  state.currentTask ? `Current task: ${state.currentTask}.` : '',
  state.tests ? `Last recorded tests: ${state.tests}.` : ''
].filter(Boolean).join(' ');

process.stdout.write(context);

