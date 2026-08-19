# 实施计划：普通批准与 SHA 完整性身份解耦

规划依据：`work-products/SPEC.md` 第 14 节“普通批准与 SHA 完整性身份解耦”（已批准，2026-08-19）。

计划生成基线版本为 `5.0.23`。
批准实施目标候选版本为 `5.0.24`。

执行策略：serial
fast 请求：否
安全并发上限：1
串行原因：用户未以精确小写首参数请求 `fast`；合同测试、公共 Skill、reference、三语言文档与版本事实按生产者到消费者形成线性依赖，并共享中央验证文件。

本计划不保存可变批准状态，也不嵌入自身 SHA。系统从当前工作树中 `work-products/plan.md` 的原始字节计算 SHA-256，并只在 `work-products/todo.md` 中保存候选身份、批准状态与收据。用户以整句自然语言明确批准当前唯一候选即可，无需查看、复制或复述 SHA。批准事务完成后本文件不可变；任何实质修改都必须重新展示当前计划并请求普通自然语言批准。

计划批准本身不隐式执行 `@build`，也不授权 `@build auto`、提交、推送、联网、付费、训练、外部写入、发布、部署、插件重装或缓存修改。实施只能在用户随后明确调用 `@build` 或 `@build auto` 后按本计划进行。

## 1. 当前基线与边界

### 1.1 当前事实

- 第 14 节规格已明确普通 spec／plan 批准与系统 SHA 身份分离，并保留 plan／todo 漂移检测、Hook session freshness、attempt／before-hash 和高风险动作级授权；不存在待实现者选择的产品语义。
- 同工作区已完成的 plan-fast debug 改动是当前未发布 `5.0.24` 候选的共享基线；其统一门禁为 13／13、workflow 163／163、OpenClaw 34／34，真实宿主自动调度仍为未验证。本计划不得回退、覆盖或把这些改动冒充为本任务成果。
- 当前产品版本六个发布事实面仍为 `5.0.23`；只有 T5 在前置合同全部 GREEN 后原子同步到 `5.0.24`。
- `work-products/tests/workflow-contract.test.js` 仍直接读取活动 plan／todo，并硬编码上一份已完成计划的 `5.0.19 → 5.0.20` 历史。替换活动计划后该测试会出现可归因的 bootstrap RED；T1 必须删除产品测试对可变过程产物的耦合，而不是把历史文本塞回新计划。
- Claude／Codex Hook 的 planId 已按当前 plan 原始字节进行 session freshness／漂移检测；`work-products/tests/mode-policy-contract.test.js` 已覆盖其 fail-closed 行为，明确冻结产品逻辑，只做回归。

### 1.2 实施约束

1. 每项任务开始前，主 Agent 必须读取 `git status --short`、相关 diff 与当前 todo，确认共享基线和改动归属；对允许写入路径记录原始字节 SHA-256 或缺失状态。出现无法归因的漂移时零写入 `BLOCKED`。
2. 任务复选框是显式状态的派生镜像，必须与状态在同一次 todo 原子替换中更新：仅 `completed` 使用 `[x]`，`pending | in_progress | blocked` 使用 `[ ]`；任何不一致均零 worker `BLOCKED`。
3. 保留并扩展当前未提交的 plan-fast 改动，不 reset、checkout、覆盖或顺手重构邻近内容。每一行新增修改都必须追溯到第 14 节或本计划明确要求。
4. 不新增运行时批准解析器、批准 sidecar、fixture 或通用正则意图识别；自然语言例句只用于静态合同测试。
5. 不把 `.uxucode-state.json` 或 Hook planId 变成批准账本；不降低 plan／todo SHA、receipt、before-hash 或漂移校验。
6. Claude／Codex 公共 Skill 保持宿主对等；reference 保留各自命令语法和原生 worker 差异，不做盲目字节复制。
7. 所有新增测试只位于 `work-products/tests/`，并仅使用从最终位置出发的仓库相对路径。各任务除列出的仓库写入外无持久生成输出；测试临时输出不得进入版本控制。复用 Node.js 标准库，不增加依赖或项目外环境修改。
8. 当前计划只修改 UXUCode 仓库。README、OpenClaw、Hook 源码、已安装缓存、宿主 registration、下游项目、历史审计制品和真实生产状态均不在范围内。

## 2. 依赖图与检查点

```text
T1 测试事实源解耦 + 普通批准 RED
  -> 检查点 A：只有新批准合同按预期 RED
    -> T2 八个公共 Skill GREEN
      -> T3 六个 reference GREEN
        -> 检查点 B：Skill/reference 语义对等
          -> T4 三语言文档与校验器 GREEN
            -> T5 版本原子同步 + Hook 回归 + 统一门禁
```

全部任务按 W1 → W5 串行执行。任何 focused validation 未达到任务定义的预期状态时，不解锁下游任务。

## 3. 实施任务

### T1：解除活动 plan/todo 测试耦合并建立普通批准 RED

**所属波次与启动条件：** W1；计划已在 todo 中有效批准，用户随后明确调用 `@build` 或 `@build auto`，且共享工作区归属预检通过。

**目标：** 让产品合同测试不再把当前活动 plan／todo 当作静态发布 fixture，同时先建立能精确失败的普通批准、漂移恢复、fresh-session 复用和高风险例外合同。

**读取范围：** 已批准 SPEC 第 14 节；当前 workflow／documentation 合同测试；8 个公共 Skill；6 个 reference；三语言指南；`scripts/validate-guide-parity.js`；现有 plan-fast fixtures 与 mode-policy Hook 回归。

**允许写入：**

- `work-products/tests/workflow-contract.test.js`
- `work-products/tests/documentation-validator-contract.test.js`
- 主 Agent 对 `work-products/todo.md` 的原子状态事务

**共享可变资源：** 两个中央合同测试；主 Agent 串行独占。必须保留当前 plan-fast debug 新增的策略、worker 生命周期、恶意 mutation 与历史证据验证覆盖。

**验收标准：**

- release metadata 测试只校验六个真实发布事实面和 SPEC 当前候选，不再读取活动 plan／todo；移除由此无用的 helper。
- 删除对活动 plan/todo 的旧任务号、依赖形状、历史自举文本和 checkbox 状态直读；公开计划结构继续由 Skill/reference 合同与现有静态 plan-fast fixtures 覆盖。
- 新增独立的 Skill 与 reference 普通批准合同，覆盖：整句语义批准、不得固定句式或 SHA challenge、系统重读原始字节并重算、todo 持久收据、fresh session 复用、可读漂移恢复、Hook 非批准账本、普通批准不扩权。
- 静态正反例覆盖 `不要批准`、疑问、引用、先修改、条件式、继续审查、SHA 冲突、多候选，以及合规的“用户无需提供 SHA”“即使提供也由系统重算”；不得用仓库级 `SHA` 禁词或宽泛正则误伤否定句。
- 高风险例外测试只有在已批准项目 SPEC 直接枚举稳定 `action_id`、副作用、环境／账户、exact set、费用／时限／重试／失效及不授权范围时才允许；普通本地阶段不得自我升级。
- 三语言文档测试定义精确对等合同与逐 token mutation；不新增 fixture、批准解析器或运行时代码。
- RED 归因仅为尚未修改的 Skill、reference、文档和 guide validator 缺少新合同；旧活动 plan/todo 耦合必须消失。

**focused validation：**

```powershell
node --test --test-name-pattern="release metadata|serial bootstrap|todo task checkboxes" work-products/tests/workflow-contract.test.js
node --test --test-name-pattern="ordinary approval" work-products/tests/workflow-contract.test.js work-products/tests/documentation-validator-contract.test.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

第一条先保留替换计划造成的可归因 bootstrap RED，再由本任务移除耦合并转 GREEN；第二条在产品修改前必须只对新合同精确 RED。

**验证并行性：** 不可并行；写中央测试事实源并为全部后续任务建立 RED。

**依赖：** 无。

**失败保留／回滚：** 保留可归因 RED、命令和失败断言；若修改产生非目标失败，仅撤销 T1 自己新增的行，不回退共享 plan-fast 基线或用户改动。归因不清则把 T1 标记 blocked，不启动 T2。

**主 Agent 责任：** 原子记录 T1 attempt、两个文件的 before-hash 与允许写集；亲自核对 live-artifact 读取已清除、RED 只来自新合同，再更新 todo 收据。

### 检查点 A：测试事实源与 RED 可归因

- 产品测试不再因合法替换 `work-products/plan.md`／`todo.md` 而失败。
- 新普通批准合同精确 RED；现有 plan-fast 与 Hook 合同未退化。
- 没有新增 fixture、运行时 parser 或第二批准事实源。

### T2：实现 Claude/Codex 八个公共 Skill 的批准合同

**所属波次与启动条件：** W2；T1 completed 且检查点 A 全部成立。

**目标：** 在两宿主的 spec、plan、build、help 公共 Skill 中明确普通语义批准、系统身份绑定、fresh-session 复用、漂移恢复和高风险动作窄例外。

**读取范围：** SPEC 第 14 节、T1 RED、两宿主当前 8 个 Skill、现有 plan-fast 与 build worker 生命周期合同。

**允许写入：**

- `Claude/skills/spec/SKILL.md`
- `Claude/skills/plan/SKILL.md`
- `Claude/skills/build/SKILL.md`
- `Claude/skills/help/SKILL.md`
- `Codex/skills/spec/SKILL.md`
- `Codex/skills/plan/SKILL.md`
- `Codex/skills/build/SKILL.md`
- `Codex/skills/help/SKILL.md`
- 主 Agent 对 todo 的原子状态事务

**共享可变资源：** 双宿主公共工作流语义；主 Agent 串行成对处理，并保留已完成 plan-fast debug 的调度与失败收敛文本。

**验收标准：**

- `spec` 将新建或实质修订候选置为待批准；唯一候选的明确整句肯定只更新 SPEC 批准元数据，实质变化恢复待批准，不要求 SHA。
- `plan` 从工作树原始 plan 字节自行计算候选 SHA 写入待批准 todo；普通自然语言批准后重读、重算并原子更新 todo 批准状态／身份／收据，不信任用户提供值，不写 Hook state，不形成自引用。
- `build` 先复用身份仍一致的持久批准收据；plan/todo 漂移、目标冲突、多候选或收据不完整继续 fail closed，以可读差异恢复并请求普通批准，不追问摘要。
- `help` 清楚说明批准不隐式调用下一命令，也不授权 auto、提交、推送、联网、费用、训练、外部写入、发布或部署。
- 四个 Skill 均说明整句语义判断，否定／疑问／引用／条件／先修改／继续审查不批准；不得实现关键词或正则 parser。
- 高风险 exact-set 例外只能引用已批准项目 SPEC 直接枚举的 action_id 和完整边界，不能由 plan/todo/debug 自行新增或扩大；普通批准和动作授权双向不替代。
- Claude/Codex Skill 对等，且当前 plan-fast、builder 生命周期、serial fallback、todo 单写者和崩溃恢复合同保持不变。

**focused validation：**

```powershell
node --test --test-name-pattern="ordinary approval skill" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**验证并行性：** 不可并行；8 个 Skill 是同一公共接口，且 plan/build 当前含共享未提交基线。

**依赖：** T1。

**失败保留／回滚：** 保留 focused 失败和相关 Skill diff；只撤销 T2 自己新增的合同语句，不回退 plan-fast 基线。任一宿主不对等或旧调度合同退化时 T2 blocked。

**主 Agent 责任：** 记录 8 文件 before-hash；逐宿主核对职责分离和保留语义；只有 focused 与 parity 同时 GREEN 才完成 T2。

### T3：实现六个 workflow/reference 的职责分离

**所属波次与启动条件：** W3；T2 completed。

**目标：** 在两宿主的 spec-driven development、planning/task breakdown 和 orchestration reference 中，把批准意图、持久收据、系统身份核验与高风险动作授权分别落到正确职责层。

**读取范围：** SPEC 第 14 节、T1 reference RED、T2 已通过的 8 个 Skill、两宿主当前 6 个 reference 及 plan-fast 调度合同。

**允许写入：**

- `Claude/references/workflows/spec-driven-development/SKILL.md`
- `Claude/references/workflows/planning-and-task-breakdown/SKILL.md`
- `Claude/references/orchestration-patterns.md`
- `Codex/references/workflows/spec-driven-development/SKILL.md`
- `Codex/references/workflows/planning-and-task-breakdown/SKILL.md`
- `Codex/references/orchestration-patterns.md`
- 主 Agent 对 todo 的原子状态事务

**共享可变资源：** 两宿主 reference 语义；planning/orchestration 已含共享 plan-fast debug 改动，必须以当前字节为 before-image。

**验收标准：**

- spec-driven reference 负责唯一候选、整句语义批准、SPEC 状态和实质修订失效，不发明 SPEC SHA 口令。
- planning reference 负责从原始 plan 字节系统计算／重算、todo 候选身份与批准收据、fresh-session 复用和可读漂移恢复；不把 SHA 写入其标识的 plan。
- orchestration reference 负责 build 前的持久收据与 plan/todo identity 复核，明确 Hook planId 只做 session freshness，并保留 action-scoped 高风险授权边界。
- 六文件均明确普通批准不扩权、普通流程不得自我升级为 exact-SHA 动作门；合法的项目 action receipt 不被通用 UXUCode 降级。
- Claude 的 slash 命令与 Codex 的 `@<command>` 语法、两宿主原生 worker 生命周期差异保持原样；语义对等但不强求整文件字节相同。
- 当前 plan-fast 的 read/write conflict、worker receipt、全员汇合、fallback 和失败收敛合同无回退。

**focused validation：**

```powershell
node --test --test-name-pattern="ordinary approval reference" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**验证并行性：** 不可并行；reference 依赖已冻结的 Skill 公共语义，并共享 parity 门禁。

**依赖：** T2。

**失败保留／回滚：** 保留精确失败；只撤销 T3 新增合同，不覆盖 T2 或 plan-fast 当前基线。宿主语法串线、职责重复或 parity 失败时 blocked。

**主 Agent 责任：** 逐文件记录 before-hash，人工核对宿主差异与职责边界；focused、parity 和 diff check 全绿后更新收据。

### 检查点 B：公共产品合同闭合

- 8 个 Skill 和 6 个 reference 对普通批准、系统 SHA、fresh-session、漂移恢复及高风险例外语义一致。
- Hook state 仍不是批准账本；plan-fast 调度与 worker 生命周期合同未退化。
- 普通批准不隐式执行或扩大权限，合法 action-scoped 授权保持独立。

### T4：同步三语言用户指南与文档校验器

**所属波次与启动条件：** W4；T3 completed 且检查点 B 全部成立。

**目标：** 向三语言用户提供无需 SHA 的普通批准示例、冲突恢复方式和高风险动作不被顺带授权的明确说明，并以稳定校验合同防止回归。

**读取范围：** T1 documentation RED、T2/T3 已通过产品合同、三语言现有 plan-fast 段落、guide parity validator。

**允许写入：**

- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `docs/USAGE.en.md`
- `scripts/validate-guide-parity.js`
- 主 Agent 对 todo 的原子状态事务

**共享可变资源：** 三语言工作流段和 guide parity；保留当前 plan-fast 文档改动，不修改 README。

**验收标准：**

- 每种语言均说明：唯一当前 spec/plan 可用普通明确自然语言批准；系统自行重读／重算，用户无需复制或确认 SHA；漂移时展示可读差异并重新请求普通批准。
- 文档给出至少一个自然批准例句，同时明确批准不隐式调用下一命令，不授权 auto、提交、推送、联网、费用、训练、外部写入、发布或部署。
- 文档说明只有已批准项目 SPEC 明确枚举的 action-scoped 高风险合同可保留 exact-set 授权，普通批准不能替代或扩宽它。
- `validate-guide-parity.js` 新增独立 `ordinaryApprovalContracts`（或等价独立数组），不把语义塞入既有 `planFastContracts`，不使用宽泛 SHA 禁词。
- T1 的逐 token mutation 能拒绝“必须用户回复 SHA 才继续”等完整危险语义，同时允许系统身份、否定说明和合法高风险 exact set。
- 三语言语义对等；当前 plan-fast 与其他指南合同保持 GREEN。

**focused validation：**

```powershell
node --test --test-name-pattern="ordinary approval documentation" work-products/tests/documentation-validator-contract.test.js
node scripts/validate-guide-parity.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**验证并行性：** 不可并行；三语言与 validator 必须作为一个对等切片完成。

**依赖：** T3。

**失败保留／回滚：** 保留 mutation 失败及语言差异；只撤销 T4 自己新增的段落／validator token，不回退当前 plan-fast 文档基线。任一语言缺失即 blocked。

**主 Agent 责任：** 记录四文件 before-hash；逐语言核对用户可读性、非扩权与高风险边界；focused 和 guide parity 同时 GREEN 后完成。

### T5：原子同步 5.0.24 并执行完整静态门禁

**所属波次与启动条件：** W5；T4 completed，所有普通批准合同 GREEN，工作区归属与版本 preflight 无漂移。

**目标：** 把同一未发布候选的六个版本事实面一次性从 `5.0.23` 同步为 `5.0.24`，更新 SPEC/todo 当前候选元数据，并完成 Hook 回归、插件校验、统一门禁和 diff 检查。

**读取范围：** 全部已修改产品／测试／文档、当前 SPEC/todo、六个版本事实面、mode-policy Hook 回归、统一验证器、共享 plan-fast debug 证据。

**允许写入：**

- `Claude/.claude-plugin/plugin.json`
- `Claude/.claude-plugin/marketplace.json`
- `Codex/.codex-plugin/plugin.json`
- `Claude/scripts/validate-plugin.js`
- `Codex/scripts/validate-plugin.js`
- `work-products/tests/workflow-contract.test.js`（测试名与 `expectedVersion`）
- `work-products/SPEC.md`（仅当前候选版本／完成元数据，不改批准语义）
- 主 Agent 对 `work-products/todo.md` 的原子版本与任务状态事务

**共享可变资源：** 发布版本身份与中央 workflow contract；主 Agent 串行独占。

**验收标准：**

- 六个发布事实面精确为 `5.0.24`：Claude manifest、Claude marketplace、Codex manifest、两宿主 validator 断言、workflow release test 的名称与 expectedVersion。
- SPEC 当前候选元数据变为 `5.0.24`，不改写已批准产品决定；todo 当前产品候选与 T5 完成收据同一原子事务更新。
- workflow release test 不重新引入活动 plan/todo 读取；不得修改已批准后不可变的 plan。
- 8 Skill、6 reference、三语言、approval mutation、plan-fast execution、历史 `--contract-only`、OpenClaw 和版本校验全部通过。
- 既有 `mode-policy-contract.test.js` 继续证明 plan 原始字节变化使 Hook freshness fail closed；Hook 源码与测试逻辑均不修改。
- `node scripts/validate-all.js` 全绿，`git diff --check` 退出 0；只报告实际门禁阶段和测试数，不硬编码预期总数。
- 结果只证明仓库静态／自动化候选。已安装 5.0.23 cache、当前会话、fresh host、真实宿主自动调度与生产状态继续标记未验证；不重装、不登记、不调用模型、不发布。

**focused validation：**

```powershell
node --test --test-name-pattern="release metadata" work-products/tests/workflow-contract.test.js
node --test work-products/tests/mode-policy-contract.test.js
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
git -c safe.directory=C:/Code/UXUCode status --short
```

**验证并行性：** 不可并行；版本事实与最终证据必须来自同一稳定工作树。

**依赖：** T4。

**失败保留／回滚：** 任一版本面或门禁失败时保留失败证据并将 T5 blocked；把本任务已改的版本字面量作为一个原子切片恢复至 T5 before-image，不触碰 T1–T4、共享 plan-fast 基线、SPEC 批准语义或历史收据。不得发布部分升版候选。

**主 Agent 责任：** 原子记录全部版本文件 before-hash，核对六面同步和 SPEC 元数据边界；亲自运行完整门禁、复核 diff／status，并只在全部 GREEN 时完成 T5。

## 4. 迁移、兼容与回滚

- 已完成且当前身份一致的普通批准继续有效，不因升级失效；历史收据、审计证据和会话记录不改写。
- 活动下游合同若仍要求普通 spec/plan 阶段由用户回复 SHA，报告 `legacy contract conflict`，在该项目内另行 `@spec`／`@plan` 修订后再继续；UXUCode 不自动修改下游，也不增加旧文本兼容、别名、双读或回退。
- 已批准项目 SPEC 直接枚举的 action-scoped 高风险 exact-set／exact-SHA 收据继续有效，严格维持原 action_id、exact set、失效与不授权范围；本计划不降低 AShare 等项目的训练、outer、云端或 no-retry 安全门。
- 任务失败只回滚该任务自己引入的行或版本切片；不使用 `git reset --hard`、`git checkout --`，不覆盖用户或并发任务改动。必要时以任务开始时记录的 before-hash 和人工补丁恢复。
- 旧的已完成 plan/todo 不另建归档副本；Git 历史保留其字节与收据。当前新 plan/todo 是唯一活动过程事实源。

## 5. 完成门

- [ ] T1–T5 全部 `completed`，每项 before-hash、focused validation 和终态收据可复核。
- [ ] 普通 spec／plan 批准不要求用户查看、复制或复述 SHA，且无固定句式／关键词 parser。
- [ ] 系统仍自行重读、重算并 fail closed；fresh session 复用有效持久收据，Hook 只做 freshness。
- [ ] 普通批准不扩权；合法 action-scoped 高风险授权不被降级或泛化。
- [ ] Claude/Codex、六个 reference、三语言和六个版本事实面一致，当前 plan-fast debug 合同无回退。
- [ ] 统一门禁与 `diff --check` 全绿；仓库源码证据与 cache、fresh host、真实宿主、生产证据明确分层。
- [ ] 未提交、推送、安装、登记、联网、付费、发布或部署。
