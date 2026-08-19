const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const packages = ['Claude', 'Codex'];
const codexPolicy = require('../../Codex/hooks/mode-policy');
const claudePolicy = require('../../Claude/hooks/mode-policy');

function readSkill(pkg, name) {
  return fs.readFileSync(path.join(root, pkg, 'skills', name, 'SKILL.md'), 'utf8');
}

const modePriorityPolicy = `Safety and non-negotiable platform boundaries take priority. Within those boundaries, correctness must be judged against explicit user requirements, approved specifications, project contracts, and acceptance criteria; never rewrite the user's goal based on subjective best practices. Verified evidence outranks unverified conclusions, and completeness outranks compression.

Mode differences affect implementation and output policy only; they do not change authorization, sources of truth, risk-detail requirements, or evidence gates.`;

const evidencePriorityPolicy = `Use the highest applicable evidence layer, in this order:

1. Current explicit user requirements that apply to the change;
2. An approved \`work-products/SPEC.md\` that applies to the change;
3. An existing applicable \`work-products/plan.md\` and its acceptance criteria;
4. Sufficient, reproducible debug evidence;
5. A verifiable objective reconstructed from the current diff, tests, project contracts, and historical intent.

Only stop for an irreconcilable conflict inside the highest applicable layer, or when no verifiable objective, scope, or acceptance criteria can be established. Lower-priority evidence may fill gaps left by higher-priority evidence, but must not rewrite its objective; when lower-priority evidence conflicts with a higher layer, treat it as inapplicable and ignore it. A missing plan is not itself a blocker.`;

const releaseLineagePolicy = `Evaluate an accumulated candidate by change lineage: apply each approved specification, explicit user request, or reproducible debug increment only to the changes it authorized. A later release-version increment required by a completed \`build\`, \`debug\`, or \`simplify\` workflow does not conflict merely because an older applicable specification names an earlier candidate version; do not treat that version as a permanent ceiling. Verify current release metadata, and limit cache or fresh-host claims to the exact version actually measured.`;
const maintenanceVersionPolicy =
  /every completed bug fix or optimization must update the release version consistently/;

const gitAuthorizationPolicy = `Creating a commit requires explicit user authorization. A passing increment or completed change is evidence, not authorization; keep changes uncommitted unless the user asks to commit.

Before any recovery action, identify the exact target, inspect and preserve uncommitted user changes, and choose a project-approved recoverable path. Never use \`git reset --hard\` or another destructive command that discards uncommitted work.`;

const ideaRefineScopePolicy = `Stay within the user's requested problem space. Explore alternatives that clarify that scope, but do not expand the goal beyond the original request.

Use host-neutral repository exploration, file-reading, and user-interaction capabilities. Do not depend on host-specific tool names.

Return the final one-pager to the caller by default. If the caller requests persistence, the calling public Skill must choose a location allowed by the project and \`work-products/\` contracts; idea-refine has no default write path.`;

const browserAuthorizationPolicy = `Use browser capabilities already provided and connected by the host. Browser testing does not authorize installing tools, editing \`.mcp.json\`, or changing external configuration. If an appropriate browser capability is unavailable, stop browser verification and report the validation gap.`;
const webperfEntryPolicy = `\`webperf\` is an internal reference, not a public command, alias, natural-language trigger, or routing entry. Load it only when a registered public Skill explicitly selects this workflow.`;

const paginationPolicy = `Pagination is required for unbounded or growing collections, and when the approved interface contract explicitly requires it. Small bounded collections may return a complete list when their limits are explicit and tested; do not add pagination mechanically.`;
const observabilityScopePolicy = `Correlation IDs, end-to-end propagation, and a fixed telemetry schema are required for service requests, cross-boundary I/O, or an approved observability objective. They are not mechanical requirements for local-only programs or code with no applicable telemetry target.`;

const shippingRiskPolicy = `Kill switches, staged rollout, and post-release monitoring are required when production risk, platform capabilities, or the approved release contract calls for them. They are not universal requirements for every delivery; choose controls proportional to the verified release risk.`;
const ciRiskPolicy = `Every CI gate required by the project contract and relevant to the claimed risk must run and may not be skipped. Path filters may omit a job only when the project CI contract allows it and the change cannot affect that job's risk; skipped slow tests cannot be claimed as covering the same risk.`;
const mutationAuthorizationPolicy = `Commit, tag, push, revert, and release operations require explicit user authorization for the exact action. Examples and checklists are conditional guidance only; do not execute or imply authorization from passing tests, a completed task, or this reference.`;

const sourceLookupPolicy = `Consult official sources when framework or API behavior may have drifted, when a fact is uncertain, or when the user requests citations. Stable local logic, renames, and existing deterministic local contracts do not require network lookup. When external verification is required, prefer primary official sources and report unavailable evidence rather than guessing.

Network research still follows user authorization, project contracts, and environment boundaries; this internal reference does not expand them.`;
const migrationContractPolicy = `Backward-compatible migration and rollback are risk-driven defaults for external consumers. An approved no-compatibility or no-fallback migration contract takes precedence; do not add adapters, dual writes, fallback reads, or rollback paths that contradict it.

Migration side effects and compatibility layers still require authorization from the applicable user request and project contract; this internal reference does not expand that authority.`;
const migrationVerificationPolicy = `- A column renamed or dropped in place without either an approved no-compatibility cutover or the required expand/contract sequence`;
const migrationChecklistPolicy = `- [ ] The change follows the approved compatibility contract: expand → backfill → contract when compatibility is required, or a documented no-compatibility cutover when it is not
- [ ] Old and new code coexist only when the approved rollout requires simultaneous validity`;

const specTriggerPolicy = `Require a specification when material ambiguity or risk remains. Clear user requirements or thorough, reproducible debug evidence may proceed directly to planning when they provide the objective, scope, constraints, and verifiable acceptance criteria.

Size tasks by dependencies, risk, and verifiability; there is no universal file-count limit.`;
const planningSizingPolicy = `Size tasks by dependencies, risk, and verifiability. File count is planning context, not a pass/fail limit: do not reject, split, or approve a task solely because it touches a fixed number of files. Split only when the dependency graph contains independently verifiable work or the task cannot be reviewed and validated as one coherent unit.`;
const tddRiskPolicy = `Deterministic behavior defects should normally use focused RED→GREEN proof before the fix. Pure configuration, documentation, static content, or externally nondeterministic behavior should use evidence proportionate to risk when a meaningful failing automation cannot be established.

After a bug fix, run the focused regression and related regression commands during the implementation loop. Run the full repository gate at planned checkpoints or the release gate; do not substitute a full suite for focused defect proof.`;

function normalized(content) {
  return content.replace(/\r\n/g, '\n');
}

function assertModePriorityPolicy(content, label) {
  assert.ok(normalized(content).includes(modePriorityPolicy), `${label}: mode priority policy missing`);
}

function assertEvidencePriorityPolicy(content, label) {
  assert.ok(
    normalized(content).includes(evidencePriorityPolicy),
    `${label}: review and ship evidence priority policy missing`
  );
}

function assertReleaseLineagePolicy(content, label) {
  assert.ok(
    normalized(content).includes(releaseLineagePolicy),
    `${label}: release lineage policy missing`
  );
}

function runHook(pkg, script, prompt) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-workflow-contract-'));
  const appData = path.join(tempRoot, 'appdata');
  const workspace = path.join(tempRoot, 'workspace');
  fs.mkdirSync(path.join(appData, 'uxucode'), { recursive: true });
  fs.mkdirSync(workspace);
  fs.writeFileSync(
    path.join(appData, 'uxucode', 'config.json'),
    JSON.stringify({ mode: 'off' })
  );

  try {
    const result = childProcess.spawnSync(
      process.execPath,
      [path.join(root, pkg, 'hooks', script)],
      {
        cwd: workspace,
        env: { ...process.env, APPDATA: appData },
        input: prompt ? JSON.stringify({ prompt }) : '',
        encoding: 'utf8'
      }
    );
    assert.equal(result.status, 0, result.stderr);
    if (!result.stdout) return '';
    try {
      const payload = JSON.parse(result.stdout);
      return payload.hookSpecificOutput?.additionalContext || payload.reason || result.stdout;
    } catch {
      return result.stdout;
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runLegacyValidatorFixture(relativePath, content) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-legacy-validator-'));
  const scriptDirectory = path.join(tempRoot, 'scripts');
  const expectedHooks = [
    'hook-state.js',
    'hooks.json',
    'mode-policy.js',
    'uxu-prompt-router.js',
    'uxu-session-start.js',
    'uxu-statusline.js',
    'uxu-subagent-start.js'
  ];

  try {
    fs.mkdirSync(scriptDirectory);
    fs.copyFileSync(
      path.join(root, 'scripts', 'validate-no-legacy-commands.js'),
      path.join(scriptDirectory, 'validate-no-legacy-commands.js')
    );
    for (const pkg of packages) {
      const hooksDirectory = path.join(tempRoot, pkg, 'hooks');
      fs.mkdirSync(hooksDirectory, { recursive: true });
      for (const hook of expectedHooks) fs.writeFileSync(path.join(hooksDirectory, hook), '');
    }
    const fixturePath = path.join(tempRoot, relativePath);
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, content);

    return childProcess.spawnSync(
      process.execPath,
      [path.join(scriptDirectory, 'validate-no-legacy-commands.js')],
      { encoding: 'utf8' }
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('both hosts route only exact clean invocations and reject aliases or invalid arguments', () => {
  const cases = [
    ['Claude', '/uxu-code:clean', 'arguments ""'],
    ['Claude', '/uxu-code:clean apply', 'arguments "apply"'],
    ['Codex', '@clean', 'arguments ""'],
    ['Codex', '@clean apply', 'arguments "apply"']
  ];
  for (const [pkg, prompt, expected] of cases) {
    const output = runHook(pkg, 'uxu-prompt-router.js', prompt);
    assert.match(output, /"clean" skill/);
    assert.ok(output.includes(expected), `${pkg} ${prompt}: ${output}`);
  }

  for (const [pkg, prompt] of [
    ['Claude', '/uxu-code:organize'],
    ['Claude', '/uxu-code:clean!'],
    ['Claude', '/uxu-code:clean force'],
    ['Codex', '@organize'],
    ['Codex', '@clean!'],
    ['Codex', '@clean force']
  ]) {
    const output = runHook(pkg, 'uxu-prompt-router.js', prompt);
    assert.doesNotMatch(output, /Route this request to the "clean" skill/);
  }
});

test('both clean skills retry only structured sandbox permission failures', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'clean');

    assert.match(skill, /structured subprocess permission error/i);
    assert.match(skill, /sandbox approval/i);
    assert.match(skill, /same arguments/i);
    assert.match(skill, /at most once/i);
    assert.match(skill, /preview must never be upgraded to `apply`/i);
  }
});

test('both clean and help skills describe manifest authorization and report v2', () => {
  for (const pkg of packages) {
    const clean = readSkill(pkg, 'clean');
    const help = readSkill(pkg, 'help');

    assert.match(clean, /only as discovery candidates/i);
    assert.match(clean, /work-products\/clean-migration\.json/);
    assert.match(clean, /preservedProductFiles/);
    assert.match(clean, /unclassifiedLegacyFiles/);
    assert.match(clean, /integrityProtectedFiles/);
    assert.match(clean, /inactiveManifestEntries/);
    assert.match(clean, /`version: 2`/);
    assert.match(clean, /mutable-patch.*only when.*\.patch.*\.diff/i);
    assert.match(clean, /`preserve-content`/);
    assert.match(clean, /`mutable-patch`/);
    assert.match(clean, /checksum-coupled mutable artifacts/);
    assert.match(help, /zero-write report v2 preview/);
    assert.match(help, /Test-like names are discovery only/);
    assert.match(help, /work-products\/clean-migration\.json/);
  }
});

test('optional state and migration artifacts stay silent when absent', () => {
  for (const pkg of packages) {
    const status = readSkill(pkg, 'status');
    const clean = readSkill(pkg, 'clean');

    assert.match(status, /\.uxucode-state\.json.*optional/is);
    assert.match(status, /absence alone.*not.*blocker/is);
    assert.match(status, /do not report.*missing/is);
    assert.match(clean, /clean-migration\.json.*optional/is);
    assert.match(clean, /when.*absent.*no manifest-authorized entries/is);
    assert.match(clean, /do not report.*missing/is);

    const sessionContext = runHook(pkg, 'uxu-session-start.js');
    assert.doesNotMatch(sessionContext, /\.uxucode-state\.json|missing|not found/i);
  }
});

function ignoredPathsInTemporaryRepository(relativePaths) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-gitignore-contract-'));
  const globalExcludes = path.join(tempRoot, 'global-excludes');

  try {
    fs.copyFileSync(path.join(root, '.gitignore'), path.join(tempRoot, '.gitignore'));
    fs.writeFileSync(globalExcludes, '');
    for (const relativePath of relativePaths) {
      const fixturePath = path.join(tempRoot, relativePath);
      fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
      fs.writeFileSync(fixturePath, '');
    }

    const init = childProcess.spawnSync('git', ['init', '--quiet'], {
      cwd: tempRoot,
      encoding: 'utf8'
    });
    assert.equal(init.status, 0, init.stderr);
    fs.writeFileSync(path.join(tempRoot, '.git', 'info', 'exclude'), '');

    return relativePaths.filter((relativePath) => {
      const result = childProcess.spawnSync(
        'git',
        [
          '-c',
          `core.excludesFile=${globalExcludes}`,
          'check-ignore',
          '--no-index',
          '--quiet',
          '--',
          relativePath
        ],
        { cwd: tempRoot, encoding: 'utf8' }
      );
      assert.ok(
        result.status === 0 || result.status === 1,
        result.stderr || `git check-ignore exited with status ${result.status}`
      );
      return result.status === 0;
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('gitignore tracks canonical facts and does not hide unsupported legacy paths', () => {
  const trackable = [
    'SPEC.md',
    'tasks/plan.md',
    'tasks/todo.md',
    'work-products/SPEC.md',
    'work-products/plan.md',
    'work-products/todo.md',
    'work-products/tests/workflow-contract.test.js'
  ];
  const ignored = [
    'work-products/debug/local.md',
    'work-products/reviews/local.md',
    'work-products/ship/local.md',
    'work-products/scratch.md'
  ];

  assert.deepEqual(ignoredPathsInTemporaryRepository([...trackable, ...ignored]), ignored);
});

test('both hosts expose one mode-independent workflow artifact policy', () => {
  assert.equal(codexPolicy.workflowPolicy, claudePolicy.workflowPolicy);
  assert.match(codexPolicy.workflowPolicy, /only under `work-products\/`/);
  assert.match(codexPolicy.workflowPolicy, /including test files/);
  assert.match(codexPolicy.workflowPolicy, /work-products\/tests\//);
  assert.match(codexPolicy.workflowPolicy, /relative paths/i);
  assert.match(codexPolicy.workflowPolicy, /machine-specific absolute paths/i);
});

test('mode priority keeps explicit requirements authoritative within safety boundaries', () => {
  for (const pkg of packages) {
    const content = normalized(readSkill(pkg, 'mode'));
    assertModePriorityPolicy(content, `${pkg} mode`);

    const mutation = content.replace(
      modePriorityPolicy,
      'Correctness and safety outrank explicit user requirements, workflow evidence, minimal implementation, and compactness.'
    );
    assert.notEqual(mutation, content, `${pkg} mode: deterministic mutation was not applied`);
    assert.throws(
      () => assertModePriorityPolicy(mutation, `${pkg} mutated mode`),
      /mode priority policy missing/
    );
  }
});

test('review and ship evidence follows the highest applicable layer and rejects regressions', () => {
  for (const pkg of packages) {
    for (const skill of ['review', 'ship']) {
      const label = `${pkg} ${skill}`;
      const content = normalized(readSkill(pkg, skill));
      assertEvidencePriorityPolicy(content, label);

      const legacyMutation = content.replace(
        evidencePriorityPolicy,
        'Use an approved specification when one exists; otherwise use the planning basis and acceptance criteria in `work-products/plan.md`.'
      );
      assert.notEqual(legacyMutation, content, `${label}: legacy mutation was not applied`);
      assert.throws(
        () => assertEvidencePriorityPolicy(legacyMutation, `${label} legacy mutation`),
        /review and ship evidence priority policy missing/
      );

      const conflictMutation = content.replace(
        'when lower-priority evidence conflicts with a higher layer, treat it as inapplicable and ignore it',
        'when evidence layers conflict, stop the workflow'
      );
      assert.notEqual(conflictMutation, content, `${label}: conflict mutation was not applied`);
      assert.throws(
        () => assertEvidencePriorityPolicy(conflictMutation, `${label} conflict mutation`),
        /review and ship evidence priority policy missing/
      );

      if (skill === 'ship') {
        assert.match(
          content,
          /A `GO` means only that the evaluated gate is ready; it does not authorize commit, push, installation, publication, or deployment\./
        );
      }
    }
  }
});

test('ship preserves later maintenance versions as separate change-lineage increments', () => {
  for (const pkg of packages) {
    for (const skill of ['build', 'debug', 'simplify']) {
      assert.match(readSkill(pkg, skill), maintenanceVersionPolicy);
    }

    const label = `${pkg} ship`;
    const content = normalized(readSkill(pkg, 'ship'));
    assertReleaseLineagePolicy(content, label);

    const legacyMutation = content.replace(
      releaseLineagePolicy,
      'Treat the version named by the newest approved specification as the permanent candidate ceiling.'
    );
    assert.notEqual(legacyMutation, content, `${label}: legacy mutation was not applied`);
    assert.throws(
      () => assertReleaseLineagePolicy(legacyMutation, `${label} legacy mutation`),
      /release lineage policy missing/
    );
  }
});

test('git workflow authorization protects user changes and rejects automatic commits', () => {
  for (const pkg of packages) {
    const content = normalized(fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'git-workflow-and-versioning', 'SKILL.md'),
      'utf8'
    ));
    assert.ok(content.includes(gitAuthorizationPolicy), `${pkg}: git authorization policy missing`);

    const mutation = content.replace(
      gitAuthorizationPolicy,
      `Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

If an agent goes off the rails, \`git reset --hard HEAD\` takes you back to the last successful state.`
    );
    assert.notEqual(mutation, content, `${pkg}: git workflow mutation was not applied`);
    assert.ok(!mutation.includes(gitAuthorizationPolicy), `${pkg}: old git workflow was accepted`);
    assert.match(content, /Never use `git reset --hard`/);
  }
});

test('mutation workflows require explicit authorization for commit, tag, push, revert, and release actions', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const contents = Object.fromEntries([
      'ci-cd-and-automation',
      'spec-driven-development',
      'git-workflow-and-versioning',
      'shipping-and-launch'
    ].map((name) => [name, normalized(fs.readFileSync(
      path.join(workflowRoot, name, 'SKILL.md'), 'utf8'
    ))]));

    for (const [name, content] of Object.entries(contents)) {
      assert.ok(content.includes(mutationAuthorizationPolicy), `${pkg}/${name}: mutation authorization policy missing`);
    }
    assert.doesNotMatch(contents['ci-cd-and-automation'], /Agent fixes → pushes|and commits$/m);
    assert.doesNotMatch(contents['spec-driven-development'], /- \*\*Commit the spec\*\*/);
    assert.match(contents['git-workflow-and-versioning'], /explicit user authorization[\s\S]{0,400}git tag/);
    assert.match(contents['shipping-and-launch'], /explicit user authorization[\s\S]{0,300}git revert/);
  }
});

test('idea refine scope stays host-neutral and delegates persistence', () => {
  for (const pkg of packages) {
    const directory = path.join(root, pkg, 'references', 'workflows', 'idea-refine');
    const content = normalized(fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8'));
    assert.ok(content.includes(ideaRefineScopePolicy), `${pkg}: idea refine scope policy missing`);
    assert.doesNotMatch(content, /AskUserQuestion|\bGlob\b|\bGrep\b|\bRead\b|docs\/ideas/);
    assert.equal(fs.existsSync(path.join(directory, 'scripts', 'idea-refine.sh')), false);

    const mutation = content.replace(
      ideaRefineScopePolicy,
      'Use the `AskUserQuestion`, `Glob`, `Grep`, and `Read` tools, push beyond what the user initially asked for, and save the result to `docs/ideas/[idea-name].md`.'
    );
    assert.notEqual(mutation, content, `${pkg}: idea-refine mutation was not applied`);
    assert.ok(!mutation.includes(ideaRefineScopePolicy), `${pkg}: old idea-refine policy was accepted`);
  }
});

test('browser authorization uses connected capabilities without installing tools', () => {
  for (const pkg of packages) {
    const content = normalized(fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'browser-testing-with-devtools', 'SKILL.md'),
      'utf8'
    ));
    assert.ok(content.includes(browserAuthorizationPolicy), `${pkg}: browser authorization missing`);
    assert.doesNotMatch(content, /chrome-devtools-mcp@latest|"-y"/);

    const mutation = content.replace(
      browserAuthorizationPolicy,
      'Add Chrome DevTools to `.mcp.json` and run `npx -y chrome-devtools-mcp@latest`.'
    );
    assert.notEqual(mutation, content, `${pkg}: browser authorization mutation was not applied`);
    assert.ok(!mutation.includes(browserAuthorizationPolicy), `${pkg}: browser install policy was accepted`);
  }
});

test('webperf entry remains an explicitly selected internal reference', () => {
  for (const pkg of packages) {
    const content = normalized(fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'webperf', 'SKILL.md'),
      'utf8'
    ));
    assert.ok(content.includes(webperfEntryPolicy), `${pkg}: webperf entry policy missing`);

    const mutation = content.replace(
      webperfEntryPolicy,
      'When the user enters "webperf", load this workflow.'
    );
    assert.notEqual(mutation, content, `${pkg}: webperf entry mutation was not applied`);
    assert.ok(!mutation.includes(webperfEntryPolicy), `${pkg}: hidden webperf entry was accepted`);
  }
});

test('conditional interface and observability rules follow actual boundary risk', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const api = normalized(fs.readFileSync(
      path.join(workflowRoot, 'api-and-interface-design', 'SKILL.md'), 'utf8'
    ));
    const observability = normalized(fs.readFileSync(
      path.join(workflowRoot, 'observability-and-instrumentation', 'SKILL.md'), 'utf8'
    ));
    assert.ok(api.includes(paginationPolicy), `${pkg}: conditional pagination policy missing`);
    assert.ok(
      observability.includes(observabilityScopePolicy),
      `${pkg}: conditional observability policy missing`
    );

    const apiMutation = api.replace(paginationPolicy, 'Paginate every list endpoint from the start.');
    assert.notEqual(apiMutation, api, `${pkg}: pagination mutation was not applied`);
    assert.ok(!apiMutation.includes(paginationPolicy), `${pkg}: universal pagination was accepted`);

    const observabilityMutation = observability.replace(
      observabilityScopePolicy,
      'Correlation IDs are mandatory on every log line, span, and outbound call.'
    );
    assert.notEqual(observabilityMutation, observability, `${pkg}: observability mutation was not applied`);
    assert.ok(
      !observabilityMutation.includes(observabilityScopePolicy),
      `${pkg}: universal observability policy was accepted`
    );
  }
});

test('conditional shipping and CI policies preserve required risk gates', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const shipping = normalized(fs.readFileSync(
      path.join(workflowRoot, 'shipping-and-launch', 'SKILL.md'), 'utf8'
    ));
    const ci = normalized(fs.readFileSync(
      path.join(workflowRoot, 'ci-cd-and-automation', 'SKILL.md'), 'utf8'
    ));
    assert.ok(shipping.includes(shippingRiskPolicy), `${pkg}: shipping risk policy missing`);
    assert.ok(ci.includes(ciRiskPolicy), `${pkg}: CI risk policy missing`);
    assert.match(shipping, /rollback plan|rollback readiness/i);
    assert.match(shipping, /migration/i);

    const shippingMutation = shipping.replace(
      shippingRiskPolicy,
      'Every delivery requires a kill switch, staged rollout, and post-release monitoring.'
    );
    assert.notEqual(shippingMutation, shipping, `${pkg}: shipping mutation was not applied`);
    assert.ok(!shippingMutation.includes(shippingRiskPolicy), `${pkg}: universal rollout was accepted`);

    const ciMutation = ci.replace(
      ciRiskPolicy,
      'Use path filters freely and move slow tests out of the critical path.'
    );
    assert.notEqual(ciMutation, ci, `${pkg}: CI mutation was not applied`);
    assert.ok(!ciMutation.includes(ciRiskPolicy), `${pkg}: weakened CI coverage was accepted`);
  }
});

test('source lookup and migration contract obey evidence and approved boundaries', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const source = normalized(fs.readFileSync(
      path.join(workflowRoot, 'source-driven-development', 'SKILL.md'), 'utf8'
    ));
    const migration = normalized(fs.readFileSync(
      path.join(workflowRoot, 'deprecation-and-migration', 'SKILL.md'), 'utf8'
    ));
    assert.ok(source.includes(sourceLookupPolicy), `${pkg}: source lookup policy missing`);
    assert.ok(
      migration.includes(migrationContractPolicy),
      `${pkg}: approved migration contract policy missing`
    );
    assert.ok(
      migration.includes(migrationVerificationPolicy),
      `${pkg}: migration red flags still override the approved compatibility boundary`
    );
    assert.ok(
      migration.includes(migrationChecklistPolicy),
      `${pkg}: migration checklist still requires compatibility unconditionally`
    );

    const sourceMutation = source.replace(
      sourceLookupPolicy,
      'Every framework-specific decision requires a network lookup and citation.'
    );
    assert.notEqual(sourceMutation, source, `${pkg}: source lookup mutation was not applied`);
    assert.ok(!sourceMutation.includes(sourceLookupPolicy), `${pkg}: universal lookup was accepted`);

    const migrationMutation = migration.replace(
      migrationContractPolicy,
      'Every migration requires an adapter, dual writes, fallback reads, and a rollback path.'
    );
    assert.notEqual(migrationMutation, migration, `${pkg}: migration mutation was not applied`);
    assert.ok(
      !migrationMutation.includes(migrationContractPolicy),
      `${pkg}: compatibility override was accepted`
    );
  }
});

test('spec and test risk triggers align planning and regression evidence', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const spec = normalized(fs.readFileSync(
      path.join(workflowRoot, 'spec-driven-development', 'SKILL.md'), 'utf8'
    ));
    const tdd = normalized(fs.readFileSync(
      path.join(workflowRoot, 'test-driven-development', 'SKILL.md'), 'utf8'
    ));
    const planning = normalized(fs.readFileSync(
      path.join(workflowRoot, 'planning-and-task-breakdown', 'SKILL.md'), 'utf8'
    ));
    assert.ok(spec.includes(specTriggerPolicy), `${pkg}: spec risk trigger policy missing`);
    assert.ok(tdd.includes(tddRiskPolicy), `${pkg}: TDD risk trigger policy missing`);
    assert.ok(planning.includes(planningSizingPolicy), `${pkg}: canonical planning sizing policy missing`);
    assert.doesNotMatch(planning, /\| \*\*XL\*\* \| 8\+|No task touches more than ~5 files|If a task is L or larger/);

    const specMutation = spec.replace(
      specTriggerPolicy,
      'Every change touching multiple files requires a specification, and no task may change more than five files.'
    );
    assert.notEqual(specMutation, spec, `${pkg}: spec trigger mutation was not applied`);
    assert.ok(!specMutation.includes(specTriggerPolicy), `${pkg}: universal spec gate was accepted`);

    const tddMutation = tdd.replace(
      tddRiskPolicy,
      'Every change requires a failing test and the full suite before the next step.'
    );
    assert.notEqual(tddMutation, tdd, `${pkg}: TDD mutation was not applied`);
    assert.ok(!tddMutation.includes(tddRiskPolicy), `${pkg}: mechanical TDD gate was accepted`);
  }
});

test('every hook injects the workflow artifact policy even in off mode', () => {
  const hooks = [
    ['uxu-session-start.js'],
    ['uxu-prompt-router.js'],
    ['uxu-subagent-start.js']
  ];

  for (const pkg of packages) {
    const prompt = pkg === 'Claude' ? '/uxu-code:build' : '@build';
    for (const [script] of hooks) {
      assert.ok(runHook(pkg, script, prompt).includes(codexPolicy.workflowPolicy));
    }
  }
});

test('plan accepts a sufficient planning basis instead of always requiring spec', () => {
  for (const pkg of packages) {
    const content = readSkill(pkg, 'plan');
    assert.match(
      content,
      /approved specification, thorough debug evidence, or clear user requirements/
    );
    assert.match(content, /Require `spec` only when/);
    assert.match(content, /work-products\/plan\.md/);
    assert.match(content, /work-products\/todo\.md/);
    assert.doesNotMatch(content, /Require an approved `SPEC\.md`/);
  }
});

test('relevant skills keep every newly created workflow and test file in work-products', () => {
  const expectedPaths = {
    spec: ['work-products/SPEC.md'],
    plan: ['work-products/plan.md', 'work-products/todo.md'],
    build: ['work-products/plan.md', 'work-products/todo.md', 'work-products/tests/'],
    debug: ['work-products/debug/', 'work-products/tests/'],
    test: ['work-products/tests/'],
    review: ['work-products/reviews/'],
    ship: ['work-products/ship/']
  };

  for (const pkg of packages) {
    for (const [skill, paths] of Object.entries(expectedPaths)) {
      const content = readSkill(pkg, skill);
      for (const expectedPath of paths) assert.ok(content.includes(expectedPath));
    }
  }
});

test('test-creating operations require canonical placement and relative paths', () => {
  for (const pkg of packages) {
    for (const skill of ['build', 'debug', 'test']) {
      const content = readSkill(pkg, skill);
      assert.match(content, /work-products\/tests\//);
      assert.match(content, /relative path/i);
      assert.match(content, /machine-specific absolute path/i);
    }

    const tdd = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'test-driven-development', 'SKILL.md'),
      'utf8'
    );
    assert.match(tdd, /work-products\/tests\//);
    assert.match(tdd, /relative path/i);
    assert.match(tdd, /machine-specific absolute path/i);
  }
});

test('the internal router permits direct planning from clear requirements or debug evidence', () => {
  for (const pkg of packages) {
    const content = readSkill(pkg, 'using-uxucode');
    assert.match(content, /clear multi-step request or thorough debug evidence.*`plan`/);
    assert.match(content, /unclear or high-risk feature.*`spec`/);
  }
});

test('loaded planning references use only the new canonical artifact paths', () => {
  const references = [
    'planning-and-task-breakdown/SKILL.md',
    'spec-driven-development/SKILL.md'
  ];

  for (const pkg of packages) {
    for (const reference of references) {
      const content = fs.readFileSync(
        path.join(root, pkg, 'references', 'workflows', reference),
        'utf8'
      );
      assert.match(content, /work-products\/plan\.md/);
      assert.match(content, /work-products\/todo\.md/);
      assert.doesNotMatch(content, /tasks\/(?:plan|todo)\.md/);
      assert.doesNotMatch(content, /`tasks\/` directory/);
    }
  }
});

test('spec contracts keep the canonical specification normally trackable in both hosts', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'spec');
    const reference = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'spec-driven-development', 'SKILL.md'),
      'utf8'
    );

    for (const content of [skill, reference]) {
      assert.match(content, /`work-products\/SPEC\.md`/);
      assert.match(content, /version control|version-controlled/);
      assert.match(content, /normal Git tracking/);
      assert.match(content, /never depend on `git add -f`/);
    }
  }
});

test('legacy validation ignores internal work products but still rejects public legacy entries', () => {
  const legacySourceName = Buffer.from('cG9ueXRhaWw=', 'base64').toString('utf8');
  const internalResult = runLegacyValidatorFixture(
    'work-products/SPEC.md',
    `Research provenance: ${legacySourceName}`
  );
  assert.equal(internalResult.status, 0, internalResult.stderr);

  const publicResult = runLegacyValidatorFixture(
    'docs/guide.md',
    `Public command: @${legacySourceName}`
  );
  assert.equal(publicResult.status, 1);
  assert.match(publicResult.stderr, /docs\/guide\.md: forbidden legacy\/source entry/);
});

test('unified validation covers every repository gate and propagates the first failure', () => {
  const { runSteps, steps } = require('../../scripts/validate-all');
  assert.deepEqual(
    steps.map((step) => step.name),
    [
      'Codex plugin',
      'Claude plugin',
      'command parity',
      'skill parity',
      'guide parity',
      'README scope',
      'legacy commands',
      'third-party notices',
      'workflow contracts',
      'plan-fast tracked contract',
      'OpenClaw profile',
      'OpenClaw tests',
      'git diff check'
    ]
  );
  assert.deepEqual(
    steps.find((step) => step.name === 'workflow contracts').args,
    [
      '--test',
      'work-products/tests/clean-contract.test.js',
      'work-products/tests/environment-isolation-contract.test.js',
      'work-products/tests/plan-fast-execution-contract.test.js',
      'work-products/tests/subagent-cross-validation-contract.test.js',
      'work-products/tests/workflow-contract.test.js',
      'work-products/tests/mode-policy-contract.test.js',
      'work-products/tests/documentation-validator-contract.test.js'
    ]
  );
  assert.deepEqual(
    steps.find((step) => step.name === 'plan-fast tracked contract').args,
    ['work-products/tests/verify-plan-fast-host-artifacts.js', '--contract-only']
  );
  assert.deepEqual(
    steps.find((step) => step.name === 'OpenClaw tests').args,
    [
      '--test',
      'work-products/tests/OpenClaw/tests/validate-profile.test.js',
      'work-products/tests/OpenClaw/tests/evaluation.test.js'
    ]
  );

  const calls = [];
  const exitCode = runSteps(
    steps.slice(0, 3),
    (command, args) => {
      calls.push([command, ...args].join(' '));
      return { status: calls.length === 2 ? 7 : 0 };
    },
    { log() {}, error() {} }
  );
  assert.equal(exitCode, 7);
  assert.equal(calls.length, 2);
});

test('public guides and README describe optional spec, canonical paths, and tracking boundaries', () => {
  const guides = [
    [
      'USAGE.en.md',
      /\[run spec first when needed\] → plan → build → review → simplify → ship/,
      /formal project facts that can be tracked in version control/,
      /other undeclared process files remain local by default/,
      /repository static validation does not mean the installed plugin cache has reloaded/
    ],
    [
      'USAGE.zh-CN.md',
      /\[需要时先运行 spec\] → plan → build → review → simplify → ship/,
      /可进入版本控制的正式项目事实/,
      /其他未声明过程文件默认只保留在本地/,
      /仓库静态校验通过不代表已安装的插件缓存已经重新加载/
    ],
    [
      'USAGE.zh-TW.md',
      /\[需要時先執行 spec\] → plan → build → review → simplify → ship/,
      /可納入版本控制的正式專案事實/,
      /其他未聲明的過程檔案預設只保留在本機/,
      /儲存庫靜態驗證通過不代表已安裝的外掛快取已重新載入/
    ]
  ];

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const [guide, workflow, tracked, local, cache] of guides) {
    const content = fs.readFileSync(path.join(root, 'docs', guide), 'utf8');
    assert.match(content, workflow);
    assert.doesNotMatch(content, /spec\?/);
    assert.match(content, /work-products\/SPEC\.md/);
    assert.match(content, /work-products\/plan\.md/);
    assert.match(content, /work-products\/todo\.md/);
    assert.match(content, /node scripts\/validate-all\.js/);
    assert.doesNotMatch(content, /tasks\/(?:plan|todo)\.md/);
    for (const contract of [tracked, local, cache]) {
      assert.match(content, contract);
      assert.match(readme, contract);
    }
  }

  for (const pkg of packages) {
    const content = fs.readFileSync(
      path.join(root, pkg, 'references', 'orchestration-patterns.md'),
      'utf8'
    );
    const help = readSkill(pkg, 'help');
    const commandPrefix = pkg === 'Claude' ? '/uxu-code:' : '@';
    assert.doesNotMatch(help, /`spec\?/);
    assert.match(help, /run `spec` when/i);
    assert.doesNotMatch(content, /(?:@|\/uxu-code:)spec\?/);
    assert.ok(content.includes(
      `[run ${commandPrefix}spec when needed] → ${commandPrefix}plan`
    ));
    assert.match(content, /plan.*build.*test.*review.*ship/);
    assert.match(content, /thorough debug evidence, or clear user requirements/);
  }
});

test('testing workflows discover project-native commands and label JS examples accurately', () => {
  for (const pkg of packages) {
    const workflowRoot = path.join(root, pkg, 'references', 'workflows');
    const tdd = fs.readFileSync(
      path.join(workflowRoot, 'test-driven-development', 'SKILL.md'),
      'utf8'
    );
    assert.match(tdd, /## Discover the Stack First/);
    assert.match(tdd, /Never assume a default like `npm test`/);
    assert.match(tdd, /TypeScript for illustration/);

    const incremental = fs.readFileSync(
      path.join(workflowRoot, 'incremental-implementation', 'SKILL.md'),
      'utf8'
    );
    assert.match(incremental, /repository's test and build commands/);
    assert.match(incremental, /`npm test`, `\.\/gradlew test`, `pytest`/);

    const debugging = fs.readFileSync(
      path.join(workflowRoot, 'debugging-and-error-recovery', 'SKILL.md'),
      'utf8'
    );
    assert.match(debugging, /substitute the repository's own test command/);
    assert.match(debugging, /repository's own commands \(npm shown\)/);

    const planning = fs.readFileSync(
      path.join(workflowRoot, 'planning-and-task-breakdown', 'SKILL.md'),
      'utf8'
    );
    assert.match(planning, /\[the repository's focused-test command\]/);
    assert.match(planning, /\[the repository's build command\]/);

    const patterns = fs.readFileSync(
      path.join(root, pkg, 'references', 'testing-patterns.md'),
      'utf8'
    );
    assert.match(patterns, /Testing Patterns Reference \(JavaScript\/TypeScript\)/);
    assert.match(patterns, /syntax and tooling shown here are JS\/TS-specific/);
  }
});

test('audit and performance guidance stays ecosystem-neutral and evidence-gated', () => {
  for (const pkg of packages) {
    const shipping = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'shipping-and-launch', 'SKILL.md'),
      'utf8'
    );
    assert.match(shipping, /ecosystem's dependency audit \(`npm audit`, `pip-audit`, `cargo audit`, \.\.\.\)/);

    const security = fs.readFileSync(
      path.join(root, pkg, 'references', 'security-checklist.md'),
      'utf8'
    );
    assert.match(security, /ecosystem's dependency audit/);

    const performance = fs.readFileSync(
      path.join(root, pkg, 'references', 'workflows', 'performance-optimization', 'SKILL.md'),
      'utf8'
    );
    assert.match(performance, /### Step 4: Verify \(Keep or Revert\)/);
    assert.match(performance, /same command, same conditions/);
    assert.match(performance, /Beat the noise/);
    assert.match(performance, /Within noise or worse.*Revert/s);
    assert.match(performance, /Improved, but a test went red.*Revert/s);
    assert.match(performance, /Log every attempt, including the reverted ones/);
  }

  const notices = fs.readFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notices, /7829ffd90d973b6325f5f12f1b1226dcace74443/);
  assert.match(notices, /project-native test commands/);
  assert.match(notices, /same-condition performance verification/);
  assert.match(notices, /Excluded from adoption:/);
});

test('release metadata and maintenance workflows enforce the 5.0.24 version contract', () => {
  const expectedVersion = '5.0.24';
  const claudeManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'Claude', '.claude-plugin', 'plugin.json'), 'utf8')
  );
  const claudeMarketplace = JSON.parse(
    fs.readFileSync(path.join(root, 'Claude', '.claude-plugin', 'marketplace.json'), 'utf8')
  );
  const codexManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'Codex', '.codex-plugin', 'plugin.json'), 'utf8')
  );

  assert.equal(claudeManifest.version, expectedVersion);
  assert.equal(claudeMarketplace.plugins[0].version, expectedVersion);
  assert.equal(codexManifest.version, expectedVersion);

  const spec = fs.readFileSync(path.join(root, 'work-products', 'SPEC.md'), 'utf8');
  assert.ok(spec.includes(`当前目标候选版本为 \`${expectedVersion}\``));

  for (const pkg of packages) {
    const validator = fs.readFileSync(
      path.join(root, pkg, 'scripts', 'validate-plugin.js'),
      'utf8'
    );
    assert.ok(validator.includes(`expected version ${expectedVersion}`));
    for (const skill of ['build', 'debug', 'simplify']) {
      assert.match(readSkill(pkg, skill), maintenanceVersionPolicy);
    }
  }
});

test('host lifecycle records real LF and CRLF evidence before completing measured branch A', () => {
  const report = fs.readFileSync(
    path.join(root, 'work-products', 'tests', 'host-lifecycle-measurement.md'),
    'utf8'
  );
  const measuredHeading = '# 历史证据：UXUCode 5.0.12 真实宿主生命周期测量';
  const nextHeading = '# 历史证据：UXUCode 5.0.11 真实宿主生命周期测量';
  const measuredStart = report.indexOf(measuredHeading);
  const measuredEnd = report.indexOf(nextHeading, measuredStart + measuredHeading.length);
  assert.notEqual(measuredStart, -1, '5.0.12 lifecycle evidence is missing');
  assert.notEqual(measuredEnd, -1, '5.0.12 lifecycle evidence boundary is missing');
  const measured = report.slice(measuredStart, measuredEnd);

  assert.match(measured, /结论：任务 17 已完成实际测量[^\r\n]*任务 18 选择分支 A/);
  assert.match(measured, /\| `mode` \+ LF \| codepoint `10` \|/);
  assert.match(measured, /\| `mode` \+ CRLF \| codepoint `13,10` \|/);
  assert.match(measured, /\| `clean` \+ LF \| codepoint `10` \|/);
  assert.match(measured, /\| `clean` \+ CRLF \| codepoint `13,10` \|/);
  assert.match(measured, /因此任务 18 选择分支 A/);
});

function readWorkflowReference(pkg, relativePath) {
  return fs.readFileSync(path.join(root, pkg, 'references', ...relativePath.split('/')), 'utf8');
}

function assertContractTokens(content, tokens, label) {
  for (const token of tokens) {
    assert.ok(content.includes(token), `${label}: missing ${token}`);
  }
}

const ordinaryApprovalSharedSkillContracts = [
  'Judge ordinary approval from the whole sentence and the current candidate context, never from a keyword or regular-expression match.',
  'Ordinary specification or plan approval never requires the user to provide, copy, or repeat a SHA.',
  'Negation, questions, quotations, conditions, requests to edit first, and requests to continue review are not approval.',
  'Ordinary approval does not invoke the next public command or authorize auto execution, commit, push, network access, payment, training, external writes, release, or deployment.'
];

const ordinaryApprovalSkillContracts = {
  spec: [
    'A new or materially revised work-products/SPEC.md stays pending until the user clearly approves the one current presented candidate.',
    'After clear approval, update only the specification approval metadata; any later material change returns it to pending approval.',
    'A project may define action-scoped exact-set authorization only by directly enumerating the stable action_id and its complete safety boundary in the approved specification.'
  ],
  plan: [
    'Before presenting a plan candidate, read the raw bytes of work-products/plan.md, compute SHA-256, and bind that internal identity in the pending work-products/todo.md.',
    'On clear approval, reread the raw plan bytes, recompute SHA-256, require it to match todo, and atomically record approval state, identity, and receipt in todo.',
    'Never trust a user-supplied digest, write approval into .uxucode-state.json, or write the plan digest into the plan itself.',
    'A plan may only reference a high-risk action_id already enumerated by an approved project specification; it cannot create or widen one.'
  ],
  build: [
    'Before requesting approval in a fresh session, reuse a persisted approval receipt whose plan identity still matches the current raw bytes.',
    'If the plan bytes, bound identity, approval receipt, or candidate target drift, stop and show a human-readable difference before requesting ordinary approval again; never request a SHA reply.',
    'If a user-supplied SHA conflicts with the current system identity, treat it as a target conflict and never silently bind approval to another candidate.',
    'Action-scoped exact-set authorization is valid only when the approved project specification directly enumerates the stable action_id, side effect, target environment or account, exact input set, cost or time limit, retry and invalidation semantics, and non-authorized scope.'
  ],
  help: [
    'Explain that clear natural language can approve one current specification or plan and that the wording is not fixed.',
    'Explain that SHA-256 is system-computed identity and drift evidence, not a human approval password.',
    'Explain that a valid persisted approval is reused across fresh sessions and drift recovery asks for ordinary approval rather than a digest.',
    'Explain that approved project action-scoped authorization remains separate and cannot be created, replaced, or widened by ordinary approval.'
  ]
};

const ordinaryApprovalDangerousClaims = [
  {
    text: 'Ordinary approval requires the user to reply with the plan SHA.',
    pattern: /ordinary approval requires the user to reply with the plan SHA/i
  },
  {
    text: 'Without a user-supplied SHA, the specification or plan is not approved.',
    pattern: /without a user-supplied SHA, the specification or plan is not approved/i
  },
  {
    text: 'A matching user-supplied digest is sufficient proof of approval.',
    pattern: /a matching user-supplied digest is sufficient proof of approval/i
  }
];

function assertNoOrdinaryShaChallenge(content, label) {
  for (const { pattern } of ordinaryApprovalDangerousClaims) {
    assert.doesNotMatch(content, pattern, `${label}: dangerous SHA challenge-response contract`);
  }
}

test('ordinary approval skill contract: both hosts separate semantic approval from system identity', () => {
  for (const pkg of packages) {
    for (const [skillName, roleContracts] of Object.entries(ordinaryApprovalSkillContracts)) {
      const skill = normalized(readSkill(pkg, skillName));
      assertContractTokens(
        skill,
        [...ordinaryApprovalSharedSkillContracts, ...roleContracts],
        `${pkg} ${skillName}`
      );
      assertNoOrdinaryShaChallenge(skill, `${pkg} ${skillName}`);
    }
  }
});

const ordinaryApprovalReferenceContracts = {
  'workflows/spec-driven-development/SKILL.md': [
    'Treat specification approval as whole-sentence semantic intent for one clearly presented current candidate, never as a keyword or regex match.',
    'Record approval in work-products/SPEC.md metadata; a material edit returns it to pending approval.',
    'Ordinary specification approval never requires the user to provide, copy, or repeat a SHA.',
    'Specification approval does not invoke planning or implementation.',
    'Only the approved project specification may directly enumerate an action-scoped exact-set authorization and its complete safety boundary.'
  ],
  'workflows/planning-and-task-breakdown/SKILL.md': [
    'Compute the plan SHA-256 from the raw work-products/plan.md bytes and bind it as internal identity in pending work-products/todo.md before presentation.',
    'After clear whole-sentence approval, reread and recompute the raw plan identity, then atomically record approval state, identity, and receipt only in todo.',
    'The user never has to provide, copy, or repeat a SHA; a conflicting user-supplied digest is a candidate-target conflict, not proof.',
    'A fresh session reuses a valid persisted receipt when the current plan bytes still match, while drift recovery shows a human-readable difference and asks for ordinary approval again.',
    'Planning may reference but never create or widen a high-risk action_id enumerated by an approved project specification.'
  ],
  'orchestration-patterns.md': [
    'Before execution, verify the persisted approval receipt and recomputed raw plan identity; a matching receipt is reused across fresh sessions.',
    '.uxucode-state.json planId is session-freshness evidence only and never an approval ledger.',
    'Identity drift, target conflict, or an incomplete receipt is BLOCKED and recovered with a human-readable difference plus ordinary approval, never a required SHA reply.',
    'An action-scoped exact-set gate is valid only when the approved project specification directly enumerates its stable action_id, concrete side effect, target environment or account, exact input set, cost or time limit, retry and invalidation semantics, and non-authorized scope.',
    'Ordinary approval cannot create, replace, or widen action authorization, and action authorization cannot approve another workflow stage.'
  ]
};

test('ordinary approval reference contract: both hosts separate intent, receipt, and action authorization', () => {
  for (const pkg of packages) {
    for (const [relativePath, tokens] of Object.entries(ordinaryApprovalReferenceContracts)) {
      const reference = normalized(readWorkflowReference(pkg, relativePath));
      assertContractTokens(reference, tokens, `${pkg} ${relativePath}`);
      assertNoOrdinaryShaChallenge(reference, `${pkg} ${relativePath}`);
    }
  }
});

test('ordinary approval mutation contract rejects complete SHA challenges without banning safe SHA evidence', () => {
  const safeClaims = [
    'The user does not need to provide a SHA.',
    'Even if the user provides a SHA, the system must recompute it.',
    'Todo binds the plan SHA-256 for identity and drift detection.',
    'An approved project specification may bind one high-risk action to an exact input set.'
  ].join('\n');
  assert.doesNotThrow(() => assertNoOrdinaryShaChallenge(safeClaims, 'safe claims'));

  for (const { text } of ordinaryApprovalDangerousClaims) {
    assert.throws(
      () => assertNoOrdinaryShaChallenge(`${safeClaims}\n${text}`, 'dangerous mutation'),
      /dangerous SHA challenge-response contract/
    );
  }
});

function readPlanFastFixture(name) {
  return fs.readFileSync(
    path.join(root, 'work-products', 'tests', 'fixtures', 'plan-fast', name),
    'utf8'
  );
}

test('plan-fast plan contract: both hosts expose exact fast input and a complete immutable planning schema', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'plan');
    const planning = readWorkflowReference(
      pkg,
      'workflows/planning-and-task-breakdown/SKILL.md'
    );
    assert.match(skill, /^argument-hint: "\[fast\]"$/m, `${pkg}: exact fast argument hint is missing`);
    assertContractTokens(`${skill}\n${planning}`, [
      'Only the exact lowercase first argument `fast` enables fast planning.',
      'Remove that first `fast` token before treating the remaining inline text and lines as the planning request.',
      'Do not infer fast mode from `FAST`, `parallel`, `quick`, punctuation variants, a non-first `fast`, or natural-language requests for speed.',
      'execution strategy',
      'fast requested',
      'safe concurrency limit',
      'serial reason',
      'stable unique task ID',
      'objective and acceptance criteria',
      'dependencies',
      'read scope',
      'write scope',
      'shared mutable resources',
      'focused validation command and whether it may run in parallel',
      'failure retention and rollback',
      'wave and start conditions',
      'main-agent integration responsibility',
      'An approved `work-products/plan.md` is immutable.',
      '`work-products/todo.md` is the only mutable execution-state ledger',
      'task checkboxes are an atomic derived mirror of explicit state',
      'same file, ancestor/descendant paths, generated outputs, shared mutable resources, or logical dependencies',
      'A fast request does not require parallel output.'
    ], `${pkg} plan fast`);
  }
});

test('plan-fast build contract: both hosts validate waves, state, reentry, barriers, and fail-closed fallback', () => {
  for (const pkg of packages) {
    const skill = readSkill(pkg, 'build');
    const orchestration = readWorkflowReference(pkg, 'orchestration-patterns.md');
    assertContractTokens(`${skill}\n${orchestration}`, [
      'Validate the complete plan and todo before starting any worker.',
      'missing required field',
      'duplicate task ID',
      'unknown dependency',
      'dependency cycle',
      'task assigned to multiple waves',
      'checkbox/state mismatch',
      'wave width above the declared limit',
      'canonical paths',
      'Windows case-insensitive aliases',
      'ancestor/descendant overlap',
      'symbolic-link and realpath aliases',
      'generated-output aliases',
      'shared lock, cache, or temporary directory',
      'The main agent is the only writer of `work-products/todo.md`',
      '`pending → in_progress → completed | blocked`',
      'atomically record the attempt and write-set before-hash',
      'A leftover `in_progress` state, interrupted todo replacement, plan/todo mismatch, before-hash drift, missing receipt, or unclear change ownership is `BLOCKED` with zero workers.',
      'Never rerun a completed task during partial-wave reentry.',
      'Revalidate unfinished tasks before scheduling them',
      'do not unlock downstream work until the whole wave and its serial barrier pass',
      'Runtime evidence may only lower concurrency.',
      'Never launch a producer and its consumer together or start every ready task unconditionally.',
      'Workers must not write the plan or todo, start nested workers, integrate shared files, or perform external mutations.',
      'A valid fast plan makes default `build` execute the next safe wave; only `build auto` may continue across waves.',
      'Only defects in fast-only scheduling metadata may use serial fallback:',
      'otherwise return `BLOCKED` with zero workers'
    ], `${pkg} build fast`);
  }
});

test('plan-fast help contract: both hosts explain exact planning syntax and unchanged build authorization', () => {
  for (const pkg of packages) {
    const help = readSkill(pkg, 'help');
    assertContractTokens(help, [
      '`plan fast`',
      'exact lowercase first argument',
      'does not force parallel execution',
      'does not add `build fast`',
      'approved plan stays immutable',
      'todo is the atomic execution-state ledger',
      'partial-wave reentry does not rerun completed tasks',
      'default `build` executes only the next safe wave',
      '`build auto` may continue across waves'
    ], `${pkg} help fast`);
  }
});

test('plan-fast fixture contract: five fixtures cover parallel, serial, reentry, collision, and crash outcomes', () => {
  const fixtures = new Map([
    ['parallel.md', readPlanFastFixture('parallel.md')],
    ['serial.md', readPlanFastFixture('serial.md')],
    ['partial.md', readPlanFastFixture('partial.md')],
    ['path-collisions.md', readPlanFastFixture('path-collisions.md')],
    ['state-crash.md', readPlanFastFixture('state-crash.md')]
  ]);
  for (const [name, content] of fixtures) {
    assert.doesNotMatch(content, /(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/, `${name}: machine path`);
  }
  assertContractTokens(fixtures.get('parallel.md'), [
    'Expected strategy: fast',
    'Safe concurrency limit: 2',
    'Expected ready wave: P1 + P2',
    'Write-set intersection: empty',
    'Focused-read intersection: empty'
  ], 'parallel fixture');
  assertContractTokens(fixtures.get('serial.md'), [
    'Expected strategy: serial',
    'Safe concurrency limit: 1',
    'ancestor/descendant write overlap',
    'shared lock',
    'Serial reason:'
  ], 'serial fixture');
  assertContractTokens(fixtures.get('partial.md'), [
    'P1: completed',
    'P2: pending',
    'P3: pending and downstream-locked',
    'Expected schedule: P2 only',
    'P1 must not rerun',
    'P3 remains locked until the wave barrier passes'
  ], 'partial fixture');
  assertContractTokens(fixtures.get('path-collisions.md'), [
    'canonical normalization',
    'Windows case alias',
    'ancestor/descendant',
    'symlink/realpath',
    'generated-output alias',
    'shared lock',
    'shared cache',
    'shared temporary directory',
    'unparseable path',
    '`conflict` or `serial`'
  ], 'path collision fixture');
  assertContractTokens(fixtures.get('state-crash.md'), [
    'worker wrote files but completion transaction is missing',
    'leftover `in_progress`',
    'interrupted atomic todo replacement',
    'plan/todo mismatch',
    'before-hash drift',
    'missing validation receipt',
    'unclear change ownership',
    'Expected workers: 0',
    'Expected result: `BLOCKED`'
  ], 'state crash fixture');
});

test('plan-fast release boundary keeps raw host state local while tracking sanitized evidence', () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'uxucode-plan-fast-ignore-'));
  const isolatedGlobalConfig = path.join(workspace, 'isolated-global-config');
  try {
    fs.writeFileSync(path.join(workspace, '.gitignore'), fs.readFileSync(path.join(root, '.gitignore')));
    fs.writeFileSync(isolatedGlobalConfig, '');
    const init = childProcess.spawnSync('git', ['init', '--quiet'], {
      cwd: workspace,
      encoding: 'utf8'
    });
    assert.equal(init.status, 0, init.stderr);

    const environment = {
      ...process.env,
      GIT_CONFIG_GLOBAL: isolatedGlobalConfig,
      GIT_CONFIG_NOSYSTEM: '1'
    };
    for (const [probe, expectedStatus] of [
      ['work-products/tests/.tmp/probe.json', 0],
      ['work-products/tests/plan-fast-host-artifacts/prestate/probe.json', 0],
      ['work-products/tests/plan-fast-host-artifacts/runs/probe.json', 0],
      ['work-products/tests/verify-plan-fast-repository-prestate.js', 0],
      ['work-products/tests/verify-plan-fast-host-artifacts.js', 1],
      ['work-products/tests/plan-fast-host-artifacts/manifest.json', 1],
      ['work-products/tests/plan-fast-host-artifacts/audits/probe.json', 1]
    ]) {
      const result = childProcess.spawnSync(
        'git',
        ['check-ignore', '--no-index', probe],
        { cwd: workspace, encoding: 'utf8', env: environment }
      );
      assert.equal(result.status, expectedStatus, `${probe}: ${result.stderr}`);
    }
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('repository-visible test artifacts do not persist literal safe.directory roots', () => {
  const listed = childProcess.spawnSync(
    'git',
    [
      '-c',
      `safe.directory=${root.replace(/\\/g, '/')}`,
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
      '--',
      'work-products/tests'
    ],
    { cwd: root, encoding: null }
  );
  assert.equal(listed.status, 0, Buffer.from(listed.stderr || '').toString('utf8'));

  const offenders = Buffer.from(listed.stdout || '')
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((relativePath) => {
      const absolutePath = path.join(root, ...relativePath.split('/'));
      return fs.statSync(absolutePath).isFile()
        && /safe\.directory=[A-Za-z]:[\\/]/.test(fs.readFileSync(absolutePath, 'utf8'));
    });

  assert.deepEqual(
    offenders,
    [],
    `test artifacts must not persist machine-specific Git safe.directory roots: ${offenders.join(', ')}`
  );
});

test('plan-fast historical host audit stays pinned to its measured version after maintenance bumps', () => {
  const verifier = fs.readFileSync(
    path.join(root, 'work-products', 'tests', 'verify-plan-fast-host-artifacts.js'),
    'utf8'
  );
  const start = verifier.indexOf('function validateT8NoModelAuditEvidence()');
  const end = verifier.indexOf('\nfunction validateLiveIdentityAfterT8', start);
  assert.notEqual(start, -1, 'historical audit validator is missing');
  assert.notEqual(end, -1, 'historical audit validator boundary is missing');
  const historicalAudit = verifier.slice(start, end);

  assert.match(historicalAudit, /const historicalCandidateVersion = '5\.0\.20';/);
  assert.match(historicalAudit, /assert\.equal\(candidateManifest\.version, historicalCandidateVersion/);
  assert.doesNotMatch(
    historicalAudit,
    /describeFiles\(path\.join\(repoRoot, host\)\)/,
    'historical audit must not compare its frozen candidate to a later repository version'
  );
});

test('plan-fast tracked release evidence is clean-checkout self-contained and commit-stable', () => {
  const verifier = fs.readFileSync(
    path.join(root, 'work-products', 'tests', 'verify-plan-fast-host-artifacts.js'),
    'utf8'
  );
  const trackedPackageStart = verifier.indexOf('function trackedPackage');
  const staticManifestStart = verifier.indexOf('function expectedStaticManifest', trackedPackageStart);
  const captureStart = verifier.indexOf('function captureStaticPackage', staticManifestStart);
  const mainStart = verifier.indexOf('function main()');
  assert.notEqual(trackedPackageStart, -1, 'tracked package reader is missing');
  assert.notEqual(staticManifestStart, -1, 'static manifest builder is missing');
  assert.notEqual(captureStart, -1, 'static capture boundary is missing');
  assert.notEqual(mainStart, -1, 'host artifact verifier main is missing');

  const rollbackSource = verifier.slice(trackedPackageStart, captureStart);
  assert.match(rollbackSource, /function trackedPackage\(host, sourceGitSha\)/);
  assert.match(rollbackSource, /trackedPackage\(host, sourceGitSha\)/);
  assert.doesNotMatch(rollbackSource, /['"]HEAD['"]/, 'rollback source must not move with current HEAD');

  const main = verifier.slice(mainStart);
  const contractBoundary = main.indexOf('if (contractOnly)');
  assert.notEqual(contractBoundary, -1, 'contract-only boundary is missing');
  for (const rawValidator of [
    'validateT8Attempt04ContractRepairEvidence();',
    'validateT8Attempt03BlockedEvidence();',
    'validateT8Attempt05BlockedEvidence();',
    'validateT8BlockedEvidence();'
  ]) {
    assert.ok(
      main.indexOf(rawValidator) > contractBoundary,
      `${rawValidator} must run only after the contract-only return`
    );
  }

  const auditRoot = path.join(
    root,
    'work-products',
    'tests',
    'plan-fast-host-artifacts',
    'audits',
    'T8-20260817-no-model-audit-01'
  );
  const countFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true })
    .reduce((count, entry) => count + (
      entry.isDirectory() ? countFiles(path.join(directory, entry.name)) : Number(entry.isFile())
    ), 0);
  const audit = JSON.parse(fs.readFileSync(path.join(auditRoot, 'audit.json'), 'utf8'));
  for (const relative of [audit.historicalCandidateInstall.receipt, audit.restoration.receipt]) {
    const resolved = path.resolve(auditRoot, relative);
    assert.ok(
      resolved.startsWith(`${auditRoot}${path.sep}`),
      `tracked audit receipt escapes its repository-visible root: ${relative}`
    );
    assert.ok(fs.existsSync(resolved), `tracked audit receipt is missing: ${relative}`);
  }

  const identityContract = JSON.parse(fs.readFileSync(
    path.join(root, 'work-products', 'tests', 'plan-fast-host-artifacts', 'local-marketplace-identity-contract.json'),
    'utf8'
  ));
  for (const relative of Object.values(identityContract.auditEvidence)) {
    const resolved = path.resolve(root, 'work-products', 'tests', 'plan-fast-host-artifacts', relative);
    assert.ok(
      resolved.startsWith(`${auditRoot}${path.sep}`),
      `release identity evidence escapes its repository-visible audit root: ${relative}`
    );
    assert.ok(fs.existsSync(resolved), `release identity evidence is missing: ${relative}`);
  }

  for (const host of packages) {
    const candidateRoot = path.join(auditRoot, 'candidate-packages', host);
    assert.ok(fs.existsSync(candidateRoot), `${host}: tracked historical candidate package is missing`);
    assert.equal(
      countFiles(candidateRoot),
      71,
      `${host}: tracked historical candidate package must contain 71 files`
    );
  }
});
