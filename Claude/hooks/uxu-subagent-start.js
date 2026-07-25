#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { policyFor, resolveMode } = require('./mode-policy');

const configPath = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode', 'config.json')
  : path.join(os.homedir(), '.config', 'uxucode', 'config.json');
let mode = 'standard';
try {
  const value = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')).mode;
  mode = resolveMode(value);
} catch {}

const context = policyFor(mode);

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SubagentStart',
    additionalContext: context
  }
}));

