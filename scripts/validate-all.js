#!/usr/bin/env node

const childProcess = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const node = process.execPath;
const steps = [
  { name: 'Codex plugin', command: node, args: ['Codex/scripts/validate-plugin.js'] },
  { name: 'Claude plugin', command: node, args: ['Claude/scripts/validate-plugin.js'] },
  { name: 'command parity', command: node, args: ['scripts/validate-command-parity.js'] },
  { name: 'skill parity', command: node, args: ['scripts/validate-skill-parity.js'] },
  { name: 'guide parity', command: node, args: ['scripts/validate-guide-parity.js'] },
  { name: 'README scope', command: node, args: ['scripts/validate-readme-scope.js'] },
  { name: 'legacy commands', command: node, args: ['scripts/validate-no-legacy-commands.js'] },
  { name: 'third-party notices', command: node, args: ['scripts/validate-third-party-notices.js'] },
  {
    name: 'workflow contracts',
    command: node,
    args: [
      '--test',
      'work-products/tests/clean-contract.test.js',
      'work-products/tests/environment-isolation-contract.test.js',
      'work-products/tests/subagent-cross-validation-contract.test.js',
      'work-products/tests/workflow-contract.test.js',
      'work-products/tests/mode-policy-contract.test.js',
      'work-products/tests/documentation-validator-contract.test.js'
    ]
  },
  { name: 'OpenClaw profile', command: node, args: ['OpenClaw/scripts/validate-profile.js'] },
  {
    name: 'OpenClaw tests',
    command: node,
    args: [
      '--test',
      'work-products/tests/OpenClaw/tests/validate-profile.test.js',
      'work-products/tests/OpenClaw/tests/evaluation.test.js'
    ]
  },
  { name: 'git diff check', command: 'git', args: ['diff', '--check'] }
];

function runSteps(selectedSteps = steps, spawn = childProcess.spawnSync, reporter = console) {
  for (const step of selectedSteps) {
    reporter.log(`[validate-all] ${step.name}`);
    const result = spawn(step.command, step.args, {
      cwd: root,
      stdio: 'inherit',
      shell: false
    });
    if (result.error) {
      reporter.error(`[validate-all] ${step.name} could not start: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) {
      const status = Number.isInteger(result.status) ? result.status : 1;
      reporter.error(`[validate-all] ${step.name} failed with exit code ${status}`);
      return status;
    }
  }
  reporter.log(`[validate-all] passed ${selectedSteps.length} steps`);
  return 0;
}

if (require.main === module) process.exitCode = runSteps();

module.exports = { runSteps, steps };
