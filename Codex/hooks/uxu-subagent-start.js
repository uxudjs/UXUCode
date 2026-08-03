#!/usr/bin/env node

const { readConfig } = require('./hook-state');
const { policyFor, resolveMode, workflowPolicy } = require('./mode-policy');

const mode = resolveMode(readConfig().mode);
const context = `${policyFor(mode)} ${workflowPolicy}`;

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SubagentStart', additionalContext: context }
}));

