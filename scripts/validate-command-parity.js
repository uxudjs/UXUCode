#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const commandNames = ['help','spec','plan','build','debug','test','review','simplify','ship','mode','audit','debt','commit','compress','stats','status'];
const allSkills = ['audit','build','commit','compress','debt','debug','help','implementation-policy','mode','output-policy','plan','review','ship','simplify','spec','stats','status','test','using-uxucode'].sort();

function dirs(platform) {
  return fs.readdirSync(path.join(root, platform, 'skills'), {withFileTypes:true})
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, platform, 'skills', entry.name, 'SKILL.md')))
    .map((entry) => entry.name).sort();
}
const claude = dirs('Claude');
const codex = dirs('Codex');
const failures = [];
if (JSON.stringify(claude) !== JSON.stringify(allSkills)) failures.push('Claude skill set differs from the UXUCode contract');
if (JSON.stringify(codex) !== JSON.stringify(allSkills)) failures.push('Codex skill set differs from the UXUCode contract');
if (JSON.stringify(claude) !== JSON.stringify(codex)) failures.push('Claude and Codex skill sets differ');

for (const platform of ['Claude','Codex']) {
  const router = fs.readFileSync(path.join(root, platform, 'hooks/uxu-prompt-router.js'), 'utf8');
  for (const name of commandNames) if (!router.includes("'" + name + "'")) failures.push(platform + ' router missing ' + name);
  for (const mode of ['standard','lite','full','ultra','off']) if (!router.includes("'" + mode + "'")) failures.push(platform + ' router missing mode ' + mode);
}
if (failures.length) { failures.forEach((x) => console.error('- ' + x)); process.exit(1); }
console.log('Command parity passed: 16 commands and 5 modes align across Claude and Codex.');
