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
    linkText: '查看完整简体中文使用指南'
  },
  {
    marker: '# 🇹🇼 繁體中文',
    next: '# 🇺🇸 English',
    guide: 'docs/USAGE.zh-TW.md',
    linkText: '查看完整繁體中文使用指南'
  },
  {
    marker: '# 🇺🇸 English',
    next: '## Star History',
    guide: 'docs/USAGE.en.md',
    linkText: 'Read the complete English usage guide'
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
    'git pull origin main',
    '/plugin marketplace update uxu-code-claude',
    '/plugin update uxu-code@uxu-code-claude',
    '/plugin uninstall uxu-code@uxu-code-claude --keep-data',
    '/plugin install uxu-code@uxu-code-claude',
    '/reload-plugins',
    'codex plugin remove uxu-code@uxu-code-codex',
    'codex plugin add uxu-code@uxu-code-codex',
    'https://github.com/colbymchenry/codegraph'
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

console.log('README language parity passed: three aligned sections, guide links, v3 version, and command examples.');
