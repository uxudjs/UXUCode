#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const skills = fs.readdirSync(path.join(root, 'Claude/skills')).filter((name) =>
  fs.existsSync(path.join(root, 'Claude/skills', name, 'SKILL.md'))).sort();
const failures = [];
for (const skill of skills) {
  const relative = path.join('skills', skill, 'SKILL.md');
  const a = fs.readFileSync(path.join(root, 'Claude', relative), 'utf8').replace(/\r\n/g, '\n');
  const b = fs.readFileSync(path.join(root, 'Codex', relative), 'utf8').replace(/\r\n/g, '\n');
  if (a !== b) failures.push(skill);
}
if (failures.length) {
  console.error('Skill parity failed: ' + failures.join(', '));
  process.exit(1);
}
console.log('Skill parity passed: ' + skills.length + ' skill definitions are identical.');
