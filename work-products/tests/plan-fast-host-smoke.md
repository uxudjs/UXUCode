# plan-fast 5.0.20 host smoke preflight

Status: `PASS (NO-MODEL EVIDENCE AUDIT)`

Production: `NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED`

用户已把 T8 验收改为“无 Claude／Codex 模型校验，证据审计合理即通过”。审计结论为 `PASS`：两宿主 5.0.20 历史候选包各 71 文件与当前仓库源码逐字节一致，包内 validator、静态行为合同与恢复收据通过。本轮模型调用 0、模型费用 USD 0、宿主 registration／cache 写入 0。

## 当前无模型审计结论

- 审计收据：`./plan-fast-host-artifacts/audits/T8-20260817-no-model-audit-01/audit.json`。
- 身份合同：`./plan-fast-host-artifacts/local-marketplace-identity-contract.json` schema v4，验收模式 `evidenceAuditNoModel`。
- attempt 04 的 `candidate-install.json` 为 `PASS`，模型调用 0；Claude／Codex 均记录 5.0.20 候选登记／cache 和包内 validator 通过。
- attempt 04 保全的 Claude／Codex 5.0.20 候选包各 71 文件，与当前对应仓库源码逐路径、逐字节一致，byte delta 均为 0。
- attempt 05 恢复为 `RESTORED_BYTE_IDENTICAL_TO_ATTEMPT_PRESTATE`；Claude 完整 user state、Codex config、Codex cache delta 均为 0。
- `PASS` 只表示本地候选证据被接受；当前宿主安装为 `NOT_REQUIRED_NOT_VERIFIED`，fresh runtime 为 `NOT_REQUIRED_NOT_VERIFIED`，不能声称当前会话已加载 5.0.20。

## 历史 T8 执行结果

- backup manifest SHA-256：`c0c64abe1f4b6aff0f94e8394163b7c69a3c81d871b43887e0e8bd1c001765f0`；Claude 登记 2／cache 768 文件，Codex 登记 1／cache 71 文件，安装前全部逐文件验证。
- Claude 与 Codex 的 5.0.20 登记、实际 cache 和包内 validator 均曾通过。
- fixture 准备失败：`P1\n` 实际字节 `50310a`、SHA-256 `27ae4c8af1987fafcc08e92284a94a65f541e2daae296ed69925d44a50fb72ed`，与获批 fixture 的错误期望 `e50e76b20591f3574f68fc9719f9dbbbcd99bab4b3fe7b4620f5e3d559f7c7f2` 不同。功能 smoke 模型调用数为 0。
- 两宿主登记与完整 cache 在 attempt 01 恢复检查点曾逐文件匹配 T7 prestate；当时 CLI 登记均报告 5.0.19。候选 cache 未删除，保留在 `./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-01/restore-quarantine/`。当前分层状态见下方 T8R 修订，不把旧时点冒充实时状态。
- Claude 恢复身份诊断实际加载 `<REPO>/Claude/skills/help`，即 repository source，而非恢复的 5.0.19 cache；该观察按修订合同不再标记为 cache 恢复失败，但旧尝试没有 fresh 前基线，不能追溯升级为 PASS。Codex 三次受限 nested `exec` 均为 0 input/output tokens，身份结论仍为 `INCONCLUSIVE`。
- 费用：Claude USD `0.19862825`；Codex 记录 token 为 0。没有产品 commit、push、发布或部署；仅生成 2 个 disposable fixture baseline commit 并保留失败现场。
- 可复算摘要：`./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-01/summary.json`。

## 证据分层

| 层级 | 当前结论 | 可复算证据 |
|---|---|---|
| repository source | Claude／Codex 源码均为候选 `5.0.20`，各 71 文件 | `./plan-fast-host-artifacts/t7-prestate.json` |
| repository prestate | T0 已捕获计划前写集；不代表宿主状态 | `./plan-fast-repository-prestate/manifest.json` |
| static rollback | Git `52f3a6c87402a19e37026a70bd60ec89143613a9` 的 5.0.19；Claude／Codex 各 71 文件 | `./plan-fast-host-artifacts/manifest.json`、`./plan-fast-host-artifacts/5.0.19/` |
| actual registration | Claude 与 Codex 均登记为已启用 `5.0.19`；目标形态不同 | `./plan-fast-host-artifacts/t7-prestate.json` |
| actual cache | 两宿主活动 cache 均为 5.0.19、各 71 文件；完整 UXUCode cache scope 另行覆盖 | 同上 |
| fresh session | 功能 smoke 未执行；Claude 已观察到 source-loaded root 但缺尝试前基线，Codex 为零 token 无结论 | `./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-01/summary.json` |

## T8R 已批准的本地合同修订（历史）

- fixture 输入升级为 schema v2；`partialCompletedOutput.bytesBase64=UDEK` 唯一确定原始字节 `50310a`，其 SHA-256 为 `27ae4c8af1987fafcc08e92284a94a65f541e2daae296ed69925d44a50fb72ed`，todo receipt 必须从同一字段核对。`fixture-specs.json` SHA-256：`bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45`。
- 当时 local Marketplace 使用 schema v3 机器合同，SHA-256：`20c1e773408f09951a2a5ac97d50d7e256f225ac341771f1f61d238a5c9c686d`。身份固定拆为 `registration`、`marketplaceSource`、`installedCache`、`freshLoadedRoot`、`loadedPackageIdentity`；该历史合同已被当前 schema v4 无模型审计合同取代，不再是 T8 完成条件。
- `plugin list`、登记文件、source 版本或 cache 版本均不能单独证明 fresh runtime。宿主 CLI 观察可能物化 local-source cache，因此必须先备份，观察后重新捕获 cache；恢复时先保存逐字节检查点，再运行 fresh 身份观察并记录其可能产生的派生 cache。
- Codex 用 `codex debug prompt-input` 捕获模型可见的 Skill locator，用官方稳定非交互入口 `codex exec --json -` 证明行为。零 token 一律为 `INCONCLUSIVE`，不得计作 fresh 成功。
- 本轮本地诊断保持三份登记文件与 T7 SHA 完全一致，但 Codex 5.0.20 cache 于 `2026-08-17T01:01:51+08:00` 从 local source 重新物化。此变化不得改写历史 T7 收据；attempt 02 必须把实际开始状态另行备份并分层报告。

## T7 只读 pre-state

观察时间：`2026-08-16T16:24:46.727Z`。

### Claude

- CLI：`2.1.233 (Claude Code)`；登记 `uxu-code@uxu-code-claude`，user scope，enabled，版本 `5.0.19`。
- 规范化活动目标：`<USER>/.claude/plugins/cache/uxu-code-claude/uxu-code/5.0.19`；marketplace source：`<REPO>/Claude`（当前 source 为 `5.0.20`）。
- 登记文件：`installed_plugins.json` SHA-256 `0d3ad42a33c6ea7e664665a5477a2b264d033765ea7bbe6818d35723bfa31805`；`known_marketplaces.json` SHA-256 `54eb36dc335407a27544a2d397fcfb016e7fca6a51a249c41858a7f3885d187c`。
- 活动 cache：71 文件，tree SHA-256 `2e5553f72d5e8ca50ad01dc8f7ed9d22220187c14e64c3fd5f6c503ce467cccb`。
- 完整 UXUCode cache scope：768 文件，tree SHA-256 `2d5db65fb8d483829304d5dba14091ff3e70ca9dfeea5a41840ad382f7bb59af`。

### Codex

- CLI：`codex-cli 0.147.0`；登记 `uxu-code@uxu-code-codex`，installed／enabled，版本 `5.0.19`。
- 规范化登记目标与 marketplace source 均为 `<REPO>/Codex`（当前 source 为 `5.0.20`）；同时存在已安装的 5.0.19 cache。本次 fresh CLI 前必须重新安装并验证实际加载身份，不能按登记路径推断。
- 登记文件：`config.toml` SHA-256 `33b8c1508cb94ca979938deb3dc31b4dbec068863eef806e261b19cb79d78f16`。
- 活动 cache：71 文件，tree SHA-256 `0bcc8b70d940734a6eee56058288bc521bcc6cba87ac1c60406f8d084870b238`。
- 完整 UXUCode cache scope：71 文件，tree SHA-256 `80d07ffae37fd2b78ecfd12a175592c07310a8df10bed1756ee1dd3c2298f030`。

完整逐文件相对路径、size 与 SHA-256 均在 pre-state JSON 中；校验器会重新读取 CLI、登记、source、活动 cache 与完整 cache scope，任何漂移都 `BLOCKED`。

## 静态回滚边界

- 5.0.19 静态制品 manifest SHA-256：`66e745477b1486be7bebcfc0c1d778fde7ac9160a4c9c9ee9cee92ec776314d7`。
- Claude 静态 tree：`b55b43de9b11edbca063609dad0a6e19b0a5855195881f45bb6f7c866dd4d728`；Codex 静态 tree：`f7823b2b5479c1b4009385c841579ad9350dfb31468a360f2da1973df295020f`。
- 两个静态包均覆盖 71 个 Git 路径，并由包内 validator 独立验证 5.0.19。
- 静态包与两个活动 cache 都有 65 个原始字节差异，均由文本换行形态造成；文件集合无缺失／额外，Git clean-filter 身份一致，但**不满足逐字节等价**。
- 因此 T8 不得用静态包直接恢复真实 cache，必须先备份两个实际完整 cache scope。静态包只作为独立、可复算的 5.0.19 repository recovery artifact。

## T8 精确授权范围

用户已于 `2026-08-17T03:28:21+08:00` 精确批准 attempt 02。该 attempt 已在安装前 fresh identity 阶段 fail closed，以下命令块现仅保留为实际执行合同与故障证据，**不得重跑，也不得据此进入候选安装**。attempt 02 不得覆盖或复用 attempt 01 的 backup、quarantine、fixture 或 runs evidence；后续重试只使用新的 attempt、当前 schema v3 双轨合同及另行取得的外部授权。

### 1. 漂移复核与 backup-first

```powershell
$ErrorActionPreference = 'Stop'
$attempt = 'T8-20260817-host-smoke-02'
$testRoot = (Resolve-Path '.').Path
$repoRoot = (Resolve-Path '../..').Path
$userRoot = [Environment]::GetFolderPath('UserProfile')
$artifactRoot = Join-Path $testRoot 'plan-fast-host-artifacts'
$prestateRoot = Join-Path $artifactRoot "prestate/$attempt"
$runsRoot = Join-Path $artifactRoot "runs/$attempt"
if (Test-Path -LiteralPath $prestateRoot) { throw "prestate target already exists: $prestateRoot" }

$claudeInstalled = Join-Path $userRoot '.claude/plugins/installed_plugins.json'
$claudeMarketplaces = Join-Path $userRoot '.claude/plugins/known_marketplaces.json'
$claudeCacheScope = Join-Path $userRoot '.claude/plugins/cache/uxu-code-claude'
$codexConfig = Join-Path $userRoot '.codex/config.toml'
$codexCacheScope = Join-Path $userRoot '.codex/plugins/cache/uxu-code-codex'
foreach ($target in @($claudeInstalled,$claudeMarketplaces,$claudeCacheScope,$codexConfig,$codexCacheScope)) {
  if (-not (Test-Path -LiteralPath $target)) { throw "required pre-state target missing: $target" }
}

New-Item -ItemType Directory -Path (Join-Path $prestateRoot 'Claude/registration'),(Join-Path $prestateRoot 'Claude/cache'),(Join-Path $prestateRoot 'Codex/registration'),(Join-Path $prestateRoot 'Codex/cache'),$runsRoot | Out-Null
Copy-Item -LiteralPath $claudeInstalled -Destination (Join-Path $prestateRoot 'Claude/registration/installed_plugins.json')
Copy-Item -LiteralPath $claudeMarketplaces -Destination (Join-Path $prestateRoot 'Claude/registration/known_marketplaces.json')
Copy-Item -LiteralPath $claudeCacheScope -Destination (Join-Path $prestateRoot 'Claude/cache/uxu-code-claude') -Recurse
Copy-Item -LiteralPath $codexConfig -Destination (Join-Path $prestateRoot 'Codex/registration/config.toml')
Copy-Item -LiteralPath $codexCacheScope -Destination (Join-Path $prestateRoot 'Codex/cache/uxu-code-codex') -Recurse
$registrationExpected = @{
  (Join-Path $prestateRoot 'Claude/registration/installed_plugins.json') = '0d3ad42a33c6ea7e664665a5477a2b264d033765ea7bbe6818d35723bfa31805'
  (Join-Path $prestateRoot 'Claude/registration/known_marketplaces.json') = '54eb36dc335407a27544a2d397fcfb016e7fca6a51a249c41858a7f3885d187c'
  (Join-Path $prestateRoot 'Codex/registration/config.toml') = '33b8c1508cb94ca979938deb3dc31b4dbec068863eef806e261b19cb79d78f16'
}
foreach ($entry in $registrationExpected.GetEnumerator()) {
  if ((Get-FileHash -LiteralPath $entry.Key -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { throw "registration backup verification failed: $($entry.Key)" }
}

function Get-FileReceipt([string]$root) {
  $resolved = (Resolve-Path -LiteralPath $root).Path
  @(Get-ChildItem -LiteralPath $resolved -Recurse -File | Sort-Object FullName | ForEach-Object {
    [pscustomobject]@{ path=$_.FullName.Substring($resolved.Length + 1).Replace('\','/'); size=$_.Length; sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
  })
}
$backupReceipt = [ordered]@{
  schemaVersion = 1
  attempt = $attempt
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  claudeRegistration = Get-FileReceipt (Join-Path $prestateRoot 'Claude/registration')
  claudeCache = Get-FileReceipt (Join-Path $prestateRoot 'Claude/cache/uxu-code-claude')
  codexRegistration = Get-FileReceipt (Join-Path $prestateRoot 'Codex/registration')
  codexCache = Get-FileReceipt (Join-Path $prestateRoot 'Codex/cache/uxu-code-codex')
}
[IO.File]::WriteAllText((Join-Path $prestateRoot 'backup-manifest.json'), ($backupReceipt | ConvertTo-Json -Depth 6) + "`n", [Text.UTF8Encoding]::new($false))
if ((Compare-Object (Get-FileReceipt $claudeCacheScope) $backupReceipt.claudeCache -Property path,size,sha256) -or
    (Compare-Object (Get-FileReceipt $codexCacheScope) $backupReceipt.codexCache -Property path,size,sha256)) { throw 'cache backup verification failed' }

# 此验证器会调用宿主 CLI，必须位于 backup-first 检查点之后。
node ./verify-plan-fast-host-artifacts.js
if ($LASTEXITCODE -ne 0) { throw 'host artifact drifted after backup; zero installation writes' }
```

备份前只允许目标缺失、固定 SHA 和文件存在性等纯文件系统复核，不得运行任何可能物化 cache 的宿主 CLI。登记备份也必须和 T7 的三个登记 SHA 完全一致；不一致时停止，不安装任何宿主。

### 2. 安装前 fresh identity 基线

备份完成后、候选安装前，各启动一个受限新进程。Claude 的 debug log 必须给出实际 Skill 根；Codex 先用 `debug prompt-input` 保存模型可见 Skill locator，再用官方非交互 `exec --json -` 取得非零 token 行为收据。两宿主都要保存 loaded root、loaded package manifest／tree SHA-256 和观察后的 cache 收据；任一缺失即在零宿主安装状态下 `BLOCKED`。

attempt 02 证明下列 Claude `--permission-mode plan` 命令会调用宿主计划写入器，并在用户目录创建 plan 文件，违反冻结的 registration／cache 写集。该命令已退役；不得通过继续执行 Codex、安装或 smoke 来掩盖失败。

```powershell
$identityRoot = Join-Path $runsRoot 'prewrite-identity'
New-Item -ItemType Directory -Path (Join-Path $identityRoot 'Claude'),(Join-Path $identityRoot 'Codex') | Out-Null
$claudeIdentityPrompt = '/uxu-code:help 只报告 UXUCode help 标题，不执行其他操作。'
$claudeIdentity = & claude -p --no-session-persistence --no-chrome --permission-mode plan --max-budget-usd 0.60 --output-format json --debug-file (Join-Path $identityRoot 'Claude/debug.log') $claudeIdentityPrompt 2>&1
$claudeIdentityExit = $LASTEXITCODE
[IO.File]::WriteAllLines((Join-Path $identityRoot 'Claude/stdout-stderr.txt'), [string[]]$claudeIdentity, [Text.UTF8Encoding]::new($false))
if ($claudeIdentityExit -ne 0) { throw 'Claude prewrite identity failed' }

$codexIdentityPrompt = '@help 只报告 UXUCode help 标题，不执行其他操作。'
$codexPromptInput = & codex debug prompt-input $codexIdentityPrompt 2>&1
$codexPromptInputExit = $LASTEXITCODE
[IO.File]::WriteAllLines((Join-Path $identityRoot 'Codex/prompt-input.json'), [string[]]$codexPromptInput, [Text.UTF8Encoding]::new($false))
if ($codexPromptInputExit -ne 0) { throw 'Codex prompt-input identity failed' }
$codexIdentity = $codexIdentityPrompt | & codex exec --ephemeral --sandbox read-only --json -C $repoRoot - 2>&1
$codexIdentityExit = $LASTEXITCODE
[IO.File]::WriteAllLines((Join-Path $identityRoot 'Codex/stdout-stderr.jsonl'), [string[]]$codexIdentity, [Text.UTF8Encoding]::new($false))
if ($codexIdentityExit -ne 0) { throw 'Codex prewrite identity failed' }
$codexIdentityText = [string]::Join("`n", [string[]]$codexIdentity)
if ($codexIdentityText -notmatch '"input_tokens":\s*[1-9][0-9]*' -or $codexIdentityText -notmatch '"output_tokens":\s*[1-9][0-9]*') { throw 'Codex prewrite identity is INCONCLUSIVE: zero or missing tokens' }
```

`codex debug prompt-input` 在当前 CLI 属实验性诊断入口，可能物化 local-source cache；它只证明该进程构造的模型可见 locator，不替代 `exec` 行为收据。运行后立即再次执行文件收据捕获，不能继续沿用备份时的 cache 结论。

#### attempt 02 实际收据

- backup-first：`VERIFIED`；manifest SHA-256 `28a48380afb3083404b14e08b5ccb15be60a71807655da7cbaf36f848fef96fb`；Claude registration 2／cache 768，Codex registration 1／cache 71。
- 备份后 validator：`PASS`；两宿主 cache 相对 backup 均 0 delta。
- Claude fresh identity：退出码 0，USD `0.16057100000000002`，input tokens 18，output tokens 887；debug 证明实际加载 `<REPO>/Claude` 的 5.0.20 包。
- 失败：宿主计划写入器新建 `<USER>/.claude/plans/uxucode-help-elegant-origami.md`，SHA-256 `1f1365cfc5e157341e9b8819bc2e595e6d2a3f568d1f1036c9a5744bfa3b3f6b`。该文件已移入 attempt evidence，外部原路径恢复为不存在。
- fail-closed：Codex identity 0 次、候选安装 0 次、fixture 0 个、functional smoke 0 次。
- 恢复检查点：Claude／Codex registration 与 cache 均和 attempt 02 backup 逐字节相同，四类 delta 均为 0；无需覆盖复制。summary SHA-256 `b702ab4a6181056242241515fa23308fd7fa8a05d0c00d24017c2eb7791b85fe`。

### 3. attempt 03 Claude identity guard（已执行并阻塞）

attempt 03 ID 为 `T8-20260817-host-smoke-03`。用户已于 `2026-08-17T13:46:13+08:00` 精确授权完整 user-state guard 备份／恢复、两宿主 registration／cache 与模型费用；prestate、runs 与 fixture 目标在执行前均不存在。

调用前对 `<USER>/.claude` 与 `<USER>/.claude.json` 建立完整字节快照及可恢复副本；调用后仅允许 `<USER>/.claude/plugins/cache/uxu-code-claude/**` 发生可归因变化。其他任一 delta 都是 `BLOCKED`，必须从本 attempt 的完整备份恢复。identity workspace、空 MCP 配置、临时目录、debug 与输出全部位于 attempt runs evidence 内，避免把项目状态写入产品仓库或用户目录。

新命令合同固定使用 Claude 官方 CLI 的工具、权限、会话和临时目录边界：

```powershell
$nextAttempt = 'T8-20260817-host-smoke-03'
$nextRunsRoot = Join-Path $artifactRoot "runs/$nextAttempt"
$identityWorkspace = Join-Path $nextRunsRoot 'prewrite-identity/Claude/workspace'
$claudeTmpRoot = Join-Path $nextRunsRoot 'claude-tmp'
$emptyMcp = Join-Path $nextRunsRoot 'empty-mcp.json'
if (Test-Path -LiteralPath $nextRunsRoot) { throw "next attempt runs target already exists: $nextRunsRoot" }

# 外部授权后，必须先完整备份 <USER>/.claude 与 <USER>/.claude.json，
# 并生成 path/size/SHA-256 receipt；本静态合同不执行该仓库外步骤。
New-Item -ItemType Directory -Path $identityWorkspace,$claudeTmpRoot | Out-Null
[IO.File]::WriteAllText($emptyMcp, "{`"mcpServers`":{}}`n", [Text.UTF8Encoding]::new($false))
$oldSkipPromptHistory = $env:CLAUDE_CODE_SKIP_PROMPT_HISTORY
$oldClaudeTmp = $env:CLAUDE_CODE_TMPDIR
try {
  $env:CLAUDE_CODE_SKIP_PROMPT_HISTORY = '1'
  $env:CLAUDE_CODE_TMPDIR = $claudeTmpRoot
  Push-Location $identityWorkspace
  try {
    $claudeIdentityPrompt = '/uxu-code:help 只报告 UXUCode help 标题，不执行其他操作。'
    $claudeIdentity = & claude -p --no-session-persistence --no-chrome --permission-mode dontAsk --tools 'Skill' --strict-mcp-config --mcp-config $emptyMcp --max-turns 3 --max-budget-usd 0.60 --output-format json --debug-file (Join-Path $nextRunsRoot 'prewrite-identity/Claude/debug.log') $claudeIdentityPrompt 2>&1
    $claudeIdentityExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  $env:CLAUDE_CODE_SKIP_PROMPT_HISTORY = $oldSkipPromptHistory
  $env:CLAUDE_CODE_TMPDIR = $oldClaudeTmp
}
if ($claudeIdentityExit -ne 0) { throw 'Claude prewrite identity failed' }

# 立即重算完整 user-state receipt。仅允许 uxu-code-claude cache scope delta；
# 任何 plans/projects/sessions/history/config/credential 或其他 delta 都停止并从完整备份恢复。
```

该命令保留实际 `CLAUDE_CONFIG_DIR`，因为覆盖它会把 fresh process 变成隔离副本而非真实用户登记证明；但它用完整 pre/post receipt 来约束副作用。官方依据：<https://code.claude.com/docs/en/cli-usage>、<https://code.claude.com/docs/en/tools-reference>、<https://code.claude.com/docs/en/permission-modes>、<https://code.claude.com/docs/en/sessions>、<https://code.claude.com/docs/en/env-vars>。

#### attempt 03 实际收据

- backup-first：`VERIFIED`；Claude 完整 user-state archive SHA-256 `5b33e995aef074ed781c2258c16d323f7967ef271b2980f42250cd4705712524`，live／解包 1602 entries（864 files／737 directories／1 symlink）逐项一致；Codex cache 71 files／config 逐字节一致；manifest `56ab1c653860b973fd6d61d87a8133bb46ead011efb0e9dcb6a322ff0b65b942`。
- backup 后宿主制品观察：`PASS`；Claude full guard、Codex cache/config 均 0 delta。
- Claude identity：退出码 0，USD `0.044805000000000005`，input tokens 6，output tokens 159，输出 `UXUCode Help`；raw debug 证明实际加载 `<REPO>/Claude/skills` 的 5.0.20。
- guard 失败：5 个 diff records，对应 3 个逻辑 mutation——`.claude.json` 改写、`.claude/backups` rolling backup 替换、`.claude/session-env/<session-id>` 新目录。它们均不是允许的 UXUCode cache delta。
- fail-closed：Codex identity 0 次、候选安装 0 次、fixture 0 个、functional smoke 0 次。
- 恢复：post-call Claude user state 已保全在 attempt quarantine；随后从完整 archive 恢复。Claude full state、Codex config/cache 均与 attempt 03 prestate 逐项相同，delta 全为 0；checkpoint `521fd9b04e012292983384305a464ac3bc82b75a72aab30c1755599ad2e1fc29`；summary `b49534805318d3dc8d93201872d53978e534c06547fa2f20d61b8c349c58cc3d`。

### 4. attempt 04 双轨证据规划（已批准，未授权执行）

用户于 `2026-08-17T14:14:55+08:00` 批准把 attempt 03 提出的两个规划合并为同一验收边界；它们不是二选一。后续新 attempt 固定为 `T8-20260817-host-smoke-04`，但本次批准仅允许修订仓库内规格、合同、报告、validator 与 todo，不允许创建 attempt 04 prestate／runs／fixture，不允许宿主 registration／cache 操作、模型调用或费用。

- **轨道 A：真实配置根强身份。** 保留实际 `CLAUDE_CONFIG_DIR`，证明真实用户登记、`freshLoadedRoot` 与已加载 5.0.20 包。每次调用前建立即时完整检查点；仅允许 `.claude.json`、`.claude/backups/.claude.json.backup.*`、`.claude/session-env/<session-id>` 三类已实证固有 delta，以及可归因的 UXUCode cache 物化。每次调用后立即恢复三类固有 delta，并证明候选 registration／cache 与该次检查点逐字节一致；其他 delta 一律 fail closed。
- **轨道 B：隔离配置克隆功能 smoke。** 从候选安装后的实际 Claude 状态逐字节冻结 `<ATTEMPT_RUN>/claude-config-clone`，记录来源与克隆收据，再用 `CLAUDE_CONFIG_DIR` 指向该克隆完成八个 Claude 功能 smoke。所有 Claude 写入必须留在 attempt evidence，真实用户状态必须零 delta。该轨道不定义真实用户登记，也不单独证明真实用户 runtime。

执行顺序保持串行：完整 backup-first → 轨道 A 安装前身份并恢复 → 准备八个 fixture → 安装两宿主 5.0.20 候选 → 建立安装后即时检查点并运行轨道 A 候选身份、恢复与逐字节复核 → 从安装后真实状态冻结轨道 B 克隆并完成 Claude 八例 → 用当前账户及 `codex exec --json -` 串行完成 Codex 身份与八例 → 汇总证据。任何一步失败都停止后续调用，保留现场并恢复两宿主 attempt pre-state；成功时保留候选 registration／cache 与 evidence。Claude 验收必须同时通过 A 的强身份证据和 B 的功能证据；两条证据共同验收、不可互替。

attempt 04 执行前必须取得包含完整 Claude user-state 备份／必要恢复、两宿主 registration／cache 操作、精确模型次数与费用上限的新外部授权；该门已由下述独立收据满足。任何后续 attempt 不得复用 attempt 03 或 04 的授权。

#### attempt 04 实际收据（已执行、已恢复、BLOCKED）

- 用户于 `2026-08-17T14:28:34+08:00` 授权双轨操作与既有费用边界。首次 backup 脚本在 `bsdtar.exe` 不存在时、任何宿主 CLI 之前停止，只留下空目录现场；改用 Windows `tar.exe` 后完整备份验证通过。manifest SHA-256 `47490991592df74df738fc2f0ab54521ab09b5de52c17e1f1c0c1a8699101f75`；Claude 1602 entries（864 files／737 directories／1 symlink），Codex cache 71 files。
- 真实配置根安装前 identity：PASS，实际加载 `<REPO>/Claude/skills`，input/output `6/109`，USD `0.043623749999999996`；仅三类已批准固有 delta，随后逐字节恢复到该次 checkpoint。
- 八个 fixture 已使用 schema v2 与正确 `P1\n` SHA 准备；两宿主候选安装及 cache validator 通过，Claude／Codex 各 71 files 与 5.0.20 source 逐字节一致。
- 真实配置根候选 identity：PASS，实际加载 `<REPO>/Claude/skills`，input/output `6/79`，USD `0.0428675`；固有 delta 随后逐字节恢复到安装后 checkpoint。
- 功能 smoke 前的输入复核发现 `smoke-cases.json` 八个 Codex prompt 与 validator 都固定接受 `@uxu-code:plan|build`，但 SPEC 与 Codex 公共入口只允许 `@plan|@build`。继续执行不能证明受支持命令，因此功能模型调用为 0，Codex 调用为 0；Claude 合计 2 次、USD `0.08649125`。
- 两宿主已从 attempt 04 完整 backup 恢复；Claude full user state、Codex config/cache delta 均为 0，Claude 登记回到 5.0.19。可复算摘要：`./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-04/summary.json`。

#### 后续公开命令合同修订（仓库内完成）

- 用户于 `2026-08-17T15:01:55+08:00` 授权修订后续仓库任务；本修订没有宿主操作、模型调用或费用。
- focused RED 先证明当前 validator 无法接受精确 `@plan|@build`，再证明缺少 attempt 04 冻结输入；GREEN 后当前八个 Codex smoke prompt 使用精确 `@plan|@build`，identity prompt 使用 `@help`，validator 同时拒绝 `@uxu-code:`。
- attempt 04 原 `summary.json` 保持 SHA-256 `19e05160b4477b8a87ccf9030939f73cdf2543bab0f6c267e9df8d308ad29248`；原错误输入另存 `./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-04/frozen-inputs/smoke-cases.before-contract-repair.json`，SHA-256 `6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d`。当前修正输入 SHA-256 为 `987ee6e4ba1b21773bada206c8c0ded0ea11ec56583967738f190487efc09e8f`。

#### attempt 05 实际收据（已执行、已恢复、BLOCKED）

- 用户于 `2026-08-17T16:33:16+08:00` 精确授权 `T8-20260817-host-smoke-05` 的完整 backup／restore、两宿主 registration／cache 及既有 10/10 调用和 Claude USD 6.00 上限。
- 首次 backup 在任何宿主 CLI 前因 PowerShell 未给 271 字符校验路径加 extended-path 前缀而停止；失败现场已保全。修正 attempt 专用备份脚本后，manifest SHA-256 `78032246e49ab2109778300d0319982669d42798ec332c73fea3139ec3d5b79f`，Claude 1602 entries（864 files／737 directories／1 symlink）及 Codex 71 cache files 均逐项验证。
- 第 1 次 Claude CLI、也是安装前真实配置根身份调用，在产生成功 result 前返回 `claude-code:unrecognized_model`，模型为 `qwen3.7-plus[1m]`、`query_source=sdk`。成功模型调用 0，费用／token 无 result 收据；不得把缺失费用收据写成已确认 USD 0。
- fail-closed：candidate install、fixture preparation、Claude 功能 smoke 与全部 Codex 调用均为 0。两宿主随后从 attempt 05 backup 完整恢复，Claude full user state、Codex config/cache delta 均为 0，Claude 登记为 5.0.19。
- 可复算摘要：`./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-05/summary.json`。

### 5. 候选安装（attempt 02／03 均未执行；历史命令保持冻结）

```powershell
claude plugin marketplace update uxu-code-claude
if ($LASTEXITCODE -ne 0) { throw 'Claude marketplace update failed' }
claude plugin update uxu-code@uxu-code-claude --scope user
if ($LASTEXITCODE -ne 0) { throw 'Claude candidate install failed' }
codex plugin remove uxu-code@uxu-code-codex --json
if ($LASTEXITCODE -ne 0) { throw 'Codex pre-install remove failed' }
codex plugin add uxu-code@uxu-code-codex --json
if ($LASTEXITCODE -ne 0) { throw 'Codex candidate install failed' }

claude plugin list --json
codex plugin list
node "$userRoot/.claude/plugins/cache/uxu-code-claude/uxu-code/5.0.20/scripts/validate-plugin.js"
node "$userRoot/.codex/plugins/cache/uxu-code-codex/uxu-code/5.0.20/scripts/validate-plugin.js"
```

安装验证必须分别证明：登记候选、实际 cache manifest 5.0.20、两包 validator 通过；这些仍不是 fresh runtime 证据。若 fresh-loaded root 指向 repository source，只要该根和已加载包摘要精确匹配 5.0.20 candidate 即可通过，不得因“未从 cache 加载”而失败；若 loaded root 缺失或无法和 source/cache 任一实际根对应，则 `INCONCLUSIVE` 并恢复。

### 6. attempt 02 历史 fresh-session smoke 与费用上限（不得复用）

主 Agent 先在 `./.tmp/plan-fast-host-T8-20260817-host-smoke-02/` 创建隔离 Git fixture；每个 fixture 只允许写自身目录，并在每次 CLI 返回后立即封装 prompt、stdout／stderr、退出码、diff、路径清单和 SHA-256 到 `./plan-fast-host-artifacts/runs/T8-20260817-host-smoke-02/`。输入事实来自：

- `./fixtures/plan-fast/parallel.md`
- `./fixtures/plan-fast/serial.md`
- `./fixtures/plan-fast/partial.md`
- 默认普通 `@plan`／`@build`／`@build auto` 回归合同

隔离 fixture 的精确输入固定在 `./plan-fast-host-artifacts/fixture-specs.json`，SHA-256 `bec9adc4f9475e84750724c367fa9c35ea21076be850d6d2ff3f7d1b2b6d8d45`。先用下列命令创建八个宿主／场景工作区；其中 `git init`／`git commit` 仅建立 disposable fixture 基线，不写主仓库 Git 元数据，也不授权产品提交：

```powershell
$fixtureRoot = Join-Path $testRoot '.tmp/plan-fast-host-T8-20260817-host-smoke-02'
if (Test-Path -LiteralPath $fixtureRoot) { throw "fixture root already exists: $fixtureRoot" }
$fixtureData = Get-Content -LiteralPath (Join-Path $artifactRoot 'fixture-specs.json') -Raw | ConvertFrom-Json
$agentRules = "# Fixture rules`n`nLanguage: 简体中文`n`nOnly use work-products/SPEC.md, work-products/plan.md, and work-products/todo.md. Only write inside this fixture workspace. Never access network, credentials, user registration, caches, external directories, commit, push, install, publish, or deploy.`n"
foreach ($hostName in @('Claude','Codex')) {
  foreach ($scenario in @('parallel','serial','partial','default')) {
    $workspace = Join-Path $fixtureRoot "$hostName/$scenario"
    New-Item -ItemType Directory -Path (Join-Path $workspace 'work-products'),(Join-Path $workspace 'out') | Out-Null
    [IO.File]::WriteAllText((Join-Path $workspace 'AGENTS.md'), $agentRules, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $workspace 'work-products/SPEC.md'), [string]$fixtureData.specs.$scenario, [Text.UTF8Encoding]::new($false))
    if ($scenario -eq 'partial') {
      $planPath = Join-Path $workspace 'work-products/plan.md'
      [IO.File]::WriteAllText($planPath, [string]$fixtureData.partialPlan, [Text.UTF8Encoding]::new($false))
      $planSha = (Get-FileHash -LiteralPath $planPath -Algorithm SHA256).Hash.ToLowerInvariant()
      $todo = ([string]$fixtureData.partialTodoTemplate).Replace('{{PLAN_SHA}}', $planSha)
      [IO.File]::WriteAllText((Join-Path $workspace 'work-products/todo.md'), $todo, [Text.UTF8Encoding]::new($false))
      $partialBytes = [Convert]::FromBase64String([string]$fixtureData.partialCompletedOutput.bytesBase64)
      $partialPath = Join-Path $workspace ([string]$fixtureData.partialCompletedOutput.path)
      [IO.File]::WriteAllBytes($partialPath, $partialBytes)
      $partialSha = (Get-FileHash -LiteralPath $partialPath -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($partialSha -ne [string]$fixtureData.partialCompletedOutput.sha256) { throw "partial fixture byte hash mismatch: $partialSha" }
    }
    & git -C $workspace init --initial-branch=main
    & git -C $workspace config user.name 'UXUCode Fixture'
    & git -C $workspace config user.email 'fixture.invalid@example.invalid'
    & git -C $workspace add --all
    & git -C $workspace commit -m 'fixture baseline'
    if ($LASTEXITCODE -ne 0) { throw "fixture initialization failed: $workspace" }
  }
}
```

精确 prompt 固定在 `./plan-fast-host-artifacts/smoke-cases.json`，SHA-256 为 `6aedc70665945e9c72adc7fe3024603c6f63f32dcea1d068be8507871d292c6d`；T8 不得临时改写。每次调用先把对应字符串保存并哈希，再执行以下固定命令：

```powershell
$fixtureRoot = Join-Path $testRoot '.tmp/plan-fast-host-T8-20260817-host-smoke-02'
$cases = (Get-Content -LiteralPath (Join-Path $artifactRoot 'smoke-cases.json') -Raw | ConvertFrom-Json).cases
foreach ($hostName in @('Claude','Codex')) {
  foreach ($case in $cases) {
    $workspace = Join-Path $fixtureRoot "$hostName/$($case.workspace)"
    $caseRoot = Join-Path $runsRoot "$hostName/$($case.id)"
    if (-not (Test-Path -LiteralPath (Join-Path $workspace '.git'))) { throw "fixture Git workspace missing: $workspace" }
    New-Item -ItemType Directory -Path $caseRoot | Out-Null
    $prompt = if ($hostName -eq 'Claude') { $case.claudePrompt } else { $case.codexPrompt }
    $promptPath = Join-Path $caseRoot 'prompt.txt'
    [IO.File]::WriteAllText($promptPath, $prompt + "`n", [Text.UTF8Encoding]::new($false))
    (Get-FileHash -LiteralPath $promptPath -Algorithm SHA256).Hash.ToLowerInvariant() | Set-Content -LiteralPath (Join-Path $caseRoot 'prompt.sha256') -Encoding utf8NoBOM
    if ($hostName -eq 'Claude') {
      Push-Location $workspace
      try { $output = & claude -p --no-session-persistence --no-chrome --permission-mode acceptEdits --max-budget-usd 0.60 --output-format json $prompt 2>&1; $exitCode = $LASTEXITCODE }
      finally { Pop-Location }
    } else {
      $output = Get-Content -LiteralPath $promptPath -Raw -Encoding utf8 | & codex exec --ephemeral --sandbox workspace-write --json -C $workspace - 2>&1
      $exitCode = $LASTEXITCODE
    }
    [IO.File]::WriteAllLines((Join-Path $caseRoot 'stdout-stderr.txt'), [string[]]$output, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $caseRoot 'exit-code.txt'), "$exitCode`n", [Text.UTF8Encoding]::new($false))
    $diff = & git -C $workspace diff --binary
    [IO.File]::WriteAllLines((Join-Path $caseRoot 'diff.patch'), [string[]]$diff, [Text.UTF8Encoding]::new($false))
    $workspaceReceipt = Get-FileReceipt $workspace | Where-Object { -not $_.path.StartsWith('.git/') }
    [IO.File]::WriteAllText((Join-Path $caseRoot 'workspace-files.json'), ($workspaceReceipt | ConvertTo-Json -Depth 4) + "`n", [Text.UTF8Encoding]::new($false))
    if ($exitCode -ne 0) { throw "$hostName $($case.id) failed with exit code $exitCode" }
    if ($hostName -eq 'Codex') {
      $joinedOutput = [string]::Join("`n", [string[]]$output)
      if ($joinedOutput -notmatch '"input_tokens":\s*[1-9][0-9]*' -or $joinedOutput -notmatch '"output_tokens":\s*[1-9][0-9]*') { throw "Codex $($case.id) returned zero or missing token evidence" }
    }
  }
}
```

精确运行上限：每宿主最多 10 个 fresh session（parallel plan/build、serial plan/build、partial reentry build、默认 plan/build/build-auto、安装身份、失败后的恢复身份）。Claude 每次硬上限 USD 0.60，总硬上限 USD 6.00；Codex CLI 没有美元硬上限参数，只批准最多 10 次现有账户配额调用，不批准另行购买或切换 pay-as-you-go 凭据。任一命令要求扩大次数、费用、权限、网络目标或写集时停止并重新授权。

验收必须证明：parallel 宽度 2 且写集／资源不相交；serial 上限 1；partial 不重跑 completed 且 barrier 前不解锁下游；默认 `@plan`、`@build`、`@build auto` 行为无回归。当前固定 fixture 的详细 prompt 会作为每次 run evidence 的输入文件先写入、再哈希；主 Agent不得以未保存的临时文本启动模型。

### 7. attempt 02 历史失败恢复合同（不得复用）

静态 5.0.19 包不是 byte-identical 恢复源。恢复只使用步骤 1 的真实备份；当前 cache 先移动到 runs quarantine，保留失败现场，不直接删除。

```powershell
$claudeQuarantine = Join-Path $runsRoot 'restore-quarantine/Claude/uxu-code-claude'
$codexQuarantine = Join-Path $runsRoot 'restore-quarantine/Codex/uxu-code-codex'
New-Item -ItemType Directory -Path (Split-Path $claudeQuarantine -Parent),(Split-Path $codexQuarantine -Parent) | Out-Null
if (Test-Path -LiteralPath $claudeQuarantine) { throw 'Claude quarantine target already exists' }
if (Test-Path -LiteralPath $codexQuarantine) { throw 'Codex quarantine target already exists' }
if ((Resolve-Path -LiteralPath (Split-Path $claudeCacheScope -Parent)).Path -ne (Resolve-Path -LiteralPath (Join-Path $userRoot '.claude/plugins/cache')).Path) { throw 'Claude restore boundary mismatch' }
if ((Resolve-Path -LiteralPath (Split-Path $codexCacheScope -Parent)).Path -ne (Resolve-Path -LiteralPath (Join-Path $userRoot '.codex/plugins/cache')).Path) { throw 'Codex restore boundary mismatch' }

Move-Item -LiteralPath $claudeCacheScope -Destination $claudeQuarantine
Move-Item -LiteralPath $codexCacheScope -Destination $codexQuarantine
Copy-Item -LiteralPath (Join-Path $prestateRoot 'Claude/cache/uxu-code-claude') -Destination (Split-Path $claudeCacheScope -Parent) -Recurse
Copy-Item -LiteralPath (Join-Path $prestateRoot 'Codex/cache/uxu-code-codex') -Destination (Split-Path $codexCacheScope -Parent) -Recurse
Copy-Item -LiteralPath (Join-Path $prestateRoot 'Claude/registration/installed_plugins.json') -Destination $claudeInstalled -Force
Copy-Item -LiteralPath (Join-Path $prestateRoot 'Claude/registration/known_marketplaces.json') -Destination $claudeMarketplaces -Force
Copy-Item -LiteralPath (Join-Path $prestateRoot 'Codex/registration/config.toml') -Destination $codexConfig -Force

if ((Compare-Object (Get-FileReceipt $claudeCacheScope) $backupReceipt.claudeCache -Property path,size,sha256) -or
    (Compare-Object (Get-FileReceipt $codexCacheScope) $backupReceipt.codexCache -Property path,size,sha256)) { throw 'restored cache differs from actual pre-state backup' }
node ./verify-plan-fast-host-artifacts.js
claude plugin list --json
codex plugin list
```

恢复后先记录登记／cache 与 backup 逐字节相同的检查点，再各运行一次受限 fresh identity 观察，证明 `freshLoadedRoot` 与 attempt 02 安装前基线一致，而不是机械要求 cache 版本为 5.0.19。观察后重新捕获最终 cache；local source 导致的可归因物化必须单列，不得冒充逐字节检查点仍是最终状态。Codex `exec` 零 token、loaded root 缺失或 loaded package 无法重算时保留 backup、quarantine、fixture 与 runs evidence，返回 `BLOCKED`，不清理。

## 当前结论

attempt 01–05 的 fresh-host 历史结果仍未达到旧 schema v3 双轨规划验收，且 attempt 05 仍保留 `claude-code:unrecognized_model` 事实；这些结果没有被改写。当前用户以无模型证据审计取代旧验收后，T8 为 `PASS`。该结论不证明当前宿主安装或 fresh runtime；不可变 `work-products/plan.md` 未改写，没有 commit、push、发布、部署或生产验证。
