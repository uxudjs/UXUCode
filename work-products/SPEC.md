# UXUCode 工作流目录、Clean 整理命令与验证入口规范

状态：已批准（2026-07-29，新增 `clean` 整理命令并取消旧路径兼容）

## 1. 目标

在不牺牲正确性、测试可发现性和 Claude/Codex 独立打包的前提下：

1. 将 UXUCode 新建的过程性内容集中到 `work-products/`，减少仓库根目录视觉混乱。
2. 允许 `plan` 从已批准规格、完整调试/审查证据或足够明确的用户要求开始，不把 `spec` 设为无条件门禁。
3. 删除会被误认为真实命令的 `@spec?`、`/uxu-code:spec?` 表达，并收紧命令解析边界。
4. 提供一个可复现、失败即停止的统一验证入口。
5. 有选择地同步四个规范项目的有效上游更新，不照搬上游仓库自身的维护文件。
6. 新增只整理错放 UXUCode 过程产物的 `clean` Skill，并让 `.gitignore` 与唯一目录规范保持同步。

## 2. 已确认设计决策

### 2.1 `work-products/` 是 UXUCode 过程产物的默认根目录

新建内容按以下位置保存：

```text
work-products/
├── SPEC.md
├── plan.md
├── todo.md
├── debug/
├── reviews/
├── ship/
└── tests/
```

适用内容：

- UXUCode 生成的规格、计划、任务清单、调试记录、审查报告和发布门禁报告；
- 一次性验证脚本、临时 fixture、快照、测试报告和 agent 辅助测试；
- 本项目自身用于验证 UXUCode 工作流、Hook 和文档合同的测试。

产品源代码和最终交付物仍使用项目原生位置。

### 2.2 测试位置必须同时满足整洁与可执行

任何 UXUCode 操作新建的测试、fixture、snapshot、测试报告或其他测试产物都必须放入 `work-products/tests/`。测试产物引用仓库文件时，必须使用从该测试产物最终位置出发的相对路径，不得持久化机器绑定的绝对路径。每个测试还必须满足至少一项：

- 被仓库统一验证入口显式执行；
- 已加入项目现有测试框架的发现配置；
- 在计划和最终验证证据中记录完整可运行命令。

所有不需要产品使用者关注、且可按受支持命名约定明确识别的内部测试统一放入 `work-products/tests/`。如果框架、CI、共置测试约定或发布打包仍指向旧位置，迁移必须同步更新发现配置和可执行命令；无法安全更新时返回 `BLOCKED`，不得把旧目录保留为例外。

### 2.3 `spec` 是条件门禁

`plan` 可从以下任一充分依据开始：

- 已批准的规格；
- 已确认根因、范围和验收条件的 debug 结果；
- 已形成明确缺陷和修复边界的 review/ship 结果；
- 用户直接给出的目标、范围、约束和可验证验收标准。

出现以下任一情况时，必须先运行 `spec`：

- 目标、范围、非目标或验收标准不清楚；
- 存在尚未解决的接口、数据、安全、架构、兼容性或回滚决策；
- 多种解释会产生实质不同的实现；
- 用户明确要求规格阶段。

任务仅仅“非简单”或“跨多个文件”不自动触发 `spec`。`plan` 必须记录规划依据及其充分性；依据不足时停止并转入 `spec`。

## 3. 修复范围

### 3.1 修复伪命令 `spec?`

三语言指南、help skill 和 orchestration reference 不得把问号放进命令 token。

允许的流程表达：

```text
[需要时先运行 spec] → plan → build → review → simplify → ship
```

真实命令示例只能使用：

```text
@spec
/uxu-code:spec
```

Codex 和 Claude 路由器必须要求命令名后只能是行尾或空白参数分隔符。`@spec?`、`@spec!`、`/uxu-code:spec?` 等形式不得路由到 `spec`，也不得成为兼容别名。

### 3.2 增加统一验证入口

新增无第三方依赖的：

```text
node scripts/validate-all.js
```

它按顺序、失败即停止地运行：

1. Claude/Codex 插件验证；
2. command、skill、guide、README、legacy、notice 一致性验证；
3. `work-products/tests/` 下的 UXUCode workflow 和 mode contract 测试；
4. OpenClaw profile 验证和现有 OpenClaw 测试；
5. `git diff --check`。

脚本必须透传子命令输出和失败退出码。不得把静态验证描述为真实 Marketplace 安装、Hook 信任/加载、OpenClaw Gateway 行为或真实 token 节省证明。

README 的简体中文、繁体中文、英文验证章节以及三份 `docs/USAGE.*.md` 必须统一推荐该命令；详细子命令可保留在维护者说明中，但不得形成互相不一致的“标准入口”。

本次不新增 CI 平台配置；统一脚本应可直接被未来 CI 调用。

### 3.3 取消旧路径兼容并迁移旧过程文件

根目录 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md` 及其他可确认由 UXUCode 错放的过程产物只作为一次性迁移输入，不再是受支持的运行时路径。实现完成后：

- 所有公开 Skill 只读取和写入 `work-products/`；
- 不保留旧路径回退、别名、双写或读取兼容；
- 已确认内容迁入规范位置后移除旧源文件；
- 目标存在或内容冲突时停止并报告，不覆盖、不猜测合并结果。

`.gitignore` 必须区分共享事实与本地过程产物：

- `work-products/SPEC.md`、`work-products/plan.md`、`work-products/todo.md` 和 `work-products/tests/**` 是可跟踪的共享事实；
- `work-products/debug/**`、`work-products/reviews/**`、`work-products/ship/**` 及其他未声明的过程产物默认忽略；
- 不得为根目录 `/SPEC.md`、`/tasks/` 或任何其他旧路径保留兼容忽略规则。

不得依赖 `git add -f` 绕过上述边界。忽略合同测试必须隔离用户级 `core.excludesFile` 与仓库 `.git/info/exclude`，只验证仓库自身 `.gitignore` 的行为。

## 4. 上游同步评估

项目固定基线与当前上游 HEAD：

| 上游 | 固定提交 | 当前状态 | 本次结论 |
|---|---|---|---|
| DietrichGebert/ponytail | `16f29800fd2681bdf24f3eb4ccffe38be3baec6b` | 未前进 | 无需同步 |
| JuliusBrussee/caveman | `0d95a81d35a9f2d123a5e9430d1cfc43d55f1bb0` | 未前进 | 无需同步 |
| multica-ai/andrej-karpathy-skills | `2c606141936f1eeef17fa3043a72095b4765b9c2` | 未前进 | 无需同步 |
| addyosmani/agent-skills | `2fbfa004a0192529bc997d103fc12f19a3804aab` | 已到 `7829ffd90d973b6325f5f12f1b1226dcace74443` | 选择性同步 |

需要同步到 Claude/Codex 两套内部 reference 的更新：

1. `test-driven-development`：先识别仓库语言、构建系统、测试框架、原生目录和真实验证命令；禁止默认假定 `npm test`。
2. `incremental-implementation`、`debugging-and-error-recovery`、`planning-and-task-breakdown`：把固定 npm 示例改成项目自身命令，并引用测试栈发现结果。
3. `shipping-and-launch`、`security-checklist`：依赖审计改为生态无关表达，例如 `npm audit`、`pip-audit`、`cargo audit`。
4. `testing-patterns`：明确现有示例是 JavaScript/TypeScript 参考，原则适用于其他生态。
5. `performance-optimization`：加入同条件复测、超过噪声才保留、无收益或变差即回退、记录失败尝试的门禁。

不应同步：

- 上游 `.github` issue 模板和评测 fixture；
- 上游仓库自己的 Hook 设置说明；
- 上游 CLAUDE/CONTRIBUTING 维护措辞；
- 与 UXUCode 当前独立打包模型无关的 skill-authoring 目录约定。

同步后更新 `THIRD_PARTY_NOTICES.md` 中 agent-skills 的审查提交，并保持 Claude/Codex reference 内容一致。

## 5. 预计涉及文件

- `Claude/hooks/uxu-prompt-router.js`
- `Codex/hooks/uxu-prompt-router.js`
- 两端 `skills/help`、`skills/plan`、`skills/test`、`skills/using-uxucode`
- 两端 `references/orchestration-patterns.md`
- 两端第 4 节列出的 workflow/reference
- `docs/USAGE.en.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `README.md`
- `.gitignore`
- `scripts/validate-all.js`
- `scripts/validate-guide-parity.js`
- `scripts/validate-command-parity.js` 或等价命令边界验证
- `work-products/tests/`
- `THIRD_PARTY_NOTICES.md`

所有 Claude/Codex 对应改动必须成对完成；不得为了去重破坏两个插件的独立安装能力。

## 6. 测试策略

### 命令边界

- `@spec` 和 `/uxu-code:spec` 正常路由；
- 带参数的合法命令正常路由；
- `@spec?`、`@spec!`、`@specx`、`/uxu-code:spec?` 不路由；
- 其他宿主或普通文本中的 `@` 不被 UXUCode 误拦截。

### 规划依据

- 已批准规格可进入 plan；
- 完整 debug/review/ship 证据可进入 plan；
- 明确用户要求可进入 plan；
- 缺少验收标准或存在重大未决风险时要求 spec；
- help、router、skills、三语言指南语义一致。

### 目录合同

- 新过程文档只落入 `work-products/`；
- 所有新测试产物落入 `work-products/tests/`；
- 测试内仓库文件引用使用从测试最终位置出发的相对路径；
- 现有错放内部测试由 `clean` 统一迁移，并同步明确的发现与执行路径；
- 统一入口确实执行所有合同测试。

### 上游同步

- Claude/Codex 对应 reference 通过内容一致性验证；
- 新增生态无关措辞，不引入项目不存在的依赖；
- performance workflow 明确 keep/revert 门禁；
- notice 提交与实际审查版本一致。

## 7. 验收标准

- 文档、help、orchestration 中不存在可被执行的 `@spec?` 或 `/uxu-code:spec?`。
- 路由器不再把带标点或后缀的 token 当成合法公开命令。
- `plan` 明确接受四类充分规划依据，并在证据不足时要求 `spec`。
- 所有新 UXUCode 过程产物默认位于 `work-products/`。
- `work-products/tests/` 中的每个持久测试都由统一验证入口执行。
- `node scripts/validate-all.js` 在干净实现上返回 0；任一子验证失败时返回非 0。
- 三语言 README/USAGE、Claude/Codex skills/references 通过一致性校验。
- 第 4 节列出的 agent-skills 更新完成选择性同步，其他三项上游无无意义改动。
- 静态与本地测试结果不被描述成真实宿主或生产证明。
- `git diff --check` 通过，且不覆盖工作区已有的无关改动。

## 8. 非目标

- 不把 `spec` 恢复成所有 plan 的强制前置门禁。
- 不猜测无法按受支持命名约定确认的测试、fixture、snapshot 或未知测试框架配置。
- 不合并 Claude 与 Codex 发布目录。
- 不新增第三方依赖、CI 平台、部署或发布动作。
- 不声称通过本地测试即可证明真实 Claude/Codex Hook 加载或 OpenClaw Gateway 行为。

## 9. 风险与缓解

- **测试被隐藏但未执行：** 统一验证入口必须显式枚举合同测试，并增加缺失测试的回归检查。
- **过度拦截其他 `@` 命令：** 路由器只识别完整 UXUCode 公开 token，不接管不匹配输入。
- **可选 spec 退化成无依据编码：** plan 必须记录目标、范围、约束和验收标准来自何处。
- **上游同步覆盖本地策略：** 仅移植行为原则，保留 `work-products/`、双宿主独立和本项目输出合同。
- **测试迁移破坏发现或打包：** 迁移前检查并同步明确引用；无法无歧义更新时返回 `BLOCKED`。

## 10. 回滚

实现应按四个可独立回滚的切片提交：

1. 命令边界与文档修复；
2. 统一验证入口和测试迁移；
3. 过程目录与可选规格门禁对齐；
4. agent-skills 选择性同步。

任何切片失败时，只回退该切片；不得回退用户已有工作区改动。

## 11. 待确认问题

无。`clean` 的名称、范围、预览/执行接口和旧路径不兼容策略已由用户确认。

## 12. 三语言用户文档重构补充规格

### 12.1 目标用户与写作目标

README 和 `docs/USAGE.*.md` 首先服务于准备安装、更新和使用 UXUCode 的 Claude Code、Codex 与 OpenClaw 使用者。文档应优先回答：

1. UXUCode 能解决什么问题；
2. 应选择哪个宿主入口；
3. 命令应在哪里执行；
4. 安装或更新后如何确认可用；
5. 运行命令后会得到什么结果。

实现边界、包结构、一致性校验、评测阈值和静态证据限制仅在使用者需要作出操作决策时出现；其余内容后移到完整指南的维护者附录、`OpenClaw/README.md` 或 `OpenClaw/evaluation/README.md`。

### 12.2 README 信息架构

简体中文、繁体中文和英文部分使用相同章节顺序与操作语义：

1. 产品用途；
2. 宿主选择；
3. 快速安装；
4. 第一次使用与安装验证；
5. 更新；
6. 完整指南；
7. 致谢。

README 首屏不得展开以下维护者信息：

- Claude/Codex 的内部目录、Hook 生命周期和 reference 同步方式；
- 公开命令数量与一致性校验合同；
- 完整 `work-products/` 路径清单；
- OpenClaw 评测用例数、百分比阈值和评分命令；
- 静态验证、Marketplace、Hook 与 Gateway 的证据边界。

上述内容如仍有保留价值，应移到对应详细指南或维护者附录。

### 12.3 安装与更新操作合同

所有宿主的安装和更新说明统一采用以下结构：

1. **执行位置：** 明确标注“系统终端”“Claude Code 会话内”或“Codex CLI”；
2. **执行命令：** 一个代码块只包含同一执行环境中的命令；
3. **重新加载：** 明确是否需要重启宿主、运行 `/reload-plugins` 或启动新会话；
4. **验证：** 提供一个最短的用户可执行验证入口；
5. **更新：** 使用与安装相同的宿主顺序和表达格式。

Claude Code 的持久安装主流程必须先在系统终端运行 `claude` 进入交互会话，再在会话内运行：

```text
/plugin marketplace add ./Claude
/plugin install uxu-code@uxu-code-claude
/reload-plugins
```

不得把 `claude --plugin-dir ./Claude` 与 `/plugin ...` 命令放在同一个未区分执行环境的代码块中。非交互式 `claude plugin ...` 只可作为进阶替代方案，不与主流程并列。

安装后的最短验证入口为：

- Claude Code：`/uxu-code:help`；
- Codex：`@help`；
- OpenClaw：启动新会话并确认目标 workspace 已加载安装后的 workspace 文件；详细诊断链接到 `OpenClaw/README.md`。

### 12.4 面向使用者的表述规则

命令说明优先使用“何时使用、会发生什么、用户会得到什么”的句式。只有在影响用户决策时才解释内部实现。

以下词语不得在未解释时直接出现在快速开始内容中：

- parity；
- managed block 或 managed markers；
- MVP；
- fixture、snapshot；
- provider、thinking level；
- 内部工作流 reference；
- Hook 生命周期。

流程图不得使用容易被误认为真实命令的 `spec?`。统一改为：

```text
[需要时先运行 spec] → plan → build → review → simplify → ship
```

### 12.5 `work-products/` 用户说明

README 只保留以下两层信息：

- UXUCode 将生成的规格、计划和过程记录集中保存在 `work-products/`，避免打乱项目原有目录；
- 产品源码和最终交付文件仍遵循项目现有结构。

完整指南新增“生成文件位置”表格，集中说明规格、计划、任务、调试、评审、发布门禁和测试的默认位置。测试位置同时说明第 2.2 节的例外：项目测试框架、CI、共置测试或打包约定要求固定目录时，以项目约定为准并记录验证命令。

不得在 README 介绍段或每个命令说明中重复完整路径清单。

### 12.6 OpenClaw 用户说明

OpenClaw 文案先说明用户价值，再说明安装边界。推荐表述语义为：

> 如果你也使用 OpenClaw，可以把 UXUCode 的执行与输出策略应用到指定 workspace。它与 Claude Code、Codex 插件分别安装，详细步骤见 OpenClaw 指南。

“不是第三个代码 CLI”“不参与 Claude/Codex 公开命令一致性校验”等维护者边界不得出现在 README 首屏。详细的文件保护、移除、回滚和评测说明保留在 `OpenClaw/README.md` 与 `OpenClaw/evaluation/README.md`。

### 12.7 完整指南信息架构

三份 `docs/USAGE.*.md` 使用同一编号结构：

1. 产品定位与适用场景；
2. 快速开始；
3. 按宿主安装；
4. 第一次使用；
5. 推荐工作流；
6. 命令参考；
7. 模式选择；
8. 生成文件位置；
9. 更新、移除与故障排查；
10. 高级配置；
11. OpenClaw；
12. 面向项目维护者的校验附录。

翻译必须保持操作语义、命令、路径、风险边界和章节层级一致，不要求逐字直译。简体中文作为语义基准，繁体中文和英文在同一变更中同步完成。

### 12.8 校验合同调整

同步修改 `scripts/validate-readme-scope.js` 和 `scripts/validate-guide-parity.js`：

- 保留三语言章节结构、宿主顺序、命令、模式、路径和代码围栏校验；
- 增加 Claude Code “进入会话后安装”的执行环境校验；
- 增加安装后验证入口与安装/更新结构一致性校验；
- 增加 README 不包含 `spec?` 伪命令的校验；
- 不再强制 README 或用户指南包含 OpenClaw 评测用例数、百分比阈值、评分命令或 Claude/Codex 内部一致性术语；
- OpenClaw 评测合同继续由 `OpenClaw` 自身验证器和测试覆盖。

### 12.9 补充验收标准

- README 三语言首屏均以使用者收益和操作入口为中心。
- Claude Code 安装步骤不会让用户误把 `/plugin ...` 输入系统终端。
- Claude Code、Codex 和 OpenClaw 的安装与更新均明确执行位置、重载方式和验证方法。
- README 中的 `work-products/` 说明简短，完整路径只在指南集中出现一次。
- README 首屏不出现公开命令一致性校验细节或 OpenClaw 评测阈值。
- 三语言指南的标题结构、命令、默认值、路径和风险语义一致。
- `node scripts/validate-guide-parity.js`、`node scripts/validate-readme-scope.js`、`node scripts/validate-no-legacy-commands.js`、`node scripts/validate-all.js` 和 `git diff --check` 全部通过。
- 本地静态验证不得被描述为真实 Marketplace 安装、Hook 加载或 OpenClaw Gateway 运行证明。

### 12.10 补充非目标

- 不改变 Claude Code、Codex 或 OpenClaw 的实际安装实现。
- 除新增 `clean` 公开命令及其 `apply` 参数外，不改变既有公开命令名称、参数、模式或运行语义。
- 不新增与用户任务无关的文档站点、生成器或第三方依赖。
- 不为追求三语言逐字一致而使用生硬直译。

## 13. `clean` 工作区整理 Skill 补充规格

### 13.1 目标与使用者

`clean` 服务于使用 UXUCode 后发现规格、任务、测试或其他 UXUCode 过程产物被放在 `work-products/` 之外的项目维护者。它解决的是目录合同漂移，不是通用磁盘清理。

成功意味着：

- 错放的 UXUCode 过程产物能够先被完整预览，再安全迁入 `work-products/`；
- 移动引起的有效相对路径和旧路径引用得到同步修改；
- `.gitignore` 与当前唯一目录合同一致；
- 项目源码、交付文件和无法确认归属的非测试文件不被移动；内部测试统一归入 `work-products/tests/`。

### 13.2 公开接口

新增第 17 个公开 Skill：

| 宿主 | 预览 | 执行 |
|---|---|---|
| Codex | `@clean` | `@clean apply` |
| Claude Code | `/uxu-code:clean` | `/uxu-code:clean apply` |

接口合同：

- 无参数时只读扫描并输出迁移计划，不修改文件、Git 配置或索引；
- 唯一写入参数是精确的 `apply`；未知参数返回明确错误且不写入；
- 不提供 `organize`、旧路径或其他兼容别名；
- `clean` 表示整理和迁移，不得被实现为删除任意未跟踪文件。

### 13.3 候选文件识别边界

只有存在充分证据属于 UXUCode 过程产物，或可按受支持命名约定明确识别为内部测试的文件，才可进入迁移集合：

1. 旧约定中的根目录 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md`；
2. UXUCode 创建且内容或现有工作流记录能证明其用途的 task、spec、debug、review、ship、测试、fixture、快照或测试报告；
3. 被已确认 UXUCode 过程文件直接引用、并明确属于同一过程产物集合的辅助文件；
4. 文件名以 `test_`、`test-` 或 `test.` 开头，包含以点、下划线或连字符分隔的 `test`／`spec`，或以 CamelCase `Test`／`Tests` 紧接扩展名结尾的内部测试文件；扩展名不限于单一语言。

测试候选发现必须覆盖整个仓库，而不是只扫描根目录 `tests/`。上述受支持测试命名本身足以确认其属于使用者无需关注的内部测试产物；已经位于根目录 `work-products/tests/` 的规范测试不重复分类。任意层级的 `.git/`、`node_modules/`、`.venv/`、`venv/` 与 `vendor/` 均属于版本控制或第三方依赖边界，不进入候选扫描。

以下内容不得自动进入迁移集合：

- 产品源码、最终交付物、依赖、构建输出和项目配置；
- 无法按受支持命名约定或其他正向证据确认的 fixture、snapshot、测试框架配置及其他文件；
- 仅凭 Git 未跟踪状态或位于 `tests/`、`tasks/` 等通用目录而无法确认归属的非测试文件；
- 符号链接目标、仓库外文件及 `.git/` 内部文件。

无法确认的候选项只列入“未处理及原因”，不得移动或修改。

### 13.4 预览输出合同

`@clean` 或 `/uxu-code:clean` 必须在一次只读扫描中输出：

1. 每个候选源路径、目标路径及判定依据；
2. 将被修改的文件内引用及修改前后路径；
3. `.gitignore` 需要增加、删除或保留的规则；
4. 目标冲突、无法安全改写的引用、外部 ignore 来源及其他阻塞项；
5. 明确不会处理的文件及原因；
6. 汇总状态：`READY`、`NO_CHANGES` 或 `BLOCKED`。

存在既有目标冲突、多个源映射到同一目标、目标既存祖先为符号链接／junction／非目录或逃逸仓库、无法读取的候选文件，或无法安全重写的有效引用时，状态必须为 `BLOCKED`；此时即使随后调用 `apply` 也不得部分执行。

### 13.5 移动与引用重写合同

执行前必须构建完整的源到目标映射并完成全部预检。目标位置遵循现有目录合同：

```text
SPEC                     → work-products/SPEC.md
plan/task list           → work-products/plan.md 或 work-products/todo.md
debug                    → work-products/debug/
review                   → work-products/reviews/
ship gate                → work-products/ship/
UXUCode auxiliary tests  → work-products/tests/
```

移动不得覆盖现有文件。两个来源映射到同一目标、目标已存在但并非同一文件，或需要语义合并时，必须停止并要求人工决策。

引用更新仅限与迁移直接相关的最小修改：

- 对被移动的文本文件，重新计算其中指向仓库内现存文件的 Markdown 链接、图片链接和可明确识别的相对路径，使其在新位置仍指向原目标；
- 对引用迁移源路径的仓库内文本文件，只自动改写能够按文件最终位置无歧义解析的显式相对路径或仓库内绝对路径；
- 对迁移集合中文件之间的引用，使用完整映射一次性计算最终路径，禁止按移动顺序逐步猜测；
- 对被移动的文本文件，将能够无歧义解析到当前仓库内部现存文件的本地绝对路径改写为从最终位置出发的相对路径；
- 裸字符串即使精确等于迁移源，也无法单凭文本证明具有路径语义，必须以 `AMBIGUOUS_REFERENCE` 阻塞，禁止把测试夹具、期望值或示例误改为路径；
- 外部 URL、仓库外绝对路径、无法解析的动态路径、自然语言示例和不指向真实迁移对象的同名文本不得改写。

任何需要修改但无法无歧义解析的引用都必须阻塞执行。修改引用属于允许的相关修改；除此之外的未移动文件内容保持不变。

### 13.6 `.gitignore` 同步合同

`clean` 必须检查仓库自身 `.gitignore` 的实际语义，而不是只搜索字符串。目标合同为：

```gitignore
/work-products/*
!/work-products/SPEC.md
!/work-products/plan.md
!/work-products/todo.md
!/work-products/tests/
!/work-products/tests/**
```

实现必须：

- 删除 `/SPEC.md`、`/tasks/` 及其他仅服务旧 UXUCode 路径的兼容规则；
- 保持正式规格、计划、任务清单和测试可正常进入 Git 跟踪；
- 保持其他 UXUCode 本地过程产物默认忽略；
- 只修改 UXUCode 相关规则，保留用户的其他 ignore 内容、顺序语义和注释；
- 不修改用户级 `core.excludesFile` 或 `.git/info/exclude`；如它们影响目标路径，只报告来源和影响；
- 不调用 `git add`、`git commit`、`git reset` 或其他改变索引和历史的命令。

没有 `.gitignore` 时允许创建只包含必要 UXUCode 规则的文件。同步后重复运行必须得到 `NO_CHANGES`。

### 13.7 执行安全与失败语义

`apply` 必须重新扫描当前状态，不能盲目执行先前输出：

1. 完成候选、目标、引用和 ignore 预检；
2. 保存所有待修改文本的原始字节与移动映射；
3. 执行移动、引用更新和 `.gitignore` 更新；
4. 验证源路径消失、目标内容一致、引用可解析且 ignore 合同成立；
5. 任一步失败时恢复本次已经完成的移动和文本修改，并报告未能恢复的确切路径。

实现必须保留文件内容、UTF-8/换行风格和非目标文本。成功后再次预览应返回 `NO_CHANGES`。不得因为工作区存在无关修改而覆盖、格式化或清理它们。

### 13.8 双宿主与文档同步

Claude 和 Codex 必须具有语义一致的 `clean/SKILL.md`，同时更新：

- 两个 Host 的 `help` 与内部路由说明；
- 插件清单、命令/Skill 数量及 parity 校验；
- README 简体中文、繁体中文、英文命令说明；
- 三份 `docs/USAGE.*.md` 的命令表、工作流和生成文件说明；
- 统一验证入口所覆盖的 `clean` 合同测试。

OpenClaw 不新增伪插件或命令入口；其工作区模板只在现有产品边界需要说明时同步文案。

### 13.9 测试策略

至少覆盖以下可观察行为：

- 预览模式零写入并准确列出移动、引用和 ignore 变化；
- `apply` 将已确认的 SPEC、task、UXUCode 辅助测试和受支持命名的内部测试移动到正确位置；
- 移动文件自身的相对链接、迁移集合内部引用和外部文件的精确旧路径引用均正确更新；
- 项目源码、交付文件和模糊非测试候选保持逐字节不变；
- 既有目标冲突、重复目标、目标祖先链接／逃逸、不可读文件和歧义引用导致 `BLOCKED` 且零部分写入；
- `.gitignore` 删除旧兼容规则、保留用户规则，并使正式事实可跟踪、本地过程产物被忽略；
- 用户级 excludes 和 `.git/info/exclude` 只报告、不修改；
- 未知参数失败、二次运行幂等；
- Claude/Codex Skill、公开命令、帮助和三语言文档保持一致。

测试必须使用隔离的临时 Git 仓库，不依赖用户全局 Git 配置，不修改真实仓库外文件。

### 13.10 验收标准

- 仓库只公开 `clean`，不存在 `organize` 或旧命令别名。
- `@clean` 和 `/uxu-code:clean` 默认预览，确认零写入。
- `apply` 移动可证明属于 UXUCode 的错放过程产物及受支持命名的内部测试，并完成必要引用改写。
- 无法确认的非测试文件不移动；项目源码保持不变。
- 根目录旧 SPEC/tasks 路径既不受支持，也不再通过 `.gitignore` 兼容隐藏。
- `work-products/` 是唯一过程产物事实源，正式事实无需 `git add -f` 即可跟踪。
- 失败不会留下部分迁移；成功后重复执行为 `NO_CHANGES`。
- 新增合同测试进入 `node scripts/validate-all.js`，全部本地静态验证及 `git diff --check` 通过。
- 验证结论不声称已完成真实插件安装、重新加载或宿主运行证明。

### 13.11 非目标、风险与回滚

非目标：

- 不做通用未跟踪文件清理、重复文件删除或项目目录重构；
- 不推断未知文件的业务含义；
- 不修改 Git 全局配置、私有 exclude、索引、提交或远端；
- 不引入第三方依赖或后台监控。

主要风险与缓解：

- **误移动项目文件：** 使用正向证据集合，模糊项只报告。
- **移动后引用失效：** 先构建完整映射，再统一重写和验证。
- **覆盖已有事实源：** 任意目标冲突均阻塞，不自动合并。
- **ignore 规则误伤：** 以行为测试验证目标路径，并保留所有无关规则。
- **执行中断留下半成品：** 写前保留原始字节，失败时按映射回滚。

实现回滚按三个独立切片进行：

1. `clean` Skill、路由与双宿主命令合同；
2. 迁移/引用重写与 `.gitignore` 同步行为；
3. 三语言文档和统一验证登记。

回滚新功能不得恢复旧路径运行时兼容；如整体决策需要逆转，必须先修订并重新批准本规格。

## 14. Ship NO-GO 修复补充规范

状态：已批准（2026-07-30，用户明确要求 `@spec`、批准 `@plan` 并执行 `@build auto`）

### 14.1 目标与使用者

解除 2026-07-30 `@ship` 门禁发现的仓库自身整理阻塞，使维护者可以从唯一事实源和唯一测试位置复现完整本地发布门禁。

### 14.2 范围

- 删除已被本文件、`work-products/plan.md` 与 `work-products/todo.md` 取代的根目录 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md`；删除前确认三个旧文件均为历史规划产物，规范文件已经记录当前有效合同。
- 将 `OpenClaw/tests/validate-profile.test.js` 与 `OpenClaw/tests/evaluation.test.js` 迁入 `work-products/tests/OpenClaw/tests/`。
- 按测试最终位置更新其仓库内相对引用，并同步统一验证入口及 OpenClaw 专项文档中的可运行命令。
- 更新与测试路径直接绑定的合同断言；不改变测试内容、发布阈值或 OpenClaw 运行时边界。
- 完成双宿主 Clean 预览、统一验证、差异检查和当前变更复审。

### 14.3 非目标与约束

- 不放宽 `TARGET_EXISTS`、`AMBIGUOUS_REFERENCE` 或任何 Clean fail-closed 规则。
- 不自动合并旧事实源，不创建旧路径兼容、归档别名或项目专属 Clean 分支。
- 不修改已安装插件缓存、Git 全局配置、提交、远端或生产环境。
- 保留当前所有无关未提交改动；只删除本节明确列出的五个迁移源。
- 本地静态通过不等于 Marketplace 安装、Hook 重新加载或 OpenClaw Gateway 证明。

### 14.4 接口、验收与测试

- `node Codex/scripts/clean-work-products.js` 与 `node Claude/scripts/clean-work-products.js` 均返回 `NO_CHANGES`，且输出字节一致。
- 三个旧事实源和两个旧测试源在文件系统中不存在，`git status --short` 将其记录为删除；新测试路径未被忽略并可正常跟踪。
- `node --test work-products/tests/OpenClaw/tests/validate-profile.test.js work-products/tests/OpenClaw/tests/evaluation.test.js` 全部通过。
- `node scripts/validate-all.js` 的 12 个步骤全部通过。
- `git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check` 返回 0。
- 当前 diff 不含未解释的 Critical 或 Important 问题，最终 Clean 门禁更新为完成。

### 14.5 风险与回滚

- **历史信息丢失：** 删除前核对旧文件标题、范围和当前规范的取代关系；Git 历史继续保留旧内容。
- **测试迁移后引用失效：** 先按最终目录重算相对路径，再运行两个聚焦测试和统一入口。
- **文档命令漂移：** OpenClaw 专项 README 与统一入口同批更新，并通过仓库搜索确认无旧测试命令残留。
- **回滚：** 将五个移动/删除源、路径引用和文档命令作为一个可逆切片恢复；不得只恢复旧文件而留下双事实源。
