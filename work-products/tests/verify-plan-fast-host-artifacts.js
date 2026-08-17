const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const testRoot = __dirname;
const repoRoot = path.resolve(testRoot, '..', '..');
const artifactRoot = path.join(testRoot, 'plan-fast-host-artifacts');
const staticRoot = path.join(artifactRoot, '5.0.19');
const staticManifestPath = path.join(artifactRoot, 'manifest.json');
const prestatePath = path.join(artifactRoot, 't7-prestate.json');
const fixtureSpecsPath = path.join(artifactRoot, 'fixture-specs.json');
const identityContractPath = path.join(artifactRoot, 'local-marketplace-identity-contract.json');
const smokeCasesPath = path.join(artifactRoot, 'smoke-cases.json');
const t8AttemptRoot = path.join(artifactRoot, 'runs', 'T8-20260817-host-smoke-01');
const t8SummaryPath = path.join(t8AttemptRoot, 'summary.json');
const t8Attempt03Root = path.join(artifactRoot, 'runs', 'T8-20260817-host-smoke-03');
const t8Attempt03SummaryPath = path.join(t8Attempt03Root, 'summary.json');
const t8Attempt04Root = path.join(artifactRoot, 'runs', 'T8-20260817-host-smoke-04');
const t8Attempt04SummaryPath = path.join(t8Attempt04Root, 'summary.json');
const t8Attempt04ContractRepairPath = path.join(t8Attempt04Root, 'contract-repair-receipt.json');
const t8Attempt05Root = path.join(artifactRoot, 'runs', 'T8-20260817-host-smoke-05');
const t8Attempt05SummaryPath = path.join(t8Attempt05Root, 'summary.json');
const t8AuditRoot = path.join(artifactRoot, 'audits', 'T8-20260817-no-model-audit-01');
const t8AuditPath = path.join(t8AuditRoot, 'audit.json');
const t8AuditCandidateRoot = path.join(t8AuditRoot, 'candidate-packages');
const hostNames = ['Claude', 'Codex'];
const capture = process.argv.includes('--capture');
const contractOnly = process.argv.includes('--contract-only');

function fail(message) {
  throw new Error(`BLOCKED: ${message}`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: options.encoding === undefined ? 'utf8' : options.encoding,
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
}

function runHostCli(command, args) {
  if (process.platform !== 'win32') return run(command, args);
  return execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    '$cliArgs=ConvertFrom-Json $env:UXUCODE_HOST_ARGS; & (Get-Command -Name $env:UXUCODE_HOST_CLI).Source @cliArgs; exit $LASTEXITCODE',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, UXUCODE_HOST_CLI: command, UXUCODE_HOST_ARGS: JSON.stringify(args) },
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
}

function gitText(...args) {
  return run('git', args).trim();
}

function normalizeRelative(value) {
  return value.split(path.sep).join('/');
}

function listFiles(root) {
  if (!fs.existsSync(root)) fail(`missing directory: ${root}`);
  const result = [];
  const visit = (current, relative) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      const nextRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) fail(`symbolic link is not allowed: ${nextRelative}`);
      if (entry.isDirectory()) visit(absolute, nextRelative);
      else if (entry.isFile()) result.push(nextRelative);
      else fail(`unsupported filesystem entry: ${nextRelative}`);
    }
  };
  visit(root, '');
  return result;
}

function describeFiles(root, expectedPaths = listFiles(root)) {
  return [...expectedPaths].sort().map((relative) => {
    const absolute = path.join(root, ...relative.split('/'));
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) fail(`expected regular file: ${relative}`);
    const content = fs.readFileSync(absolute);
    return { path: relative, sha256: sha256(content), size: content.length };
  });
}

function treeSha256(files) {
  return sha256(Buffer.from(files.map((file) => `${file.path}\0${file.sha256}\0${file.size}\n`).join(''), 'utf8'));
}

function assertFiles(actual, expected, label) {
  const byPath = (left, right) => left.path.localeCompare(right.path);
  const actualFiles = Array.isArray(actual) ? actual : [actual];
  const expectedFiles = Array.isArray(expected) ? expected : [expected];
  assert.deepStrictEqual([...actualFiles].sort(byPath), [...expectedFiles].sort(byPath), `${label}: file set or SHA-256 drift`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeNewJson(file, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (fs.existsSync(file)) {
    if (fs.readFileSync(file, 'utf8') !== content) fail(`refusing to overwrite drifted artifact: ${path.relative(repoRoot, file)}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, { flag: 'wx' });
}

function trackedPackage(host, sourceGitSha) {
  const prefix = `${host}/`;
  const paths = gitText('ls-tree', '-r', '--name-only', sourceGitSha, '--', host)
    .split(/\r?\n/)
    .filter(Boolean)
    .map((entry) => {
      if (!entry.startsWith(prefix)) fail(`unexpected tracked path for ${host}: ${entry}`);
      return entry.slice(prefix.length);
    })
    .sort();
  if (paths.length === 0) fail(`no tracked package files for ${host}`);
  const files = paths.map((relative) => {
    const content = run('git', ['show', `${sourceGitSha}:${host}/${relative}`], { encoding: null });
    return { path: relative, sha256: sha256(content), size: content.length, content };
  });
  return { paths, files };
}

function expectedStaticManifest(sourceGitSha) {
  const packages = {};
  for (const host of hostNames) {
    const tracked = trackedPackage(host, sourceGitSha);
    const files = tracked.files.map(({ path: relative, sha256: digest, size }) => ({ path: relative, sha256: digest, size }));
    packages[host] = {
      root: `5.0.19/${host}`,
      fileCount: files.length,
      treeSha256: treeSha256(files),
      files,
    };
  }
  return { schemaVersion: 1, version: '5.0.19', sourceGitSha, packages };
}

function captureStaticPackage(manifest) {
  fs.mkdirSync(staticRoot, { recursive: true });
  const allowed = new Set();
  for (const host of hostNames) {
    const tracked = trackedPackage(host, manifest.sourceGitSha);
    for (const file of tracked.files) {
      const artifactRelative = `${host}/${file.path}`;
      allowed.add(artifactRelative);
      const target = path.join(staticRoot, ...artifactRelative.split('/'));
      if (fs.existsSync(target)) {
        const existing = fs.readFileSync(target);
        if (sha256(existing) !== file.sha256 || existing.length !== file.size) {
          fail(`refusing to overwrite drifted static artifact: ${artifactRelative}`);
        }
      } else {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, file.content, { flag: 'wx' });
      }
    }
  }
  for (const relative of listFiles(staticRoot)) {
    if (!allowed.has(relative)) fail(`extra static artifact: ${relative}`);
  }
  writeNewJson(staticManifestPath, manifest);
}

function placeholder(absolute) {
  const home = path.resolve(os.homedir());
  const repo = path.resolve(repoRoot);
  const resolved = path.resolve(absolute);
  const lower = resolved.toLowerCase();
  if (lower === repo.toLowerCase() || lower.startsWith(`${repo.toLowerCase()}${path.sep}`)) {
    return `<REPO>${resolved.slice(repo.length).split(path.sep).join('/')}`;
  }
  if (lower === home.toLowerCase() || lower.startsWith(`${home.toLowerCase()}${path.sep}`)) {
    return `<USER>${resolved.slice(home.length).split(path.sep).join('/')}`;
  }
  fail(`path is outside normalized roots: ${absolute}`);
}

function registryFile(absolute) {
  const content = fs.readFileSync(absolute);
  return { path: placeholder(absolute), sha256: sha256(content), size: content.length };
}

function parseCodexRegistration(output) {
  const line = output.split(/\r?\n/).find((entry) => entry.trim().startsWith('uxu-code@uxu-code-codex'));
  if (!line) fail('Codex plugin list omitted uxu-code registration');
  const columns = line.trim().split(/\s{2,}/);
  if (columns.length < 4) fail(`unrecognized Codex plugin list row: ${line}`);
  return { id: columns[0], status: columns[1], version: columns[2], target: columns.slice(3).join('  ') };
}

function codexConfigFacts(configText) {
  const marketplace = configText.match(/\[marketplaces\.uxu-code-codex\][\s\S]*?source_type\s*=\s*"([^"]+)"[\s\S]*?source\s*=\s*'([^']+)'/);
  const plugin = configText.match(/\[plugins\."uxu-code@uxu-code-codex"\][\s\S]*?enabled\s*=\s*(true|false)/);
  if (!marketplace || !plugin) fail('Codex config lacks the expected UXUCode marketplace or plugin registration');
  return {
    sourceType: marketplace[1],
    source: marketplace[2].replace(/^\\\\\?\\/, ''),
    enabled: plugin[1] === 'true',
  };
}

function compareFiles(left, right) {
  const rightByPath = new Map(right.map((file) => [file.path, file]));
  const missing = left.filter((file) => !rightByPath.has(file.path)).map((file) => file.path);
  const drift = left.filter((file) => {
    const candidate = rightByPath.get(file.path);
    return candidate && (candidate.sha256 !== file.sha256 || candidate.size !== file.size);
  }).map((file) => file.path);
  const leftPaths = new Set(left.map((file) => file.path));
  const extra = right.filter((file) => !leftPaths.has(file.path)).map((file) => file.path);
  return { byteIdentical: missing.length === 0 && extra.length === 0 && drift.length === 0, missing, extra, drift };
}

function observePrestate(staticManifest) {
  const home = os.homedir();
  const claudeInstalledPath = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
  const claudeMarketplacesPath = path.join(home, '.claude', 'plugins', 'known_marketplaces.json');
  const codexConfigPath = path.join(home, '.codex', 'config.toml');
  for (const required of [claudeInstalledPath, claudeMarketplacesPath, codexConfigPath]) {
    if (!fs.existsSync(required)) fail(`unreadable registration file: ${placeholder(required)}`);
  }

  const claudeList = JSON.parse(runHostCli('claude', ['plugin', 'list', '--json']));
  const claudePlugin = claudeList.find((entry) => entry.id === 'uxu-code@uxu-code-claude');
  if (!claudePlugin) fail('Claude plugin list omitted uxu-code registration');
  const knownMarketplaces = readJson(claudeMarketplacesPath);
  const claudeMarketplace = knownMarketplaces['uxu-code-claude'];
  if (!claudeMarketplace?.source?.path) fail('Claude marketplace target is unreadable');

  const codexOutput = runHostCli('codex', ['plugin', 'list']);
  const codexPlugin = parseCodexRegistration(codexOutput);
  const codexFacts = codexConfigFacts(fs.readFileSync(codexConfigPath, 'utf8'));

  const observations = {
    Claude: {
      cliVersion: runHostCli('claude', ['--version']).trim(),
      registration: {
        id: claudePlugin.id,
        version: claudePlugin.version,
        scope: claudePlugin.scope,
        enabled: claudePlugin.enabled,
        normalizedTarget: placeholder(claudePlugin.installPath),
        marketplaceSource: placeholder(claudeMarketplace.source.path),
        files: [registryFile(claudeInstalledPath), registryFile(claudeMarketplacesPath)],
      },
      cacheRoot: claudePlugin.installPath,
      cacheScopeRoot: path.join(home, '.claude', 'plugins', 'cache', 'uxu-code-claude'),
      sourceRoot: path.join(repoRoot, 'Claude'),
    },
    Codex: {
      cliVersion: runHostCli('codex', ['--version']).trim(),
      registration: {
        id: codexPlugin.id,
        version: codexPlugin.version,
        status: codexPlugin.status,
        enabled: codexFacts.enabled,
        normalizedTarget: placeholder(codexPlugin.target),
        marketplaceSource: placeholder(codexFacts.source),
        marketplaceSourceType: codexFacts.sourceType,
        files: [registryFile(codexConfigPath)],
      },
      cacheRoot: path.join(home, '.codex', 'plugins', 'cache', 'uxu-code-codex', 'uxu-code', codexPlugin.version),
      cacheScopeRoot: path.join(home, '.codex', 'plugins', 'cache', 'uxu-code-codex'),
      sourceRoot: path.join(repoRoot, 'Codex'),
    },
  };

  const hosts = {};
  for (const host of hostNames) {
    const observation = observations[host];
    if (!fs.existsSync(observation.cacheRoot)) fail(`${host} cache is unreadable: ${placeholder(observation.cacheRoot)}`);
    const cacheFiles = describeFiles(observation.cacheRoot);
    const cacheScopeFiles = describeFiles(observation.cacheScopeRoot);
    const sourceFiles = describeFiles(observation.sourceRoot);
    const staticFiles = staticManifest.packages[host].files;
    const cacheToStatic = compareFiles(staticFiles, cacheFiles);
    const sourceToStatic = compareFiles(staticFiles, sourceFiles);
    const manifestRelative = host === 'Claude' ? '.claude-plugin/plugin.json' : '.codex-plugin/plugin.json';
    const sourceVersion = readJson(path.join(observation.sourceRoot, ...manifestRelative.split('/'))).version;
    const cacheVersion = readJson(path.join(observation.cacheRoot, ...manifestRelative.split('/'))).version;
    hosts[host] = {
      cliVersion: observation.cliVersion,
      registration: observation.registration,
      cache: {
        root: placeholder(observation.cacheRoot),
        version: cacheVersion,
        fileCount: cacheFiles.length,
        treeSha256: treeSha256(cacheFiles),
        files: cacheFiles,
        relationToStaticRollback: cacheToStatic,
      },
      cacheScope: {
        root: placeholder(observation.cacheScopeRoot),
        fileCount: cacheScopeFiles.length,
        treeSha256: treeSha256(cacheScopeFiles),
        files: cacheScopeFiles,
      },
      repositorySource: {
        root: placeholder(observation.sourceRoot),
        version: sourceVersion,
        fileCount: sourceFiles.length,
        treeSha256: treeSha256(sourceFiles),
        files: sourceFiles,
        relationToStaticRollback: sourceToStatic,
      },
    };
  }
  return {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    status: 'UNEXECUTED',
    production: 'NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED',
    staticRollbackSourceGitSha: staticManifest.sourceGitSha,
    hosts,
  };
}

function validateStatic(manifest) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.version, '5.0.19');
  assert.equal(manifest.sourceGitSha, gitText('rev-parse', 'HEAD'), 'static rollback source Git SHA drift');
  const actualRootFiles = listFiles(staticRoot);
  const expectedRootFiles = [];
  for (const host of hostNames) {
    const expected = manifest.packages[host];
    assert.equal(expected.root, `5.0.19/${host}`);
    assert.equal(expected.fileCount, expected.files.length);
    assert.equal(expected.treeSha256, treeSha256(expected.files));
    const hostRoot = path.join(staticRoot, host);
    const actual = describeFiles(hostRoot);
    assertFiles(actual, expected.files, `${host} static rollback`);
    expectedRootFiles.push(...expected.files.map((file) => `${host}/${file.path}`));
  }
  assert.deepStrictEqual(actualRootFiles.sort(), expectedRootFiles.sort(), 'static rollback contains missing or extra files');

  const claudeManifest = readJson(path.join(staticRoot, 'Claude', '.claude-plugin', 'plugin.json'));
  const codexManifest = readJson(path.join(staticRoot, 'Codex', '.codex-plugin', 'plugin.json'));
  const claudeMarketplace = readJson(path.join(staticRoot, 'Claude', '.claude-plugin', 'marketplace.json'));
  assert.equal(claudeManifest.version, '5.0.19');
  assert.equal(codexManifest.version, '5.0.19');
  assert.equal(claudeMarketplace.plugins[0].version, '5.0.19');
  for (const host of hostNames) {
    const validator = fs.readFileSync(path.join(staticRoot, host, 'scripts', 'validate-plugin.js'), 'utf8');
    assert.match(validator, /manifest\.version !== '5\.0\.19'/, `${host} validator version identity`);
  }
}

function validatePreflightInputs() {
  const fixtureSpecs = readJson(fixtureSpecsPath);
  assert.equal(fixtureSpecs.schemaVersion, 2);
  assert.deepStrictEqual(Object.keys(fixtureSpecs.specs).sort(), ['default', 'parallel', 'partial', 'serial']);
  assert.match(fixtureSpecs.partialTodoTemplate, /\{\{PLAN_SHA\}\}/);
  const partialOutput = fixtureSpecs.partialCompletedOutput;
  assert.equal(partialOutput.path, 'out/p1.txt');
  assert.equal(partialOutput.encoding, 'base64');
  const partialBytes = Buffer.from(partialOutput.bytesBase64, 'base64');
  assert.equal(partialBytes.toString('base64'), partialOutput.bytesBase64, 'partial output base64 must be canonical');
  assert.equal(partialBytes.toString('hex'), '50310a', 'partial output must be exact UTF-8 P1 followed by LF');
  assert.equal(sha256(partialBytes), partialOutput.sha256, 'partial output SHA-256 must be computed from exact fixture bytes');
  const receipt = fixtureSpecs.partialTodoTemplate.match(/`out\/p1\.txt` SHA-256 `([0-9a-f]{64})`/);
  assert.ok(receipt, 'partial todo must contain the P1 completion receipt');
  assert.equal(receipt[1], partialOutput.sha256, 'partial todo receipt must use the canonical fixture byte hash');

  const identityContract = readJson(identityContractPath);
  assert.equal(identityContract.schemaVersion, 4);
  assert.equal(identityContract.marketplaceKind, 'local');
  assert.equal(identityContract.acceptanceMode, 'evidenceAuditNoModel');
  assert.deepStrictEqual(identityContract.identityDimensions, [
    'repositorySource',
    'historicalCandidateRegistration',
    'historicalInstalledCache',
    'packageByteParity',
    'packageValidator',
    'staticBehaviorContract',
    'restoration',
  ]);
  for (const key of [
    'requireRepositorySourceCandidate',
    'requireHistoricalCandidateRegistrationReceipt',
    'requireHistoricalInstalledCacheCandidate',
    'requirePackageByteParity',
    'requirePackageValidators',
    'requireStaticBehaviorContracts',
    'requireRestorationReceipt',
  ]) assert.equal(identityContract.candidatePass[key], true, `candidatePass.${key}`);
  for (const key of [
    'requireObservedFreshLoadedRoot',
    'requireLoadedPackageCandidate',
    'requireCombinedClaudeLanes',
    'requireCurrentHostInstallation',
  ]) assert.equal(identityContract.candidatePass[key], false, `candidatePass.${key}`);
  assert.deepStrictEqual(identityContract.modelValidationPolicy, {
    claude: 'NOT_REQUIRED_NOT_EXECUTED',
    codex: 'NOT_REQUIRED_NOT_EXECUTED',
    allowedModelCalls: 0,
    allowedModelCostUsd: 0,
  });
  assert.equal(identityContract.auditEvidence.candidateInstall, 'audits/T8-20260817-no-model-audit-01/candidate-install.json');
  assert.equal(identityContract.auditEvidence.candidatePackages, 'audits/T8-20260817-no-model-audit-01/candidate-packages');
  assert.equal(identityContract.auditEvidence.restoration, 'audits/T8-20260817-no-model-audit-01/restoration-receipt.json');
  assert.equal(identityContract.auditEvidence.auditReceipt, 'audits/T8-20260817-no-model-audit-01/audit.json');
  assert.deepStrictEqual(identityContract.claimBoundary, {
    auditPassMeans: 'LOCAL_CANDIDATE_EVIDENCE_ACCEPTED',
    currentHostInstalled: 'NOT_REQUIRED_NOT_VERIFIED',
    freshRuntime: 'NOT_REQUIRED_NOT_VERIFIED',
    production: 'NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED',
  });

  const smokeCases = readJson(smokeCasesPath);
  assert.equal(smokeCases.schemaVersion, 1);
  assert.equal(smokeCases.cases.length, 8);
  assert.equal(new Set(smokeCases.cases.map((entry) => entry.id)).size, 8);
  for (const entry of smokeCases.cases) {
    assert.ok(['parallel', 'serial', 'partial', 'default'].includes(entry.workspace));
    assert.ok(['plan', 'build'].includes(entry.stage));
    assert.match(entry.claudePrompt, /^\/uxu-code:(?:plan|build)(?: |$)/);
    assert.match(entry.codexPrompt, /^@(?:plan|build)(?: |$)/);
    assert.doesNotMatch(entry.codexPrompt, /^@uxu-code:/);
    assert.doesNotMatch(entry.claudePrompt, /<[^>]+>/);
    assert.doesNotMatch(entry.codexPrompt, /<[^>]+>/);
  }

  const report = fs.readFileSync(path.join(testRoot, 'plan-fast-host-smoke.md'), 'utf8');
  assert.match(report, /Status: `PASS \(NO-MODEL EVIDENCE AUDIT\)`/);
  assert.match(report, /Production: `NOT AUTHORIZED \/ NOT EXECUTED \/ UNVERIFIED`/);
  assert.match(report, /local-marketplace-identity-contract\.json/);
  assert.match(report, /T8-20260817-no-model-audit-01/);
  assert.match(report, /本轮模型调用 0、模型费用 USD 0、宿主 registration／cache 写入 0/);
  assert.match(report, /当前宿主安装为 `NOT_REQUIRED_NOT_VERIFIED`/);
  assert.match(report, /fresh runtime 为 `NOT_REQUIRED_NOT_VERIFIED`/);
}

function validateT8BlockedEvidence() {
  if (!fs.existsSync(t8SummaryPath)) return;
  const summary = readJson(t8SummaryPath);
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.attempt, 'T8-20260817-host-smoke-01');
  assert.equal(summary.status, 'BLOCKED');
  assert.equal(summary.production, 'NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED');
  assert.equal(summary.functionalSmoke.status, 'NOT_EXECUTED');
  assert.equal(summary.functionalSmoke.modelCalls, 0);
  assert.equal(summary.repositoryActions.productCommit, false);
  assert.equal(summary.repositoryActions.push, false);
  assert.equal(summary.repositoryActions.publish, false);
  assert.equal(summary.repositoryActions.deploy, false);

  const resolveAttemptPath = (relative) => {
    const resolved = path.resolve(t8AttemptRoot, relative);
    const boundary = `${path.resolve(artifactRoot)}${path.sep}`.toLowerCase();
    if (!`${resolved}${fs.existsSync(resolved) && fs.statSync(resolved).isDirectory() ? path.sep : ''}`.toLowerCase().startsWith(boundary)) {
      fail(`T8 evidence path escapes artifact root: ${relative}`);
    }
    return resolved;
  };

  const backupManifestPath = resolveAttemptPath(summary.backup.manifest);
  const backupManifestBytes = fs.readFileSync(backupManifestPath);
  assert.equal(sha256(backupManifestBytes), summary.backup.manifestSha256);
  const backupManifest = JSON.parse(backupManifestBytes.toString('utf8'));
  const prestateRoot = path.dirname(backupManifestPath);
  const backupChecks = [
    ['claudeRegistration', path.join(prestateRoot, 'Claude', 'registration')],
    ['claudeCache', path.join(prestateRoot, 'Claude', 'cache', 'uxu-code-claude')],
    ['codexRegistration', path.join(prestateRoot, 'Codex', 'registration')],
    ['codexCache', path.join(prestateRoot, 'Codex', 'cache', 'uxu-code-codex')],
  ];
  for (const [key, root] of backupChecks) assertFiles(describeFiles(root), backupManifest[key], `T8 backup ${key}`);

  const failurePath = resolveAttemptPath(summary.fixturePreparation.evidence);
  assert.equal(sha256(fs.readFileSync(failurePath)), summary.fixturePreparation.evidenceSha256);
  const failure = readJson(failurePath);
  assert.equal(failure.status, 'BLOCKED');
  assert.equal(failure.stage, 'fixture-preparation');
  assert.equal(failure.actualHex, '50310a');
  assert.equal(failure.actualSha256, sha256(Buffer.from(failure.actualHex, 'hex')));
  assert.equal(failure.modelCalls, 0);

  for (const [host, manifestRelative] of [['Claude', '.claude-plugin/plugin.json'], ['Codex', '.codex-plugin/plugin.json']]) {
    const quarantine = resolveAttemptPath(summary.restoration.candidateQuarantine[host].root);
    assert.equal(listFiles(quarantine).length, summary.restoration.candidateQuarantine[host].files);
    const manifestPath = path.join(quarantine, 'uxu-code', '5.0.20', ...manifestRelative.split('/'));
    assert.equal(readJson(manifestPath).version, '5.0.20');
  }

  const claudeDebugPath = resolveAttemptPath(summary.restoration.freshIdentity.Claude.debugEvidence);
  assert.equal(sha256(fs.readFileSync(claudeDebugPath)), summary.restoration.freshIdentity.Claude.debugSha256);
  const claudeDebug = fs.readFileSync(claudeDebugPath, 'utf8');
  assert.match(claudeDebug, new RegExp(`Attempting to load skills from plugin uxu-code default skillsPath: ${repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\\\Claude\\\\skills`, 'i'));

  const codexEvidencePath = resolveAttemptPath(summary.restoration.freshIdentity.Codex.evidence);
  assert.equal(sha256(fs.readFileSync(codexEvidencePath)), summary.restoration.freshIdentity.Codex.evidenceSha256);
  assert.match(fs.readFileSync(codexEvidencePath, 'utf8'), /"input_tokens":0[\s\S]*"output_tokens":0/);

  const report = fs.readFileSync(path.join(testRoot, 'plan-fast-host-smoke.md'), 'utf8');
  assert.match(report, /历史 T8 执行结果/);
  assert.match(report, /功能 smoke 模型调用数为 0/);
}

function validateT8Attempt03BlockedEvidence() {
  if (!fs.existsSync(t8Attempt03SummaryPath)) return;
  const summary = readJson(t8Attempt03SummaryPath);
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.attempt, 'T8-20260817-host-smoke-03');
  assert.equal(summary.status, 'BLOCKED');
  assert.equal(summary.prewriteIdentity.status, 'FAILED_EXTERNAL_WRITE_GUARD');
  assert.equal(summary.prewriteIdentity.Claude.exitCode, 0);
  assert.ok(summary.prewriteIdentity.Claude.costUsd > 0 && summary.prewriteIdentity.Claude.costUsd <= 0.6);
  assert.ok(summary.prewriteIdentity.Claude.inputTokens > 0);
  assert.ok(summary.prewriteIdentity.Claude.outputTokens > 0);
  assert.equal(summary.prewriteIdentity.Claude.diffRecords, 5);
  assert.equal(summary.prewriteIdentity.Codex.calls, 0);
  assert.equal(summary.candidateInstall.status, 'NOT_EXECUTED');
  assert.equal(summary.fixturePreparation.status, 'NOT_EXECUTED');
  assert.equal(summary.functionalSmoke.status, 'NOT_EXECUTED');
  assert.equal(summary.restoration.status, 'RESTORED_EQUAL_TO_ATTEMPT03_PRESTATE');
  assert.equal(summary.restoration.claudeUserStateDelta, 0);
  assert.equal(summary.restoration.codexConfigDelta, 0);
  assert.equal(summary.restoration.codexCacheDelta, 0);

  const resolveEvidence = (relative) => {
    const resolved = path.resolve(t8Attempt03Root, relative);
    const boundary = `${path.resolve(artifactRoot)}${path.sep}`.toLowerCase();
    if (!resolved.toLowerCase().startsWith(boundary)) fail(`T8 attempt 03 evidence escapes artifact root: ${relative}`);
    return resolved;
  };
  for (const [relative, expected] of [
    [summary.backup.manifest, summary.backup.manifestSha256],
    [summary.postBackupObservation.guard, summary.postBackupObservation.guardSha256],
    [summary.prewriteIdentity.Claude.receipt, summary.prewriteIdentity.Claude.receiptSha256],
    [summary.prewriteIdentity.Claude.debug, summary.prewriteIdentity.Claude.debugSha256],
    [summary.restoration.checkpoint, summary.restoration.checkpointSha256],
  ]) assert.equal(sha256(fs.readFileSync(resolveEvidence(relative))), expected);

  const receipt = readJson(resolveEvidence(summary.prewriteIdentity.Claude.receipt));
  const unexpectedPaths = receipt.claudeUnexpectedDelta.map((entry) => entry.path);
  assert.ok(unexpectedPaths.includes('.claude.json'));
  assert.ok(unexpectedPaths.some((entry) => entry.startsWith('.claude/backups/')));
  assert.ok(unexpectedPaths.some((entry) => entry.startsWith('.claude/session-env/')));
  const debug = fs.readFileSync(resolveEvidence(summary.prewriteIdentity.Claude.debug), 'utf8');
  assert.match(debug, new RegExp(`Attempting to load skills from plugin uxu-code default skillsPath: ${repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\\\Claude\\\\skills`, 'i'));
  const quarantine = resolveEvidence(summary.restoration.postCallQuarantine);
  assert.ok(fs.existsSync(path.join(quarantine, '.claude')));
  assert.ok(fs.existsSync(path.join(quarantine, '.claude.json')));

  const report = fs.readFileSync(path.join(testRoot, 'plan-fast-host-smoke.md'), 'utf8');
  assert.match(report, /schema v3 双轨规划/);
  assert.match(report, /轨道 A：真实配置根强身份/);
  assert.match(report, /轨道 B：隔离配置克隆功能 smoke/);
  assert.match(report, /T8-20260817-host-smoke-04/);
  assert.match(report, /两条证据共同验收、不可互替/);
  assert.match(report, /5 个 diff records/);
}

function validateT8Attempt04ContractRepairEvidence() {
  const repair = readJson(t8Attempt04ContractRepairPath);
  assert.equal(repair.schemaVersion, 1);
  assert.equal(repair.attempt, 'T8-20260817-host-smoke-04');
  assert.equal(repair.reason, 'codex-public-command-contract-repair');
  assert.equal(repair.hostOperations, false);
  assert.equal(repair.modelCalls, 0);
  assert.equal(sha256(fs.readFileSync(t8Attempt04SummaryPath)), repair.originalSummarySha256);

  const frozenSmokeCasesPath = path.resolve(t8Attempt04Root, repair.frozenSmokeCases);
  assert.ok(frozenSmokeCasesPath.startsWith(`${t8Attempt04Root}${path.sep}`));
  assert.equal(sha256(fs.readFileSync(frozenSmokeCasesPath)), repair.frozenSmokeCasesSha256);
  const frozenSmokeCases = readJson(frozenSmokeCasesPath);
  assert.equal(frozenSmokeCases.cases.length, 8);
  for (const entry of frozenSmokeCases.cases) {
    assert.match(entry.codexPrompt, /^@uxu-code:(?:plan|build)(?: |$)/);
  }

  const correctedSmokeCasesPath = path.resolve(t8Attempt04Root, repair.correctedSmokeCases);
  assert.equal(correctedSmokeCasesPath, smokeCasesPath);
  assert.equal(sha256(fs.readFileSync(correctedSmokeCasesPath)), repair.correctedSmokeCasesSha256);
}

function validateT8Attempt05BlockedEvidence() {
  const summary = readJson(t8Attempt05SummaryPath);
  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.attempt, 'T8-20260817-host-smoke-05');
  assert.equal(summary.status, 'BLOCKED');
  assert.equal(summary.production, 'NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED');
  assert.equal(summary.backup.status, 'VERIFIED');
  assert.equal(summary.preinstallIdentity.status, 'FAILED_UNRECOGNIZED_MODEL');
  assert.equal(summary.preinstallIdentity.errorCode, 'claude-code:unrecognized_model');
  assert.equal(summary.preinstallIdentity.resultReceipt, false);
  assert.equal(summary.candidateInstall.status, 'NOT_EXECUTED');
  assert.equal(summary.fixturePreparation.status, 'NOT_EXECUTED');
  assert.equal(summary.functionalSmoke.status, 'NOT_EXECUTED');
  assert.equal(summary.functionalSmoke.modelCalls, 0);
  assert.equal(summary.modelUsage.claudeCliInvocations, 1);
  assert.equal(summary.modelUsage.claudeSuccessfulModelCalls, 0);
  assert.equal(summary.modelUsage.codexCalls, 0);
  assert.equal(summary.restoration.status, 'RESTORED_BYTE_IDENTICAL_TO_ATTEMPT_PRESTATE');
  assert.equal(summary.restoration.claudeUserStateDelta, 0);
  assert.equal(summary.restoration.codexConfigDelta, 0);
  assert.equal(summary.restoration.codexCacheDelta, 0);
  assert.equal(summary.repositoryActions.productCommit, false);
  assert.equal(summary.repositoryActions.push, false);
  assert.equal(summary.repositoryActions.publish, false);
  assert.equal(summary.repositoryActions.deploy, false);

  for (const [relativePath, expectedHash] of [
    [summary.backup.initialFailure, summary.backup.initialFailureSha256],
    [summary.backup.manifest, summary.backup.manifestSha256],
    [summary.preinstallIdentity.evidence, summary.preinstallIdentity.evidenceSha256],
    [summary.restoration.receipt, summary.restoration.receiptSha256]
  ]) {
    const evidencePath = path.resolve(t8Attempt05Root, relativePath);
    assert.ok(evidencePath.startsWith(`${artifactRoot}${path.sep}`));
    assert.equal(sha256(fs.readFileSync(evidencePath)), expectedHash);
  }

  const backup = readJson(path.resolve(t8Attempt05Root, summary.backup.manifest));
  assert.equal(backup.schemaVersion, 4);
  assert.equal(backup.attempt, summary.attempt);
  assert.equal(backup.backupFirst, 'VERIFIED');
  const restoration = readJson(path.resolve(t8Attempt05Root, summary.restoration.receipt));
  assert.equal(restoration.backupManifestSha256, summary.backup.manifestSha256);

  const report = fs.readFileSync(path.join(testRoot, 'plan-fast-host-smoke.md'), 'utf8');
  assert.match(report, /T8-20260817-host-smoke-05/);
  assert.match(report, /claude-code:unrecognized_model/);
}

function validateT8NoModelAuditEvidence() {
  const historicalCandidateVersion = '5.0.20';
  const audit = readJson(t8AuditPath);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.auditId, 'T8-20260817-no-model-audit-01');
  assert.equal(audit.status, 'PASS');
  assert.equal(audit.acceptanceMode, 'EVIDENCE_AUDIT_NO_MODEL');
  assert.equal(audit.authorization, '不做Claude和Codex模型校验，审计合理即视为通过');
  assert.deepStrictEqual(audit.modelValidation, {
    claude: 'NOT_REQUIRED_NOT_EXECUTED',
    codex: 'NOT_REQUIRED_NOT_EXECUTED',
    modelCalls: 0,
    modelCostUsd: 0,
  });
  assert.deepStrictEqual(audit.behaviorContracts, {
    focusedPlanBuildHelpFixtureTests: '4/4 PASS',
    workflowContractTests: '154/154 PASS',
    openClawTests: '34/34 PASS',
    unifiedStaticGate: '12/12 PASS',
    repositoryPrestate: '31/31 PASS',
    diffCheck: 'PASS',
    immutablePlanSha256: '1261d4d8ba399574fc773aa1f034656da695a60edffcc6c238749912386b2159',
  });

  const resolveAuditEvidence = (relative) => {
    const resolved = path.resolve(t8AuditRoot, relative);
    const boundary = `${path.resolve(t8AuditRoot)}${path.sep}`.toLowerCase();
    if (!resolved.toLowerCase().startsWith(boundary)) fail(`T8 audit evidence escapes tracked audit root: ${relative}`);
    return resolved;
  };

  const installPath = resolveAuditEvidence(audit.historicalCandidateInstall.receipt);
  assert.equal(sha256(fs.readFileSync(installPath)), audit.historicalCandidateInstall.receiptSha256);
  const install = readJson(installPath);
  assert.equal(install.status, 'PASS');
  assert.equal(install.modelCalls, 0);
  assert.equal(install.modelCostUsd, 0);
  assert.equal(install.claudeInstalledVersion, historicalCandidateVersion);
  assert.equal(install.codexInstalledVersion, historicalCandidateVersion);
  assert.equal(install.validation.claude, `${historicalCandidateVersion}_71_FILES_BYTE_IDENTICAL_VALIDATOR_PASS`);
  assert.equal(install.validation.codex, `${historicalCandidateVersion}_71_FILES_BYTE_IDENTICAL_VALIDATOR_PASS`);

  const candidateRoots = {
    Claude: path.join(t8AuditCandidateRoot, 'Claude'),
    Codex: path.join(t8AuditCandidateRoot, 'Codex'),
  };
  for (const host of hostNames) {
    const candidateFiles = describeFiles(candidateRoots[host]);
    assert.equal(candidateFiles.length, 71, `${host} historical candidate file count`);
    const manifestRelative = host === 'Claude'
      ? ['.claude-plugin', 'plugin.json']
      : ['.codex-plugin', 'plugin.json'];
    const candidateManifest = readJson(path.join(candidateRoots[host], ...manifestRelative));
    assert.equal(candidateManifest.version, historicalCandidateVersion, `${host} historical candidate version`);
    assert.equal(audit.historicalCandidateInstall[`${host.toLowerCase()}Files`], 71);
    assert.equal(audit.historicalCandidateInstall[`${host.toLowerCase()}ByteDelta`], 0);
    assert.equal(audit.historicalCandidateInstall[`${host.toLowerCase()}Validator`], 'PASS');
    const output = run(process.execPath, [path.join(candidateRoots[host], 'scripts', 'validate-plugin.js')]);
    assert.match(output, new RegExp(`${host} validation passed:`));
  }

  const restorationPath = resolveAuditEvidence(audit.restoration.receipt);
  assert.equal(sha256(fs.readFileSync(restorationPath)), audit.restoration.receiptSha256);
  const restoration = readJson(restorationPath);
  assert.equal(restoration.status, 'RESTORED_BYTE_IDENTICAL_TO_ATTEMPT_PRESTATE');
  assert.equal(restoration.claudeDelta, 0);
  assert.equal(restoration.codexConfigDelta, 0);
  assert.equal(restoration.codexCacheDelta, 0);
  assert.equal(audit.restoration.claudeUserStateDelta, 0);
  assert.equal(audit.restoration.codexConfigDelta, 0);
  assert.equal(audit.restoration.codexCacheDelta, 0);
  assert.deepStrictEqual(audit.claimBoundary, {
    currentHostInstallation: 'NOT_REQUIRED_NOT_VERIFIED',
    freshRuntime: 'NOT_REQUIRED_NOT_VERIFIED',
    production: 'NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED',
  });
  assert.deepStrictEqual(audit.repositoryActions, {
    productCommit: false,
    push: false,
    publish: false,
    deploy: false,
  });

  const report = fs.readFileSync(path.join(testRoot, 'plan-fast-host-smoke.md'), 'utf8');
  assert.match(report, /Status: `PASS \(NO-MODEL EVIDENCE AUDIT\)`/);
  assert.match(report, /两宿主 5\.0\.20 历史候选包各 71 文件与当前仓库源码逐字节一致/);
  assert.match(report, /不能声称当前会话已加载 5\.0\.20/);
}

function validateLiveIdentityAfterT8(live, stored) {
  const dispositions = [];
  for (const host of hostNames) {
    const liveHost = live.hosts[host];
    const storedHost = stored.hosts[host];
    assertFiles(liveHost.registration.files, storedHost.registration.files, `${host} restored registration bytes`);
    assert.equal(liveHost.registration.marketplaceSource, storedHost.registration.marketplaceSource, `${host} marketplace source drift`);
    assert.deepStrictEqual(liveHost.repositorySource, storedHost.repositorySource, `${host} repository source drift`);

    const matchesStoredCache = liveHost.cache.version === storedHost.cache.version
      && compareFiles(storedHost.cache.files, liveHost.cache.files).byteIdentical;
    const matchesLocalSource = liveHost.cache.version === liveHost.repositorySource.version
      && compareFiles(liveHost.repositorySource.files, liveHost.cache.files).byteIdentical;
    if (!matchesStoredCache && !matchesLocalSource) {
      fail(`${host} cache is neither the byte-restored pre-state nor a byte-identical local-source materialization`);
    }
    dispositions.push(`${host} cache=${matchesStoredCache ? 'restored-prestate' : 'materialized-local-source'}`);
  }
  return dispositions;
}

function main() {
  if (capture) captureStaticPackage(expectedStaticManifest(gitText('rev-parse', 'HEAD')));
  if (!fs.existsSync(staticManifestPath)) fail('missing static rollback manifest; run with --capture once');
  const manifest = readJson(staticManifestPath);
  const expectedManifest = expectedStaticManifest(manifest.sourceGitSha);
  assert.deepStrictEqual(manifest, expectedManifest, 'static rollback manifest no longer matches its recorded source commit');
  validateStatic(manifest);
  validatePreflightInputs();
  validateT8NoModelAuditEvidence();
  if (contractOnly) {
    console.log('PASS plan-fast tracked no-model evidence audit and candidate package validators (no raw host state, host CLI, or model calls)');
    return;
  }
  validateT8Attempt04ContractRepairEvidence();
  validateT8Attempt03BlockedEvidence();
  validateT8Attempt05BlockedEvidence();
  validateT8BlockedEvidence();

  const livePrestate = observePrestate(manifest);
  if (capture && !fs.existsSync(prestatePath)) writeNewJson(prestatePath, livePrestate);
  if (!fs.existsSync(prestatePath)) fail('missing T7 host pre-state; run with --capture once');
  const storedPrestate = readJson(prestatePath);
  const dispositions = fs.existsSync(t8SummaryPath)
    ? validateLiveIdentityAfterT8(livePrestate, storedPrestate)
    : (() => {
        const actual = JSON.parse(JSON.stringify(livePrestate));
        const expected = JSON.parse(JSON.stringify(storedPrestate));
        delete actual.observedAt;
        delete expected.observedAt;
        assert.deepStrictEqual(actual, expected, 'host registration, cache, or source pre-state drift');
        return hostNames.map((host) => `${host} cache=pre-T8`);
      })();

  const relations = hostNames.map((host) => `${host} cache/static byte-identical=${storedPrestate.hosts[host].cache.relationToStaticRollback.byteIdentical}`);
  console.log(`PASS plan-fast host artifacts: ${hostNames.length} hosts, ${manifest.packages.Claude.fileCount + manifest.packages.Codex.fileCount} static files; ${relations.join(', ')}; ${dispositions.join(', ')}`);
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
