# 规格：修复 UXUCode 工作流产物的 Git 跟踪契约

状态：待批准

日期：2026-07-28

## 1. 背景与问题

当前工作树正在把 UXUCode 新建的规格、计划、任务和测试迁移到
`work-products/`。现行 `.gitignore` 草案使用：

```gitignore
/work-products/*
!/work-products/tests/
!/work-products/tests/**
```

这会允许跟踪测试，却忽略 `work-products/SPEC.md`、
`work-products/plan.md` 和 `work-products/todo.md`。

`@plan`、`@build` 等命令按固定文件路径直接读取这些文件，并不依赖
`git ls-files` 才能在当前工作区找到它们；但忽略权威规格和计划会使其无法通过
提交、分支、PR、fresh clone 和 CI 持久化，也无法正常进入 `git status`、
`git diff` 和历史审查。该行为与“规格属于版本控制中的共享事实来源”冲突。

此外，当前已安装的 UXUCode 3.0.0 缓存仍使用根目录 `SPEC.md` 和
`tasks/plan.md`、`tasks/todo.md`，而仓库工作树正在迁移到
`work-products/`。仓库实现与已安装缓存必须作为两个验证边界处理。

## 2. 假设与待批准决策

本规格基于以下假设：

1. 当前工作树迁移到 `work-products/` 是预期的新版本方向，不回退到根目录
   `SPEC.md` 与 `tasks/` 作为长期规范。
2. 规格、计划、任务清单和正式回归测试属于可审查、可共享的项目事实，必须允许
   Git 跟踪。
3. 调试笔记、评审草稿、发布门禁草稿及其他临时过程文件默认只在本地保留，除非
   用户明确要求把具体文件作为正式交付物纳入版本控制。
4. 不直接修改 `C:\Users\brand\.codex\plugins\cache\...` 下的已安装缓存；
   仓库修复验证通过后，再通过正式安装或重新加载流程验证宿主行为。
5. 本文件按当前已安装 `@spec` 的契约保存在根目录，仅作为本次修复的批准依据；
   不授权实现阶段自动删除、移动或提交它。

需要用户批准的核心决策：

- 采用 `work-products/` 作为新版唯一规范路径。
- 默认跟踪：
  - `work-products/SPEC.md`
  - `work-products/plan.md`
  - `work-products/todo.md`
  - `work-products/tests/**`
- 默认忽略：
  - `work-products/debug/**`
  - `work-products/reviews/**`
  - `work-products/ship/**`
  - `work-products/` 下未明确列入跟踪契约的其他临时文件

## 3. 目标与用户

### 目标

建立单一、可测试的工作流产物路径与 Git 跟踪契约，使 UXUCode 的规格、计划、
任务状态和回归测试在本地会话、分支、PR、fresh clone 与 CI 中保持一致。

### 用户

- 使用 Claude Code 或 Codex 执行 UXUCode 工作流的工程师。
- 审查规格、计划、任务和测试变更的维护者。
- 从仓库安装或更新 UXUCode 插件的发布维护者。

## 4. 范围

### 范围内

1. 修正根目录 `.gitignore` 对 `work-products/` 的包含与排除规则。
2. 为 Git ignore 行为增加回归测试，验证规则的实际语义，而非只匹配文本。
3. 核对 Claude/Codex 的 `spec`、`plan`、`build` 技能及规划参考资料，确保：
   - 两端路径一致；
   - 权威规格和计划被描述为应进入版本控制；
   - 临时过程产物与正式项目事实的边界明确。
4. 核对 README 与三语言使用指南中的路径和版本控制说明。
5. 将新增回归测试纳入统一验证入口。
6. 分别记录仓库静态验证与已安装插件重新加载后的宿主验证结果。

### 范围外

1. 不改变 `spec` 是否为可选阶段的现有产品决策。
2. 不改变 `plan`、`build` 的任务拆分或执行语义。
3. 不重构 `work-products/` 之外的项目目录。
4. 不直接编辑已安装插件缓存。
5. 不自动提交、推送、发布或部署。
6. 不清理或重排当前工作树中的其他未提交修改。
7. 不把 Marketplace 安装、Hook 实际加载或 OpenClaw Gateway 行为等同于本地静态测试。

## 5. 路径与接口契约

### 5.1 新版规范路径

| 产物 | 规范路径 | 默认 Git 行为 |
|---|---|---|
| 已批准规格 | `work-products/SPEC.md` | 可跟踪 |
| 实施计划 | `work-products/plan.md` | 可跟踪 |
| 任务清单与状态 | `work-products/todo.md` | 可跟踪 |
| 新增测试、fixture、snapshot | `work-products/tests/**` | 可跟踪 |
| 调试过程记录 | `work-products/debug/**` | 忽略 |
| 评审草稿或报告 | `work-products/reviews/**` | 忽略 |
| 发布门禁草稿或报告 | `work-products/ship/**` | 忽略 |
| 其他未声明过程文件 | `work-products/**` | 忽略 |

### 5.2 `.gitignore` 行为

目标规则应至少具备以下等价语义：

```gitignore
/work-products/*
!/work-products/SPEC.md
!/work-products/plan.md
!/work-products/todo.md
!/work-products/tests/
!/work-products/tests/**
```

允许采用语义等价且更清晰的规则，但不得依赖 `git add -f` 才能跟踪规范文件。

### 5.3 版本兼容边界

- 仓库中的 Claude/Codex 发布源必须同步采用新版路径。
- 已安装 3.0.0 缓存继续表现为旧路径，直到执行正式重新安装或重新加载。
- 静态验证通过只能证明仓库内容自洽，不能证明当前宿主已加载新版本。
- 发布或安装验证必须确认实际加载的 `@spec`、`@plan`、`@build` 内容已经使用
  `work-products/`。

## 6. 实现约束

### 必须

- Claude 与 Codex 对等修改并通过一致性验证。
- 使用行为测试验证 `.gitignore`，优先通过临时 Git 仓库和
  `git check-ignore --no-index` 检查退出码。
- 测试必须覆盖“应跟踪”和“应忽略”两类路径。
- 保留用户当前所有无关修改。
- 使用项目现有 Node.js 测试与统一验证脚本。
- 文档涉及路径或部署边界时同步简体中文、繁体中文和英文。

### 需先询问

- 改变本规格列出的新版规范路径。
- 决定默认跟踪 `debug/`、`reviews/` 或 `ship/`。
- 删除、移动或覆盖已有工作流产物。
- 修改安装缓存、创建提交、推送、发布或部署。

### 禁止

- 使用 `git add -f` 掩盖错误的 ignore 规则。
- 只检查 `.gitignore` 文本而不验证 Git 的真实匹配行为。
- 把本地测试通过表述为插件已重新安装或宿主已加载。
- 为完成本修复而整理无关代码、文档或格式。

## 7. 测试策略

### 7.1 回归测试

在现有工作流契约测试中增加隔离的 Git ignore 行为测试：

1. 创建临时 Git 仓库并写入待测 `.gitignore`。
2. 使用 `git check-ignore --no-index --quiet <path>` 验证退出码。
3. 以下路径必须返回“未被忽略”：
   - `work-products/SPEC.md`
   - `work-products/plan.md`
   - `work-products/todo.md`
   - `work-products/tests/workflow-contract.test.js`
4. 以下路径必须返回“被忽略”：
   - `work-products/debug/local.md`
   - `work-products/reviews/local.md`
   - `work-products/ship/local.md`
   - `work-products/scratch.md`
5. 临时仓库必须在测试结束后清理。

### 7.2 契约测试

- Claude/Codex 技能路径必须一致。
- 规划参考资料不得重新引入 `tasks/plan.md` 或 `tasks/todo.md`。
- 文档必须说明规范文件可进入版本控制，临时文件默认本地化。
- 统一验证必须包含新增 Git ignore 回归。

### 7.3 验证命令

```powershell
node --test work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
node scripts/validate-guide-parity.js
node scripts/validate-readme-scope.js
node scripts/validate-all.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check
```

重新安装或重新加载后，另行检查已安装技能内容；该检查不能被上述静态命令替代。

## 8. 可衡量验收标准

1. `git check-ignore --no-index work-products/SPEC.md` 返回未忽略。
2. `git check-ignore --no-index work-products/plan.md` 返回未忽略。
3. `git check-ignore --no-index work-products/todo.md` 返回未忽略。
4. `git check-ignore --no-index work-products/tests/workflow-contract.test.js` 返回未忽略。
5. `work-products/debug/local.md`、`reviews/local.md`、`ship/local.md` 和
   `scratch.md` 均被忽略。
6. 不需要 `git add -f` 即可暂存四类规范产物。
7. Claude/Codex 的技能、参考资料和公开文档对路径及 Git 行为描述一致。
8. 新回归测试在旧 `.gitignore` 规则下失败，在修复后通过。
9. `node scripts/validate-all.js` 与 `git diff --check` 均通过。
10. 验证报告分别标注：
    - 仓库静态验证状态；
    - 已安装插件重新加载状态；
    - 未执行或失败的外部验证。
11. 修复 diff 不包含与本问题无关的清理或重构。

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| Git 否定规则未重新包含父目录 | 规范文件仍被忽略 | 用真实 `git check-ignore --no-index` 行为测试 |
| 已跟踪文件不受 ignore 规则影响，测试出现假阳性 | 错误规则漏检 | 在临时仓库中测试未跟踪路径 |
| 仓库源与安装缓存版本不一致 | 宿主继续使用旧路径 | 把重新安装/加载作为独立验证门 |
| 两端或三语言文档漂移 | 用户得到冲突指令 | 运行 parity 验证并检查精确路径 |
| 宽泛修改污染当前工作树 | 难以审查和回滚 | 仅修改本规格授权文件并使用目标化 diff |
| 临时报告被误认为正式项目事实 | 仓库噪声增加 | 默认继续忽略临时目录，按文件显式升级为交付物 |

## 10. 回滚要求

- `.gitignore`、测试、技能和文档变更必须能按文件独立回滚。
- 回滚不得删除用户已经创建的 `work-products/` 内容。
- 若新版路径无法在两个宿主中一致加载，应回滚发布源变更并保持 NO-GO，
  而不是同时维持两个未定义优先级的规范路径。
- 回滚后重新运行目标测试和 `git diff --check`，记录仍未验证的安装边界。

## 11. 未决问题与批准门

在进入 `@plan` 前，请明确批准或修订以下决策：

1. 是否确认 `work-products/` 为新版唯一规范路径？
2. 是否确认默认跟踪 `SPEC.md`、`plan.md`、`todo.md` 和 `tests/**`？
3. 是否确认 `debug/**`、`reviews/**`、`ship/**` 及其他临时文件默认忽略？
4. 是否确认不直接修改已安装缓存，而在仓库修复后单独执行重新安装/加载验证？

未得到批准前，不进入规划或实现阶段。
