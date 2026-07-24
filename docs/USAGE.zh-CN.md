# UXUCode 使用指南

## 1. UXUCode 是什么

UXUCode 是面向 Claude Code 与 Codex 的统一软件工程工作流系统，将需求澄清、规格、计划、增量实现、测试、审查、安全、性能、最小正确实现、简洁表达、上下文压缩和发布门禁整合为一致体验。两个运行包独立维护，但命令名称、参数和结果语义一致。

## 2. 项目特性

| 特性 | 说明 |
|---|---|
| 完整工程流程 | 覆盖需求、规格、规划、实现、测试、审查、简化、迁移和发布 |
| 规格驱动 | 非简单任务先建立可验证规格 |
| 增量实现 | 按纵向切片逐项完成并独立验证 |
| 最小正确实现 | 优先复用、标准库和平台原生能力 |
| 验证优先 | 完成必须提供测试、构建或运行证据 |
| 多维审查 | 检查正确性、可读性、架构、安全、性能和复杂度 |
| 简洁技术表达 | 删除冗余但保留技术精度与风险信息 |
| 发布门禁 | 输出 Blocker、Recommended、Acknowledged 和 GO／NO-GO |
| 上下文压缩 | 精确保留代码、命令、路径、链接和结构 |
| 双 CLI 一致体验 | 内部独立适配，外部工作流语义一致 |

## 3. 安装与更新

先克隆仓库并进入目录：

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Claude Code：

```text
claude --plugin-dir ./Claude
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
```

Codex：

```text
codex plugin marketplace add ./Codex
codex plugin add uxu-code@uxu-code-codex
```

OpenClaw：

```text
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard --dry-run
node OpenClaw/scripts/install-profile.js --workspace "<请替换为OpenClaw工作区绝对路径>" --mode standard
```

执行前必须把引号内的占位文字替换为实际 OpenClaw workspace 的绝对路径。

更新时先在仓库中执行 `git pull`。Claude Code 和 Codex 按宿主插件流程刷新；OpenClaw 针对每个 workspace 先运行 `--dry-run`，再用已选模式重跑安装器。不要在安装后删除本地 Marketplace 或 OpenClaw Gateway 所引用的克隆目录。

## 4. Claude Code 与 Codex 命令格式

Claude Code 使用：

```text
/uxu-code:<command> [arguments]
```

Codex 使用：

```text
@<command> [arguments]
```

两端仅前缀不同。例如：

```text
/uxu-code:spec 为登录接口增加限流
/uxu-code:mode full
@spec 为登录接口增加限流
@mode full
```

## 5. 推荐开发流程

非简单功能建议：

```text
spec → plan → build → review → simplify → ship
```

小型明确修复可使用 `debug → review → ship`。只有规格和计划稳定、测试可靠且用户明确允许连续执行时，才使用 `build auto`。

## 6. 核心命令详解

### 6.1 spec

```text
/uxu-code:spec <需求>
@spec <需求>
```

用于新功能、跨模块变更、验收标准不明确或需要先确定接口与风险时。明显的一行修复或已有已批准 `SPEC.md` 时通常不需要。输出目标、范围、非目标、约束、接口、测试策略、风险、验收标准和 `SPEC.md`。

### 6.2 plan

```text
/uxu-code:plan
@plan
```

在 `SPEC.md` 已确认且工作不能由一个小改动完成时使用。它只读分析，不修改业务代码；识别依赖、按纵向切片拆分任务，并生成包含验收与验证步骤的 `tasks/plan.md` 和 `tasks/todo.md`。

### 6.3 build

```text
/uxu-code:build
@build
```

在已有批准计划时执行下一个待办。一次完成一个最小纵向切片，然后测试、验证、更新任务状态，并在获得授权时提交；完成后停止报告，方便检查和回滚。

### 6.4 build auto

```text
/uxu-code:build auto
@build auto
```

仅在规格和计划稳定、验收标准明确、自动化测试可靠、用户允许连续执行且任务可独立回滚时使用。需求变化、缺少关键测试、高风险迁移或外部行为未验证时不得使用；遇到歧义或验证失败必须停止。

### 6.5 debug

```text
/uxu-code:debug <问题或错误>
@debug <问题或错误>
```

用于已有错误、日志或异常行为的故障。先复现并定位根因，再加入回归测试、实施最小修复并验证。输出复现条件、根因、修复、测试证据和未解决的不确定性。

### 6.6 review

```text
/uxu-code:review
@review
```

在功能或修复完成、准备合并、模型生成代码需要复核或重构后使用。审查正确性、可读性、架构、安全、性能与复杂度，并按 Critical、Important、Suggestion 输出精确 `file:line`、影响、证据和修复建议。

### 6.7 simplify

```text
/uxu-code:simplify
@simplify
```

仅在行为正确且测试通过后使用。逐次移除深层嵌套、重复、无必要抽象或依赖，并在每次修改后验证。测试失败、需求变化或只是为了减少行数时不应使用；不得牺牲安全、可访问性、数据完整性或清晰度。

### 6.8 ship

```text
/uxu-code:ship
@ship
```

`ship` 用于功能完成后的发布或合并就绪检查。它不是普通提交命令，也不会直接部署生产环境。它汇总代码质量、安全、测试、兼容性、运行准备与回滚情况，去重后分类为 Blocker、Recommended、Acknowledged，并输出 GO 或 NO-GO。

认证、支付、权限、数据迁移、生产配置、安全修复和对外 API 兼容性不得走快速路径。存在阻断项或缺少必要证据时必须为 NO-GO。

## 7. 辅助命令

| 命令 | Claude Code | Codex | 结果 |
|---|---|---|---|
| 帮助 | `/uxu-code:help` | `@help` | 命令、流程和指南路径 |
| 测试 | `/uxu-code:test` | `@test` | 测试设计、执行与证据 |
| 审计 | `/uxu-code:audit` | `@audit` | 可删除、复用或替换的复杂度 |
| 技术债 | `/uxu-code:debt` | `@debt` | `uxucode-debt:` 项及升级条件 |
| 提交信息 | `/uxu-code:commit` | `@commit` | 基于真实 Diff 的提交信息 |
| 压缩 | `/uxu-code:compress <file>` | `@compress <file>` | 可恢复、受保护的上下文压缩 |
| 指标 | `/uxu-code:stats` | `@stats` | 可验证的范围、来源和指标 |
| 状态 | `/uxu-code:status` | `@status` | 模式、任务、测试和门禁状态 |

`compress` 修改前必须建立可恢复备份；不得改变代码块、行内代码、URL、命令、路径、环境变量、API、错误、版本和数字。Markdown 或受保护内容验证失败时保留原文件。

## 8. 模式设置

```text
/uxu-code:mode standard
@mode standard
```

| 模式 | 实现与输出策略 | 适用场景 |
|---|---|---|
| `standard` | 最小正确实现，完整而简洁 | 日常默认 |
| `lite` | 保留更多教学信息，只提示更简单方案 | 新仓库、教学、讨论 |
| `full` | 强制复用、YAGNI、最小可维护改动，结论优先 | 熟悉项目后的常规开发 |
| `ultra` | 激进删除无价值复杂度，极短输出 | 明确的小修复与状态更新 |
| `off` | 关闭 UXUCode 全局简化和压缩策略 | 排查策略影响或特殊任务 |

优先级固定为：正确性与安全 > 用户明确要求 > 工作流与验证证据 > 最小正确实现 > 输出简洁度。安全、不可逆删除、迁移、认证、支付、权限、部署、架构和回滚场景自动恢复完整表达。

## 9. 常见任务示例

新功能：

```text
/uxu-code:spec 增加登录限流
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship
```

同一流程在 Codex 中使用 `@spec`、`@plan`、`@build`、`@review`、`@simplify`、`@ship`。Bug 修复使用 `debug → review → ship`。

## 10. 配置与状态

以下是 Claude Code 与 Codex 的默认配置：

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

Claude Code 与 Codex 的共享配置路径为 Windows `%APPDATA%\uxucode\config.json`，macOS/Linux `~/.config/uxucode/config.json`。这两个宿主的项目状态写入 `.uxucode-state.json`，状态栏格式为 `[UXUCODE:STANDARD] task 3/8 · tests ✓`。OpenClaw 不使用这些共享配置或状态文件。

## 11. 常见问题

**为什么两端前缀不同？** 宿主原生入口不同，但命令、参数和行为一致。

**`ship` 会提交或部署吗？** 不会。它只给出发布或合并门禁结论、步骤与回滚计划。

**何时使用 `build auto`？** 仅在稳定计划、可靠测试、明确授权和可回滚任务同时成立时。

**压缩失败怎么办？** 保留原文件与备份，报告失败，不覆盖原内容。

## 12. OpenClaw workspace 策略

OpenClaw 是通用个人助理与协调运行时，不是第三个代码 CLI。MVP 只把紧凑策略写入指定 workspace 的 `AGENTS.md`；它没有插件、Hook、技能、遥测、会话读取或共享全局配置，也不参与 Claude/Codex 的 16 个命令与技能一致性校验。完整边界见 `OpenClaw/README.md`。

### 12.1 模式与边界

OpenClaw 保留 `standard`、`lite`、`full`、`ultra`、`off` 五个概念模式，但模式按 workspace 写入 managed block。`standard` 是发布默认值；`ultra` 仅是简单低风险任务的明确选择。所有模式在破坏性操作、认证、隐私、支付、消息发送、部署、迁移、回滚与安全场景恢复完整细节。

项目提供 `OpenClaw/templates/SOUL.md` 和 `OpenClaw/templates/IDENTITY.md` 作为可选起始模板。`SOUL.md` 定义 persona、语气与边界；`IDENTITY.md` 定义名称、角色、风格、emoji 和 avatar。审阅并定制后再复制到 workspace 根目录；安装器只管理 `AGENTS.md`，不会创建或覆盖这两个文件。

### 12.2 更新、移除与回滚

更新仓库后，针对每个 workspace 先运行 `--dry-run`，再用该 workspace 已选模式重跑安装器。移除时先复制 `AGENTS.md`，然后只删除成对 managed markers 及其中内容。更新回滚时，核对并恢复同一 workspace 的 `AGENTS.md.uxucode-backup-*`。遇到缺失、重复、嵌套或乱序标记时停止，不要覆盖整个文件。

### 12.3 原生运行时控制

继续使用 OpenClaw 原生 `/usage`、`/compact`、`/verbose`、`/reasoning`、`/think` 与 `/model` 控制。UXUCode 不复制这些功能，也不提供 MVP 运行时模式命令。

### 12.4 校验与限制

```text
node OpenClaw/scripts/validate-profile.js
node --test OpenClaw/tests/validate-profile.test.js OpenClaw/tests/evaluation.test.js
node OpenClaw/evaluation/score-results.js <results.json>
```

完整流程见 `OpenClaw/evaluation/README.md`。评测包含 52 个脱敏用例，必须在固定 OpenClaw 版本、provider、model、thinking level、工具和运行时设置下，对无配置基线 workspace 与启用配置的 workspace 逐例配对。发布门禁要求输出 token 中位数至少降低 35%、低风险正确率至少 95%、未经请求的外部变更为零、必要风险信息遗漏为零。

静态校验和合成结果只能证明评分逻辑有效，不能证明真实 token 节省。只保留固定环境元数据和脱敏汇总证据；不得提交凭据、原始私人对话、真实个人数据或 OpenClaw 状态目录。
