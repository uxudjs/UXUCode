#!/usr/bin/env node

const { readConfig, writeConfig } = require('./hook-state');
const { policyFor, resolveMode, supportedModes, workflowPolicy } = require('./mode-policy');
const { statusSnapshot } = require('./uxu-statusline');

const commands = new Set(['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status', 'clean']);
const modes = new Set(supportedModes);
function emit(text) {
  if (!text) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text }
  }));
}
function reject(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('error', () => process.exit(0));
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = String(JSON.parse(input.replace(/^\uFEFF/, '')).prompt || '').replace(/^\uFEFF/, '').trim(); }
  catch { return; }

  if (!prompt.startsWith('@')) return;

  const [firstLine, ...bodyLines] = prompt.split(/\r?\n/);
  const match = firstLine.match(/^@([a-z-]+)(?:[ \t]+(.*))?$/);
  if (!match) {
    reject('UXUCode rejected invalid command format. Use @<command> or @help.');
    return;
  }

  const command = match[1];
  const args = [(match[2] || '').trim(), bodyLines.join('\n').trim()].filter(Boolean).join('\n');
  if (!commands.has(command)) {
    reject(`UXUCode rejected unknown command "${command}". Use @help.`);
    return;
  }
  if (command === 'clean' && (bodyLines.length > 0 || (args !== '' && args !== 'apply'))) {
    reject('UXUCode clean accepts no argument for preview or exactly apply.');
    return;
  }

  if (command === 'mode') {
    if (bodyLines.length > 0 || !modes.has(args)) {
      reject('UXUCode mode requires exactly one of: standard, lite, full, ultra, off.');
      return;
    }
    const config = {
      language: 'auto',
      compactReview: true,
      contextCompression: false,
      mcpDescriptionCompression: false,
      ...readConfig(),
      mode: args
    };
    writeConfig(config);
    emit(`UXUCode mode changed to ${args}.`);
    return;
  }

  const mode = resolveMode(readConfig().mode);
  if (command === 'status') {
    const snapshot = statusSnapshot();
    emit(`Answer this status request directly from the canonical payload below; do not load a skill, call tools, run commands, or inspect files. Canonical UXUCode status payload:\n${snapshot.line}\nCurrent task: ${snapshot.currentTask}\nLast update: ${snapshot.updatedAt}\nOutput the status line verbatim as plain text without Markdown code formatting as the first line; do not rerun or reconstruct it. ${policyFor(mode)} ${workflowPolicy}`);
    return;
  }
  emit(`Route this request to the "${command}" skill with arguments "${args}". ${policyFor(mode)} ${workflowPolicy}`);
});

