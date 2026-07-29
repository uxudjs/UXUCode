# 实施计划：修复 UXUCode 工作流产物的 Git 跟踪契约

规划依据：已批准的根目录 `SPEC.md`（2026-07-28）。

## 1. 目标

在不改变 UXUCode 工作流语义的前提下，修复 `work-products/` 的 Git 跟踪边界：

- `work-products/SPEC.md`、`plan.md`、`todo.md` 和 `tests/**` 可正常跟踪；
- `debug/**`、`reviews/**`、`ship/**` 及未声明临时文件默认忽略；
- Claude/Codex、README 和三语言指南使用同一契约；
- 仓库静态验证与已安装插件验证分别报告。

## 2. 实施约束

1. 当前工作树已有大量未提交修改。每个任务只修改列出的文件，并在修改前后检查
   目标化 diff；不得整理、覆盖或回退无关改动。
2. 不直接编辑 `C:\Users\brand\.codex\plugins\cache\...`。
3. 不使用 `git add -f` 绕过错误的 ignore 规则。
4. 新测试必须验证 Git 的真实行为，不能只断言 `.gitignore` 包含某段文本。
5. Claude/Codex 对等文件必须同步，三语言文档必须同步。
6. 不自动提交、推送、发布、部署或重新安装插件。

## 3. 依赖顺序

```text
任务 1：先建立失败的 Git ignore 回归
  └─ 任务 2：修复 .gitignore 并转绿
       ├─ 任务 3：固定双宿主内部契约
       └─ 任务 4：同步公开文档契约
            └─ 任务 5：执行仓库总门禁并隔离宿主验证
```

任务 3 与任务 4 在任务 2 通过后逻辑上可并行，但当前工作树存在重叠修改，默认顺序
执行以减少合并污染。

## 4. 任务

### 任务 1：增加可复现的 Git ignore 行为回归

**范围**

在现有 `work-products/tests/workflow-contract.test.js` 中增加隔离测试。测试创建临时
Git 仓库，复制当前根目录 `.gitignore`，然后通过
`git check-ignore --no-index --quiet` 的退出码验证路径行为。

**验收标准**

- [ ] 测试覆盖四个应跟踪路径：
  `work-products/SPEC.md`、`plan.md`、`todo.md`、
  `tests/workflow-contract.test.js`。
- [ ] 测试覆盖四个应忽略路径：
  `debug/local.md`、`reviews/local.md`、`ship/local.md`、`scratch.md`。
- [ ] 测试在 `finally` 中清理临时仓库。
- [ ] 使用当前错误 `.gitignore` 时，新增测试仅因三个规范 Markdown 文件仍被忽略而
  失败，形成明确 RED 证据。
- [ ] 不改写测试文件中现有、与本问题无关的断言。

**验证**

```powershell
node --test work-products/tests/workflow-contract.test.js
```

预期：本任务结束时新增测试失败；失败信息精确指出本应可跟踪却被忽略的路径。

**依赖**：无。

**可能修改的文件**

- `work-products/tests/workflow-contract.test.js`

**回滚**

只删除本任务新增的测试辅助函数和测试块；不得恢复或覆盖该文件中原有未提交内容。

### 任务 2：修复 `.gitignore` 并使行为回归转绿

**范围**

保留 `work-products/*` 默认忽略策略，增加三个权威 Markdown 文件的否定规则，并
保留 `tests/` 目录及其后代的现有否定规则。

**验收标准**

- [ ] `SPEC.md`、`plan.md`、`todo.md` 和 `tests/**` 均不被忽略。
- [ ] `debug/**`、`reviews/**`、`ship/**` 和 `scratch.md` 均被忽略。
- [ ] 不需要 `git add -f`。
- [ ] 任务 1 的回归测试由 RED 转为 GREEN。
- [ ] `.gitignore` 不增加与本契约无关的规则。

**验证**

```powershell
node --test work-products/tests/workflow-contract.test.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode check-ignore --no-index -v work-products/SPEC.md work-products/plan.md work-products/todo.md work-products/tests/workflow-contract.test.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode check-ignore --no-index -v work-products/debug/local.md work-products/reviews/local.md work-products/ship/local.md work-products/scratch.md
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check -- .gitignore work-products/tests/workflow-contract.test.js
```

解释退出码时必须区分：`git check-ignore` 返回 `1` 表示未忽略，返回 `0` 表示被忽略。
最终以自动化回归测试为主证据。

**依赖**：任务 1。

**可能修改的文件**

- `.gitignore`

**回滚**

移除本任务新增的三个否定规则，并重新运行任务 1 测试，确认回到已知 RED，而不是
删除任何 `work-products/` 内容。

## 检查点 A：Git 行为契约

- [ ] 已保存修复前 RED 与修复后 GREEN 证据。
- [ ] 四个正式路径和四个临时路径的行为均符合规格。
- [ ] 目标化 diff 只包含测试与 `.gitignore` 的必要改动。

### 任务 3：固定 Claude/Codex 的版本控制契约

**范围**

在两端 `spec` 技能和 `spec-driven-development` 参考中明确：

- 新版权威规格位于 `work-products/SPEC.md`；
- 规格属于版本控制中的共享事实；
- 不得依赖 `git add -f`；
- 旧 `SPEC.md`、`tasks/plan.md`、`tasks/todo.md` 不再是新版发布源的规范路径。

在现有工作流契约测试中增加对上述要求的两端一致性断言。

**验收标准**

- [ ] Claude 与 Codex 的语义、路径和版本控制要求一致。
- [ ] 参考资料保留“规格应提交版本控制”的要求，并与 `.gitignore` 行为一致。
- [ ] 公开技能不重新引入旧 `tasks/` 路径。
- [ ] 契约测试能在任一宿主漂移时失败。
- [ ] 不改变 `spec` 是否可选、`plan` 的规划依据或 `build` 的执行语义。

**验证**

```powershell
node --test work-products/tests/workflow-contract.test.js
node scripts/validate-skill-parity.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check -- Claude/skills/spec/SKILL.md Codex/skills/spec/SKILL.md Claude/references/workflows/spec-driven-development/SKILL.md Codex/references/workflows/spec-driven-development/SKILL.md work-products/tests/workflow-contract.test.js
```

**依赖**：任务 2。

**可能修改的文件**

- `Claude/skills/spec/SKILL.md`
- `Codex/skills/spec/SKILL.md`
- `Claude/references/workflows/spec-driven-development/SKILL.md`
- `Codex/references/workflows/spec-driven-development/SKILL.md`
- `work-products/tests/workflow-contract.test.js`

**回滚**

只撤销本任务新增的版本控制措辞与对应断言；保留任务 1、任务 2 的 ignore 行为修复。

### 任务 4A：修复 README 的用户层信息边界

**范围**

保留 README 简中、繁中、英文区段中的 Git 跟踪说明，但将其改为用户层的类别描述：

- 正式规格、计划、任务清单和测试属于可跟踪的项目事实；
- 调试、评审、发布门禁及其他临时过程文件默认仅本地保留；
- 仓库静态验证不证明已安装插件已重新加载。

README 只保留 `work-products/` 基础目录，不列出
`work-products/SPEC.md`、`work-products/plan.md` 或
`work-products/todo.md` 等维护者级精确路径。三份完整使用指南的表格继续保留精确
路径，表格后的说明段使用与 README 一致的类别级措辞，避免重复声明同一路径。
`scripts/validate-readme-scope.js` 在本次规划前已属于脏工作树的一部分；本修复不得继续
修改、回退或覆盖它。规划基线 SHA-256 为
`CE1DEDFCD59962F0C942CCCE33A275B2EBA53CC492E3FBC6AECC3D1E45BF2942`。

**已知失败证据**

当前 `node scripts/validate-readme-scope.js` 在三种语言中分别拒绝上述三个精确路径，
共 9 条 `maintainer-only README content found`。该失败是本任务的修复基线。

**验收标准**

- [ ] README 三个语言区段均保留 `work-products/` 基础目录。
- [ ] 三个区段均以类别描述正式事实、临时产物和安装缓存边界。
- [ ] README 不再包含验证器禁止的三个精确路径。
- [ ] 三份使用指南的表格保留唯一精确路径，说明段保留正式/临时类别边界。
- [ ] `validate-readme-scope.js` 相对上述规划基线字节不变且通过。

**验证**

```powershell
node scripts/validate-readme-scope.js
node --test work-products/tests/documentation-validator-contract.test.js
(Get-FileHash -Algorithm SHA256 scripts/validate-readme-scope.js).Hash
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check -- README.md
```

**依赖**：任务 3。

**可能修改的文件**

- `README.md`
- `docs/USAGE.zh-CN.md`
- `docs/USAGE.zh-TW.md`
- `docs/USAGE.en.md`

**回滚**

只撤销本任务对 README 和三份指南说明段的类别级改写；不得改动指南表格、回退任务
1 至任务 3 或修改范围验证器。

### 任务 4B：完成三语言文档契约复验

**范围**

验证 README 的类别级说明、三份指南的精确路径说明以及工作流契约测试能够同时成立。
默认不修改代码；仅当 `workflow-contract.test.js` 仍把 README 错误地要求为维护者级
路径表时，才将该断言收窄为：

- README 验证类别语义和缓存边界；
- 三份完整指南验证精确路径和 Git 行为。

不得删除任何关键语义断言，也不得修改三份指南中已正确的精确路径说明。

**验收标准**

- [ ] 工作流契约测试通过并保持 README/指南的分层边界。
- [ ] guide parity、README scope、legacy commands 均通过。
- [ ] README 和三份指南三语语义一致。
- [ ] 本修复没有继续修改或回退 `scripts/validate-readme-scope.js`。
- [ ] 目标 diff 不包含文档任务以外的整理。

**验证**

```powershell
node --test work-products/tests/workflow-contract.test.js
node scripts/validate-guide-parity.js
node scripts/validate-readme-scope.js
node scripts/validate-no-legacy-commands.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check -- README.md docs/USAGE.zh-CN.md docs/USAGE.zh-TW.md docs/USAGE.en.md work-products/tests/workflow-contract.test.js
```

**依赖**：任务 4A。

**可能修改的文件**

- `work-products/tests/workflow-contract.test.js`（仅在现有断言与分层边界冲突时）

**回滚**

只回滚本任务对契约断言的收窄；保留 README 类别文案、指南精确路径和先前 Git 行为
修复。

## 检查点 B：发布源一致性

- [ ] Claude/Codex 技能与参考资料一致。
- [ ] README 类别级说明与三语言指南精确路径说明语义一致。
- [ ] README 范围验证器保持严格且通过。
- [ ] 旧 `tasks/plan.md`、`tasks/todo.md` 未重新成为新版发布源规范。
- [ ] 所有目标化验证通过。

### 任务 5：执行仓库总门禁并隔离已安装插件验证

**范围**

先完成仓库静态总门禁，再检查当前已安装插件实际公开技能内容。任何重新安装、重新
加载或缓存变更都必须单独获得用户授权，并使用项目正式支持的安装流程；不得手工
编辑缓存。

**验收标准**

- [ ] 仓库统一验证全部通过。
- [ ] 全量 diff 无空白错误，且没有无关清理。
- [ ] 报告明确列出仓库静态验证状态。
- [ ] 报告明确列出已安装 `@spec`、`@plan`、`@build` 是否仍使用旧路径。
- [ ] 未获授权时，安装验证标记为“未执行”，不得推断成功。
- [ ] 获得授权并重新安装/加载后，实际公开技能均使用 `work-products/`，否则保持
  NO-GO 并回滚到受支持的上一版本安装状态。

**验证**

```powershell
node scripts/validate-all.js
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode diff --check
git -c safe.directory=C:/Users/brand/SynologyDrive/Code/UXUCode status --short
```

已安装插件检查应读取宿主实际加载的公开技能内容；重新安装命令必须先从当前项目
README、manifest 或受支持的插件管理流程中确认，不能在计划阶段猜测。

**依赖**：任务 3、任务 4A、任务 4B。

**可能修改的文件**

- 无；默认只执行验证并在对话中报告。
- 若正式安装流程必须更新仓库文件，应停止并重新获得范围批准。

**回滚**

- 仓库文件：按任务边界逐项撤销本修复新增内容，不触碰已有改动。
- 已安装插件：仅在用户授权安装后，使用受支持流程恢复上一已知版本；不得直接删除
  或覆盖缓存目录。

## 5. 最终完成条件

- [ ] 任务 1 至任务 4 全部完成。
- [ ] `node scripts/validate-all.js` 通过。
- [ ] `git diff --check` 通过。
- [ ] Git ignore 行为测试覆盖正式与临时路径。
- [ ] 仓库源、已安装插件和未验证外部边界分别报告。
- [ ] 没有提交、推送、发布、部署或未授权安装。
- [ ] 进入 `@review` 前由用户确认实现 diff。

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 当前文件已有未提交改动 | 覆盖用户工作或形成混合 diff | 每任务使用目标化 diff，只追加必要内容 |
| ignore 测试受已跟踪状态影响 | 产生假阳性 | 在临时 Git 仓库使用 `--no-index` |
| 否定规则未正确重新包含路径 | 正式产物仍无法跟踪 | 同时测试应跟踪与应忽略路径 |
| 双宿主或三语言漂移 | 发布指令互相冲突 | parity 与契约测试共同覆盖 |
| 仓库通过但宿主缓存仍旧 | 用户继续得到旧路径 | 把安装检查设为独立门，不修改缓存 |
| 安装回滚路径不明确 | 宿主状态不可恢复 | 未确认正式安装/回滚流程前不执行安装 |

## 7. 未决事项

唯一保留的执行期授权点：是否在仓库修复和静态门禁通过后，执行正式插件重新安装或
重新加载验证。该操作会改变用户环境，不由本计划自动授权。

README 是否展示维护者级精确路径不再作为未决事项：本修复遵守现有用户旅程验证器，
采用“README 类别说明、完整指南精确路径”的分层。若要求 README 也展示精确路径，
必须另行批准修改规格和 `validate-readme-scope.js`，不属于本计划。
