#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = ['USAGE.zh-CN.md', 'USAGE.zh-TW.md', 'USAGE.en.md'];
const definitions = [
  {
    readmeMarker: '# 🇨🇳 简体中文',
    readmeNext: '# 🇹🇼 繁體中文',
    readmePlanning: '需求已经清楚时，也可以直接进入 `plan`',
    guidePlanning: '已有明确要求，需要拆分计划并逐项实施',
    readmeBacklink: '[返回 README](../README.md)',
    workspacePlaceholder: '<请替换为OpenClaw工作区绝对路径>',
    systemTerminal: '在系统终端',
    claudeSession: '进入 Claude Code 会话后',
    newOpenClawSession: '启动新的 OpenClaw 会话',
    evidenceBoundary: '不证明真实 Marketplace 安装',
    nestedCleanContract: '其他层级的 `<prefix>/work-products/tests/<rest>` 会归一到根级 `work-products/tests/<prefix>/<rest>`',
    cleanDiscoveryContract: '只用于跨语言发现候选，不证明归属',
    permissionRetryContract: '仅在结构化权限错误且宿主提供审批机制时',
    multilineCommandContracts: [
      '除 `mode` 和 `clean` 外，一般公开命令把命令入口和可选内联参数写在首行；后续行属于同一命令的任务正文。',
      '路由会保留任务正文内部换行，只去除无意义的首尾空白。',
      '`mode` 仍严格只接受单行，并且必须只有一个 `standard|lite|full|ultra|off` 参数。',
      '`clean` 也严格只接受单行：无参数仅做零写入预览，精确的 `apply` 才会在检查后执行；两者都不得追加多行任务正文。',
      '/uxu-code:audit inspect gates\n重点检查状态生命周期，\n不要修改文件。',
      '@audit inspect gates\n重点检查状态生命周期，\n不要修改文件。'
    ],
    planFastContracts: [
      '对于普通计划或执行策略为 `serial` 的计划，一次 `build` 默认只完成下一个待办，便于检查和回滚。',
      '`plan fast` 只有在 `fast` 是精确小写首参数时启用安全并行规划；它不会强制并行，也不会绕过规格充分性或批准门禁。',
      '批准后的 `work-products/plan.md` 保持不可变，`work-products/todo.md` 是唯一原子执行状态账本。',
      '部分完成波次重入不会重跑已完成任务；默认 `build` 只执行下一安全波次，只有 `build auto` 可跨波继续。',
      '不存在 `build fast`。'
    ],
    ordinaryApprovalContracts: [
      '普通规格或计划只需对当前唯一、已展示的候选作出明确自然语言批准，例如“批准当前计划”；用户无需查看、复制或复述 SHA。',
      '系统会从当前文件原始字节自行计算并重算 SHA-256；发生漂移、目标冲突或多候选时会展示可读差异并重新请求普通批准，而不是要求回复摘要。',
      '普通批准不会自动运行下一个命令，也不授权 `build auto`、提交、推送、联网、付费、训练、外部写入、发布或部署。',
      '只有已批准项目规格直接枚举的 action-scoped 高风险动作才可保留其 exact-set 授权；普通批准既不能替代它，也不能扩大其范围。'
    ]
  },
  {
    readmeMarker: '# 🇹🇼 繁體中文',
    readmeNext: '# 🇺🇸 English',
    readmePlanning: '需求已經清楚時，也可以直接進入 `plan`',
    guidePlanning: '已有明確要求，需要拆分計畫並逐項實作',
    readmeBacklink: '[返回 README](../README.md)',
    workspacePlaceholder: '<請替換為OpenClaw工作區絕對路徑>',
    systemTerminal: '在系統終端',
    claudeSession: '進入 Claude Code 工作階段後',
    newOpenClawSession: '啟動新的 OpenClaw 工作階段',
    evidenceBoundary: '不證明真實 Marketplace 安裝',
    nestedCleanContract: '其他層級的 `<prefix>/work-products/tests/<rest>` 會正規化到根層級 `work-products/tests/<prefix>/<rest>`',
    cleanDiscoveryContract: '只用於跨語言發現候選，不證明歸屬',
    permissionRetryContract: '僅在結構化權限錯誤且宿主提供核准機制時',
    multilineCommandContracts: [
      '除 `mode` 和 `clean` 外，一般公開命令把命令入口和可選行內參數寫在首行；後續行屬於同一命令的任務正文。',
      '路由會保留任務正文內部換行，只移除無意義的首尾空白。',
      '`mode` 仍嚴格只接受單行，並且必須只有一個 `standard|lite|full|ultra|off` 參數。',
      '`clean` 也嚴格只接受單行：無參數只做零寫入預覽，精確的 `apply` 才會在檢查後執行；兩者都不得附加多行任務正文。',
      '/uxu-code:audit inspect gates\n重點檢查狀態生命週期，\n不要修改檔案。',
      '@audit inspect gates\n重點檢查狀態生命週期，\n不要修改檔案。'
    ],
    planFastContracts: [
      '對於一般計畫或執行策略為 `serial` 的計畫，一次 `build` 預設只完成下一個待辦，便於檢查和復原。',
      '`plan fast` 只有在 `fast` 是精確小寫首參數時啟用安全平行規劃；它不會強制平行，也不會繞過規格充分性或核准門禁。',
      '核准後的 `work-products/plan.md` 保持不可變，`work-products/todo.md` 是唯一原子執行狀態帳本。',
      '部分完成波次重入不會重跑已完成任務；預設 `build` 只執行下一安全波次，只有 `build auto` 可跨波繼續。',
      '不存在 `build fast`。'
    ],
    ordinaryApprovalContracts: [
      '一般規格或計畫只需對目前唯一、已展示的候選作出明確自然語言核准，例如「核准目前計畫」；使用者無需查看、複製或複述 SHA。',
      '系統會從目前檔案原始位元組自行計算並重算 SHA-256；發生漂移、目標衝突或多候選時會展示可讀差異並重新請求一般核准，而不是要求回覆摘要。',
      '一般核准不會自動執行下一個命令，也不授權 `build auto`、提交、推送、連網、付費、訓練、外部寫入、發布或部署。',
      '只有已核准專案規格直接列舉的 action-scoped 高風險動作才可保留其 exact-set 授權；一般核准既不能取代它，也不能擴大其範圍。'
    ]
  },
  {
    readmeMarker: '# 🇺🇸 English',
    readmeNext: '## Star History',
    readmePlanning: 'when the request is already clear, you can go directly to `plan`',
    guidePlanning: 'the request is clear and needs a dependency-ordered implementation plan',
    readmeBacklink: '[Back to README](../README.md)',
    workspacePlaceholder: '<replace-with-absolute-openclaw-workspace-path>',
    systemTerminal: 'In a system terminal',
    claudeSession: 'After entering the Claude Code session',
    newOpenClawSession: 'Start a new OpenClaw session',
    evidenceBoundary: 'does not prove a live Marketplace installation',
    nestedCleanContract: 'Nested `<prefix>/work-products/tests/<rest>` paths are normalized to root-level `work-products/tests/<prefix>/<rest>`',
    cleanDiscoveryContract: 'only for cross-language candidate discovery and does not prove ownership',
    permissionRetryContract: 'only for a structured permission error when the host offers approval',
    multilineCommandContracts: [
      'Except for `mode` and `clean`, put a public command entry and any optional inline arguments on the first line; every following line is the same command\'s task body.',
      'Routing preserves line breaks inside the task body and removes only meaningless leading and trailing whitespace.',
      '`mode` remains strictly single-line and must contain exactly one `standard|lite|full|ultra|off` argument.',
      '`clean` also remains strictly single-line: no argument is a zero-write preview, while exact `apply` executes only after review; neither command accepts a multiline task body.',
      '/uxu-code:audit inspect gates\nFocus on state lifecycle,\nand do not modify files.',
      '@audit inspect gates\nFocus on state lifecycle,\nand do not modify files.'
    ],
    planFastContracts: [
      'For an ordinary plan or one with execution strategy `serial`, one `build` run completes only the next task by default, which keeps review and rollback manageable.',
      '`plan fast` enables safe parallel planning only when `fast` is the exact lowercase first argument; it neither forces parallelism nor bypasses specification-sufficiency or approval gates.',
      'After approval, `work-products/plan.md` stays immutable and `work-products/todo.md` is the only atomic execution-state ledger.',
      'Partial-wave reentry never reruns completed tasks; default `build` executes only the next safe wave, while only `build auto` may continue across waves.',
      'There is no `build fast`.'
    ],
    ordinaryApprovalContracts: [
      'An ordinary specification or plan needs only clear natural-language approval of the one current, presented candidate, for example “approve the current plan”; the user does not need to view, copy, or repeat a SHA.',
      'The system computes and recomputes SHA-256 from the current file raw bytes; on drift, target conflict, or multiple candidates it shows a human-readable difference and asks for ordinary approval again instead of requesting a digest reply.',
      'Ordinary approval does not run the next command automatically or authorize `build auto`, commit, push, network access, payment, training, external writes, release, or deployment.',
      'Only an action-scoped high-risk action directly enumerated by an approved project specification may retain its exact-set authorization; ordinary approval can neither replace it nor widen its scope.'
    ]
  }
];
const commands = ['help', 'spec', 'plan', 'build', 'debug', 'test', 'review', 'simplify', 'ship', 'mode', 'audit', 'debt', 'commit', 'compress', 'stats', 'status', 'clean'];
const modes = ['standard', 'lite', 'full', 'ultra', 'off'];
const environmentContracts = [
  [/项目环境/, /`\.venv\/`/, /构建、修复、测试或配置请求可授权所需的项目内环境修改/, /只读请求不得创建环境或安装依赖/, /仓库外环境变更/, /再取得明确授权/, /不是系统级沙箱/],
  [/專案環境/, /`\.venv\/`/, /建置、修復、測試或設定請求可授權所需的專案內環境修改/, /唯讀請求不得建立環境或安裝依賴/, /儲存庫外環境變更/, /再取得明確授權/, /不是系統級沙箱/],
  [/project environment/i, /`\.venv\/`/, /build, fix, test, or setup request may authorize a required repository-local environment change/i, /read-only request must not create an environment or install dependencies/i, /environment change outside the repository/i, /before explicit authorization/i, /not an operating-system sandbox/i]
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

function commandCodeScopes(value) {
  const scopes = [];
  let inFence = false;

  for (const line of value.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      scopes.push(line);
      continue;
    }
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      scopes.push(match[1]);
    }
  }

  return scopes;
}

function rejectPunctuatedKnownCommands(guide, file, failures) {
  const patterns = [
    {
      pattern: /\/uxu-code:([A-Za-z][A-Za-z0-9_-]*)([^\sA-Za-z0-9_.-][^\s]*)/g,
      label: 'Claude Code',
      prefix: '/uxu-code:'
    },
    {
      pattern: /(?:^|[^A-Za-z0-9_.+-])@([A-Za-z][A-Za-z0-9_-]*)([^\sA-Za-z0-9_.-][^\s]*)/g,
      label: 'Codex',
      prefix: '@'
    }
  ];

  for (const scope of commandCodeScopes(guide)) {
    for (const { pattern, label, prefix } of patterns) {
      for (const match of scope.matchAll(pattern)) {
        if (commands.includes(match[1])) {
          failures.push(file + ': invalid ' + label + ' public command token ' + prefix + match[1] + match[2]);
        }
      }
    }
  }
}

function validateGuides(guides, readme) {
const failures = [];
if (!Array.isArray(guides) || guides.length !== files.length) {
  return ['expected exactly three language guides'];
}
const baselineLevels = headingLevels(guides[0]);

guides.forEach((guide, index) => {
  const file = files[index];
  const definition = definitions[index];
  const readmeSection = typeof readme === 'string'
    ? sectionBetween(readme, definition.readmeMarker, definition.readmeNext)
    : '';
  if (count(guide, definition.readmeBacklink) !== 1) {
    failures.push(file + ': expected exactly one README backlink');
  }
  if (!readmeSection.includes(definition.readmePlanning) ||
      !guide.includes(definition.guidePlanning)) {
    failures.push(file + ': README and guide planning semantics are not aligned');
  }
  const guideStructure = structure(guide);
  if (JSON.stringify(guideStructure) !== JSON.stringify(expectedStructure)) {
    failures.push(file + ': expected the aligned 12-section user-guide structure');
  }
  if (headingLevels(guide) !== baselineLevels) {
    failures.push(file + ': heading levels differ from the Simplified Chinese guide');
  }
  for (const pattern of environmentContracts[index]) {
    if (!pattern.test(guide)) {
      failures.push(file + ': environment isolation contract is missing ' + pattern);
    }
  }

  for (const command of commands) {
    if (!guide.includes('/uxu-code:' + command) || !guide.includes('@' + command)) {
      failures.push(file + ': missing paired command ' + command);
    }
  }
  for (const contract of definition.multilineCommandContracts) {
    if (!guide.includes(contract)) {
      failures.push(file + ': multiline command contract is missing ' + contract);
    }
  }
  for (const contract of definition.planFastContracts) {
    if (!guide.includes(contract)) {
      failures.push(file + ': plan fast contract is missing ' + contract);
    }
  }
  for (const contract of definition.ordinaryApprovalContracts) {
    if (!guide.includes(contract)) {
      failures.push(file + ': ordinary approval contract is missing ' + contract);
    }
  }
  for (const match of guide.matchAll(/\/uxu-code:([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*)/g)) {
    if (!commands.includes(match[1])) {
      failures.push(file + ': unknown Claude Code public command ' + match[1]);
    }
  }
  for (const match of guide.matchAll(/(?:^|[^A-Za-z0-9_.+-])@([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*)/gm)) {
    if (!commands.includes(match[1])) {
      failures.push(file + ': unknown Codex public command ' + match[1]);
    }
  }
  rejectPunctuatedKnownCommands(guide, file, failures);
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
  for (const [pattern, label] of [
    [/(?:跨语言|跨語言|cross-language)/i, 'cross-language test discovery'],
    [/(?:依赖|依賴|dependency)/i, 'dependency-directory exclusion'],
    [/(?:重复目标|重複目標|duplicate targets)/i, 'duplicate-target blocker'],
    [/(?:目标祖先|目標祖先|target ancestors)/i, 'target-ancestor blocker'],
    [/(?:裸字符串|裸字串|bare strings)/i, 'ambiguous bare-string blocker']
  ]) {
    if (!pattern.test(commandReference)) {
      failures.push(file + ': clean safety contract is missing ' + label);
    }
  }
  for (const required of [
    '`work-products/clean-migration.json`',
    '`source`',
    '`target`',
    '`tracking`',
    '`rewritePolicy`',
    '`tracked`',
    '`local`',
    '`references`',
    '`preserve-content`',
    '`mutable-patch`',
    '`SHA256SUMS`',
    '`version: 2`',
    '`preservedProductFiles`',
    '`unclassifiedLegacyFiles`',
    '`integrityProtectedFiles`',
    '`inactiveManifestEntries`'
  ]) {
    if (!commandReference.includes(required)) {
      failures.push(file + ': Clean v2 contract is missing ' + required);
    }
  }
  if (!commandReference.includes(definition.cleanDiscoveryContract)) {
    failures.push(file + ': Clean v2 contract is missing the discovery-versus-ownership boundary');
  }

  if (!commandReference.includes(definition.nestedCleanContract)) {
    failures.push(file + ': clean contract is missing nested work-products normalization');
  }
  if (!guide.includes(definition.permissionRetryContract)) {
    failures.push(file + ': clean contract is missing the permission retry boundary');
  }
  if (guide.includes('/uxu-code:organize') || /(^|[^A-Za-z0-9_-])@organize(?:$|[^A-Za-z0-9_-])/.test(guide)) {
    failures.push(file + ': forbidden organize alias');
  }

  for (const generatedPath of generatedPaths) {
    if (!generatedFiles.includes(generatedPath)) failures.push(file + ': generated-files table is missing ' + generatedPath);
    const expectedCount = ['work-products/plan.md', 'work-products/todo.md'].includes(generatedPath) ? 2 : 1;
    if (generatedPath !== 'work-products/tests/' && count(guide, generatedPath) !== expectedCount) {
      failures.push(file + ': ' + generatedPath + ' must appear exactly ' + expectedCount + ' time(s)');
    }
  }
  if (!commandReference.includes('work-products/tests/')) {
    failures.push(file + ': clean contract is missing the canonical internal-test destination');
  }
  if (!/(?:相对路径|相對路徑|relative paths)/.test(generatedFiles) ||
      !/(?:绝对路径|絕對路徑|absolute paths)/.test(generatedFiles)) {
    failures.push(file + ': generated-files section is missing the relative test-path policy');
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
    'node --test work-products/tests/OpenClaw/tests/validate-profile.test.js work-products/tests/OpenClaw/tests/evaluation.test.js'
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
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const failures = validateGuides(guides, readme);
  if (failures.length) {
    console.error('Guide user-journey validation failed:');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exitCode = 1;
    return;
  }
  console.log('Guide parity passed: README linkage, 12 aligned user-facing sections, host execution contexts, commands, modes, generated-file locations, and maintainer evidence boundaries.');
}

if (require.main === module) main();

module.exports = { validateGuides };
