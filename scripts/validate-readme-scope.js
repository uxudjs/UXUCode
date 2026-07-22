#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const current = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
let baseline;
const baselineCommit = 'f22c6843144d7f4a455506a50b79995312d76106';
try { baseline = cp.execFileSync('git', ['show', baselineCommit + ':README.md'], {cwd:root, encoding:'utf8'}); }
catch (error) { console.error('Cannot read README baseline: ' + error.message); process.exit(1); }
const cavemanLine = /^\s*-\s+JuliusBrussee\/caveman\s*\r?\n/gm;
const stripped = current.replace(cavemanLine, '');
if (stripped.replace(/\r\n/g,'\n') !== baseline.replace(/\r\n/g,'\n')) {
  console.error('README scope validation failed: changes exceed the three Caveman acknowledgement lines.');
  process.exit(1);
}
const count = (current.match(/JuliusBrussee\/caveman/g) || []).length;
if (count !== 3) { console.error('README scope validation failed: expected 3 Caveman acknowledgements, found ' + count); process.exit(1); }
console.log('README scope validation passed: only three acknowledgement lines were added.');
