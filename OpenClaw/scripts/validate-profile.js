#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const BEGIN_MARKER = '<!-- UXUCODE:OPENCLAW:BEGIN -->';
const END_MARKER = '<!-- UXUCODE:OPENCLAW:END -->';
const MODE_PATTERN = /<!-- UXUCODE:MODE ([a-z]+) -->/g;
const VALID_MODES = ['standard', 'lite', 'full', 'ultra', 'off'];
const REQUIRED_TEMPLATES = {
  'SOUL.md': ['# SOUL.md', '## Persona', '## Boundaries', '## Tone', '## Continuity'],
  'IDENTITY.md': ['# IDENTITY.md', '- Name:', '- Role:', '- Vibe:', '- Emoji:', '- Avatar:']
};

function count(value, search) {
  return value.split(search).length - 1;
}

function validateProfile(content) {
  const failures = [];
  const beginCount = count(content, BEGIN_MARKER);
  const endCount = count(content, END_MARKER);
  const declarations = [...content.matchAll(MODE_PATTERN)].map((match) => match[1]);

  if (beginCount !== 1) failures.push('profile must contain exactly one begin marker');
  if (endCount !== 1) failures.push('profile must contain exactly one end marker');

  const firstBegin = content.indexOf(BEGIN_MARKER);
  const secondBegin = content.indexOf(BEGIN_MARKER, firstBegin + BEGIN_MARKER.length);
  const firstEnd = content.indexOf(END_MARKER);
  if (secondBegin >= 0 && firstEnd >= 0 && secondBegin < firstEnd) {
    failures.push('profile contains nested managed markers');
  }
  if (firstBegin >= 0 && firstEnd >= 0 && firstBegin > firstEnd) {
    failures.push('managed markers are out of order');
  }

  if (declarations.length !== 1) {
    failures.push('profile must contain exactly one mode declaration');
  } else if (!VALID_MODES.includes(declarations[0])) {
    failures.push(`profile has invalid mode: ${declarations[0]}`);
  }

  for (const mode of VALID_MODES) {
    if (!content.includes(`\`${mode}\``)) failures.push(`profile is missing mode: ${mode}`);
  }
  if (!content.includes('`standard` is the shipped default')) {
    failures.push('profile must identify standard as the shipped default');
  }

  for (const heading of [
    '## Scope control',
    '## Execution control',
    '## Output control',
    '## Unconditional detail restoration',
    '## OpenClaw context control'
  ]) {
    if (!content.includes(heading)) failures.push(`profile is missing section: ${heading}`);
  }

  const policy = content
    .replace(BEGIN_MARKER, '')
    .replace(END_MARKER, '')
    .replace(MODE_PATTERN, '');
  const wordCount = policy.match(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)?.length || 0;
  if (wordCount > 450) failures.push(`profile exceeds 450 English words: ${wordCount}`);

  if (/%APPDATA%[\\/]+uxucode|[\\/]uxucode[\\/]config\.json/i.test(content)) {
    failures.push('profile contains a forbidden shared configuration reference');
  }

  return failures;
}

function walk(root, directory = root) {
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    entries.push(path.relative(root, absolute).replace(/\\/g, '/'));
    if (entry.isDirectory()) entries.push(...walk(root, absolute));
  }
  return entries;
}

function validatePackage(root) {
  const fragmentPath = path.join(root, 'AGENTS.fragment.md');
  if (!fs.existsSync(fragmentPath)) return ['AGENTS.fragment.md is missing'];

  const failures = validateProfile(fs.readFileSync(fragmentPath, 'utf8'));
  for (const [name, requiredValues] of Object.entries(REQUIRED_TEMPLATES)) {
    const templatePath = path.join(root, 'templates', name);
    if (!fs.existsSync(templatePath)) {
      failures.push(`templates/${name} is missing`);
      continue;
    }
    const content = fs.readFileSync(templatePath, 'utf8');
    for (const required of requiredValues) {
      if (!content.includes(required)) failures.push(`templates/${name} is missing required value: ${required}`);
    }
  }
  for (const relative of walk(root)) {
    const segments = relative.toLowerCase().split('/');
    const name = segments.at(-1);
    if (segments.includes('skills')) failures.push(`${relative}: forbidden skill scaffolding`);
    if (segments.includes('hooks')) failures.push(`${relative}: forbidden hook scaffolding`);
    if (name === 'plugin.json' || name === 'manifest.json' || segments.includes('.claude-plugin') || segments.includes('.codex-plugin')) {
      failures.push(`${relative}: forbidden plugin scaffolding`);
    }
    if (name.endsWith('.md')) {
      const content = fs.readFileSync(path.join(root, relative), 'utf8');
      if (/--workspace\s+<[^>\r\n]+>/.test(content)) {
        failures.push(`${relative}: unquoted workspace placeholder is unsafe in PowerShell`);
      }
    }
  }
  return failures;
}

function main() {
  const root = path.resolve(__dirname, '..');
  const failures = validatePackage(root);
  if (failures.length) {
    console.error(`OpenClaw profile validation failed (${failures.length}):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log('OpenClaw profile validation passed: compact standard-default workspace policy, native workspace templates, and no plugin, hook, or skill scaffolding.');
}

if (require.main === module) main();

module.exports = {
  BEGIN_MARKER,
  END_MARKER,
  VALID_MODES,
  validatePackage,
  validateProfile
};
