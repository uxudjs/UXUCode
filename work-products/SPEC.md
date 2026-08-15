# UXUCode 子 Agent 交叉验证规范

状态：已重新批准并补充批准 5.0.10 维护范围（2026-08-15）

本规格取代上一份已完成的“跨宿主开发环境隔离规范”，成为本项工作的事实源。上一份已批准规格及其实施证据继续保留在 Git 历史中。用户曾于 2026-08-15 批准初稿；`@plan` 的 fresh-context 子 Agent 审查随后发现 Codex 角色加载机制与初稿假设冲突，用户已于同日重新批准本修订稿。初始实现完成后的 Debug／Review 又发现可选文件误报、平凡 review 无条件委派、权限交还、Codex 角色提示传递、严重度残留和 fail-closed 合同不足；用户已明确批准把这些后续维护修复纳入本规格，并将最终候选事实源同步为 `5.0.10`。该补充批准只授权规格与计划事实源同步，不授权提交、推送、安装、发布或部署。

## 1. 目标

将 UXUCode Skill 中依赖外部多模型 CLI 的交叉验证改为宿主原生子 Agent 交叉验证：

1. 不再提示或执行 Gemini CLI、Codex CLI 或其他外部模型 CLI 来取得第二意见；
2. 在既有交叉验证触发条件成立时，由主 Agent 发起独立上下文的子 Agent 审查；
3. 交叉验证依赖上下文隔离、对抗性提示和主 Agent 复核，不声称子 Agent 一定使用不同模型；
4. 保留原有适用条件、审查边界、三轮上限和主 Agent 最终裁决责任；
5. Claude Code 与 Codex 两套插件保持语义一致，不新增公开命令、配置项或兼容入口。
6. 可选的 `.uxucode-state.json` 与 `work-products/clean-migration.json` 缺失时保持静默、非阻塞，不诱导用户创建或修复它们；
7. 把实施后 Review 发现的平凡委派、权限交还、角色提示、严重度和静态合同缺口纳入同一维护候选并以 fail-closed 测试锁定。

成功标准不是“把 CLI 名称替换成 Agent 名称”，而是删除外部 CLI 的发现、认证、授权、Shell 转义和失败回退分支，形成一个更短、可验证且不会扩大权限的子 Agent 审查合同。

## 2. 当前证据与问题

当前仓库证据表明：

- `Claude/skills/plan/SKILL.md` 与 `Codex/skills/plan/SKILL.md` 会在深度规划时加载 `doubt-driven-development`；
- `Claude/skills/review/SKILL.md` 与 `Codex/skills/review/SKILL.md` 会按需加载 `doubt-driven-development` 和 `code-review-and-quality`；
- 两宿主的 `doubt-driven-development` 已先要求 fresh-context reviewer，随后又在每个交互式 doubt cycle 强制询问是否调用 Gemini CLI、Codex CLI 或人工外部审查；
- 该外部 CLI 分支要求 PATH 检查、版本探测、逐次授权、认证与环境变量确认、临时提示文件和只读参数，并包含 CLI 不可用时的额外交互；
- `code-review-and-quality` 仍以“Multi-Model Review Pattern”和 Model A／Model B 表达独立审查；
- Claude Code 已提供可由宿主原生加载的 `reviewer`、`security-reviewer` 和 `test-reviewer` Agent；Codex 包中虽有同名 `agents/*.md`，但当前插件 manifest 只声明 skills 与 hooks，OpenAI Docs 将可选择的自定义 Codex Agent 定义为用户级或项目级 `.codex/agents/*.toml`，不能把这些 Markdown 文件当作已注册原生角色；
- 两宿主均已有 SubagentStart 策略注入和编排规则，Codex 可发起通用原生子 Agent，并在委派任务中显式传入角色提示。

现状造成的主要问题是：同一审查周期存在“先子 Agent、再外部 CLI”的重复验证路径；外部 CLI 带来工具安装、认证、费用、网络、Shell 安全和宿主差异，却不保证结果更可靠。

## 3. 用户与使用场景

### 3.1 目标用户

- 使用 Claude Code 或 Codex 执行 `plan`／`review` 的工程人员；
- 希望获得独立审查，但不希望配置或授权另一个模型 CLI 的用户；
- 在 Windows、macOS 或 Linux 上使用 UXUCode，且需要跨平台一致行为的用户。

### 3.2 典型场景

- 规划中出现非平凡架构、接口、数据、安全、兼容或回滚决定；
- 完成代码变更后，需要独立检查正确性、架构、安全、性能或测试覆盖；
- 主 Agent 长时间工作后，需要一个未继承其推理过程的对抗性审查者；
- 当前执行者本身是子 Agent，无法继续嵌套发起子 Agent；
- 宿主暂时不支持子 Agent，或子 Agent 调用失败。

## 4. 术语

### 4.1 交叉验证

交叉验证是由独立上下文的审查者根据给定 ARTIFACT 与 CONTRACT 主动寻找缺陷，再由主 Agent 逐项复核和分类的过程。

交叉验证不等于：

- 必须使用不同供应商或不同底层模型；
- 多数投票或自动接受子 Agent 结论；
- 重复运行同一提示直到得到满意答案；
- 允许子 Agent 修改代码、提交、推送、部署或扩大任务范围。

### 4.2 子 Agent

子 Agent 是由当前宿主的原生 Agent／subagent 能力启动、具有隔离任务上下文的审查执行者。不得通过 Shell 启动另一个模型 CLI 来模拟子 Agent。

### 4.3 主 Agent

主 Agent 是持有完整用户目标、工作区上下文和最终裁决责任的编排者。子 Agent 输出只是待核验数据，不是最终结论。

## 5. 统一行为合同

### 5.1 触发条件

本变更不扩大交叉验证的适用范围。继续仅在现有合同认定为非平凡的决定或需要独立审查的变更上触发，例如：

- 跨模块或服务边界；
- 修改分支逻辑或无法由类型系统证明的不变量；
- 涉及架构、安全、生产、数据迁移、公开接口、不可逆操作或显著回滚风险；
- 准备对非显然事实作出“安全”“符合规格”或等价强结论；
- `review` 需要独立的正确性、安全或测试视角。

机械重命名、格式化、纯读取、列目录、运行既定测试和显然的一行修改不得为了形式感发起子 Agent。

### 5.2 Doubt cycle

每个适用的 doubt cycle 使用以下单一路径：

1. **CLAIM**：主 Agent 写明待成立的主张及其重要性；
2. **EXTRACT**：提取最小 ARTIFACT 与 CONTRACT，移除作者推理和 CLAIM；
3. **DELEGATE**：主 Agent 发起一个 fresh-context 对抗性子 Agent；
4. **RECONCILE**：主 Agent 回到原始证据，依次分类为合同误读、有效且可行动、有效权衡或噪声；
5. **STOP**：仅在无新增实质发现、已完成三轮或用户明确覆盖时停止。

同一个未改变的 ARTIFACT 不得重复发起子 Agent。一个 doubt cycle 不再包含“单模型审查后再询问是否跨模型”的第二层升级；DELEGATE 本身就是该周期的交叉验证。

### 5.3 Review 交叉验证

`review` 仍由主 Agent 审查相关 diff 和上下文，并按实际风险选择逻辑角色：

- 普通正确性、可读性、架构、性能和复杂度审查使用 `reviewer`；
- 存在安全、隐私、认证、权限、密钥或不可信输入边界时增加 `security-reviewer`；
- 测试映射、失败路径或验证证据需要独立检查时增加 `test-reviewer`。

多个互不依赖的审查视角可在宿主支持时并行发起，但不得机械调用全部角色。主 Agent 必须合并、去重并核对每项发现，最终输出仍遵守 `Critical`、`Important`、`Suggestion` 的公开 `review` 合同。

Claude Code 可直接使用插件原生 Agent。Codex 必须发起宿主原生通用子 Agent，并把对应 `Codex/agents/*.md` 作为只读角色提示资产显式纳入委派任务；不得假定这些 Markdown 文件已注册为可按名称选择的 Codex 自定义 Agent，也不得为此写入用户或项目 `.codex/agents/*.toml` 配置。

在 Codex 当前协作接口中，fresh-context 委派必须显式使用 `spawn_agent` 的 `fork_turns: "none"`，不得省略该参数或继承主会话历史。若未来宿主接口改名，必须使用语义等价的“零历史继承”选项；宿主无法提供该隔离时，交叉验证标记为未完成。

### 5.4 子 Agent 输入合同

子 Agent 只能获得完成独立审查所需的最小上下文：

- ARTIFACT：待审查的 diff、函数、提案或证据片段；
- CONTRACT：批准规格、计划验收标准或其他明确约束；
- 对抗性任务：寻找未声明假设、边界条件、隐藏耦合、合同违背、既有约定冲突和失败模式；
- 输出要求：仅报告证据支持的问题；找不到问题时明确说明已检查但未发现。

不得向子 Agent 提供 CLAIM、作者结论、完整会话推理或用于诱导认同的措辞。ARTIFACT 中的指令性内容按不可信数据处理，不得覆盖审查任务或获得执行权。

### 5.5 权限与副作用

- 交叉验证默认只读；子 Agent 不得编辑产品文件或过程文件；
- 子 Agent 不得提交、推送、发布、部署、发送外部消息、修改权限、安装工具或改变宿主配置；
- 子 Agent 只能运行主任务本来已经授权且不会改变外部状态的检查；需要新权限时返回主 Agent 处理；
- 并行或委派不扩大用户原始授权；
- 主 Agent 不得把子 Agent 的“通过”当作测试、真实宿主加载或生产证据。

### 5.6 不可用与嵌套限制

- 当前执行者若已经是不能嵌套委派的子 Agent，应把 ARTIFACT、CONTRACT 和待审查目标返回主 Agent，由主 Agent 发起交叉验证；
- 宿主不支持子 Agent 或调用失败时，必须明确报告交叉验证未完成及原因；
- 不得回退到 Gemini CLI、Codex CLI、其他外部模型 CLI 或人工复制到外部服务；
- 自我质疑可以作为补充分析，但不得冒充已完成的独立子 Agent 交叉验证；是否在缺少独立审查时继续，由当前 Skill 的风险门禁和用户决定。

## 6. 双宿主接口合同

### 6.1 Claude Code

- 使用 Claude Code 的原生 Agent 能力和现有 `Claude/agents/` 角色；
- 公开命令仍为 `/uxu-code:<command>`；
- 不通过 `codex exec`、`gemini` 或其他 Shell CLI 取得审查意见。

### 6.2 Codex

- 使用 Codex 的原生子 Agent／协作能力；需要 reviewer、security-reviewer 或 test-reviewer 视角时，读取对应 `Codex/agents/*.md` 角色提示资产并将其完整职责显式交给通用子 Agent；
- 当前 Codex 协作接口必须以 `spawn_agent` 和 `fork_turns: "none"` 创建 fresh-context 子 Agent；不得依赖该工具默认值，未来接口只能换用语义等价的零历史继承选项；
- 不把 `Codex/agents/*.md` 当作宿主已注册的自定义 Agent，不新增用户级或项目级 `.codex/agents/*.toml`；
- 公开命令仍为 `@<command>`；
- 不通过 `codex exec`、`gemini` 或其他 Shell CLI 启动第二模型。

### 6.3 语义对等

Claude 与 Codex 的内部工作流必须表达同一触发条件、逻辑审查角色、输入合同、权限边界、失败语义、三轮上限和主 Agent 裁决责任。允许的差异包括宿主原生术语、公开命令形式、Claude 原生角色调用与 Codex 通用子 Agent 加角色提示资产的实际接口。

本变更不新增公开 Skill、Agent 名称、用户配置、环境变量、模式或 Hook 事件。

## 7. 实施范围

实施必须覆盖以下现有事实源：

- `Claude/references/workflows/doubt-driven-development/SKILL.md`；
- `Codex/references/workflows/doubt-driven-development/SKILL.md`；
- `Claude/references/workflows/code-review-and-quality/SKILL.md`；
- `Codex/references/workflows/code-review-and-quality/SKILL.md`。

同时必须修正并验证：

- `Codex/references/orchestration-patterns.md` 中把 Markdown 角色资产称为已注册“Plugin agents”的错误假设；
- `work-products/tests/workflow-contract.test.js` 中当前硬编码的 `5.0.6` 发布版本合同；
- `work-products/tests/workflow-contract.test.js` 中对 `scripts/validate-all.js` workflow-contract 参数列表的精确合同；
- `scripts/validate-all.js` 对新增合同测试的统一门禁接入。

补充批准的后续维护范围还包括：

- `Claude/skills/status/SKILL.md` 与 `Codex/skills/status/SKILL.md`：明确 `.uxucode-state.json` 可选，缺失时回退到共享配置或默认模式，未知项目字段保持 unknown，且不报告缺失；
- `Claude/skills/clean/SKILL.md` 与 `Codex/skills/clean/SKILL.md`：明确 `work-products/clean-migration.json` 可选，缺失仅表示没有 manifest 授权条目，不创建、不阻塞、不报告缺失；
- 四个交叉验证工作流：平凡 review 不委派，子 Agent 只能运行既有授权且不改变外部状态的检查，新权限请求返回主 Agent；Codex doubt 在零历史任务中显式传入匹配角色提示职责；
- `work-products/tests/subagent-cross-validation-contract.test.js`：增加替代 CLI 拼写、未知外部命令、矛盾授权／信任语义和委派边界顺序的 fail-closed mutation 合同；
- `work-products/tests/workflow-contract.test.js`：增加两个可选文件缺失时的双宿主静默合同，并同步最终发布版本。

仅当消除歧义或建立验证合同确有必要时，才修改：

- 两宿主的 `skills/plan/SKILL.md` 与 `skills/review/SKILL.md`；
- 两宿主的 `references/orchestration-patterns.md`；
- 现有 Agent 角色说明。

新增持久合同测试固定为 `work-products/tests/subagent-cross-validation-contract.test.js`。测试文件从其最终位置引用仓库文件时必须使用例如 `../../Claude/...`、`../../Codex/...` 的相对路径，不得写入机器绝对路径。

原始功能候选曾同步为 `5.0.7`；补充批准的后续 Debug／Review 维护修复完成后，Claude manifest、Claude marketplace、Codex manifest、两宿主版本断言与既有发布版本合同测试的最终事实源统一为 `5.0.10`。不得修改已安装插件缓存或以缓存内容反向覆盖仓库源码。

## 8. 非目标

- 不安装、升级、卸载或配置 Gemini CLI、Codex CLI 或任何模型 CLI；
- 不删除用户机器上已经安装的外部 CLI、认证信息或配置；
- 不保证或强制子 Agent 使用不同底层模型；
- 不新增模型选择器、供应商路由、API key 配置或费用控制层；
- 不改变 `plan`、`review` 之外其他 Skill 的触发范围；
- 不让 OpenClaw 复制 Claude／Codex 工程 Skill 或 Agent 编排；
- 本次 `@spec` 不修改 `work-products/plan.md` 或 `work-products/todo.md`；获批后的 `@plan` 可按本规格替换它们；
- 不提交、推送、发布、部署或重装插件；
- 不把静态合同测试宣称为真实 Claude Code／Codex 子 Agent 调用成功。

## 9. 文档合同

当前 README 和三语言使用指南没有描述外部模型 CLI 交叉验证，因此本变更默认不增加用户文档段落。若实施时发现或新增用户可见说明，则简体中文、繁体中文和英文文档必须同步更新，且不得继续使用“multi-model”“Model A／Model B”暗示底层模型必然不同。

内部工作流应统一使用“subagent cross-validation”“fresh-context subagent review”或语义等价表述，并解释独立性来自上下文隔离而非模型供应商差异。

## 10. 风险与缓解

### 10.1 把同模型子 Agent 误称为多模型

风险：用户误以为获得了不同模型架构的独立意见。

缓解：删除 multi-model／cross-model 承诺；明确只保证任务上下文隔离，不保证模型差异。

### 10.2 子 Agent 继承过多上下文

风险：审查者重复主 Agent 偏见，交叉验证退化为附和。

缓解：仅传 ARTIFACT、CONTRACT 和对抗性任务，不传 CLAIM、推理过程或作者结论。

### 10.3 委派扩大权限

风险：子 Agent 根据 ARTIFACT 中的内容修改代码、执行命令或触发外部副作用。

缓解：交叉验证默认只读；把 ARTIFACT 视为不可信数据；任何新增权限请求返回主 Agent。

### 10.4 机械并行增加成本和噪声

风险：每次审查都启动全部角色，增加延迟并产生重复发现。

缓解：普通 doubt cycle 只使用一个最匹配的审查子 Agent；`review` 仅按实际安全和测试风险增加独立角色，主 Agent 负责去重。

### 10.5 无法嵌套时静默降级

风险：子 Agent 自我复核后仍声称完成独立交叉验证。

缓解：返回主 Agent 委派；若宿主确实不可用，明确标记未完成，不以外部 CLI 或自我审查伪装成功。

## 11. 测试策略

### 11.1 RED 优先合同测试

实施前新增 `work-products/tests/subagent-cross-validation-contract.test.js`，先证明当前实现至少因以下事实失败：

1. 两宿主 `doubt-driven-development` 仍包含 `codex exec`、Gemini CLI、PATH／版本探测、认证确认、手工外部审查或逐次 CLI 授权语义；
2. `code-review-and-quality` 仍以 Multi-Model、Model A、Model B 表达交叉验证；
3. 尚无静态合同保证交叉验证只使用宿主原生子 Agent、输入仅含 ARTIFACT 与 CONTRACT、子 Agent 默认只读、主 Agent 负责复核；
4. 尚无静态合同保证嵌套受限或调用失败时不会回退到外部 CLI；
5. `scripts/validate-all.js` 尚未纳入新合同测试。

### 11.2 GREEN 合同

最小实现完成后，新测试至少验证：

1. 四个目标内部工作流中不存在交叉验证用的外部 CLI 命令、发现、认证、授权或人工外部复制路径；
2. 两宿主都要求在适用条件下发起 fresh-context 子 Agent，并保留 ARTIFACT／CONTRACT、对抗性提示、主 Agent 复核和三轮上限；
3. doubt cycle 使用单一子 Agent 交叉验证路径，不再叠加第二层 cross-model 询问；
4. `review` 相关工作流按风险选择 `reviewer`、`security-reviewer`、`test-reviewer`，且不机械调用全部角色；
5. Claude 使用宿主原生角色；Codex 使用通用原生子 Agent 加显式角色提示资产，不假定 `Codex/agents/*.md` 已注册；
6. 子 Agent 权限不超过原始任务，默认不写入、不发布、不部署；
7. Codex 明确使用 `fork_turns: "none"` 或未来语义等价的零历史继承选项，禁止依赖默认的完整历史 fork；
8. 嵌套受限时把 ARTIFACT、CONTRACT 和审查目标返回主 Agent；其他委派失败明确报告未完成，且不存在 CLI 回退；
9. 子 Agent 结论不得替代测试、真实宿主加载或生产证据；
10. 新测试逐宿主断言共同语义，并只允许已定义的命令形式、原生角色机制和 Codex 隔离参数差异；不得把 `validate-skill-parity.js` 的目录集合检查误当成内部 workflow 语义对等证据；
11. 新测试通过 `scripts/validate-all.js` 进入统一静态门禁，且既有参数列表合同同步更新；
12. 测试内部仅使用从 `work-products/tests/` 出发的仓库相对路径；
13. 既有发布版本合同测试同步验证最终维护候选 `5.0.10`；
14. 两宿主 `status`／`clean` 明确两个可选文件缺失时静默、非阻塞，且有持久合同测试；
15. review 只在非平凡变更或确需独立视角时委派，四个工作流都把新权限请求交还主 Agent；
16. 静态合同以 mutation fixture 拒绝替代 CLI 调用、未知外部审查命令、矛盾授权／信任语义和错误的 ARTIFACT 边界顺序。

### 11.3 验证命令

```text
node --test work-products/tests/subagent-cross-validation-contract.test.js
node scripts/validate-skill-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

静态合同、本地 Node 测试、安装缓存、新宿主会话和真实子 Agent 调用是不同证据层级，必须分别报告。

## 12. 可衡量验收标准

以下条件用于验收仓库源码候选；静态合同只能证明仓库表达了该行为，不能证明已安装插件、新会话或真实子 Agent 已执行成功：

1. 受影响 Skill 不再提出或执行 Gemini CLI、Codex CLI、其他模型 CLI 或人工外部复制交叉验证；
2. 工作流要求每个满足原有交叉验证触发条件的 doubt cycle 在宿主可用时发起一个 fresh-context 子 Agent；
3. 工作流要求该子 Agent 仅接收 ARTIFACT、CONTRACT 和对抗性审查任务，不接收 CLAIM 或主 Agent 推理；Codex 明确使用 `fork_turns: "none"` 或语义等价的零历史继承选项；
4. 工作流要求主 Agent 逐项复核子 Agent 发现，不投票、不盲从、不把子 Agent 结论当作测试通过；
5. 工作流禁止对同一未修改 ARTIFACT 重复委派，循环仍最多三轮；
6. `review` 工作流只按证据需要增加安全或测试角色，并由主 Agent 合并去重；Claude 使用原生角色，Codex 使用通用子 Agent 加显式角色提示；
7. 子 Agent 默认只读，不能扩大授权或自行提交、推送、发布、部署、安装工具或修改配置，其结论不能替代测试、真实宿主加载或生产证据；
8. 嵌套受限时把 ARTIFACT、CONTRACT 和审查目标返回主 Agent；其他调用失败明确报告交叉验证未完成，且没有外部 CLI 回退；
9. Claude 与 Codex 的相关内部工作流语义对等；
10. 新合同测试先 RED 后 GREEN，直接逐宿主验证 workflow 语义，并被 `node scripts/validate-all.js` 执行；
11. 所有新增测试位于 `work-products/tests/` 且仅使用最终位置相对路径；
12. Claude manifest、Claude marketplace、Codex manifest、两宿主版本断言和既有发布版本合同测试统一为 `5.0.10`；
13. 两宿主 `status`／`clean` 对可选文件缺失保持静默、非阻塞，并由 `workflow-contract.test.js` 直接验证；
14. 平凡 review 不委派，权限请求交还主 Agent，Codex 角色职责进入 `fork_turns: "none"` 的委派任务；
15. fail-closed mutation 合同覆盖替代 CLI、未知外部命令、矛盾信任／授权语义和 ARTIFACT 边界顺序；
16. `node scripts/validate-all.js` 与 `git -c safe.directory=C:/Code/UXUCode diff --check` 通过；
17. 最终报告明确区分仓库静态证据、已安装缓存、新会话加载和真实子 Agent 行为；
18. 未经另行授权更新插件并在 Claude Code／Codex 新会话完成真实 smoke 前，只能报告“仓库源码候选通过、运行时未验证”，不得宣称完整宿主行为已验收。

## 13. 已重新批准及补充批准的设计决定

用户已于 2026-08-15 重新批准第 1–8 项；随后又明确补充批准第 6、9、10 项所述的 `5.0.10` 维护范围：

1. “交叉验证”保证 fresh-context 子 Agent，不保证不同底层模型；
2. 删除现有“先子 Agent、再询问外部 cross-model CLI”的重复两段式流程，一个对抗性子 Agent 即完成该 doubt cycle 的独立审查；
3. 在原有触发条件成立且宿主支持时直接发起子 Agent，不再逐次询问用户选择 CLI；宿主自身的权限门禁仍然有效；
4. 普通 doubt cycle 使用一个最匹配的子 Agent，`review` 仅在安全或测试风险确实存在时增加可并行逻辑角色；Claude 可调用原生角色，Codex 使用通用子 Agent 加显式角色提示；
5. OpenClaw 不在本次 Skill 行为变更范围内；
6. 原始功能候选为 `5.0.7`；纳入后续明确 Debug／Review 维护修复后的最终候选统一为 `5.0.10`，但本次 `@spec` 不实施、不提交、不安装或发布。
7. 不把 `Codex/agents/*.md` 误当成宿主已注册角色，不新增用户或项目 `.codex/agents/*.toml`；只把现有 Markdown 用作只读提示资产。
8. Codex fresh-context 委派显式使用 `fork_turns: "none"` 或未来语义等价的零历史继承选项；不依赖默认历史 fork。
9. `.uxucode-state.json` 与 `work-products/clean-migration.json` 均为可选文件；缺失本身不是 blocker，不创建、不报告缺失。
10. 后续 Review 修复必须保留平凡变更不委派、既有授权边界、新权限交还、角色职责显式传递、统一严重度和 fail-closed mutation 证据。

本文件现为 `@plan`／`@build` 的规格事实源。任何上述决定再次变化，必须先修订本文件并重新批准。
