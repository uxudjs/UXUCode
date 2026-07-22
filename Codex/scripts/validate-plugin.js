#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const platform = path.basename(root);
const failures = [];
const expectedSkills = [
  'audit', 'build', 'commit', 'compress', 'debt', 'debug', 'help',
  'implementation-policy', 'mode', 'output-policy', 'plan', 'review',
  'ship', 'simplify', 'spec', 'stats', 'status', 'test', 'using-uxucode'
];
const expectedHooks = [
  'hooks.json', 'uxu-prompt-router.js', 'uxu-session-start.js',
  'uxu-statusline.js', 'uxu-subagent-start.js'
];
const expectedAgents = [
  'builder.md', 'investigator.md', 'reviewer.md',
  'security-reviewer.md', 'test-reviewer.md'
];

function fail(message) { failures.push(message); }
function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')); }
  catch (error) { fail(relative + ': invalid JSON (' + error.message + ')'); return null; }
}
function files(relative) {
  try { return fs.readdirSync(path.join(root, relative)).sort(); }
  catch (_) { fail(relative + ': missing'); return []; }
}
function skillDirs() {
  return files('skills').filter((name) => fs.existsSync(path.join(root, 'skills', name, 'SKILL.md')));
}
function same(label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(label + ': expected [' + expected.join(', ') + '], found [' + actual.join(', ') + ']');
  }
}

const manifestPath = platform === 'Claude'
  ? '.claude-plugin/plugin.json' : '.codex-plugin/plugin.json';
const marketplacePath = platform === 'Claude'
  ? '.claude-plugin/marketplace.json' : '.agents/plugins/marketplace.json';
const manifest = readJson(manifestPath);
const marketplace = readJson(marketplacePath);
const hooks = readJson('hooks/hooks.json');

if (manifest?.name !== 'uxu-code') fail('manifest: name must be uxu-code');
if (manifest?.version !== '3.0.0') fail('manifest: version must be 3.0.0');
if (manifest?.skills !== './skills/') fail('manifest: skills path must be ./skills/');
if (manifest?.hooks !== './hooks/hooks.json') fail('manifest: hooks path must be ./hooks/hooks.json');
if (!marketplace) fail('marketplace: missing');

same('skills', skillDirs(), expectedSkills);
same('hooks', files('hooks'), expectedHooks);
same('agents', files('agents'), expectedAgents);

for (const skill of expectedSkills) {
  const file = path.join(root, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(file)) { fail('skill missing: ' + skill); continue; }
  const content = fs.readFileSync(file, 'utf8');
  const name = content.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (name !== skill) fail('skill name mismatch: ' + skill);
}
const hookText = JSON.stringify(hooks || {});
for (const event of ['SessionStart', 'SubagentStart', 'UserPromptSubmit']) {
  if (!hooks?.hooks?.[event] || hooks.hooks[event].length !== 1) {
    fail('hooks: expected one ' + event + ' registration');
  }
}
const expectedRoot = platform === 'Claude' ? 'CLAUDE_PLUGIN_ROOT' : 'PLUGIN_ROOT';
if (!hookText.includes(expectedRoot)) fail('hooks: missing ' + expectedRoot);
if (/ponytail|caveman/i.test(
  fs.readFileSync(manifestPath.startsWith('.') ? path.join(root, manifestPath) : manifestPath, 'utf8') + hookText
)) fail('runtime manifest or hooks contain a source brand');

if (failures.length) {
  console.error(platform + ' validation failed (' + failures.length + '):');
  failures.forEach((item) => console.error('- ' + item));
  process.exit(1);
}
console.log(platform + ' validation passed: 19 aligned skills, 5 agents, 3 lifecycle hooks, and one statusline.');
