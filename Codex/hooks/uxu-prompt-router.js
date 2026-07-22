#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const commands = new Set(['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status']);
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
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function emit(text) {
  if (!text) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text }
  }));
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(input.replace(/^\uFEFF/, '')).prompt || '').trim(); }
  catch { return; }

  const match = prompt.match(/^@([a-z-]+)(?:\s+([^\n]*))?/i);
  if (!match) return;

  const command = match[1].toLowerCase();
  const args = (match[2] || '').trim();
  if (!commands.has(command)) {
    emit(`UXUCode rejected unknown command "${command}". Use @help.`);
    return;
  }

  if (command === 'mode') {
    if (!modes.has(args)) {
      emit('UXUCode mode requires exactly one of: standard, lite, full, ultra, off.');
      return;
    }
    const config = {
      mode: args,
      language: 'auto',
      compactReview: true,
      contextCompression: false,
      mcpDescriptionCompression: false,
      ...readJson(configPath, {}),
      mode: args
    };
    const state = { ...readJson(statePath, {}), mode: args, updatedAt: new Date().toISOString() };
    writeJson(configPath, config);
    writeJson(statePath, state);
    emit(`UXUCode mode changed to ${args}.`);
    return;
  }

  const mode = readJson(configPath, {}).mode || 'standard';
  emit(`Route this request to the "${command}" skill with arguments "${args}". Apply UXUCode mode ${mode}.`);
});

