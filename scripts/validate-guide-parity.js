#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = ['USAGE.zh-CN.md','USAGE.zh-TW.md','USAGE.en.md'];
const commands = ['help','spec','plan','build','build auto','debug','test','review','simplify','ship','mode <level>','audit','debt','commit','compress <file>','stats','status'];
const modes = ['standard','lite','full','ultra','off'];
const failures = [];
let expectedMarkers = null;
let expectedHeadingCount = null;

for (const file of files) {
  const text = fs.readFileSync(path.join(root, 'docs', file), 'utf8');
  const markers = [...text.matchAll(/<!-- section:(\d+) -->/g)].map((m) => m[1]);
  const headingCount = (text.match(/^#{1,6}\s/gm) || []).length;
  if (!expectedMarkers) expectedMarkers = markers;
  if (expectedHeadingCount === null) expectedHeadingCount = headingCount;
  if (JSON.stringify(markers) !== JSON.stringify(expectedMarkers)) failures.push(file + ': section order differs');
  if (headingCount !== expectedHeadingCount) failures.push(file + ': heading count differs');
  if (markers.join(',') !== '1,2,3,4,5,6,7,8,9,10,11') failures.push(file + ': requires sections 1-11');
  for (const token of commands) if (!text.includes(token)) failures.push(file + ': missing command ' + token);
  for (const mode of modes) if (!text.includes(mode)) failures.push(file + ': missing mode ' + mode);
  for (const token of ['GO','NO-GO','Blocker','Recommended','Acknowledged','.uxucode-state.json']) {
    if (!text.includes(token)) failures.push(file + ': missing ' + token);
  }
}
if (failures.length) { failures.forEach((x) => console.error('- ' + x)); process.exit(1); }
console.log('Guide parity passed: 11 aligned sections, 17 command forms, 5 modes, and release-gate semantics.');
