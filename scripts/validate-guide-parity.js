#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['USAGE.zh-CN.md', 'USAGE.zh-TW.md', 'USAGE.en.md'];
const definitions = [
  {
    workspacePlaceholder: '<请替换为OpenClaw工作区绝对路径>',
    systemTerminal: '在系统终端',
    claudeSession: '进入 Claude Code 会话后',
    newOpenClawSession: '启动新的 OpenClaw 会话',
    testException: '以项目约定为准',
    evidenceBoundary: '不证明真实 Marketplace 安装'
  },
  {
    workspacePlaceholder: '<請替換為OpenClaw工作區絕對路徑>',
    systemTerminal: '在系統終端',
    claudeSession: '進入 Claude Code 工作階段後',
    newOpenClawSession: '啟動新的 OpenClaw 工作階段',
    testException: '以專案約定為準',
    evidenceBoundary: '不證明真實 Marketplace 安裝'
  },
  {
    workspacePlaceholder: '<replace-with-absolute-openclaw-workspace-path>',
    systemTerminal: 'In a system terminal',
    claudeSession: 'After entering the Claude Code session',
    newOpenClawSession: 'Start a new OpenClaw session',
    testException: 'follow the project convention',
    evidenceBoundary: 'does not prove a live Marketplace installation'
  }
];
const commands = ['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status', 'clean'];
const modes = ['standard', 'lite', 'full', 'ultra', 'off'];
const evaluationDetailPatterns = [
  { pattern: /\b52\b[^\r\n]{0,80}\b(?:evaluation\s+)?cases?\b/i, label: '52 evaluation cases' },
  { pattern: /(?:评测|評測|测试|測試)[^\r\n]{0,80}52\s*(?:个|個)?\s*(?:用例|案例)/i, label: '52 evaluation cases' },
  { pattern: /52\s*(?:个|個)\s*(?:评测|評測|测试|測試)?(?:用例|案例)/i, label: '52 evaluation cases' },
  { pattern: /35%[^\r\n]{0,80}(?:token|令牌|權杖|阈值|閾值|門檻|threshold|reduction|减少|減少)/i, label: '35% evaluation threshold' },
  { pattern: /(?:token|令牌|權杖|阈值|閾值|門檻|threshold|reduction|减少|減少)[^\r\n]{0,80}35%/i, label: '35% evaluation threshold' },
  { pattern: /95%[^\r\n]{0,80}(?:correctness|正确|正確|低风险|低風險|threshold|阈值|閾值|門檻)/i, label: '95% evaluation threshold' },
  { pattern: /(?:correctness|正确|正確|低风险|低風險|threshold|阈值|閾值|門檻)[^\r\n]{0,80}95%/i, label: '95% evaluation threshold' }
];
const generatedPaths = [
  'work-products/SPEC.md',
  'work-products/plan.md',
  'work-products/todo.md',
  'work-products/debug/',
  'work-products/reviews/',
  'work-products/ship/',
  'work-products/tests/'
];
const expectedStructure = [
  '2:1', '2:2', '2:3', '3:3.1', '3:3.2', '3:3.3',
  '2:4', '3:4.1', '3:4.2', '3:4.3',
  '2:5', '2:6', '3:6.1', '3:6.2', '2:7', '2:8',
  '2:9', '3:9.1', '3:9.2', '3:9.3',
  '2:10', '3:10.1', '3:10.2',
  '2:11', '3:11.1', '3:11.2', '3:11.3',
  '2:12', '3:12.1', '3:12.2'
];
const tick = String.fromCharCode(96);

function count(value, search) {
  return value.split(search).length - 1;
}

function structure(value) {
  return [...value.matchAll(/^(#{2,3})\s+(\d+(?:\.\d+)?)(?:\.|\s)/gm)]
    .map((match) => match[1].length + ':' + match[2]);
}

function headingLevels(value) {
  return [...value.matchAll(/^(#{2,4})\s+/gm)].map((match) => match[1].length).join(',');
}

function sectionBetween(value, start, end) {
  const startIndex = value.indexOf(start);
  const endIndex = end ? value.indexOf(end, startIndex + start.length) : value.length;
  return startIndex >= 0 && endIndex >= 0 ? value.slice(startIndex, endIndex) : '';
}

function requireOrdered(scope, tokens, message, failures) {
  let previous = -1;
  for (const token of tokens) {
    const position = scope.indexOf(token);
    if (position < 0 || position <= previous) {
      failures.push(message + ': missing or out of order ' + token);
      return;
    }
    previous = position;
  }
}

function validateGuides(guides) {
const failures = [];
const baselineLevels = headingLevels(guides[0]);

guides.forEach((guide, index) => {
  const file = files[index];
  const definition = definitions[index];
  const guideStructure = structure(guide);
  if (JSON.stringify(guideStructure) !== JSON.stringify(expectedStructure)) {
    failures.push(file + ': expected the aligned 12-section user-guide structure');
  }
  if (headingLevels(guide) !== baselineLevels) {
    failures.push(file + ': heading levels differ from the Simplified Chinese guide');
  }

  for (const command of commands) {
    if (!guide.includes('/uxu-code:' + command) || !guide.includes('@' + command)) {
      failures.push(file + ': missing paired command ' + command);
    }
  }
  for (const mode of modes) {
    if (!guide.includes(tick + mode + tick)) failures.push(file + ': missing mode ' + mode);
  }
  for (const term of ['Blocker', 'Recommended', 'Acknowledged', 'GO', 'NO-GO']) {
    if (!guide.includes(term)) failures.push(file + ': missing ship term ' + term);
  }

  const install = sectionBetween(guide, '## 3.', '## 4.');
  const firstUse = sectionBetween(guide, '## 4.', '## 5.');
  const workflow = sectionBetween(guide, '## 5.', '## 6.');
  const commandReference = sectionBetween(guide, '## 6.', '## 7.');
  const generatedFiles = sectionBetween(guide, '## 8.', '## 9.');
  const update = sectionBetween(guide, '### 9.1', '### 9.2');
  const openClaw = sectionBetween(guide, '## 11.', '## 12.');
  const maintainer = sectionBetween(guide, '## 12.');

  requireOrdered(install, ['### 3.1 Claude Code', '### 3.2 Codex CLI', '### 3.3 OpenClaw'], file + ': installation hosts', failures);
  requireOrdered(firstUse, ['### 4.1 Claude Code', '### 4.2 Codex CLI', '### 4.3 OpenClaw'], file + ': first-use hosts', failures);
  requireOrdered(update, ['#### Claude Code', '#### Codex CLI', '#### OpenClaw'], file + ': update hosts', failures);
  const installClaude = sectionBetween(install, '### 3.1 Claude Code', '### 3.2 Codex CLI');
  const installCodex = sectionBetween(install, '### 3.2 Codex CLI', '### 3.3 OpenClaw');
  const installOpenClaw = sectionBetween(install, '### 3.3 OpenClaw');
  const firstUseClaude = sectionBetween(firstUse, '### 4.1 Claude Code', '### 4.2 Codex CLI');
  const firstUseCodex = sectionBetween(firstUse, '### 4.2 Codex CLI', '### 4.3 OpenClaw');
  const firstUseOpenClaw = sectionBetween(firstUse, '### 4.3 OpenClaw');
  const updateClaude = sectionBetween(update, '#### Claude Code', '#### Codex CLI');
  const updateOpenClaw = sectionBetween(update, '#### OpenClaw');

  requireOrdered(installClaude, [
    definition.systemTerminal,
    'claude',
    definition.claudeSession,
    '/plugin marketplace add ./Claude',
    '/plugin install uxu-code@uxu-code-claude',
    '/reload-plugins'
  ], file + ': Claude Code installation', failures);

  for (const required of [
    'codex plugin marketplace add ./Codex',
    'codex plugin add uxu-code@uxu-code-codex'
  ]) {
    if (!installCodex.includes(required)) failures.push(file + ': Codex CLI installation is missing ' + required);
  }
  for (const required of [
    `node OpenClaw/scripts/install-profile.js --workspace "${definition.workspacePlaceholder}" --mode standard --dry-run`,
    `node OpenClaw/scripts/install-profile.js --workspace "${definition.workspacePlaceholder}" --mode standard`
  ]) {
    if (!installOpenClaw.includes(required)) failures.push(file + ': OpenClaw installation is missing ' + required);
  }
  if (!firstUseClaude.includes('/uxu-code:help')) {
    failures.push(file + ': Claude Code first-use verification is missing /uxu-code:help');
  }
  if (!firstUseCodex.includes('@help')) {
    failures.push(file + ': Codex CLI first-use verification is missing @help');
  }
  if (!firstUseOpenClaw.includes(definition.newOpenClawSession)) {
    failures.push(file + ': OpenClaw first-use verification is missing ' + definition.newOpenClawSession);
  }
  if (!workflow.includes('[需要时先运行 spec]') &&
      !workflow.includes('[需要時先執行 spec]') &&
      !workflow.includes('[run spec first when needed]')) {
    failures.push(file + ': workflow does not express optional spec in user-facing language');
  }
  for (const required of [
    '/uxu-code:clean apply',
    '@clean apply',
    '`BLOCKED`',
    '`NO_CHANGES`'
  ]) {
    if (!commandReference.includes(required)) {
      failures.push(file + ': clean contract is missing ' + required);
    }
  }
  if (!/(?:不是删除命令|不是刪除命令|is not a delete command)/.test(commandReference)) {
    failures.push(file + ': clean contract is missing the non-deletion boundary');
  }
  if (guide.includes('/uxu-code:organize') || /(^|[^A-Za-z0-9_-])@organize(?:$|[^A-Za-z0-9_-])/.test(guide)) {
    failures.push(file + ': forbidden organize alias');
  }

  for (const generatedPath of generatedPaths) {
    if (!generatedFiles.includes(generatedPath)) failures.push(file + ': generated-files table is missing ' + generatedPath);
    if (count(guide, generatedPath) !== 1) failures.push(file + ': ' + generatedPath + ' must appear only in the generated-files section');
  }
  if (!generatedFiles.includes(definition.testException)) {
    failures.push(file + ': generated-files section is missing the project-native test-location exception');
  }
  for (const required of ['.gitignore', 'core.excludesFile', '.git/info/exclude']) {
    if (!generatedFiles.includes(required)) {
      failures.push(file + ': clean contract is missing ignore boundary ' + required);
    }
  }

  if (!update.includes('git pull --ff-only')) {
    failures.push(file + ': update instructions are missing git pull --ff-only');
  }
  for (const required of [
    '/plugin marketplace update uxu-code-claude',
    '/plugin update uxu-code@uxu-code-claude',
    '/reload-plugins'
  ]) {
    if (!updateClaude.includes(required)) failures.push(file + ': Claude Code update is missing ' + required);
  }
  for (const required of [
    'OpenClaw/scripts/install-profile.js',
    '--dry-run'
  ]) {
    if (!updateOpenClaw.includes(required)) failures.push(file + ': OpenClaw update is missing ' + required);
  }

  for (const required of [
    'OpenClaw/README.md',
    'OpenClaw/evaluation/README.md',
    '/usage',
    '/compact',
    '/verbose',
    '/reasoning',
    '/think',
    '/model'
  ]) {
    if (!openClaw.includes(required)) failures.push(file + ': OpenClaw guidance is missing ' + required);
  }

  if (!maintainer.includes('node scripts/validate-all.js')) {
    failures.push(file + ': maintainer appendix is missing the unified validation entry');
  }
  if (!maintainer.includes(definition.evidenceBoundary)) {
    failures.push(file + ': maintainer appendix is missing the live-runtime evidence boundary');
  }

  for (const forbidden of [
    'spec?',
    'node OpenClaw/evaluation/score-results.js',
    'node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js'
  ]) {
    if (guide.includes(forbidden)) failures.push(file + ': maintainer evaluation detail is outside the dedicated OpenClaw documentation: ' + forbidden);
  }
  for (const { pattern, label } of evaluationDetailPatterns) {
    if (pattern.test(guide)) {
      failures.push(file + ': maintainer evaluation detail is outside the dedicated OpenClaw documentation: ' + label);
    }
  }
  if (/--workspace\s+<[^>\r\n]+>/.test(guide)) {
    failures.push(file + ': contains an unquoted workspace placeholder that PowerShell cannot parse');
  }
  if ((guide.match(/`{3}/g) || []).length % 2 !== 0) {
    failures.push(file + ': unbalanced code fences');
  }
});

return failures;
}

function main() {
  const guides = files.map((file) => fs.readFileSync(path.join(root, 'docs', file), 'utf8'));
  const failures = validateGuides(guides);
  if (failures.length) {
    console.error('Guide user-journey validation failed:');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exitCode = 1;
    return;
  }
  console.log('Guide parity passed: 12 aligned user-facing sections, host execution contexts, commands, modes, generated-file locations, and maintainer evidence boundaries.');
}

if (require.main === module) main();

module.exports = { validateGuides };
