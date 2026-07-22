#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['USAGE.zh-CN.md', 'USAGE.zh-TW.md', 'USAGE.en.md'];
const guides = files.map((file) => fs.readFileSync(path.join(root, 'docs', file), 'utf8'));
const failures = [];
const structure = (value) => [...value.matchAll(/^(#{2,3})\s+(\d+(?:\.\d+)?)\./gm)]
  .map((match) => match[1] + ':' + match[2]);
const commands = ['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status'];
const modes = ['standard', 'lite', 'full', 'ultra', 'off'];
const baseline = JSON.stringify(structure(guides[0]));
const tick = String.fromCharCode(96);

guides.forEach((guide, index) => {
  if (JSON.stringify(structure(guide)) !== baseline) failures.push(files[index] + ': heading structure differs');
  for (const command of commands) {
    if (!guide.includes('/uxu-code:' + command) || !guide.includes('@' + command)) failures.push(files[index] + ': missing paired command ' + command);
  }
  for (const mode of modes) {
    if (!guide.includes(tick + mode + tick)) failures.push(files[index] + ': missing mode ' + mode);
  }
  for (const term of ['Blocker', 'Recommended', 'Acknowledged', 'GO', 'NO-GO']) {
    if (!guide.includes(term)) failures.push(files[index] + ': missing ship term ' + term);
  }
  if ((guide.match(/\x60{3}/g) || []).length % 2 !== 0) failures.push(files[index] + ': unbalanced code fences');
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Guide parity passed: structure, commands, modes, and ship gate are aligned.');
