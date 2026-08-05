# 实施计划：工作流修复、Clean 整理命令与三语言用户文档重构

## 概述

按已批准的 `work-products/SPEC.md` 修复四类偏离：统一 UXUCode 自建过程产物的位置；允许有充分规划依据的任务直接进入 `plan`；拒绝带标点的伪命令；提供一个覆盖现有静态检查、契约测试和 OpenClaw 测试的统一验证入口。随后仅同步 `addyosmani/agent-skills` 从固定提交 `2fbfa004a0192529bc997d103fc12f19a3804aab` 到已核对提交 `7829ffd90d973b6325f5f12f1b1226dcace74443` 中与 UXUCode 有关的规范变化。最后按规格第 12 节重构 README 与三份使用指南，使安装、更新、首次验证、OpenClaw 定位和 `work-products/` 说明都以使用者操作为中心，并同步调整文档校验合同。

根据 2026-07-29 已批准的规格第 13 节，再新增第 17 个公开命令 `clean`。新功能只按通用目录合同识别和迁移错放的 UXUCode 过程产物，默认预览，`apply` 执行；同步更新有效引用与 `.gitignore`，不为当前仓库、旧插件缓存或旧路径增加任何兼容或专属分支。

## 实施约束

- 当前相关文件已有未提交修改；每个任务开始前先检查该任务文件的现有 diff，增量修复，禁止覆盖或回退用户改动。
- Claude 与 Codex 是独立发布包。成对文件应保持语义一致，但保留各自的命令格式、Hook 输出和插件根目录契约。
- OpenClaw 保持独立运行时，但其内部测试与其他内部测试遵循同一 `work-products/tests/` 目录合同；迁移不得把 Claude/Codex 的运行时配置带入 OpenClaw。
- 所有使用者无需关注、且可按受支持命名约定明确识别的内部测试统一进入 `work-products/tests/`；迁移同步修正测试发现、CI 和模块命令中的明确路径。
- 每个行为修复先补充或调整会失败的契约断言，再修改实现或文档。
- 三语言用户文档以简体中文为语义基准，在同一任务中同步繁体中文与英文；允许自然翻译，不允许命令、路径、默认值、风险边界或章节层级漂移。
- README 和使用指南只保留影响用户操作决策的实现边界；维护者校验、评测阈值和证据合同后移到维护者附录或已有专项文档。
- 不新增依赖、不新增 CI、不发布、不提交、不推送。

## 依赖顺序

```text
任务 1 过程产物基线
   ├── 任务 2 严格命令边界
   │      └── 任务 3 伪命令文档清理
   └── 任务 4 可选规格与目录策略
          └── 任务 5 各阶段产物规则
                 └── 任务 6 统一验证入口
                        └── 任务 7-8 上游规范同步
                               └── 原实施门禁
                                      └── 任务 9 README 用户化与校验合同
                                             └── 任务 10 三语言完整指南与校验合同
                                                    └── 最终文档门禁
```

## 任务 1：建立 `work-products/` 基线并迁移旧过程产物

**范围：** 盘点根目录 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md` 与 `tests/mode-policy-contract.test.js`，将仍有保留价值的旧产物迁入 `work-products/`。旧规格以语义化归档名保存，不覆盖本轮 `work-products/SPEC.md`；模式契约测试迁入 `work-products/tests/` 后修正相对路径。调整 `.gitignore`，让临时过程文档可按约定忽略，但不屏蔽应纳入版本控制的契约测试。

**验收标准：**

- [ ] 根目录不再保留 UXUCode 自建的 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md`。
- [ ] 本轮规格、计划、清单与旧规格归档可区分，任何现有内容均未被覆盖或丢失。
- [ ] 模式契约测试位于 `work-products/tests/`，相对引用仍指向正确的 Claude/Codex 文件。
- [x] 本条原生测试例外已由任务 26 的用户明确确认取代；仓库内部测试统一迁移并同步发现路径。

**验证：**

- [ ] `git -c safe.directory=C:/Code/UXUCode status --short`
- [ ] `git -c safe.directory=C:/Code/UXUCode check-ignore -v work-products/SPEC.md work-products/plan.md work-products/todo.md work-products/tests/mode-policy-contract.test.js`
- [ ] `node --test work-products/tests/mode-policy-contract.test.js`

**依赖：** 无。

**可能涉及：**

- `.gitignore`
- `SPEC.md`
- `tasks/plan.md`
- `tasks/todo.md`
- `tests/mode-policy-contract.test.js`
- `work-products/`

**规模：** 中。

**回滚：** 逐个恢复原路径和原相对引用；归档迁移使用可逆文件移动，不删除内容。

## 任务 2：锁定严格的公开命令解析边界

**范围：** 在工作流契约测试中覆盖合法命令、合法参数、尾随空白和非法标点；随后收紧两个 Host 的 prompt router。只有命令 token 后接输入结束、空白或合法参数时才路由，`@spec?`、`@spec!`、`@specx`、`/uxu-code:spec?` 均不得变成 `spec`。

**验收标准：**

- [ ] `@spec` 与 `/uxu-code:spec` 仍分别在 Codex、Claude 中路由。
- [ ] 合法的带参数命令保持原行为，例如 `@mode ultra` 与 `/uxu-code:mode ultra`。
- [ ] 所有规格列出的标点或粘连变体均不路由，也不写入模式配置或项目状态。
- [ ] 非 UXUCode 的普通 `@` 文本保持无副作用。

**验证：**

- [ ] `node --test work-products/tests/workflow-contract.test.js`
- [ ] `node Codex/scripts/validate-plugin.js`
- [ ] `node Claude/scripts/validate-plugin.js`

**依赖：** 任务 1。

**可能涉及：**

- `Codex/hooks/uxu-prompt-router.js`
- `Claude/hooks/uxu-prompt-router.js`
- `work-products/tests/workflow-contract.test.js`

**规模：** 中。

**回滚：** 单独回退两个 router 与对应测试断言；不影响目录或文档迁移。

## 任务 3：从公开说明中移除 `spec?` 伪命令

**范围：** 将 `spec? → plan` 一类流程图改成自然语言的“需要时先运行 spec”，真实命令示例只保留 `@spec` 与 `/uxu-code:spec`。同步三个语言指南及 Claude/Codex 的 help、orchestration 说明，并让文档契约测试明确禁止伪命令 token。

**验收标准：**

- [ ] 三种语言的公开用法说明表达相同的“spec 可选、条件触发”语义。
- [ ] Claude 与 Codex 示例只展示各自主机的真实公开命令格式。
- [ ] 仓库中除负向测试数据外，不再把 `spec?` 当作命令或流程节点。
- [ ] 未引入别名或兼容解析。

**验证：**

- [ ] `node --test work-products/tests/workflow-contract.test.js`
- [ ] `node scripts/validate-guide-parity.js`
- [ ] `node scripts/validate-command-parity.js`
- [ ] `node scripts/validate-no-legacy-commands.js`

**依赖：** 任务 2。

**可能涉及：**

- `docs/USAGE.en.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `Claude/skills/help/SKILL.md`
- `Codex/skills/help/SKILL.md`
- `Claude/references/orchestration-patterns.md`
- `Codex/references/orchestration-patterns.md`
- `work-products/tests/workflow-contract.test.js`

**规模：** 中；按“公开指南”和“Host 内说明”两个小批次修改并在批次间验证。

**回滚：** 可独立回退文档措辞；不得恢复宽松 router。

## 任务 4：实现基于充分规划依据的可选规格门禁

**范围：** 统一内部路由、`plan`/`spec` 技能、spec-driven reference 与所有 Hook 注入的 workflow policy。`plan` 可从已批准规格、完整 debug 证据、明确 review/ship 发现或足够清晰的用户要求开始；只有存在规格中列出的未决范围、验收、接口、数据、安全、架构、兼容或回滚决策时才要求先运行 `spec`。

**验收标准：**

- [ ] 清晰的多步请求或完整 debug/review/ship 证据可以直接进入 `plan`。
- [ ] 高风险、存在多种实质解释或缺少验收标准的任务仍被引导到 `spec`。
- [ ] “非平凡”“跨文件”本身不再是强制规格的唯一理由。
- [ ] 两个 Host 的 workflow policy 和技能语义一致，`off` 模式也保留该工作流安全边界。

**验证：**

- [ ] `node --test work-products/tests/workflow-contract.test.js`
- [ ] `node --test work-products/tests/mode-policy-contract.test.js`
- [ ] `node scripts/validate-skill-parity.js`
- [ ] 两个 Host 插件验证均通过。

**依赖：** 任务 1。

**可能涉及：**

- `Claude/skills/using-uxucode/SKILL.md`
- `Codex/skills/using-uxucode/SKILL.md`
- `Claude/skills/plan/SKILL.md`
- `Codex/skills/plan/SKILL.md`
- `Claude/skills/spec/SKILL.md`
- `Codex/skills/spec/SKILL.md`
- `Claude/references/workflows/spec-driven-development/SKILL.md`
- `Codex/references/workflows/spec-driven-development/SKILL.md`
- `Claude/hooks/mode-policy.js`
- `Codex/hooks/mode-policy.js`
- `work-products/tests/workflow-contract.test.js`

**规模：** 中；先改契约与 Host 核心策略，再改成对技能。

**回滚：** 作为独立策略切片回退；保留任务 1 的目录迁移和任务 2 的严格命令解析。

## 任务 5：统一各工作阶段的产物目录与原生测试例外

**范围：** 对齐 build、debug、test、review、ship 与 planning reference。过程记录分别进入 `work-products/debug/`、`reviews/`、`ship/`；所有操作创建的新测试统一进入 `work-products/tests/`，测试内仓库文件引用使用从最终位置出发的相对路径，并要求记录实际执行方式。

**验收标准：**

- [ ] 每个阶段只承诺自身需要的过程产物，不制造空目录或无用模板。
- [x] 本条原生测试例外已由任务 26 取代；新建及可识别的内部测试统一进入 `work-products/tests/`。
- [ ] 测试必须被统一验证入口显式执行、被原生发现机制覆盖，或记录独立命令。
- [ ] Claude/Codex 对称文件通过技能与工作流引用一致性检查。

**验证：**

- [ ] `node --test work-products/tests/workflow-contract.test.js`
- [ ] `node scripts/validate-skill-parity.js`
- [ ] `node scripts/validate-guide-parity.js`

**依赖：** 任务 4。

**可能涉及：**

- `Claude/skills/{build,debug,test,review,ship}/SKILL.md`
- `Codex/skills/{build,debug,test,review,ship}/SKILL.md`
- `Claude/references/workflows/planning-and-task-breakdown/SKILL.md`
- `Codex/references/workflows/planning-and-task-breakdown/SKILL.md`
- `work-products/tests/workflow-contract.test.js`

**规模：** 中；每次只处理一个成对技能并运行聚焦测试。

**回滚：** 按技能对逐项回退；不得删除已经产生的用户证据文件。

## 任务 6：增加无依赖、失败即停的统一验证入口

**范围：** 新增 `scripts/validate-all.js`，用 Node 内置能力按固定顺序执行现有验证器、工作流与模式契约测试、OpenClaw 验证和测试，以及 `git diff --check`。子进程输出与退出码必须直通；首个失败应终止后续步骤。三语 README/USAGE 推荐该入口，同时保留单项命令用于诊断。

**验收标准：**

- [ ] `node scripts/validate-all.js` 覆盖两个插件验证器、command/skill/guide/README/legacy/notice 验证器、两个 work-products 契约测试、OpenClaw profile 与测试、`git diff --check`。
- [ ] 任一步非零退出时总入口返回非零，并清楚显示失败步骤。
- [ ] 成功时总入口返回 0，且每一类验证都有可见输出。
- [ ] README 与三种 USAGE 的推荐命令一致，不把静态验证描述为 Marketplace、Hook 加载或 Gateway 运行时证明。

**验证：**

- [ ] 增加对验证步骤清单、顺序和失败传播的契约断言。
- [ ] 人为调用一个安全的失败夹具验证 fail-fast，再恢复正常输入。
- [ ] `node scripts/validate-all.js`

**依赖：** 任务 1、3、5。

**可能涉及：**

- `scripts/validate-all.js`
- `scripts/validate-command-parity.js`
- `scripts/validate-guide-parity.js`
- `README.md`
- `docs/USAGE.en.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `work-products/tests/workflow-contract.test.js`

**规模：** 中；先实现可执行入口及契约，再同步文档。

**回滚：** 删除统一入口及其文档推荐即可；原有单项验证器保持可直接运行。

## 任务 7：同步上游的项目原生测试与增量实施规范

**范围：** 仅把 `agent-skills` 更新中与当前 UXUCode 工作流直接相关的内容同步到 Claude/Codex：先发现语言、构建工具、测试框架、配置和既有命令；TDD、增量实施、debug 与 planning 使用仓库实际命令，不再默认 `npm test`。保留 UXUCode 现有文件结构和公开命令，不复制上游仓库包装。

**验收标准：**

- [ ] TDD 明确先发现技术栈与测试发现机制，再决定测试位置和聚焦/完整命令。
- [ ] incremental、debug、planning 使用“项目原生命令”措辞，无 Node/npm 假设。
- [ ] 通用原则与 JS/TS 示例明确区分，不把示例写成跨生态强制规则。
- [ ] Claude/Codex 对应 reference 保持语义一致。

**验证：**

- [ ] `node scripts/validate-skill-parity.js`
- [ ] `node scripts/validate-guide-parity.js`
- [ ] `node scripts/validate-third-party-notices.js`
- [ ] `node scripts/validate-all.js`

**依赖：** 任务 6。

**可能涉及：**

- 两个 Host 的 `test-driven-development`
- 两个 Host 的 `incremental-implementation`
- 两个 Host 的 `debugging-and-error-recovery`
- 两个 Host 的 `planning-and-task-breakdown`
- 两个 Host 的 `testing-patterns.md`

**规模：** 中；逐个 workflow/reference 成对同步。

**回滚：** 按上游主题成对回退；不回退本项目已批准的目录与门禁决策。

## 任务 8：同步上游的审计、性能保留/回退与来源记录

**范围：** 同步生态中立的依赖审计示例，以及 performance 的同条件复测、超过噪声阈值、测试通过才保留，否则回退并记录失败尝试。更新 `THIRD_PARTY_NOTICES.md` 中 `agent-skills` 的固定提交和采用范围。明确排除上游 `.github`、eval fixtures、Hook 文档、仓库级 CLAUDE/CONTRIBUTING 与无关 skill-authoring 结构。

**验收标准：**

- [ ] shipping/security 不再只推荐 `npm audit`，而是按实际生态选择审计工具。
- [ ] performance 要求同条件重测，收益无意义或测试失败时回退，并记录失败尝试。
- [ ] notice 固定到 `7829ffd90d973b6325f5f12f1b1226dcace74443`，采用说明与实际改动一致。
- [ ] 三个未更新基线的固定提交不变；排除项未被带入。

**验证：**

- [ ] `node scripts/validate-third-party-notices.js`
- [ ] `node scripts/validate-skill-parity.js`
- [ ] `node scripts/validate-all.js`

**依赖：** 任务 7。

**可能涉及：**

- 两个 Host 的 `shipping-and-launch`
- 两个 Host 的 `security-checklist.md`
- 两个 Host 的 `performance-optimization`
- `THIRD_PARTY_NOTICES.md`

**规模：** 中。

**回滚：** 回退该上游同步切片并恢复 notice 固定提交；不影响前六项本地修复。

## 任务 9：重构三语言 README 用户路径与范围校验

**范围：** 先修改 `scripts/validate-readme-scope.js`，用会在当前 README 上失败的断言锁定规格第 12.2、12.3、12.5、12.6 节；随后在同一个 `README.md` 中同步重构简体中文、繁体中文和英文部分。三种语言均按“用途、宿主选择、快速安装、首次使用与验证、更新、完整指南、致谢”的顺序呈现。Claude Code 安装必须拆分系统终端与交互会话，OpenClaw 先说明用户价值，`work-products/` 只保留简短说明。移除 README 中面向维护者的仓库验证命令、OpenClaw 评测阈值和 16 命令一致性合同。

**验收标准：**

- [ ] README 三种语言具有相同的标题层级、宿主顺序和操作语义。
- [ ] Claude Code 持久安装明确先在系统终端运行 `claude`，再在 Claude Code 会话内运行 `/plugin marketplace add ./Claude`、`/plugin install uxu-code@uxu-code-claude` 和 `/reload-plugins`。
- [ ] 三个宿主均说明安装位置、重新加载方式和最短验证方法；README 首屏不再展开内部一致性校验、完整过程路径或 OpenClaw 评测指标。

**验证：**

- [ ] RED：只修改校验器后，`node scripts/validate-readme-scope.js` 返回非 0，且输出明确命中预期缺口（执行环境、安装后验证或维护者内容越界），不得用语法错误或无关失败代替。
- [ ] GREEN：完成 README 后，`node scripts/validate-readme-scope.js` 返回 0。
- [ ] `node scripts/validate-no-legacy-commands.js`
- [ ] `node scripts/validate-third-party-notices.js`
- [ ] `git -c safe.directory=C:/Code/UXUCode diff --check -- README.md scripts/validate-readme-scope.js`

**依赖：** 原任务 1-8 及其门禁已完成；依赖已批准规格第 12 节。

**可能涉及：**

- `README.md`
- `scripts/validate-readme-scope.js`

**规模：** 小；2 个文件。

**回滚：** 成对回退 README 与范围校验器；不得只恢复旧校验器而保留不受保护的新信息架构。

## 任务 10：重构三语言完整指南与指南一致性校验

**范围：** 先修改 `scripts/validate-guide-parity.js`，用会在当前指南上失败的断言锁定规格第 12.3、12.4、12.5、12.7、12.8 节；随后以 `docs/USAGE.zh-CN.md` 为语义基准，在同一任务中同步 `docs/USAGE.zh-TW.md` 与 `docs/USAGE.en.md`。三份指南统一为 12 个用户导向章节；集中提供“生成文件位置”表，使用 `[需要时先运行 spec]` 流程表达，并将仓库校验和证据边界收束到维护者附录。OpenClaw 章节保留安装、更新、保护与专项文档入口，但不重复评测用例数、阈值和评分命令。

**验收标准：**

- [ ] 三份指南的 12 个编号章节、二级/三级标题结构、命令、模式、默认值和路径完全对齐。
- [ ] 所有命令块均能从相邻文字判断执行环境；不存在 `spec?`、未解释的维护者术语或在多个命令说明中重复的完整路径清单。
- [ ] “生成文件位置”集中说明 `work-products/` 与 `work-products/tests/` 的唯一位置及测试相对路径合同；维护者附录清楚区分本地静态验证与真实宿主运行证明。

**验证：**

- [ ] RED：只修改校验器后，`node scripts/validate-guide-parity.js` 返回非 0，且输出明确命中预期缺口（章节结构、执行环境、`spec?` 或维护者内容越界），不得用语法错误或无关失败代替。
- [ ] GREEN：完成三份指南后，`node scripts/validate-guide-parity.js` 返回 0。
- [ ] `node scripts/validate-no-legacy-commands.js`
- [ ] `node scripts/validate-readme-scope.js`
- [ ] `node scripts/validate-command-parity.js`
- [ ] `git -c safe.directory=C:/Code/UXUCode diff --check -- docs/USAGE.zh-CN.md docs/USAGE.zh-TW.md docs/USAGE.en.md scripts/validate-guide-parity.js`

**依赖：** 任务 9。README 先确定用户术语和宿主操作顺序，完整指南沿用同一合同。

**可能涉及：**

- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `docs/USAGE.en.md`
- `scripts/validate-guide-parity.js`

**规模：** 中；4 个文件。

**回滚：** 四个文件作为一个语义切片回退；不得留下只有部分语言或只有校验器更新的状态。

## 任务 11：锁定宿主子章节并补充文档校验器契约测试

**范围：** 先为 README 与完整指南校验器增加可直接传入文档内容的最小测试接口，并新增文档校验器契约测试；随后把安装、首次验证和更新检查从“整个阶段内存在命令”收紧为“命令必须位于 Claude Code、Codex CLI 或 OpenClaw 对应子章节”。保留现有 CLI 行为、错误输出和退出码，不引入共享框架或新依赖。把新测试纳入 `node scripts/validate-all.js` 的 workflow contracts 步骤。

**验收标准：**

- [ ] 当前 README 与三份指南继续通过校验。
- [ ] 将 Codex 安装命令移入 OpenClaw 小节、将 `@help` 移入 Claude Code 小节或将 OpenClaw 更新提示移入 Codex 小节时，对应契约测试失败并指出错误宿主。
- [ ] 两个校验器作为 CLI 运行时仍保持失败即返回非 0、成功返回 0；测试接口不在正常 CLI 输出中增加噪声。

**验证：**

- [ ] RED：新增负向测试后，至少一个“命令位于错误宿主小节”的夹具在旧实现上错误通过，使测试返回非 0。
- [ ] GREEN：`node --test work-products/tests/documentation-validator-contract.test.js`
- [ ] `node scripts/validate-readme-scope.js`
- [ ] `node scripts/validate-guide-parity.js`
- [ ] `node scripts/validate-all.js`

**依赖：** 任务 10 已完成；依据首次 `@review` 的两项 Important 发现。

**可能涉及：**

- `scripts/validate-readme-scope.js`
- `scripts/validate-guide-parity.js`
- `scripts/validate-all.js`
- `work-products/tests/documentation-validator-contract.test.js`

**规模：** 中；4 个文件。

**回滚：** 同时回退测试接口、宿主子章节校验、新契约测试和统一入口登记，恢复到任务 10 后的状态；不得只移除失败测试而保留未经覆盖的校验逻辑。

## 任务 12：将评测内容禁用规则收紧为语境匹配

**范围：** 在任务 11 的可测试接口上，将 README 和指南校验器对 `52`、`35%`、`95%` 的裸字符串禁用改为针对 OpenClaw 评测用例数、阈值或评分说明的语境化规则。继续禁止评分命令和专用评测细节进入用户主文档，但允许版本号、普通编号或与评测无关的百分比。复用现有校验器内部结构，不新增跨文件抽象。

**验收标准：**

- [ ] 包含 `v3.0.52`、普通“第 52 条”或与评测无关的 `95%` 示例时，校验器不会仅因数字本身失败。
- [ ] 包含 OpenClaw 评测用例数、发布阈值、评分命令或等价维护者评测说明时，校验器仍返回非 0，并给出维护者内容越界诊断。
- [ ] README 与三份指南的现有用户信息架构和维护者证据边界不变。

**验证：**

- [ ] RED：新增“无关数字应通过”的夹具后，旧裸字符串规则使测试返回非 0。
- [ ] GREEN：`node --test work-products/tests/documentation-validator-contract.test.js`
- [ ] `node scripts/validate-readme-scope.js`
- [ ] `node scripts/validate-guide-parity.js`
- [ ] `node scripts/validate-all.js`

**依赖：** 任务 11；复用其测试接口和夹具结构。

**可能涉及：**

- `scripts/validate-readme-scope.js`
- `scripts/validate-guide-parity.js`
- `work-products/tests/documentation-validator-contract.test.js`

**规模：** 小；3 个文件。

**回滚：** 成对回退语境化规则与对应正反夹具；不得恢复裸数字规则而保留宣称“不会误报”的测试或文档。

## 任务 13：统一繁体中文 rollback 术语并完成复审门禁

**范围：** 将繁体中文 README 与完整指南中表示 rollback 的“回復”统一改为“復原”，覆盖回滚条件、任务可回滚、高风险场景、移除与回滚以及 OpenClaw 指南入口；保留本来表示 recoverable 的“可復原”。简体中文与英文仅做语义对照，不改写无关内容。完成后执行全部文档、统一入口和差异检查，并重新进入 `@review`。

**验收标准：**

- [ ] `README.md` 与 `docs/USAGE.zh-TW.md` 不再用“回復”表达 rollback，统一使用“復原”。
- [ ] 简体中文“回滚”、繁体中文“復原”和英文 “rollback” 在对应段落含义一致，命令、路径、标题层级和宿主顺序不变。
- [ ] 所有静态校验和本地测试通过，结论仍不声称完成真实 Marketplace、Hook 或 OpenClaw Gateway 烟测。

**验证：**

- [ ] `rg -n "回復" README.md docs/USAGE.zh-TW.md` 无匹配。
- [ ] `node --test work-products/tests/documentation-validator-contract.test.js`
- [ ] `node scripts/validate-readme-scope.js`
- [ ] `node scripts/validate-guide-parity.js`
- [ ] `node scripts/validate-no-legacy-commands.js`
- [ ] `node scripts/validate-all.js`
- [ ] `git -c safe.directory=C:/Code/UXUCode diff --check`
- [ ] 人工逐段对照三语言中的安装、验证、更新、回滚和证据边界。

**依赖：** 任务 12。

**可能涉及：**

- `README.md`
- `docs/USAGE.zh-TW.md`

**规模：** 小；2 个文档文件。

**回滚：** 两个繁体中文表面作为一个术语切片回退；不回退任务 11-12 已修复的校验器合同。

## 任务 14：修复 Git 跟踪合同与旧版插件路径兼容

**范围：** 在现有 `.gitignore` 行为测试中同时覆盖新版共享事实、本地过程产物和旧版根目录产物，并清空临时仓库的全局排除文件与 `.git/info/exclude`，确保测试只观察仓库规则。恢复 `/SPEC.md` 与 `/tasks/` 的兼容忽略，同时保持 `work-products/SPEC.md`、`work-products/plan.md`、`work-products/todo.md` 和 `work-products/tests/**` 可跟踪。同步本规格与任务清单，不删除旧版插件已生成的本地文件，也不修改已安装插件缓存。

**验收标准：**

- [x] 根目录 `SPEC.md`、`tasks/plan.md` 和 `tasks/todo.md` 被仓库 `.gitignore` 忽略。
- [x] 规范目录下的三个共享事实文件与合同测试保持可跟踪，本地 debug/review/ship/临时产物保持忽略。
- [x] 行为测试不继承用户级 `core.excludesFile` 或临时仓库 `.git/info/exclude`。
- [x] `work-products/` 是唯一事实源；旧版根目录文件仅作为兼容产物保留在本地。

**验证：**

- [x] RED：扩展行为测试后，修复前仅旧版根目录三个路径不满足预期。
- [x] GREEN：`node --test work-products/tests/workflow-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`

**依赖：** 任务 13 后的 `@review` 发现；不改变任务 1-13 的功能与文档结论。

**可能涉及：**

- `.gitignore`
- `work-products/tests/workflow-contract.test.js`
- `work-products/SPEC.md`
- `work-products/plan.md`
- `work-products/todo.md`

**规模：** 小；5 个文件。

**回滚：** 仅回退任务 14 的忽略规则、隔离夹具与事实源说明；不得删除旧版根目录文件或直接改写已安装插件缓存。

## `clean` 补充实施依据与依赖

**规划依据：** 已批准规格第 13 节及根目录 `AGENTS.md`。现有旧文件只作为实现后的普通验证输入，不参与产品接口、候选分类、冲突语义或目录策略设计。

**实现结构：**

- Claude 与 Codex 各自打包一个无第三方依赖、行为一致的 Node.js 整理引擎；
- 两个公开 `clean/SKILL.md` 只负责参数边界、候选证据收集、调用宿主内引擎和报告结果；
- 合同测试在隔离临时 Git 仓库中直接执行两个引擎，验证输出、文件字节、引用、回滚和 ignore 行为；
- `.gitignore` 的仓库实际切换晚于引擎合同，避免在安全行为尚未完成前改变工作区可见性。

```text
任务 15 预览与候选边界
   └── 任务 16 apply、引用重写与回滚
          └── 任务 17 .gitignore 同步引擎与统一测试登记
                 └── 检查点 E：核心整理合同
                        └── 任务 18 双宿主 clean Skill 打包
                               └── 任务 19 路由与内部命令合同
                                      └── 任务 20 help 与公开路由回归
                                             └── 检查点 F：第 17 个公开命令
                                                    └── 任务 21 三语言用户文档
                                                           └── 任务 22 文档校验合同
                                                                  └── 任务 23 仓库 .gitignore 切换
                                                                         └── 最终 Clean 门禁
```

## 任务 15：建立 `clean` 预览与候选分类合同

**范围：** 先在隔离临时仓库中增加失败测试，再为 Claude/Codex 建立字节级一致的无依赖 Node.js 引擎。无参数运行只扫描和输出 `READY`、`NO_CHANGES` 或 `BLOCKED`，不得写入工作区。测试候选发现覆盖整个仓库，但候选只接受规格第 13.3 节的正向证据；文件名、扩展名、Git 未跟踪状态或通用目录名不能单独构成移动依据。

**验收标准：**

- [x] 预览准确列出源、目标、判定依据、引用变化、ignore 变化、阻塞项和未处理项。
- [x] 项目源码、交付物、符号链接目标和模糊非测试候选逐字节不变；受支持命名的内部测试进入迁移计划。
- [x] 两个宿主引擎对同一 fixture 输出相同结果，且预览前后工作区哈希一致。

**验证：**

- [x] RED：新增测试因引擎不存在或预览合同未实现而失败。
- [x] GREEN：`node --test --test-name-pattern="preview|classification" work-products/tests/clean-contract.test.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`

**依赖：** 已批准规格第 13.1-13.4 节；无实现任务依赖。

**可能涉及：**

- `Codex/scripts/clean-work-products.js`
- `Claude/scripts/clean-work-products.js`
- `work-products/tests/clean-contract.test.js`

**规模：** 中；3 个文件。

**回滚：** 成对移除两个尚未公开接入的引擎与对应测试；不修改现有 Skill、路由或 `.gitignore`。

## 任务 16：实现安全移动、引用重写与失败回滚

**范围：** 在任务 15 的完整预检结果上实现 `apply`。先构建最终源到目标映射，再统一计算被移动文本内部的有效相对路径、迁移集合内部引用以及其他文本文件对迁移源的精确引用。目标冲突、路径逃逸、歧义引用、不可读候选或恢复能力不足时必须 `BLOCKED` 且零部分写入。

**验收标准：**

- [x] `apply` 只移动已确认候选，保留文件内容、UTF-8、换行风格和非目标文本。
- [x] 三类有效引用及迁移文件内可确认的仓库内绝对路径全部指向移动后的正确目标；外部 URL、仓库外绝对路径、动态路径和示例文本不被误改。
- [x] 注入任一步骤失败后，已移动文件和已修改文本恢复到执行前字节；无法恢复时报告确切路径并返回非 0。

**验证：**

- [x] RED：引用、冲突和中途失败 fixture 在实现前失败。
- [x] GREEN：`node --test --test-name-pattern="apply|reference|rollback|conflict" work-products/tests/clean-contract.test.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`

**依赖：** 任务 15。

**可能涉及：**

- `Codex/scripts/clean-work-products.js`
- `Claude/scripts/clean-work-products.js`
- `work-products/tests/clean-contract.test.js`

**规模：** 中；3 个文件。

**回滚：** 成对回退 apply、引用改写和回滚切片，保留任务 15 的只读预览能力。

## 任务 17：实现 `.gitignore` 语义同步并登记统一测试

**范围：** 让引擎按规格第 13.6 节检查和最小修改仓库自身 `.gitignore`：正式事实可跟踪，本地过程产物默认忽略，旧根路径没有兼容规则。用户级 `core.excludesFile` 与 `.git/info/exclude` 只报告、不修改。将 `clean-contract.test.js` 登记进统一验证入口；本任务只验证临时仓库，不提前修改本仓库 `.gitignore`。

**验收标准：**

- [x] 自定义 ignore 注释和无关规则保持原顺序与字节，UXUCode 规则重复运行幂等。
- [x] `/SPEC.md`、`/tasks/` 及其他旧兼容规则被同步计划删除，不新增别名或替代旧路径。
- [x] 外部 exclude 影响被准确报告，索引、提交、全局配置和 `.git/info/exclude` 均不改变。

**验证：**

- [x] RED：ignore 语义、外部 exclude 和幂等 fixture 在实现前失败。
- [x] GREEN：`node --test work-products/tests/clean-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`

**依赖：** 任务 16。

**可能涉及：**

- `Codex/scripts/clean-work-products.js`
- `Claude/scripts/clean-work-products.js`
- `work-products/tests/clean-contract.test.js`
- `scripts/validate-all.js`

**规模：** 中；4 个文件。

**回滚：** 回退 ignore 同步逻辑和统一入口登记，保留已经验证的预览、移动与回滚能力。

## 检查点 E：核心整理合同

- [x] `clean-contract.test.js` 对两个宿主引擎全部通过。
- [x] 预览零写入，apply 失败零部分写入，成功后二次运行为 `NO_CHANGES`。
- [x] 候选分类不依赖当前仓库旧文件或插件缓存。
- [x] 本仓库 `.gitignore` 尚未切换，现有工作区可见性未提前改变。

## 任务 18：增加双宿主 `clean` Skill 与包清单

**范围：** 为 Claude/Codex 新增语义一致的 `clean/SKILL.md`。Skill 只接受预览和精确 `apply`，从自身插件包定位宿主内整理引擎，不依赖调用者 cwd、旧路径或另一个宿主目录。同步两个插件校验器的预期 Skill 集。

**验收标准：**

- [x] 两个 Skill frontmatter 名称均为 `clean`，正文除宿主公开命令格式外语义一致。
- [x] 无参数调用只预览，`apply` 才执行；未知参数明确失败且零写入。
- [x] 两个插件校验器接受新增 Skill，并仍拒绝缺失、重复或名称不匹配的 Skill。

**验证：**

- [x] `node Codex/scripts/validate-plugin.js`
- [x] `node Claude/scripts/validate-plugin.js`
- [x] `node scripts/validate-skill-parity.js`

**依赖：** 检查点 E。

**可能涉及：**

- `Codex/skills/clean/SKILL.md`
- `Claude/skills/clean/SKILL.md`
- `Codex/scripts/validate-plugin.js`
- `Claude/scripts/validate-plugin.js`

**规模：** 中；4 个文件。

**回滚：** 成对回退 Skill 和包清单，不删除核心引擎或合同测试。

## 任务 19：接入路由与内部命令合同

**范围：** 将 `clean` 加入 Claude/Codex 精确命令集合和全局命令一致性校验；同步两个 `using-uxucode` 内部路由，使整理请求进入 `clean`，不由 `build`、`simplify` 或通用 shell 清理代替。

**验收标准：**

- [x] `@clean`、`@clean apply`、`/uxu-code:clean`、`/uxu-code:clean apply` 路由到 `clean`。
- [x] `organize`、带标点/粘连变体和未知参数不成为别名。
- [x] 命令一致性输出为 17 个公开命令、5 个模式，双宿主集合一致。

**验证：**

- [x] `node scripts/validate-command-parity.js`
- [x] `node scripts/validate-skill-parity.js`
- [x] `node --test work-products/tests/workflow-contract.test.js`

**依赖：** 任务 18。

**可能涉及：**

- `Codex/hooks/uxu-prompt-router.js`
- `Claude/hooks/uxu-prompt-router.js`
- `Codex/skills/using-uxucode/SKILL.md`
- `Claude/skills/using-uxucode/SKILL.md`
- `scripts/validate-command-parity.js`

**规模：** 中；5 个文件。

**回滚：** 成对回退路由和内部命令合同；不得只从一个宿主移除 `clean`。

## 任务 20：同步 help 与公开路由回归

**范围：** 将 `clean` 加入两个 help Skill，说明它是移动/整理而非删除命令，并在工作流合同测试中锁定合法调用、`organize` 拒绝、标点边界、未知参数和零别名行为。

**验收标准：**

- [x] 两个 help 精确列出同一组 17 个公开命令，并说明 preview/apply 差异。
- [x] 路由测试覆盖两个宿主的合法与非法 clean token。
- [x] 既有 16 个命令、5 个模式和严格 token 边界不回归。

**验证：**

- [x] `node --test work-products/tests/workflow-contract.test.js`
- [x] `node scripts/validate-command-parity.js`
- [x] `node scripts/validate-no-legacy-commands.js`

**依赖：** 任务 19。

**可能涉及：**

- `Codex/skills/help/SKILL.md`
- `Claude/skills/help/SKILL.md`
- `work-products/tests/workflow-contract.test.js`

**规模：** 小；3 个文件。

**回滚：** 成对回退 help 与 clean 路由断言，保留任务 18 的未公开 Skill 包以便重新修复。

## 检查点 F：第 17 个公开命令

- [x] 两个宿主均能精确路由 clean preview/apply。
- [x] `organize` 和所有未声明变体均被拒绝。
- [x] 插件、Skill、命令与工作流合同全部通过。
- [x] 尚未声称当前安装缓存已重新加载。

## 任务 21：同步三语言 `clean` 用户说明

**范围：** 在 README 简体中文、繁体中文、英文区段及三份完整指南中同步增加 clean 的用途、preview/apply 示例、候选边界、`BLOCKED`/`NO_CHANGES` 状态和 `.gitignore` 说明。README 保持简短，完整移动与安全合同放在指南现有命令和生成文件章节。

**验收标准：**

- [x] 三种语言的命令、参数、状态、风险与“不是删除命令”语义一致。
- [x] 用户能明确判断何时使用 preview、何时允许 apply、哪些文件永远不自动移动。
- [x] 不添加旧路径兼容、项目专属示例、安装缓存已生效声明或维护者实现细节。

**验证：**

- [x] 人工逐段对照三语言 clean 说明。
- [x] `node scripts/validate-readme-scope.js`
- [x] `node scripts/validate-guide-parity.js`

**依赖：** 检查点 F。

**可能涉及：**

- `README.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `docs/USAGE.en.md`

**规模：** 中；4 个文件。

**回滚：** 四个语言表面作为一个切片回退，不回退已验证的公开命令实现。

## 任务 22：锁定三语言与命令文档校验

**范围：** 更新指南命令集合和 README/指南合同测试，要求 paired clean 命令、preview/apply、安全边界与 17 命令一致性；继续禁止 README 首屏暴露维护者实现细节。

**验收标准：**

- [x] 任一语言缺少 clean、参数或安全边界时校验失败。
- [x] `organize` 不被当作公开别名；普通英文中的 organize 不产生误报。
- [x] 既有 12 章节结构、安装/更新顺序、生成路径和证据边界保持不变。

**验证：**

- [x] RED：先增加 clean 文档断言并确认旧校验基线失败。
- [x] GREEN：`node --test work-products/tests/documentation-validator-contract.test.js`
- [x] `node scripts/validate-guide-parity.js`
- [x] `node scripts/validate-readme-scope.js`

**依赖：** 任务 21。

**可能涉及：**

- `scripts/validate-guide-parity.js`
- `scripts/validate-readme-scope.js`
- `work-products/tests/documentation-validator-contract.test.js`

**规模：** 小；3 个文件。

**回滚：** 文档校验与测试成对回退，不保留宣称 clean 已被文档覆盖的虚假门禁。

## 任务 23：将仓库 `.gitignore` 切换到唯一新规范

**范围：** 使用已验证的通用 ignore 同步行为修改本仓库 `.gitignore`，删除 `/SPEC.md`、`/tasks/` 等旧兼容规则，保持正式 facts/tests 可跟踪、本地过程产物默认忽略。更新现有行为测试，使其验证“旧路径不被兼容隐藏”，而不是为当前遗留状态增加特例。

**验收标准：**

- [x] `.gitignore` 不包含旧 UXUCode 路径兼容规则。
- [x] `work-products/SPEC.md`、`plan.md`、`todo.md`、`tests/**` 可正常跟踪，其他过程产物保持忽略。
- [x] 当前仓库中出现的错放文件只按通用 clean 预览结果处理；不新增归档、删除或项目专属分支。

**验证：**

- [x] `node --test work-products/tests/clean-contract.test.js`
- [x] `node --test work-products/tests/workflow-contract.test.js`
- [x] 对新旧目标运行隔离的 `git check-ignore --no-index` 行为检查。

**依赖：** 任务 22。

**可能涉及：**

- `.gitignore`
- `work-products/tests/workflow-contract.test.js`

**规模：** 小；2 个文件。

**回滚：** 回退本任务的仓库规则和行为断言；不得恢复旧路径运行时兼容代码。若新规范本身需逆转，先修订规格并重新批准。

## 最终 Clean 门禁

- [x] `node --test work-products/tests/clean-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`
- [x] 检查相关 diff，确认每一行可追溯到规格第 13 节或根目录 `AGENTS.md`。
- [x] 运行 clean 预览验证当前仓库；若返回 `BLOCKED`，只报告统一合同识别的冲突，不增加兼容或项目特例。
- [x] 未暂存、提交、推送、发布、重装插件或修改安装缓存。
- [x] 进入 `@review`；仓库静态通过不表述为真实 Claude/Codex 插件重新加载证明。

## 任务 24：修复首次 Clean Review 的 Important 发现

**范围：** 根据 `@review` 的四项可复现发现收紧通用 clean 引擎，不改变已批准规格：验证 `.gitignore` 最终语义；覆盖带标题、尖括号和编码空格的 Markdown 引用并增加执行后验证；辅助测试只有明确 `UXUCode work-product` 标记时才可移动；不可读或非 UTF-8 候选结构化返回 `BLOCKED`。Claude/Codex 继续保持字节一致。

**验收标准：**

- [x] 后置 ignore 冲突不再被错误报告为 `NO_CHANGES`。
- [x] 合法 Markdown 引用在移动后保持语法和目标正确。
- [x] 仅引用 Host 文件的项目原生测试保持不动。
- [x] 不可读候选返回明确 blocker，预览不再误报为 apply 失败。

**验证：**

- [x] RED：新增四类回归夹具并确认旧实现出现 4 个失败。
- [x] GREEN：`node --test work-products/tests/clean-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`
- [x] 重新执行 `@review`，且没有未解决的 Critical 或 Important 发现。

## 任务 25：限制 Clean 只改写迁移相关引用

**范围：** 修复第二次 `@review` 发现的非目标修改：被移动文件继续重算仓库内有效相对引用；未移动文件只有在引用明确指向迁移源时才允许改写，其他项目源码和原生文件保持逐字节不变。

**验证：**

- [x] RED：无迁移候选但存在可解析的非规范相对路径时，旧实现错误返回 `READY`。
- [x] GREEN：相同夹具返回 `NO_CHANGES`，文件快照逐字节不变。
- [x] 迁移文件自身引用与外部文件指向迁移源的引用仍通过既有合同测试。
- [x] Claude/Codex Clean 引擎保持字节一致。
- [x] `node --test work-products/tests/clean-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`
- [x] 重新执行 `@review`，且没有未解决的 Critical 或 Important 发现。

## 任务 26：修复 Clean 测试发现范围与项目内绝对路径

**范围：** 修复测试候选仅扫描根目录 `tests/` 的缺陷，使全仓内受支持命名的内部测试无需额外 UXUCode 标记即可统一迁入 `work-products/tests/`；对被迁移测试中可确认指向当前仓库文件的绝对路径，按最终位置改写为相对路径。规范目录内既有测试、项目源码及仓库外路径保持不变。本任务按用户 2026-07-30 的明确确认取代此前项目原生测试例外。

**验证：**

- [x] RED：无 UXUCode 标记的根目录与项目原生测试在旧实现中错误返回 `NO_CHANGES`。
- [x] GREEN：根目录、嵌套目录和项目原生测试均进入 `work-products/tests/`，不再要求额外归属标记。
- [x] 迁移测试内的仓库绝对路径改为从 `work-products/tests/` 出发的相对路径。
- [x] build、debug、test 与 TDD 工作流统一要求新测试位于 `work-products/tests/`，并禁止机器绑定的绝对路径。
- [x] Claude/Codex Clean 引擎保持字节一致。
- [x] `node --test work-products/tests/clean-contract.test.js`
- [x] `node --test work-products/tests/workflow-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`

## 任务 27：修复 Clean Review 的安全与完整性缺口

**规划依据：** 用户已明确要求根据 `@review` 意见规划并修复；五项发现均有具体触发条件、影响与可验证修复，不存在未决产品决策。

**范围：**

1. 预览阶段检测多个迁移源映射到同一目标，并以 `TARGET_COLLISION` 返回 `BLOCKED`。
2. 验证目标既存祖先，不允许符号链接、junction、非目录祖先或仓库逃逸。
3. 全仓扫描跳过任意层级的依赖与版本控制目录。
4. 将受支持测试命名从 JS 扩展为跨语言、跨扩展名的明确 test/spec 边界约定。
5. 只自动改写可证明具有路径语义的相对或绝对引用；裸字符串精确命中迁移源时以 `AMBIGUOUS_REFERENCE` 返回 `BLOCKED`。

**验收与回滚：**

- [x] RED：重复目标、目标父目录链接、嵌套依赖、跨语言测试、非测试 `test-` 前缀，以及测试/过程迁移源的歧义裸字符串分别建立失败回归。
- [x] GREEN：所有危险情况在预览阶段零写入 `BLOCKED` 或安全跳过；跨语言测试进入规范目录。
- [x] Claude/Codex Clean 引擎保持字节一致。
- [x] 规格、Clean Skill 和三语文档同步支持范围与 fail-closed 行为。
- [x] `node --test work-products/tests/clean-contract.test.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`
- 回滚：恢复本任务对 Clean 引擎、合同测试、规格和文档的修改；不执行真实迁移。

## 检查点

### 检查点 A：任务 1-3 后

- [ ] 过程产物路径可逆迁移完成。
- [ ] 合法命令仍可路由，标点和粘连变体全部拒绝。
- [ ] 三语指南与 Host 内说明不再展示伪命令。

### 检查点 B：任务 4-5 后

- [ ] 清晰任务可直接规划，存在实质未决决策时仍要求规格。
- [ ] 所有阶段使用规范目录，新测试统一位于 `work-products/tests/` 且仓库文件引用使用相对路径。
- [ ] Claude/Codex 的语义一致性验证通过。

### 检查点 C：任务 6 后

- [ ] `node scripts/validate-all.js` 成为单一推荐入口。
- [ ] fail-fast、退出码、子进程输出和覆盖清单均有测试证据。

### 原实施门禁：任务 7-8 后

- [ ] `node scripts/validate-all.js` 返回 0。
- [ ] `git -c safe.directory=C:/Code/UXUCode diff --check` 返回 0。
- [ ] diff 中每一行都能追溯到批准规格或选择性上游同步。
- [ ] 未新增依赖、CI、别名、部署或发布动作。
- [ ] 静态验证结论没有被表述成真实 Host/Marketplace/OpenClaw Gateway 运行时证明。
- [ ] 进入 `@review` 前由用户确认计划任务均完成。

### 检查点 D：任务 9 后

- [ ] README 三种语言都能从克隆仓库顺利走到安装后验证。
- [ ] Claude Code 的系统终端和交互会话命令不再混排。
- [ ] README 范围校验保护新的用户信息架构，并继续保护三语言同步和致谢内容。

### 最终文档门禁：任务 10 后

- [ ] `node scripts/validate-readme-scope.js` 返回 0。
- [ ] `node scripts/validate-guide-parity.js` 返回 0。
- [ ] `node scripts/validate-no-legacy-commands.js` 返回 0。
- [ ] `node scripts/validate-command-parity.js` 返回 0。
- [ ] `node scripts/validate-third-party-notices.js` 返回 0。
- [ ] `node scripts/validate-all.js` 返回 0。
- [ ] `git -c safe.directory=C:/Code/UXUCode diff --check` 返回 0。
- [ ] 人工对照三语言安装、更新、首次验证、OpenClaw 和 `work-products/` 段落，确认命令与语义一致且译文自然。
- [ ] 验证结论明确限定为仓库静态校验与本地测试，不声称已完成真实 Marketplace、Hook 或 OpenClaw Gateway 烟测。
- [ ] 进入 `@review` 前由用户确认任务 9-10 均完成。

### 评审修复门禁：任务 11-13 后

- [ ] 文档校验器能拒绝位于错误宿主小节的安装、首次验证和更新命令。
- [ ] 文档校验器只拒绝带评测语境的维护者指标，不因无关数字误报。
- [ ] 繁体中文 rollback 术语统一为“復原”，三语言对应语义自然一致。
- [ ] 新文档校验器契约测试已纳入 `node scripts/validate-all.js`。
- [ ] `node scripts/validate-all.js` 与 `git diff --check` 返回 0。
- [ ] 重新执行 `@review`，且没有未解决的 Critical 或 Important 发现。

## 任务 28：解除 Ship NO-GO 的仓库整理阻塞

**规划依据：** 已批准规格第 14 节、2026-07-30 `@ship` 的可复现 `BLOCKED` 输出，以及用户对本计划和 `@build auto` 的明确批准。目标、范围、约束、验收与回滚均已确定，无未决产品决策。

### 任务 28.1：移除被取代的旧事实源

**范围：** 核对根目录 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md` 是已被规范事实源取代的历史规划产物，然后删除这三个受 Git 跟踪的旧源。不改写当前规范文件的既有内容，不增加归档或兼容路径。

**验收：**

- [x] 三个旧源在文件系统中不存在，`git status --short` 将其记录为删除。
- [x] `work-products/SPEC.md`、`plan.md`、`todo.md` 继续可跟踪且内容完整。
- [x] 仓库公开说明和运行时不读取旧路径。

**验证：**

- [x] `git -c safe.directory=C:/Code/UXUCode status --short`
- [x] `rg -n "(^|[^A-Za-z0-9_-])(SPEC\\.md|tasks/plan\\.md|tasks/todo\\.md)" . --glob "!.git/**" --glob "!work-products/**"` 只允许 Clean 引擎的迁移合同与根规则说明命中。

**回滚：** 从 Git 历史恢复三个旧文件，并同时恢复本任务状态；不得让恢复文件重新成为受支持事实源。

### 任务 28.2：迁移 OpenClaw 内部测试及其执行路径

**范围：** 将两个 OpenClaw 测试移动到 `work-products/tests/OpenClaw/tests/`，按最终位置重算其相对引用；同步 `scripts/validate-all.js`、`OpenClaw/README.md`、`OpenClaw/evaluation/README.md` 与文档校验器中的命令路径。

**验收：**

- [x] `OpenClaw/tests/` 不再包含测试源；两个新路径正常跟踪。
- [x] 测试仍访问 `OpenClaw/` 下原有脚本、模板和评测 fixture，不复制产品文件。
- [x] 统一入口和专项文档只展示新测试路径。

**验证：**

- [x] RED：移动后未改相对路径时，聚焦测试因模块或 fixture 路径失败。
- [x] GREEN：`node --test work-products/tests/OpenClaw/tests/validate-profile.test.js work-products/tests/OpenClaw/tests/evaluation.test.js`
- [x] 公开文档、统一入口和校验器中无以旧目录开头的可执行测试命令。

**回滚：** 同时恢复两个测试源、相对引用、统一入口和两份专项文档；不得留下双份测试。

### 任务 28.3：关闭最终 Clean 与发布前本地门禁

**范围：** 运行双宿主 Clean 预览、统一验证、差异检查和当前 diff 审查；只在没有未解决 Critical/Important 问题时关闭任务清单。

**验收与验证：**

- [x] Claude/Codex Clean 预览均为 `NO_CHANGES` 且输出一致。
- [x] `node scripts/validate-all.js` 12 步通过。
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check` 返回 0。
- [x] `git ls-files --deleted` 精确包含三个旧事实源和两个旧测试源，新测试路径未被忽略且可跟踪。
- [x] 当前 diff 无未解释的 Critical 或 Important 问题。
- [x] 明确保留真实 Marketplace、Hook、Gateway 与生产行为为未验证。

**回滚：** 任务 28.1 与 28.2 各自独立回滚；验证记录可重跑，不修改产品状态。

## 任务 29：修复 Clean 在真实项目中的误阻塞与大仓库崩溃

**规划依据：** 用户提供了 AShareQuantFusion 的 3 个歧义引用与 6 个 Python 字节码候选；零写入复现进一步发现补丁脚本／派生文件误分类和 4 GB Node 堆 OOM。

**范围与验收：**

- [x] `__pycache__/` 与补丁派生文件不进入测试迁移候选。
- [x] 测试目录外的 Python `*_test.py` 排除字符串／注释后仍需真实测试证据，补丁生成脚本保持原位。
- [x] `Path(...)`、仓库根路径拼接、耦合路径元数据与统一 diff 路径可证明时同步改写；普通裸字符串继续 `AMBIGUOUS_REFERENCE`。
- [x] 全仓扫描逐文件读取；64 MB 堆下处理 80 MB 文本夹具不再 OOM。
- [x] AShareQuantFusion 零写入复测为 `READY`、0 blocker，且所报补丁脚本／派生文件均安全跳过。
- [x] Claude/Codex 引擎与 Skill 保持字节一致，三语言 README／指南和规格同步。

**验证：** `node --test work-products/tests/clean-contract.test.js`、`node scripts/validate-all.js`、`git -c safe.directory=C:/Code/UXUCode diff --check`。

**回滚：** 成对回退引擎、合同测试、规格、双宿主 Skill 与三语言说明；不对验证用项目执行 `apply`。

## 任务 30：修复 Clean 的 Codex 沙箱误阻塞与嵌套规范目录

**规划依据：** 2026-07-30 `@debug` 已零写入证明：managed sandbox 内 Node `spawnSync('git', ...)` 返回 `status=null`、`error.code=EPERM`，但 Clean 丢失 `result.error` 并误报 `git init failed`；沙箱外同一检查正常，Clean 合同测试 28/28。CfGfwAX 沙箱外仅剩两个真实 `TARGET_EXISTS`；GMSSL 当前还暴露嵌套 `cloud_layer/work-products/tests/` 被重复拼入目标。批准规格已明确 Git 是 ignore 语义事实源、根级 `work-products/` 是唯一规范位置且不得增加项目专属分支，因此无需新增规格。

### 任务 30.1：建立 RED 合同

**范围：** 为 Git 无法启动、根级规范测试幂等、嵌套 `<prefix>/work-products/tests/<rest>` 目标归一化，以及 Skill 的沙箱审批重跑增加独立夹具。

**验收标准：** `PATH` 中无 Git 时稳定得到 `status=null` 与 `error.code=ENOENT`；错误报告、Skill 重试和嵌套目标分别 RED；`cloud_layer/work-products/tests/test_example.py` 的唯一目标为 `work-products/tests/cloud_layer/test_example.py`。

**验证：** `node --test work-products/tests/clean-contract.test.js`；`node --test work-products/tests/workflow-contract.test.js`；确认失败均为预期断言而非测试运行器自身的无关 `spawn EPERM`。

**依赖：** 任务 29及本次 `@debug`。**可能涉及：** 两个合同测试。**规模：** 小。**回滚：** 仅回退新增夹具。

### 任务 30.2：结构化 Git 错误并增加沙箱兼容重试

**范围：** 统一报告 Git 子进程的 `result.error`、状态、信号和 stderr，不再把 `EPERM`／`ENOENT` 降级为通用错误。保留 Git 作为 ignore 语义事实源，不实现不完整的 JavaScript matcher。双宿主 Clean Skill 仅在结构化权限错误且宿主提供审批机制时，以相同参数最多重跑一次；预览不得升级为 `apply`，真实 Git 或 ignore 错误不重试。

**验收标准：** 初始化和 `check-ignore` 启动失败均保留真实错误；`TARGET_EXISTS`、`GITIGNORE_SEMANTIC_CONFLICT` 与外部 exclude 报告不回归；Claude/Codex 引擎与 Skill 分别字节一致；无第三方依赖、安装缓存修改。

**验证：** 两个合同测试；`node scripts/validate-skill-parity.js`；managed sandbox 内看到结构化 `EPERM`，经审批在沙箱外重跑后 CfGfwAX 不再出现 `GITIGNORE_CHECK_FAILED`。

**依赖：** 任务 30.1。**可能涉及：** 双宿主 Clean 引擎、双宿主 Clean Skill、两个合同测试。**规模：** 中。**回滚：** 成对回退，不回退 Git 语义验证与失败关闭。

### 任务 30.3：规范化嵌套测试目录与 ignore 规则

**范围：** 根级 `work-products/` 继续跳过；其他层级的 `<prefix>/work-products/tests/<rest>` 统一映射为 `work-products/tests/<prefix>/<rest>`。只计划删除与 canonical 六规则精确同构的非根级 UXUCode ignore 规则族；相邻注释、部分匹配和其他规则不动，冲突或歧义继续 `BLOCKED`。不得出现 GMSSL、`cloud_layer` 等项目名称分支。

**验收标准：** 任意前缀使用同一算法且目标无重复 `work-products/tests`；根级六规则保留，精确非根级规则族移除，无关内容逐字节不变；既有碰撞、祖先、引用和回滚合同不回归。

**验证：** Clean 合同测试；GMSSL 零写入预览映射到 `work-products/tests/cloud_layer/test_cloud_dashboard_gunicorn_config.py`；等价 fixture 应用后再次预览为 `NO_CHANGES`；不对 GMSSL 执行 `apply`。

**依赖：** 任务 30.1，并与任务 30.2 串行修改共享引擎。**可能涉及：** 双宿主 Clean 引擎和 Clean 合同测试。**规模：** 中。**回滚：** 成对回退归一化、规则清理和测试。

### 任务 30.4：关闭真实项目与统一回归门禁

**范围：** 不修改 CfGfwAX、GMSSL 或安装缓存，只运行零写入预览和 UXUCode 本地门禁。

**验收标准：** CfGfwAX 沙箱外预览只保留两个 plan/todo `TARGET_EXISTS` 且不自动合并；GMSSL 只识别真实测试、`tests/__init__.py` 不误报且目标已规范化；两个项目现有工作保持不变；本地证据不冒充安装缓存或新会话证明。

**验证：** 两个合同测试；`node scripts/validate-all.js`；`git -c safe.directory=C:/Code/UXUCode diff --check`；双宿主引擎与 Skill SHA-256；记录两个项目预览但不运行 `apply`。

**依赖：** 任务 30.2、30.3。**可能涉及：** 无新增实现文件。**规模：** 小。**回滚：** 验证零写入，失败时保持任务未完成。

## 任务 30 检查点

- [x] 30A：RED 逐项对应已复现缺陷。
- [x] 30B：权限错误可诊断且可审批重跑，真实 Git／ignore 错误仍失败关闭。
- [x] 30C：嵌套目录通用归一化，根级规范目录幂等。
- [x] 最终门禁：任务 30.4 全部通过后进入 `@review`；不暂存、提交、推送、发布、重装插件或修改安装缓存。

**完成证据：** RED 为 43/46，通过项之外仅保留结构化子进程错误、Skill 审批重跑和嵌套目录归一化三项预期失败；实现后 Clean／workflow 合同 46/46，通过统一 12 步门禁（workflow 66/66、OpenClaw 27/27）。UXUCode 预览为 `NO_CHANGES`；CfGfwAX 沙箱外只剩两个真实 `TARGET_EXISTS`；GMSSL 为 `READY`，唯一移动已归一化到根级 `work-products/tests/cloud_layer/`，两个验证仓库均保持 Git 状态不变且未执行 `apply`。

## 任务 31：修复 Clean 归属、显式迁移与完整性安全合同

**规划依据：** 用户已批准 `work-products/SPEC.md` 第 15 节并显式调用 `@plan`；`work-products/debug/clean-command-defects-2026-07-31.md` 已用隔离仓库复现 legacy 残留、项目测试误迁移、特殊过程产物不可见和补丁哈希失效四类缺陷。目标、接口、无兼容策略、回滚和可测验收均已明确，无未决产品决策。

**实现决策：**

- Claude/Codex 继续各自打包，两个 `clean-work-products.js` 与两个 Clean Skill 分别保持字节一致，不新增共享运行时模块。
- `work-products/tests/clean-contract.test.js` 是行为事实源；每个行为切片先建立可归因 RED，再修改引擎。
- `work-products/clean-migration.json` 是持久、可跟踪的逐文件路由合同；UXUCode 仓库本身没有实际映射需求时不创建空清单，只在隔离 fixture 中验证。
- JSON 报告一次性升级为 v2，不保留 v1 双写、别名或回退分支。
- report v2 是破坏性接口变更，因此发布版本目标为 `5.0.0`；当前未提交的 4.2.1 文档与版本修改必须保留并在最终差异中可追溯。

### 任务 31.1：建立归属、legacy 原子性与 report v2 的 RED 合同

**范围：** 修正当前把 `product.test.mjs` 自动迁移及统一 diff 自动改写视为正确行为的断言；增加 `tasks/` 残留、普通项目测试保留、report v2 分类和 BLOCKED 零写入夹具。测试文件继续只使用从 `work-products/tests/` 最终位置出发的仓库相对路径。

**验收标准：**

- 旧引擎对 `tasks/plan.md + tasks/evidence.md` 错误返回 `READY`、错误移除 `/tasks/` 的断言稳定 RED。
- 旧引擎把无授权 `product.test.mjs` 标为 `internal-test-artifact`，且缺少 v2 分类字段的断言稳定 RED。
- 每个失败均来自预期行为差异，不是 fixture、Git、临时目录或子进程错误。

**验证：** `node --test work-products/tests/clean-contract.test.js`，记录精确预期失败名称与数量。

**依赖：** 已批准 SPEC 第 15 节。**可能涉及：** `work-products/tests/clean-contract.test.js`。**规模：** 小。**回滚：** 只回退新增/修正的 RED 夹具，不修改实现。

### 任务 31.2：实现 P0 归属分类、legacy 全量对账与 report v2 骨架

**范围：** 将测试 discovery 与 move authorization 分离；无显式授权的测试保持原位并进入 `preservedProductFiles`。在完整 `moveMap` 前枚举根 `tasks/`，未覆盖条目阻塞全部写入和 `/tasks/` 移除。将双宿主报告切换到 v2 基础字段和稳定排序。

**验收标准：**

- 普通项目测试不移动、不阻塞，且分类报告稳定；固定 legacy 映射继续工作。
- `tasks/` 任一残留产生结构化 blocker，preview/apply 后文件与 `.gitignore` 字节不变。
- 两套引擎输出相同 v2 shape，既有目标、链接、歧义、外部 exclude、内存和回滚合同不回归。

**验证：** `node --test work-products/tests/clean-contract.test.js`；比较两个引擎 SHA-256。

**依赖：** 任务 31.1。**可能涉及：** 两个 `scripts/clean-work-products.js`、`work-products/tests/clean-contract.test.js`。**规模：** 中。**回滚：** 成对回退引擎和对应 GREEN 断言，不恢复错误的正向合同。

## 检查点 31A：P0 失败关闭

- [x] 归属与 legacy RED 已转绿，普通项目测试保持原位。
- [x] 任一 legacy 残留阻塞所有写入并保留 `/tasks/`。
- [x] report v2 基础字段、稳定排序和双宿主一致性成立。

### 任务 31.3：建立显式清单 schema、生命周期与 tracking 的 RED 合同

**范围：** 为清单缺失/有效、未知版本/字段、非规范路径、逃逸、重复源/目标、固定事实源覆盖、链接祖先、inactive/satisfied/再次出现生命周期，以及 tracked/local Git 语义建立隔离 fixture。

**验收标准：**

- 每个非法输入得到 SPEC 指定的结构化 blocker，且工作区零写入。
- 缺失源进入 `inactiveManifestEntries`；缺失源且目标存在为已满足；源再次出现且目标存在返回 `TARGET_EXISTS`。
- tracked 目标需要最窄例外，local 目标保持忽略；旧引擎因不识别清单而稳定 RED。

**验证：** `node --test work-products/tests/clean-contract.test.js`，确认失败只对应清单和 tracking 新合同。

**依赖：** 检查点 31A。**可能涉及：** `work-products/tests/clean-contract.test.js`。**规模：** 中。**回滚：** 只回退本任务夹具。

### 任务 31.4：实现持久 manifest、完整 moveMap 与动态 Git 语义

**范围：** 解析并严格校验 `work-products/clean-migration.json`，将存在源的显式映射合入完整 moveMap；实现 inactive/satisfied 生命周期、tracking 元数据和最窄动态 ignore 规则。仓库根 `.gitignore` 仅增加 manifest 自身的跟踪例外，不创建空 manifest。

**验收标准：**

- schema、路径、唯一性、目标安全和项目无关边界全部失败关闭，不含 CfGfwAX/xhttp 分支。
- 显式 benchmark/test/debug/rollback 映射得到正确目标与授权来源；移动文件内部及外部精确引用从最终位置重算。
- `git check-ignore --no-index` 证明 manifest 与 tracked 目标可跟踪、local 目标保持忽略；规则重复生成无变化。

**验证：** `node --test work-products/tests/clean-contract.test.js`；隔离 fixture 运行 preview/apply/preview；`git check-ignore` 语义断言；双引擎 SHA-256。

**依赖：** 任务 31.3。**可能涉及：** 两个 clean 引擎、`work-products/tests/clean-contract.test.js`、`.gitignore`。**规模：** 中。**回滚：** 成对回退 manifest/parser、动态规则、根 ignore 例外和对应测试。

## 检查点 31B：显式迁移能力

- [x] 清单边界、生命周期、目标安全和项目无关性全部通过。
- [x] tracked/local Git 语义由真实 Git 验证，未放开整个 `work-products/`。
- [x] apply 后二次 preview 为 `NO_CHANGES`，清单不被自动删除或修改。

### 任务 31.5：建立补丁策略与校验耦合的 RED 合同

**范围：** 增加 `references`、`preserve-content`、`mutable-patch` 三策略；GNU `SHA256SUMS*`／`SHA512SUMS*` 精确绑定；patch 字节/哈希保持；耦合 mutable patch 阻塞和 apply 零写入夹具。

**验收标准：**

- 普通 `references` 不得用于 `.patch`／`.diff`；缺少显式策略不能触发 diff 头改写。
- `preserve-content` 迁移前后字节与摘要一致，但外部对补丁路径的精确引用可更新。
- 被校验清单绑定的 `mutable-patch` 返回 `INTEGRITY_COUPLED_ARTIFACT`，旧引擎的静默哈希失效稳定 RED。

**验证：** `node --test work-products/tests/clean-contract.test.js`，同时核对 SHA-256/SHA-512 夹具的预期摘要。

**依赖：** 检查点 31B。**可能涉及：** `work-products/tests/clean-contract.test.js`。**规模：** 小。**回滚：** 只回退完整性 RED 夹具。

### 任务 31.6：实现 rewrite policy、checksum 识别与哈希复核

**范围：** 将引用改写受每项 `rewritePolicy` 约束；识别 SPEC 指定文件名和 GNU 格式的 SHA-256/SHA-512 精确绑定；preview 记录保护关系，apply 验证 preserve-content 目标摘要。未知格式只报告/跳过，不猜测改写或重算校验清单。

**验收标准：**

- 只有 `mutable-patch` 可改写未耦合 patch 的 unified-diff 头；普通文本仍沿用无歧义引用合同。
- preserve-content 任一字节或哈希漂移使事务失败并恢复；完整性 blocker 在写前产生。
- v2 `integrityProtectedFiles` 内容稳定，既有 `AMBIGUOUS_REFERENCE` 与逆补丁证据不回归。

**验证：** `node --test work-products/tests/clean-contract.test.js`；双引擎 SHA-256；针对 preserve-content fixture 做 apply 前后摘要比较。

**依赖：** 任务 31.5。**可能涉及：** 两个 clean 引擎、`work-products/tests/clean-contract.test.js`。**规模：** 中。**回滚：** 成对回退策略、checksum 解析、事务复核和对应测试。

## 检查点 31C：完整性与事务

- [x] patch 默认不改内容，显式 mutable 且无完整性耦合时才允许改写。
- [x] SHA-256/SHA-512 绑定被报告并保护，clean 不自动重算清单。
- [x] 所有 BLOCKED fixture 的文件、manifest 和 `.gitignore` 字节不变。

### 任务 31.7：同步双宿主 Clean/Help 合同与路由回归

**范围：** 更新双宿主 Clean Skill 和 Help 对测试归属、manifest、report v2、完整性及零写入边界的说明；路由命令与参数不变，仅更新 workflow 合同以锁定 Skill parity 和 exact invocation。

**验收标准：** 两个 Clean Skill 字节一致，两个 Help Skill 字节一致；仍只接受 `@clean`/`@clean apply` 与 Claude 对应形式；不新增别名、其他参数或缓存路径；结构化权限重试合同保留。

**验证：** `node --test work-products/tests/workflow-contract.test.js`；`node scripts/validate-skill-parity.js`。

**依赖：** 检查点 31C。**可能涉及：** 双宿主 `clean/SKILL.md`、双宿主 `help/SKILL.md`、`work-products/tests/workflow-contract.test.js`。**规模：** 中。**回滚：** 成对回退 Skill 与新增合同；路由实现无需变更。

### 任务 31.8：同步三语言完整指南与 guide 校验

**范围：** 以简体中文为语义基准，同步三份 `docs/USAGE.*.md` 的文件名只发现、manifest schema/生命周期、tracking、patch 策略、report v2 和 BLOCKED/NO_CHANGES 说明；更新 guide parity 与负向契约测试。

**验收标准：** 三语言命令、字段、枚举、路径和失败语义一一对应且译文自然；删除“命名即内部测试”和“统一 diff 总是改写”的旧承诺；校验器既能拒绝缺失新安全边界，也不绑定整段文案。

**验证：** `node scripts/validate-guide-parity.js`；`node --test work-products/tests/documentation-validator-contract.test.js`。

**依赖：** 任务 31.7。**可能涉及：** 三份 `docs/USAGE.*.md`、`scripts/validate-guide-parity.js`、文档校验器合同测试。**规模：** 中。**回滚：** 三语言、校验器和测试作为同一切片回退。

### 任务 31.9：同步三语言 README 摘要与 README 校验

**范围：** 更新单文件 README 的简体、繁体和英文 clean 摘要，只保留用户决策所需的 discovery/authorization、manifest、完整性和 v2 状态边界；详细 schema 留在完整指南。同步 README scope 校验和负向合同。

**验收标准：** 三个语言段落语义一致、不堆积实现细节；不再声称 test/spec 名称足以迁移；仍明确 preview 零写入、精确 apply、BLOCKED 和非删除边界。

**验证：** `node scripts/validate-readme-scope.js`；`node --test work-products/tests/documentation-validator-contract.test.js`。

**依赖：** 任务 31.8，并与其串行修改共享文档合同测试。**可能涉及：** `README.md`、`scripts/validate-readme-scope.js`、文档校验器合同测试。**规模：** 小。**回滚：** 三语言 README 段落、校验器和测试同时回退。

## 检查点 31D：宿主与文档一致性

- [x] 双宿主 Skill/help parity、exact route 和权限重试合同通过。
- [x] README 与三份指南不再公开旧错误行为，新接口与枚举完全同步。
- [x] 文档校验对每个新边界均有通过和拒绝夹具。

### 任务 31.10：同步 5.0.0 发布事实源

**范围：** 因 report v2 移除 v1 合同，将两个 host manifest、Claude marketplace 与两个 host validator 同步到 `5.0.0`；保留 Claude/Codex 独立包边界和当前 4.2.1 未提交修改的其他内容。

**验收标准：** 五个事实源版本一致；Claude marketplace 版本等于 manifest；两套 validator 精确断言 5.0.0；不重装插件、不修改缓存、不提交或发布。

**验证：** `node Claude/scripts/validate-plugin.js`；`node Codex/scripts/validate-plugin.js`；定向读取五个版本值。

**依赖：** 检查点 31D。**可能涉及：** 两个 plugin manifest、Claude marketplace、两个 plugin validator。**规模：** 中。**回滚：** 五个版本事实源作为单一切片恢复，不保留混合版本。

### 任务 31.11：更新版本合同并关闭本地门禁

**范围：** 将 workflow release contract 切换到 5.0.0，运行聚焦、文档、统一、差异和双宿主哈希门禁；只对 UXUCode 与 CfGfwAX 运行零写入 preview，不执行真实项目 apply。

**验收标准：**

- Clean、workflow、documentation 合同全部通过，统一 12 步入口和 `diff --check` 返回 0。
- UXUCode preview 为 `NO_CHANGES`；CfGfwAX 当前样本已无 legacy 项且项目测试均在规范目录，preview 为 `READY`，仅建议加入 `!/work-products/clean-migration.json`；合同夹具另行证明项目测试保留及未映射 legacy 项结构化 `BLOCKED`，两仓库 Git 状态前后相同。
- 双宿主引擎与 Clean Skill SHA-256 分别一致；结论不冒充安装缓存、新会话、Marketplace 或生产证明。

**验证：** `node --test work-products/tests/clean-contract.test.js work-products/tests/workflow-contract.test.js work-products/tests/documentation-validator-contract.test.js`；`node scripts/validate-all.js`；`git -c safe.directory=C:/Code/UXUCode diff --check`；双宿主哈希；两仓库 preview 前后 `git status --short` 比较。

**依赖：** 任务 31.10。**可能涉及：** `work-products/tests/workflow-contract.test.js` 及计划/todo 状态记录。**规模：** 小。**回滚：** 验证本身零写入；失败时保持任务未完成，不回退用户既有改动。

## 任务 31 最终检查点

- [x] 31A：归属、legacy 原子性和 report v2 基础合同通过。
- [x] 31B：manifest、tracking 与幂等合同通过。
- [x] 31C：patch/checksum 完整性与事务合同通过。
- [x] 31D：双宿主、三语言文档和校验合同通过。
- [x] 最终门禁：5.0.0 事实源一致，统一验证、差异检查、零写入真实项目 preview 与 `@review` 均无未解决 Critical/Important 问题。

**完成证据：** Clean、workflow、documentation 合同分别为 43/43、18/18、17/17；统一 12 步门禁为 workflow 84/84、OpenClaw 27/27，`diff --check` 返回 0。双宿主引擎 SHA-256 同为 `626A551E97A29CE3A7388389BABB845066263B02CA7C11E48F1E7F0498A8F94C`，Clean Skill 同为 `3ABE39FCF9E8248F5A9EC4F7C4AB9417E10B15FC4F6192A30A3DE215F3C40AF1`。权限外重试的零写入 preview 中，UXUCode 为 `NO_CHANGES`，CfGfwAX 为仅补迁移清单精确 Git 例外的 `READY`，两仓库 Git 状态不变且未执行 `apply`；最终 `@review` 无未解决 Critical/Important 问题。

## 任务 32：修复 5.0.0 Clean 复审缺陷并发布 5.0.1 合同

**状态：** 已完成（2026-08-02，用户显式调用 `@debug`）。本任务以新的可复现证据取代任务 31 的最终复审结论，不改写任务 31 的历史实施记录。

**范围：** 修复单文件 tracked 例外放行同目录本地文件、固定事实源后代未受保护，以及大小写不敏感文件系统将同一物理源计划两次的问题；同步双宿主引擎、合同测试和 5.0.1 发布事实源，不修改三语言既有正确合同。

**根因与修复：** 动态 ignore 规则改为按目标稳定排序，并为每级祖先生成“放行目录、重新忽略目录内容、精确放行目标”的有序规则；既有宽泛规则会原子重排。manifest 使用仓库文件系统大小写语义比较固定源、固定目标及其后代，并在完整 move 集合上阻塞重复物理源。

**验证：** 三个新增反例修复前均 RED，修复后连同旧规则升级用例全部通过；Clean、workflow、documentation 合同合计 80/80，通过统一 12 步门禁与 `diff --check`。双宿主引擎 SHA-256 同为 `3D4F4325583BF36940E145F9DD5D32374F5040B0718A56FD874EC84466540D97`。这些是仓库本地证据，不代表插件重装、新任务加载、Marketplace 或生产行为。

**执行顺序：** 31.1 → 31.2 → 31A → 31.3 → 31.4 → 31B → 31.5 → 31.6 → 31C → 31.7 → 31.8 → 31.9 → 31D → 31.10 → 31.11。共享引擎、共享文档合同和版本事实源必须串行修改；不得并行写同一文件。

**授权边界：** 本计划不授权暂存、提交、推送、发布、部署、插件重装、缓存修改或任何真实项目 `clean apply`。

## 任务 33：移除共享文档验证并关闭 5.0.4 理论跨平台门禁

**状态：** 已完成（2026-08-03，用户明确要求“理论验证正确即可，共享验证不要”）。该要求提供了目标、范围、约束和可验证验收，无需新增规格。

**范围：** 删除本轮新增的 `scripts/documentation-validation.js`，让 README 与完整指南校验器继续各自保留所需解析逻辑；修正 mode-policy 合同测试的临时环境，使 Windows 配置写入隔离到 `APPDATA`，macOS/Linux 配置写入隔离到临时 `HOME`。本轮不要求真实 macOS/Linux 主机验证，但必须用平台分支合同和本地回归证明理论路径正确。完成后将五个发布事实源及版本合同同步到 5.0.4。

**验收标准：**

- 两个文档校验器不依赖共享验证模块，原有通过与拒绝合同保持不变。
- 测试辅助逻辑分别计算 Windows 与 POSIX 临时配置路径，子进程环境同时隔离 `APPDATA`、`HOME` 和 `USERPROFILE`，不得读取或写入真实用户配置。
- Claude/Codex manifest、Claude marketplace、两个 validator 与 workflow 版本合同一致为 5.0.4。
- mode-policy、documentation、workflow 合同及统一 12 步门禁通过；双宿主 Clean 预览为 `NO_CHANGES` 且零写入；`git diff --check` 返回 0。

**验证边界：** 代码分支检查与本地合同测试足以完成本任务，不要求真实 macOS/Linux、插件重装、缓存一致性或新会话加载证明；结论必须明确这些未执行。

**依赖与回滚：** 依赖本轮 `@ship` 的两个 NO-GO 发现和用户当前决策。回滚时将测试辅助逻辑、两个校验器独立实现和 5.0.4 版本事实源作为一个切片恢复；不改动此前用户修改。

**完成证据：** 平台隔离合同先以 `createHookTestEnvironment is not defined` RED，最小实现后聚焦 mode-policy、documentation 与 workflow 合同 44/44；统一 12 步门禁为 workflow 89/89、OpenClaw 27/27。共享验证文件与引用均为零，五个发布事实源一致为 5.0.4；双宿主 Clean 均为 `NO_CHANGES`、预览前后工作区一致，`git diff --check` 返回 0。未执行真实 macOS/Linux、插件重装、缓存验证或新会话加载。

## 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 覆盖当前未提交修改 | 高 | 每任务先读现有 diff，只做增量补丁；禁止 reset/checkout。 |
| `work-products/tests/` 脱离原生发现机制 | 高 | 迁移时同步更新发现配置与可运行命令；统一入口显式执行仓库契约测试。 |
| router 收紧后误伤合法参数 | 高 | 同时测试无参数、带参数、尾随空白与非法边界。 |
| 可选 spec 被误解为不再需要 spec | 中 | 用正反两组规划依据断言锁定触发条件。 |
| 验证入口遗漏或错误吞掉退出码 | 高 | 对步骤清单、顺序、fail-fast 和退出传播做契约测试。 |
| 上游同步扩大为整仓复制 | 中 | 只同步规格列出的主题，notice 记录范围，排除项逐项检查。 |
| 成对 Host 文件再次漂移 | 中 | 每个小批次运行 skill/guide/command parity。 |
| README 为满足维护者校验继续堆积内部信息 | 高 | 先改变校验合同，再按用户任务重写 README；维护者信息后移。 |
| 三语言逐字翻译导致表达生硬或语义漂移 | 中 | 简体中文作为语义基准；校验命令、路径和结构，人工复核自然度。 |
| 文档结构变化使校验器产生假阳性 | 中 | 校验稳定的操作合同和结构，不绑定整段自然语言或评测数字。 |
| Claude Code 命令仍被误输到系统终端 | 高 | 代码块按执行环境拆分，并由 README/guide 校验器锁定相邻环境标识。 |
| 校验器自身错误被误认为有效 RED | 中 | RED 阶段同时核对非零退出码与预期诊断类别，排除语法错误和无关失败。 |
| 宿主标题存在但命令落入错误小节 | 高 | 按宿主子章节切片校验，并用错位命令负向夹具锁定。 |
| 维护者评测规则误伤正常数字 | 中 | 使用评测语境规则，并同时覆盖应通过与应拒绝夹具。 |
| 繁体术语机械转换导致歧义 | 中 | 建立本轮 rollback 对照并人工检查所有对应段落。 |

## 未决问题

无。采用最小实现：两个校验器分别保留自己的解析逻辑，只暴露可测试入口；不为两个文件新增共享验证框架。繁体中文 rollback 统一使用“復原”。
