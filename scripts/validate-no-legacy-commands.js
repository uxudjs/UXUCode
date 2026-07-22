#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const allowedBrandFiles = new Set(['README.md', 'THIRD_PARTY_NOTICES.md']);
const encodedForbiddenText = [
  'cG9ueXRhaWw=',
  'Y2F2ZW1hbg==',
  'YWdlbnQtc2tpbGxz',
  'YW5kcmVqLWthcnBhdGh5LXNraWxscw==',
  'L2NvZGUtc2ltcGxpZnk=',
  'L3Bvbnl0YWls',
  'QHBvbnl0YWls',
  'L3V4dS1jb2RlOmJ1aWxkIGFsbA==',
  'QGJ1aWxkIGFsbA==',
  'bGVnYWN5QWxpYXNlcw=='
];
const legacyPatterns = encodedForbiddenText
  .map((value) => new RegExp(Buffer.from(value, 'base64').toString('utf8'), 'i'));
const failures = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else {
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (allowedBrandFiles.has(relative)) continue;
      const value = fs.readFileSync(absolute, 'utf8');
      for (const pattern of legacyPatterns) {
        if (pattern.test(value)) failures.push(relative + ': forbidden legacy/source entry matches ' + pattern);
      }
    }
  }
}
walk(root);

for (const pkg of ['Claude', 'Codex']) {
  const hooks = fs.readdirSync(path.join(root, pkg, 'hooks')).sort();
  const expected = ['hooks.json', 'uxu-prompt-router.js', 'uxu-session-start.js', 'uxu-statusline.js', 'uxu-subagent-start.js'];
  if (JSON.stringify(hooks) !== JSON.stringify(expected)) failures.push(pkg + ': unexpected hook files: ' + hooks.join(', '));
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Legacy-command validation passed: no aliases, source-branded entries, or duplicate hooks.');
