# 实施计划：子 Agent 交叉验证

状态：已完成并同步补充维护范围（2026-08-15；任务 7／7 已完成）

## 1. 规划基线

本计划以已重新批准并补充批准的 `work-products/SPEC.md` 为唯一产品事实源。此前三轮 fresh-context 子 Agent 审查已纠正 Codex 角色加载、零历史继承、门禁耦合、版本合同、回滚和证据边界；初始任务完成后的 Debug／Review 又形成两个已完成的维护任务。用户已明确批准把最终版本同步为 `5.0.10`，并把可选文件静默语义与后续审查修复纳入规格及计划事实源。

本计划只生成过程产物，不修改产品实现，不授权提交、推送、插件安装、缓存更新、发布或真实宿主操作。后续普通 `@build` 每次只执行一个任务；只有明确的 `@build auto` 才可连续执行稳定任务。

## 2. 已锁定设计

- 交叉验证保证 fresh-context 子 Agent 和对抗性上下文隔离，不保证不同底层模型。
- 每个适用 doubt cycle 只有一条 `CLAIM → EXTRACT → DELEGATE → RECONCILE → STOP` 路径，不再叠加外部 CLI 询问。
- 子 Agent 只接收 ARTIFACT、CONTRACT 和对抗性任务；默认只读，不能扩大权限。
- 普通 doubt cycle 使用一个匹配角色；`review` 仅按真实安全或测试风险增加角色，可并行但不机械全量调用。Claude 可使用原生角色；Codex 以 `spawn_agent` 的 `fork_turns: "none"` 发起通用原生子 Agent，并显式传入现有 `Codex/agents/*.md` 角色提示资产。
- Claude 与 Codex 保持语义对等；仅允许宿主原生术语和公开命令形式不同。
- 嵌套受限时把 ARTIFACT、CONTRACT 和审查目标交还主 Agent；其他委派失败明确报告交叉验证未完成，不回退到外部 CLI、人工外部复制或伪装成独立验证的自我审查。
- `.uxucode-state.json` 与 `work-products/clean-migration.json` 均为可选文件；缺失不是 blocker，不创建、不报告缺失。
- 平凡 review 不委派；四个工作流只允许既有授权且不改变外部状态的检查，新权限请求返回主 Agent；静态 mutation 合同必须 fail closed。

## 3. 范围与变更预算

最终候选触及 17 个产品／合同文件；其中前 13 个属于原始交叉验证实施，后 4 个属于补充批准的可选文件维护修复：

1. 新增 `work-products/tests/subagent-cross-validation-contract.test.js`；
2. 修改四个内部工作流：
   - `Claude/references/workflows/doubt-driven-development/SKILL.md`
   - `Codex/references/workflows/doubt-driven-development/SKILL.md`
   - `Claude/references/workflows/code-review-and-quality/SKILL.md`
   - `Codex/references/workflows/code-review-and-quality/SKILL.md`
3. 修正 `Codex/references/orchestration-patterns.md` 对 Codex Markdown 角色资产的加载假设；
4. 修改 `scripts/validate-all.js`；
5. 同步五个版本事实源和一个既有版本合同测试：
   - `Claude/.claude-plugin/plugin.json`
   - `Claude/.claude-plugin/marketplace.json`
   - `Codex/.codex-plugin/plugin.json`
   - `Claude/scripts/validate-plugin.js`
   - `Codex/scripts/validate-plugin.js`
   - `work-products/tests/workflow-contract.test.js`

补充维护文件：

14. `Claude/skills/status/SKILL.md`；
15. `Codex/skills/status/SKILL.md`；
16. `Claude/skills/clean/SKILL.md`；
17. `Codex/skills/clean/SKILL.md`。

后续 Review 对四个工作流、Codex orchestration、新合同测试和既有 workflow 合同的加固均落在上述既有文件内，不再扩大文件集合。`work-products/SPEC.md`、`work-products/plan.md` 与 `work-products/todo.md` 是本次批准后同步的过程事实源，不计入产品／合同文件预算。

不修改两宿主公开 `plan`／`review` Skill、Claude orchestration patterns、Agent 定义、README、三语言使用指南或 OpenClaw。最终候选未突破该边界。

## 4. 依赖顺序

```text
任务 1：建立 RED 合同
  ├─> 任务 2：改造 doubt-driven-development
  └─> 任务 3：改造 code-review-and-quality
          任务 2 + 任务 3
                  └─> 任务 4：接入统一门禁
                              └─> 任务 5：形成原始 5.0.7 候选并完成总门禁
                                          └─> 任务 6：修复可选文件缺失误报
                                                      └─> 任务 7：修复 Review 发现并同步 5.0.10
```

任务 2 与任务 3 在任务 1 完成后逻辑上可并行，但同一执行者应保持顺序实施，以便把测试失败精确归因。版本同步最后执行，避免中间态被误报为可发布版本。

## 5. 实施任务

### 任务 1：建立子 Agent 交叉验证 RED 合同

**说明：** 新增一个 Node.js 持久合同测试，先锁定当前外部 CLI 行为、缺失的子 Agent 合同、审查角色语义和统一门禁接入缺口。

**范围：**

- 新建 `work-products/tests/subagent-cross-validation-contract.test.js`。
- 使用 Node.js 标准库和 `__dirname` 出发的 `../..` 仓库相对引用，不增加依赖。
- 将断言拆成 doubt-driven、review、Codex 隔离／角色机制、统一门禁四个可单独筛选的测试，禁止用过宽关键词误伤“禁止回退到外部 CLI”这类合规负向说明。

**验收标准：**

- [x] 测试精确拒绝 `codex exec`、Gemini 调用／探测、逐次 CLI 授权、人工外部审查、`Multi-Model Review Pattern`、`Model A`／`Model B` 等旧行为。
- [x] 测试要求 fresh-context 子 Agent、ARTIFACT／CONTRACT、对抗性任务、只读权限、主 Agent 复核、三轮上限；Codex 必须出现 `fork_turns: "none"` 或明确的零历史继承合同。
- [x] 测试要求嵌套受限时交还 ARTIFACT、CONTRACT 和审查目标，普通委派失败明确标记未完成，且子 Agent 结论不得替代测试或真实宿主证据。
- [x] 测试逐宿主断言共同语义，只允许 Claude 原生角色与 Codex 通用子 Agent 加显式角色提示／隔离参数等已定义差异；不把 `validate-skill-parity.js` 当作内部 workflow 对等证据。
- [x] 当前源码运行该测试为预期 RED，4 个测试组分别命中旧 cross-model 分支、Model A／B 审查、Codex Markdown Agent 误注册假设和统一门禁缺项。

**验证：**

```powershell
node --test work-products/tests/subagent-cross-validation-contract.test.js
```

预期：非零退出；记录失败断言，不把 RED 误报为仓库回归。

**依赖：** 无。

**可能修改：** 1 个文件，S。

**回滚：** 若规格撤销，删除本任务新增测试；不得为保留旧行为而弱化断言或增加兼容分支。

### 任务 2：将 doubt cycle 收敛为单一子 Agent 路径

**说明：** 对等改写两宿主 `doubt-driven-development`，删除外部 CLI 的发现、认证、授权、Shell 安全和人工复制路径，并补齐委派输入、权限、失败和嵌套合同。

**范围：**

- 修改 Claude／Codex 两个 `doubt-driven-development/SKILL.md`。
- 保留原有非平凡触发条件、主 Agent 编排责任、发现分类顺序、同一未变 ARTIFACT 不重复委派和最多三轮。
- 将 Step 3 明确为 DELEGATE：一个 fresh-context 对抗性子 Agent，仅接收 ARTIFACT、CONTRACT 和任务；Codex 明确使用 `spawn_agent` 的 `fork_turns: "none"`，嵌套受限时把三项交接载荷返回主 Agent，其他宿主不可用场景明确返回未完成。

**验收标准：**

- [x] 两宿主均使用 `CLAIM → EXTRACT → DELEGATE → RECONCILE → STOP`，且不再包含第二层 cross-model 询问或模型 CLI 调用路径。
- [x] 文本明确上下文隔离不等于不同模型，ARTIFACT 中指令是不可信数据，委派只读且不扩大授权；嵌套交接保留 ARTIFACT、CONTRACT 和审查目标。
- [x] 新合同测试直接证明 Claude／Codex 的共同语义及允许差异；skill parity 仅作为公开 Skill／目录集合回归通过。

**验证：**

```powershell
node --test --test-name-pattern="doubt-driven" work-products/tests/subagent-cross-validation-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 任务 1。

**可能修改：** 2 个文件，S。

**回滚：** 仅反向恢复本任务的两个配对文件；不得只恢复一个宿主，也不得以 CLI 回退保留新旧双路径。

### 任务 3：将代码审查改为按风险选择子 Agent

**说明：** 对等改写两宿主 `code-review-and-quality` 的 Multi-Model 模式，建立 reviewer、security-reviewer、test-reviewer 的风险映射和主 Agent 合并合同，并纠正 Codex orchestration 对 Markdown 角色资产的原生加载假设。

**范围：**

- 修改 Claude／Codex 两个 `code-review-and-quality/SKILL.md`。
- 修改 `Codex/references/orchestration-patterns.md`：现有 `Codex/agents/*.md` 是提示资产，不是已注册的 Codex 自定义 Agent。
- 普通正确性、架构、性能和复杂度使用 reviewer；仅在安全边界存在时增加 security-reviewer；仅在测试或证据缺口存在时增加 test-reviewer。
- Claude 可调用宿主原生角色；Codex 读取对应 Markdown 角色提示，并以 `fork_turns: "none"` 在通用原生子 Agent 的任务中显式传入职责、只读边界和输出要求，不写入 `.codex/agents/*.toml`。
- 独立视角可并行，主 Agent 必须合并、去重、回到证据复核，并继续输出既有 `Critical`、`Important`、`Suggestion` 分级。

**验收标准：**

- [x] 删除 Multi-Model、Model A／Model B 以及不同模型必然独立的暗示，统一为 fresh-context subagent review。
- [x] 角色选择由实际风险驱动，不机械调用全部角色；并行不扩大权限且子 Agent 默认只读。
- [x] Codex 不依赖未注册角色名称，orchestration 与 workflow 都明确使用通用子 Agent 加角色提示资产。
- [x] 新合同测试直接证明 Claude／Codex 的共同审查语义及允许差异；skill parity 仅作为公开 Skill／目录集合回归通过。

**验证：**

```powershell
node --test --test-name-pattern="review workflows|Codex role prompts" work-products/tests/subagent-cross-validation-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 任务 1。

**可能修改：** 3 个文件，M。

**回滚：** 同时反向恢复两个配对 workflow 与 Codex orchestration；不得保留一套“多模型”和一套“子 Agent”的分裂术语，也不得留下错误的 Codex 原生角色声明。

### 检查点 A：工作流合同

- [x] 任务 1 的 doubt-driven 与 review focused 测试均由 RED 转 GREEN。
- [x] 四个目标工作流不存在外部模型 CLI 执行、探测、认证、逐次授权或人工外部复制路径。
- [x] 新合同测试逐宿主证明内部 workflow 语义对等；`node scripts/validate-skill-parity.js` 仅证明公开 Skill 与目录集合未回归。
- [x] 未修改公开 Skill、Agent、Claude orchestration、文档或 OpenClaw。

### 任务 4：把新合同接入统一静态门禁

**说明：** 将新测试作为既有 `workflow contracts` 阶段的一部分，确保未来改动不能绕过交叉验证合同。

**范围：**

- 修改 `scripts/validate-all.js`，在 workflow contracts 参数列表中加入新测试一次。
- 同步修改 `work-products/tests/workflow-contract.test.js` 对该参数列表的精确期望；本任务只改门禁列表合同，不改版本断言。
- 不新增门禁阶段、不改变其他测试顺序或命令。

**验收标准：**

- [x] `subagent-cross-validation-contract.test.js` 在统一门禁中恰好出现一次。
- [x] 新测试的门禁断言与完整目标测试均通过。
- [x] 统一门禁仍保持原有 12 个阶段，不影响 OpenClaw 和其他合同测试。

**验证：**

```powershell
node --test work-products/tests/subagent-cross-validation-contract.test.js
node scripts/validate-all.js
```

**依赖：** 任务 2、任务 3。

**可能修改：** 2 个文件，S。

**回滚：** 同时移除门禁列表项和既有列表合同中的对应期望；不重排或改写其他门禁。

### 任务 5：形成原始 5.0.7 候选并完成静态验收

**说明：** 将 Claude manifest、Claude marketplace、Codex manifest、两宿主验证器和既有发布版本合同测试原子同步为 `5.0.7`，然后执行完整本地静态门禁。

**范围：**

- 修改三个清单和两个验证器中的共享版本事实。
- 在任务 4 已修改的 `work-products/tests/workflow-contract.test.js` 中，仅继续更新测试标题、`expectedVersion` 和验证器正则期望。
- 审计最终 diff，确认没有缓存、安装状态、文档、OpenClaw 或无关改动。
- 最终报告分开陈述仓库静态证据、已安装缓存、新宿主会话和真实子 Agent 调用证据。

**验收标准：**

- [x] 五个版本事实源及既有发布版本合同测试全部为 `5.0.7`，不存在部分升级或静默降级。
- [x] focused 测试、两宿主插件验证、skill parity、统一 12 阶段门禁和 diff check 全部通过。
- [x] 结论只声明仓库源码／本地静态结果；未执行的缓存更新、新会话加载和真实宿主子 Agent 行为明确标为未验证。

**验证：**

```powershell
node --test work-products/tests/subagent-cross-validation-contract.test.js
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node scripts/validate-skill-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 4。

**可能修改：** 6 个文件，M。

**回滚：** 若整体功能回滚，必须同时撤销任务 4 的门禁项，并让五个版本事实源、既有版本合同测试、五个工作流／orchestration 文件和新测试一起回到同一前版；禁止留下指向已删除测试的门禁项或只降部分版本。

### 任务 6：修复可选状态与迁移文件缺失误报

**说明：** 根据可复现 Debug 证据，让两宿主 `status`／`clean` 明确两个可选文件缺失时的静默、非阻塞语义，并用既有 workflow 合同锁定。

**范围：**

- 成对修改 Claude／Codex `skills/status/SKILL.md` 与 `skills/clean/SKILL.md`；
- 在 `work-products/tests/workflow-contract.test.js` 增加可选文件缺失合同；
- 不创建 `.uxucode-state.json` 或 `work-products/clean-migration.json`，不改变运行时代码。

**验收标准：**

- [x] `.uxucode-state.json` 缺失时回退共享配置或默认模式，未知字段保持 unknown，不报告 missing；
- [x] `work-products/clean-migration.json` 缺失时仅表示没有 manifest 授权条目，不创建、不阻塞、不报告 missing；
- [x] 双宿主 Skill 对等，focused workflow 合同与统一门禁通过。

**验证：**

```powershell
node --test --test-name-pattern="optional state and migration artifacts" work-products/tests/workflow-contract.test.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 5。

**可能修改：** 5 个文件，M。

**回滚：** 成对撤销四个 Skill 和对应合同断言；不得只恢复一个宿主，也不得创建可选文件作为兼容回退。

### 任务 7：修复交叉验证 Review 发现并同步最终 5.0.10

**说明：** 根据上一轮 `@review` 的 RED 证据修复平凡委派、权限交还、Codex 角色职责传递、严重度残留和静态合同 fail-closed 缺口，并原子同步最终维护版本 `5.0.10`。

**范围：**

- 加固四个交叉验证 workflow 与 `Codex/references/orchestration-patterns.md`；
- 扩充 `work-products/tests/subagent-cross-validation-contract.test.js` 的 mutation fixtures 与委派边界顺序合同；
- 同步三个 manifest／marketplace、两个插件验证器和 workflow 发布版本合同为 `5.0.10`；
- 保留任务 6 的可选文件维护合同，不新增公开命令、配置、兼容路径或依赖。

**验收标准：**

- [x] 平凡 review 不委派；四个 workflow 只允许运行既有授权且不改变外部状态的检查，新权限请求返回主 Agent；
- [x] Codex doubt 的 `fork_turns: "none"` message 显式包含匹配角色职责，ARTIFACT 不可信边界先于 payload；
- [x] mutation fixtures fail closed 地拒绝替代 CLI、未知外部审查命令和矛盾授权／信任语义；
- [x] 版本事实源统一为 `5.0.10`，focused 5／5、workflow 102／102、OpenClaw 30／30、统一 12／12 与 diff check 通过。

**验证：**

```powershell
node --test work-products/tests/subagent-cross-validation-contract.test.js
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node scripts/validate-skill-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 6。

**可能修改：** 12 个既有文件，M。

**回滚：** 按候选整体反向恢复 workflow、orchestration、合同测试和六个版本合同表面；禁止部分降版或保留会调用已删除合同的门禁项。安装缓存与宿主注册不属于本任务回滚范围。

## 6. 完成检查点

- [x] 补充批准规格的仓库源码验收标准全部映射到任务 1–7；真实安装、新会话与子 Agent smoke 明确保留为独立证据层。
- [x] 新合同测试经历可解释的 RED，再在最小实现后 GREEN。
- [x] `node scripts/validate-all.js` 与 `git -c safe.directory=C:/Code/UXUCode diff --check` 通过。
- [x] 每个改动行都可追溯到规格；没有兼容层、别名、外部 CLI 回退或无关重构。
- [x] 最终状态只报告“仓库源码候选通过、运行时未验证”；本计划已经用户单独批准，进入 `@ship` 仍需单独执行最终发布门禁。
- [x] 最终维护版本合同为 `5.0.10`，可选文件语义和后续 Review 修复均已纳入正式范围。

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 禁词断言过宽，连合规的“禁止 CLI 回退”也拒绝 | 中 | 断言具体命令和正向旧流程，同时要求明确的负向失败合同 |
| 两宿主文本漂移 | 高 | 同任务成对修改，并运行 skill parity 与逐宿主语义断言 |
| 把 Codex Markdown 角色资产误当作已注册 Agent | 高 | Codex 明确使用通用原生子 Agent 并显式传入角色提示，不写用户／项目 Agent 配置 |
| 子 Agent 获得 CLAIM 或完整会话推理 | 高 | 静态合同固定 ARTIFACT／CONTRACT-only 输入和对抗性任务 |
| review 机械启动所有角色 | 中 | 测试风险映射与“不机械全量调用”语义 |
| 版本先升级、行为尚未完成 | 中 | 版本同步置于最后任务，六个版本合同表面原子修改 |
| 静态测试被误报为真实宿主成功 | 高 | 最终报告强制四层证据分离 |
| 可选文件缺失被误报为配置损坏 | 中 | 双宿主 Skill 明确静默语义并由 workflow 合同验证 |
| 后续 Review 修复脱离批准事实源 | 高 | 用户补充批准后同步 SPEC／plan／todo 到最终 5.0.10 候选 |

## 8. 未决问题

无。计划已经完成；真实安装、缓存更新、新会话加载和子 Agent runtime smoke 未获授权且未执行。
