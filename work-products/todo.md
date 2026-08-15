# 子 Agent 交叉验证待办

状态：已完成并同步补充维护范围（2026-08-15；任务 7／7 已完成）

执行规则：修订规格与正式计划均已批准。普通 `@build` 每次只完成下一项；仅明确的 `@build auto` 可连续执行。不得提交、推送、安装、更新缓存、发布或部署。

## 阶段 1：RED 合同

- [x] 任务 1：新增 `work-products/tests/subagent-cross-validation-contract.test.js`，以最终位置相对路径锁定旧 CLI 行为、`fork_turns: "none"`、嵌套交接、普通失败、证据边界、Codex 角色提示和门禁接入；当前 4 个测试组均取得可解释 RED。

## 阶段 2：工作流改造

- [x] 任务 2：成对改写 Claude／Codex `doubt-driven-development`，形成单一路径，并让 Codex 以 `fork_turns: "none"` 建立零历史继承；focused 合同、skill parity 与 diff check 通过。
- [x] 任务 3：成对改写 Claude／Codex `code-review-and-quality`，按真实风险选择逻辑角色；Codex 使用 `fork_turns: "none"` 加显式角色提示，同步修正 orchestration；focused 合同、skill parity 与 diff check 通过。

### 检查点 A

- [x] doubt-driven 与 review focused 合同由 RED 转 GREEN。
- [x] 四个工作流无外部模型 CLI／人工外部复制路径。
- [x] 新合同测试逐宿主证明内部 workflow 共同语义；`node scripts/validate-skill-parity.js` 只作为公开 Skill／目录集合回归通过。
- [x] 未扩大到公开 Skill、Agent、Claude orchestration、文档或 OpenClaw。

## 阶段 3：门禁与版本

- [x] 任务 4：将新测试恰好一次接入 `scripts/validate-all.js`，并同步 `workflow-contract.test.js` 的参数列表合同，保持 12 阶段；统一门禁 100／100 workflow contracts 与 30／30 OpenClaw 测试通过。
- [x] 任务 5：形成原始 `5.0.7` 功能候选；focused 验证与统一 12 阶段门禁全部通过。

## 阶段 4：补充批准的维护修复

- [x] 任务 6：成对修订 Claude／Codex `status` 与 `clean`，让 `.uxucode-state.json` 和 `work-products/clean-migration.json` 缺失时静默、非阻塞，并增加双宿主 workflow 合同。
- [x] 任务 7：修复上一轮 Review 发现的平凡委派、权限交还、Codex 角色职责传递、严重度残留和 fail-closed mutation 合同缺口；最终版本事实源原子同步为 `5.0.10`。

### 检查点 B

- [x] 平凡 review 不委派；四个 workflow 只运行既有授权且不改变外部状态的检查，新权限请求返回主 Agent。
- [x] Codex 零历史委派任务显式包含匹配角色职责，ARTIFACT 不可信边界位于 payload 之前。
- [x] 替代 CLI、未知外部命令、矛盾授权／信任语义和错误边界顺序均由 mutation fixture fail closed。
- [x] 可选文件缺失语义由双宿主合同验证，最终发布版本合同统一为 `5.0.10`。

## 完成门

- [x] `node --test work-products/tests/subagent-cross-validation-contract.test.js`
- [x] `node Claude/scripts/validate-plugin.js`
- [x] `node Codex/scripts/validate-plugin.js`
- [x] `node scripts/validate-skill-parity.js`
- [x] `node scripts/validate-all.js`
- [x] `git -c safe.directory=C:/Code/UXUCode diff --check`
- [x] 用户已补充批准把规格及计划事实源同步到 `5.0.10`，并纳入后续维护修复范围。
- [x] 最终报告区分仓库静态证据、已安装缓存、新会话加载和真实子 Agent 行为，不以静态测试替代运行时证据。
- [ ] 重新执行 `@ship`，对同步后的最终事实源给出独立 GO／NO-GO。
