#!/usr/bin/env node

const fs = require('node:fs');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const requiredIgnoreRules = [
  '/work-products/*',
  '!/work-products/SPEC.md',
  '!/work-products/plan.md',
  '!/work-products/todo.md',
  '!/work-products/clean-migration.json',
  '!/work-products/tests/',
  '!/work-products/tests/**'
];
const obsoleteIgnoreRules = ['/SPEC.md'];
const legacyFiles = [
  ['SPEC.md', 'work-products/SPEC.md', 'legacy-spec-path'],
  ['tasks/plan.md', 'work-products/plan.md', 'legacy-plan-path'],
  ['tasks/todo.md', 'work-products/todo.md', 'legacy-todo-path']
];
const fixedSources = new Set(legacyFiles.map(([source]) => source));
const fixedTargets = new Set([
  ...legacyFiles.map(([, target]) => target),
  'work-products/clean-migration.json'
]);
const delimitedTestNamePattern = /(?:^test[._]|[._](?:test|spec)[._])/i;
const camelCaseTestNamePattern = /(?:Test|Tests)\.[^.]+$/;
const derivedArtifactSuffixPattern = /\.(?:new|orig|rej|bak|tmp|patch|diff)$/i;
const ignoredDirectoryNames = new Set(['.git', '.hg', '.svn', 'node_modules', '.venv', 'venv', 'vendor', '__pycache__']);
const ignoreSemanticProbes = [
  { path: 'work-products/SPEC.md', expected: 'tracked' },
  { path: 'work-products/plan.md', expected: 'tracked' },
  { path: 'work-products/todo.md', expected: 'tracked' },
  { path: 'work-products/tests/contract.test.js', expected: 'tracked' },
  { path: 'work-products/debug/local.md', expected: 'ignored' },
  { path: 'work-products/reviews/local.md', expected: 'ignored' },
  { path: 'work-products/ship/local.md', expected: 'ignored' }
];

function comparePaths(left, right) {
  const leftPath = left.source || left.path || '';
  const rightPath = right.source || right.path || '';
  return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function gitCommandFailure(code, operation, result, fallback) {
  const error = result.error || null;
  const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
  return {
    code,
    operation,
    reason: error?.message || stderr || fallback,
    errorCode: error?.code || null,
    status: result.status,
    signal: result.signal || null
  };
}

function isSupportedTestName(fileName) {
  return delimitedTestNamePattern.test(fileName) || camelCaseTestNamePattern.test(fileName);
}

function pythonCodeOnly(content) {
  let code = '';
  let quote = null;
  let triple = false;
  for (let index = 0; index < content.length;) {
    const character = content[index];
    if (quote) {
      const delimiter = triple ? quote.repeat(3) : quote;
      if (content.startsWith(delimiter, index)) {
        code += ' '.repeat(delimiter.length);
        index += delimiter.length;
        quote = null;
        triple = false;
      } else if (character === '\\') {
        code += ' ';
        index += 1;
        if (index < content.length) {
          code += content[index] === '\n' ? '\n' : ' ';
          index += 1;
        }
      } else {
        code += character === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }
    if (character === '#') {
      while (index < content.length && content[index] !== '\n') {
        code += ' ';
        index += 1;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      triple = content.startsWith(character.repeat(3), index);
      const delimiterLength = triple ? 3 : 1;
      code += ' '.repeat(delimiterLength);
      index += delimiterLength;
      continue;
    }
    code += character;
    index += 1;
  }
  return code;
}

function javascriptCodeOnly(content) {
  let code = '';
  let quote = null;
  let blockComment = false;
  for (let index = 0; index < content.length;) {
    const character = content[index];
    if (quote) {
      if (character === '\\') {
        code += ' ';
        index += 1;
        if (index < content.length) {
          code += content[index] === '\n' ? '\n' : ' ';
          index += 1;
        }
      } else {
        code += character === '\n' ? '\n' : ' ';
        index += 1;
        if (character === quote) quote = null;
      }
      continue;
    }
    if (blockComment) {
      if (content.startsWith('*/', index)) {
        code += '  ';
        index += 2;
        blockComment = false;
      } else {
        code += character === '\n' ? '\n' : ' ';
        index += 1;
      }
      continue;
    }
    if (content.startsWith('//', index)) {
      while (index < content.length && content[index] !== '\n') {
        code += ' ';
        index += 1;
      }
      continue;
    }
    if (content.startsWith('/*', index)) {
      code += '  ';
      index += 2;
      blockComment = true;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      code += ' ';
      index += 1;
      continue;
    }
    code += character;
    index += 1;
  }
  return code;
}

function pathEvidenceCodeOnly(source, content) {
  const extension = path.extname(source).toLowerCase();
  if (extension === '.py') return pythonCodeOnly(content);
  if (['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx'].includes(extension)) {
    return javascriptCodeOnly(content);
  }
  return null;
}

function isWeakPythonSuffixTest(relativePath, fileName, content) {
  const lowerName = fileName.toLowerCase();
  if (!lowerName.endsWith('_test.py') || lowerName.startsWith('test_')) return false;
  const directories = toPosix(relativePath).toLowerCase().split('/').slice(0, -1);
  if (directories.some((directory) =>
    ['test', 'tests', '__tests__', 'spec', 'specs'].includes(directory))) {
    return false;
  }
  const code = pythonCodeOnly(content);
  return !(/^\s*(?:async\s+)?def\s+test_[a-z0-9_]*\s*\(/im.test(code) ||
    /^\s*class\s+Test[a-z0-9_]*\s*[\(:]/im.test(code) ||
    /^\s*(?:from\s+(?:pytest|unittest)\s+import|import\s+(?:pytest|unittest)(?:\s|,|$))/im
      .test(code));
}

function findRepositoryRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function pathEntry(relativePath, root) {
  const absolutePath = path.join(root, relativePath);
  try {
    return { absolutePath, stat: fs.lstatSync(absolutePath) };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

function repositoryPathKey(root) {
  let caseInsensitive = false;
  try {
    caseInsensitive = fs.realpathSync.native(path.join(root, '.git')) ===
      fs.realpathSync.native(path.join(root, '.GIT'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return (value) => caseInsensitive ? value.toLowerCase() : value;
}

function isSameOrDescendantPath(candidate, ancestor) {
  return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
}

function addManifestBlocker(report, reason, details = {}) {
  report.blockers.push({ code: 'MANIFEST_INVALID', reason, ...details });
}

function isCanonicalRepositoryPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0')) {
    return false;
  }
  if (path.posix.isAbsolute(value) || /^[a-z]:/i.test(value) || /[*?\[\]]/.test(value)) {
    return false;
  }
  const segments = value.split('/');
  return segments.every((segment) => segment && segment !== '.' && segment !== '..') &&
    path.posix.normalize(value) === value;
}

function readMigrationManifest(root, report) {
  const relativePath = 'work-products/clean-migration.json';
  const manifestEntry = pathEntry(relativePath, root);
  if (!manifestEntry) return [];
  if (manifestEntry.stat.isSymbolicLink() || !manifestEntry.stat.isFile()) {
    addManifestBlocker(report, 'manifest-file');
    return [];
  }
  const readable = readTextFile(manifestEntry.absolutePath);
  if (readable.error) {
    addManifestBlocker(report, 'manifest-file', { detail: readable.error });
    return [];
  }

  let manifest;
  try {
    manifest = JSON.parse(readable.text);
  } catch (error) {
    addManifestBlocker(report, 'json', { detail: error.message });
    return [];
  }
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') {
    addManifestBlocker(report, 'top-level-type');
    return [];
  }
  const topLevelKeys = Object.keys(manifest).sort();
  if (topLevelKeys.length !== 2 || topLevelKeys[0] !== 'moves' || topLevelKeys[1] !== 'version') {
    addManifestBlocker(report, 'top-level-fields');
    return [];
  }
  if (manifest.version !== 1) {
    addManifestBlocker(report, 'version');
    return [];
  }
  if (!Array.isArray(manifest.moves)) {
    addManifestBlocker(report, 'moves-type');
    return [];
  }

  const entries = [];
  const sources = new Set();
  const targets = new Set();
  const keyFor = repositoryPathKey(root);
  const fixedSourceKeys = [...fixedSources].map(keyFor);
  const fixedTargetKeys = [...fixedTargets].map(keyFor);
  for (let index = 0; index < manifest.moves.length; index += 1) {
    const move = manifest.moves[index];
    if (!move || Array.isArray(move) || typeof move !== 'object') {
      addManifestBlocker(report, 'entry-type', { index });
      continue;
    }
    const keys = Object.keys(move).sort();
    if (keys.join('\0') !== ['rewritePolicy', 'source', 'target', 'tracking'].join('\0')) {
      addManifestBlocker(report, 'entry-fields', { index });
      continue;
    }
    if (!isCanonicalRepositoryPath(move.source)) {
      addManifestBlocker(report, 'source-path', { index, source: move.source });
      continue;
    }
    if (!isCanonicalRepositoryPath(move.target) ||
        !move.target.startsWith('work-products/')) {
      addManifestBlocker(report, 'target-path', { index, target: move.target });
      continue;
    }
    const sourceSegments = move.source.toLowerCase().split('/');
    if (sourceSegments[0] === 'work-products' ||
        sourceSegments.some((segment) => ignoredDirectoryNames.has(segment))) {
      addManifestBlocker(report, 'source-scope', { index, source: move.source });
      continue;
    }
    if (!['tracked', 'local'].includes(move.tracking)) {
      addManifestBlocker(report, 'tracking', { index, tracking: move.tracking });
      continue;
    }
    if (!['references', 'preserve-content', 'mutable-patch'].includes(move.rewritePolicy)) {
      addManifestBlocker(report, 'rewrite-policy', {
        index,
        rewritePolicy: move.rewritePolicy
      });
      continue;
    }
    const patchLike = /\.(?:patch|diff)$/i.test(move.source) ||
      /\.(?:patch|diff)$/i.test(move.target);
    if (patchLike && move.rewritePolicy === 'references') {
      addManifestBlocker(report, 'patch-policy', { index, source: move.source, target: move.target });
      continue;
    }
    if (!patchLike && move.rewritePolicy === 'mutable-patch') {
      addManifestBlocker(report, 'mutable-patch-policy', {
        index,
        source: move.source,
        target: move.target
      });
      continue;
    }
    const sourceKey = keyFor(move.source);
    const targetKey = keyFor(move.target);
    if (fixedSourceKeys.some((fixed) => isSameOrDescendantPath(sourceKey, fixed)) ||
        fixedTargetKeys.some((fixed) => isSameOrDescendantPath(targetKey, fixed))) {
      addManifestBlocker(report, 'fixed-fact', { index, source: move.source, target: move.target });
      continue;
    }
    if (sources.has(sourceKey)) {
      addManifestBlocker(report, 'duplicate-source', { index, source: move.source });
      continue;
    }
    if (targets.has(targetKey)) {
      addManifestBlocker(report, 'duplicate-target', { index, target: move.target });
      continue;
    }
    sources.add(sourceKey);
    targets.add(targetKey);
    entries.push({ ...move });
  }
  return entries;
}

function addManifestCandidates(root, report, entries) {
  for (const entry of entries) {
    const sourceParentBlocker = inspectSourceParent(root, entry.source);
    if (sourceParentBlocker) {
      report.blockers.push(sourceParentBlocker);
      continue;
    }
    const targetParentBlocker = inspectTargetParent(root, entry.target);
    if (targetParentBlocker) {
      report.blockers.push(targetParentBlocker);
      continue;
    }
    const sourceEntry = pathEntry(entry.source, root);
    const targetEntry = pathEntry(entry.target, root);
    if (targetEntry && (targetEntry.stat.isSymbolicLink() || !targetEntry.stat.isFile())) {
      report.blockers.push({
        code: 'MANIFEST_TARGET_UNSAFE',
        target: entry.target,
        reason: targetEntry.stat.isSymbolicLink() ? 'symbolic-link' : 'not-regular-file'
      });
      continue;
    }
    if (!sourceEntry) {
      report.inactiveManifestEntries.push({
        ...entry,
        state: targetEntry ? 'satisfied' : 'inactive'
      });
      continue;
    }
    if (sourceEntry.stat.isSymbolicLink() || !sourceEntry.stat.isFile()) {
      report.blockers.push({
        code: 'MANIFEST_SOURCE_UNSAFE',
        source: entry.source,
        reason: sourceEntry.stat.isSymbolicLink() ? 'symbolic-link' : 'not-regular-file'
      });
      continue;
    }
    addCandidate(report, root, entry.source, entry.target, 'manifest-entry', {
      authorization: 'manifest',
      tracking: entry.tracking,
      rewritePolicy: entry.rewritePolicy
    });
  }
}

function manifestIgnoreContract(entries) {
  const rules = [];
  const probes = [];
  for (const entry of entries) {
    probes.push({
      path: entry.target,
      expected: entry.tracking === 'tracked' ? 'tracked' : 'ignored'
    });
  }
  const trackedTargets = entries
    .filter((entry) => entry.tracking === 'tracked' &&
      !entry.target.startsWith('work-products/tests/'))
    .map((entry) => entry.target)
    .sort();
  const emittedDirectories = new Set();
  for (const target of trackedTargets) {
    const segments = target.split('/');
    for (let index = 2; index < segments.length; index += 1) {
      const directory = segments.slice(0, index).join('/');
      if (emittedDirectories.has(directory)) continue;
      emittedDirectories.add(directory);
      rules.push(`!/${directory}/`);
      rules.push(`/${directory}/*`);
    }
    rules.push(`!/${target}`);
  }
  return {
    rules: [...new Set(rules)],
    probes: probes.sort(comparePaths)
  };
}

function addCandidate(report, root, source, target, reason, options = {}) {
  const sourceEntry = pathEntry(source, root);
  if (!sourceEntry) return;
  if (sourceEntry.stat.isSymbolicLink()) {
    report.skipped.push({ path: source, reason: 'symbolic-link' });
    return;
  }
  if (!sourceEntry.stat.isFile()) {
    report.skipped.push({ path: source, reason: 'not-regular-file' });
    return;
  }
  const readable = readTextFile(sourceEntry.absolutePath);
  if (readable.error) {
    report.blockers.push({
      code: 'CANDIDATE_UNREADABLE',
      path: source,
      reason: readable.error
    });
    return;
  }

  report.moves.push({
    source,
    target,
    reason,
    authorization: options.authorization || 'fixed-legacy',
    tracking: options.tracking || 'tracked',
    rewritePolicy: options.rewritePolicy || 'references'
  });
  if (pathEntry(target, root)) {
    report.blockers.push({ code: 'TARGET_EXISTS', source, target });
  }
}

function visitTests(directory, root, report, authorizedSources) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toPosix(path.relative(root, absolutePath));
    if (entry.isSymbolicLink()) {
      report.skipped.push({ path: relativePath, reason: 'symbolic-link' });
      continue;
    }
    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name.toLowerCase()) ||
          relativePath === 'work-products') {
        continue;
      }
      visitTests(absolutePath, root, report, authorizedSources);
      continue;
    }
    if (!entry.isFile() || !isSupportedTestName(entry.name)) continue;
    if (derivedArtifactSuffixPattern.test(entry.name)) {
      report.skipped.push({ path: relativePath, reason: 'derived-artifact' });
      continue;
    }
    const readable = readTextFile(absolutePath);
    if (!readable.error && isWeakPythonSuffixTest(relativePath, entry.name, readable.text)) {
      report.skipped.push({ path: relativePath, reason: 'test-name-without-test-evidence' });
      continue;
    }

    if (!authorizedSources.has(relativePath)) {
      report.preservedProductFiles.push({ path: relativePath, reason: 'test-name-only' });
    }
  }
}

function inspectLegacyTasks(root, report, authorizedSources) {
  const tasksEntry = pathEntry('tasks', root);
  if (!tasksEntry) return { removeIgnoreRule: true, removeDirectoryAfterMoves: false };
  if (tasksEntry.stat.isSymbolicLink() || !tasksEntry.stat.isDirectory()) {
    report.unclassifiedLegacyFiles.push({ path: 'tasks', reason: 'unsupported-entry' });
    report.blockers.push({ code: 'LEGACY_DIRECTORY_REMAINS', path: 'tasks' });
    return { removeIgnoreRule: false, removeDirectoryAfterMoves: false };
  }

  let entries;
  try {
    entries = fs.readdirSync(tasksEntry.absolutePath, { withFileTypes: true });
  } catch (error) {
    report.unclassifiedLegacyFiles.push({
      path: 'tasks',
      reason: `unreadable-directory:${error.code || 'unknown'}`
    });
    report.blockers.push({
      code: 'LEGACY_DIRECTORY_REMAINS',
      path: 'tasks',
      reason: error.code || 'unknown'
    });
    return { removeIgnoreRule: false, removeDirectoryAfterMoves: false };
  }

  for (const entry of entries) {
    const relativePath = `tasks/${entry.name}`;
    if (entry.isFile() && authorizedSources.has(relativePath)) continue;
    const reason = entry.isFile() ? 'manifest-entry-required' : 'unsupported-entry';
    report.unclassifiedLegacyFiles.push({ path: relativePath, reason });
    report.blockers.push({ code: 'LEGACY_DIRECTORY_REMAINS', path: relativePath });
  }
  const complete = report.unclassifiedLegacyFiles.length === 0;
  return {
    removeIgnoreRule: complete,
    removeDirectoryAfterMoves: complete && entries.length > 0
  };
}

function inspectGitignoreSemantics(content, probes = ignoreSemanticProbes) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-clean-ignore-'));
  const isolatedConfig = path.join(workspace, 'isolated-global-config');
  try {
    fs.writeFileSync(path.join(workspace, '.gitignore'), content);
    fs.writeFileSync(isolatedConfig, '');
    const environment = {
      ...process.env,
      GIT_CONFIG_GLOBAL: isolatedConfig,
      GIT_CONFIG_NOSYSTEM: '1'
    };
    const init = childProcess.spawnSync(
      'git',
      ['init', '--quiet'],
      { cwd: workspace, encoding: 'utf8', env: environment }
    );
    if (init.status !== 0) {
      return [gitCommandFailure(
        'GITIGNORE_CHECK_FAILED', 'git init', init, 'git init failed'
      )];
    }

    const result = childProcess.spawnSync(
      'git',
      ['check-ignore', '--no-index', '-z', '--stdin'],
      {
        cwd: workspace,
        encoding: 'utf8',
        env: environment,
        input: `${probes.map((probe) => probe.path).join('\0')}\0`
      }
    );
    if (result.status !== 0 && result.status !== 1) {
      return [gitCommandFailure(
        'GITIGNORE_CHECK_FAILED', 'git check-ignore', result, 'git check-ignore failed'
      )];
    }

    const ignored = new Set(result.stdout.split('\0').filter(Boolean).map(toPosix));
    return probes
      .filter((probe) => ignored.has(probe.path) !== (probe.expected === 'ignored'))
      .map((probe) => ({
        code: 'GITIGNORE_SEMANTIC_CONFLICT',
        path: probe.path,
        expected: probe.expected
      }));
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

function findNestedCanonicalIgnoreRules(lines) {
  const present = new Set(lines);
  const remove = [];
  for (const line of lines) {
    const match = line.match(/^\/(.+)\/work-products\/\*$/);
    if (!match) continue;
    const prefix = match[1];
    const family = requiredIgnoreRules.map((rule) =>
      rule.replace('/work-products', `/${prefix}/work-products`));
    if (family.every((rule) => present.has(rule))) remove.push(...family);
  }
  return [...new Set(remove)];
}
function planGitignore(root, removeTasksRule = true, dynamicRules = [], dynamicProbes = []) {
  const ignorePath = path.join(root, '.gitignore');
  const existed = fs.existsSync(ignorePath);
  const original = existed ? fs.readFileSync(ignorePath) : Buffer.alloc(0);
  const content = original.toString('utf8');
  const records = content.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g)
    .filter((record) => record.length > 0);
  const lines = records.map((record) => record.replace(/(?:\r\n|\n|\r)$/, '').trim());
  const present = new Set(lines);
  const dynamicRuleSet = new Set(dynamicRules);
  const remove = [
    ...obsoleteIgnoreRules.filter((rule) => present.has(rule)),
    ...removeTasksRule && present.has('/tasks/') ? ['/tasks/'] : [],
    ...findNestedCanonicalIgnoreRules(lines),
    ...lines.filter((line) => dynamicRuleSet.has(line))
  ];
  const removable = new Set(remove);
  const kept = records.filter((record) => {
    const line = record.replace(/(?:\r\n|\n|\r)$/, '').trim();
    return !removable.has(line);
  });
  let nextContent = kept.join('');
  const remaining = new Set(kept.map((record) =>
    record.replace(/(?:\r\n|\n|\r)$/, '').trim()));
  const managedRules = [...requiredIgnoreRules, ...dynamicRules];
  const add = managedRules.filter((rule) => !remaining.has(rule));
  if (add.length > 0) {
    const eol = content.includes('\r\n') ? '\r\n' : content.includes('\r') ? '\r' : '\n';
    const preserveFinalEol = content.length === 0 || /(?:\r\n|\n|\r)$/.test(content);
    if (nextContent && !/(?:\r\n|\n|\r)$/.test(nextContent)) nextContent += eol;
    nextContent += add.join(eol);
    if (preserveFinalEol) nextContent += eol;
  }
  const next = Buffer.from(nextContent, 'utf8');
  const changed = !next.equals(original);
  const probes = [...ignoreSemanticProbes, ...dynamicProbes]
    .filter((probe, index, all) =>
      all.findIndex((candidate) => candidate.path === probe.path) === index);
  const blockers = inspectGitignoreSemantics(nextContent, probes);

  return {
    report: changed ? { add, remove: [...new Set(remove)] } : { add: [], remove: [] },
    blockers,
    change: !changed
      ? null
      : {
          source: '.gitignore',
          output: '.gitignore',
          original,
          next,
          existed
        }
  };
}

function inspectExternalIgnores(root) {
  const gitDirectoryResult = childProcess.spawnSync(
    'git',
    ['rev-parse', '--absolute-git-dir'],
    { cwd: root, encoding: 'utf8' }
  );
  if (gitDirectoryResult.status !== 0) return [];

  const gitDirectory = path.resolve(gitDirectoryResult.stdout.trim());
  const globalResult = childProcess.spawnSync(
    'git',
    ['config', '--path', '--get', 'core.excludesFile'],
    { cwd: root, encoding: 'utf8' }
  );
  const globalFile = globalResult.status === 0
    ? path.resolve(globalResult.stdout.trim())
    : null;
  const repositoryFile = path.join(gitDirectory, 'info', 'exclude');
  const probes = [
    'work-products/SPEC.md',
    'work-products/plan.md',
    'work-products/todo.md',
    'work-products/tests/clean-contract.test.js'
  ];
  const result = childProcess.spawnSync(
    'git',
    ['check-ignore', '--no-index', '-z', '-v', '--stdin'],
    {
      cwd: os.tmpdir(),
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_DIR: gitDirectory,
        GIT_WORK_TREE: os.tmpdir()
      },
      input: `${probes.join('\0')}\0`
    }
  );
  if (result.status !== 0 || !result.stdout) return [];

  const fields = result.stdout.split('\0');
  const sources = [];
  for (let index = 0; index + 3 < fields.length; index += 4) {
    const [source, line, pattern, affectedPath] = fields.slice(index, index + 4);
    const absoluteSource = path.resolve(source);
    let scope = null;
    if (path.normalize(absoluteSource) === path.normalize(repositoryFile)) {
      scope = 'repository';
    } else if (globalFile && path.normalize(absoluteSource) === path.normalize(globalFile)) {
      scope = 'global';
    }
    if (!scope) continue;
    sources.push({
      scope,
      source: scope === 'repository'
        ? toPosix(path.relative(root, absoluteSource))
        : toPosix(absoluteSource),
      line: Number(line),
      pattern,
      path: toPosix(affectedPath)
    });
  }
  return sources;
}

function isInsideRoot(root, target) {
  const relativePath = path.relative(root, target);
  return relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function inspectTargetParent(root, target) {
  const absoluteTarget = path.resolve(root, target);
  const parent = path.dirname(absoluteTarget);
  const relativeParent = path.relative(root, parent);
  if (!isInsideRoot(root, parent)) {
    return { code: 'TARGET_PARENT_OUTSIDE_REPOSITORY', path: toPosix(relativeParent), target };
  }

  const rootRealPath = fs.realpathSync(root);
  let current = root;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error.code === 'ENOENT') break;
      return {
        code: 'TARGET_PARENT_UNREADABLE',
        path: toPosix(path.relative(root, current)),
        target,
        reason: error.code || 'unknown'
      };
    }
    const currentPath = toPosix(path.relative(root, current));
    if (stat.isSymbolicLink()) {
      return { code: 'TARGET_PARENT_SYMLINK', path: currentPath, target };
    }
    if (!stat.isDirectory()) {
      return { code: 'TARGET_PARENT_NOT_DIRECTORY', path: currentPath, target };
    }
    let currentRealPath;
    try {
      currentRealPath = fs.realpathSync(current);
    } catch (error) {
      return {
        code: 'TARGET_PARENT_UNREADABLE',
        path: currentPath,
        target,
        reason: error.code || 'unknown'
      };
    }
    if (!isInsideRoot(rootRealPath, currentRealPath)) {
      return { code: 'TARGET_PARENT_OUTSIDE_REPOSITORY', path: currentPath, target };
    }
  }
  return null;
}

function inspectSourceParent(root, source) {
  const blocker = inspectTargetParent(root, source);
  if (!blocker) return null;
  const reasons = {
    TARGET_PARENT_SYMLINK: 'ancestor-symbolic-link',
    TARGET_PARENT_NOT_DIRECTORY: 'ancestor-not-directory',
    TARGET_PARENT_OUTSIDE_REPOSITORY: 'ancestor-outside-repository',
    TARGET_PARENT_UNREADABLE: 'ancestor-unreadable'
  };
  return {
    code: 'MANIFEST_SOURCE_UNSAFE',
    source,
    path: blocker.path,
    reason: reasons[blocker.code] || 'ancestor-unsafe'
  };
}

function addMoveSafetyBlockers(root, report) {
  const targets = new Map();
  const sources = new Map();
  const keyFor = repositoryPathKey(root);
  for (const move of report.moves) {
    const key = keyFor(move.target);
    const existing = targets.get(key);
    if (existing) {
      existing.sources.push(move.source);
    } else {
      targets.set(key, { target: move.target, sources: [move.source] });
    }
    const parentBlocker = inspectTargetParent(root, move.target);
    if (parentBlocker &&
        !report.blockers.some((blocker) =>
          blocker.code === parentBlocker.code &&
          blocker.path === parentBlocker.path &&
          blocker.target === parentBlocker.target)) {
      report.blockers.push(parentBlocker);
    }
    let sourceKey = keyFor(move.source);
    try {
      sourceKey = keyFor(toPosix(path.relative(
        root,
        fs.realpathSync.native(path.join(root, move.source))
      )));
    } catch {
      // Candidate validation reports missing or unreadable sources separately.
    }
    const source = sources.get(sourceKey);
    if (source) {
      source.paths.push(move.source);
    } else {
      sources.set(sourceKey, { source: move.source, paths: [move.source] });
    }
  }
  for (const { target, sources } of targets.values()) {
    if (sources.length > 1) {
      report.blockers.push({ code: 'TARGET_COLLISION', target, sources });
    }
  }
  for (const { source, paths } of sources.values()) {
    if (paths.length > 1) {
      report.blockers.push({ code: 'SOURCE_COLLISION', source, paths });
    }
  }
}

function readTextFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.includes(0)) return { error: 'not-utf8-text' };
    return {
      buffer,
      text: new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    };
  } catch (error) {
    return {
      error: error instanceof TypeError ? 'not-utf8-text' : `read-failed:${error.code || 'unknown'}`
    };
  }
}

function hashBuffer(algorithm, buffer) {
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

function checksumAlgorithm(fileName) {
  if (fileName === 'SHA256SUMS' || fileName === 'SHA256SUMS.txt') return 'sha256';
  if (fileName === 'SHA512SUMS' || fileName === 'SHA512SUMS.txt') return 'sha512';
  return null;
}

function inspectIntegrity(root, report) {
  const checksumBindings = new Map();
  for (const textFile of collectFilePaths(root, report)) {
    const algorithm = checksumAlgorithm(path.basename(textFile.file));
    if (!algorithm) continue;
    const readable = readTextFile(textFile.absolutePath);
    if (readable.error) {
      report.blockers.push({
        code: 'INTEGRITY_MANIFEST_UNREADABLE',
        file: textFile.file,
        reason: readable.error
      });
      continue;
    }
    const digestLength = algorithm === 'sha256' ? 64 : 128;
    const pattern = new RegExp(`^([0-9a-f]{${digestLength}})  (.+)$`, 'i');
    for (const line of readable.text.split(/\r?\n/)) {
      const match = line.match(pattern);
      if (!match || !isCanonicalRepositoryPath(match[2])) continue;
      const binding = {
        file: textFile.file,
        algorithm,
        expectedHash: match[1].toLowerCase(),
        path: match[2]
      };
      const bindings = checksumBindings.get(binding.path) || [];
      bindings.push(binding);
      checksumBindings.set(binding.path, bindings);
    }
  }

  for (const move of report.moves) {
    const sourceBuffer = fs.readFileSync(path.join(root, move.source));
    const checksums = [
      ...(checksumBindings.get(move.source) || []),
      ...(checksumBindings.get(move.target) || [])
    ].sort((left, right) => {
      const leftKey = `${left.file}\0${left.path}`;
      const rightKey = `${right.file}\0${right.path}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
    for (const checksum of checksums) {
      const actualHash = hashBuffer(checksum.algorithm, sourceBuffer);
      if (actualHash !== checksum.expectedHash) {
        report.blockers.push({
          code: 'INTEGRITY_CHECKSUM_MISMATCH',
          source: move.source,
          checksumFile: checksum.file,
          algorithm: checksum.algorithm,
          expectedHash: checksum.expectedHash,
          actualHash
        });
      }
    }
    if (checksums.length > 0 && move.rewritePolicy !== 'preserve-content') {
      report.blockers.push({
        code: 'INTEGRITY_COUPLED_ARTIFACT',
        source: move.source,
        target: move.target,
        rewritePolicy: move.rewritePolicy,
        checksumFiles: [...new Set(checksums.map((checksum) => checksum.file))]
      });
    }
    if (move.rewritePolicy === 'preserve-content') {
      report.integrityProtectedFiles.push({
        source: move.source,
        target: move.target,
        rewritePolicy: move.rewritePolicy,
        algorithm: 'sha256',
        expectedHash: hashBuffer('sha256', sourceBuffer),
        checksums
      });
    }
  }
  report.integrityProtectedFiles.sort(comparePaths);
}

function collectFilePaths(root, report) {
  const files = [];

  function visit(directory) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      report.skipped.push({
        path: toPosix(path.relative(root, directory)),
        reason: 'unreadable-directory:' + (error.code || 'unknown')
      });
      return;
    }
    entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      if (ignoredDirectoryNames.has(entry.name.toLowerCase())) continue;
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosix(path.relative(root, absolutePath));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        files.push({ file: relativePath, absolutePath });
      }
    }
  }

  visit(root);
  return files.sort((left, right) => left.file < right.file ? -1 : left.file > right.file ? 1 : 0);
}

function resolveReference(root, source, finalSource, reference, moveMap) {
  const hashIndex = reference.indexOf('#');
  const pathPart = hashIndex >= 0 ? reference.slice(0, hashIndex) : reference;
  const suffix = hashIndex >= 0 ? reference.slice(hashIndex) : '';
  if (!pathPart) return null;

  let decodedPath;
  try {
    decodedPath = decodeURI(pathPart);
  } catch {
    return null;
  }
  const isAbsolutePath = path.isAbsolute(decodedPath) || /^[a-z]:[\\/]/i.test(decodedPath);
  if (!isAbsolutePath && /^(?:[a-z][a-z0-9+.-]*:|#)/i.test(reference)) return null;
  const currentTarget = isAbsolutePath
    ? path.resolve(decodedPath)
    : path.resolve(root, path.dirname(source), decodedPath);
  if (!isInsideRoot(root, currentTarget)) return null;
  const currentRelative = toPosix(path.relative(root, currentTarget));
  const sourceWasMoved = source !== finalSource;
  const referenceTargetsMoveSource = moveMap.has(currentRelative);
  if (!sourceWasMoved && !referenceTargetsMoveSource) return null;
  if (!fs.existsSync(currentTarget) && ![...moveMap.values()].includes(currentRelative)) return null;
  const finalTarget = moveMap.get(currentRelative) || currentRelative;
  let rewritten = toPosix(path.relative(path.dirname(finalSource), finalTarget));
  if (!rewritten) rewritten = path.basename(finalTarget);
  if (pathPart.startsWith('./') && !rewritten.startsWith('.')) rewritten = `./${rewritten}`;
  return { rewritten: `${rewritten}${suffix}`, target: finalTarget };
}

function formatReference(reference, rewritten, preserveSpaces) {
  if (preserveSpaces || !/%[0-9a-f]{2}/i.test(reference)) return rewritten;
  const hashIndex = rewritten.indexOf('#');
  const pathPart = hashIndex >= 0 ? rewritten.slice(0, hashIndex) : rewritten;
  const suffix = hashIndex >= 0 ? rewritten.slice(hashIndex) : '';
  return `${encodeURI(pathPart)}${suffix}`;
}

function collectProvenRootReferenceOffsets(source, content, moveSourcePattern) {
  const offsets = new Set();
  if (!moveSourcePattern) return offsets;
  const code = pathEvidenceCodeOnly(source, content);
  if (!code) return offsets;

  const pattern = new RegExp(
    '(?:\\b(?:Path|PurePath|PurePosixPath|PureWindowsPath|open|' +
    '(?:fs\\.)?(?:readFileSync|writeFileSync))\\s*\\(\\s*|' +
    "\\b[A-Za-z_][A-Za-z0-9_]*\\s*\\/\\s*)(['\"])" +
    '(' + moveSourcePattern + ')\\1',
    'g'
  );
  const references = new Set();
  for (const match of content.matchAll(pattern)) {
    if (match.index === undefined || code[match.index] !== content[match.index]) continue;
    references.add(match[2]);
    offsets.add(match.index + match[0].lastIndexOf(match[2]));
  }

  const coupledPattern = new RegExp(
    "\\bchanges\\s*\\[\\s*(['\"])(" + moveSourcePattern + ')\\1\\s*\\]\\s*=',
    'g'
  );
  for (const match of content.matchAll(coupledPattern)) {
    if (match.index === undefined || code[match.index] !== content[match.index]) continue;
    if (!references.has(match[2])) continue;
    offsets.add(match.index + match[0].indexOf(match[2]));
  }
  return offsets;
}

function rewriteRelativeReferences(
  root,
  source,
  target,
  content,
  moveMap,
  updates,
  checks,
  blockers,
  patchHeadersOnly = false
) {
  const markdownPattern =
    /(!?\[[^\]\r\n]*\]\()([ \t]*)(?:<([^>\r\n]+)>|((?:\\.|[^)\s])+))((?:[ \t]+(?:"[^"\r\n]*"|'[^'\r\n]*'|\([^)\r\n]*\)))?[ \t]*)(\))/g;
  const quotedPattern = /(['"])((?:\.\.?[\\/]|[a-z]:[\\/]|\/)[^'"\r\n]+)\1/gi;
  const moveSourcePattern = [...moveMap.keys()]
    .sort((left, right) => right.length - left.length)
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  let next = content;
  if (moveSourcePattern) {
    if (!patchHeadersOnly) {
      const diffArgumentPattern = new RegExp(
        "((?:fromfile|tofile)\\s*=\\s*)(['\"])([ab]\\/)" +
        '(' + moveSourcePattern + ')\\2',
        'g'
      );
      next = next.replace(
        diffArgumentPattern,
        (match, prefix, quote, side, reference) => {
          const finalTarget = moveMap.get(reference);
          const from = side + reference;
          const to = side + finalTarget;
          updates.push({ file: target, from, to, count: 1 });
          checks.push({ file: target, reference: to, target: finalTarget });
          return prefix + quote + to + quote;
        }
      );
    }
    const diffFilePattern = new RegExp(
      '^((?:---|\\+\\+\\+) [ab]\\/)(' + moveSourcePattern + ')(?=\\t|\\r?$)',
      'gm'
    );
    next = next.replace(diffFilePattern, (match, prefix, reference) => {
      const finalTarget = moveMap.get(reference);
      const from = prefix + reference;
      const to = prefix + finalTarget;
      updates.push({ file: target, from, to, count: 1 });
      checks.push({ file: target, reference: to, target: finalTarget });
      return to;
    });
    const diffGitPattern = new RegExp(
      '^(diff --git a\\/)(' + moveSourcePattern + ')( b\\/)\\2(?=\\r?$)',
      'gm'
    );
    next = next.replace(diffGitPattern, (match, prefix, reference, middle) => {
      const finalTarget = moveMap.get(reference);
      const from = prefix + reference + middle + reference;
      const to = prefix + finalTarget + middle + finalTarget;
      updates.push({ file: target, from, to, count: 2 });
      checks.push({ file: target, reference: to, target: finalTarget });
      return to;
    });
    if (patchHeadersOnly) return next;
    const provenRootReferenceOffsets = collectProvenRootReferenceOffsets(
      source,
      next,
      moveSourcePattern
    );
    const quotedMovePattern = new RegExp("(['\"])(" + moveSourcePattern + ')\\1', 'g');
    next = next.replace(quotedMovePattern, (match, quote, reference, offset) => {
      const finalTarget = moveMap.get(reference);
      if (provenRootReferenceOffsets.has(offset + quote.length)) {
        updates.push({ file: target, from: reference, to: finalTarget, count: 1 });
        checks.push({ file: target, reference: finalTarget, target: finalTarget });
        return quote + finalTarget + quote;
      }
      if (!blockers.some((blocker) =>
        blocker.code === 'AMBIGUOUS_REFERENCE' &&
        blocker.file === target &&
        blocker.reference === reference &&
        blocker.target === finalTarget)) {
        blockers.push({
          code: 'AMBIGUOUS_REFERENCE',
          file: target,
          reference,
          target: finalTarget
        });
      }
      return match;
    });
  }
  next = next.replace(
    markdownPattern,
    (match, prefix, spacing, angleReference, bareReference, title, suffix) => {
    const reference = angleReference || bareReference;
    const rewritten = resolveReference(root, source, target, reference, moveMap);
    if (!rewritten) return match;
    const formatted = formatReference(reference, rewritten.rewritten, Boolean(angleReference));
    checks.push({ file: target, reference: formatted, target: rewritten.target });
    if (formatted === reference) return match;
    updates.push({ file: target, from: reference, to: formatted, count: 1 });
    const destination = angleReference
      ? `<${formatted}>`
      : formatted;
    return `${prefix}${spacing}${destination}${title}${suffix}`;
  });
  next = next.replace(quotedPattern, (match, quote, reference) => {
    const rewritten = resolveReference(root, source, target, reference, moveMap);
    if (!rewritten) return match;
    checks.push({ file: target, reference: rewritten.rewritten, target: rewritten.target });
    if (rewritten.rewritten === reference) return match;
    updates.push({ file: target, from: reference, to: rewritten.rewritten, count: 1 });
    return `${quote}${rewritten.rewritten}${quote}`;
  });
  return next;
}

function buildPlan(workspace = process.cwd()) {
  const root = findRepositoryRoot(workspace);
  const report = {
    version: 2,
    mode: 'preview',
    status: 'NO_CHANGES',
    moves: [],
    preservedProductFiles: [],
    unclassifiedLegacyFiles: [],
    integrityProtectedFiles: [],
    inactiveManifestEntries: [],
    referenceUpdates: [],
    gitignoreChanges: { add: [], remove: [] },
    externalIgnoreSources: [],
    blockers: [],
    skipped: []
  };

  if (!root) {
    report.status = 'BLOCKED';
    report.blockers.push({ code: 'REPOSITORY_NOT_FOUND', path: path.resolve(workspace) });
    return { root: null, report, changes: [] };
  }

  const manifestEntries = readMigrationManifest(root, report);
  addManifestCandidates(root, report, manifestEntries);
  for (const candidate of legacyFiles) addCandidate(report, root, ...candidate);
  const authorizedSources = new Set(report.moves.map((move) => move.source));
  const legacyPlan = inspectLegacyTasks(root, report, authorizedSources);
  visitTests(root, root, report, authorizedSources);
  const ignoreContract = manifestIgnoreContract(manifestEntries);
  const gitignorePlan = planGitignore(
    root,
    legacyPlan.removeIgnoreRule,
    ignoreContract.rules,
    ignoreContract.probes
  );
  report.gitignoreChanges = gitignorePlan.report;
  report.blockers.push(...gitignorePlan.blockers);
  report.externalIgnoreSources = inspectExternalIgnores(root);
  report.moves.sort(comparePaths);
  report.preservedProductFiles.sort(comparePaths);
  report.unclassifiedLegacyFiles.sort(comparePaths);
  report.inactiveManifestEntries.sort(comparePaths);
  addMoveSafetyBlockers(root, report);
  inspectIntegrity(root, report);

  const moveMap = new Map(report.moves.map(({ source, target }) => [source, target]));
  const moveDetails = new Map(report.moves.map((move) => [move.source, move]));
  const updates = [];
  const referenceChecks = [];
  const changes = [];
  for (const textFile of collectFilePaths(root, report)) {
    const file = textFile.file;
    if (file === '.gitignore' || file === 'work-products/clean-migration.json' ||
        checksumAlgorithm(path.basename(file))) continue;
    const readable = readTextFile(textFile.absolutePath);
    if (readable.error) {
      if (readable.error.startsWith('read-failed:')) {
        report.skipped.push({ path: file, reason: readable.error });
      }
      continue;
    }
    const original = readable.buffer;
    let content = readable.text;
    const output = moveMap.get(file) || file;
    const move = moveDetails.get(file);
    const patchLike = /\.(?:patch|diff)$/i.test(file) ||
      /\.(?:patch|diff)$/i.test(output);
    const mayRewrite = move?.rewritePolicy !== 'preserve-content' &&
      (!patchLike || move?.rewritePolicy === 'mutable-patch');
    if (mayRewrite) {
      content = rewriteRelativeReferences(
        root,
        file,
        output,
        content,
        moveMap,
        updates,
        referenceChecks,
        report.blockers,
        move?.rewritePolicy === 'mutable-patch'
      );
    }
    const next = Buffer.from(content, 'utf8');
    if (!next.equals(original)) changes.push({ source: file, output, original, next });
  }
  if (gitignorePlan.change) changes.push(gitignorePlan.change);
  report.referenceUpdates = updates.sort((left, right) => {
    const leftKey = `${left.file}\0${left.from}\0${left.to}`;
    const rightKey = `${right.file}\0${right.from}\0${right.to}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  report.skipped.sort(comparePaths);
  report.blockers.sort(comparePaths);
  const hasChanges = report.moves.length > 0 ||
    report.referenceUpdates.length > 0 ||
    report.gitignoreChanges.add.length > 0 ||
    report.gitignoreChanges.remove.length > 0;
  report.status = report.blockers.length > 0
    ? 'BLOCKED'
    : hasChanges ? 'READY' : 'NO_CHANGES';
  return {
    root,
    report,
    changes,
    referenceChecks,
    dynamicIgnoreRules: ignoreContract.rules,
    dynamicIgnoreProbes: ignoreContract.probes,
    legacyDirectoriesToRemove: legacyPlan.removeDirectoryAfterMoves ? ['tasks'] : []
  };
}

function inspect(workspace = process.cwd()) {
  return buildPlan(workspace).report;
}

function applyWorkspace(workspace = process.cwd(), dependencies = {}) {
  const plan = buildPlan(workspace);
  if (plan.report.status === 'BLOCKED') return plan.report;
  if (plan.report.moves.length === 0 && plan.changes.length === 0) {
    return { ...plan.report, mode: 'apply', status: 'NO_CHANGES' };
  }

  const moved = [];
  const written = [];
  const createdDirectories = new Set();
  const expectedMoveContents = new Map(plan.report.moves.map((move) => [
    move.target,
    fs.readFileSync(path.join(plan.root, move.source))
  ]));
  for (const change of plan.changes) {
    if (expectedMoveContents.has(change.output)) {
      expectedMoveContents.set(change.output, change.next);
    }
  }
  let operationCount = 0;
  const afterOperation = dependencies.afterOperation || (() => {});

  function ensureDirectory(directory) {
    const missing = [];
    let current = directory;
    while (isInsideRoot(plan.root, current) && !fs.existsSync(current)) {
      missing.push(current);
      current = path.dirname(current);
    }
    fs.mkdirSync(directory, { recursive: true });
    for (const created of missing) createdDirectories.add(created);
  }

  function completed(operation) {
    operationCount += 1;
    afterOperation(operationCount, operation);
  }

  try {
    for (const move of plan.report.moves) {
      const source = path.join(plan.root, move.source);
      const target = path.join(plan.root, move.target);
      const parentBlocker = inspectTargetParent(plan.root, move.target);
      if (parentBlocker) throw new Error(`${parentBlocker.code}: ${parentBlocker.path}`);
      ensureDirectory(path.dirname(target));
      const createdParentBlocker = inspectTargetParent(plan.root, move.target);
      if (createdParentBlocker) {
        throw new Error(`${createdParentBlocker.code}: ${createdParentBlocker.path}`);
      }
      fs.renameSync(source, target);
      moved.push(move);
      completed({ type: 'move', source: move.source, target: move.target });
    }

    for (const relativeDirectory of plan.legacyDirectoriesToRemove) {
      const directory = path.join(plan.root, relativeDirectory);
      fs.rmdirSync(directory);
      completed({ type: 'remove-empty-legacy-directory', path: relativeDirectory });
    }

    for (const change of plan.changes) {
      const output = path.join(plan.root, change.output);
      written.push(change);
      fs.writeFileSync(output, change.next);
      completed({ type: 'write', path: change.output });
    }

    for (const move of plan.report.moves) {
      if (fs.existsSync(path.join(plan.root, move.source))) {
        throw new Error(`source still exists after move: ${move.source}`);
      }
      if (!fs.existsSync(path.join(plan.root, move.target))) {
        throw new Error(`target is missing after move: ${move.target}`);
      }
      if (!fs.readFileSync(path.join(plan.root, move.target))
        .equals(expectedMoveContents.get(move.target))) {
        throw new Error(`target content changed during move: ${move.target}`);
      }
    }
    for (const protectedFile of plan.report.integrityProtectedFiles) {
      const actualHash = hashBuffer(
        protectedFile.algorithm,
        fs.readFileSync(path.join(plan.root, protectedFile.target))
      );
      if (actualHash !== protectedFile.expectedHash) {
        throw new Error(`integrity check failed after move: ${protectedFile.target}`);
      }
    }

    for (const change of plan.changes) {
      if (!fs.readFileSync(path.join(plan.root, change.output)).equals(change.next)) {
        throw new Error(`written content differs from plan: ${change.output}`);
      }
    }
    for (const check of plan.referenceChecks) {
      if (!fs.existsSync(path.join(plan.root, check.target))) {
        throw new Error(`rewritten reference target is missing: ${check.file} -> ${check.reference}`);
      }
    }
    const remainingIgnorePlan = planGitignore(
      plan.root,
      true,
      plan.dynamicIgnoreRules,
      plan.dynamicIgnoreProbes
    );
    const remainingIgnoreChanges = remainingIgnorePlan.report;
    if (remainingIgnoreChanges.add.length > 0 || remainingIgnoreChanges.remove.length > 0) {
      throw new Error('.gitignore contract was not applied');
    }
    if (remainingIgnorePlan.blockers.length > 0) {
      throw new Error('.gitignore semantic contract was not applied');
    }
    return { ...plan.report, mode: 'apply', status: 'APPLIED' };
  } catch (error) {
    const rollbackErrors = [];
    for (const change of [...written].reverse()) {
      try {
        const output = path.join(plan.root, change.output);
        if (change.existed === false) {
          fs.rmSync(output, { force: true });
        } else {
          fs.writeFileSync(output, change.original);
        }
      } catch (rollbackError) {
        rollbackErrors.push(`${change.output}: ${rollbackError.message}`);
      }
    }
    for (const move of [...moved].reverse()) {
      try {
        const source = path.join(plan.root, move.source);
        const target = path.join(plan.root, move.target);
        ensureDirectory(path.dirname(source));
        fs.renameSync(target, source);
      } catch (rollbackError) {
        rollbackErrors.push(`${move.target}: ${rollbackError.message}`);
      }
    }
    for (const directory of [...createdDirectories].sort((left, right) => right.length - left.length)) {
      try {
        fs.rmdirSync(directory);
      } catch (rollbackError) {
        if (rollbackError.code !== 'ENOENT' && rollbackError.code !== 'ENOTEMPTY') {
          rollbackErrors.push(`${directory}: ${rollbackError.message}`);
        }
      }
    }
    if (rollbackErrors.length) {
      throw new Error(`${error.message}; rollback failed: ${rollbackErrors.join('; ')}`);
    }
    throw error;
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== 'apply')) {
    console.error(`unknown clean argument: ${args.join(' ')}`);
    process.exitCode = 1;
    return;
  }
  try {
    const report = args[0] === 'apply' ? applyWorkspace() : inspect();
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (args[0] === 'apply' && report.status === 'BLOCKED') process.exitCode = 1;
  } catch (error) {
    const operation = args[0] === 'apply' ? 'apply' : 'preview';
    console.error(`clean ${operation} failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = { applyWorkspace, inspect };
