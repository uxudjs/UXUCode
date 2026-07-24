#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const failures = [];
const definitions = [
  {
    marker: '# 🇨🇳 简体中文',
    next: '# 🇹🇼 繁體中文',
    guide: 'docs/USAGE.zh-CN.md',
    linkText: '查看完整简体中文使用指南',
    updateHeading: '### 更新',
    validationHeading: '## 校验'
  },
  {
    marker: '# 🇹🇼 繁體中文',
    next: '# 🇺🇸 English',
    guide: 'docs/USAGE.zh-TW.md',
    linkText: '查看完整繁體中文使用指南',
    updateHeading: '### 更新',
    validationHeading: '## 驗證'
  },
  {
    marker: '# 🇺🇸 English',
    next: '## Star History',
    guide: 'docs/USAGE.en.md',
    linkText: 'Read the complete English usage guide',
    updateHeading: '### Updating',
    validationHeading: '## Validation'
  }
];

function count(value, search) {
  return value.split(search).length - 1;
}

const sections = definitions.map((definition) => {
  const start = readme.indexOf(definition.marker);
  const end = readme.indexOf(definition.next, start + definition.marker.length);
  if (start < 0 || end < 0) {
    failures.push('README language section is missing or out of order: ' + definition.marker);
    return '';
  }
  return readme.slice(start, end);
});

definitions.forEach((definition, index) => {
  const section = sections[index];
  const hostHeadings = ['### Claude Code', '### Codex CLI', '### OpenClaw'];
  const hostPositions = hostHeadings.map((heading) => section.indexOf(heading));
  if (hostPositions.some((position) => position < 0) ||
      hostPositions.some((position, hostIndex) => hostIndex > 0 && position <= hostPositions[hostIndex - 1])) {
    failures.push(definition.marker + ': host installation headings are missing or out of order');
  }
  const openClawStart = section.indexOf('### OpenClaw');
  const updateStart = section.indexOf(definition.updateHeading, openClawStart);
  const validationStart = section.indexOf(definition.validationHeading, updateStart);
  if (openClawStart < 0 || updateStart < 0 || validationStart < 0) {
    failures.push(definition.marker + ': OpenClaw install, update, and validation sections are missing or out of order');
  }
  for (const installCommand of [
    'node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard --dry-run',
    'node OpenClaw/scripts/install-profile.js --workspace <absolute-workspace-path> --mode standard'
  ]) {
    const position = section.indexOf(installCommand);
    if (position < openClawStart || position >= updateStart) {
      failures.push(definition.marker + ': OpenClaw installation command is outside the host installation block');
    }
  }
  for (const validationToken of [
    'node OpenClaw/scripts/validate-profile.js',
    'OpenClaw/evaluation/README.md',
    'node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js',
    'node OpenClaw/evaluation/score-results.js <results.json>'
  ]) {
    if (section.indexOf(validationToken) < validationStart) {
      failures.push(definition.marker + ': OpenClaw validation content is outside the validation section');
    }
  }
  if (!section.includes('[' + definition.linkText + '](' + definition.guide + ')')) {
    failures.push(definition.marker + ': missing its guide link');
  }
  if (count(readme, definition.guide) !== 1) {
    failures.push(definition.guide + ': expected exactly one README link');
  }
  for (const required of [
    'v3.0.0',
    '/uxu-code:spec',
    '/uxu-code:mode full',
    '@spec',
    '@mode full',
    'OpenClaw/scripts/install-profile.js',
    '--mode standard',
    '--dry-run',
    'node OpenClaw/scripts/validate-profile.js',
    'OpenClaw/evaluation/README.md',
    'node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js',
    'node OpenClaw/evaluation/score-results.js <results.json>',
    '52',
    '35%',
    '95%'
  ]) {
    if (!section.includes(required)) failures.push(definition.marker + ': missing synchronized value ' + required);
  }
});

const headingSignatures = sections.map((section) =>
  [...section.matchAll(/^(#{2,3})\s+/gm)].map((match) => match[1].length).join(',')
);
if (new Set(headingSignatures).size !== 1) {
  failures.push('README language sections do not share the same heading structure');
}

if (failures.length) {
  console.error('README language parity validation failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('README language parity passed: three aligned sections, guide links, coding commands, and OpenClaw profile tokens.');
