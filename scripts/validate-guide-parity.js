#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['USAGE.zh-CN.md', 'USAGE.zh-TW.md', 'USAGE.en.md'];
const guides = files.map((file) => fs.readFileSync(path.join(root, 'docs', file), 'utf8'));
const workspacePlaceholders = [
  '<请替换为OpenClaw工作区绝对路径>',
  '<請替換為OpenClaw工作區絕對路徑>',
  '<replace-with-absolute-openclaw-workspace-path>'
];
const failures = [];
const structure = (value) => [...value.matchAll(/^(#{2,3})\s+(\d+(?:\.\d+)?)\./gm)]
  .map((match) => match[1] + ':' + match[2]);
const commands = ['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status'];
const modes = ['standard', 'lite', 'full', 'ultra', 'off'];
const baseline = JSON.stringify(structure(guides[0]));
const tick = String.fromCharCode(96);
const sectionBetween = (value, start, end) => {
  const startIndex = value.indexOf(start);
  const endIndex = end ? value.indexOf(end, startIndex + start.length) : value.length;
  return startIndex >= 0 && endIndex >= 0 ? value.slice(startIndex, endIndex) : '';
};

guides.forEach((guide, index) => {
  const workspacePlaceholder = workspacePlaceholders[index];
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
  for (const required of [
    'OpenClaw/README.md',
    'OpenClaw/scripts/install-profile.js',
    '--mode standard',
    '--dry-run',
    'node OpenClaw/scripts/validate-profile.js',
    'OpenClaw/evaluation/README.md',
    'node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js',
    'node OpenClaw/evaluation/score-results.js <results.json>',
    'OpenClaw/templates/SOUL.md',
    'OpenClaw/templates/IDENTITY.md',
    '52',
    '35%',
    '95%',
    'AGENTS.md.uxucode-backup-*'
  ]) {
    if (!guide.includes(required)) failures.push(files[index] + ': missing OpenClaw value ' + required);
  }
  const installSection = sectionBetween(guide, '## 3.', '## 4.');
  const openClawSection = sectionBetween(guide, '## 12.');
  const validationSection = sectionBetween(guide, '### 12.4');
  for (const installCommand of [
    `node OpenClaw/scripts/install-profile.js --workspace "${workspacePlaceholder}" --mode standard --dry-run`,
    `node OpenClaw/scripts/install-profile.js --workspace "${workspacePlaceholder}" --mode standard`
  ]) {
    if (!installSection.includes(installCommand)) {
      failures.push(files[index] + ': OpenClaw installation command is not aligned with the host installation template');
    }
    if (openClawSection.includes(installCommand)) {
      failures.push(files[index] + ': OpenClaw installation command is duplicated in the detailed profile section');
    }
  }
  for (const validationToken of [
    'node OpenClaw/scripts/validate-profile.js',
    'OpenClaw/evaluation/README.md',
    'node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js',
    'node OpenClaw/evaluation/score-results.js <results.json>'
  ]) {
    if (!validationSection.includes(validationToken)) {
      failures.push(files[index] + ': OpenClaw evaluation content is outside section 12.4');
    }
  }
  if (/--workspace\s+<[^>\r\n]+>/.test(guide)) {
    failures.push(files[index] + ': contains an unquoted workspace placeholder that PowerShell cannot parse');
  }
  if ((guide.match(/\x60{3}/g) || []).length % 2 !== 0) failures.push(files[index] + ': unbalanced code fences');
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Guide parity passed: structure, coding commands, modes, ship gate, and OpenClaw profile tokens are aligned.');
