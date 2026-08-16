# UXUCode 门禁设计审计问题

审计日期：2026-08-15

审计范围：Claude、Codex、OpenClaw 的 20 个注册 Skill、24 个按需工作流参考 Skill、5 个内部 Agent Prompt、共享 Hook、状态文件与 OpenClaw 评估门禁。

审计性质：只读设计审计；本文件仅记录问题，不授权实现、提交、推送、发布、部署或重装插件。

## 结论

当前实现通过现有静态合同。复核保留 2 项已确认缺陷，另有 5 项属于已观察到静态事实但尚未完成真实宿主或行为影响验证的风险。现有测试证明合同内部一致，不替代真实宿主、状态生命周期或评估反例验证。

优先处理顺序：OpenClaw 高风险正确率门禁 → mode 优先级表述 → 状态事实源 → 多行命令兼容性验证 → 参考 Skill 冲突拆分 → review/ship 回退语义 → 策略注入测量。

## BUG-001：多行公开命令被路由 Hook 静默忽略，真实宿主影响未验证

严重度：中

置信度：静态行为高；真实宿主影响未验证

影响范围：`Codex/hooks/uxu-prompt-router.js`、`Claude/hooks/uxu-prompt-router.js`

### 证据

两个路由器均使用整段提示锚定且参数不允许换行的正则：

```text
Codex:  /^@([a-z-]+)(?:[ \t]+([^\n]*))?$/i
Claude: /^\/uxu-code:([a-z-]+)(?:[ \t]+([^\n]*))?$/i
```

本地运行结果：

```text
@audit inspect gates   -> 正常路由
@audit\ninspect gates -> 无输出，静默失效
```

现有 `work-products/tests/workflow-contract.test.js` 只验证单行命令及 `clean` 的非法参数，没有覆盖“首行命令 + 多行任务正文”。三语言使用指南也只展示单行 `<需求>` 语法，尚未声明多行正文属于支持合同。

### 影响

用户在命令后换行描述任务时，路由 Hook 不会注入对应上下文，也没有错误提示。Codex／Claude Code 是否仍会通过宿主原生 Skill 机制加载正确 Skill 尚未完成真实宿主 smoke，因此不能据此断言端到端路由必然失败。

### 建议修复

- 先用 Claude Code 与 Codex 新会话验证多行输入的真实宿主加载行为，再决定支持首行命令加多行正文，或明确拒绝并返回可操作错误。
- 为 Claude/Codex 增加多行、未知命令、标点后缀和非法参数的 Hook 合同测试；真实宿主 smoke 与静态 Hook 测试分开报告。
- 保留 `clean` 仅接受空参数或精确 `apply` 的安全边界。

## BUG-003：状态缺少新鲜度与统一模式事实源，存在陈旧注入风险

严重度：中

置信度：静态缺陷高；陈旧任务运行影响未验证

影响范围：`hook-state.js`、`uxu-session-start.js`、`uxu-statusline.js`、`uxu-prompt-router.js`、`status`

### 证据

- SessionStart 只要状态中存在 `currentTask` 或 `tests` 就注入会话，没有检查时间、分支、工作区身份或计划身份。
- `status` Skill 要求陈旧字段显示为 unknown，但未定义新鲜度协议，Hook 也没有实现该要求。
- `@mode` 使用旧状态展开写入并刷新 `updatedAt`，可把旧任务、测试或 gate 一并“续期”。
- SessionStart 从共享配置解析实际模式；状态栏却优先采用项目状态中的 `state.mode`，两者可能显示不同模式。
- 当前仓库没有 `.uxucode-state.json`，尚无本次复核可引用的陈旧任务实例；现有测试反而固定了状态栏优先采用 `state.mode` 的行为。

### 影响

状态栏模式可能不同于 SessionStart 实际注入的策略；存在状态文件时，旧任务或测试记录也可能被重新注入。尚未通过真实状态生命周期测试证明模型已经继续过旧任务，因此该影响保持为风险而非已发生故障。

### 建议修复

- 定义状态 schema、写入者、项目/分支/计划身份和明确失效条件。
- SessionStart 只注入可验证为当前的状态；否则忽略并显示 unknown。
- `@mode` 不应刷新无关状态字段。
- 活跃 mode 只保留一个事实源；状态栏和 SessionStart 必须使用相同解析函数。

## BUG-004：部分按需参考 Skill 含有与顶层政策冲突或过度绝对的规则

严重度：高（破坏性 Git／越权安装）；中（其余条件化规则）

置信度：源码事实高；实际加载与运行影响未验证

影响范围：下列 12 个已检查的 `references/workflows/*/SKILL.md`；不能据此推断全部 24 个参考 Skill 都有缺陷

### 已确认的宿主或授权冲突

- `git-workflow-and-versioning` 要求每个成功增量都提交，并建议使用 `git reset --hard HEAD`；这与保留用户未提交修改和提交授权边界直接冲突。
- `idea-refine` 要求超出用户最初请求，使用 Claude 风格的 `AskUserQuestion`、`Glob`、`Grep`、`Read` 等工具名，并默认写入 `docs/ideas/`；这不是宿主中立合同，也可能违反当前范围和过程产物位置约定。
- `browser-testing-with-devtools` 引导修改 `.mcp.json` 并执行 `npx -y chrome-devtools-mcp@latest`；在没有单独授权时会把浏览器验证扩大为外部安装和配置。
- `webperf` 用自然语言 `webperf` 声明隐藏触发入口，不属于 17 个公开 `@<command>`，与禁止隐式别名的合同冲突。

### 需要条件化而非一概判错的规则

- `api-and-interface-design` 从一开始要求分页；对无增长或有界集合可能违反 YAGNI，但对公开无界列表可能合理。
- `shipping-and-launch` 的 kill switch、发布监控和渐进放量适用于相应生产风险，不应机械应用于所有发布。
- `observability-and-instrumentation` 的 correlation ID、全链路传播和固定遥测结构适用于服务与跨边界 I/O，不适用于所有程序。
- `source-driven-development` 对框架模式要求官方文档与引用，但已排除纯逻辑、重命名和用户明确要求快速处理的场景；仍应避免无必要的联网研究或代码注释。
- `deprecation-and-migration` 的替代方案、兼容迁移和 down 路径适用于多数对外迁移，但不得覆盖项目已批准的无兼容迁移合同。
- `ci-cd-and-automation` 一方面声称门禁不可跳过，另一方面允许路径过滤和把慢测试移出关键路径；应按变更风险和项目既有 CI 合同统一表述。
- `spec-driven-development` 的“无规格即猜测”和约五文件上限与公开 `plan` 的可选规格政策冲突，应改为风险触发而非普遍硬门禁。
- `test-driven-development` 把 TDD cycle 称为普遍适用并在 bug fix 示例中要求全量回归，但其适用范围已排除纯配置、文档和静态内容；还需按可确定性、风险和成本选择验证范围。

### 影响

主 Skill 已要求按需或按风险选择参考，因此不能仅凭这些文本断言每次任务都会触发冲突。被实际加载时，破坏性 Git、外部安装、隐式入口和与上层事实源相反的绝对规则仍可能误导执行。

### 建议修复

- 将破坏性 Git、自动提交、外部安装／配置和未注册自然语言入口拆为独立高优先级缺陷并删除。
- 将其余绝对规则改成受项目合同、任务风险和可验证需求约束的触发器。
- 参考内容使用宿主中立工具语义；主 Skill 保持小型参考选择矩阵，避免无关工作流加载。

## BUG-005：`review` 和 `ship` 缺少无 plan 时的明确证据回退

严重度：中

置信度：文本歧义高；实际阻塞未验证

影响范围：`Codex/skills/review/SKILL.md`、`Codex/skills/ship/SKILL.md` 及 Claude 对应文件

### 证据

两个 Skill 都规定：存在规格时使用规格，否则使用 `work-products/plan.md` 的规划依据和验收标准；没有继续说明 plan 不存在时如何使用用户要求、debug 证据或已有 diff。它们也没有规定“plan 缺失即 BLOCKED”，而顶层项目合同仍让用户当前明确要求优先于 plan。

### 影响

直接小修、已有外部 diff、充分 debug 证据或没有 UXUCode 计划文件的既有变更可能被模型误判为需要补做 `plan`。这是指令歧义和误阻塞风险，不是已证实的硬依赖。

### 建议修复

明确证据优先级：

1. 已批准规格；
2. 已存在且适用的计划及验收标准；
3. 明确用户要求；
4. 充分 debug 证据；
5. 可从 diff、测试和项目合同重建的变更意图。

只有缺少可验证目标时才返回 BLOCKED，不应因 plan 文件不存在而单独阻塞。

## BUG-007：OpenClaw 评估指标奖励过度压缩

严重度：中高

置信度：高

影响范围：`OpenClaw/evaluation/score-results.js`、评估 fixture 与合同测试

### 证据

当前发布门禁要求输出 token 中位数相对基线至少减少 35%，但 correctness 只统计低风险案例。高风险案例只通过 `missingRiskInformation` 等人工计数字段约束，没有对等的高风险正确率指标。

### 影响

优化过程可能偏向缩短高风险回答，只要未被标记为缺少风险信息；这与“高风险恢复完整细节”的运行政策方向相反。

### 建议修复

- 高风险正确性和风险信息完整度都必须成为硬门禁。
- token 减少只评估低风险、可压缩案例，或降级为观察指标。
- 分类别报告正确率、token、工具调用和延迟，避免一个全局中位数掩盖高风险退化。

## BUG-008：模式 Skill 的优先级表述可能覆盖用户意图

严重度：中

置信度：高

影响范围：`Codex/skills/mode/SKILL.md`、Claude 对应文件

### 证据

Skill 写明“Correctness and safety outrank explicit user requirements”。安全优先是必要边界，但把笼统的 correctness 置于明确用户要求之上，会让模型以主观最佳实践代替用户目标；共享 Hook 中“explicit requirements 与 correctness/safety 一起高于 compactness”的表达更准确。

### 建议修复

改为：安全和不可违反的平台边界优先；在这些边界内，正确性必须相对于明确用户要求、项目合同和验收标准判断，不得用主观最佳实践改写用户目标。

## BUG-009：共享策略重复注入静态存在，提示权重退化未验证

严重度：低至中

置信度：重复与长度事实高；行为影响未验证

影响范围：SessionStart、UserPromptSubmit、SubagentStart、宿主规则和具体 Skill

### 证据

`workflowPolicy` 为 1254 字符；启用模式后的组合策略为 1339–1450 字符。相同环境、计划、路径和安全政策会在 SessionStart、每次公开命令和每个子 Agent 启动时注入，同时宿主 `AGENTS.md` 和具体 Skill 还表达部分相同规则。现有合同测试明确要求三个 Hook 都注入该政策，因此这是当前有意锁定的行为。

### 影响

SessionStart 与公开命令处于同一主会话时会产生可量化的重复上下文；SubagentStart 面向 fresh context，不能直接视为与主会话重复叠加。目前没有 token、延迟、任务偏离率或对照运行证据证明这些文本已经压过任务目标，因此只能判定为提示预算与行为风险。

### 建议修复

- 先分别测量普通会话、公开命令和 fresh-context 子 Agent 的实际上下文、token、延迟及行为差异。
- 若对照证明确有净收益，让 SessionStart 注入稳定全局政策，Prompt router 只补充路由结果、参数和命令新增边界。
- 保留 fresh-context 子 Agent 必需的独立安全与授权边界；只删除已证明无增量价值的重复文本。
- 修改三个 Hook 的注入合同时同步更新现有 mode/workflow 合同测试，不以静态字符减少代替行为验收。

## 需要保留的严格门禁

以下约束严格但与风险相称，不应为了提速而削弱：

- `clean` 默认零写入、只有精确 `apply` 执行、冲突或路径逃逸时整体 BLOCKED；
- 未授权不得提交、推送、发布、部署、安装或修改宿主缓存；
- 外部环境变化需要精确命令、目标、影响、验证、回滚和明确授权；
- 安全、认证、权限、支付、数据迁移、不可逆操作和回滚恢复完整细节；
- 测试结果、生产状态、缓存加载和宿主运行状态必须基于实际观察，不得互相替代；
- UXUCode 修复或优化后的版本同步规则源于既有明确产品要求，除非重新批准政策变更，否则保留。

## Skill 与 Agent 分级摘要

### 注册 Skill

- 需要修正明确文本缺陷：`mode`。
- 需要补足证据回退或状态事实源：`review`、`ship`、`status` 及相关状态 Hook。
- 其余注册 Skill 主体没有因本次复核确认缺陷；`build`、`debug`、`spec`、`test`、`review`、`ship` 选择内部参考时仍须避开 BUG-004 已确认的宿主、授权和绝对规则冲突。

### 内部 Agent

- `builder`、`investigator`、`reviewer`、`security-reviewer`、`test-reviewer` 均可保持；没有证据支持因本次审计修改已批准的子 Agent 触发、授权或失败语义。

## 当前验证基线

本轮复核观察到：

```text
node scripts/validate-all.js：12/12 阶段通过
工作流合同：102/102 通过
OpenClaw：30/30 通过
git diff --check：通过
git status --short：仅 BUG.md 未跟踪
已安装缓存、新鲜宿主会话：本轮未复核
```

这些结果仅证明 5.0.10 当前仓库源码和静态合同通过；不证明已安装缓存、多行命令、陈旧状态、新鲜会话、真实宿主行为或门禁的人机效率已经通过验证。
