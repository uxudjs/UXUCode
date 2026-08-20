# UXUCode 工作流规格：`plan fast` 与原始字节安全

状态：第 1—13 节已批准（2026-08-16 至 2026-08-17）；第 14 节“原始字节批准与执行基线”已按用户当前明确要求修订并批准（2026-08-20）

当前目标候选版本为 `5.0.25`。

第 14 节修订目标候选版本为 `5.0.25`；完成状态由第 14.8 节验收清单记录。

本规格定义 `plan` 的可选 `fast` 参数，以及 fast 计划被后续 `build` 消费时的并行执行合同。已完成工作的历史证据保留在 Git 历史；当前 `work-products/plan.md` 与 `work-products/todo.md` 不得继续向模型暴露过时任务或旧完整性字段。

2026-08-19 的 `@spec` 调用只更新规格，未修改 Claude／Codex 产品 Skill、Hook、reference、测试、文档、版本清单、安装缓存或宿主配置；用户随后另行调用 `@plan`，只授权生成新计划，仍不授权构建、提交、推送、发布或部署。

## 1. 目标与用户

### 1.1 目标

为 Claude Code 与 Codex 的 `plan` 增加精确可选参数 `fast`。用户选择 fast 后，规划器必须先建立依赖图、修改边界和共享资源边界，再把能够证明互不冲突的就绪任务组织成并行波次，使后续 `build` 可以缩短独立任务的总执行时间。

`fast` 表示“优先寻找安全并行机会”，不表示“必须并行”。当任务呈线性依赖、写集重叠、共享状态不可隔离、风险过高、宿主没有可用并行能力，或编排成本不值得时，规划器必须生成可解释的串行计划，不得为了显示并行而拆碎任务或制造子任务。

### 1.2 目标用户

- 希望通过 `/uxu-code:plan fast` 与 `@plan fast` 缩短后续构建耗时的用户；
- 审批 `work-products/plan.md` 与 `work-products/todo.md` 的维护者；
- 负责调度原生 Agent／子 Agent 并最终验证工作区的 `build` 主 Agent。

### 1.3 成功定义

成功不是计划中出现“parallel”或启动更多 Agent，而是：

1. 并行任务在依赖、仓库写路径和共享可变资源上均可证明独立；
2. 主 Agent 能从计划中确定启动顺序、并发上限、任务写入权限和波次屏障；
3. 任一安全条件不成立时自动缩减并发或串行执行；
4. 并行失败不会导致自动覆盖、重置、丢弃用户改动、错误完成标记或越权外部操作；
5. 默认 `plan`、默认串行计划和 `build auto` 的既有授权边界保持不变。

## 2. 公开接口

### 2.1 支持语法

Claude Code：

```text
/uxu-code:plan fast
<可选多行需求正文>
```

Codex：

```text
@plan fast
<可选多行需求正文>
```

接口规则：

- 只有 `plan` 的第一个参数精确为小写 `fast` 时启用 fast 规划；不推断 `FAST`、`parallel`、`quick`、标点变体或其他别名；
- `fast` 从规划需求正文中移除，后续内联文本和多行正文继续作为规划依据；
- 无参数 `plan` 保持当前行为；普通任务正文不得因包含“快”“并行”或 `fast` 非首参数而隐式启用 fast；
- 不新增 `build fast` 参数。`build` 是否并行只读取已批准计划中的明确执行策略；
- `fast` 不绕过 `plan` 的规格充分性、只读分析、批准、路径、测试或授权门禁。

### 2.2 前置条件与拒绝语义

- `plan fast` 与普通 `plan` 使用相同规划依据：已批准规格、充分 debug 证据或目标／范围／约束／验收标准完整的用户要求；
- 规划依据不足时照常停止并说明缺口，不得用并行设计掩盖需求歧义；
- Prompt router 必须原样传递 `fast` 与后续正文。若当前路由已经满足，只增加回归测试，不修改 Hook；
- fast 元数据缺失、自相矛盾或无法验证时，`build` 不得猜测并行关系。若下一任务顺序仍明确，则退回单任务串行并报告原因；否则返回 `BLOCKED`。

## 3. fast 计划输出合同

`plan fast` 仍只写：

```text
work-products/plan.md
work-products/todo.md
```

不得新建第二套计划文件、机器专属状态文件或兼容路径。所有计划内仓库路径均使用相对路径；计划测试文件只能位于 `work-products/tests/`。

### 3.1 计划级字段

`work-products/plan.md` 必须显式记录：

```markdown
执行策略：fast | serial
fast 请求：是
安全并发上限：<正整数>
串行退化原因：<仅在没有安全并行波次时填写>
```

- `执行策略：fast` 表示至少存在一个宽度大于 1 的安全并行波次；
- 没有安全并行机会时写 `执行策略：serial`、`安全并发上限：1` 和可复核原因；
- 安全并发上限来自依赖图与资源边界，不得虚构宿主可用槽位。运行时 `build` 可以降低并发，绝不能超过计划上限；
- `work-products/todo.md` 必须镜像任务 ID、波次、依赖和检查点，但不得另行定义冲突关系。

### 3.2 每项任务的必需字段

每个任务必须包含：

- 稳定且唯一的任务 ID；
- 完整目标与可独立验证的验收标准；
- 前置依赖任务 ID，或明确 `无`；
- 预期读取范围；
- 允许写入范围，优先列出精确仓库相对文件；使用目录范围时必须说明边界和原因；
- 共享可变资源，包括生成物、锁文件、数据库、端口、缓存、临时目录、外部服务和宿主配置；没有时明确 `无`；
- focused validation 命令及其是否可与同波次验证并行；
- 回滚或失败保留方式；
- 所属波次和该波次启动条件；
- 由主 Agent 独占的集成／状态更新责任。

示例结构只定义格式，不预先决定任何具体项目任务：

```markdown
### T2：实现独立切片 B
- 依赖：T1
- 波次：W2
- 允许写入：`src/b.js`、`work-products/tests/b.test.js`
- 共享可变资源：无
- 验收：切片 B 的 focused test 通过
- 验证：`node --test work-products/tests/b.test.js`（可并行）
- 回滚：仅撤销 T2 允许写入范围内由 T2 引入的改动
```

### 3.3 波次字段

每个并行波次必须记录：

- 波次 ID；
- 同时就绪的任务 ID；
- 计划安全并发上限；
- 启动前必须完成的依赖与合同冻结项；
- 波次内允许并行的编辑／验证，以及必须在屏障后串行运行的验证；
- 波次完成后的集成检查点和下游解锁条件。

### 3.4 结构事实源与运行状态账本

- 用户批准计划后，`work-products/plan.md` 是不可变的结构事实源；执行期不得改写任务、依赖、波次、边界或检查点，也不得用执行结果重算 plan；
- plan 在批准前固定记录“计划生成基线版本”和“批准实施目标候选版本”；后续版本同步不得改写 plan。当前产品候选由发布表面、SPEC 与 todo 状态报告，合同测试不得再要求不可变 plan 携带可变的当前候选句；
- `work-products/todo.md` 是唯一运行状态账本，镜像 plan 的稳定任务 ID／波次／依赖，并为每项任务保存精确 `pending | in_progress | completed | blocked` 状态；不得另建第二状态文件、journal 或兼容账本；
- todo 的每次状态变化必须由主 Agent 在同目录创建完整临时内容并以原子替换提交；不得通过分别改写 plan 和 todo 模拟双文件事务；
- plan/todo 的结构镜像不一致、未知状态、重复 ID、丢失任务、非法状态跳转或账本无法原子更新时，一律 `BLOCKED`，且启动零个 worker；不得使用普通串行 fallback。

### 3.5 attempt 与写集基线收据

主 Agent 在启动任何 worker 前，必须先把本次 attempt 持久写入 todo：

- 唯一 attempt ID、任务 ID、波次 ID 与状态 `in_progress`；
- 每个允许写入目标的规范仓库相对路径、`present-file | present-directory | missing` 状态、排序去重后的路径集合、attempt 独占且不可替换的原始字节快照引用，以及计划启动时该路径的 Git diff／未跟踪归属摘要；目录边界必须展开为完整后代集合；
- 任务开始前的候选 ID、依赖完成状态和共享资源检查结果；
- 完成后写入实际修改规范路径及其存在状态、focused validation 命令、退出码与输出摘要，再原子转换为 `completed`；失败则转为 `blocked` 或保留可识别的 `in_progress` 崩溃现场。

首次写入前必须流式逐字节复核现存文件，重新枚举目录完整后代集合，并确认计划为缺失的路径仍缺失且只能排他创建。任何字节、路径集合、类型、链接、别名、所有权或快照漂移均启动零个 worker 并返回 `BLOCKED`；不得用当前内容重建或替换既有基线。

若进程退出后遗留 `in_progress`、未完成任务的允许写集偏离其记录基线、收据缺失或改动无法归因，后续 `build` 必须启动零个 worker并返回 `BLOCKED`；不得自动重跑、把改动冒领为完成、或降为串行执行。只有明确的恢复／debug 流程重新建立可验证状态后才能继续。

规划器应优先采用以下形态：

```text
串行合同／基线冻结
  -> 并行波次 W1
  -> 主 Agent 串行集成与组合验证
  -> 并行波次 W2（如存在）
  -> 最终统一门禁
```

不得把“所有任务一次启动”作为 fast 的默认含义。

## 4. 并行资格与冲突判定

### 4.1 必须同时满足的并行条件

两个任务只有在以下条件全部成立时才可进入同一波次：

1. 两者所有依赖在波次启动前已完成；
2. 两者之间没有生产者／消费者、接口先后、迁移顺序或验证归因依赖；
3. 允许写入范围互不重叠；
4. 不会写入同一共享可变资源；
5. 各自可独立验收、失败和回滚，不要求另一个任务的未完成改动才能成立；
6. focused validation 不会竞争同一不可隔离的数据库、端口、缓存、临时目录、快照或生成物；
7. 两者均不需要尚未取得的外部环境、凭据、权限、费用、提交、推送、发布或部署授权；
8. 并行节省预期大于调度、上下文和集成开销。

### 4.2 一律视为写冲突的情况

- 两个任务写同一文件，即使声称修改不同段落；
- 一个任务写目录／祖先路径，另一个任务写其后代路径；
- 路径经规范化、大小写规则、链接解析或生成关系后指向同一目标；
- 两个任务都会改 lockfile、版本清单、CHANGELOG、共享 registry、共享 snapshot、统一入口或中央合同测试；
- 一个任务生成或格式化另一个任务正在编辑的文件；
- 两个验证命令会写同一非隔离状态；
- 一个任务改变另一个任务正在依据的接口、schema、fixture 或配置合同。

`work-products/plan.md`、`work-products/todo.md` 和并行执行状态始终由主 Agent 串行更新，子 Agent 不得写入。共享版本面、统一合同测试及跨切片集成文件优先放入波次后的主 Agent 集成任务，不通过“分配不同代码行”并行处理。

### 4.3 不为了并行而并行

以下情况必须保持串行或缩小波次：

- 依赖图只有一条有效路径；
- 独立切片不足两个；
- 任务虽写不同文件，但共享未冻结接口或外部状态；
- 拆分后无法独立验收，或只会增加重复读取、重复测试和集成成本；
- 需要数据库迁移、不可逆操作、高风险权限／支付／认证变更或单一发布状态切换；
- 宿主没有足够的原生并行能力，或运行时可用 worker 少于计划宽度；
- 工作区漂移使计划中的写集证明失效。

不得把一个内聚任务机械拆成“代码／测试／文档”三个并行任务；只有冻结合同后且三者能够真正独立验收时才允许拆分。

## 5. `build` 消费与执行合同

### 5.1 普通 `build`

- 普通计划或 `执行策略：serial`：保持现状，一次只完成下一个未完成任务；
- 已批准且有效的 fast 计划：一次执行下一个就绪波次；若该波次运行时只能安全启动一项，则只执行一项；
- 一个波次是 fast 计划中的最小执行单元，不代表其全部任务可以跳过独立验收。

### 5.2 `build auto`

- 普通计划：保持现有连续单任务语义；
- fast 计划：按波次连续执行，每个波次后必须等待全部 worker 返回并通过串行集成检查点，才可启动下一波次；
- 继续遵守现有停止条件：歧义、失败验证、高风险迁移、未验证外部依赖或未授权操作均立即停止后续调度。

### 5.3 主 Agent 调度职责

每个波次由一个主 Agent 单点协调：

1. 重新读取已批准计划和待办，确认依赖、任务状态与 fast 字段一致；
2. 检查当前 Git status／diff 和计划基线，保留用户已有改动；
3. 根据宿主实际可用 worker 数计算 `min(计划安全并发上限, 运行时可用 worker 数)`；
4. 给每个 worker 只下发一个任务，包含允许写入范围、禁止写入范围、依赖、验收与验证；
5. 禁止 worker 再启动嵌套 worker，避免失控调度和范围扩散；
6. 等待同波次全部 worker 结束，不以最先返回者提前解锁下游；
7. 核对实际修改路径没有越界或重叠，运行必须串行的组合验证；
8. 只有任务各自验收与写集收据通过后，才由主 Agent 原子更新 todo 状态；批准后的 plan 始终只读；
9. 在波次屏障完成前，不启动依赖该波次的任务。

`fast` 不自动创建 worktree、分支、提交或临时仓库。只有宿主原生隔离或共享工作区中的不相交写集足以证明安全时才并行；需要额外 Git 隔离时，必须把其影响和授权作为独立计划决定，而不是 fast 的隐式副作用。

### 5.4 运行时退化与失败处理

- 运行时并发能力不足、计划写集过时或新证据显示冲突时，主 Agent 可以缩减并发直至串行，并报告原因；不得扩大并行范围；
- worker 越过允许写入范围、出现实际写冲突或修改来源无法归属时，停止启动新任务，保留现场证据，不自动覆盖、reset、checkout 或删除改动，并返回 `BLOCKED`；
- 单个 worker 失败时，不启动依赖它的任务。其他 worker 的独立结果只有在各自验收通过且无范围冲突时才可标记完成；
- 并行编辑通过但共享验证失败时，波次保持未完成或部分完成，先定位归因，不以重跑全量测试掩盖失败；
- 用户在执行期间产生的新改动属于用户，不能被 fast 调度器吸收、覆盖或作为任务输出冒领。

### 5.5 部分完成波次的重入状态机

- 主 Agent 只把独立验收通过、实际写入未越界且与同波次其他结果无冲突的任务标记为完成；失败、未返回、未验证或归因不清的任务保持未完成，波次检查点保持未通过；
- 下一次 `build` 必须重新读取已批准 plan／todo，核对当前 diff、任务状态、依赖、允许写集、共享资源和运行时容量；不得沿用上一次执行时已经失效的并行证明；
- 重入只调度尚未完成且当前仍然就绪的任务，不重跑已完成任务，也不得把已完成任务的既有改动冒领为本次输出；
- 若剩余任务的并行条件仍成立，可按重新计算后的上限执行；若证明失效但下一任务唯一且顺序明确，则降为单任务串行并报告原因；若无法唯一确定安全下一任务，则返回 `BLOCKED`，且启动零个 worker；
- 只有该波次全部任务完成，并且主 Agent 串行组合验证与状态更新均通过后，波次检查点才完成并解锁下游；
- 重新验证或组合屏障失败时保留可归因现场，不自动覆盖、reset、checkout、删除或恢复用户与其他已完成任务的改动。
- `in_progress` 遗留、todo 事务不完整、plan/todo 结构不一致或写集基线无法重建属于状态／归因失败，只能 `BLOCKED` 且零 worker；不得套用“唯一下一任务明确”的串行降级。

## 6. 授权与安全边界

- `plan fast` 只授权规划，不授权业务代码、测试行为、版本、环境、外部系统或安装缓存变更；
- 规格批准只允许进入 `@plan`，计划批准后才可进入 `@build`；
- 并行不新增或合并权限。每个 worker 只能执行主 Agent 已获得授权且分配给该任务的动作；
- `build auto` 不绕过外部环境、费用、凭据、迁移、提交、推送、发布、部署或不可逆操作的独立授权门；
- 不能因并行 worker 已经启动而降低 RED→GREEN、focused regression、集成检查点、统一门禁或回滚要求；
- 静态合同、本地共享工作区、已安装缓存、fresh host session 与生产行为继续分别报告。

## 7. 实施范围

批准后的实施至少覆盖：

1. 双宿主公开 Skill：
   - `Claude/skills/plan/SKILL.md`、`Codex/skills/plan/SKILL.md`；
   - `Claude/skills/build/SKILL.md`、`Codex/skills/build/SKILL.md`；
   - `Claude/skills/help/SKILL.md`、`Codex/skills/help/SKILL.md`。
2. 双宿主内部合同：
   - `Claude/references/workflows/planning-and-task-breakdown/SKILL.md`；
   - `Codex/references/workflows/planning-and-task-breakdown/SKILL.md`；
   - `Claude/references/orchestration-patterns.md`、`Codex/references/orchestration-patterns.md`。
3. 持久合同与文档：
   - `work-products/tests/workflow-contract.test.js`；
   - `work-products/tests/mode-policy-contract.test.js`；
   - `work-products/tests/documentation-validator-contract.test.js`；
   - `docs/USAGE.zh-CN.md`、`docs/USAGE.zh-TW.md`、`docs/USAGE.en.md`。
4. 路由器仅在 RED 证明不能原样传递 `fast`／多行正文时修改；否则保持源码不动。
5. `README.md` 仅在其现有公开用法承诺受影响时修改，不机械复制三语言指南细节。

本功能完成后属于 UXUCode 行为优化，候选版本拟从 `5.0.19` 更新为 `5.0.20`，并原子同步：

- Claude manifest；
- Claude marketplace；
- Codex manifest；
- Claude validator；
- Codex validator；
- workflow release-version contract。

若实施证据表明不需要版本变化，必须先修订并重新批准本规格，不得静默省略仓库的优化升版合同。

## 8. 非目标

- 不新增 `fast` 独立公开命令、`build fast`、自然语言触发词或兼容别名；
- 不保证固定百分比的耗时下降；任务规模、宿主槽位和测试成本决定实际收益；
- 不强制为每个计划创建子 Agent、Agent team、worktree、分支或提交；
- 不允许并行 Agent 修改同一文件、同一中央状态或互相依赖的接口；
- 不把只读证据收集的并行自动扩大为业务代码并行；
- 不为 OpenClaw 新增 Claude／Codex 风格的公开 `plan`／`build` 命令；
- 不在本次 `@spec` 修改产品行为、过程计划、插件缓存或宿主登记；
- 不提交、推送、发布、部署或执行真实外部系统操作。

## 9. 测试策略

### 9.1 RED → GREEN 合同

实施前扩展现有持久测试，建立至少以下失败证据：

1. `plan` 尚未声明精确 `fast` 参数、输出字段与串行退化；
2. `build` 尚未定义 fast 波次、屏障和运行时缩减语义；
3. 规划 reference 尚未要求每任务写集、共享资源、波次与主 Agent 独占状态更新；
4. 双宿主 help／三语言指南尚未说明 `plan fast`；
5. 变异合同会错误允许同文件并行、依赖任务并行、worker 写 plan／todo、嵌套 worker 或无条件并行；并逐项覆盖路径规范化、Windows 大小写别名、链接／realpath、生成目标别名、祖先／后代路径、共享 lock／cache／临时目录、生产者—消费者、运行时缩容与越界失败；
6. 路由回归必须证明两宿主精确保留 `fast`、内联需求和多行正文，普通 `plan` 不受影响。
7. 状态 mutation 覆盖 worker 写完但完成标记未提交、遗留 `in_progress`、todo 原子替换中断、plan/todo 不一致、写集基线漂移和收据缺失；这些场景全部零 worker `BLOCKED`，不得自动重跑或串行 fallback。

GREEN 至少覆盖以下 fixture：

- 两个依赖已满足且写集、资源均不相交的任务进入同一波次；
- 写同一文件、祖先／后代路径、共享 lockfile 或共享测试状态的任务不进入同一波次；
- 文件不重叠但存在接口生产者／消费者关系的任务保持串行；
- 完全线性的任务图生成 `serial` 和原因，不创建伪并行组；
- 运行时 worker 数减少时只降低并发，不修改依赖图；
- 一个 worker 失败或越界后，下游不启动，成功结果不被自动覆盖或冒充全波次完成；
- 批准后的 plan 保持不可变；主 Agent 是 todo 运行状态的唯一写入者，worker 不得写任一 planning fact。
- attempt 在 worker 启动前原子记录，成功收据后才转 completed；崩溃窗口不会重跑或冒领已有改动。

### 9.2 本地验证命令

```powershell
node --test work-products/tests/workflow-contract.test.js
node --test work-products/tests/mode-policy-contract.test.js
node --test work-products/tests/documentation-validator-contract.test.js
node scripts/validate-guide-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

使用仓库既有 Node.js 与标准库，不新增第三方依赖。若新增 fixture 或 smoke 报告，只能放在 `work-products/tests/`，并从最终位置使用仓库相对路径。

### 9.3 T8 无模型证据审计

用户于 2026-08-17 明确要求不做 Claude 和 Codex 模型校验，审计合理即视为通过。该当前要求取代 T8 此前的 fresh-model 验收条件；历史 attempt、双轨规划、费用和失败恢复证据继续保留，但不再要求新模型调用、fresh session 或当前宿主安装来关闭 T8。

T8 仅在下列证据全部可复算时通过：

1. Claude／Codex 仓库源码均为 `5.0.20`；
2. attempt 04 的历史候选安装收据证明两宿主登记与 cache 曾为 `5.0.20`，且该阶段模型调用为 0；
3. attempt 04 隔离保全的两个候选包各 71 文件，与当前对应仓库源码逐路径、逐字节一致，包内 validator 独立通过；
4. plan／build／help／fixture focused 合同、workflow 回归、OpenClaw 回归、统一 12 阶段门禁和 `git diff --check` 通过；
5. attempt 05 的恢复收据证明 Claude 完整 user state、Codex config 与 Codex cache 相对 attempt pre-state 均为 0 delta。

机器合同固定在 `work-products/tests/plan-fast-host-artifacts/local-marketplace-identity-contract.json`，审计收据固定在其 `audits/T8-20260817-no-model-audit-01/audit.json`。本轮 Claude／Codex 模型调用数和模型费用均必须为 0，也不新增 registration／cache 写入。

审计 `PASS` 只表示本地 `5.0.20` 候选证据被接受；不得据此声称当前宿主已安装／加载 `5.0.20`、fresh runtime 已验证或生产已验证。最终报告必须保留 `Production: NOT AUTHORIZED / NOT EXECUTED / UNVERIFIED`。

## 10. 可衡量验收标准

- [ ] 两宿主支持精确 `/uxu-code:plan fast` 与 `@plan fast`，没有新命令或别名；
- [ ] 无参数 `plan` 和普通串行 `build` 的既有行为保持不变；
- [ ] fast 计划明确记录执行策略、安全并发上限、任务依赖、写入范围、共享资源、波次与检查点；
- [ ] 不存在安全并行机会时输出 `serial`、上限 1 和原因，不为并行机械拆分任务；
- [ ] 同文件、路径包含、生成关系、共享状态和逻辑依赖均阻止同波次执行；
- [ ] fast 计划下普通 `build` 只执行下一波次，`build auto` 按波次连续且每波都有屏障；
- [ ] 批准后的 plan 是不可变结构事实源，todo 是唯一原子运行状态账本；主 Agent 独占 todo，worker 不写 planning facts、不嵌套调度、不越过允许写集；
- [ ] 运行时只能降低并发；冲突、越界、失败或授权不足会停止下游且不覆盖、reset 或丢弃改动；
- [ ] 部分完成波次重入时只调度未完成任务、重新验证并行证明、不重跑已完成任务，并在全部任务和串行屏障通过前保持下游锁定；
- [ ] worker 启动前持久记录 attempt 与写集基线，成功收据后才 completed；遗留 in-progress、账本损坏或改动归因不清时零 worker BLOCKED；
- [ ] 并行不扩大提交、推送、安装、费用、环境、发布或部署授权；
- [ ] Claude／Codex Skill、reference、help 保持语义对等；
- [ ] 简体中文、繁体中文、英文文档作为同一验收边界；
- [ ] 完成实现时六个版本事实表面原子同步为批准的候选版本；
- [ ] 目标测试、统一 12 阶段静态门禁和 `git diff --check` 全部通过；
- [ ] 最终报告区分静态合同、本地工作区、历史候选 cache、未验证的当前宿主／fresh runtime 与生产证据。

## 11. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 计划只按文件名判断，遗漏逻辑依赖 | 高 | 同时建依赖图、接口冻结和共享资源图；任一不确定即串行 |
| 并行 Agent 修改同一中央文件 | 高 | 同文件永不并行；中央文件由主 Agent 在屏障后独占 |
| 测试命令争用缓存、端口或临时目录 | 中 | 计划标注验证资源；无法隔离时 focused edit 可并行、验证串行 |
| worker 越界或用户同时修改工作区 | 高 | 波次前后核对 status／diff；保留现场并 BLOCKED，不自动恢复或覆盖 |
| 任务很小，调度反而变慢 | 中 | 把编排成本纳入资格判断；收益不明确时串行 |
| 宿主并发槽位少于计划宽度 | 低 | 运行时取较小值，只降级不扩张 |
| `build` 波次语义被误解为自动连续执行 | 中 | 普通 `build` 只做下一波；只有 `build auto` 跨波连续 |
| 无模型审计被误报为当前宿主或真实并行能力 | 高 | 报告明确限定为候选证据 PASS，当前宿主／fresh runtime 保持未验证 |
| worker 写完但状态提交前退出 | 高 | plan 不可变、todo 单文件原子账本、attempt 独占原始字节 snapshot 与终态收据；不确定即零 worker BLOCKED |

## 12. 回滚与阶段边界（`plan fast` 历史合同）

- 若实现回滚，必须成对恢复 Claude／Codex 的 plan、build、help、planning reference、orchestration、三语言文档、合同测试和版本事实面，不保留半宿主或混合语义；
- 回滚不得通过增加旧／新 fast schema 双读、别名或兼容层完成；恢复为单一普通 plan/build 合同；
- 已生成的 fast 计划不是回滚授权。若当前 build 不再理解其合同，必须重新执行普通 `plan`，不得猜测执行；
- `@spec` 批准只授权进入 `@plan`；`@plan` 批准只授权后续明确 `@build` 范围；任何仓库外环境变更继续单独授权；
- 第 1—13 节实施时不得在规格完成前修改当时的 `5.0.19` 产品候选；只有获批计划的实现与回归完成后才形成当时的 `5.0.20` 仓库候选。此句只记录 `plan fast` 历史阶段，不覆盖文件顶部的当前候选。

## 13. 已批准决定（`plan fast` 历史合同）

批准本规格表示接受以下六项产品决定：

1. 使用精确首参数 `fast`，不采用 `--fast`、新命令或自然语言触发；
2. 不新增 `build fast`：普通 `build` 在 fast 计划中执行下一安全波次，`build auto` 才跨波连续；
3. 主 Agent 独占计划／待办和共享集成文件，运行时可随时降低为串行但绝不扩大并发；
4. 完成该优化时下一仓库候选版本为 `5.0.20`。
5. 部分完成波次重入时不重跑已完成任务；主 Agent 重新验证剩余任务，只调度仍然就绪的未完成任务，并在整个波次及屏障通过前保持下游锁定。
6. 批准后的 plan 保持不可变，todo 是唯一原子运行状态账本；worker 启动前记录 attempt 与写集基线，成功收据后才标记完成，任何状态或归因不清均零 worker `BLOCKED`。

用户已于 2026-08-16 批准上述六项决定。如需调整任一决定，应先修订本文件。当时随后调用的是 5.0.19 的普通 `@plan`，只生成实施计划，不直接实现，也未把尚未交付的 fast 能力冒充为当时会话能力。这里的版本与动作均为第 1—13 节历史事实；当前候选和待批准修订以文件顶部及第 14 节为准。

## 14. 普通批准与原始字节完整性（已批准并修订）

### 14.1 问题、目标与适用用户

旧合同把摘要字段写进计划批准、任务启动、worker 提示和终态收据。部分项目已明确以规范路径与原始字节为唯一执行基线，这些附加字段会在零写入时阻断首个任务，也会诱导模型把内部标识误作人类口令。

本节按用户 2026-08-20 的当前明确要求修订：UXUCode 的活动模型指引只使用一种原始字节协议，不提供可选基线模式，不要求用户或下游任务复制内部标识，也不在任务、attempt、before／after 证据、目录身份或 worker 收据中引入摘要字段。

目标不是降低漂移检测。系统必须用规范路径集合、存在状态、attempt 独占且不可替换的原始字节快照、流式逐字节比较、所有权和排他创建保持 fail closed。

### 14.2 单一协议与事实源

- `work-products/SPEC.md` 记录规格批准状态；`work-products/plan.md` 是批准后不可变的结构事实源；`work-products/todo.md` 是唯一可变执行账本。
- 不新增执行基线选择器、兼容别名、双读或从 prose 猜测协议；所有新计划和任务一律使用本节的原始字节合同。
- `.uxucode-state.json` 的 planId 只表示 session freshness，不是批准账本，也不得进入 task／attempt／worker receipt。
- plan／todo 结构镜像、候选、状态、snapshot 引用或所有权不一致时，必须 `BLOCKED` 并启动零个 worker；不得用串行 fallback 绕过。

### 14.3 普通批准的公共接口

当且仅当上下文中只有一个当前候选、候选已向用户展示或清楚概述、且此后没有发生字节变化时，`批准`、`批准当前规格`、`同意当前计划` 等整句语义明确的肯定表达均可完成语义批准；不得要求固定句式，也不得按单个关键词或正则命中直接判定。

用户的条件式、否定式、疑问式、引用／转述、要求先修改、要求继续审查或无法确定指向哪个候选的表达不构成批准。存在多个候选时，先用名称、版本、路径和可读差异消除歧义；用户主动附带的冲突标识只能视为目标冲突，不能静默改绑。

批准本身不隐式调用下一公开命令。`@spec` 批准仍只允许后续明确调用 `@plan`；`@plan` 批准仍只允许后续明确请求的 `@build` 范围。自然语言批准不会隐式授权 `@build auto`、提交、推送、联网、付费、训练、外部写入、发布或部署。

### 14.4 计划批准的原始字节合同

既有批准收据缺少 raw-byte approval snapshot 时，必须先执行第 14.6 节的一次性 legacy approval preflight；以下通用 snapshot 校验只适用于原本已有 snapshot 或已完成该预检迁移的批准。

- `@spec` 生成或实质修订规格时，将规格状态置为待批准；明确批准只更新既定批准元数据，后续实质变化恢复待批准。
- `@plan` 展示候选前，在 `work-products/debug/approval-baselines/<candidate-id>/` 以 create-new／no-replace 语义创建候选原始字节快照；todo 只记录 candidate ID、snapshot 引用、待批准状态与后续批准收据。
- 收到明确批准时，系统重新读取 plan 并与 snapshot 流式逐字节比较；相等且候选唯一时，原子更新 todo 的批准状态与收据，plan 随即不可变。
- fresh session 只有在当前 plan 与不可替换 snapshot 逐字节相等且收据完整时复用批准。任何字节、候选、snapshot 引用或收据漂移都必须展示可读差异，再请求普通自然语言批准。
- snapshot 已存在、缺失、被替换、归属不明或不可读取时，必须 fail closed；不得从当前 plan 重建既有候选的基线。

### 14.5 任务执行的原始字节合同

主 Agent 在任何本地执行或 worker 启动前，必须在 todo 的原子事务中记录 attempt ID、owner、排序去重后的规范路径集合、每路径 `present-file | present-directory | missing` 状态、snapshot root 与 `no_replace: true`。

snapshot root 必须优先使用已批准 plan 明列的 exact attempt／snapshot／baseline root，并保持在该任务 write scope 内。只有 plan 未声明 root 且既有批准 write scope 已明确允许标准位置时，才可使用 `work-products/debug/execution-baselines/<attempt-id>/`；不得为兼容计划新增 scope 外目录。root 必须以 create-new／no-replace 语义建立且由该 attempt 独占。现存普通文件保存精确原始字节；目录保存完整排序后的规范后代集合，并对每个普通文件保存精确原始字节；缺失路径只记录缺失状态。

每个目标首次写入前必须流式逐字节比较并重新枚举目录。任何同尺寸单字节变化、换行变化、空字节、增删改名、类型变化、链接或大小写别名、未计划后代、snapshot 丢失或替换、attempt／owner 不匹配、遗留 `in_progress` 都必须 `BLOCKED` 并启动零个 worker。缺失路径写入前仍须缺失，且只能排他 no-replace 创建。

worker 只接收一个任务、attempt、父级记录的原始字节基线、读写范围、验收标准与 focused validation。终态收据只包含 task ID、attempt ID、`completed | blocked`、实际变更规范路径及 present／missing 状态、验证命令与退出码、输出摘要、范围例外、blocker 或剩余工作。worker 不得写 plan、todo 或 baseline snapshot。

### 14.6 既有批准计划与高风险动作边界

- todo 的批准状态与批准收据是既有计划的批准事实源；不可变 plan 顶部遗留的旧待批准标签不得反向阻断。
- todo 顶层旧候选身份与旧批准收据可以只读保留。若批准收据尚无原始字节 approval snapshot，批准预检可以且只能一次读取旧顶层身份核对当前 plan，在 plan 已声明且 write scope 允许的 root 内原子创建 snapshot，并在任何任务启动前把引用写入 todo；旧身份绝不复制到 task、attempt、worker prompt、execution baseline 或 terminal receipt。
- 若既有已批准 plan 已完整声明原始字节与规范路径 capture／verify，且全部任务仍为 `pending`，则无需新增模式字段、修改 plan 或重新批准即可执行；缺少 approval snapshot 时只执行上述一次 todo-and-snapshot 写入。
- 旧身份缺失或冲突、收据不完整、无获批 root、snapshot 建立失败、核对后 plan 字节漂移，或缺少规范路径集合、存在状态、逐字节复核、owner／attempt、no-replace 中任一执行事实时，必须 fail closed 并启动零个 worker；不得从模糊 prose 推断。
- 已批准项目 `SPEC.md` 可以直接枚举独立的高风险 `action_id`、具体副作用、目标环境／账户、完整 exact input set、费用／时限、单次与重试语义、失效条件及明确不授权范围。普通批准不能替代或扩大该动作授权，plan／todo 也不得自行新增或扩宽动作。

### 14.7 实施范围与测试策略

实施必须同步 Claude／Codex 的 `spec`、`plan`、`build`、`help`、builder agent、`spec-driven-development`、`planning-and-task-breakdown`、`orchestration-patterns` 与直接相关 debugging 示例；同步简中、繁中、英文指南及其 validator；把当前发布候选的六个版本事实面原子更新为 `5.0.25`。

先建立可归因 RED，再完成最小 GREEN。持久回归至少覆盖：

1. 活动模型指引不含摘要算法术语或任务级摘要字段；
2. 普通批准只接受唯一候选的整句明确语义，不要求固定文本或内部标识；
3. plan 批准以 no-replace snapshot 与流式逐字节比较复用 fresh-session 收据；
4. task／attempt／worker 使用规范路径、存在状态、原始字节 snapshot、owner 与 no-replace，任一漂移零 worker；
5. 既有已批准 raw-byte plan 即使顶部残留旧待批准标签也以 todo 收据为准；旧顶层候选身份只读保留且不进入执行门；
6. 已完整声明 capture／verify 且全部任务 pending 的既有计划无需 plan 文件迁移、模式字段或重批；缺 approval snapshot 时只允许一次受 scope 约束的 todo-and-snapshot 写入；
7. 普通批准不扩权，高风险 `action_id` 仍只由已批准项目规格直接枚举；
8. Claude／Codex、三语言、版本事实面和统一静态门禁全部一致。

实现只修改当前 UXUCode 仓库，不读取或修改下游仓库，不改安装缓存、宿主配置或生产状态。Hook 内部 freshness 实现和冻结历史证据不是活动模型指引，本次不改其行为。

### 14.8 可衡量验收、风险与回滚

- [x] 普通 spec／plan 批准只需明确自然语言，不要求用户查看、复制或复述内部标识。
- [x] 活动 Skill、agent、reference、三语言指南、SPEC、plan 与 todo 不出现摘要算法术语。
- [x] plan 批准、fresh-session 复用与 task execution 都用不可替换 snapshot 和原始字节流式比较，漂移继续 fail closed。
- [x] task、attempt、worker prompt 与终态收据不记录或比较 plan、before、after 或目录摘要字段。
- [x] todo 旧顶层候选身份与批准收据可只读保留但不参与执行；既有完整 raw-byte 计划无需 plan 修改、模式字段或重批，缺失 approval snapshot 时仅做一次受 scope 约束的 todo-and-snapshot 迁移。
- [x] 普通批准不扩权；合法 action-scoped 高风险授权不被替代或泛化。
- [x] Claude／Codex 与三语言合同对等，六个当前发布版本事实面同步为 `5.0.25`。
- [x] `node scripts/validate-all.js` 与 `git -c safe.directory=C:/Code/UXUCode diff --check` 全绿。
- [x] 未提交、推送、安装、刷新缓存、联网、发布、部署或修改下游仓库。

主要风险是把删除摘要门禁误做成降低漂移检测。回归必须同时证明同尺寸字节变化、换行变化、空字节、路径增删改名、类型／链接／别名漂移、snapshot 替换、owner／attempt 不一致与 missing path 被抢占全部阻塞。若需回滚，必须成对恢复两宿主 Skill、agent、reference、三语言文档、测试和版本事实面，不得保留半宿主行为。

第 14 节修订由用户于 2026-08-20 明确要求并授权实施。该授权只覆盖当前 UXUCode 仓库的源码、测试、规格、活动工作流产物和版本同步，不授权提交、推送、安装、缓存刷新、发布、部署或下游项目修改。
