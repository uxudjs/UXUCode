# 实施计划：UXUCode `plan fast` 安全并行规划

状态：已批准（2026-08-16；用户明确批准 `@debug` 修订版依赖与状态镜像合同）

计划生成基线版本为 `5.0.19`。
批准实施目标候选版本为 `5.0.20`。

执行策略：serial
fast 请求：否
安全并发上限：1
串行原因：本计划由当前已安装的 UXUCode 5.0.19 普通 `@plan` 生成；尚未交付的 fast 调度能力不能用于自举本次实现。

本计划依据 2026-08-16 已批准并补充“部分完成波次重入”及“持久化执行状态”合同的 `work-products/SPEC.md`。本次 `@debug` 修订已由用户于同日重新批准，替代原批准字节与旧 Plan SHA-256；批准后的 plan 保持不可变，todo 是唯一原子运行状态账本。计划批准后只授权显式 `@build` 按任务修改仓库；不授权安装、缓存更新、提交、推送、发布或部署。三次零历史质疑循环已经完成并达到上限；本版吸收全部已核实发现，不再启动第四轮。

## 1. 规划依据与边界

### 1.1 已批准产品决定

1. `fast` 是 `plan` 的精确小写首参数，不增加新命令、`--fast` 或自然语言别名；
2. 不增加 `build fast`；普通 `build` 在有效 fast 计划中执行下一安全波次，`build auto` 才跨波连续；
3. 主 Agent 独占计划、待办和共享集成文件；运行时只能降低并发；
4. 实现完成后的下一仓库候选为 `5.0.20`；
5. 部分完成波次重入时不重跑已完成任务；重新验证后只调度仍然就绪的未完成任务，整个波次及串行屏障通过前不解锁下游。
6. 批准后的 plan 保持不可变；todo 是唯一原子运行状态账本，worker 启动前记录 attempt／写集基线，状态或归因不清时零 worker `BLOCKED`。

目标、接口、任务字段、冲突规则、重入状态机、授权边界、回滚和可衡量验收标准均已明确，不再存在需要实现者自行选择的产品语义。

### 1.2 当前证据

- 当前 Claude／Codex `plan` Skill 没有参数合同；普通 `build` 一次只做下一任务，只有 `build auto` 连续执行；
- 两宿主 Prompt router 已通用保留首行内联参数与多行正文，预期只需回归测试；只有 RED 证明相反时才修改 Hook；
- `scripts/validate-skill-parity.js` 约束两宿主 Skill／reference；`scripts/validate-guide-parity.js` 约束三语言指南；
- 替换 plan/todo 前的 focused workflow contract 为 32／32，统一静态门禁为 12／12；这些只证明 5.0.19 仓库源码；
- 当前 `work-products/tests/workflow-contract.test.js` 仍从实时 plan/todo 读取历史任务 17／18，并要求三份 planning facts 都携带可变的当前候选句。不可变 plan 写入后，host-lifecycle 与 release metadata 各形成一个可归因 RED；T1 必须同时解除历史编号耦合，并把版本合同改为“plan 固定记录生成基线／批准目标，SPEC／todo 与发布表面记录当前产品候选”。

### 1.3 执行与授权边界

- 本轮 `@spec` 只更新了获批重入／状态合同；本轮 `@plan` 只更新 plan/todo，不修改产品源码或持久测试；
- 当前 5.0.19 自举期间，主 Agent 在选择任务前必须先校验显式状态与派生复选框，不得仅按未勾选任务选择；普通 `@build` 按 todo 顺序一次执行一个任务，只有显式 `@build auto` 可连续串行自举，并仍须停止在外部授权门；
- 计划批准后 `work-products/plan.md` 只读；主 Agent 在启动任务前以 todo 原子记录 attempt、`in_progress` 与写集基线，只有收据通过才转 `completed`；任何状态或归因不清均零 worker `BLOCKED`；
- 任务复选框是显式状态的派生镜像，必须与状态在同一次 todo 原子替换中更新：仅 `completed` 使用 `[x]`，`pending | in_progress | blocked` 使用 `[ ]`；任一不一致均属于账本结构错误并零 worker `BLOCKED`；
- 每项开始前核对 `git status --short` 与相关 diff，保留用户新增改动；范围漂移即停止；
- 新测试与 host 证据只放在 `work-products/tests/`；测试产物对仓库文件的引用必须从其最终目录使用相对路径；
- 复用 Node.js 标准库，不增加依赖，不创建 worktree、分支或提交；
- 不新增第 18 个公开命令，不修改 OpenClaw 命令面；
- 任务 T8 涉及仓库外登记、缓存和 fresh host；没有对 T7 精确 preflight 的另行授权时必须停止。

## 2. 依赖图与安全并行评估

```text
T0 仓库 before-image／dirty ownership 收据
  -> T1 历史证据与可变版本断言解耦
       -> A0 planning facts 可替换
            -> T2 fast RED、状态崩溃矩阵、router 与 fixture
                 -> T2R router 基线分类／条件修复
                      -> T3 plan + planning reference
                           -> T4 build + orchestration
                                -> T5 help + 三语言 + validator
                                     -> 检查点 B -> T6 版本同步 -> T7 本地候选／preflight -> 外部授权门 -> T8 host smoke
```

### 2.1 未来 fast 候选组 C1

T2R 完成后，T3、T4、T5 的编辑写集互不重叠。T2 必须为三者创建互斥测试前缀，并证明每个 focused 命令只读取本任务拥有的产品表面：

- T3：`plan-fast plan contract:`，只读取 plan Skill 与 planning reference；
- T4：`plan-fast build contract:`，只读取 build Skill 与 orchestration reference；
- T5：`plan-fast help contract:`／`plan-fast docs contract:`，只读取 help、三语言与 guide validator。

`scripts/validate-skill-parity.js`、完整 workflow contracts、guide parity 与 diff check 会读取多个候选写集，只能在三项结束后的主 Agent 屏障串行运行。若 T2 无法证明 focused 读集互斥，则 C1 只允许编辑并行，所有验证移到屏障；若编辑也存在新冲突，则完全串行。

### 2.2 本轮仍然串行

本计划不是 fast 计划。T3、T4、T5 只是用于证明产品未来可表达的安全候选组，本轮按 T3 → T4 → T5 串行执行。T0、T1、T2、T2R、T6、T7、T8 写中央合同、版本事实、状态证据或外部宿主状态，必须串行。批准后的 plan 不再更新；任何 worker 都不得写 plan/todo，也不得与主 Agent 的 todo 原子事务并发。

## 3. 实施任务

### T0：冻结仓库实施前 before-image 与 dirty ownership

**所属波次与启动条件：** S0；计划获批后首先串行执行，并先在 todo 原子记录 T0 attempt。

**目标：** 在首次产品／测试写入前，为 T1、T2、T2R、T3–T8 的全部仓库写目标建立真实、可重算且保留既有 dirty 归属的恢复基线。

**读取范围：** 本计划全部允许写入路径、`git status --short`、逐路径 diff／未跟踪状态、plan 摘要与 todo 的 T0 pre-attempt 字节摘要。

**允许写入：** `work-products/tests/plan-fast-repository-prestate/`、`work-products/tests/verify-plan-fast-repository-prestate.js`，以及主 Agent 对 todo 的原子状态事务。

**共享可变资源：** 全部后续仓库写集的 before-image；主 Agent 串行独占，不读取或写入用户级宿主状态。

**验收标准：**

- manifest 对每个计划写目标记录最终位置相对路径、存在性、类型、原始字节 SHA-256、Git diff／未跟踪归属；目录边界展开完整文件集合，既有文件保存 byte-identical before-image；
- 记录批准 plan 的 SHA-256 与 todo 在 T0 attempt 原子提交前的 SHA-256；plan 本身不复制、不改写，todo 后续只保留状态／收据历史；
- 校验器拒绝缺失、额外文件、哈希漂移、路径逃逸、链接／realpath 逃逸和 manifest 不一致；若既有用户 dirty 与后续写目标重叠且没有明确保留策略，T0 返回 `BLOCKED`；
- T0 自身 artifact 根不递归纳入恢复目标；完整功能回滚恢复 T1–T8 产品／测试／文档／版本字节，但保留不可变 plan、todo 回滚收据和可验证证据。

**focused validation：**

```powershell
node work-products/tests/verify-plan-fast-repository-prestate.js
git -c safe.directory=C:/Code/UXUCode diff --check
git -c safe.directory=C:/Code/UXUCode status --short
```

**验证并行性：** 不可并行；建立所有后续任务共同依赖的恢复事实。

**依赖：** 无。

**失败保留／回滚：** 校验失败时保留可归因 manifest／收据并 `BLOCKED`；只有确认不再需要恢复证据时，才移除 T0 自建且经路径校验的 artifact 根，不触碰任何被盘点目标。

**主 Agent 责任：** 原子写 T0 attempt，核对完整写集／dirty ownership／链接边界，验证收据后才将 T0 转为 completed；批准后的 plan 不变。

### T1：解除历史证据与不可变 plan 的可变版本断言耦合

**所属波次与启动条件：** S1；T0 completed 且 repository prestate 校验通过。

**目标：** 让历史任务 17／18 只绑定持久报告，并让版本合同区分不可变 plan 的生成基线／批准目标与可变的当前产品候选。

**读取范围：** `work-products/tests/workflow-contract.test.js`、`work-products/tests/host-lifecycle-measurement.md`、`work-products/plan.md`、`work-products/todo.md`。

**允许写入：** `work-products/tests/workflow-contract.test.js`

**共享可变资源：** 中央 workflow contract；主 Agent 串行独占。

**验收标准：**

- host-lifecycle 测试只从持久报告验证 LF／CRLF、任务 17／18 结论与证据边界，不再读取当前 plan/todo 的历史编号；
- release metadata 继续约束当前 manifest、validator、SPEC 与 todo 的 `5.0.19` 身份，同时要求不可变 plan 固定记录生成基线 `5.0.19` 与批准目标 `5.0.20`；后续 T6 不需要改写 plan；
- 不修改原始 host-lifecycle 报告。

**focused validation：**

```powershell
node --test --test-name-pattern="release metadata|host lifecycle" work-products/tests/workflow-contract.test.js
```

**验证并行性：** 不可并行；写中央合同。

**依赖：** T0。

**失败保留／回滚：** 只按 T0 before-image 撤销 T1 引入的测试改动并保留已知 RED；不得改写 plan 或把 todo 恢复为伪初始状态，todo 只追加原子失败／回滚收据。

**主 Agent 责任：** 核对只修改允许文件，记录 RED→GREEN，并通过 todo 原子事务更新 T1 状态。

### 检查点 A0：planning facts 可安全替换

- host-lifecycle 不再读取当前 plan/todo 的历史任务编号；
- release metadata 已区分不可变 plan 与可变当前候选；
- T0 repository prestate 收据保持可重算。

### T2：建立 fast 合同 RED、无效元数据矩阵、路由回归与 fixture

**所属波次与启动条件：** S2；T1 GREEN 且检查点 A0 全部成立。

**目标：** 在产品 Skill 变更前锁定批准规格的完整输出字段、冲突判定、build 重入／降级、文档和失败语义。

**读取范围：** `work-products/SPEC.md`、双宿主 plan／build／help Skill 与 planning／orchestration reference、双宿主 Prompt router、三语言指南、README 与 guide validator。

**允许写入：**

- `work-products/tests/workflow-contract.test.js`
- `work-products/tests/mode-policy-contract.test.js`
- `work-products/tests/documentation-validator-contract.test.js`
- `work-products/tests/fixtures/plan-fast/parallel.md`
- `work-products/tests/fixtures/plan-fast/serial.md`
- `work-products/tests/fixtures/plan-fast/partial.md`
- `work-products/tests/fixtures/plan-fast/path-collisions.md`
- `work-products/tests/fixtures/plan-fast/state-crash.md`

**共享可变资源：** 三个中央合同测试；本任务串行独占。fixture 内仓库文件引用必须从各自最终目录计算相对路径。

**验收标准：**

- RED／mutation 逐项覆盖稳定唯一任务 ID、目标／验收、依赖、读写范围、共享资源、focused 命令及并行标志、失败保留／回滚、波次／启动条件、主 Agent 集成责任、执行策略、并发上限、屏障和串行原因；
- 无效 fast 矩阵覆盖缺字段、重复 ID、未知依赖、依赖环、任务落入多个波次、plan/todo 不一致、任务复选框／显式状态不一致与波次宽度超过上限；路径 mutation 逐项覆盖规范化、Windows 大小写别名、祖先／后代、symlink／realpath、生成目标别名，以及共享 lock／cache／临时目录；
- 行为 mutation 逐项覆盖生产者—消费者、worker 写 plan/todo、嵌套 worker、无条件并行、运行时缩容、越界失败、`FAST`／别名／非首参数；无法可靠解析路径或共享状态时必须串行；
- 仅当结构错误不涉及状态／归因、todo 状态合法、写集仍等于基线且唯一安全下一任务明确时，才断言主 Agent 单任务降级、报告原因并启动零个 worker；无法唯一确定时 `BLOCKED` 且零 worker；
- state-crash fixture 覆盖 worker 写完但完成事务未提交、遗留 `in_progress`、todo 原子替换中断、plan/todo 不一致、before-hash 漂移、收据缺失与改动归因不清；全部断言零 worker `BLOCKED`，不得自动重跑或串行 fallback；
- partial fixture 断言已完成任务不重跑、未完成任务重入前重新验证、屏障前下游保持锁定；
- router 回归证明两宿主原样传递精确 `plan fast` 与正文，普通 `plan` 不变；当前即通过则记录 GREEN，不制造伪 RED；
- 三组实现测试使用互斥前缀并证明 focused 读集；parallel／serial／partial／path-collisions／state-crash fixture 均可归因。

**focused validation：**

```powershell
node --test --test-name-pattern="^plan-fast " work-products/tests/workflow-contract.test.js work-products/tests/mode-policy-contract.test.js work-products/tests/documentation-validator-contract.test.js
```

产品变更前，缺少 Skill／reference／文档合同的断言必须精确 RED；router 基线和 fixture 自检可以 GREEN。

**验证并行性：** 不可并行；创建后续共享合同与 fixture。

**依赖：** T1。

**失败保留／回滚：** 移除 T2 新增断言与 fixture，不触碰 T0／T1；若 RED 归因不清，保留现场并阻塞 T2R–T5。

**主 Agent 责任：** 冻结测试名称／读集，记录每类 RED 与既有 GREEN，只通过 todo 原子事务更新 T2 状态；批准后的 plan 不变。

### T2R：分类并在必要时最小修复双宿主 Prompt router

**所属波次与启动条件：** S2R；T2 router 回归已运行并能精确区分 GREEN 与 RED。

**目标：** 让后续实现始终建立在“router 原样传递 fast／正文”的已验证事实上；当前行为若已 GREEN 则形成 no-op 收据，若精确 RED 则成对最小修复。

**读取范围：** T2 的 `plan-fast router contract:` 结果、`Claude/hooks/uxu-prompt-router.js`、`Codex/hooks/uxu-prompt-router.js`。

**允许写入：** 仅在 router focused RED 时写 `Claude/hooks/uxu-prompt-router.js` 与 `Codex/hooks/uxu-prompt-router.js`；GREEN 时产品写集为空，仅更新 todo 收据。

**共享可变资源：** 双宿主路由语义；必须串行成对处理。

**验收标准：**

- 精确 `plan fast`、内联正文、LF／CRLF 多行正文按原字节语义传给 plan Skill；普通 plan 不变；router 不解释 fast 产品语义；
- 若基线 GREEN，记录两文件 SHA-256 与 no-op 收据且不改源码；若 RED，只做使 focused 回归 GREEN 的双宿主最小修改；
- 未知命令、非法标点、mode／clean 严格参数和普通 prompt 的既有拒绝／静默合同无回归。

**focused validation：**

```powershell
node --test --test-name-pattern="^plan-fast router contract:|multiline routes|unknown and illegal|punctuation suffixes|mode route|clean rejects" work-products/tests/mode-policy-contract.test.js
```

**验证并行性：** 不可并行；冻结 T3–T5 共同依赖的输入边界。

**依赖：** T2。

**失败保留／回滚：** GREEN no-op 无产品回滚；RED 修复失败时保留现场并阻塞 T3–T5，完整功能回滚用 T0 before-image 成对恢复两 router。

**主 Agent 责任：** 验证条件分支、双宿主实际写集与 SHA-256，只更新 todo 状态，不改 plan。

### T3：实现 `plan fast` 与 canonical planning contract

**所属波次与启动条件：** S3；T2R completed。属于未来 fast 候选组 C1，本轮串行第一项。

**目标：** 让两宿主 plan Skill 识别精确 `fast` 首参数，并生成可由 build 安全消费的完整 fast 计划。

**读取范围：** 规格第 2–5 节、T2 的 `plan-fast plan contract:` RED、双宿主 plan Skill与 planning reference。

**允许写入：** `Claude/skills/plan/SKILL.md`、`Codex/skills/plan/SKILL.md`、`Claude/references/workflows/planning-and-task-breakdown/SKILL.md`、`Codex/references/workflows/planning-and-task-breakdown/SKILL.md`。

**共享可变资源：** 无；两宿主配对文件必须在同一任务内保持语义／字节对等。

**验收标准：**

- frontmatter 与正文公开精确 `[fast]`；仅首参数启用，默认 plan 行为不变；
- 计划级输出含执行策略、fast 请求、并发上限和串行原因；每项任务含稳定唯一 ID、目标／验收、依赖、读写范围、共享资源、focused 命令及并行标志、失败保留／回滚、波次／启动条件和主 Agent 责任；批准后的 plan 不可变；
- todo 镜像 plan ID／波次／依赖并初始化唯一 `pending` 状态与 plan SHA-256；任务复选框只作为显式状态的派生镜像并与状态原子更新，不复制冲突逻辑、不创建第二状态文件；
- 波次含就绪任务、上限、冻结项、可并行编辑／验证、串行屏障和解锁条件；同文件、路径包含、生成关系、共享状态与逻辑依赖阻止并行，不机械拆分任务。

**focused validation：**

```powershell
node --test --test-name-pattern="^plan-fast plan contract:" work-products/tests/workflow-contract.test.js
```

**验证并行性：** 只有 T2 证明该命令不读取 T4／T5 写集时，未来 C1 中可并行；本轮串行。

**依赖：** T2R。

**失败保留／回滚：** 失败时保留可归因现场并阻塞后续；不要仅恢复 plan producer 后继续其他切片。完整功能回滚按第 5 节原子执行。

**主 Agent 责任：** 核对双宿主 parity、实际写集和 focused 读集，只通过 todo 原子事务更新 T3 状态。

### T4：实现 `build` 波次消费、部分重入、屏障与降级

**所属波次与启动条件：** S4；T2R completed 且 T3 已完成本轮串行自举。属于未来候选组 C1。

**目标：** 让两宿主 build Skill 安全消费有效 fast 计划，并在无效元数据、部分完成与工作区漂移时 fail closed。

**读取范围：** 规格第 5–6 节、T2 的 `plan-fast build contract:` RED、双宿主 build Skill、orchestration reference 与 builder role prompt。

**允许写入：** `Claude/skills/build/SKILL.md`、`Codex/skills/build/SKILL.md`、`Claude/references/orchestration-patterns.md`、`Codex/references/orchestration-patterns.md`。

**共享可变资源：** 无；不得修改 builder role prompt，除非新增 RED 证明现有边界不足并先修订计划。

**验收标准：**

- 普通串行计划仍一次做下一任务；有效 fast 计划下普通 build 只做下一波，`auto` 才跨波；
- 主 Agent 重算依赖、写集、共享资源、diff、任务状态和运行时容量，只能降并发；批准后的 plan 只读，todo 是唯一原子状态账本；worker 单任务、精确边界且不可嵌套；
- 部分完成重入只调度仍就绪的未完成任务，不重跑完成任务，全部任务与屏障通过前不解锁下游；
- worker 启动前 todo 原子记录 attempt、`in_progress`、before-hash／diff 归属，并同步派生任务复选框；写集与 focused 收据通过后才 completed；复选框／状态不一致、遗留 in-progress、账本／结构不一致、写集漂移或归因不清均零 worker `BLOCKED`；
- 只有不涉及状态／归因的 fast 结构退化且唯一安全下一任务明确时，才报告降级并由主 Agent 单任务执行；冲突／越界／失败不 reset 或覆盖用户改动。

**focused validation：**

```powershell
node --test --test-name-pattern="^plan-fast build contract:" work-products/tests/workflow-contract.test.js
```

**验证并行性：** 只有 T2 证明不读取 T3／T5 写集时，未来 C1 中可并行；本轮串行。

**依赖：** T2R、T3。

**失败保留／回滚：** 保留失败现场并阻塞 T5／检查点 B；不得只恢复 build 后声称无混合状态。放弃功能时按第 5 节完整回滚 producer、consumer 与公开合同。

**主 Agent 责任：** 验证零 worker 边界、todo 单文件事务、崩溃窗口、重入与实际写集，独占屏障和 todo 更新。

### T5：同步 help、三语言用法与 guide validator

**所属波次与启动条件：** S5；T2R completed 且 T4 已完成本轮串行自举。属于未来候选组 C1。

**目标：** 把精确 `plan fast`、不强制并行、部分重入、普通 build 下一波与 `build auto` 跨波语义作为三语言用户合同交付。

**读取范围：** 规格公开接口／重入／证据边界、双宿主 help、三语言指南、README、guide validator 与 T2 文档 RED。

**允许写入：** `Claude/skills/help/SKILL.md`、`Codex/skills/help/SKILL.md`、`docs/USAGE.zh-CN.md`、`docs/USAGE.zh-TW.md`、`docs/USAGE.en.md`、`scripts/validate-guide-parity.js`、`README.md`（仅当现有简要 plan/build 承诺与新语义冲突时）。

**共享可变资源：** 三语言结构与 guide validator definitions；本任务原子处理。

**验收标准：**

- 三语言准确展示 `/uxu-code:plan fast`／`@plan fast`，说明无安全并行时串行、部分重入不重跑已完成项，不新增命令或别名；
- help 区分 fast plan、build 与 build auto，说明 plan 批准后不可变、todo 是唯一状态账本、遗留 in-progress／归因不清会 BLOCKED，并保留 clean、路径和授权合同；
- guide validator 与 mutation tests 拒绝任一语言缺失或弱化安全／重入语义；README 仅在确有冲突时修改。

**focused validation：**

```powershell
node --test --test-name-pattern="^plan-fast help contract:" work-products/tests/workflow-contract.test.js
node --test --test-name-pattern="^plan-fast docs contract:" work-products/tests/documentation-validator-contract.test.js
node scripts/validate-guide-parity.js
```

**验证并行性：** 前两条只有在 T2 证明读集互斥时可进入未来 C1；guide parity 只在 T5 内串行。本轮全部串行。

**依赖：** T2R、T4。

**失败保留／回滚：** 保留可归因现场并阻塞检查点 B；完整回滚必须与 plan/build/reference/tests/version 一起执行。

**主 Agent 责任：** 核对三语言结构、条件 README 范围和双宿主 help parity，只通过 todo 原子事务更新 T5 状态。

### 检查点 B：组合行为合同

T3–T5 完成后由主 Agent 串行运行：

```powershell
node --test work-products/tests/workflow-contract.test.js
node --test work-products/tests/mode-policy-contract.test.js
node --test work-products/tests/documentation-validator-contract.test.js
node scripts/validate-skill-parity.js
node scripts/validate-guide-parity.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

全部通过才解锁 T6。失败只回到拥有对应写集的任务；检查点不是无边界集成修复任务。

### T6：原子同步 `5.0.20` 版本事实面

**所属波次与启动条件：** S6；T3–T5 完成且检查点 B 全绿。

**目标：** 在行为与文档合同完成后，把本优化原子提升为 5.0.20。

**读取范围：** 检查点 B、三个 manifest／marketplace、两个 validator、release-version contract、不可变 plan 的基线／目标字段、SPEC 与 todo 当前候选。

**允许写入：** `Claude/.claude-plugin/plugin.json`、`Claude/.claude-plugin/marketplace.json`、`Codex/.codex-plugin/plugin.json`、`Claude/scripts/validate-plugin.js`、`Codex/scripts/validate-plugin.js`、`work-products/tests/workflow-contract.test.js`、`work-products/SPEC.md`，以及主 Agent 对 todo 当前候选／T6 状态的一个原子事务；不得写 plan。

**共享可变资源：** 全部可变版本事实面与 todo 状态；主 Agent 串行独占。

**验收标准：** 六个发布版本表面、SPEC 与 todo 当前产品候选统一为 `5.0.20`；不可变 plan 仍准确记录生成基线 `5.0.19` 和批准实施目标 `5.0.20`，字节不变；release contract 不读取旧任务编号，也不要求 plan 携带可变当前候选。

**focused validation：**

```powershell
node --test --test-name-pattern="release metadata" work-products/tests/workflow-contract.test.js
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
```

**验证并行性：** 不可并行；共享版本事务。

**依赖：** T3、T4、T5、检查点 B。

**失败保留／回滚：** 同步失败时保留现场并 `BLOCKED`，不得孤立降版。若放弃功能，按第 5 节把行为、文档、测试与全部版本事实一起恢复；不得留下 5.0.20 行为却标 5.0.19。

**主 Agent 责任：** 串行更新产品版本事实；验证后以一次 todo 原子事务同步当前候选和 T6 completed，plan 始终只读。

### T7：形成本地候选、真实 pre-state 清单与精确 host preflight

**所属波次与启动条件：** S7；T6 GREEN。

**目标：** 完成统一本地门禁，准备静态回滚制品，并在任何外部写入前证明两宿主真实现状可被安全备份和恢复。

**读取范围：** T0–T6 diff／prestate、宿主安装文档、只读登记／缓存状态、plan-fast fixture、既有 lifecycle 与回滚证据。

**允许写入：** `work-products/tests/plan-fast-host-smoke.md`、`work-products/tests/plan-fast-host-artifacts/`、`work-products/tests/verify-plan-fast-host-artifacts.js`。

**共享可变资源：** 只读观察用户级登记／缓存；本任务不得写用户级状态。

**验收标准：**

- 统一 12 阶段门禁、目标合同与 diff check 全绿，diff 仅含批准范围；
- `UNEXECUTED` 报告分别记录 Claude／Codex 真实登记与 cache 的只读 pre-state：版本、规范化目标、文件集合、逐文件 SHA-256、来源关系与漂移结论；无法完整读取或归属不清即 `BLOCKED`；
- 5.0.19 静态回滚制品记录来源 Git SHA，manifest 覆盖两包每个相对路径与 SHA-256，拒绝缺失／额外／哈希漂移并运行两个包内 validator；
- preflight 列明 T8 的精确备份优先命令、备份目标、候选安装、费用上限、验证和双宿主恢复命令；仓库 5.0.19 制品只有在逐字节证明等同真实 pre-state 时才能作为恢复来源，否则必须恢复 T8 捕获的真实 pre-state；
- 明确区分仓库源码、静态回滚制品、真实 pre-state、安装 cache 与 fresh session。

**focused validation：**

```powershell
node work-products/tests/verify-plan-fast-host-artifacts.js
node work-products/tests/plan-fast-host-artifacts/5.0.19/Claude/scripts/validate-plugin.js
node work-products/tests/plan-fast-host-artifacts/5.0.19/Codex/scripts/validate-plugin.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
git -c safe.directory=C:/Code/UXUCode status --short
```

校验器必须重算文件集合／SHA-256，核对来源 Git SHA、两个 manifest、Claude marketplace 与包内 validator 身份；任一不一致即 `BLOCKED`。

**验证并行性：** 不可并行；形成统一候选与外部授权前置事实。

**依赖：** T6。

**失败保留／回滚：** 失败时保留可归因报告／manifest；只有全部证据已验证且明确放弃 preflight 时，才移除 T7 创建且经路径校验位于批准 artifact 根内的非恢复必要文件；不触碰产品源码或用户级状态。

**主 Agent 责任：** 只读核验真实 pre-state，确认所有外部命令、目标、影响、成本和回滚后停止并请求单独授权；`@build auto` 不能越过此门。

### T8：单独授权后备份真实 pre-state、安装候选并执行 fresh-host smoke

**所属波次与启动条件：** S8；T7 完成，用户批准精确外部命令／目标／费用／回滚，且执行前 pre-state 未漂移。

**目标：** 安全验证两宿主 5.0.20 的 fast 规划／构建行为，并保证任一失败都能把两宿主恢复到各自真实变更前状态。

**读取范围：** 获批 preflight、5.0.20 source/hashes、5.0.19 静态制品、真实 pre-state 清单及 parallel／serial／partial fixture。

**允许写入：** `work-products/tests/plan-fast-host-smoke.md`、`work-products/tests/plan-fast-host-artifacts/prestate/`、`work-products/tests/plan-fast-host-artifacts/runs/`、经批准的 Claude／Codex 用户级登记与 cache、经解析校验位于 `work-products/tests/.tmp/plan-fast-host-<id>/` 的一次性 fixture 工作区。

**共享可变资源：** 两宿主用户级登记、cache、fresh CLI 会话和模型费用；主 Agent 串行执行，不与其他外部操作并行。

**验收标准：**

- 任何候选写入前，重新核对 T7 pre-state；漂移即零写入 `BLOCKED`。随后先备份两宿主实际登记与 cache，验证完整文件集合、逐文件 SHA-256、路径边界与可恢复性；任一备份不完整不得安装任一宿主；
- 两宿主分别证明 fresh session 精确加载 5.0.20；parallel fixture 产生宽度 2 安全波次并遵守不相交写集／屏障，serial fixture 上限 1，partial fixture 不重跑完成任务且屏障前不解锁下游；默认 plan/build/auto 无回归；
- 任一宿主安装、验证或 fresh smoke 失败时，停止后续操作并把两宿主都恢复到各自捕获的真实 pre-state；成功宿主也恢复。恢复后重新核对登记／cache 文件集合与 SHA-256，并用 fresh session 验证身份；
- 每次运行先把 prompt、stdout／stderr、退出码、实际 diff、路径清单和逐文件 SHA-256 封装到 runs evidence 并验证；只有两个宿主全部通过且 evidence 包完整时才清理专用临时 fixture；
- 任一 smoke 或恢复失败时保留专用 fixture 或其 byte-identical 可验证快照、两宿主 pre-state 备份和恢复日志，停止清理并返回 `BLOCKED`；
- 只有两个宿主全部通过才保留 5.0.20 状态。报告分别记录 source、静态制品、pre-state、cache、fresh session、fixture、费用和最终 GO／NO-GO，并显式写 `Production: NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED`；fresh host 不得冒充生产证据。

**focused validation：** 使用 T7 获批的精确宿主命令；备份后和恢复后运行 artifact 校验器；结束时运行 `node scripts/validate-all.js` 与 `git diff --check`，把真实退出码写入报告。

**验证并行性：** 不可并行；两个宿主按获批顺序串行，便于失败归因与双宿主恢复。

**依赖：** T7、用户精确外部授权。

**失败保留／回滚：** 以 T8 捕获的真实 pre-state 为唯一默认恢复源；只有逐字节等价时才可使用仓库 5.0.19 制品。任一失败恢复两宿主并保持 NO-GO；恢复失败保留全部备份／现场并 `BLOCKED`。即使 T8 曾成功，后续 review／ship 决定放弃功能时也必须恢复两宿主各自 pre-state 并 fresh 验证。

**主 Agent 责任：** 独占外部变更、费用控制、双宿主备份／恢复、fresh-session 验证、报告和状态更新；worker 不得执行外部写入。

## 4. 检查点

### 检查点 A：规划事实源与 RED

- [ ] 历史 lifecycle 证据只由持久报告承载；
- [ ] fast 字段、路径／资源 mutation、状态崩溃矩阵、部分重入和互斥 focused 读集已有可归因 RED／基线 GREEN；
- [ ] T2R 已记录 router no-op GREEN 或完成精确条件修复；
- [ ] 当前 plan/todo 不保留旧任务伪兼容。

### 检查点 B：行为与文档 GREEN

- [ ] T3–T5 focused 与组合合同、skill parity、guide parity、diff check 全绿；
- [ ] Hook 保持 T2R no-op 字节，或条件修复已有 focused GREEN；
- [ ] 默认 plan/build/auto 无回归。

### 检查点 C：5.0.20 本地候选

- [ ] 六个发布版本事实面、SPEC 与 todo 当前候选为 5.0.20；不可变 plan 仍记录 5.0.19 基线／5.0.20 目标；
- [ ] 统一静态门禁 12／12，pre-state／rollback artifact 可重算；
- [ ] 没有安装、提交、推送、发布或部署。

### 检查点 D：真实宿主证据

- [ ] 只有取得 T8 精确授权后才执行；
- [ ] 两宿主 source、真实 pre-state、cache、fresh session 与 fixture 结果分别记录；
- [ ] 失败时两宿主均恢复真实 pre-state 并保持 NO-GO；成功时两宿主均证明 5.0.20；
- [ ] `Production: NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED` 明确记录，fresh host 不替代生产证据；
- [ ] 没有提交、推送、发布或部署。

## 5. 完整功能回滚合同

- 单任务失败默认保留可归因现场并阻塞下游，不以局部恢复制造 producer／consumer 或版本混合状态；
- 若决定放弃整个功能，主 Agent 先用 T0 收据核对当前 diff 归属，再从 byte-identical before-image 恢复 T1、T2、T2R 条件修改、T3–T7 的 Claude／Codex Skill、router、reference、help、三语言、validator、测试／fixture、SPEC 与全部产品版本事实；批准后的 plan 保持历史事实，todo 原子记录回滚收据而不伪装为初始 pending；
- 完整功能回滚撤销本计划全部产品／测试改动，包括 T1；任何路径出现 T0 后无法归因的用户重叠修改时停止并 `BLOCKED`，不得覆盖。不可变 plan、todo 收据和恢复证据保留；不增加双 schema、别名或兼容层；
- 凡 T8 曾写宿主，无论 smoke 失败、成功后 review／ship 否决或稍后放弃功能，都使用其捕获的两宿主真实 pre-state 恢复并 fresh 验证；不把仓库版本号或旧 cache 假设当成实际 pre-state；
- Codex CLI 更新可能清理旧版本缓存；执行前必须把上一版本复制为可校验的独立回滚制品，不能把缓存保留作为默认事实。

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 新计划替换触发历史任务断言 | 中 | T1 先把历史证据绑定持久报告 |
| prose 变绿但模型不按合同规划 | 高 | mutation 合同、三类 fixture、fresh-host 分层验证 |
| 无效元数据启动 worker | 高 | 结构矩阵；降级／BLOCKED 判断阶段均为零 worker |
| 部分完成任务被重复执行 | 高 | stable ID、重入重验、只调度未完成项、屏障锁定 |
| C1 focused 读集暗中重叠 | 高 | 互斥前缀与读集证明；否则验证移到串行屏障 |
| 三语言或双宿主漂移 | 高 | parity 与 mutation 组合门禁 |
| 版本先升或孤立降版 | 高 | T6 单事务；完整功能回滚覆盖行为、文档、测试与版本 |
| 静态 5.0.19 不等于真实 pre-state | 高 | T7 只读清单；T8 先备份两宿主实际状态并验证 |
| 一个宿主成功、另一个失败 | 高 | 任一失败把两个宿主都恢复各自真实 pre-state |
| 外部 smoke 越权或产生费用 | 高 | T7 精确 preflight，T8 独立授权和成本上限 |
| smoke／恢复失败时清理唯一现场 | 高 | 先封装 prompt／输出／diff／hash；只在全绿且证据包验证后清理 |

## 7. 非目标与完成边界

- 不创建新公开命令、兼容别名、worktree、分支或第三方依赖；
- 不把当前普通计划伪装为 fast 计划；
- 不在规划阶段实现测试或产品行为；
- 计划批准不自动运行 `@build auto`，也不授权安装、提交、推送、发布或部署；
- T7 本地 GREEN 只表示可请求 host smoke 授权；T8 完成后仍需显式 `@review`／`@ship`；
- 最终证据必须显式记录 Production 未授权、未执行、未验证；
- 当前未决产品问题为零。只需用户审批本计划的任务顺序、边界和证据门。
