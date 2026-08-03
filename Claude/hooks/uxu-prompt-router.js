#!/usr/bin/env node

const { readConfig, readState, writeConfig, writeState } = require('./hook-state');
const { policyFor, resolveMode, supportedModes, workflowPolicy } = require('./mode-policy');

const commands = new Set(['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status', 'clean']);
const modes = new Set(supportedModes);
function emit(text) {
  if (text) process.stdout.write(text);
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(input.replace(/^\uFEFF/, '')).prompt || '').trim(); }
  catch { return; }

  const match = prompt.match(/^\/uxu-code:([a-z-]+)(?:[ \t]+([^\n]*))?$/i);
  if (!match) return;

  const command = match[1].toLowerCase();
  const args = (match[2] || '').trim();
  if (!commands.has(command)) {
    emit(`UXUCode rejected unknown command "${command}". Use /uxu-code:help.`);
    return;
  }
  if (command === 'clean' && args !== '' && args !== 'apply') {
    emit('UXUCode clean accepts no argument for preview or exactly apply.');
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
      ...readConfig(),
      mode: args
    };
    const state = { ...readState(), mode: args, updatedAt: new Date().toISOString() };
    writeConfig(config);
    writeState(state);
    emit(`UXUCode mode changed to ${args}.`);
    return;
  }

  const mode = resolveMode(readConfig().mode);
  emit(`Route this request to the "${command}" skill with arguments "${args}". ${policyFor(mode)} ${workflowPolicy}`);
});
