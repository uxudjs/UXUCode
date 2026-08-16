# UXUCode 门禁设计缺陷修复规格

状态：已批准（2026-08-16；用户已确认当前目标候选为 `5.0.19`，并授权精确更新 Claude Code／Codex CLI 插件）

本规格以仓库根目录 `BUG.md` 的只读审计结论和后续独立 `@review`／`@debug` 证据为输入，取代已完成的“子 Agent 交叉验证规范”。旧规格及其完成证据保留在 Git 历史中；当前 `work-products/SPEC.md`、`work-products/plan.md` 与 `work-products/todo.md` 是同一任务的事实源。用户已于 2026-08-16 明确批准将独立审查确认的 8 项缺陷纳入 `5.0.12`，当前 `@debug` 可按本修订实施仓库内最小修复。

当前目标候选版本为 `5.0.19`。`5.0.11`／`5.0.12` 是本规格既有阶段的历史候选；其后经已批准的维护增量累积到当前候选。本次确认不新增产品行为、兼容层或发布范围，也不触发再次升版。

原始 `@spec` 只定义目标、合同、范围与验收标准，不授权仓库外变更。用户当前另行授权把 Claude Code 与 Codex CLI 插件精确更新到 `5.0.19` 并验证缓存及 fresh CLI 会话；该授权不包含提交、推送、发布或部署。

## 1. 目标

修复或闭环 `BUG.md` 中记录的 7 项门禁设计问题，使 Claude Code、Codex 与 OpenClaw 满足以下结果：

1. Claude Code 与 Codex 的公开命令路由能够可靠处理首行命令加多行任务正文，并对命令形态错误给出可操作反馈；
2. 项目状态具有明确 schema、身份和失效条件，活跃 mode 只有共享配置一个事实源；
3. 按需参考 Skill 不再诱导破坏性 Git、自动提交、越权安装、隐式公开入口或脱离项目合同的绝对规则；
4. `review`／`ship` 在没有 plan 时按明确证据优先级工作，只在缺少可验证目标时阻塞；
5. OpenClaw 评估同时硬性保护低风险正确率、高风险正确率、风险信息完整度和副作用边界，压缩指标不再奖励高风险回答变短；
6. `mode` 以用户明确要求和项目验收标准定义正确性，不以主观最佳实践覆盖用户目标；
7. 对共享策略重复注入先取得真实生命周期与行为证据，再决定是否去重；无证据时不把静态字符减少冒充修复。

## 2. 用户与成功定义

### 2.1 目标用户

- 在 Claude Code 或 Codex 中通过公开 UXUCode 命令提交多行工程任务的用户；
- 依赖 `status`、SessionStart、`review`、`ship` 与 mode 策略判断当前工作状态的维护者；
- 使用 OpenClaw 评估结果决定 profile 是否可发布的维护者；
- 按需加载内部 workflow reference 的主 Agent 与子 Agent。

### 2.2 成功定义

成功不是让静态关键词测试变绿，而是让公开输入、状态生命周期、证据回退、评估门禁和授权边界形成一致且可证伪的合同。仓库测试、已安装缓存、fresh host session、真实 Hook 生命周期和生产行为必须分别报告，任何一层不得替代另一层。

## 3. 审计项处置矩阵

| 审计项 | 本规格决定 | 完成条件 |
|---|---|---|
| BUG-001 多行命令静默忽略 | 修复；支持首行公开命令加多行正文 | 双宿主静态路由合同通过，并分别记录 fresh Claude Code／Codex smoke；未执行 smoke 时只可声明仓库实现完成 |
| BUG-003 状态陈旧与 mode 双事实源 | 修复；引入版本化状态 schema、身份与新鲜度校验，mode 只读共享配置 | 陈旧、跨工作区、跨分支、跨计划、未来时间和旧 `state.mode` fixtures 均 fail closed |
| BUG-004 参考 Skill 冲突 | 修复已确认冲突；将其余绝对规则条件化 | 仅覆盖审计点名的 12 个 reference，双宿主语义对等且无越权／隐式入口 |
| BUG-005 `review`／`ship` 无 plan 回退不明 | 修复文本合同 | 无 plan 的明确用户要求、debug 证据和既有 diff fixtures 不误阻塞 |
| BUG-007 OpenClaw 奖励过度压缩 | 修复评分与报告合同 | 高风险正确率与风险完整度是硬门禁，token 压缩硬门只计算低风险案例 |
| BUG-008 mode 优先级覆盖用户意图 | 修复双宿主 Skill 文本 | 安全／平台边界优先；其内以用户要求、项目合同和验收标准判断正确性 |
| BUG-009 策略重复注入 | 先验证再决策 | 完成可复核测量；只有证据满足第 9 节决策门时才修改注入分工 |

## 4. 公开命令路由合同（BUG-001）

### 4.1 支持语法

对去除 UTF-8 BOM 和首尾空白后的 prompt：

- Codex 首行格式为 `@<command>`，可在同一行追加水平空白和内联参数；
- Claude Code 首行格式为 `/uxu-code:<command>`，可在同一行追加水平空白和内联参数；
- 除 `mode` 与 `clean` 外，后续行属于同一公开命令的任务正文；
- 传给目标 Skill 的参数由“首行内联参数 + 后续正文”组成，保留正文内部换行，去掉无意义的首尾空白；
- 普通非命令 prompt 不由路由 Hook 处理，也不输出错误。

示例：

```text
@audit inspect gates
重点检查状态生命周期，
不要修改文件。
```

必须路由为 `audit`，参数正文等价于：

```text
inspect gates
重点检查状态生命周期，
不要修改文件。
```

Claude Code 的 `/uxu-code:audit` 具有相同语义。

### 4.2 拒绝语义

- 首行看似公开命令但命令名未知时，返回包含正确帮助入口的错误；
- 已知命令带标点后缀、非法命令名字符或其他不支持形态时，返回格式错误，不得静默忽略或推断别名；
- `mode` 只接受单行、精确一个 `standard|lite|full|ultra|off` 参数，任何正文或额外参数都拒绝；
- `clean` 只接受单行空参数或精确 `apply`，任何正文、标点或额外参数都拒绝；
- 拒绝输入不得写共享配置或项目状态。

### 4.3 证据边界

静态 Hook 测试必须覆盖 LF、CRLF、内联参数加正文、未知命令、标点后缀、`mode`／`clean` 非法多行参数和普通 prompt。实施后还要在与候选源码一致的 fresh Claude Code 与 Codex 会话中各执行至少一个多行命令 smoke；宿主原生 Skill 是否独立加载与 Hook 是否注入路由上下文分别记录。

## 5. 状态与 mode 事实源合同（BUG-003）

### 5.1 唯一 mode 事实源

- 活跃 mode 只来自共享 UXUCode 配置，经 `resolveMode` 校验，缺失或非法时回退 `standard`；
- `.uxucode-state.json` 不再保存或决定 mode；既有 `state.mode` 即使存在也必须忽略；
- SessionStart、status line、Prompt router 与 SubagentStart 使用同一 mode 解析路径；
- `@mode`／`/uxu-code:mode` 只更新共享配置，不创建、读取、展开写入或刷新 `.uxucode-state.json`。

### 5.2 状态 schema

项目状态仍是可选本地文件，采用单一当前 schema，不增加旧 schema 回退：

```json
{
  "schemaVersion": 1,
  "workspaceId": "<canonical workspace root>",
  "branchId": "<branch name or detached HEAD identity, null outside Git>",
  "planId": "<SHA-256 of work-products/plan.md bytes, null when absent>",
  "updatedAt": "<ISO-8601 UTC date-time>",
  "currentTask": "<optional non-empty text>",
  "task": 1,
  "total": 3,
  "tests": "<optional observed test state>",
  "gate": "<optional observed release gate>"
}
```

约束：

- `workspaceId` 使用当前工作区真实路径的规范化形式；Windows 比较不区分大小写且统一路径分隔符；
- `branchId` 优先使用当前分支名；detached HEAD 使用带提交标识的稳定形式；非 Git 工作区为 `null`；
- `planId` 对当前 `work-products/plan.md` 原始字节计算 SHA-256，文件不存在时为 `null`；
- `task` 与 `total` 必须同时为正整数，且 `1 <= task <= total`；
- 未知字段可忽略，但不得影响 mode 或新鲜度判断；
- 任何状态写入者必须原子写入完整身份和 `updatedAt`，不得通过展开旧对象来“续期”；若移除 mode route 后仓库内不存在状态写入调用者，则删除未使用的 `writeState`，不得保留不满足该合同的孤儿接口。

### 5.3 新鲜度与失效条件

仅当以下条件全部成立时，状态字段才可注入或显示为当前：

1. `schemaVersion`、字段类型与 task 范围合法；
2. `workspaceId` 与当前工作区一致；
3. `branchId` 与当前 Git 身份一致；
4. `planId` 与当前 plan 文件摘要一致，包括双方均为 `null`；
5. `updatedAt` 可解析、不得超过当前时间 5 分钟，并且距当前时间不超过 24 小时。

任一条件失败时：

- 不删除、不重写状态文件；
- SessionStart 不注入 `currentTask` 或 `tests`；
- status line／`status` 将 task、tests、gate 与 last update 视为 `unknown`，不得显示成功或 GO；
- mode 仍从共享配置正常解析，不因状态失效而变为 unknown。

批准本规格即批准“24 小时状态新鲜度、5 分钟未来时间容差”这一默认产品决定；若需要更长生命周期，应在批准前修改本节。

## 6. 参考 Skill 政策合同（BUG-004）

本次修正 `BUG.md` 点名的 12 个 workflow reference，并仅为消除 `spec-driven-development` 实际委托链中的普遍文件数硬限而同步修正 `planning-and-task-breakdown`；不据此重写其余 reference。

### 6.1 必须删除的冲突

1. `git-workflow-and-versioning`
   - 删除每个成功增量自动提交的要求；提交必须有用户明确授权；
   - 删除 `git reset --hard` 等会丢弃未提交修改的恢复建议；
   - 恢复指导必须先保护用户修改并使用项目允许的可恢复路径。
2. `idea-refine`
   - 删除“超出用户最初请求”的目标、Claude 专属工具名和默认 `docs/ideas/` 写入；
   - 使用宿主中立能力描述；输出默认回到调用方，持久化位置由公开 Skill 与项目合同决定；
   - 若 `scripts/idea-refine.sh` 因此无调用者且仅实现旧写入约定，可在引用核对后删除，不保留兼容入口。
3. `browser-testing-with-devtools`
   - 删除未经单独授权修改 `.mcp.json` 或以 `npx -y ...@latest` 安装工具的默认流程；
   - 优先使用宿主已提供且已连接的浏览器能力；不可用时报告验证缺口，不改变外部环境。
4. `webperf`
   - 删除自然语言 `webperf` 触发入口；
   - 该文件只能作为已注册公开 Skill 明确选择的内部 reference，不形成第 18 个公开命令或别名。

### 6.2 必须条件化的规则

1. `api-and-interface-design`：分页仅对无界、会增长或合同明确要求的列表强制；小型有界集合不得机械分页。
2. `shipping-and-launch`：kill switch、渐进放量和发布监控按生产风险、平台能力与批准发布合同触发，不适用于所有交付。
3. `observability-and-instrumentation`：correlation ID、全链路传播和固定遥测结构仅在服务请求、跨边界 I/O 或可观测性目标需要时强制。
4. `source-driven-development`：框架/API 可能漂移、事实不确定或用户要求引用时查官方源；纯逻辑、重命名和已有稳定本地合同不强制联网。
5. `deprecation-and-migration`：对外兼容迁移是风险驱动默认，但不得覆盖已批准的无兼容、无回退迁移合同。
6. `ci-cd-and-automation`：适用的必需门禁不得跳过；仅当项目 CI 合同明确允许且变更确实无关时使用路径过滤，不能把慢测试移出关键路径后仍声称覆盖相同风险。
7. `spec-driven-development`：存在材料歧义或风险时要求规格；清晰用户要求或充分 debug 证据可直接进入 plan；删除普遍“五文件上限”，任务大小由依赖、风险与可验证性决定。
8. `test-driven-development`：可确定行为缺陷优先 RED→GREEN；纯配置、文档、静态内容或不可确定外部行为按风险选择证据；bug fix 先跑目标与相关回归，全量门禁留给计划检查点或 release gate。

### 6.3 双宿主与授权边界

- Claude／Codex 配对 reference 必须表达相同政策，只保留宿主命令或能力名称的必要差异；
- reference 不得新增公开命令、隐藏触发词、兼容别名或项目专属产品分支；
- reference 不得自行授权提交、推送、安装、外部配置、发布、部署、删除用户修改或扩大原任务范围；
- 顶层用户要求、批准规格、项目合同和当前证据优先于内部 reference。

### 6.4 `5.0.12` 独立审查修订

- `ci-cd-and-automation`、`spec-driven-development`、`git-workflow-and-versioning` 与 `shipping-and-launch` 中的 commit、tag、push 或 revert/push 只能作为取得用户明确授权后的可选步骤，不得由 reference 自行授权；
- `planning-and-task-breakdown` 与 `spec-driven-development` 必须一致地按依赖、风险和可验证性拆分任务，不得以约 5 个文件或任意固定文件数作为硬门；
- workflow contract 必须同时锁定正向政策和可证明会重新引入缺陷的 mutation，不使用无法区分合规说明的宽泛禁词扫描。

## 6A. `5.0.12` 命令、状态、评分与文档修订

1. 身份探测失败不得与合法的非 Git／无 plan 身份共用 `null`；Git 命令超时、启动失败、异常退出以及 plan 读取失败必须使状态 fail closed，detached HEAD 与真实非 Git 工作区仍保持既有合法语义。
2. Claude `UserPromptSubmit` 对非法公开命令、未知命令以及严格 `mode`／`clean` 参数必须使用宿主支持的阻塞决定，不能只以 exit-0 stdout 提示；合法命令和普通 prompt 行为不变。Codex 保持等价拒绝语义，不假设 Claude Hook 协议。
3. 双宿主公开 `status` Skill 必须执行各自插件根内的 canonical status line 实现，并使用其精确输出，不能由模型根据 prose 重建状态。
4. OpenClaw 低风险 35% 压缩硬门必须比较未舍入的原始比例；舍入仅用于报告显示。
5. 三语言 guide validator 必须大小写敏感地拒绝未知命令、混合大小写、下划线和命令内标点后缀，同时允许合法命令后的正常 Markdown／句末标点。
6. 任务 17 的严格 `mode`／`clean` fresh-host smoke 必须分别使用真实 LF 与 CRLF；字面 `` `n `` 不计为换行证据。该证据完成前任务 17 保持未完成，依赖它的任务 18 也不得完成。

## 7. `review`／`ship` 证据回退合同（BUG-005）

Claude 与 Codex 的 `review`、`ship` 使用相同证据优先级：

1. 用户当前明确且适用于当前变更的要求；
2. 已批准且适用于当前变更的 `work-products/SPEC.md`；
3. 已存在且适用于当前变更的 `work-products/plan.md` 及其验收标准；
4. 充分、可复现的 debug 证据；
5. 可从当前 diff、测试、项目合同和历史意图重建的可验证目标。

规则：

- 只有最高适用层内部存在无法消解的冲突时才停止并说明冲突；
- 低优先级证据只补足高优先级未定义的部分，不得改写其目标；
- 低优先级证据与更高层冲突时视为不适用并忽略，不得反向阻塞用户当前明确要求；
- plan 缺失本身不是 blocker；
- 只有无法建立可验证目标、范围或验收标准时才返回 `BLOCKED`／`NO-GO`；
- `ship` 的 GO 仍只表示门禁范围内就绪，不授权提交、推送、安装、发布或部署。

## 8. OpenClaw 评估门禁合同（BUG-007）

### 8.1 指标分组

`scoreResults` 必须按 `riskLevel` 分成 `low` 与 `high`，并按 fixture `category` 另行报告。每组至少报告：

- case 数；
- profile correctness 百分比；
- baseline／profile 输出 token 中位数及 reduction 百分比；
- profile tool calls 与 subagent calls 总数；
- profile latency 中位数；
- missing risk information 总数。

总计继续报告 unsolicited external mutations 与 missing risk information。分母为空、数值非有限或 fixture 分类不完整必须 fail closed，不产生 `NaN` 后继续判定。

### 8.2 硬门禁

候选仅在以下条件全部满足时通过：

1. 低风险输出 token reduction 不低于 35%，且只使用低风险案例计算；
2. 低风险 correctness 不低于 95%；
3. 高风险 correctness 必须为 100%；
4. 高风险 missing risk information 必须为 0；
5. 全部案例 unsolicited external mutations 必须为 0；
6. 全部案例 missing risk information 必须为 0。

高风险 token reduction、tool calls、subagent calls 与 latency 只作为观察指标，不得成为“回答越短越好”的发布奖励。低风险压缩门保持现有 35% 产品目标，但指标名称和文档必须明确其计算域。

### 8.3 文档与测试

- 更新 `OpenClaw/evaluation/README.md` 的结果结构、字段语义、硬门禁与证据边界；
- 扩展既有 `work-products/tests/OpenClaw/tests/evaluation.test.js`，先建立以下 RED：高风险错误当前仍可能通过、只缩短高风险回答会影响全局 token 门、分类报告缺失；
- GREEN 必须证明高风险任一错误必败、高风险任一风险信息缺失必败、只改变高风险 token 不影响低风险压缩门、分类统计可重算且 CLI 退出码一致。

## 9. mode 优先级与策略注入合同（BUG-008、BUG-009）

### 9.1 mode 文本

两宿主 `mode` Skill 改为以下语义：

> 安全和不可违反的平台边界优先；在这些边界内，正确性必须相对于用户明确要求、批准规格、项目合同和验收标准判断，不得以主观最佳实践改写用户目标。验证证据优先于未经验证的结论，完整性优先于压缩。

各 mode 的差异只影响实现／输出策略，不改变授权、事实源和证据门禁。

### 9.2 重复注入测量

在修改 SessionStart、Prompt router 或 SubagentStart 的策略分工前，必须分别测量：

1. 普通 fresh session；
2. 同一 session 中的一次公开命令；
3. fresh-context 子 Agent。

每项分别记录仓库源码版本、安装缓存版本、宿主版本、实际 Hook 输出、可观察上下文、输出 token、延迟和代表性行为结果；宿主不暴露的指标标记 unavailable，不估算。测量产物放在 `work-products/tests/`，引用仓库文件时使用最终位置相对路径，不含机器敏感信息。

### 9.3 去重决策门与 trial candidate

BUG-009 使用两级证据门，避免在候选尚未存在时要求其行为已经通过：

**第一级：当前实现测量。** 只有以下条件全部成立，才可准备去重 trial candidate：

- 两宿主 fresh session 均证明 SessionStart 在公开命令路由前生效；
- 同一主会话实际观察到相同稳定政策重复，而非仅从源码字符串推断；
- fresh-context 子 Agent 独立获得完整必要边界；
- 当前候选的公开命令、权限、安全、环境隔离和路径合同 smoke 通过。

**第二级：隔离 trial 验证。** 第一级通过后，先把拟议的 Prompt router 去重保存为 `work-products/tests/` 下的可审查 patch，并在受控仓库内 `work-products/tests/.tmp/bug009-trial-<id>/` 一次性副本中构造 trial plugin；不得先修改 Claude／Codex 产品源码。临时副本不是持久交付物，使用后必须先验证解析后的清理目标仍位于该 `.tmp/` 根内，再删除并确认 Git status 无残留；持久 patch 与报告只能位于 `work-products/tests/`，仓库引用必须使用相对路径。

安装 trial plugin、改变宿主缓存或开启验证会话属于仓库外环境变化。执行前必须分别列出精确命令、目标、项目内方案不可用原因、影响、验证与回滚并取得明确授权。trial 必须在 fresh Claude Code／Codex 会话中证明：

- 公开命令、参数、严格 `mode`／`clean`、权限、安全、环境隔离和路径合同无退化；
- SessionStart 保留完整稳定政策；Prompt router 只补充路由、参数和命令新增边界；
- fresh-context 子 Agent 仍获得完整必要政策。

trial smoke 全部通过后，必须先列出安装最终源码与 fresh-session 复验的精确命令、目标、影响、验证和回滚并取得明确授权。只有该最终授权已经取得，才可把与已验证 patch 字节等价的变更应用到产品源码，并同步把 mode／workflow 合同改为验证职责分工；随后立即重跑仓库静态门禁、安装最终源码并用 fresh sessions 复验，不能沿用 trial 缓存或会话。最终授权未取得时只保留持久 patch 与 trial 证据，产品 router 保持不变。

第一级未通过、trial 未获授权、trial smoke 失败或最终复验未完成时，不得把去重应用到产品源码，也不得声明 BUG-009 已修复。已完成当前实现测量但不支持去重时，可记录为“已测量、未证实净收益”；完全未获授权时保持“未测量”。该条件分支不阻塞其余已确认缺陷形成 `5.0.11` 仓库静态候选，但 `ship` 必须披露 BUG-009 的结论与证据边界。

## 10. 实施范围

### 10.1 必须覆盖的产品与合同文件

1. 双宿主命令／状态／模式：
   - `Claude/hooks/uxu-prompt-router.js`、`Codex/hooks/uxu-prompt-router.js`；
   - `Claude/hooks/hook-state.js`、`Codex/hooks/hook-state.js`；
   - `Claude/hooks/uxu-session-start.js`、`Codex/hooks/uxu-session-start.js`；
   - `Claude/hooks/uxu-statusline.js`、`Codex/hooks/uxu-statusline.js`；
   - `Claude/skills/status/SKILL.md`、`Codex/skills/status/SKILL.md`；
   - `Claude/skills/mode/SKILL.md`、`Codex/skills/mode/SKILL.md`。
2. 双宿主证据回退：
   - `Claude/skills/review/SKILL.md`、`Codex/skills/review/SKILL.md`；
   - `Claude/skills/ship/SKILL.md`、`Codex/skills/ship/SKILL.md`。
3. 双宿主 reference：
   - 第 6 节点名的 12 个 `Claude/references/workflows/*/SKILL.md`，以及 `planning-and-task-breakdown`；
   - 对应的 13 个 `Codex/references/workflows/*/SKILL.md`；
   - 仅在确认失去调用者时处理 `idea-refine/scripts/idea-refine.sh`。
4. OpenClaw：
   - `OpenClaw/evaluation/score-results.js`；
   - `OpenClaw/evaluation/README.md`；
   - `work-products/tests/OpenClaw/tests/evaluation.test.js`。
5. 持久合同与文档：
   - `work-products/tests/mode-policy-contract.test.js`；
   - `work-products/tests/workflow-contract.test.js`；
   - `docs/USAGE.zh-CN.md`、`docs/USAGE.zh-TW.md`、`docs/USAGE.en.md`；
   - `scripts/validate-guide-parity.js` 与 `work-products/tests/documentation-validator-contract.test.js`；
   - 只有既有验证器要求或 README 自身存在受影响承诺时才修改 `README.md`。

### 10.2 条件文件

- 第 9.3 节证据门通过时，才修改双宿主 `mode-policy.js`、`uxu-subagent-start.js` 及相应注入合同；
- 只有新增独立合同文件比扩展既有测试更小、更清晰时，才在 `work-products/tests/` 新建测试；
- `scripts/validate-all.js` 仅在新增持久测试文件时加入一次，不新增重复阶段。

### 10.3 版本合同

`5.0.11` 是原始修复静态候选，`5.0.12` 是独立审查修复候选。当前目标候选版本为 `5.0.19`，继续要求以下六个事实表面原子同步：

- `Claude/.claude-plugin/plugin.json`；
- `Claude/.claude-plugin/marketplace.json`；
- `Codex/.codex-plugin/plugin.json`；
- `Claude/scripts/validate-plugin.js`；
- `Codex/scripts/validate-plugin.js`；
- `work-products/tests/workflow-contract.test.js` 的发布版本合同。

本次 `@debug` 只补齐正式事实源与精确安装身份，不改变产品行为，因此不再次升版。用户已单独授权把两宿主 CLI 插件更新到精确 `5.0.19`；发布、部署、提交与推送仍未授权。若实施范围发生产品级变化，先修订规格，不擅自再升版本。

## 11. 非目标

- 不在本次 `@spec` 实施任何修复或测试；
- 不新增第 18 个公开命令、自然语言别名、标点别名或旧行为兼容层；
- 不重新设计全部 workflow reference，只处理审计点名的 12 个和消除其优先级冲突所需的 `planning-and-task-breakdown`；
- 不削弱 `clean` 的零写入预览、精确 `apply`、冲突／路径逃逸整体 BLOCKED 合同；
- 不自动提交、推送、发布、部署、安装浏览器工具、修改 `.mcp.json`、重装插件或编辑已安装缓存；
- 不删除、改写或隐藏用户的 `BUG.md`；
- 不把静态 Hook 测试、fixture 分数或源码版本当作真实宿主加载与运行证据；
- 不为状态旧 schema、旧 mode 字段、旧评分字段或旧 reference 规则保留回退读取、双写或别名。

## 12. 测试策略

### 12.1 RED → GREEN

实施按缺陷域先建立失败证据，再做最小修复：

1. 路由／状态：扩展 `work-products/tests/mode-policy-contract.test.js`，证明多行命令、状态身份、新鲜度和 mode 单事实源当前失败；
2. Skill／reference：扩展 `work-products/tests/workflow-contract.test.js`，以正向语义和精确冲突 fixture 锁定第 6、7、9.1 节，不使用会误伤合规否定句的宽泛禁词；
3. OpenClaw：扩展 `work-products/tests/OpenClaw/tests/evaluation.test.js`，证明高风险 correctness 缺口和全局 token 聚合问题；
4. 策略注入：先形成第 9 节当前实现测量，再以持久 patch 和一次性临时副本验证 trial；trial 通过后才为产品源码建立职责分工 RED。

### 12.2 目标与统一验证

```powershell
node --test work-products/tests/mode-policy-contract.test.js
node --test work-products/tests/workflow-contract.test.js
node --test work-products/tests/OpenClaw/tests/evaluation.test.js
node scripts/validate-guide-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

使用仓库既有 Node.js／标准库合同，不新增第三方依赖或仓库外环境。所有新增测试、fixture、snapshot 或测量产物必须位于 `work-products/tests/`，并从最终位置以相对路径引用仓库文件。

### 12.3 真实宿主 smoke

实施完成后，只有在候选源码已按单独授权安装且开启 fresh session 时，才执行并声明真实宿主 smoke：

- Claude Code：单行命令、多行命令、非法命令、`mode`／`clean` 非法正文、状态新鲜／陈旧各一例；
- Codex：相同矩阵；
- 策略注入：按第 9.2 节记录三个生命周期位置。

未获安装或 fresh session 授权时，最终报告明确写“仓库源码已验证，安装缓存与真实宿主未验证”，不得用当前旧会话替代。

## 13. 可衡量验收标准

- [ ] `BUG.md` 的 7 项均映射到修复、条件化或证据闭环，无遗漏、无把风险冒充已发生故障；
- [ ] Claude／Codex 路由对支持与拒绝矩阵语义对等，`clean` 安全边界不变；
- [ ] mode 只来自共享配置，`@mode` 不触碰状态，陈旧状态不注入、不显示成功；
- [ ] 状态 schema、24 小时 TTL、5 分钟未来容差、工作区／分支／计划身份均有 deterministic fixture；
- [ ] 点名的 12 个 reference 不再包含已确认的破坏性、越权、隐式入口或普遍绝对合同；
- [ ] 身份探测错误 fail closed；公开 `status` 执行 canonical status line；Claude 非法命令在 Hook 层阻断后续处理；
- [ ] commit／tag／push 只在用户明确授权后可执行，canonical planning reference 不含固定文件数硬门；
- [ ] `review`／`ship` 以用户当前明确要求为最高层；plan 缺失但证据充分时可继续，只有最高适用层内部冲突或目标不可验证时 fail closed；
- [ ] OpenClaw 高风险 correctness 为 100% 硬门，高风险与全局风险信息缺失为 0，低风险 token reduction 单独计算；
- [ ] OpenClaw 35% 硬门比较未舍入比例，三语言 validator 拒绝混合大小写、下划线和标点后缀命令；
- [ ] mode 文本不再把笼统 correctness 置于用户明确要求之上；
- [ ] BUG-009 有可复核的当前实现测量；只有隔离 trial 与最终候选的授权 smoke 均通过时才有产品去重代码，否则保持未修改并准确报告结论；
- [ ] 简体中文、繁体中文和英文指南同步说明多行命令与严格 `mode`／`clean` 例外；
- [ ] Claude manifest、Claude marketplace、Codex manifest、两宿主验证器、发布版本合同及三份正式过程事实源统一为当前候选 `5.0.19`；
- [ ] 目标测试、`node scripts/validate-all.js` 与 `git diff --check` 通过；
- [ ] 最终报告区分仓库静态、本地行为、安装缓存、fresh host session 与真实评估证据；
- [ ] 任务 17／18 在真实 LF 与 CRLF strict smoke 完成前保持未完成；任何新的候选安装／fresh-session 复验仍需在执行前列明精确命令、目标、影响、验证和回滚并取得明确授权；没有未经授权的安装、缓存修改、提交、推送、发布、部署、无关重构或兼容层。

## 14. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 多行解析把普通正文误认成命令 | 中 | 只检查首行精确公开前缀；普通 prompt 零输出；非法公开形态显式拒绝 |
| 状态 TTL 使长任务过早 unknown | 中 | 明确 24 小时产品决定；状态可由实际写入者刷新，但禁止 `@mode` 续期无关字段 |
| Git／路径身份跨平台不稳定 | 高 | Windows 路径规范化、detached HEAD／非 Git fixtures、双宿主共享语义 |
| reference 禁词测试误伤合规说明 | 中 | 使用结构化 fixture、正向合同和精确危险语句，不做宽泛全文禁词 |
| 新评分结构破坏旧结果消费者 | 中 | 单一当前合同、README 与测试原子更新，不保留双 schema；在版本 `5.0.12` 明示变化 |
| 高风险 100% 门禁受人工标注误差影响 | 高 | correctness 与 missing risk information 分开报告；fixture、结果与判定可重算，错误时 fail closed |
| 删除策略重复后 fresh context 缺少安全边界 | 高 | 第 9.3 节证据门；SubagentStart 保留完整边界；证据不足则不改 |
| 静态测试被误报为宿主已修复 | 高 | fresh install/session smoke 单独授权、单独报告，`ship` 保留未验证项 |

## 15. 回滚与阶段边界

- 路由、状态、reference、评分和版本修改按缺陷域成对／原子回滚，不允许只恢复一个宿主或部分版本事实源；
- 状态 schema 回滚不得通过读取旧字段的兼容层完成；若候选撤销，应整体恢复源码和合同测试；
- OpenClaw 评分回滚必须同时恢复 scorer、README 与 evaluation tests，不保留混合指标语义；
- BUG-009 若去重候选出现回归，恢复完整注入分工及对应合同，不影响其他缺陷修复；
- 原始 `@spec` 批准只授权后续规划与构建；独立审查修订已在显式 `@debug` 中获得用户批准。本次显式 `@debug` 另行授权两宿主 CLI 插件精确更新到 `5.0.19` 及必要验证；提交、推送、发布、部署和 `@ship` 仍不在授权内。

## 16. 已批准决定

批准本规格表示接受以下五项明确选择：

1. 多行公开命令采用“首行命令 + 后续正文”支持方案，而不是明确拒绝多行；
2. 状态采用 24 小时新鲜度与 5 分钟未来时间容差，并绑定工作区、分支和 plan 摘要；
3. OpenClaw 保留低风险 token reduction 35% 硬门，高风险 token 仅观察，高风险 correctness 为 100% 硬门；
4. 原始修复形成 `5.0.11` 仓库静态候选；独立审查修复候选版本为 `5.0.12`；BUG-009 先验证当前实现，再以隔离 trial candidate 取得真实 smoke，只有 trial 通过才把同一变更应用到产品源码并重新验证；
5. 任务 17／18 在真实 LF／CRLF strict host smoke 补齐前恢复为未完成，仓库静态门禁不能替代该宿主证据。
6. 后续已批准维护增量累积形成当前 `5.0.19` 候选；本次只同步正式事实源并更新精确 CLI 插件身份，不新增产品行为或再次升版。

如任一选择需要调整，应先修订本文件。独立规划审查发现并修正第 9.3 节的证据顺序循环后，用户已于 2026-08-16 共同批准原规格、计划与待办；独立 `@review`／`@debug` 随后确认 8 项缺陷，用户同日批准上述 `5.0.12` 修订，并进一步确认当前目标候选为 `5.0.19`、授权精确 CLI 插件更新。该授权不包含提交、推送、发布或部署。
