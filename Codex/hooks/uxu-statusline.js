#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
let state = { mode: 'standard' };
try {
  const configRoot = process.platform === 'win32' && process.env.APPDATA
    ? process.env.APPDATA : path.join(os.homedir(), '.config');
  state = { ...state, ...JSON.parse(fs.readFileSync(path.join(configRoot, 'uxucode', 'config.json'), 'utf8')) };
} catch (_) {}
try { state = { ...state, ...JSON.parse(fs.readFileSync(path.join(process.cwd(), '.uxucode-state.json'), 'utf8')) }; } catch (_) {}
const task = state.task ? ` task ${state.task}` : '';
const tests = state.tests === true ? ' · tests ✓' : state.tests === false ? ' · tests ✗' : '';
process.stdout.write(`[UXUCODE:${String(state.mode).toUpperCase()}]${task}${tests}`);
