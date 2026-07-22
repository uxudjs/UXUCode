#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const required = [
  'RGlldHJpY2hHZWJlcnQvcG9ueXRhaWw=',
  'YWRkeW9zbWFuaS9hZ2VudC1za2lsbHM=',
  'bXVsdGljYS1haS9hbmRyZWota2FycGF0aHktc2tpbGxz',
  'SnVsaXVzQnJ1c3NlZS9jYXZlbWFu'
].map((value) => Buffer.from(value, 'base64').toString('utf8'));
const failures = [];

for (const project of required) {
  if (!notices.includes(project)) failures.push('THIRD_PARTY_NOTICES.md missing ' + project);
  if (!readme.includes(project)) failures.push('README.md missing acknowledgement ' + project);
}
for (const phrase of ['Permission is hereby granted', 'THE SOFTWARE IS PROVIDED "AS IS"']) {
  if (!notices.includes(phrase)) failures.push('THIRD_PARTY_NOTICES.md missing MIT phrase: ' + phrase);
}
if (!fs.existsSync(path.join(root, 'LICENSE'))) failures.push('LICENSE is missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Third-party notice validation passed.');
