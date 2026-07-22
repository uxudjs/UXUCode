#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];
const fail = (message) => failures.push(message);

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    fail(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function requirePath(relativePath, label = relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`${label}: missing (${relativePath})`);
}

const manifest = readJson('.claude-plugin/plugin.json');
const marketplace = readJson('.claude-plugin/marketplace.json');
const hooks = readJson('hooks/hooks.json');

if (manifest) {
  if (manifest.name !== 'uxu-code') fail('manifest: unexpected plugin name');
  if (manifest.version !== '3.0.0') fail('manifest: expected version 3.0.0');
  if (manifest.skills !== './skills/') fail('manifest: skills must be ./skills/');
  if (manifest.hooks !== './hooks/hooks.json') fail('manifest: hooks must be ./hooks/hooks.json');
}
if (marketplace?.name !== 'uxu-code-claude') fail('marketplace: unexpected name');
if (marketplace?.plugins?.[0]?.source !== './') fail('marketplace: plugin source must be ./');
if (JSON.stringify(hooks).includes('PLUGIN_ROOT') && !JSON.stringify(hooks).includes('CLAUDE_PLUGIN_ROOT')) {
  fail('hooks: Claude hooks must use CLAUDE_PLUGIN_ROOT');
}

for (const file of ['CLAUDE.md', 'hooks/hooks.json', 'hooks/uxu-session-start.js', 'hooks/uxu-prompt-router.js', 'hooks/uxu-subagent-start.js', 'hooks/uxu-statusline.js']) requirePath(file);
for (const file of ['investigator.md', 'builder.md', 'reviewer.md', 'security-reviewer.md', 'test-reviewer.md']) requirePath(path.join('agents', file), 'agent');
for (const file of ['accessibility-checklist.md', 'definition-of-done.md', 'observability-checklist.md', 'orchestration-patterns.md', 'performance-checklist.md', 'security-checklist.md', 'testing-patterns.md']) {
  requirePath(path.join('references', file), 'reference');
}

const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const expectedSkills = ['audit', 'build', 'commit', 'compress', 'debt', 'debug', 'help', 'implementation-policy', 'mode', 'output-policy', 'plan', 'review', 'ship', 'simplify', 'spec', 'stats', 'status', 'test', 'using-uxucode'].sort();
const names = new Set();
for (const directory of skillDirs) {
  const relativePath = path.join('skills', directory, 'SKILL.md');
  requirePath(relativePath);
  if (!fs.existsSync(path.join(root, relativePath))) continue;
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const name = frontmatter?.[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (!frontmatter) fail(`${relativePath}: missing YAML frontmatter`);
  if (name !== directory) fail(`${relativePath}: name must match directory`);
  if (names.has(name)) fail(`${relativePath}: duplicate skill name`);
  names.add(name);
}
if (JSON.stringify(skillDirs) !== JSON.stringify(expectedSkills)) fail(`skills: expected ${expectedSkills.join(', ')}, found ${skillDirs.join(', ')}`);

if (hooks) {
  const expected = {
    SessionStart: 'uxu-session-start.js',
    SubagentStart: 'uxu-subagent-start.js',
    UserPromptSubmit: 'uxu-prompt-router.js'
  };
  for (const [event, script] of Object.entries(expected)) {
    const entries = hooks.hooks?.[event] || [];
    const commands = entries.flatMap((entry) => entry.hooks || []);
    if (commands.length !== 1 || !JSON.stringify(commands[0]).includes(script)) fail(`hooks: ${event} must contain exactly ${script}`);
  }
}

if (failures.length) {
  console.error(`Claude validation failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Claude validation passed: ${skillDirs.length} skills, native manifest, marketplace, and hooks.`);
