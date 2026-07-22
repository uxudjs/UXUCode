#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const commands = new Set(['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status']);
const modes = new Set(['standard', 'lite', 'full', 'ultra', 'off']);
let input = '';

function output(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context }
  }));
}

function finish() {
  try {
    const prompt = String(JSON.parse(input.replace(/^\uFEFF/, '')).prompt || '').trim();
    const match = prompt.match(/^\/uxu-code:([a-z-]+)(?:\s+([\s\S]*))?$/i);
    if (!match) return;
    const command = match[1].toLowerCase();
    const args = (match[2] || '').trim();
    if (!commands.has(command)) return output(`Unknown UXUCode command: ${command}. Use /uxu-code:help.`);
    if (command === 'mode') {
      if (!modes.has(args)) return output('Mode must be standard, lite, full, ultra, or off.');
      const statePath = path.join(process.cwd(), '.uxucode-state.json');
      let state = {};
      try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) {}
      fs.writeFileSync(statePath, JSON.stringify({ ...state, mode: args }, null, 2) + '\n');
      return output(`UXUCode mode changed to ${args}. Safety, explicit user requirements, and verification remain higher priority.`);
    }
    output(`Run the UXUCode ${command} workflow with arguments exactly as supplied. Apply the active implementation and output policies.`);
  } catch (_) {}
}

process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', finish);
process.stdin.on('error', () => process.exit(0));
setTimeout(() => process.exit(0), 1000).unref();
