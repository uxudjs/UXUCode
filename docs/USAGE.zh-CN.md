# UXUCode 使用指南

UXUCode v3.0.0

<!-- section:1 -->
## 1. UXUCode 是什么

UXUCode 是面向 Claude Code 与 Codex 的统一软件工程工作流系统。它整合需求澄清、规格、计划、增量实现、测试、审查、最小正确实现、简洁技术表达、上下文压缩与发布门禁。两端内部独立，命令名称、参数、行为和输出语义一致。

<!-- section:2 -->
## 2. 项目特性

| 特性 | 说明 |
|---|---|
| Complete engineering flow | 覆盖需求、规格、规划、实现、测试、审查、简化、迁移和发布 |
| Specification driven | 非简单任务先建立可验证规格 |
| Incremental implementation | 按纵向切片完成，每个任务独立验证 |
| Minimal correct implementation | 优先复用现有代码、标准库和平台能力 |
| Verification first | 完成必须提供测试、构建或运行证据 |
| Multidimensional review | 检查正确性、可读性、架构、安全、性能和复杂度 |
| Concise communication | 删除重复内容，同时保留必要技术信息 |
| Release gate | 输出 Blocker、Recommended、Acknowledged 和 GO／NO-GO |
| Context compression | 精确保留代码、命令、路径、链接与结构 |
| Consistent dual CLI | 两端适配独立，命令与工作流语义一致 |

<!-- section:3 -->
## 3. 安装与更新

```bash
git clone https://github.com/uxudjs/UXUCode.git
cd UXUCode
```

Claude Code 临时加载：`claude --plugin-dir ./Claude`。持久安装时在 Claude Code 中执行 `/plugin marketplace add ./Claude` 和 `/plugin install uxu-code@uxu-code-claude`。

Codex 执行 `codex plugin marketplace add ./Codex` 和 `codex plugin add uxu-code@uxu-code-codex`。更新时执行 `git pull` 并刷新宿主插件。两端可独立安装，不使用符号链接或跨目录运行时引用。

<!-- section:4 -->
## 4. Claude Code 与 Codex 命令格式

| 宿主 | 正式格式 | 示例 |
|---|---|---|
| Claude Code | `/uxu-code:<command> [arguments]` | `/uxu-code:spec 增加登录限流` |
| Codex | `@<command> [arguments]` | `@spec 增加登录限流` |

两端只在宿主前缀上不同。不要把普通提示文本当作正式命令入口。

<!-- section:5 -->
## 5. 推荐开发流程

新功能：`spec → plan → build → review → simplify → ship`。稳定且已批准的计划可使用 `build auto`。故障修复：`debug → review → ship`。

`build` 每次只执行一个任务；`build auto` 只有在规格稳定、验收标准明确、自动化测试可靠且用户明确授权时才连续执行。

<!-- section:6 -->
## 6. 核心命令详解

| 命令 | 适合使用 | 不适合使用 | 结果 |
|---|---|---|---|
| `spec` | 新功能、跨模块变更、验收标准不清 | 一行修复或已有已批准规格 | 生成并确认 SPEC.md |
| `plan` | 规格已批准且任务存在依赖 | 简单单点修改 | 生成 tasks/plan.md 与 tasks/todo.md，不改业务代码 |
| `build` | 执行已批准计划的下一项 | 没有稳定规格或计划 | 实现一个纵向切片并验证后停止 |
| `build auto` | 稳定计划、可靠测试、已授权连续执行 | 高风险迁移、需求变化或关键测试缺失 | 逐项执行计划，遇到阻断立即停止 |
| `debug` | 已有错误、日志或异常行为 | 没有证据的猜测性优化 | 输出复现、根因、最小修复与回归验证 |
| `test` | 设计、补齐或执行测试 | 用未执行的检查声称通过 | 输出命令、通过、失败、跳过与未验证项 |
| `review` | 实现完成、PR 前或重构后 | 代替实际测试 | 按 Critical／Important／Suggestion 输出六维发现 |
| `simplify` | 行为已验证且测试通过 | 行为未确认或测试失败 | 在行为不变下逐步降低复杂度 |
| `ship` | 合并、打版本或发布前 | 开发刚开始、只想提交或仍有大量 TODO | 输出 GO／NO-GO、发布步骤与回滚计划 |

ship 用于功能完成后的发布或合并就绪检查。它不是普通提交命令，也不会直接部署生产环境。它汇总代码质量、安全、测试和回滚准备情况，并输出 GO 或 NO-GO。认证、支付、权限、数据迁移、生产配置、安全修复和公开 API 兼容性不得跳过完整门禁。

<!-- section:7 -->
## 7. 辅助命令

| 命令 | 用途 |
|---|---|
| `help` | 显示命令与当前语言指南路径 |
| `mode <level>` | 同时设置实现与输出策略 |
| `audit` | 只读扫描可删除、复用或替换的复杂度 |
| `debt` | 汇总带上限与升级条件的 uxucode-debt: 标记 |
| `commit` | 根据已验证 Diff 生成提交信息，不自动提交或推送 |
| `compress <file>` | 备份并安全压缩说明性文件；验证失败不覆盖原文件 |
| `stats` | 显示可复现、已验证的指标 |
| `status` | 显示模式、任务、测试和门禁状态 |

<!-- section:8 -->
## 8. 模式设置

| 模式 | 实现策略 | 输出策略 | 场景 |
|---|---|---|---|
| `standard` | 默认最小正确实现 | 完整句子，删除明显冗余 | 日常任务，默认 |
| `lite` | 提示简单方案，不改指定结构 | 保留更多解释 | 新仓库、教学、讨论 |
| `full` | 强制复用、YAGNI、最小维护改动 | 结论优先、紧凑 | 熟悉项目后的开发 |
| `ultra` | 激进删除无价值复杂度 | 极短输出 | 明确的低风险小修复 |
| `off` | 关闭全局简化策略 | 宿主普通输出 | 排查模式影响 |

优先级固定为：正确性与安全 > 用户明确要求 > 工作流和验证证据 > 最小正确实现 > 输出简洁度。安全、不可逆删除、迁移、认证、支付、权限、部署、架构和回滚会自动恢复完整表达。

<!-- section:9 -->
## 9. 常见任务示例

```text
# Claude Code：新功能
/uxu-code:spec 增加登录限流
/uxu-code:plan
/uxu-code:build
/uxu-code:review
/uxu-code:simplify
/uxu-code:ship

# Codex：Bug 修复
@debug 用户登录后偶发跳回登录页
@review
@ship
```

压缩上下文文件：Claude Code 使用 `/uxu-code:compress CLAUDE.md`；Codex 使用 `@compress AGENTS.md`。

<!-- section:10 -->
## 10. 配置与状态

配置文件位于 Windows 的 `%APPDATA%\uxucode\config.json` 或 macOS/Linux 的 `~/.config/uxucode/config.json`。项目状态保存在 `.uxucode-state.json`；状态栏格式为 `[UXUCODE:STANDARD] task 3/8 · tests ✓`。

```json
{
  "mode": "standard",
  "language": "auto",
  "compactReview": true,
  "contextCompression": false,
  "mcpDescriptionCompression": false
}
```

<!-- section:11 -->
## 11. 常见问题

**两端能共用同一安装目录吗？ 不需要。安装对应宿主目录即可，两端包完整且独立。?**两端能共用同一安装目录吗？ 不需要。安装对应宿主目录即可，两端包完整且独立。

**为什么 plan 不直接编码？ 它只把已批准规格拆成可验证任务。?**为什么 plan 不直接编码？ 它只把已批准规格拆成可验证任务。

**什么时候使用 ship？ 功能完成并准备合并、打版本或发布时；存在 Blocker 或关键证据缺失时必须 NO-GO。?**什么时候使用 ship？ 功能完成并准备合并、打版本或发布时；存在 Blocker 或关键证据缺失时必须 NO-GO。

**ultra 会省略安全风险吗？ 不会，正确性、安全、证据和明确要求始终高于简洁度。?**ultra 会省略安全风险吗？ 不会，正确性、安全、证据和明确要求始终高于简洁度。
