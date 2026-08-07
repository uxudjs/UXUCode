# Claude Code、Codex 与 OpenClaw 开发环境隔离任务清单

状态：已完成（2026-08-07，用户调用 `@build auto`）

- [x] 任务 1：新增 `work-products/tests/environment-isolation-contract.test.js`，建立可解释的 RED 合同（5/5 预期失败）。
- [x] 任务 2：实现 Claude/Codex 对等的 `environmentPolicy` 与完整实施策略。
- [x] 任务 3：同步根 `AGENTS.md`、`Claude/CLAUDE.md`、`Codex/AGENTS.md` 的持久环境规则。
- [x] 检查点 A：Claude/Codex 三种 Hook、五种模式、Skill 和规则文件验证通过。
- [x] 任务 4：增加 OpenClaw 环境隔离 profile、validator 和负向测试（21/21 通过）。
- [x] 任务 5：把 OpenClaw 评估从 52 个扩展为 54 个环境安全用例并同步精确计数（8/8 通过）。
- [x] 检查点 B：OpenClaw profile、安装器保护和 54 用例评分合同验证通过。
- [x] 任务 6：同步 README 三语言区段、三份使用指南和 OpenClaw 用户说明。
- [x] 任务 7：增加三语言环境语义验证器和负向合同测试（19/19 通过）。
- [x] 检查点 C：三个语言表面与实际宿主策略验证一致。
- [x] 任务 8：从共同基线 `5.0.4` 同步五个 `5.0.5` 元数据／验证位置。
- [x] 任务 9：把环境合同接入 12 阶段统一门禁并同步 `5.0.5` 发布版本断言。
- [x] 任务 10：聚焦测试、12 阶段统一门禁与 `git diff --check` 全部通过。
- [x] 进入 `@review` 前已确认无环境目录、缓存、凭据、机器绑定路径或范围外改动。

## 执行边界

- 普通 `@build` 每次只执行下一个未完成任务。
- 只有明确调用 `@build auto` 才允许连续执行稳定任务。
- 不创建 `.venv/`，不安装依赖，不修改仓库外环境或已安装插件缓存。
- 不暂存、提交、推送、发布、部署或创建 PR。
- 失败时回到引入失败的最早任务做最小修复，不删除或弱化合同测试。
