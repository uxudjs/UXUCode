#!/usr/bin/env node

const fs = require('node:fs');
const childProcess = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const requiredIgnoreRules = [
  '/work-products/*',
  '!/work-products/SPEC.md',
  '!/work-products/plan.md',
  '!/work-products/todo.md',
  '!/work-products/tests/',
  '!/work-products/tests/**'
];
const obsoleteIgnoreRules = ['/SPEC.md', '/tasks/'];
const legacyFiles = [
  ['SPEC.md', 'work-products/SPEC.md', 'legacy-spec-path'],
  ['tasks/plan.md', 'work-products/plan.md', 'legacy-plan-path'],
  ['tasks/todo.md', 'work-products/todo.md', 'legacy-todo-path']
];
const delimitedTestNamePattern = /(?:^test[._]|[._](?:test|spec)[._])/i;
const camelCaseTestNamePattern = /(?:Test|Tests)\.[^.]+$/;
const ignoredDirectoryNames = new Set(['.git', 'node_modules', '.venv', 'venv', 'vendor']);
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

function isSupportedTestName(fileName) {
  return delimitedTestNamePattern.test(fileName) || camelCaseTestNamePattern.test(fileName);
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

function addCandidate(report, root, source, target, reason) {
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

  report.moves.push({ source, target, reason });
  if (pathEntry(target, root)) {
    report.blockers.push({ code: 'TARGET_EXISTS', source, target });
  }
}

function visitTests(directory, root, report) {
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
      visitTests(absolutePath, root, report);
      continue;
    }
    if (!entry.isFile() || !isSupportedTestName(entry.name)) continue;

    const testRelativePath = relativePath.startsWith('tests/')
      ? relativePath.slice('tests/'.length)
      : relativePath;
    addCandidate(
      report,
      root,
      relativePath,
      `work-products/tests/${testRelativePath}`,
      'internal-test-artifact'
    );
  }
}

function inspectGitignoreSemantics(content) {
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
      return [{
        code: 'GITIGNORE_CHECK_FAILED',
        reason: (init.stderr || 'git init failed').trim()
      }];
    }

    const result = childProcess.spawnSync(
      'git',
      ['check-ignore', '--no-index', '-z', '--stdin'],
      {
        cwd: workspace,
        encoding: 'utf8',
        env: environment,
        input: `${ignoreSemanticProbes.map((probe) => probe.path).join('\0')}\0`
      }
    );
    if (result.status !== 0 && result.status !== 1) {
      return [{
        code: 'GITIGNORE_CHECK_FAILED',
        reason: (result.stderr || 'git check-ignore failed').trim()
      }];
    }

    const ignored = new Set(result.stdout.split('\0').filter(Boolean).map(toPosix));
    return ignoreSemanticProbes
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

function planGitignore(root) {
  const ignorePath = path.join(root, '.gitignore');
  const existed = fs.existsSync(ignorePath);
  const original = existed ? fs.readFileSync(ignorePath) : Buffer.alloc(0);
  const content = original.toString('utf8');
  const records = content.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g)
    .filter((record) => record.length > 0);
  const lines = records.map((record) => record.replace(/(?:\r\n|\n|\r)$/, '').trim());
  const present = new Set(lines);
  const remove = obsoleteIgnoreRules.filter((rule) => present.has(rule));
  const kept = records.filter((record) => {
    const line = record.replace(/(?:\r\n|\n|\r)$/, '').trim();
    return !obsoleteIgnoreRules.includes(line);
  });
  let nextContent = kept.join('');
  const remaining = new Set(kept.map((record) =>
    record.replace(/(?:\r\n|\n|\r)$/, '').trim()));
  const add = requiredIgnoreRules.filter((rule) => !remaining.has(rule));
  if (add.length > 0) {
    const eol = content.includes('\r\n') ? '\r\n' : content.includes('\r') ? '\r' : '\n';
    const preserveFinalEol = content.length === 0 || /(?:\r\n|\n|\r)$/.test(content);
    if (nextContent && !/(?:\r\n|\n|\r)$/.test(nextContent)) nextContent += eol;
    nextContent += add.join(eol);
    if (preserveFinalEol) nextContent += eol;
  }
  const next = Buffer.from(nextContent, 'utf8');
  const blockers = inspectGitignoreSemantics(nextContent);

  return {
    report: { add, remove },
    blockers,
    change: next.equals(original)
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

function addMoveSafetyBlockers(root, report) {
  const targets = new Map();
  for (const move of report.moves) {
    const key = process.platform === 'win32' ? move.target.toLowerCase() : move.target;
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
  }
  for (const { target, sources } of targets.values()) {
    if (sources.length > 1) {
      report.blockers.push({ code: 'TARGET_COLLISION', target, sources });
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

function collectTextFiles(root, report) {
  const files = [];

  function visit(directory) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      report.skipped.push({
        path: toPosix(path.relative(root, directory)),
        reason: `unreadable-directory:${error.code || 'unknown'}`
      });
      return;
    }
    for (const entry of entries) {
      if (ignoredDirectoryNames.has(entry.name.toLowerCase())) continue;
      const absolutePath = path.join(directory, entry.name);
      const relativePath = toPosix(path.relative(root, absolutePath));
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        const readable = readTextFile(absolutePath);
        if (!readable.error) {
          files.push({ file: relativePath, original: readable.buffer, content: readable.text });
        } else if (readable.error.startsWith('read-failed:')) {
          report.skipped.push({ path: relativePath, reason: readable.error });
        }
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

function rewriteRelativeReferences(
  root,
  source,
  target,
  content,
  moveMap,
  updates,
  checks,
  blockers
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
    const quotedMovePattern = new RegExp(`(['"])(${moveSourcePattern})\\1`, 'g');
    next = next.replace(quotedMovePattern, (match, quote, reference) => {
      const finalTarget = moveMap.get(reference);
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
    version: 1,
    mode: 'preview',
    status: 'NO_CHANGES',
    moves: [],
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

  for (const candidate of legacyFiles) addCandidate(report, root, ...candidate);
  visitTests(root, root, report);
  const gitignorePlan = planGitignore(root);
  report.gitignoreChanges = gitignorePlan.report;
  report.blockers.push(...gitignorePlan.blockers);
  report.externalIgnoreSources = inspectExternalIgnores(root);
  report.moves.sort(comparePaths);
  report.skipped.sort(comparePaths);
  addMoveSafetyBlockers(root, report);

  const moveMap = new Map(report.moves.map(({ source, target }) => [source, target]));
  const updates = [];
  const referenceChecks = [];
  const changes = [];
  for (const textFile of collectTextFiles(root, report)) {
    const file = textFile.file;
    if (file === '.gitignore') continue;
    const original = textFile.original;
    let content = textFile.content;
    const output = moveMap.get(file) || file;
    content = rewriteRelativeReferences(
      root,
      file,
      output,
      content,
      moveMap,
      updates,
      referenceChecks,
      report.blockers
    );
    const next = Buffer.from(content, 'utf8');
    if (!next.equals(original)) changes.push({ source: file, output, original, next });
  }
  if (gitignorePlan.change) changes.push(gitignorePlan.change);
  report.referenceUpdates = updates.sort((left, right) => {
    const leftKey = `${left.file}\0${left.from}\0${left.to}`;
    const rightKey = `${right.file}\0${right.from}\0${right.to}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  report.blockers.sort(comparePaths);
  const hasChanges = report.moves.length > 0 ||
    report.referenceUpdates.length > 0 ||
    report.gitignoreChanges.add.length > 0 ||
    report.gitignoreChanges.remove.length > 0;
  report.status = report.blockers.length > 0
    ? 'BLOCKED'
    : hasChanges ? 'READY' : 'NO_CHANGES';
  return { root, report, changes, referenceChecks };
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
    const remainingIgnorePlan = planGitignore(plan.root);
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
