#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = process.platform === 'win32' && process.env.APPDATA
  ? path.join(process.env.APPDATA, 'uxucode', 'config.json')
  : path.join(os.homedir(), '.config', 'uxucode', 'config.json');
let mode = 'standard';
try {
  const value = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '')).mode;
  if (['standard', 'lite', 'full', 'ultra', 'off'].includes(value)) mode = value;
} catch {}

const context = mode === 'off'
  ? 'UXUCode policies are off; follow the parent task and preserve validation evidence.'
  : `Apply UXUCode ${mode} mode: smallest correct implementation, concise evidence-backed output, and full detail for risk or ambiguity.`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SubagentStart',
    additionalContext: context
  }
}));

