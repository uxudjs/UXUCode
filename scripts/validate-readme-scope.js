#!/usr/bin/env node

const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
let diff = '';
try {
  diff = execFileSync('git', ['diff', '--unified=0', 'HEAD', '--', 'README.md'], { cwd: root, encoding: 'utf8' });
} catch (error) {
  console.error('Unable to inspect README diff: ' + error.message);
  process.exit(1);
}
const changes = diff.split(/\r?\n/).filter((line) =>
  (line.startsWith('+') && !line.startsWith('+++')) ||
  (line.startsWith('-') && !line.startsWith('---'))
);
const acknowledgement = Buffer.from('Ky0gICBKdWxpdXNCcnVzc2VlL2NhdmVtYW4=', 'base64').toString('utf8');
const expected = [acknowledgement, acknowledgement, acknowledgement];

if (JSON.stringify(changes) !== JSON.stringify(expected)) {
  console.error('README scope validation failed. Only the three new acknowledgement lines may change.');
  console.error(changes.join('\n'));
  process.exit(1);
}
console.log('README scope validation passed: only three acknowledgement lines changed.');
