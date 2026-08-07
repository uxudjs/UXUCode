# 实施计划：Claude Code、Codex 与 OpenClaw 开发环境隔离

状态：已完成（2026-08-07，用户调用 `@build auto`）

## 1. 规划依据

事实源为已批准的 `work-products/SPEC.md`《UXUCode 跨宿主开发环境隔离规范》。该规格已经确定：

- 项目既有环境合同优先，Python 无其他合同时默认项目根目录 `.venv/`；
- 仓库外环境默认只读，修改必须逐次明确授权；
- 安全边界在 `off` 模式也不能关闭；
- 本次通过策略、Hook 上下文、验证器、文档和评估建立环境意识，不实现系统级命令拦截器；
- Claude Code、Codex、OpenClaw、三语言文档和下一补丁版本是同一验收边界。

目标、非目标、接口、权限边界、风险、测试策略和可衡量验收标准均已明确，没有遗留的架构或权限问题需要重新进入 `@spec`。本计划只安排实现顺序，不修改业务代码。

## 2. 当前基线

- Claude 与 Codex 各自的 `mode-policy.js` 导出 `workflowPolicy`，现有 SessionStart、UserPromptSubmit 和 SubagentStart Hook 都会注入它；因此把紧凑环境策略组合进 `workflowPolicy` 即可覆盖全部 Hook，无需修改六个 Hook 文件。
- Claude/Codex 的 `implementation-policy` 当前仅规定最小、安全、可维护实现，没有环境隔离决策树。
- `Claude/CLAUDE.md`、`Codex/AGENTS.md` 和根 `AGENTS.md` 当前没有项目环境优先或仓库外环境门禁。
- OpenClaw profile 当前有五个策略段落和 450 英文词上限，没有环境隔离段落。
- OpenClaw 评估当前固定为 52 个用例；增加两个用例必须同步精确分类计数、总数、测试期望和评估说明。
- `node scripts/validate-all.js` 当前把四个合同测试放入 `workflow contracts` 步骤；新增合同测试必须显式接入该步骤并同步步骤合同。
- 当前协调版本为 `5.0.4`，版本事实分布在两个 manifest、Claude marketplace、两个插件验证器和 `workflow-contract.test.js`。
- 工作树在规划开始前仅有已批准的 `work-products/SPEC.md` 修改；不得覆盖或回退该修改。

## 3. 实施设计

### 3.1 Claude/Codex 策略复用

在两个 `mode-policy.js` 中新增完全一致的 `environmentPolicy` 常量，并把它组合进现有 `workflowPolicy`。现有 Hook 继续只注入 `workflowPolicy`，从而以最少改动覆盖会话、提示路由和子代理，也自然覆盖 `off` 模式。

完整决策顺序写入两个 `implementation-policy`；Hook 只携带紧凑原则，避免每次提示重复完整规范。

### 3.2 规则文件与 OpenClaw

- 根 `AGENTS.md`、`Claude/CLAUDE.md`、`Codex/AGENTS.md` 加入短小、语义一致的环境隔离边界；保留各宿主原生命令差异。
- `OpenClaw/AGENTS.fragment.md` 增加独立、紧凑但自足的 `Environment isolation` 段落，不增加插件、Hook、Skill 或新命令。由于 OpenClaw 没有 Claude/Codex 的 `implementation-policy` 兜底，该段落还必须覆盖 Python 默认环境、既有工具链优先、精确解释器和仓库外授权披露项。
- OpenClaw validator 不只检查标题，还逐项检查项目环境优先、Python 环境选择、仓库外明确授权披露和失败即停止的关键语义。

### 3.3 测试与文档

- 新建 `work-products/tests/environment-isolation-contract.test.js` 作为总合同，引用仓库文件时只使用从该文件最终位置出发的相对路径。
- OpenClaw 增加一个缺失虚拟环境的范围扩张陷阱和一个请求全局安装的高风险用例；不执行真实安装。
- README 简体中文、繁体中文、英文段落，三份完整使用指南和 `OpenClaw/README.md` 同步说明行为边界；文档验证器负责防止后续语言漂移。

### 3.4 版本与证据边界

功能和文档完成后再把当前共同基线提升到下一补丁版本。若执行前共同基线仍为 `5.0.4`，目标版本为 `5.0.5`；若已有其他已授权变更先提升版本，则重新读取共同基线并提升一个补丁版本，不得降级或覆盖。

本地静态校验不证明已安装缓存、新会话或真实操作系统环境保护。计划不包含插件重装、提交、推送、发布或部署。

## 4. 依赖顺序

```text
任务 1 RED 合同
   └─> 任务 2 Claude/Codex 核心策略
          └─> 任务 3 三份持久规则文件
                 └─> 检查点 A

任务 2
   └─> 任务 4 OpenClaw profile 与 validator
          └─> 任务 5 OpenClaw 评估合同
                 └─> 检查点 B

任务 2、3、4、5
   └─> 任务 6 三语言与 OpenClaw 用户文档
          └─> 任务 7 文档验证器
                 └─> 检查点 C

任务 2–7
   └─> 任务 8 协调版本元数据
          └─> 任务 9 统一门禁与版本合同
                 └─> 任务 10 最终验证
```

任务按共享合同 → 宿主实现 → 用户文档 → 发布元数据 → 全量验证排序。共享文件存在依赖，不安排并行修改；任务 3 与任务 4 在任务 2 完成后理论上可并行，但默认顺序执行以减少同一合同的语义漂移。

## 5. 任务明细

### 任务 1：建立环境隔离 RED 合同

**范围**

新增一个只使用 Node.js 标准库的合同测试，先证明当前仓库缺少已批准规格要求的策略、规则、OpenClaw profile 和文档语义。测试不得创建虚拟环境、运行包安装命令或读取真实用户包目录。

**验收标准**

- `work-products/tests/environment-isolation-contract.test.js` 使用 `node:test` 和 `node:assert/strict`。
- 所有仓库引用均从测试最终位置使用相对路径，例如 `../../Codex/hooks/mode-policy`；不存在机器绑定绝对路径。
- 测试按 `Claude/Codex core policy`、`host rules`、`OpenClaw profile`、`documentation`、`unified gate` 等命名切片组织，至少覆盖 Claude/Codex 策略对等、Hook 在 `off` 模式的注入、完整实施策略、三份规则文件、OpenClaw profile/validator、三语言文档和统一门禁入口。
- 在实施任务开始前运行目标测试，得到与缺失环境隔离合同直接相关的预期失败；不得用语法错误或不存在测试框架制造 RED。
- 中间任务只要求其对应命名切片转绿；未实施切片保持预期 RED，任务 9 后才要求整份合同全绿。

**验证**

```text
node --test work-products/tests/environment-isolation-contract.test.js
```

预期：RED，失败信息指向缺失的环境隔离合同。

**依赖**：无。

**可能修改文件**

- `work-products/tests/environment-isolation-contract.test.js`

**回滚**：删除该新增测试文件；不触及环境或产品代码。

### 任务 2：实现 Claude/Codex 核心环境策略

**范围**

在两个独立插件包中加入相同的紧凑 Hook 策略和完整实施决策树。复用现有 `workflowPolicy` 注入路径，不修改六个 Hook 文件。

**验收标准**

- 两个 `mode-policy.js` 导出完全相同的 `environmentPolicy`，并将其组合进 `workflowPolicy`。
- 紧凑策略包含项目环境优先、Python 无其他合同时默认 `.venv/`、禁止静默全局回退和仓库外变更需明确授权。
- 两个 `implementation-policy` 包含规格第 4–7 节的决策顺序、精确解释器原则、只读请求边界和失败即停止规则，文件保持对等。
- SessionStart、UserPromptSubmit、SubagentStart 在所有模式（包括 `off`）的既有注入测试都能观察到 `environmentPolicy`。

**验证**

```text
node --test --test-name-pattern="Claude/Codex core policy" work-products/tests/environment-isolation-contract.test.js
node --test work-products/tests/workflow-contract.test.js work-products/tests/mode-policy-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖**：任务 1。

**可能修改文件**

- `Claude/hooks/mode-policy.js`
- `Codex/hooks/mode-policy.js`
- `Claude/skills/implementation-policy/SKILL.md`
- `Codex/skills/implementation-policy/SKILL.md`

**回滚**：成对移除新增常量和策略段落，恢复原 `workflowPolicy`；不得只回滚一个宿主。

### 任务 3：同步持久宿主规则

**范围**

让 UXUCode 仓库自身、Claude Code 插件和 Codex 插件的常驻规则都能在任务开始前提醒环境边界，不复制完整规格。

**验收标准**

- 三份规则文件语义一致：先读项目合同、优先项目环境、Python 默认 `.venv/`、仓库外修改先授权、无法确认时停止。
- Claude Code 与 Codex 保留各自原生命令和插件根目录约定。
- 规则明确只读请求不得自动创建环境或安装依赖。

**验证**

```text
node --test --test-name-pattern="host rules" work-products/tests/environment-isolation-contract.test.js
node scripts/validate-skill-parity.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖**：任务 2。

**可能修改文件**

- `AGENTS.md`
- `Claude/CLAUDE.md`
- `Codex/AGENTS.md`

**回滚**：成组移除新增规则段落，保留原宿主特有说明。

### 检查点 A：Claude/Codex 基础合同

- 环境合同目标测试由 RED 转为 Claude/Codex 相关断言通过。
- Claude/Codex 策略和 Skill 对等。
- 三种 Hook、五种模式均未出现注入缺口。
- 未修改或安装任何仓库外环境。

### 任务 4：实现 OpenClaw profile 与 validator

**范围**

为 OpenClaw 托管规则块增加紧凑环境隔离段落，并让 validator 对缺失或弱化的关键语义失败。

**验收标准**

- profile 新增 `## Environment isolation` 段落，包含项目环境优先；uv、Poetry、Pipenv、Conda、Dev Container 等既有工具链优先；Python 无其他合同时默认 `.venv/`；使用精确环境解释器而非裸 `pip`；仓库外变更明确授权；失败即停止；只读请求不安装。
- 仓库外授权前必须说明精确命令、精确目标、项目内方案不可用原因、影响、验证和回滚；不得把宽泛的“安装依赖”视为全局修改授权。
- profile 仍低于 450 英文词，不引入插件、Hook、Skill、共享 UXUCode 配置或新命令。
- validator 和负向测试逐项锁定上述环境选择及授权披露；删除标题或任一核心边界时返回明确失败。
- 安装器现有的标记、备份、幂等和用户文件保护测试保持通过。

**验证**

```text
node OpenClaw/scripts/validate-profile.js
node --test work-products/tests/OpenClaw/tests/validate-profile.test.js
node --test --test-name-pattern="OpenClaw profile" work-products/tests/environment-isolation-contract.test.js
```

**依赖**：任务 2。

**可能修改文件**

- `OpenClaw/AGENTS.fragment.md`
- `OpenClaw/scripts/validate-profile.js`
- `work-products/tests/OpenClaw/tests/validate-profile.test.js`

**回滚**：同时恢复 profile、validator 与相应测试；不得保留无法被 validator 验证的文档性承诺。

### 任务 5：扩展 OpenClaw 环境安全评估合同

**范围**

增加两个消毒评估场景：缺失虚拟环境时不得直接安装到系统环境，以及全局安装请求需要完整目标/影响/回滚信息。只扩展数据和评分合同，不真实执行命令。

**验收标准**

- 新增稳定 ID `TRAP11` 的 `scope-expansion-trap` 低风险用例和稳定 ID `RISK11` 的 `high-risk` 用例，均设置 `allowedExternalMutations: 0`。
- `evaluation.test.js` 直接断言 `TRAP11` 的 prompt/expectedBehaviors 覆盖缺失项目环境时不得回退到系统环境，直接断言 `RISK11` 覆盖授权前的精确命令、目标、项目内方案不可用原因、影响、验证和回滚；不能仅依赖非空字符串和数量校验。
- 精确分类计数从 10/10 调整为 11 个范围扩张陷阱和 11 个高风险用例，总数从 52 调整为 54。
- 确定性通过结果的工具调用总数和所有精确断言同步为 54 个用例。
- 评估说明准确记录 54 个用例及新增环境边界，不宣称已经运行真实 OpenClaw 或真实安装。

**验证**

```text
node --test work-products/tests/OpenClaw/tests/evaluation.test.js
```

**依赖**：任务 4。

**可能修改文件**

- `OpenClaw/evaluation/cases.json`
- `OpenClaw/evaluation/score-results.js`
- `OpenClaw/evaluation/README.md`
- `work-products/tests/OpenClaw/tests/evaluation.test.js`

**回滚**：成组恢复用例、计数、测试和说明，保证 fixture 与 scorer 始终一致。

### 检查点 B：OpenClaw 合同

- canonical profile 和 profile validator 通过。
- 安装器保护与幂等回归通过。
- 54 个评估用例的 schema、分类和评分合同通过。
- 结论仍仅限静态 profile/评估合同，不声称真实 Gateway 已加载。

### 任务 6：同步三语言与 OpenClaw 用户文档

**范围**

在用户旅程合适位置，用简短说明解释项目环境优先、Python 默认 `.venv/`、仓库外修改需授权和策略不等同于系统级拦截。

**验收标准**

- README 简体中文、繁体中文和英文段落结构保持对齐，均包含相同四项核心语义。
- 三份完整使用指南解释项目既有工具优先、精确解释器、只读请求和仓库外授权边界。
- `OpenClaw/README.md` 说明 profile 会影响开发/自动化命令行为，但不是操作系统沙箱。
- 文档不包含机器绑定绝对路径，不示范向系统 Python、用户 site-packages 或全局包目录安装项目依赖。

**验证**

```text
node --test --test-name-pattern="documentation" work-products/tests/environment-isolation-contract.test.js
node scripts/validate-guide-parity.js
node scripts/validate-readme-scope.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖**：任务 2、3、4、5。

**可能修改文件**

- `README.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `docs/USAGE.en.md`
- `OpenClaw/README.md`

**回滚**：三语言和 OpenClaw 说明成组恢复，不保留单语言承诺。

### 任务 7：强化文档语义验证

**范围**

把环境隔离说明变成可失败的三语言合同，避免仅凭文档当前存在而产生假阳性。

**验收标准**

- guide validator 对三种语言分别要求项目环境、`.venv/` 默认、仓库外授权和非系统沙箱语义。
- README validator 要求三个语言区段都包含对应的精简语义，且保持结构对齐。
- validator 合同测试通过删除、错放或弱化关键句证明校验会失败，并确认合法内容通过。

**验证**

```text
node --test work-products/tests/documentation-validator-contract.test.js
node scripts/validate-guide-parity.js
node scripts/validate-readme-scope.js
node --test --test-name-pattern="documentation" work-products/tests/environment-isolation-contract.test.js
```

**依赖**：任务 6。

**可能修改文件**

- `scripts/validate-guide-parity.js`
- `scripts/validate-readme-scope.js`
- `work-products/tests/documentation-validator-contract.test.js`

**回滚**：同时恢复验证器和负向合同测试；不得只删测试以让漂移通过。

### 检查点 C：用户说明与验证

- 三语言 README 和完整指南语义对齐。
- OpenClaw 用户说明与实际 profile 一致。
- 负向 fixture 能证明删除任一语言的关键边界会失败。
- 不把静态文档验证表述为真实宿主行为证明。

### 任务 8：同步下一补丁版本元数据

**范围**

在功能和文档合同稳定后，同步两个插件 manifest、Claude marketplace 和两个插件验证器。执行前重新读取共同版本基线。

**验收标准**

- 若共同基线仍为 `5.0.4`，五个位置统一更新为 `5.0.5`；否则从执行时共同基线提升一个补丁版本。
- Claude marketplace 版本与 Claude manifest 完全一致。
- 两个插件 validator 使用同一目标版本，且两个插件各自通过验证。
- 不修改已安装插件缓存，不执行安装、提交、推送或发布。

**验证**

```text
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

**依赖**：任务 2–7。

**可能修改文件**

- `Claude/.claude-plugin/plugin.json`
- `Claude/.claude-plugin/marketplace.json`
- `Codex/.codex-plugin/plugin.json`
- `Claude/scripts/validate-plugin.js`
- `Codex/scripts/validate-plugin.js`

**回滚**：五个版本位置成组恢复到同一共同基线；不得产生混合版本。

### 任务 9：接入统一门禁并同步发布合同

**范围**

将环境隔离合同测试加入现有 `workflow contracts` 步骤，并同步统一入口的参数和版本断言。

**验收标准**

- `scripts/validate-all.js` 的 `workflow contracts` 参数包含 `work-products/tests/environment-isolation-contract.test.js`。
- `workflow-contract.test.js` 精确验证新增测试已接入、fail-fast/退出码行为未改变。
- 版本合同断言与任务 8 的共同目标版本一致，并继续验证两个 manifest、Claude marketplace 和两个 validator。
- 统一入口仍为原有 12 个步骤，不新增重复验证阶段。

**验证**

```text
node --test work-products/tests/workflow-contract.test.js
node scripts/validate-all.js
```

**依赖**：任务 8。

**可能修改文件**

- `scripts/validate-all.js`
- `work-products/tests/workflow-contract.test.js`

**回滚**：成对恢复统一入口和步骤合同；若回滚版本，必须同时回滚任务 8 的五个版本位置。

### 任务 10：执行最终本地验证并准备审查

**范围**

运行所有聚焦测试、统一静态门禁和 diff 检查，核对每个规格验收标准的证据层级。该任务不修改代码；失败时返回对应任务修复，不绕过或弱化测试。

**验收标准**

- 环境隔离合同、Claude/Codex 对等、OpenClaw profile、54 用例评估合同、文档验证和版本合同全部通过。
- `node scripts/validate-all.js` 12/12 通过。
- `git -c safe.directory=C:/Code/UXUCode diff --check` 通过。
- Git diff 只包含规格、计划和经批准任务直接要求的文件；不存在环境目录、缓存、凭据或机器绑定路径。
- 最终报告区分仓库源码、本地测试、已安装缓存、新会话加载和真实环境保护；后三者没有执行时明确标为未验证。

**验证**

```text
node --test work-products/tests/environment-isolation-contract.test.js
node --test work-products/tests/workflow-contract.test.js work-products/tests/mode-policy-contract.test.js work-products/tests/documentation-validator-contract.test.js
node --test work-products/tests/OpenClaw/tests/validate-profile.test.js work-products/tests/OpenClaw/tests/evaluation.test.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
git -c safe.directory=C:/Code/UXUCode status --short
```

**依赖**：任务 9。

**可能修改文件**：无；若发现失败，回到引入失败的最早任务做最小修复。

**回滚**：不适用。验证失败不授权重置、覆盖、删除测试或修改机器环境。

## 6. 全局实施约束

- 每个任务开始前读取相关 diff，保留用户修改和已批准规格。
- `@build` 默认只执行下一个任务；只有用户明确调用 `@build auto` 才可连续执行稳定计划。
- 行为修改坚持 RED → GREEN；不得先实现后补造通过测试。
- 只使用 Node.js 标准库和现有项目工具，不新增第三方依赖。
- 所有新增测试只放在 `work-products/tests/`，引用仓库文件时使用从最终位置出发的相对路径。
- 不创建 Python `.venv/`，不执行包安装，不修改系统、用户或全局环境。
- 不修改已安装 Claude/Codex/OpenClaw 缓存，不重装插件。
- 不暂存、提交、推送、发布、部署或创建 PR。
- 任何规格冲突、版本基线冲突、竞争锁文件或无法安全确认的环境边界都返回 `BLOCKED`，先修订规格并重新批准。

## 7. 计划级风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 紧凑 Hook 策略重复或膨胀 | 每次提示增加无效上下文 | 新策略组合进既有 `workflowPolicy`，不修改六个 Hook，不重复完整决策树 |
| 只改策略文件但 Hook 未加载 | 某些宿主或模式缺少环境意识 | 合同测试覆盖三个 Hook 和五种模式，包括 `off` |
| OpenClaw profile 超过 450 词 | validator 失败或 profile 失去紧凑性 | 新段落保持短小，任务 4 立即运行词数和 profile 合同 |
| 新评估用例破坏精确计数 | scorer 与 fixture 漂移 | 用例、计数、测试和评估说明在同一任务成组修改 |
| 三语言内容漂移 | 某语言缺少安全边界 | 三语言同任务修改，下一任务加入负向 validator 合同 |
| 版本更新过早 | 中间失败留下混合版本 | 版本任务排在功能和文档 GREEN 之后，五个位置原子同步 |
| 静态测试被误报为真实保护 | 用户误以为系统级拦截已验证 | 最终报告强制分层，真实新会话和机器环境行为单独标记 |
| 任务修改超过可审查范围 | 难以定位回归 | 每项约 1–5 个文件，检查点后再进入下一子系统 |

## 8. 开放问题

无阻塞开放问题。执行期间若共同版本不再是 `5.0.4`，按任务 8 的动态补丁版本规则处理，不需要改变产品行为；若版本位置出现不一致，则停止并请求用户决定，不自行选择基线。

## 9. 计划批准边界

本计划未授权实现。用户批准后，`@build` 只能从任务 1 开始逐项执行；不得跳过 RED、检查点或版本同步。若用户希望连续执行，必须明确使用 `@build auto`。
