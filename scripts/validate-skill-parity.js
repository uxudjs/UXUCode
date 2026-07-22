#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const list = (pkg) => fs.readdirSync(path.join(root, pkg, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const claude = list('Claude');
const codex = list('Codex');
const failures = [];
const workflowList = (pkg) => fs.readdirSync(path.join(root, pkg, 'references', 'workflows'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const claudeWorkflows = workflowList('Claude');
const codexWorkflows = workflowList('Codex');

if (JSON.stringify(claude) !== JSON.stringify(codex)) failures.push('Skill directory sets differ.');
if (JSON.stringify(claudeWorkflows) !== JSON.stringify(codexWorkflows)) failures.push('Internal workflow reference sets differ.');
for (const name of claude.filter((entry) => codex.includes(entry))) {
  const left = fs.readFileSync(path.join(root, 'Claude', 'skills', name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const right = fs.readFileSync(path.join(root, 'Codex', 'skills', name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  if (left !== right) failures.push('Skill content differs: ' + name);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Skill parity passed: ' + claude.length + ' aligned skills and ' + claudeWorkflows.length + ' aligned internal workflow references.');
