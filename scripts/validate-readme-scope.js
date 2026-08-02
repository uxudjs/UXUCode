#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const definitions = [
  {
    marker: '# 🇨🇳 简体中文',
    next: '# 🇹🇼 繁體中文',
    headings: ['## 产品用途', '## 选择宿主', '## 快速安装', '## 第一次使用与验证', '## 更新', '## 完整指南', '## 致谢'],
    guide: 'docs/USAGE.zh-CN.md',
    linkText: '查看完整简体中文使用指南',
    systemTerminal: '在系统终端',
    claudeSession: '进入 Claude Code 会话后',
    newOpenClawSession: '启动新的 OpenClaw 会话',
    cleanDiscoveryContract: '只用于发现候选，不证明归属',
    workspacePlaceholder: '<请替换为OpenClaw工作区绝对路径>'
  },
  {
    marker: '# 🇹🇼 繁體中文',
    next: '# 🇺🇸 English',
    headings: ['## 產品用途', '## 選擇宿主', '## 快速安裝', '## 第一次使用與驗證', '## 更新', '## 完整指南', '## 致謝'],
    guide: 'docs/USAGE.zh-TW.md',
    linkText: '查看完整繁體中文使用指南',
    systemTerminal: '在系統終端',
    claudeSession: '進入 Claude Code 工作階段後',
    newOpenClawSession: '啟動新的 OpenClaw 工作階段',
    cleanDiscoveryContract: '只用於發現候選，不證明歸屬',
    workspacePlaceholder: '<請替換為OpenClaw工作區絕對路徑>'
  },
  {
    marker: '# 🇺🇸 English',
    next: '## Star History',
    headings: ['## What It Does', '## Choose a Host', '## Quick Installation', '## First Use and Verification', '## Updating', '## Complete Guide', '## Acknowledgements'],
    guide: 'docs/USAGE.en.md',
    linkText: 'Read the complete English usage guide',
    systemTerminal: 'In a system terminal',
    claudeSession: 'After entering the Claude Code session',
    newOpenClawSession: 'Start a new OpenClaw session',
    cleanDiscoveryContract: 'only discovers candidates; it does not prove ownership',
    workspacePlaceholder: '<replace-with-absolute-openclaw-workspace-path>'
  }
];
const evaluationDetailPatterns = [
  { pattern: /\b52\b[^\r\n]{0,80}\b(?:evaluation\s+)?cases?\b/i, label: '52 evaluation cases' },
  { pattern: /(?:评测|評測|测试|測試)[^\r\n]{0,80}52\s*(?:个|個)?\s*(?:用例|案例)/i, label: '52 evaluation cases' },
  { pattern: /52\s*(?:个|個)\s*(?:评测|評測|测试|測試)?(?:用例|案例)/i, label: '52 evaluation cases' },
  { pattern: /35%[^\r\n]{0,80}(?:token|令牌|權杖|阈值|閾值|門檻|threshold|reduction|减少|減少)/i, label: '35% evaluation threshold' },
  { pattern: /(?:token|令牌|權杖|阈值|閾值|門檻|threshold|reduction|减少|減少)[^\r\n]{0,80}35%/i, label: '35% evaluation threshold' },
  { pattern: /95%[^\r\n]{0,80}(?:correctness|正确|正確|低风险|低風險|threshold|阈值|閾值|門檻)/i, label: '95% evaluation threshold' },
  { pattern: /(?:correctness|正确|正確|低风险|低風險|threshold|阈值|閾值|門檻)[^\r\n]{0,80}95%/i, label: '95% evaluation threshold' }
];

function count(value, search) {
  return value.split(search).length - 1;
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

function validateReadme(readme) {
  const failures = [];
  const sections = definitions.map((definition) => {
    const start = readme.indexOf(definition.marker);
    const end = readme.indexOf(definition.next, start + definition.marker.length);
    if (start < 0 || end < 0) {
      failures.push('README language section is missing or out of order: ' + definition.marker);
      return '';
    }
    return readme.slice(start, end);
  });

  definitions.forEach((definition, index) => {
    const section = sections[index];
    requireOrdered(section, definition.headings, definition.marker + ': user journey', failures);

    const install = sectionBetween(section, definition.headings[2], definition.headings[3]);
    const verify = sectionBetween(section, definition.headings[3], definition.headings[4]);
    const update = sectionBetween(section, definition.headings[4], definition.headings[5]);
    for (const [name, scope] of [['installation', install], ['verification', verify], ['update', update]]) {
      requireOrdered(scope, ['### Claude Code', '### Codex CLI', '### OpenClaw'], definition.marker + ': ' + name + ' hosts', failures);
    }

    const installClaude = sectionBetween(install, '### Claude Code', '### Codex CLI');
    const installCodex = sectionBetween(install, '### Codex CLI', '### OpenClaw');
    const installOpenClaw = sectionBetween(install, '### OpenClaw');
    const verifyClaude = sectionBetween(verify, '### Claude Code', '### Codex CLI');
    const verifyCodex = sectionBetween(verify, '### Codex CLI', '### OpenClaw');
    const verifyOpenClaw = sectionBetween(verify, '### OpenClaw');
    const updateClaude = sectionBetween(update, '### Claude Code', '### Codex CLI');
    const updateOpenClaw = sectionBetween(update, '### OpenClaw');

    requireOrdered(installClaude, [
      definition.systemTerminal,
      'claude',
      definition.claudeSession,
      '/plugin marketplace add ./Claude',
      '/plugin install uxu-code@uxu-code-claude',
      '/reload-plugins'
    ], definition.marker + ': Claude Code installation', failures);

    for (const required of [
      'codex plugin marketplace add ./Codex',
      'codex plugin add uxu-code@uxu-code-codex'
    ]) {
      if (!installCodex.includes(required)) failures.push(definition.marker + ': Codex CLI installation is missing ' + required);
    }
    for (const required of [
      `node OpenClaw/scripts/install-profile.js --workspace "${definition.workspacePlaceholder}" --mode standard --dry-run`,
      `node OpenClaw/scripts/install-profile.js --workspace "${definition.workspacePlaceholder}" --mode standard`
    ]) {
      if (!installOpenClaw.includes(required)) failures.push(definition.marker + ': OpenClaw installation is missing ' + required);
    }

    if (!verifyClaude.includes('/uxu-code:help')) {
      failures.push(definition.marker + ': Claude Code verification is missing /uxu-code:help');
    }
    if (!verifyCodex.includes('@help')) {
      failures.push(definition.marker + ': Codex CLI verification is missing @help');
    }
    if (!verifyOpenClaw.includes(definition.newOpenClawSession)) {
      failures.push(definition.marker + ': OpenClaw verification is missing ' + definition.newOpenClawSession);
    }

    if (!update.includes('git pull --ff-only')) {
      failures.push(definition.marker + ': update instructions are missing git pull --ff-only');
    }
    for (const required of [
      '/plugin marketplace update uxu-code-claude',
      '/plugin update uxu-code@uxu-code-claude',
      '/reload-plugins'
    ]) {
      if (!updateClaude.includes(required)) failures.push(definition.marker + ': Claude Code update is missing ' + required);
    }
    for (const required of [
      'OpenClaw/scripts/install-profile.js',
      '--dry-run'
    ]) {
      if (!updateOpenClaw.includes(required)) failures.push(definition.marker + ': OpenClaw update is missing ' + required);
    }

    if (!section.includes('[' + definition.linkText + '](' + definition.guide + ')')) {
      failures.push(definition.marker + ': missing its complete guide link');
    }
    if (count(readme, definition.guide) !== 1) {
      failures.push(definition.guide + ': expected exactly one README link');
    }
    if (!section.includes('work-products/')) {
      failures.push(definition.marker + ': missing the concise generated-files location');
    }
    for (const required of ['/uxu-code:clean', '@clean', '`apply`', '`BLOCKED`']) {
      if (!section.includes(required)) {
        failures.push(definition.marker + ': clean contract is missing ' + required);
      }
    }
    if (!/(?:不是删除命令|不是刪除命令|is not a delete command)/.test(section)) {
      failures.push(definition.marker + ': clean contract is missing the non-deletion boundary');
    }
    for (const [pattern, label] of [
      [/(?:跨语言|跨語言|cross-language)/i, 'cross-language test discovery'],
      [/(?:依赖|依賴|dependency)/i, 'dependency-directory exclusion'],
      [/(?:重复目标|重複目標|duplicate targets)/i, 'duplicate-target blocker'],
      [/(?:目标祖先|目標祖先|target ancestors)/i, 'target-ancestor blocker'],
      [/(?:裸字符串|裸字串|bare strings)/i, 'ambiguous bare-string blocker']
    ]) {
      if (!pattern.test(section)) {
        failures.push(definition.marker + ': clean safety contract is missing ' + label);
      }
    }
    for (const required of [
      '`work-products/clean-migration.json`',
      '`preserve-content`',
      '`mutable-patch`',
      '`report v2`',
      '`preservedProductFiles`'
    ]) {
      if (!section.includes(required)) {
        failures.push(definition.marker + ': Clean v2 contract is missing ' + required);
      }
    }
    if (!section.includes(definition.cleanDiscoveryContract)) {
      failures.push(definition.marker + ': Clean v2 contract is missing the discovery-versus-ownership boundary');
    }
    if (section.includes('/uxu-code:organize') ||
        /(^|[^A-Za-z0-9_-])@organize(?:$|[^A-Za-z0-9_-])/.test(section)) {
      failures.push(definition.marker + ': forbidden organize alias');
    }

    for (const forbidden of [
      'spec?',
      'work-products/SPEC.md',
      'work-products/plan.md',
      'work-products/todo.md',
      'OpenClaw/evaluation/README.md',
      'score-results.js',
      'node scripts/validate-all.js',
      '16 个命令',
      '16 個命令',
      '16-command',
      '16 commands'
    ]) {
      if (section.includes(forbidden)) failures.push(definition.marker + ': maintainer-only README content found: ' + forbidden);
    }
    for (const { pattern, label } of evaluationDetailPatterns) {
      if (pattern.test(section)) {
        failures.push(definition.marker + ': maintainer-only README evaluation detail found: ' + label);
      }
    }
    if (/--workspace\s+<[^>\r\n]+>/.test(section)) {
      failures.push(definition.marker + ': contains an unquoted workspace placeholder that PowerShell cannot parse');
    }
    if ((section.match(/`{3}/g) || []).length % 2 !== 0) {
      failures.push(definition.marker + ': unbalanced code fences');
    }
  });

  const headingSignatures = sections.map((section) =>
    [...section.matchAll(/^(#{2,3})\s+/gm)].map((match) => match[1].length).join(',')
  );
  if (new Set(headingSignatures).size !== 1) {
    failures.push('README language sections do not share the same heading structure');
  }
  return failures;
}

function main() {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const failures = validateReadme(readme);
  if (failures.length) {
    console.error('README user-journey validation failed:');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exitCode = 1;
    return;
  }
  console.log('README user journey passed: three aligned languages, host-specific execution contexts, first-use checks, updates, and guide links.');
}

if (require.main === module) main();

module.exports = { validateReadme };
