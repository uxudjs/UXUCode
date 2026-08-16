# 实施计划：UXUCode 门禁设计缺陷修复

状态：已完成（2026-08-16；`@debug` 已完成回滚演练与 `5.0.19` 多行 fresh-host 门禁，本轮独立 `@ship` 结论为 GO）

## 1. 规划基线

本计划依据 `work-products/SPEC.md`。用户于 2026-08-16 接受四项产品决定：多行公开命令采用“首行命令 + 后续正文”、状态使用 24 小时 TTL 与 5 分钟未来容差、OpenClaw 高风险 correctness 为 100% 硬门且 token 压缩只考核低风险案例、候选版本为 `5.0.11` 且 BUG-009 只在真实证据门通过后去重。独立规划审查随后发现 BUG-009 的证据顺序循环；规格已补充“当前实现测量 → 隔离 trial plugin smoke → 产品源码落地 → 最终 fresh-host 复验”，用户已共同批准修订后的规格、计划与待办。

当前目标候选版本为 `5.0.19`。用户已授权把 Claude Code 与 Codex CLI 插件精确更新到该版本；提交、推送、发布与部署不在授权内。

规划内容充分，因为修订规格已经定义目标用户、7 项审计问题的处置、公开命令语法、状态 schema、reference 政策、review／ship 证据顺序、OpenClaw 评分结构、版本、非目标、回滚和可衡量验收标准。当前没有需要在编码前重新选择的产品行为；普通 `@build` 每次只执行下一个未完成任务。

当前工作区基线：

- 当前 `work-products/SPEC.md`、`work-products/plan.md`、`work-products/todo.md` 是同一任务的已批准事实源；旧版本只保留在 Git 历史中；
- `BUG.md` 是用户未跟踪的审计输入，必须保留原样；
- 业务源码当前仍为 `5.0.10`；上一轮统一静态门禁为 12／12，workflow contracts 为 102／102，OpenClaw tests 为 30／30；
- 这些基线只证明当前仓库静态合同，不证明 BUG 已修复、安装缓存已更新或 fresh host session 已加载候选。

## 2. 执行与授权边界

- 本计划只安排实施；`@plan` 本身不修改业务代码、测试行为、版本清单、宿主配置或安装缓存。
- 普通 `@build` 每次只完成下一个未完成任务；只有用户明确调用 `@build auto` 才可连续执行稳定任务。
- 即使使用 `@build auto`，到任务 17 的仓库外安装／fresh-session 授权门必须停止；计划批准不等于外部环境修改授权。
- 未经明确授权，不提交、推送、安装、重装、修改缓存、发布或部署。
- 所有新增测试、fixture、snapshot 或测量产物只放在 `work-products/tests/`，并从最终位置以相对路径引用仓库文件。
- 复用 Node.js 标准库与既有验证器，不增加第三方依赖，不使用全局工具回退。
- Claude／Codex 配对实现保持语义对等；不新增兼容层、别名、双写或旧 schema 回退。

## 3. 已锁定的实现方向

1. 路由器解析首行命令，将后续正文并入参数；`mode`／`clean` 保持严格单行合同。
2. 双宿主 `hook-state.js` 提供同构的状态身份与新鲜度解析；任何失败都返回不可用状态，不删除或续期文件。
3. 活跃 mode 只来自共享配置；项目状态不再保存或覆盖 mode。
4. OpenClaw scorer 生成按 risk 与 category 可重算的结构化指标；只有低风险 token reduction 是压缩硬门。
5. reference 修复按主题成对实施；测试锁定正向政策与精确危险模式，不做宽泛禁词扫描。
6. BUG-009 分为仓库候选、当前实现测量、隔离 trial 和最终候选四段；任何宿主安装都需要单独授权，trial 通过前不修改产品注入源码。
7. `5.0.11` 六个版本事实表面原子同步，放在全部无条件源码／文档修复之后。

### 3.1 规格追踪

| 规格项 | 计划任务 | 主要完成证据 |
|---|---|---|
| BUG-001 多行路由 | 任务 1、15、17 | Hook RED/GREEN、三语言合同、fresh-host smoke |
| BUG-003 状态与 mode 事实源 | 任务 2–4、17 | schema／身份／TTL fixtures、消费者对等、fresh-host smoke |
| BUG-004 reference 冲突 | 任务 8–14 | 七组精确 workflow contracts、双宿主 parity |
| BUG-005 review／ship 回退 | 任务 7 | 无 plan、同层冲突、低层不适用 fixtures |
| BUG-007 OpenClaw 评分 | 任务 5 | 高风险反例、低风险 token 域、分类可重算指标 |
| BUG-008 mode 优先级 | 任务 6 | 旧文本 RED、正向优先级 GREEN |
| BUG-009 策略重复 | 任务 17–18 | 当前实现测量、隔离 trial smoke、条件产品落地与最终复验 |
| 三语言、版本与总门禁 | 任务 15–16、18 | guide validators、六面版本合同、统一 12 阶段门禁 |

## 4. 依赖顺序

```text
任务 1：多行路由 RED/GREEN
  └─> 任务 3：mode 单事实源与 SessionStart

任务 2：状态 schema/身份/新鲜度 helper
  ├─> 任务 3：mode 单事实源与 SessionStart
  └─> 任务 4：status line/status Skill

任务 5：OpenClaw 评分门
任务 6：mode 优先级文本
任务 7：review/ship 证据回退

任务 8–14：七组 reference 修复（共享 workflow contract 文件，顺序执行）

任务 1 ───────────────┐
任务 6 ───────────────┼─> 任务 15：三语言公开命令文档
任务 2–15 全部完成 ──┴─> 任务 16：5.0.11 原子同步与静态候选
任务 16 ──> 任务 17：外部授权门与 fresh-host 测量
任务 17 ──> 任务 18：按证据决定 BUG-009 去重并最终复验
```

任务 5–7 在文件层面相互独立；任务 8–14 的产品文件相互独立，但都会修改 `work-products/tests/workflow-contract.test.js`，因此同一工作区内顺序执行，避免并发覆盖和 RED 归因混乱。

## 5. 实施任务

### 任务 1：修复双宿主多行公开命令路由

**状态：** 已完成（2026-08-16）。

**说明：** 先在既有 mode／Hook 合同中建立多行与非法形态 RED，再最小修改两个 router，使一般命令接收后续正文，同时保持普通 prompt 零输出和 `mode`／`clean` 严格边界。

**范围：**

- 扩展 `work-products/tests/mode-policy-contract.test.js`；
- 修改 `Claude/hooks/uxu-prompt-router.js` 与 `Codex/hooks/uxu-prompt-router.js`；
- 不在本任务改变状态 schema 或策略注入内容。

**验收标准：**

- [x] LF、CRLF、内联参数加多行正文均按规格保留参数语义；单行既有命令不回归。
- [x] 未知命令、标点后缀、非法命令名、`mode`／`clean` 多行或多参数输入返回可操作错误且零写入。
- [x] 普通非命令 prompt 仍无 Hook 输出；双宿主只保留公开前缀差异。

**验证：**

```powershell
node --test --test-name-pattern="multiline|unknown|punctuation|clean|mode route" work-products/tests/mode-policy-contract.test.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 无。

**可能修改：** 3 个文件，M。

**回滚：** 成对恢复 router 与对应测试；不得只恢复一个宿主或以旧正则作为兼容分支。

### 任务 2：建立版本化状态身份与新鲜度 helper

**状态：** 已完成（2026-08-16）。

**说明：** 在双宿主 `hook-state.js` 中实现单一 schema、工作区／分支／plan 身份和时间读取校验，所有异常 fail closed；先用 deterministic fixtures 证明当前无此合同。状态写入生命周期在任务 3 结合真实调用者一次收口，本任务不新增未使用写入抽象。

**范围：**

- 扩展 `work-products/tests/mode-policy-contract.test.js` 的临时工作区、Git 分支、detached HEAD、非 Git、plan hash、过期和未来时间 fixtures；
- 成对修改 `Claude/hooks/hook-state.js` 与 `Codex/hooks/hook-state.js`；
- 只提供读取／身份 helper，不在本任务改消费者输出或新增状态写入者。

**验收标准：**

- [x] schemaVersion、规范化 workspaceId、branchId、planId、updatedAt 和 task 范围严格按规格校验。
- [x] 跨工作区、跨分支、plan 变化、超过 24 小时、未来超过 5 分钟、畸形 JSON／字段均返回 stale／unknown，不删除或重写文件。
- [x] 双宿主读取 helper 语义对等；非 Git 与 detached HEAD 行为确定且不依赖全局 Git 配置修改；写入接口的 RED／删除由任务 3 明确覆盖。

**验证：**

```powershell
node --test --test-name-pattern="state schema|workspace identity|branch identity|plan identity|freshness" work-products/tests/mode-policy-contract.test.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 无。

**可能修改：** 3 个文件，M。

**回滚：** 同时恢复两个 helper 与 fixtures；不保留旧 schema、`state.mode` 或宽松读取回退。

### 任务 3：统一 mode 事实源并接入 SessionStart

**状态：** 已完成（2026-08-16）。

**说明：** 先建立 RED，证明 mode route 会展开旧状态、刷新时间且 `hook-state.js` 暴露直接写文件的 `writeState`；随后让 mode route 只写共享配置，让 SessionStart 只注入通过任务 2 校验的项目状态。移除 mode 调用后核对全部调用者；当前证据下无其他调用者，因此删除孤儿 `writeState`／写 JSON helper，而不是保留不满足完整身份与原子写入合同的接口。

**范围：**

- 修改两个 `uxu-prompt-router.js`，移除 mode route 对项目状态的读取、展开写入和时间刷新；
- 修改两个 `uxu-session-start.js`，使用新鲜状态 helper；
- 修改两个 `hook-state.js`，在调用者核对为零后删除孤儿 `writeState`／写 JSON helper；
- 扩展 `work-products/tests/mode-policy-contract.test.js`，先锁定旧展开写入／孤儿接口 RED，再验证删除；
- 用 `rg` 核对 `writeState`／写 JSON helper 的仓库调用者；若出现与当前证据不同的合法调用者，停止并先修订计划，不临时保留宽松写入。

**验收标准：**

- [x] mode route 只更新共享配置，不创建或修改 `.uxucode-state.json`。
- [x] SessionStart 的 mode 与共享配置一致；新鲜状态可注入任务／测试，陈旧或非法状态完全不注入这些字段。
- [x] 旧 `state.mode` fixture 无论取值如何都不影响 SessionStart；仓库不再导出或调用直接写状态的孤儿接口，未来新增写入者必须重新满足完整身份、禁止展开旧对象和同目录临时文件＋原子替换合同。

**验证：**

```powershell
node --test --test-name-pattern="mode source|mode route|SessionStart state|state writer" work-products/tests/mode-policy-contract.test.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 1、任务 2。

**可能修改：** 7 个文件，L；其中两个 `hook-state.js` 仅删除经调用者核对确认的孤儿写入接口，行为范围仍是单一 mode／状态切片。

**回滚：** 成对恢复 router、SessionStart 和合同测试；不得恢复项目状态优先级。

### 任务 4：让 status line 与 `status` 采用同一新鲜度合同

**状态：** 已完成（2026-08-16）。

**说明：** 让两个 status line 从共享配置解析 mode，并只显示新鲜项目状态；同步 `status` Skill 对 unknown、last update 与 mode 事实源的描述。

**范围：**

- 修改两个 `uxu-statusline.js`；
- 修改 `Claude/skills/status/SKILL.md` 与 `Codex/skills/status/SKILL.md`；
- 扩展 `work-products/tests/mode-policy-contract.test.js`。

**验收标准：**

- [x] status line 与 SessionStart 对同一 config/state fixture 得出相同 mode 和新鲜度结论。
- [x] 新鲜 task/tests/gate 按合同显示；陈旧或非法状态显示 unknown，不显示 passed 或 GO。
- [x] 缺失状态仍是可选、静默、非 blocker，`state.mode` 不参与输出。

**验证：**

```powershell
node --test --test-name-pattern="status line|stale status|optional state" work-products/tests/mode-policy-contract.test.js
node --test --test-name-pattern="optional state" work-products/tests/workflow-contract.test.js
```

**依赖：** 任务 2、任务 3。

**可能修改：** 5 个文件，M。

**回滚：** 同时恢复两个 status line、两个 Skill 和合同；不恢复 `state.mode` 优先级。

### 检查点 A：命令与状态生命周期

- [x] 任务 1–4 的 RED 均因目标缺陷失败，最小实现后 GREEN。
- [x] `node --test work-products/tests/mode-policy-contract.test.js` 全部通过。
- [x] 双宿主 mode／状态语义对等，未修改策略注入分工。
- [x] 未修改用户 `BUG.md`、安装缓存或宿主配置。

### 任务 5：重构 OpenClaw 风险分组评分门

**状态：** 已完成（2026-08-16）。

**说明：** 在既有 evaluation test 中先证明高风险错误可漏过和全局 token 聚合域错误，再一次性更新 scorer、报告文档和测试。

**范围：**

- 修改 `work-products/tests/OpenClaw/tests/evaluation.test.js`；
- 修改 `OpenClaw/evaluation/score-results.js`；
- 修改 `OpenClaw/evaluation/README.md`。

**验收标准：**

- [x] 指标按 low/high risk 与 category 报告 case、correctness、token、tool、subagent、latency 和 missing risk information，空分组／非有限结果 fail closed。
- [x] 低风险 token reduction >=35%、低风险 correctness >=95%、高风险 correctness=100%、高风险和全局 missing risk information=0、全局 unsolicited mutation=0 均为硬门。
- [x] 只改变高风险 token 不影响压缩硬门；结构化指标可从 fixture/results 重算，CLI 退出码与 pass 一致。

**验证：**

```powershell
node --test work-products/tests/OpenClaw/tests/evaluation.test.js
node OpenClaw/scripts/validate-profile.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 无。

**可能修改：** 3 个文件，M。

**回滚：** scorer、README、tests 整体恢复；禁止混用旧扁平指标和新分组门禁。

### 任务 6：修正 mode 的要求优先级

**状态：** 已完成（2026-08-16）。

**说明：** 先在 workflow contract 中加入旧优先级文本会失败的 RED，再成对修订 mode Skill，使安全／平台边界优先，而边界内的正确性由用户要求、批准规格、项目合同和验收标准定义。

**范围：**

- 修改 `Claude/skills/mode/SKILL.md` 与 `Codex/skills/mode/SKILL.md`；
- 在 `work-products/tests/workflow-contract.test.js` 增加正向优先级合同。

**验收标准：**

- [x] focused fixture 先因现有“Correctness and safety outrank explicit user requirements”合同取得可解释 RED，再由最小文本修订转 GREEN。
- [x] 两宿主包含规格第 9.1 节语义，不再声称笼统 correctness 可覆盖 explicit user requirements。
- [x] 五种 mode 只改变实现／输出策略，不改变授权、事实源、风险详细度或证据门。
- [x] 最终 `workflow-contract.test.js` 保留 deterministic mutation fixture：把合规优先级替换回旧政策时同一合同必然失败，从而持久保存 RED 证据，不依赖易误伤合规句子的单一禁词。

**验证：**

```powershell
node --test --test-name-pattern="mode priority" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 无。

**可能修改：** 3 个文件，S。

**回滚：** 两宿主 Skill 与合同测试一起恢复。

### 任务 7：补齐 `review`／`ship` 无 plan 证据回退

**状态：** 已完成（2026-08-16）。

**说明：** 先用无 plan 直接小修 fixture 证明现有 Skill 的回退文本缺失，再把规格定义的五级证据优先级写入两个公开 Skill，并用同层／高优先级冲突、低层不适用和目标缺失 fixtures 锁定。

**范围：**

- 修改双宿主 `skills/review/SKILL.md` 与 `skills/ship/SKILL.md`；
- 扩展 `work-products/tests/workflow-contract.test.js`。

**验收标准：**

- [x] focused fixture 先因旧 Skill 只写 spec／plan 回退取得可解释 RED，再由证据优先级修订转 GREEN。
- [x] 用户当前明确要求、已批准规格、适用 plan、debug 证据、diff／测试／项目合同依次回退；低层只补足高层，冲突时视为不适用并忽略。
- [x] plan 缺失但目标可验证时不阻塞；只有最高适用层内部无法消解的冲突、或目标不可验证时才 fail closed。
- [x] 最终 `workflow-contract.test.js` 保留 deterministic mutation fixtures：恢复旧的 spec／plan-only 文本或错误冲突规则时同一合同必然失败，持久保存 RED 归因。
- [x] `ship` 继续区分 GO 与提交／推送／安装／发布／部署授权。

**验证：**

```powershell
node --test --test-name-pattern="review and ship evidence" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 无。

**可能修改：** 5 个文件，M。

**回滚：** 四个 Skill 与对应合同原子恢复，不允许双宿主漂移。

### 检查点 B：评分与公开 Skill

- [x] OpenClaw evaluation focused tests 全绿，旧高风险反例稳定失败。
- [x] mode、review、ship 的最终合同均包含可重放的旧政策 mutation fixture，保存 deterministic RED→GREEN 归因，双宿主语义对等。
- [x] `node --test work-products/tests/workflow-contract.test.js` 当前已有用例及新增用例全绿。
- [x] 未执行发布、安装或真实评估运行。

### 任务 8：移除 Git workflow 的破坏性与自动提交政策

**状态：** 已完成（2026-08-16）。

**说明：** 成对修订 `git-workflow-and-versioning`，删除每增量提交和 `git reset --hard` 建议，改为显式授权与用户修改保护。

**范围：** 两个配对 reference 与 `work-products/tests/workflow-contract.test.js`。

**验收标准：**

- [x] 提交只在用户明确授权时执行，不把“成功增量”当作授权。
- [x] 恢复指导不包含丢弃未提交修改的命令，先要求确认目标与可恢复方案。
- [x] 精确 mutation fixtures 能拒绝旧危险段落且允许合规的禁止说明。

**验证：**

```powershell
node --test --test-name-pattern="git workflow authorization" work-products/tests/workflow-contract.test.js
```

**依赖：** 任务 7。

**可能修改：** 3 个文件，M。

**回滚：** 两个 reference 与合同一起恢复；不得只恢复危险示例或自动提交之一。

### 任务 9：使 idea-refine 宿主中立并服从过程路径

**状态：** 已完成（2026-08-16）。

**说明：** 删除超出用户范围、Claude 专属工具名和默认 `docs/ideas/` 写入；输出回到调用方。先检索脚本调用者，只有确认脚本失去调用者且仅实现旧约定时才删除。

**范围：** 两个 `idea-refine/SKILL.md`、条件删除两个配对 `scripts/idea-refine.sh`（若两宿主均存在）以及 workflow contract。

**验收标准：**

- [x] reference 使用宿主中立的读取／提问语义，不要求扩大用户最初范围。
- [x] 不默认写 `docs/ideas/`；持久化由调用它的公开 Skill 和 `work-products/` 合同决定。
- [x] 脚本若删除，必须有零调用者证据且双宿主同步；若保留，必须不再创建旧路径。

**验证：**

```powershell
node --test --test-name-pattern="idea refine scope" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 任务 8。

**可能修改：** 3–5 个文件，M。

**回滚：** 配对 reference、脚本状态和合同一起恢复；不保留隐藏旧路径入口。

### 任务 10：关闭浏览器越权安装与 `webperf` 隐式入口

**状态：** 已完成（2026-08-16）。

**说明：** 让 browser testing 只使用已提供的浏览器能力，缺失时报告验证缺口；让 `webperf` 仅作为显式选择的内部 reference。

**范围：** 两宿主 `browser-testing-with-devtools`、`webperf` 配对 reference 与 workflow contract。

**验收标准：**

- [x] reference 不再默认修改 `.mcp.json` 或执行自动确认的 `@latest` 安装。
- [x] 已连接浏览器优先；不可用时停止并报告，不把安装／配置当作浏览器测试授权。
- [x] 自然语言 `webperf` 不形成公开命令、别名或隐藏触发入口。

**验证：**

```powershell
node --test --test-name-pattern="browser authorization|webperf entry" work-products/tests/workflow-contract.test.js
node scripts/validate-no-legacy-commands.js
```

**依赖：** 任务 9。

**可能修改：** 5 个文件，M。

**回滚：** 四个 reference 与合同一起恢复；不恢复任何自动安装路径。

### 任务 11：条件化 API 与 observability 规则

**状态：** 已完成（2026-08-16）。

**说明：** 把分页、correlation ID、结构化日志和全链路传播限定到真实增长／跨边界需求，避免对有界集合和本地程序机械施加服务合同。

**范围：** 两宿主 `api-and-interface-design`、`observability-and-instrumentation` 配对 reference 与 workflow contract。

**验收标准：**

- [x] 分页只对无界、增长或明确要求的列表强制。
- [x] correlation ID／固定遥测只在服务请求、跨边界 I/O 或批准可观测目标下强制。
- [x] reference 仍保留适用场景的完整设计指导，不因条件化而删除必要安全边界。

**验证：**

```powershell
node --test --test-name-pattern="conditional interface and observability" work-products/tests/workflow-contract.test.js
```

**依赖：** 任务 10。

**可能修改：** 5 个文件，M。

**回滚：** 配对 reference 与合同一起恢复。

### 任务 12：统一 shipping 与 CI 风险触发语义

**状态：** 已完成（2026-08-16）。

**说明：** 让 kill switch、渐进放量、监控与完整 CI 门按发布风险和项目合同触发；路径过滤只能跳过确实无关且项目允许的工作。

**范围：** 两宿主 `shipping-and-launch`、`ci-cd-and-automation` 配对 reference 与 workflow contract。

**验收标准：**

- [x] kill switch／渐进放量／发布监控不再宣称适用于所有交付。
- [x] 必需且相关的门禁不可跳过；路径过滤不得改变已声称覆盖的风险。
- [x] `ship` 的安全、迁移、回滚和未验证项边界保持完整。

**验证：**

```powershell
node --test --test-name-pattern="conditional shipping and CI" work-products/tests/workflow-contract.test.js
```

**依赖：** 任务 11。

**可能修改：** 5 个文件，M。

**回滚：** 配对 reference 与合同一起恢复。

### 任务 13：让 source 与 migration reference 服从证据和批准合同

**状态：** 已完成（2026-08-16）。

**说明：** 官方文档查证只在漂移／不确定／引用需求下触发；兼容迁移默认不得覆盖已批准的无兼容、无回退决定。

**范围：** 两宿主 `source-driven-development`、`deprecation-and-migration` 配对 reference 与 workflow contract。

**验收标准：**

- [x] 稳定本地逻辑、重命名和已有确定合同不强制联网；需要外部事实时仍优先官方来源。
- [x] 对外迁移默认考虑兼容与 rollback，但批准的无兼容迁移优先且不得偷偷加 fallback。
- [x] 联网研究、兼容层与迁移副作用均不由内部 reference 自动扩大授权。

**验证：**

```powershell
node --test --test-name-pattern="source lookup and migration contract" work-products/tests/workflow-contract.test.js
```

**依赖：** 任务 12。

**可能修改：** 5 个文件，M。

**回滚：** 配对 reference 与合同一起恢复。

### 任务 14：对齐 spec-driven 与 TDD 的风险触发边界

**状态：** 已完成（2026-08-16）。

**说明：** 让内部参考与公开 `@plan`／`@test` 合同一致：清晰要求或充分 debug 证据无需普遍规格门，bug fix 使用目标 RED 与相关回归而非机械全量测试。

**范围：** 两宿主 `spec-driven-development`、`test-driven-development` 配对 reference 与 workflow contract。

**验收标准：**

- [x] spec 由材料歧义／风险触发，删除普遍五文件任务上限；规划依据与公开 `plan` 一致。
- [x] 可确定 bug 优先 RED→GREEN；纯配置／文档／外部不确定行为按风险选择证据。
- [x] 全量门禁放在计划检查点或 release gate，不替代目标与相关回归。

**验证：**

```powershell
node --test --test-name-pattern="spec and test risk triggers" work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
```

**依赖：** 任务 13。

**可能修改：** 5 个文件，M。

**回滚：** 配对 reference 与合同一起恢复；不得恢复与公开 `plan` 冲突的普遍门槛。

### 检查点 C：reference 政策

- [x] 任务 8–14 每项 focused contract 从 RED 转 GREEN。
- [x] 12 个点名 reference 的 Claude／Codex 语义对等，未改其余 reference。
- [x] `node --test work-products/tests/workflow-contract.test.js` 与 `node scripts/validate-skill-parity.js` 通过。
- [x] 无自动提交、破坏性恢复、外部安装、隐藏公开入口或兼容回退残留。

### 任务 15：同步三语言多行命令文档合同

**状态：** 已完成（2026-08-16）。

**说明：** 在简体中文、繁体中文和英文指南中说明一般公开命令支持首行命令加多行正文，并明确 `mode`／`clean` 仍只接受规格规定的单行参数。

**范围：** 三个 `docs/USAGE.*.md` 与 `work-products/tests/documentation-validator-contract.test.js`；仅当 README 自身存在受影响承诺时才修改 README。

**验收标准：**

- [x] 三语言示例和语义对齐，Claude／Codex 命令形式准确，无第 18 个命令或别名。
- [x] `mode`／`clean` 严格例外与 `clean apply` 安全边界完整。
- [x] 文档 validator 对任一语言缺失或漂移 fail closed；README 未受影响时保持不变。

**验证：**

```powershell
node --test work-products/tests/documentation-validator-contract.test.js
node scripts/validate-guide-parity.js
node scripts/validate-readme-scope.js
```

**依赖：** 任务 1、任务 6、任务 14。

**可能修改：** 4 个文件，M；README 条件增加 1 个文件。

**回滚：** 三语言与 validator 一起恢复，不允许只恢复一种语言。

### 任务 16：原子同步 5.0.11 并形成仓库静态候选

**状态：** 已完成（2026-08-16）。

**说明：** 全部无条件行为、Skill、reference 和文档修复完成后，原子同步六个版本事实表面，执行目标测试、统一 12 阶段门禁和最终 diff 审计。

**范围：**

- `Claude/.claude-plugin/plugin.json`；
- `Claude/.claude-plugin/marketplace.json`；
- `Codex/.codex-plugin/plugin.json`；
- `Claude/scripts/validate-plugin.js`；
- `Codex/scripts/validate-plugin.js`；
- `work-products/tests/workflow-contract.test.js` 的版本合同。

这是规格要求的原子版本集合，虽然超过一般单任务文件建议，但拆分会制造不一致候选，因此必须同一任务完成或整体回滚。

**验收标准：**

- [x] 六个事实表面精确为 `5.0.11`，不存在 `5.0.10` 产品版本残留或部分升级。
- [x] 三个 focused suites、两宿主 validator、command／skill／guide parity、统一 12 阶段门禁与 diff check 全部通过。
- [x] 最终 diff 只包含规格内文件；`BUG.md` 保留原样；未修改安装缓存或宿主配置。

**验证：**

```powershell
node --test work-products/tests/mode-policy-contract.test.js
node --test work-products/tests/workflow-contract.test.js
node --test work-products/tests/OpenClaw/tests/evaluation.test.js
node Claude/scripts/validate-plugin.js
node Codex/scripts/validate-plugin.js
node scripts/validate-command-parity.js
node scripts/validate-skill-parity.js
node scripts/validate-guide-parity.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 1–15。

**可能修改：** 6 个版本文件，原子 M。

**回滚：** 六个版本事实表面整体恢复；若任何行为修复回滚，重新核对版本决定，不允许部分降版。

### 检查点 D：仓库候选

- [x] 规格中除真实宿主证据与条件去重外的验收标准均映射到完成任务。
- [x] 统一静态门禁全绿，diff 范围与版本一致。
- [x] 结论只可写“5.0.11 仓库静态候选”；安装缓存、fresh session 与 BUG-009 行为影响仍未验证。
- [x] 到此必须停止并报告任务 17 的外部授权需求，即使用户此前调用 `@build auto`。

### 任务 17：在单独授权后测量当前候选的真实宿主生命周期

**状态：** 已完成（2026-08-16）。`5.0.12` 已使用真实 LF／CRLF 完成测量；fresh-host smoke 未通过，Claude 用户级登记已按预先声明的失败回滚恢复到 `5.0.11`。完整证据见 `work-products/tests/host-lifecycle-measurement.md`。

**说明：** 这是仓库外环境变化与真实宿主证据任务。执行前已重新列出 Claude Code／Codex 的精确命令、目标缓存／注册位置、项目内方案不可用原因、影响、验证、回滚和 USD 1.80 上限，并取得用户明确授权。`5.0.11` 测量保留为历史证据；本轮 `5.0.12` 严格 `mode`／`clean` 分别使用真实 LF 与 CRLF，且 source、cache、fresh-session 和最终行为分层记录。

**范围：**

- 只在授权后更新当前候选需要的 Claude Code／Codex 安装状态并开启 fresh sessions；
- 比较仓库源码、安装缓存与宿主实际加载版本／hash；
- 执行单行、多行、非法命令、严格 `mode`／`clean`、新鲜／陈旧状态 smoke；
- 测量普通 fresh session、同 session 公开命令、fresh-context 子 Agent 的实际 Hook 输出、可见上下文、可得 token／延迟和行为；
- 将去敏证据写入 `work-products/tests/host-lifecycle-measurement.md`，仓库引用使用相对路径。

**验收标准：**

- [x] `5.0.12` 安装前重新列明授权、命令、目标、影响、验证和回滚，并在明确授权后执行；失败后按声明恢复 Claude 元数据。
- [x] Claude／Codex 的 source/cache/fresh-session 证据分别记录，未暴露指标标为 unavailable，不估算。
- [x] 单行、多行、非法命令、状态与严格 `mode`／`clean` 均完成 fresh-host smoke，其中 strict 矩阵分别包含真实 LF 与 CRLF。

**验证：** 宿主专属命令在获得授权时按当时项目安装合同精确列出；完成测量后重跑 `node scripts/validate-all.js` 与 `git diff --check`，确认本任务未改变产品源码。

**依赖：** 任务 16、用户单独外部环境授权。

**可能修改：** 1 个仓库内测量产物；仓库外安装状态仅在单独授权范围内。

**回滚：** 使用授权前声明的宿主原生回滚恢复安装版本；删除或更正错误测量不得掩盖已发生的外部状态变化。

### 任务 18：以隔离 trial 验证 BUG-009，再决定产品源码

**状态：** 已完成（2026-08-16；分支 A：已测量、未证实净收益）。

**说明：** 任务 17 实际测量后，第一级证据门至少三项未通过、一项仅部分通过，因此选择分支 A：记录“已测量、未证实净收益”，保持产品 router 不变，不生成 trial 或请求新的外部安装授权。

**范围：** 仅处理 BUG-009：基于任务 17 的实际测量选择下列一个分支；不重新打开 BUG-001／003 或任务 1–16 的已验证实现。

**分支 A：当前实现测量不支持去重**

- 逐条记录规格第 9.3 节第一级门为何未通过；
- 不生成产品去重代码，不把字符差异当作行为收益；
- 将 BUG-009 结论记录为“已测量、未证实净收益”，供 `@ship` 分类。

**分支 B：第一级门通过，进入隔离 trial**

1. 在 `work-products/tests/` 保存拟议去重 patch 与 trial 验证说明；产品源码保持不变。
2. 在受控仓库内 `work-products/tests/.tmp/bug009-trial-<id>/` 从当前候选构造 Claude／Codex trial plugin；使用后先验证解析目标仍位于 `.tmp/` 根内，再清理并确认 Git status 无残留。
3. 在任何 trial 安装前，再次列出精确命令、目标、影响、验证、回滚并取得明确授权；未获授权时保持任务未完成，不应用产品 patch。
4. 用 fresh sessions 验证 trial 的公开命令、权限、安全、环境、路径与 fresh-subagent 边界；任一失败即回滚安装并拒绝产品 patch。
5. trial 全部通过后，先列出安装最终源码与 fresh-session 复验的精确命令、目标、影响、验证、回滚并取得最终授权；未获授权时只保留 patch／trial 证据，产品 router 不变。
6. 只有最终授权已取得，才将与已验证 patch 字节等价的变更应用到两个产品 router，并同步职责分工 RED→GREEN 合同；随后立即重跑统一门禁、安装最终源码并用 fresh sessions 复验，不沿用 trial 缓存或会话。

**验收标准：**

- [x] 任务 17 完成后，分支选择逐条映射规格第 9.3 节第一级证据门；不满足分支 B 前提时未修改产品 router。
- [x] 分支 A 零策略源码改动且具有完整真实测量结论；未生成隔离 trial、产品 patch 或额外安装请求。
- [x] 最终统一门禁、diff check 和证据分层通过；仓库候选版本为批准范围内的 `5.0.12`，fresh-host 结论保持 NO-GO。

**验证：**

```powershell
node --test work-products/tests/mode-policy-contract.test.js
node --test work-products/tests/workflow-contract.test.js
node scripts/validate-all.js
git -c safe.directory=C:/Code/UXUCode diff --check
```

**依赖：** 任务 17 已实际完成；trial 安装与最终源码安装各自需要执行时的明确外部环境授权。

**可能修改：** 分支 A 仅测量结论；分支 B 新增 1–2 个 `work-products/tests/` patch／报告、修改 2 个 router 与 1–2 个合同测试，另有两次分别授权的仓库外安装状态变化。

**回滚：** trial 失败、trial 安装未授权或最终安装未授权时不触碰产品 router；产品落地后若最终复验失败，成对反向应用已验证 patch、恢复安装版本并重新验证 fresh-subagent 完整边界，不影响其他 5.0.11 修复。

## 6. 完成检查点

- [x] 任务 1–16 完成后形成可复核的 `5.0.11` 仓库静态候选。
- [x] 任务 17 在精确命令与风险列明后取得单独授权，完成测量并按失败路径回滚 Claude 登记。
- [x] 任务 18 只执行证据支持的分支 A，BUG-009 没有未经证明的去重。
- [x] `5.0.12` 仓库内修订全部可追溯到已批准规格；没有兼容层、别名、无关重构或越权环境变化。
- [x] 后续独立执行 `@review` 与 `@ship`；计划或构建完成不自动提交、发布或部署。

## 6A. `5.0.19` 事实源与 CLI 更新

### 任务 19：锁定并修复当前候选事实源漂移

**状态：** 已完成（2026-08-16）。聚焦 RED 精确命中 `SPEC.md` 漂移；GREEN、完整 workflow contract、统一 12 阶段门禁与 diff check 均通过。

- 在既有发布版本合同中增加 `SPEC.md`、`plan.md`、`todo.md` 当前候选声明断言；
- 先证明门禁因旧 `5.0.12` 事实源产生精确 RED，再最小同步三份事实源；
- 运行 focused GREEN、相关 workflow contract、统一静态门禁与 diff check；
- 不修改产品行为，不再次升版。

### 任务 20：精确更新两宿主 CLI 插件并分层验证

**状态：** 已完成（2026-08-16；已获用户明确授权）。Claude Code／Codex 登记及 71／71 文件缓存身份均为 `5.0.19`；Codex fresh status exit 0。Claude fresh 进程明确加载 `5.0.19` 并返回 canonical status，但在产出正确结果后因 `$0.10` 预算门返回 exit 1，实际报告成本 `$0.12158`；未追加付费重跑。

- 先备份宿主登记元数据，再把 Claude Code／Codex CLI 插件更新到精确 `5.0.19`；
- 验证 source、installed cache 与 host registration 的版本和文件身份；
- 仅在 fresh CLI 进程中执行最小 smoke，当前已打开会话不得冒充新版本会话；
- Codex CLI 更新可能清理旧版本缓存；执行前必须把上一版本复制为可校验的独立回滚制品，不能把缓存保留作为默认事实。
- 不提交、推送、发布或部署。

实际更新后 Claude 的 `5.0.18` 缓存与两份登记备份仍在，Codex 的 `5.0.18` 缓存已被 CLI 清理。上一版 Debug 证据把 Codex 更新前状态误写成更新后状态；任务 21 负责修正该事实并准备独立回滚候选。

## 6B. `5.0.19` Ship Blocker Debug

### 任务 21：修复 Codex 回滚事实并准备独立制品

**状态：** 已完成（2026-08-16；仓库内准备阶段）。

- 发布合同先因缺少 Codex 回滚制品政策取得精确 RED；
- `work-products/debug/rollback/uxu-code-codex-5.0.18/` 是隔离 marketplace 包装，内含 71 文件回滚候选；
- 候选从当前已验证包重建，仅 `.codex-plugin/plugin.json` 与 `scripts/validate-plugin.js` 两个版本表面不同；不得称为已恢复的原缓存字节；
- 内包 validator 通过，ZIP 包含 72 个文件并有独立 SHA-256 收据；
- 仓库内准备阶段未修改用户级 Codex 登记，也未把本地校验冒充真实回滚演练；真实演练由任务 22 单独记录。

### 任务 22：真实回滚／恢复演练与精确候选多行 smoke

**状态：** 已完成（2026-08-16；已获用户明确授权）。

- 独立 `uxu-code-codex-rollback` marketplace 已临时安装并启用重建的 5.0.18；安装 cache 与候选均为 71 文件，路径差异 0、SHA-256 差异 0；
- 原 `uxu-code-codex` 已立即恢复为已启用的 5.0.19，源码／cache 均为 71 文件，路径差异 0、SHA-256 差异 0；临时 marketplace 已移除，CLI 保留的隔离 rollback cache 未手动删除；
- Claude fresh Hook probe 精确加载插件 5.0.19，真实 LF 第二行完整进入 `audit` 参数，故意无效模型按预期终止，费用 `$0`、输入／输出 token 均为 0；
- Codex fresh、只读、ephemeral 进程从精确 `5.0.19/skills/audit/SKILL.md` 加载 Skill 并返回 `SECOND_LINE_SENTINEL_5_0_19`，exit 0；用量为 input 54331、cached input 36352、output 326、reasoning output 223；
- 未提交、推送、发布、部署或手动删除任何插件 cache。

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| route 与状态共同修改同一 router，RED 归因混乱 | 中 | 任务 1 先锁定解析，任务 3 再只改 mode 状态写入，使用独立 test-name pattern |
| Git 身份查询拖慢或在非 Git 环境失败 | 高 | helper 使用 Node 标准库、短命令与 fail-closed null／stale 语义；覆盖 detached／non-Git fixtures |
| status unknown 格式与现有精确输出合同冲突 | 中 | 任务 4 先更新目标合同并成对实现，不保留 state 优先兼容 |
| workflow contract 被多任务连续修改产生宽泛禁词 | 中 | 每组 reference 使用正向语义和精确 mutation fixture，同一工作区顺序执行 |
| OpenClaw 指标结构改变消费者 | 高 | scorer、README、tests 同一任务原子更新；版本 `5.0.11` 明示，无双 schema |
| 三语言文档漂移 | 中 | 同一任务三文件同步并由 documentation validator fail closed |
| 版本先于行为完成 | 中 | 任务 16 最后原子同步，任何前置任务失败均不升版 |
| 计划被误解为宿主安装授权 | 高 | 任务 17 强制停止并重新陈述精确命令、目标、影响、验证、回滚 |
| BUG-009 去重破坏 fresh context | 高 | 真实三生命周期证据门；只移除 Prompt router 中被证明重复部分；重新安装／fresh smoke 单独验证 |

## 8. 未决问题

无产品设计未决问题。任务 17 的外部环境授权是执行阶段权限门，不是可由本计划替用户决定的问题。若授权未提供，任务 1–16 仍可形成仓库静态候选，但 BUG-001／003 的 fresh-host 证据与 BUG-009 的真实行为结论保持未验证，后续 `@ship` 必须据此给出相应门禁结果。
