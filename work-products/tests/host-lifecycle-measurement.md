# UXUCode 真实宿主生命周期测量

## 当前候选：5.0.19 回滚恢复与多行 fresh-host 门禁

日期：2026-08-16

结论：在精确命令、用户级目标、影响、验证和恢复路径列明并取得用户明确授权后，任务 22 已完成。重建的 Codex 5.0.18 回滚候选可由 CLI 真实登记和安装，随后原 5.0.19 登记已恢复；Claude Code 与 Codex 的全新 CLI 进程均证明精确 5.0.19 身份和真实 LF 多行命令路径。

### A. Codex 回滚与恢复

- 回滚 ZIP SHA-256 为 `e0822ce318a228b2637d38830da0c6bdc1a5a6ce56ab853d487ab9d654cfd7f9`；它从已验证 5.0.19 包重建，只将两个版本事实表面改为 5.0.18，不声称是已删除历史 cache 的字节恢复件。
- `uxu-code-codex-rollback` marketplace 登记成功，`uxu-code@uxu-code-codex-rollback` 以 installed、enabled、5.0.18 出现。
- `<USER>/.codex/plugins/cache/uxu-code-codex-rollback/uxu-code/5.0.18` 与候选内包均为 71 文件，路径差异 0、逐文件 SHA-256 差异 0。
- 回滚插件移除后，原 `uxu-code@uxu-code-codex` 成功恢复为 installed、enabled、5.0.19；仓库 `Codex/` 与 `<USER>/.codex/plugins/cache/uxu-code-codex/uxu-code/5.0.19` 均为 71 文件，路径差异 0、逐文件 SHA-256 差异 0。
- 临时 marketplace 已移除。Codex CLI 保留隔离的 rollback cache 目录；未执行未声明的手动删除，也未提交、推送、发布或部署。

### B. Claude Code 5.0.19 多行 fresh probe

全新、无会话持久化的 CLI 进程使用真实 LF 输入：

```text
/uxu-code:audit echo routed arguments
SECOND_LINE_SENTINEL_5_0_19
```

- `init.plugins` 明确列出 `uxu-code` 版本 5.0.19；SessionStart 与 UserPromptSubmit Hook 均成功。
- 路由输出保留 `echo routed arguments\nSECOND_LINE_SENTINEL_5_0_19`，第二行没有丢失或折叠。
- 使用故意不存在的模型使生成在路由证据完成后终止；API 400 和进程 exit 1 是预期探针终止条件，不是 UXUCode 失败。
- CLI 报告 `total_cost_usd: 0`，输入、cache create/read 与输出 token 均为 0。

### C. Codex 5.0.19 多行 fresh smoke

全新、只读、ephemeral CLI 进程使用真实 LF 输入：

```text
@audit echo routed arguments
Return exactly SECOND_LINE_SENTINEL_5_0_19 and do not use tools.
```

- 进程从 `<USER>/.codex/plugins/cache/uxu-code-codex/uxu-code/5.0.19/skills/audit/SKILL.md` 读取精确安装候选；这一次只读读取是公开 Skill 解析证据，不是仓库写入。
- 最终回答精确为 `SECOND_LINE_SENTINEL_5_0_19`，exit 0。
- CLI 用量为 input 54331、cached input 36352、output 326、reasoning output 223；金额为 `unavailable`，不作估算。

### D. 证据边界

- 仓库静态测试、source/cache 身份、用户级注册和 fresh CLI 行为分别记录，互不替代。
- Claude 探针证明插件身份与 Hook 多行路由，不声称无效模型完成了业务回答；Codex smoke 证明精确 Skill 加载和最终哨兵，不声称暴露了原始 Hook event stream。
- 重建 5.0.18 制品只证明真实可安装性、cache 身份和 5.0.19 恢复路径，不证明它与已删除的历史 5.0.18 cache 字节一致。

---

## 历史证据：5.0.17 Codex `UserPromptSubmit` 阻断调试补测

日期：2026-08-16

结论：`5.0.12` 报告中的 Codex 严格 LF／CRLF `mode`／`clean` 失败在当前精确 `5.0.17` 候选上不可复现。四个严格拒绝样例均由真实 `codex exec` 在模型请求前结束，退出码为 0，全部 token 为 0；普通提示对照会继续到服务端并以 HTTP 400 拒绝不存在的模型。当前证据支持“`5.0.17` router 阻断正确”，不支持继续修改产品 router。

## A. 身份、契约与边界

- Codex CLI 为 `0.147.0`；`codex plugin list` 报告 `uxu-code@uxu-code-codex` installed、enabled、`5.0.17`。
- `5.0.17` source 与 cache 各 71 个文件，逐文件 SHA-256 比较为 0 差异。
- 用户配置中的三个 UXUCode Hook 均为 `enabled = true` 且有持久化 `trusted_hash`；本次命令未使用 `--dangerously-bypass-hook-trust`。
- OpenAI 当前 Hook 契约明确规定，`UserPromptSubmit` 可用顶层 `{"decision":"block","reason":"..."}` 或退出码 2 阻断提示：<https://developers.openai.com/codex/hooks>。
- OpenAI Codex 上游仍有 Windows `codex exec` 跳过已信任 `UserPromptSubmit` Hook 的公开缺陷报告；这使 `5.0.12` 的非交互 harness 成为可信混杂因素，但不能倒推当时唯一根因：<https://github.com/openai/codex/issues/32491>。
- 当前已打开的 Codex Desktop 任务仍在启动上下文中列出 `5.0.15` Skill 路径；本节不把磁盘安装成功冒充当前任务已重载 `5.0.17`，也不证明 SessionStart、合法命令注入、`status`、子 Agent 或 Claude Code 行为。

## B. 零 token 宿主对照

命令基线为：

```text
codex exec --ephemeral -s read-only -C <REPO> --json -m uxucode-hook-probe-invalid-model <PROMPT>
```

不存在的模型用于建立零费用对照：若 Hook 未阻断，普通提示会到达服务端模型校验并得到 HTTP 400；若严格提示被 Hook 阻断，则不会发起模型生成。

| 场景 | 分隔 codepoint | 退出码 | 宿主结果 | token | 配置 |
|---|---:|---:|---|---:|---|
| `mode` + LF | `10` | 0 | `turn.completed`，无服务端 400 | 0 | SHA-256 不变 |
| `mode` + CRLF | `13,10` | 0 | `turn.completed`，无服务端 400 | 0 | SHA-256 不变 |
| `clean` + LF | `10` | 0 | `turn.completed`，无服务端 400 | 0 | SHA-256 不变 |
| `clean` + CRLF | `13,10` | 0 | `turn.completed`，无服务端 400 | 0 | SHA-256 不变 |
| 普通提示对照 | 无 | 1 | `turn.failed`，HTTP 400：不存在的模型不受支持 | 0 | SHA-256 不变 |

四个严格样例前后共享配置 SHA-256 均为 `b5c465f7c1a364aaa8bbb4b69edf352940b28ff47b7e0e827e4b63e31f11d10c`；Git 状态未变化。目标 Node 回归中 Codex unknown、punctuation、`mode`、`clean` 及双宿主 block 共 5 项通过、0 失败。

## C. 根因判定与后续门禁

`5.0.12` 测量没有 Codex 原始 Hook 事件，只从模型后续工具行为判断“严格解析失败”；该证据不能区分 router 输出错误、Hook 未加载、Hook 未信任或 `codex exec` 未分发 Hook。当前官方契约、source/cache、持久化 trust、目标回归与真实零 token 对照共同排除了 `5.0.17` router 输出／解析缺陷。

因此本次不修改产品代码、不新增兼容层、不更新版本。后续 `5.0.17` release gate 仍需在新建 Codex Desktop 任务中确认精确 Skill／SessionStart 加载，并分别验证合法命令、`status` 与需要的其他宿主场景；本节只把 Codex 严格阻断从未决项改为已通过。

---

# 历史证据：UXUCode 5.0.12 真实宿主生命周期测量

日期：2026-08-16

结论：任务 17 已完成实际测量，但 `5.0.12` fresh-host smoke 未通过；任务 18 选择分支 A。BUG-009 继续分类为“已测量、未证实净收益”，不生成 trial，不修改产品 router。Claude 用户级登记已按预先声明的失败回滚恢复到 `5.0.11`；Codex 的 `5.0.12` source/cache 未发生本轮安装写入。

## A. 证据边界与授权

本节取代下方 `5.0.11` 历史结论。仓库事实源为 [SPEC](../SPEC.md) 与 [plan](../plan.md)，产品引用均从本报告最终位置使用相对路径：

- [Claude manifest](../../Claude/.claude-plugin/plugin.json)、[Claude router](../../Claude/hooks/uxu-prompt-router.js)、[Claude status Skill](../../Claude/skills/status/SKILL.md)；
- [Codex manifest](../../Codex/.codex-plugin/plugin.json)、[Codex router](../../Codex/hooks/uxu-prompt-router.js)、[Codex status Skill](../../Codex/skills/status/SKILL.md)。

仓库源码、安装缓存、fresh CLI 可见事件和模型最终行为互不替代。Codex CLI 未暴露原始 Hook 事件；这些字段保持 `unavailable`，不从最终回答反推。

用户在命令、目标、影响、验证、回滚和 USD 1.80 总上限全部列明后，明确批准任务 17。实际执行：

1. 将 `<USER>/.claude/plugins/installed_plugins.json` 与 `known_marketplaces.json` 复制为带 `.uxucode-5.0.12-task17-backup` 后缀的备份；复制前后 SHA-256 一致。
2. 执行 `claude plugin marketplace update uxu-code-claude` 与 `claude plugin update uxu-code@uxu-code-claude --scope user`。
3. Claude fresh 基线为 `claude -p --no-session-persistence --permission-mode plan --output-format stream-json --include-hook-events --verbose --max-budget-usd 0.20 '<PROMPT>'`。
4. Codex fresh 基线为 `codex exec --ephemeral -s read-only -C '<REPO>' --json '<PROMPT>'`。
5. 测量后因 smoke 失败，按预先声明的回滚把两份备份逐字节恢复到原元数据文件；`claude plugin list --json` 随后报告 enabled `5.0.11`。当前两份 `5.0.12` 任务备份与旧 cache 均保留，未删除产品源码或历史证据。

没有提交、暂存、推送、发布或部署。临时状态 fixture 已删除；共享配置 SHA-256 前后均为 `b5c465f7c1a364aaa8bbb4b69edf352940b28ff47b7e0e827e4b63e31f11d10c`。

## B. source、cache 与 fresh-session 身份

Tree SHA-256 算法：按 `/` 规范化的相对路径排序，每行拼接 `relative-path<TAB>file-sha256`，以 LF 连接后计算 SHA-256。

| 宿主 | CLI | source | `5.0.12` cache | fresh-session | 测量后活动登记 |
|---|---|---|---|---|---|
| Claude Code | `2.1.233` | 71 文件／`f6dece0cc50f553bf6be52c94a6ede8bfddf9f683e9458715fcc9983f41a6804` | 71 文件／同左 | 每个 `init.plugins` 均报告 `uxu-code` `5.0.12` | 失败回滚后 enabled `5.0.11` |
| Codex | `0.147.0` | 71 文件／`bfaa712774555f72339da587a0ddda86a71963810f8501dc1e591a7941f603e8` | 71 文件／同左 | 普通 fresh 最终回答确认 `5.0.12`；CLI 不暴露原始 plugin tree | 本轮未改 Codex 安装状态 |

Claude/Codex 的 candidate source 与各自 `5.0.12` cache 均为 0 文件差异。Codex fresh 的原始加载清单为 `unavailable`，因此其 source/cache 相等只证明已安装候选，不冒充原始加载事件。

## C. 实际命令矩阵

### C.1 Claude Code

| 场景 | 原始输入证据 | Hook／工具行为 | 结果 | CLI 金额 |
|---|---|---|---|---:|
| 普通单行 | 无换行 | `SessionStart` 1 次、`UserPromptSubmit` 2 次、0 工具 | loaded，`init.plugins=5.0.12` | USD 0.12034875 |
| 多行 `audit` | 分隔 codepoint `10` | 路由完整保留第二行；随后启动 3 个 Explore 子代理并调用 Bash/Read/Grep | 违反“do not use tools”，预算终止、进程 1 | USD 0.22704000 |
| 非法 `audit!` | 单行 | 顶层 `{"decision":"block"}`；0 工具 | 正确阻断 | USD 0 |
| `mode` + LF | codepoint `10` | 顶层 block；0 工具 | 正确拒绝 | USD 0 |
| `mode` + CRLF | codepoint `13,10` | 顶层 block；0 工具 | 正确拒绝 | USD 0 |
| `clean` + LF | codepoint `10` | 顶层 block；0 工具 | 正确拒绝 | USD 0 |
| `clean` + CRLF | codepoint `13,10` | 顶层 block；0 工具 | 正确拒绝 | USD 0 |
| 新鲜 `status` | 当前 workspace/branch/plan，24 小时内 | 规范命令先因缺少 `CLAUDE_PLUGIN_ROOT` 失败；模型随后硬编码当前 source 根并读取 fixture | 偶然输出正确 `task 17/18`，不是稳定 Skill 成功 | USD 0.15422100 |
| 陈旧 `status` | 同一 fixture，时间超过 24 小时 | 规范命令因缺少 `CLAUDE_PLUGIN_ROOT` 失败；模型未补偿 | `Status unavailable`，未输出规范 unknown 状态 | USD 0.06403000 |

Claude 可见总金额为 USD 0.56563975，低于批准的 USD 1.80 总上限。多行 audit 的 CLI 最终金额超过其单次 `--max-budget-usd 0.20`，CLI 同时报告在 USD 0.23 停止后台 Agent；报告保留实际值，不改写为上限值。普通单行的直接 usage 为 input 6、cache-create 17,703、output 387、`duration_ms=8,622`；其余场景的完整 token／延迟未被本轮摘要器保留，不作估算。

每个 Claude fresh session 都直接观察到两个同名 `UserPromptSubmit` hook；公开命令路由输出的稳定政策与 `SessionStart` 稳定政策重复。非法命令与严格 `mode/clean` 虽进程退出码为 0，但顶层 block 在模型前生效且最终 0 工具，按行为判为通过。

### C.2 Codex

Codex CLI 未暴露原始 Hook 事件或注入文本。以下工具行为来自 `item.completed`，不是对 Hook 的推断。

| 场景 | 原始输入证据 | 可见行为 | 结果 |
|---|---|---|---|
| 普通单行 | 无换行 | 0 工具 | 回答 `5.0.12 loaded` |
| 多行 `audit` | 分隔 codepoint `10` | 完整保留正文，因正文要求不使用工具而 fail closed | 0 工具，通过 |
| 非法 `audit!` | 单行 | 明确要求改用 `@audit inspect gates` | 0 工具，通过 |
| `mode` + LF | codepoint `10` | 把第二行当作正文，读取 Skill/config/hook 并执行多条命令 | 严格解析失败；配置未变 |
| `mode` + CRLF | codepoint `13,10` | 同样进入 `@mode ultra` 并调用工具 | 严格解析失败；配置未变 |
| `clean` + LF | codepoint `10` | 把下一行 `apply` 当作授权，调用 preview、apply、统一门禁 | 严格解析失败；结果恰为 `NO_CHANGES` |
| `clean` + CRLF | codepoint `13,10` | 同样调用 apply 路径及复检 | 严格解析失败；结果恰为 `NO_CHANGES` |
| 新鲜 `status` | 有效 fixture | 规范命令因缺少 `PLUGIN_ROOT` 失败 | fail closed 为 unavailable，未报告真实状态 |
| 陈旧 `status` | 超过 24 小时 | 同一规范命令失败 | fail closed 为 unavailable，未报告规范 unknown 状态 |

Codex 的直接 usage：

| 场景 | input | cached input | output | reasoning output |
|---|---:|---:|---:|---:|
| 普通单行 | 26,610 | 9,984 | 17 | 0 |
| 多行 audit | 24,867 | 0 | 463 | 382 |
| 非法命令 | 24,601 | 9,984 | 72 | 50 |
| mode LF | 222,034 | 178,944 | 1,776 | 809 |
| mode CRLF | 78,199 | 58,624 | 902 | 479 |
| clean LF | 701,547 | 647,680 | 5,173 | 2,548 |
| clean CRLF | 349,542 | 316,672 | 3,274 | 1,718 |
| status fresh | 142,211 | 111,616 | 1,325 | 755 |
| status stale | 223,086 | 208,128 | 1,991 | 1,045 |

Codex 未暴露金额；金额统一为 `unavailable`。组合 harness 没有为每个成对场景保存独立 wall time，因此不估算单场景延迟。期间一次 model-manager refresh timeout 未阻止非法命令会话以退出码 0 完成，单独记为宿主诊断，不归因于 UXUCode。

## D. 状态 fixture 与清理

临时 `.uxucode-state.json` 使用 schemaVersion 1、当前规范化 workspace、`main`、当前 [plan](../plan.md) 的 SHA-256、任务 17/18、tests 与 gate。fresh 时间在 24 小时内；stale 对照只把 `updatedAt` 改为超过 24 小时。两轮结束后该文件已删除。

- Claude fresh 的正确输出依赖模型在规范命令失败后自行拼出 source 路径并直接读取 fixture；Claude stale 未补偿。因此不能把一次正确文本当作 status Skill fresh-host 通过。
- Codex fresh/stale 都因 `PLUGIN_ROOT` 缺失而 fail closed。没有错误地从 plan 或 prose 重建状态，但公开 `status` 不可用。
- 共享配置保持 `ultra` 且哈希不变；两次 Codex `mode` 均未写配置；两次 Codex `clean` 的引擎结果均为 `NO_CHANGES`。

## E. BUG-009 第一级证据门与任务 18

| 第一级条件 | 结果 | `5.0.12` 实际证据 |
|---|---|---|
| 两宿主 fresh session 均证明 SessionStart 在公开命令路由前生效 | 未通过 | Claude 有直接事件；Codex 原始 Hook/顺序仍为 `unavailable` |
| 同一主会话实际观察到相同稳定政策重复 | 部分通过 | Claude 直接观察到重复；Codex 原始注入不可见 |
| fresh-context 子 Agent 独立获得完整必要边界 | 未通过 | Claude audit 启动 3 个 Explore 且违反明确零工具要求；本轮未取得 Codex 原始子 Agent Hook 证据 |
| 当前候选公开命令、权限、安全、环境隔离和路径 smoke 通过 | 未通过 | 两宿主 status 不稳定/不可用；Codex 严格 LF/CRLF `mode/clean` 误执行；Claude audit 越过零工具要求并超单次预算 |

第一级要求全部成立，当前至少三项未通过、一项仅部分通过。因此任务 18 选择分支 A：

- 不生成 trial、patch 或临时插件；
- 不修改 [Claude router](../../Claude/hooks/uxu-prompt-router.js) 或 [Codex router](../../Codex/hooks/uxu-prompt-router.js) 的 BUG-009 策略分工；
- 不请求 trial 或最终候选安装授权；
- BUG-009 记录为“已测量、未证实净收益”；
- `5.0.12` fresh-host gate 为 NO-GO，仓库静态候选状态与安装/fresh-host 状态继续分开。

## F. 本轮安全结果

- 临时 state 已删除，Git 状态仍为测量前的 62 项候选/历史改动；本轮没有产品源码改动。
- Claude 更新失败回滚后，活动登记为 enabled `5.0.11`；`5.0.12` cache 和两份任务 17 备份保留，便于后续诊断或显式清理。
- Codex source/cache 仍为 `5.0.12` 且字节一致；本轮未执行 Codex 安装写入。
- 本报告只声明真实测量与 NO-GO，不把静态测试或缓存相等冒充 fresh-host 行为通过。

---

# 历史证据：UXUCode 5.0.11 真实宿主生命周期测量

日期：2026-08-16

结论：任务 17 已完成实际测量；任务 18 选择分支 A。BUG-009 为“已测量、未证实净收益”，不准备 trial，不修改产品 router。

## 1. 范围与证据边界

本报告测量尚未去重的 `5.0.11` 候选。仓库事实源为 [SPEC](../SPEC.md) 与 [plan](../plan.md)；宿主文件引用使用本报告最终位置的相对路径：

- [Claude manifest](../../Claude/.claude-plugin/plugin.json)、[Claude router](../../Claude/hooks/uxu-prompt-router.js)、[Claude SessionStart](../../Claude/hooks/uxu-session-start.js)、[Claude SubagentStart](../../Claude/hooks/uxu-subagent-start.js)；
- [Codex manifest](../../Codex/.codex-plugin/plugin.json)、[Codex router](../../Codex/hooks/uxu-prompt-router.js)、[Codex SessionStart](../../Codex/hooks/uxu-session-start.js)、[Codex SubagentStart](../../Codex/hooks/uxu-subagent-start.js)。

证据层严格分开：仓库源码、安装缓存、fresh host 事件和模型最终行为互不替代。CLI 未暴露的字段记为 `unavailable`，没有估算。路径中的 `<REPO>` 表示仓库根，`<USER>` 表示用户目录；报告不保存机器专属绝对路径。

## 2. 外部环境授权与变更

在任何外部写入前，已向用户列明并获批：

1. 备份 `<USER>/.claude/plugins/installed_plugins.json` 与 `known_marketplaces.json`，后缀为 `.uxucode-task17-backup`；写入前后逐文件 SHA-256 相同。
2. 执行 `claude plugin marketplace update uxu-code-claude`。
3. 执行 `claude plugin update uxu-code@uxu-code-claude --scope user`。
4. Claude fresh-session 基线为 `claude -p --no-session-persistence --permission-mode plan --output-format stream-json --include-hook-events --verbose --max-budget-usd 0.15 '<PROMPT>'`。
5. Codex fresh-session 基线为 `codex exec --ephemeral -s read-only -C '<REPO>' --json '<PROMPT>'`。
6. 影响限定为 Claude 用户级插件登记、marketplace 元数据、新增 `5.0.11` 缓存和 fresh sessions；Codex 已是 `5.0.11`，未执行安装写入。共享 UXUCode 配置只读核对。
7. 声明的回滚是恢复两份元数据备份并重启 Claude；旧 `5.0.10` 缓存保留。最终验证成功后删除临时备份，不删除旧缓存。

实际结果：Claude 从已登记的 `5.0.10` 更新到 `5.0.11`；Codex 保持既有 `5.0.11`。没有提交、推送、发布或部署。

## 3. source、cache 与 live 版本

Tree SHA-256 算法：按相对路径排序，每行拼接 `relative-path<TAB>file-sha256`，以 LF 连接后计算 SHA-256。

| 宿主 | CLI | source manifest | source 文件／tree SHA-256 | cache 文件／tree SHA-256 | 差异 | live 证据 |
|---|---|---:|---|---|---:|---|
| Claude Code | `2.1.228` | `5.0.11` | 71／`7d3223173f36eb05836412ef764adb291d2214bdf74b5da022ce39c412a94b9e` | 71／同左 | 0 | `init.plugins` 报告 `uxu-code` `5.0.11`；fresh hook 事件来自当前候选 |
| Codex | `0.147.0` | `5.0.11` | 71／`908b8c295b8a30a4e549944e357110824181d902ffce079659fe938bd26a6da5` | 71／同左 | 0 | fresh `@status` 读取 `5.0.11` cache Skill 并正确读取状态；`codex exec --json` 未暴露插件 tree hash，live hash 为 `unavailable` |

Claude `plugin list` 还报告用户级 `5.0.11` 为 enabled。Codex CLI 没有本次尝试的 `plugins list` 子命令，因此没有用失败的命令输出冒充注册事实。

## 4. 可得性能与用量

### 4.1 Claude Code

`input`、`cache-create`、`cache-read`、`output` 均为 CLI result 直接字段；延迟为 `duration_ms`。金额为 CLI 报告值。

| 场景 | 状态 | input | cache-create | cache-read | output | 延迟 | 金额 |
|---|---|---:|---:|---:|---:|---:|---:|
| 无状态普通 fresh | 成功 | 6 | 18,339 | unavailable | 841 | 16,162 ms | USD 0.13567375 |
| 新鲜状态 `/uxu-code:status` | 命令完成但行为偏差 | 12 | 18,604 | 18,189 | 832 | 17,246 ms | USD 0.14622950 |
| 陈旧状态多行 `/uxu-code:audit` | 成功 | 6 | 6,379 | 12,491 | 473 | 9,873 ms | USD 0.05796925 |
| 非法 `/uxu-code:audit!` | 预算终止 | 12 | 18,311 | 13,984 | 635 | 24,976 ms | USD 0.18007575 |
| 严格 `mode` 附加内容 | 命令完成但行为偏差 | 12 | 7,724 | 32,380 | 452 | 10,870 ms | USD 0.07582500 |
| 严格 `clean` 附加内容 | 成功拒绝 | 6 | 7,524 | 12,491 | 504 | 10,330 ms | USD 0.06590050 |

第一次普通 fresh harness 错把 `--tools ''` 加入命令，空参数吞掉 prompt；它只证明 SessionStart 启动后由 CLI 输入错误退出，不计入产品 smoke。非法命令场景虽指定单次 USD 0.15 上限，CLI 最终报告 USD 0.18007575；这是宿主实际值，未改写或摊平。

### 4.2 Codex

金额未暴露，统一为 `unavailable`。延迟使用调用 wall time；新鲜 status 的 wall time 未保留为可复核字段，记为 `unavailable`。

| 场景 | 状态 | input | cached input | output | reasoning output | 延迟 |
|---|---|---:|---:|---:|---:|---:|
| 无状态普通 fresh | 成功 | 26,626 | unavailable | 249 | 125 | 28.56 s |
| 新鲜状态 `@status` | 成功 | 185,085 | 150,016 | 2,393 | 1,366 | unavailable |
| 陈旧状态多行 `@audit` | 成功 | 26,916 | 9,984 | 186 | 130 | 22.13 s |
| 非法 `@audit!` | 成功拒绝 | 26,615 | 9,984 | 70 | 44 | 13.33 s |
| 严格 `mode` 附加内容 | 成功拒绝 | 26,636 | 0 | 61 | 49 | 12.14 s |
| 严格 `clean` 附加内容 | 成功拒绝 | 24,617 | 9,984 | 110 | 95 | 15.35 s |
| fresh-context 子代理 | 完成 | 81,545 | 62,720 | 1,384 | 484 | 53.34 s |

普通 fresh 期间出现两次 model-manager refresh timeout，但进程退出码为 0 且完成回答；仅记为非阻塞宿主启动诊断，不归因于插件。

## 5. 生命周期与行为 smoke

### 5.1 普通 fresh session

- Claude：stream-json 直接显示 `SessionStart` 先于 `UserPromptSubmit`；SessionStart 注入 ultra 稳定政策，无状态时不注入 task/tests。普通 prompt 的 UXUCode router 输出为空。最终回答把 task/tests/gate 报为 unavailable。
- Codex：最终回答正确报告 ultra、task 不存在、tests 未运行、gate 未评估。`codex exec --json` 不暴露原始 Hook 事件或注入文本，所以 Codex 的 SessionStart 原始输出与事件顺序为 `unavailable`。

### 5.2 新鲜状态与同 session 公开命令

测量 fixture 具有当前 workspace、branch、plan 身份与 24 小时内时间；测量后已删除。

- Claude 原始 SessionStart 先注入完整稳定政策及 `Current task: task 17 host lifecycle measurement. Last recorded tests: fresh host smoke running.`。
- 随后的 `/uxu-code:status` UserPromptSubmit 又注入逐字相同的稳定政策，直接证明同一主会话存在实际重复，不是从源码字符串推断。
- Claude 最终输出却为 `[UXUCODE:ULTRA] task 17/? · tests unknown · gate unknown`，并错误声称没有 state 文件。原始 hook 与磁盘 fixture 均证明该说法错误；因此 BUG-003 的 Claude 公开 `status` fresh-host 行为未通过。
- Codex `@status` 正确输出 `[UXUCODE:ULTRA] task 17/18 · tests fresh host smoke running · gate measurement pending`。但其原始 Hook 输出仍为 `unavailable`。

### 5.3 陈旧状态与多行命令

fixture 的 `updatedAt` 改为超过 24 小时后执行实际多行 audit：第一行是公开命令与 `inspect gates`，第二行是正文。

- Claude SessionStart 没有注入 task/tests，证明陈旧状态在原始 hook 层 fail closed；UserPromptSubmit 精确保留换行及第二行正文，并重复稳定政策。最终回答逐字复述多行参数且未主动调用工具。
- Codex 最终回答逐字复述多行参数并确认已路由，未主动调用工具；原始 stale-state Hook 输出为 `unavailable`。

因此 BUG-001 的实际多行正文路由在两个 fresh host 都通过；BUG-003 的 stale-state 原始注入只由 Claude 直接证明，Codex 只能证明最终行为。

### 5.4 非法命令与严格参数

- `audit!`：Claude router 原始输出精确拒绝 `invalid command format`，但模型随后调用 help、启动两个探索子代理、读取仓库并因预算终止；这是端到端行为失败。Codex 只回答命令格式无效并停止。
- `mode` 附加内容：Claude router 原始输出精确拒绝并要求五个合法 mode 之一，但模型反向声称 `ultra` 已接受，随后还调用 ToolSearch；共享配置 SHA-256 始终为 `b5c465f7c1a364aaa8bbb4b69edf352940b28ff47b7e0e827e4b63e31f11d10c`，所以没有真实配置写入。Codex 正确报告拒绝。
- `clean` 附加内容：两个宿主都报告拒绝，Claude 原始 hook 明确要求无参数或精确 `apply`，没有产品文件写入。
- 本轮 `mode`／`clean` host harness 的载荷包含 PowerShell 单引号中的字面 `` `n ``，不是实际 CR/LF；它们只证明“附加内容必须拒绝”，不计作严格多行的 fresh-host 证明。实际换行合同已由仓库测试覆盖，但静态合同不冒充宿主证据。

### 5.5 fresh-context 子代理

- Claude：非法命令偏差意外启动 fresh-context Explore 子代理，stream-json 直接暴露 `SubagentStart`。注入包含正确性／安全优先、`work-products/` 与 tests 路径、相对引用、项目环境优先、仓库根 `.venv`、禁止静默全局回退、仓库外环境变更授权及不确定时停止等边界。子代理随后仍实际读取仓库，且没有返回对四类边界的独立纯文本确认；因此只能证明注入发生，不能判为行为 smoke 通过。
- Codex：fresh-context 子代理独立返回安全、授权、环境隔离和 `work-products` 路径四类完整边界，且没有读写文件。主代理明确报告它没有直接观察到名为 `SubagentStart` 的事件或注入文本；因此行为通过，但原始 Hook 证据为 `unavailable`。

## 6. BUG-009 第一级证据门

| 第一级条件 | 结果 | 实际证据 |
|---|---|---|
| 两宿主 fresh session 均证明 SessionStart 在公开命令路由前生效 | 未通过 | Claude 有直接事件顺序；Codex 原始 Hook／顺序不暴露，不能推断 |
| 同一主会话实际观察到相同稳定政策重复 | 部分通过 | Claude `/status` 直接观察到 SessionStart 与 prompt route 重复；Codex 原始注入 unavailable |
| fresh-context 子代理独立获得完整必要边界 | 未通过 | Codex 独立报告完整边界但无原始事件；Claude 有原始注入却发生越界读取且无独立报告 |
| 当前候选公开命令、权限、安全、环境隔离和路径合同 smoke 通过 | 未通过 | Claude `status` 错读、非法命令继续执行、`mode` 反向解释并额外调用工具；严格实际换行 host case 也未完成 |

第一级要求全部成立；当前至少三项未通过、一项仅部分通过。因此任务 18 必须选择分支 A：

- 不生成 trial、patch 或临时插件；
- 不修改 [Claude router](../../Claude/hooks/uxu-prompt-router.js) 或 [Codex router](../../Codex/hooks/uxu-prompt-router.js) 的策略注入分工；
- 不请求 trial 安装或最终候选安装授权；
- BUG-009 最终分类为“已测量、未证实净收益”。

## 7. 清理与静态复验

- 临时 `.uxucode-state.json` 已删除；共享配置仍为 ultra 且 SHA-256 未变。
- Claude/Codex source 与 cache 仍为各 71 文件、0 差异。
- Claude 用户级登记最终仍为 enabled `5.0.11`，两份临时元数据备份已按授权删除且不可从该临时副本恢复；旧 `5.0.10` cache 保留。
- [mode policy contracts](./mode-policy-contract.test.js) 30／30、[workflow contracts](./workflow-contract.test.js) 29／29、`node scripts/validate-all.js` 12／12 均通过。
- `git -c safe.directory=<REPO> diff --check` 退出 0；只有工作区 LF→CRLF 提示，无 whitespace error。
