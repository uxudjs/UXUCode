const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { validateGuides } = require('../../scripts/validate-guide-parity');
const { validateReadme } = require('../../scripts/validate-readme-scope');

const root = path.resolve(__dirname, '..', '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const guideFiles = ['USAGE.zh-CN.md', 'USAGE.zh-TW.md', 'USAGE.en.md'];
const guides = guideFiles.map((file) => fs.readFileSync(path.join(root, 'docs', file), 'utf8'));

function transformSection(content, start, end, transform) {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `missing fixture section: ${start} -> ${end}`);
  return content.slice(0, startIndex) +
    transform(content.slice(startIndex, endIndex)) +
    content.slice(endIndex);
}

function moveToken(section, token, before) {
  assert.equal(section.split(token).length - 1, 1, `expected one fixture token: ${token}`);
  assert.ok(section.includes(before), `missing fixture target: ${before}`);
  return section.replace(token, '').replace(before, `${token}\n${before}`);
}

test('documentation validators accept the canonical README and guides', () => {
  assert.deepEqual(validateReadme(readme), []);
  assert.deepEqual(validateGuides(guides), []);
});

test('unified validation runs the documentation validator contract tests', () => {
  const { steps } = require('../../scripts/validate-all');
  const workflowContracts = steps.find((step) => step.name === 'workflow contracts');
  assert.ok(workflowContracts);
  assert.ok(workflowContracts.args.includes('work-products/tests/documentation-validator-contract.test.js'));
});

test('README validator rejects Codex installation commands placed under OpenClaw', () => {
  const commands = [
    'codex plugin marketplace add ./Codex',
    'codex plugin add uxu-code@uxu-code-codex'
  ].join('\n');
  const misplaced = transformSection(
    readme,
    '## 快速安装',
    '## 第一次使用与验证',
    (section) => moveToken(section, commands, '在系统终端、UXUCode 仓库根目录中')
  );

  assert.ok(
    validateReadme(misplaced).some((failure) => failure.includes('Codex CLI installation')),
    'expected the README validator to reject Codex commands outside the Codex subsection'
  );
});

test('README validator rejects Codex first-use verification placed under Claude Code', () => {
  const misplaced = transformSection(
    readme,
    '## 第一次使用与验证',
    '## 更新',
    (section) => moveToken(section, '@help', '### Codex CLI')
  );

  assert.ok(
    validateReadme(misplaced).some((failure) => failure.includes('Codex CLI verification')),
    'expected the README validator to reject @help outside the Codex subsection'
  );
});

test('guide validator rejects OpenClaw update guidance placed under Codex', () => {
  const misplacedEnglish = transformSection(
    guides[2],
    '### 9.1 Updating',
    '### 9.2 Removal and Rollback',
    (section) => moveToken(section, 'OpenClaw/scripts/install-profile.js', '#### OpenClaw')
  );

  assert.ok(
    validateGuides([guides[0], guides[1], misplacedEnglish])
      .some((failure) => failure.includes('OpenClaw update')),
    'expected the guide validator to reject OpenClaw update guidance outside the OpenClaw subsection'
  );
});

test('README validator allows unrelated version numbers and percentages', () => {
  const harmless = transformSection(
    readme,
    '## What It Does',
    '## Choose a Host',
    (section) => `${section}\nExample version: v3.0.52. Ordinary progress: 95%.\n`
  );

  assert.deepEqual(validateReadme(harmless), []);
});

test('guide validator allows unrelated version numbers and percentages', () => {
  const harmlessEnglish = transformSection(
    guides[2],
    '## 1.',
    '## 2.',
    (section) => `${section}\nExample version: v3.0.52. Ordinary progress: 95%.\n`
  );

  assert.deepEqual(validateGuides([guides[0], guides[1], harmlessEnglish]), []);
});

test('README validator rejects contextual OpenClaw evaluation details', () => {
  const leaked = transformSection(
    readme,
    '## What It Does',
    '## Choose a Host',
    (section) => `${section}\nOpenClaw evaluation uses 52 cases and requires a 35% token reduction with 95% low-risk correctness.\n`
  );

  assert.ok(
    validateReadme(leaked).some((failure) => failure.includes('evaluation detail')),
    'expected the README validator to reject contextual OpenClaw evaluation details'
  );
});

test('guide validator rejects contextual OpenClaw evaluation details', () => {
  const leakedEnglish = transformSection(
    guides[2],
    '## 1.',
    '## 2.',
    (section) => `${section}\nOpenClaw evaluation uses 52 cases and requires a 35% token reduction with 95% low-risk correctness.\n`
  );

  assert.ok(
    validateGuides([guides[0], guides[1], leakedEnglish])
      .some((failure) => failure.includes('evaluation detail')),
    'expected the guide validator to reject contextual OpenClaw evaluation details'
  );
});

test('guide validator rejects missing clean apply and safety boundaries', () => {
  const missingApply = guides[2].replace('@clean apply', '@clean run');
  const missingSafety = guides[2].replace(
    '`clean` is not a delete command.',
    '`clean` organizes files.'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingApply])
      .some((failure) => failure.includes('clean contract')),
    'expected the guide validator to require the exact clean apply form'
  );
  assert.ok(
    validateGuides([guides[0], guides[1], missingSafety])
      .some((failure) => failure.includes('clean contract')),
    'expected the guide validator to require the non-deletion safety boundary'
  );
});

test('guide validator requires canonical test placement and relative repository paths', () => {
  const missingDestination = guides[2].replace(
    'into `work-products/tests/`',
    'within the project'
  );
  const missingRelativePolicy = guides[2].replace(
    'Tests must reference repository files with relative paths from their final location, never machine-specific absolute paths.',
    'Tests may reference repository files according to local conventions.'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingDestination])
      .some((failure) => failure.includes('canonical internal-test destination')),
    'expected the guide validator to require the clean destination'
  );
  assert.ok(
    validateGuides([guides[0], guides[1], missingRelativePolicy])
      .some((failure) => failure.includes('relative test-path policy')),
    'expected the guide validator to require relative repository paths'
  );
});

test('documentation validators require the complete clean safety boundary', () => {
  const missingGuideBoundary = guides[2].replace(
    'ambiguous bare strings',
    'ambiguous values'
  );
  const missingReadmeBoundary = readme.replace(
    'duplicate targets',
    'conflicts'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingGuideBoundary])
      .some((failure) => failure.includes('clean safety contract')),
    'expected the guide validator to require ambiguous bare-string blocking'
  );
  assert.ok(
    validateReadme(missingReadmeBoundary)
      .some((failure) => failure.includes('clean safety contract')),
    'expected the README validator to require duplicate-target blocking'
  );
});

test('README validator requires the concise clean contract in every language', () => {
  const missingEnglishClean = transformSection(
    readme,
    '## What It Does',
    '## Choose a Host',
    (section) => section.replace('@clean', '@tidy')
  );

  assert.ok(
    validateReadme(missingEnglishClean).some((failure) => failure.includes('clean contract')),
    'expected the README validator to require paired clean guidance'
  );
});

test('documentation validators reject organize commands but allow ordinary prose', () => {
  const harmlessGuide = `${guides[2]}\nTeams may organize project files manually.\n`;
  const aliasGuide = `${guides[2]}\nUse @organize.\n`;

  assert.deepEqual(validateGuides([guides[0], guides[1], harmlessGuide]), []);
  assert.ok(
    validateGuides([guides[0], guides[1], aliasGuide])
      .some((failure) => failure.includes('organize alias')),
    'expected the guide validator to reject a public organize alias'
  );
});
