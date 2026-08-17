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
const multilineCommandContracts = [
  [
    '除 `mode` 和 `clean` 外，一般公开命令把命令入口和可选内联参数写在首行；后续行属于同一命令的任务正文。',
    '路由会保留任务正文内部换行，只去除无意义的首尾空白。',
    '`mode` 仍严格只接受单行，并且必须只有一个 `standard|lite|full|ultra|off` 参数。',
    '`clean` 也严格只接受单行：无参数仅做零写入预览，精确的 `apply` 才会在检查后执行；两者都不得追加多行任务正文。',
    '/uxu-code:audit inspect gates\n重点检查状态生命周期，\n不要修改文件。',
    '@audit inspect gates\n重点检查状态生命周期，\n不要修改文件。'
  ],
  [
    '除 `mode` 和 `clean` 外，一般公開命令把命令入口和可選行內參數寫在首行；後續行屬於同一命令的任務正文。',
    '路由會保留任務正文內部換行，只移除無意義的首尾空白。',
    '`mode` 仍嚴格只接受單行，並且必須只有一個 `standard|lite|full|ultra|off` 參數。',
    '`clean` 也嚴格只接受單行：無參數只做零寫入預覽，精確的 `apply` 才會在檢查後執行；兩者都不得附加多行任務正文。',
    '/uxu-code:audit inspect gates\n重點檢查狀態生命週期，\n不要修改檔案。',
    '@audit inspect gates\n重點檢查狀態生命週期，\n不要修改檔案。'
  ],
  [
    'Except for `mode` and `clean`, put a public command entry and any optional inline arguments on the first line; every following line is the same command\'s task body.',
    'Routing preserves line breaks inside the task body and removes only meaningless leading and trailing whitespace.',
    '`mode` remains strictly single-line and must contain exactly one `standard|lite|full|ultra|off` argument.',
    '`clean` also remains strictly single-line: no argument is a zero-write preview, while exact `apply` executes only after review; neither command accepts a multiline task body.',
    '/uxu-code:audit inspect gates\nFocus on state lifecycle,\nand do not modify files.',
    '@audit inspect gates\nFocus on state lifecycle,\nand do not modify files.'
  ]
];

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
  assert.deepEqual(validateGuides(guides, readme), []);
});

test('canonical guides align multiline task bodies and strict single-line exceptions', () => {
  guides.forEach((guide, index) => {
    for (const token of multilineCommandContracts[index]) {
      assert.ok(guide.includes(token), `${guideFiles[index]}: missing command-input contract ${token}`);
    }
  });
});

test('guide validator fails closed when any language command-input contract drifts', () => {
  assert.deepEqual(validateGuides(guides, readme), []);
  assert.ok(
    validateGuides(guides.slice(0, 2), readme)
      .some((failure) => failure.includes('exactly three language guides')),
    'expected the guide validator to reject a missing language guide'
  );

  guides.forEach((guide, index) => {
    for (const token of multilineCommandContracts[index]) {
      const mutated = [...guides];
      mutated[index] = guide.replace(token, 'weakened command-input wording');
      assert.ok(
        validateGuides(mutated, readme)
          .some((failure) => failure.includes('multiline command contract')),
        `${guideFiles[index]}: expected command-input contract failure for ${token}`
      );
    }
  });
});

test('guide validator rejects an undocumented eighteenth command or alias', () => {
  const unknownClaude = [...guides];
  unknownClaude[2] += '\nUse `/uxu-code:invented` for another workflow.\n';
  const unknownCodex = [...guides];
  unknownCodex[2] += '\nUse `@invented` for another workflow.\n';

  assert.ok(
    validateGuides(unknownClaude, readme)
      .some((failure) => failure.includes('unknown Claude Code public command')),
    'expected the guide validator to reject an extra Claude Code command'
  );
  assert.ok(
    validateGuides(unknownCodex, readme)
      .some((failure) => failure.includes('unknown Codex public command')),
    'expected the guide validator to reject an extra Codex command'
  );
});

test('guide validator rejects mixed-case, underscore, Markdown, and dotted command variants', () => {
  const mutations = [
    ['/uxu-code:Invented', 'unknown Claude Code public command'],
    ['/uxu-code:build.foo', 'unknown Claude Code public command'],
    ['@Invented', 'unknown Codex public command'],
    ['@evil_name', 'unknown Codex public command'],
    ['@build.foo', 'unknown Codex public command'],
    ['[ @invented ]', 'unknown Codex public command']
  ];

  guides.forEach((guide, index) => {
    for (const [variant, expectedFailure] of mutations) {
      const mutated = [...guides];
      mutated[index] = `${guide}\nInvalid example: ${variant}\n`;
      assert.ok(
        validateGuides(mutated, readme).some((failure) => failure.includes(expectedFailure)),
        `${guideFiles[index]}: accepted ${variant}`
      );
    }
  });
});

test('guide validator rejects command-internal punctuation suffixes but allows Markdown punctuation', () => {
  const mutations = [
    ['`/uxu-code:build!`', 'invalid Claude Code public command token'],
    ['`@build!`', 'invalid Codex public command token']
  ];

  guides.forEach((guide, index) => {
    for (const [variant, expectedFailure] of mutations) {
      const mutated = [...guides];
      mutated[index] = `${guide}\nInvalid example: ${variant}\n`;
      assert.ok(
        validateGuides(mutated, readme).some((failure) => failure.includes(expectedFailure)),
        `${guideFiles[index]}: accepted ${variant}`
      );
    }
  });

  const normalPunctuation = guides.map((guide) =>
    `${guide}\nRun \`/uxu-code:build\`! Then run \`@build\`.\n`
  );
  assert.deepEqual(validateGuides(normalPunctuation, readme), []);
});

test('documentation validators require every language environment boundary', () => {
  const guideTokens = [
    ['项目环境', '构建、修复、测试或配置请求可授权所需的项目内环境修改', '只读请求不得创建环境或安装依赖', '仓库外环境变更', '再取得明确授权', '不是系统级沙箱'],
    ['專案環境', '建置、修復、測試或設定請求可授權所需的專案內環境修改', '唯讀請求不得建立環境或安裝依賴', '儲存庫外環境變更', '再取得明確授權', '不是系統級沙箱'],
    ['project environment', 'A build, fix, test, or setup request may authorize a required repository-local environment change', 'a read-only request must not create an environment or install dependencies', 'environment change outside the repository', 'before explicit authorization', 'not an operating-system sandbox']
  ];
  const readmeTokens = [
    ['项目环境', '只读请求不会创建环境或安装依赖', '仓库外环境变更', '明确授权', '不是系统级沙箱'],
    ['專案環境', '唯讀請求不會建立環境或安裝依賴', '儲存庫外環境變更', '明確授權', '不是系統級沙箱'],
    ['project environment', 'A read-only request does not create an environment or install dependencies', 'environment change outside the repository', 'explicit authorization', 'not an operating-system sandbox']
  ];

  guides.forEach((guide, index) => {
    for (const token of guideTokens[index]) {
      const mutated = [...guides];
      mutated[index] = guide.replace(token, 'weakened environment wording');
      assert.ok(
        validateGuides(mutated, readme).some((failure) => failure.includes('environment isolation contract')),
        `${guideFiles[index]}: expected environment contract failure for ${token}`
      );
    }
  });

  const readmeSections = [
    ['# 🇨🇳 简体中文', '# 🇹🇼 繁體中文'],
    ['# 🇹🇼 繁體中文', '# 🇺🇸 English'],
    ['# 🇺🇸 English', '## Star History']
  ];
  readmeSections.forEach(([start, end], index) => {
    for (const token of readmeTokens[index]) {
      const mutated = transformSection(readme, start, end, (section) =>
        section.replace(token, 'weakened environment wording')
      );
      assert.ok(
        validateReadme(mutated).some((failure) => failure.includes('environment isolation contract')),
        `${start}: expected environment contract failure for ${token}`
      );
    }
  });
});

test('README validator rejects an environment boundary moved outside its language section', () => {
  const misplaced = transformSection(
    readme,
    '# 🇺🇸 English',
    '## Star History',
    (section) => section.replace('explicit authorization', 'bounded approval')
  ) + '\nExplicit authorization applies.\n';

  assert.ok(
    validateReadme(misplaced).some((failure) => failure.includes('environment isolation contract')),
    'expected section-scoped environment validation'
  );
});

test('guide validator requires bidirectional README links and aligned planning semantics', () => {
  const missingBacklink = guides[2].replace('[Back to README](../README.md)', 'Standalone guide');
  const conflictingReadme = readme.replace(
    'when the request is already clear, you can go directly to `plan`.',
    'even when the request is clear, you must run `spec` before `plan`.'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingBacklink], readme)
      .some((failure) => failure.includes('README backlink')),
    'expected the guide validator to require a backlink from every guide'
  );
  assert.ok(
    validateGuides(guides, conflictingReadme)
      .some((failure) => failure.includes('planning semantics')),
    'expected the guide validator to reject README and guide planning drift'
  );
});

test('guide validator requires the current clean permission and nested-directory contracts', () => {
  const nestedContract = [
    '其他层级的 `<prefix>/work-products/tests/<rest>` 会归一到根级 `work-products/tests/<prefix>/<rest>`',
    '其他層級的 `<prefix>/work-products/tests/<rest>` 會正規化到根層級 `work-products/tests/<prefix>/<rest>`',
    'Nested `<prefix>/work-products/tests/<rest>` paths are normalized to root-level `work-products/tests/<prefix>/<rest>`'
  ];
  const permissionContract = [
    '仅在结构化权限错误且宿主提供审批机制时',
    '僅在結構化權限錯誤且宿主提供核准機制時',
    'only for a structured permission error when the host offers approval'
  ];

  guides.forEach((guide, index) => {
    assert.ok(guide.includes(nestedContract[index]), `${guideFiles[index]}: missing nested clean contract`);
    assert.ok(guide.includes(permissionContract[index]), `${guideFiles[index]}: missing permission retry contract`);

    const missingNested = [...guides];
    missingNested[index] = guide.replace(nestedContract[index], 'Nested paths are handled safely');
    assert.ok(
      validateGuides(missingNested, readme)
        .some((failure) => failure.includes('nested work-products normalization')),
      `${guideFiles[index]}: expected the validator to require nested normalization`
    );

    const missingPermission = [...guides];
    missingPermission[index] = guide.replace(permissionContract[index], 'when a retry appears useful');
    assert.ok(
      validateGuides(missingPermission, readme)
        .some((failure) => failure.includes('permission retry boundary')),
      `${guideFiles[index]}: expected the validator to require the permission retry boundary`
    );
  });
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
    validateGuides([guides[0], guides[1], misplacedEnglish], readme)
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

  assert.deepEqual(validateGuides([guides[0], guides[1], harmlessEnglish], readme), []);
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
    validateGuides([guides[0], guides[1], leakedEnglish], readme)
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
    validateGuides([guides[0], guides[1], missingApply], readme)
      .some((failure) => failure.includes('clean contract')),
    'expected the guide validator to require the exact clean apply form'
  );
  assert.ok(
    validateGuides([guides[0], guides[1], missingSafety], readme)
      .some((failure) => failure.includes('clean contract')),
    'expected the guide validator to require the non-deletion safety boundary'
  );
});

test('documentation validators require the Clean v2 ownership and integrity contract', () => {
  const missingGuideManifest = guides[2].replace(
    '`work-products/clean-migration.json`',
    '`work-products/clean-mapping.json`'
  );
  const missingGuideClassification = guides[2].replace(
    '`preservedProductFiles`',
    '`preservedFiles`'
  );
  const missingReadmePolicy = readme.replace('`preserve-content`', '`preserve`');

  assert.ok(
    validateGuides([guides[0], guides[1], missingGuideManifest], readme)
      .some((failure) => failure.includes('Clean v2 contract')),
    'expected the guide validator to require the exact migration manifest path'
  );
  assert.ok(
    validateGuides([guides[0], guides[1], missingGuideClassification], readme)
      .some((failure) => failure.includes('Clean v2 contract')),
    'expected the guide validator to require report v2 ownership classifications'
  );
  assert.ok(
    validateReadme(missingReadmePolicy)
      .some((failure) => failure.includes('Clean v2 contract')),
    'expected the README validator to require the immutable-content policy'
  );
});

test('guide validator requires canonical test placement and relative repository paths', () => {
  const missingDestination = transformSection(
    guides[2],
    '## 6.',
    '## 7.',
    (section) => section.replaceAll('work-products/tests/', 'project-tests/')
  );
  const missingRelativePolicy = guides[2].replace(
    'Tests must reference repository files with relative paths from their final location, never machine-specific absolute paths.',
    'Tests may reference repository files according to local conventions.'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingDestination], readme)
      .some((failure) => failure.includes('canonical internal-test destination')),
    'expected the guide validator to require the clean destination'
  );
  assert.ok(
    validateGuides([guides[0], guides[1], missingRelativePolicy], readme)
      .some((failure) => failure.includes('relative test-path policy')),
    'expected the guide validator to require relative repository paths'
  );
});

test('documentation validators require the complete clean safety boundary', () => {
  const missingGuideBoundary = guides[2].replace(
    'bare strings without path-structure evidence',
    'values without path-structure evidence'
  );
  const missingReadmeBoundary = readme.replace(
    'duplicate targets',
    'conflicts'
  );

  assert.ok(
    validateGuides([guides[0], guides[1], missingGuideBoundary], readme)
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

  assert.deepEqual(validateGuides([guides[0], guides[1], harmlessGuide], readme), []);
  assert.ok(
    validateGuides([guides[0], guides[1], aliasGuide], readme)
      .some((failure) => failure.includes('organize alias')),
    'expected the guide validator to reject a public organize alias'
  );
});

const planFastGuideContracts = [
  [
    '`plan fast` 只有在 `fast` 是精确小写首参数时启用安全并行规划；它不会强制并行，也不会绕过规格充分性或批准门禁。',
    '批准后的 `work-products/plan.md` 保持不可变，`work-products/todo.md` 是唯一原子执行状态账本。',
    '部分完成波次重入不会重跑已完成任务；默认 `build` 只执行下一安全波次，只有 `build auto` 可跨波继续。',
    '不存在 `build fast`。'
  ],
  [
    '`plan fast` 只有在 `fast` 是精確小寫首參數時啟用安全平行規劃；它不會強制平行，也不會繞過規格充分性或核准門禁。',
    '核准後的 `work-products/plan.md` 保持不可變，`work-products/todo.md` 是唯一原子執行狀態帳本。',
    '部分完成波次重入不會重跑已完成任務；預設 `build` 只執行下一安全波次，只有 `build auto` 可跨波繼續。',
    '不存在 `build fast`。'
  ],
  [
    '`plan fast` enables safe parallel planning only when `fast` is the exact lowercase first argument; it neither forces parallelism nor bypasses specification-sufficiency or approval gates.',
    'After approval, `work-products/plan.md` stays immutable and `work-products/todo.md` is the only atomic execution-state ledger.',
    'Partial-wave reentry never reruns completed tasks; default `build` executes only the next safe wave, while only `build auto` may continue across waves.',
    'There is no `build fast`.'
  ]
];

test('plan-fast docs contract: three guides and the validator preserve the exact user-facing boundary', () => {
  guides.forEach((guide, index) => {
    for (const token of planFastGuideContracts[index]) {
      assert.ok(guide.includes(token), `${guideFiles[index]}: missing plan fast contract ${token}`);
      const mutated = [...guides];
      mutated[index] = guide.replace(token, 'weakened plan fast wording');
      assert.ok(
        validateGuides(mutated, readme).some((failure) => failure.includes('plan fast contract')),
        `${guideFiles[index]}: validator accepted missing plan fast contract ${token}`
      );
    }
  });
});
