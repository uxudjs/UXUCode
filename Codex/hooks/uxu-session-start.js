#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const modes = new Set(['standard', 'lite', 'full', 'ultra', 'off']);
let mode = 'standard';
try {
  const configRoot = process.platform === 'win32' && process.env.APPDATA
    ? process.env.APPDATA : path.join(os.homedir(), '.config');
  const config = JSON.parse(fs.readFileSync(path.join(configRoot, 'uxucode', 'config.json'), 'utf8'));
  if (modes.has(config.mode)) mode = config.mode;
} catch (_) {}
try {
  const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), '.uxucode-state.json'), 'utf8'));
  if (modes.has(state.mode)) mode = state.mode;
} catch (_) {}

const guide = /^zh(?:-|_)?tw/i.test(process.env.LANG || '')
  ? 'docs/USAGE.zh-TW.md'
  : /^zh/i.test(process.env.LANG || '') ? 'docs/USAGE.zh-CN.md' : 'docs/USAGE.en.md';
const context = [
  `UXUCode is active in ${mode} mode.`,
  'Use only @<command> entries.',
  'Correctness and safety override brevity; implement the smallest correct change and verify it.',
  `Guide: ${guide}`
].join(' ');

process.stdout.write(JSON.stringify({
  systemMessage: `UXUCODE:${mode.toUpperCase()}`,
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context }
}));
