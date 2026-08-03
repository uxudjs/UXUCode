#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packages = ['Claude', 'Codex'];
const publicCommands = ['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status', 'clean'];
const modes = ['standard', 'lite', 'full', 'ultra', 'off'];
const failures = [];

for (const pkg of packages) {
  const skills = fs.readdirSync(path.join(root, pkg, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  for (const command of publicCommands) {
    if (!skills.includes(command)) failures.push(pkg + ': missing public command skill ' + command);
  }
  const router = fs.readFileSync(path.join(root, pkg, 'hooks', 'uxu-prompt-router.js'), 'utf8');
  for (const command of publicCommands) {
    if (!router.includes("'" + command + "'")) failures.push(pkg + ': router missing command ' + command);
  }
  const policy = require(path.join(root, pkg, 'hooks', 'mode-policy.js'));
  if (JSON.stringify(policy.supportedModes) !== JSON.stringify(modes)) {
    failures.push(pkg + ': mode policy differs from the public mode contract');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Command parity passed: ' + publicCommands.length + ' commands and ' + modes.length + ' modes.');
