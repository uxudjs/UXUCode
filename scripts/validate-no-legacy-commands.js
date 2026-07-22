#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const scanRoots = ['Claude','Codex','docs'];
const allowedSkills = new Set(['help','spec','plan','build','debug','test','review','simplify','ship','mode','audit','debt','commit','compress','stats','status','implementation-policy','output-policy','using-uxucode']);
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name === 'scripts') continue;
    if (entry.isSymbolicLink()) failures.push(path.relative(root, full) + ': symlink is not allowed');
    else if (entry.isDirectory()) walk(full);
    else if (/\.(?:md|js|json|sh|ps1)$/i.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (/ponytail|caveman/i.test(text)) failures.push(path.relative(root, full) + ': source brand in runtime or guide');
      if (/legacyAliases|compat(?:ibility)?\s*(?:alias|command)|hidden alias/i.test(text)) failures.push(path.relative(root, full) + ': compatibility layer detected');
    }
  }
}
scanRoots.forEach((item) => walk(path.join(root, item)));
for (const platform of ['Claude','Codex']) {
  const skills = fs.readdirSync(path.join(root, platform, 'skills'));
  for (const skill of skills) {
    if (fs.existsSync(path.join(root, platform, 'skills', skill, 'SKILL.md')) && !allowedSkills.has(skill)) {
      failures.push(platform + '/skills/' + skill + ': unsupported user entry');
    }
  }
}
if (failures.length) { failures.forEach((x) => console.error('- ' + x)); process.exit(1); }
console.log('Legacy-command validation passed: no source-branded runtime entry, alias layer, or extra skill.');
