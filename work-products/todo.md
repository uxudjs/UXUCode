# UXUCode 门禁设计缺陷修复待办

状态：已完成（2026-08-16；`@debug` 任务 22 已完成，本轮独立 `@ship` 结论为 GO）

执行规则：当前 `work-products/SPEC.md`、`work-products/plan.md` 与 `work-products/todo.md` 已共同批准。普通 `@build` 每次只完成下一项，仅明确 `@build auto` 可连续执行；到仓库外环境任务仍必须停下取得单独授权。用户已对当前任务 20 的精确两宿主 CLI 插件更新给出授权；提交、推送、发布或部署仍未授权。

当前目标候选版本为 `5.0.19`。

## 阶段 1：命令与状态生命周期

- [x] 任务 1：为多行、非法形态和严格 `mode`／`clean` 建立 RED，成对修复 Claude／Codex prompt router。
- [x] 任务 2：实现版本化状态 schema、workspace／branch／plan 身份及 24 小时新鲜度 helper。
- [x] 任务 3：让 mode 只写共享配置，并让 SessionStart 只注入新鲜状态。
- [x] 任务 4：让 status line／`status` 使用同一 mode 与新鲜度合同。

### 检查点 A

- [x] mode-policy contract 全绿，命令与状态双宿主语义对等。
- [x] 未修改策略注入分工、`BUG.md`、安装缓存或宿主配置。

## 阶段 2：评分与公开 Skill

- [x] 任务 5：按 low/high risk 与 category 重构 OpenClaw 指标和硬门。
- [x] 任务 6：修正双宿主 mode 的用户要求／正确性优先级。
- [x] 任务 7：补齐双宿主 `review`／`ship` 无 plan 证据回退。

### 检查点 B

- [x] OpenClaw evaluation、workflow focused tests 与 skill parity 全绿。
- [x] 未执行真实评估、安装、发布或部署。

## 阶段 3：reference 政策修复

- [x] 任务 8：删除 Git workflow 的自动提交与破坏性恢复建议。
- [x] 任务 9：使 idea-refine 宿主中立并移除默认旧路径写入。
- [x] 任务 10：关闭浏览器越权安装与 `webperf` 隐式入口。
- [x] 任务 11：条件化 API 分页与 observability 规则。
- [x] 任务 12：统一 shipping 与 CI 风险触发语义。
- [x] 任务 13：让 source lookup 与 migration 服从证据和批准合同。
- [x] 任务 14：对齐 spec-driven 与 TDD 的风险触发边界。

### 检查点 C

- [x] 12 个点名 reference 的双宿主语义对等，workflow contracts 与 skill parity 全绿。
- [x] 无自动提交、破坏性恢复、越权安装、隐藏入口、普遍绝对规则或兼容回退。

## 阶段 4：文档、版本与静态候选

- [x] 任务 15：同步简中、繁中、英文多行命令文档及 validator 合同。
- [x] 任务 16：原子同步六个 `5.0.11` 版本事实表面并通过统一 12 阶段静态门禁。

### 检查点 D

- [x] 形成 `5.0.11` 仓库静态候选，diff 仅含批准范围。
- [x] 明确安装缓存、fresh session 与 BUG-009 行为仍未验证。
- [x] 即使此前使用 `@build auto`，也在任务 17 前停止。

## 阶段 5：`5.0.12` 独立审查修订

- [x] 双宿主身份探测失败 fail closed，Claude 非法命令结构化阻断，公开 `status` 执行 canonical status line。
- [x] OpenClaw 使用未舍入比例判定 35% 硬门，三语言 validator 拒绝大小写／下划线／标点变体。
- [x] 四组 mutation reference 明确要求用户授权，canonical planning reference 删除固定文件数硬门。
- [x] 六个版本事实面原子同步为 `5.0.12`，目标回归和统一静态门禁通过。

## 阶段 6：单独授权的真实宿主证据

- [x] 任务 17：在精确授权与 USD 1.80 上限内安装并测量 `5.0.12`；真实 LF／CRLF、fresh/stale 状态及 source/cache/fresh-session 证据已记录，失败后 Claude 登记回滚至 `5.0.11`。
- [x] 任务 18：按完整测量选择分支 A“已测量、未证实净收益”；未生成 trial，未修改产品 router。

## 阶段 7：`5.0.19` 事实源与 CLI 更新

- [x] 任务 19：以 workflow contract RED／GREEN 锁定并同步 `SPEC.md`、`plan.md`、`todo.md` 的当前候选声明，不修改产品行为或再次升版。
- [x] 任务 20：按已授权边界备份宿主登记元数据，精确更新 Claude Code／Codex CLI 插件到 `5.0.19`，验证缓存身份并执行 fresh CLI 最小 smoke；Codex exit 0，Claude 已证明精确加载与正确路由，但在产出结果后因预算门 exit 1，未追加付费重跑。

## 阶段 8：Ship Blocker Debug

- [x] 任务 21：以 RED／GREEN 修正 Codex 旧缓存保留假设，生成并静态验证隔离的 `5.0.18` 回滚候选、marketplace 包装、ZIP 与 SHA-256 收据；未改用户级登记。
- [x] 任务 22：已在精确外部授权后真实演练 Codex 5.0.18 回滚／5.0.19 恢复；回滚 cache 与候选 71／71 字节一致，恢复后 5.0.19 源码／cache 71／71 字节一致，Claude／Codex 精确 `5.0.19` 多行 fresh-host smoke 均通过。

## 完成门

- [x] 目标测试、host validators、command／skill／guide parity、`node scripts/validate-all.js` 与 `git diff --check` 通过。
- [x] `BUG.md` 的 7 项和独立审查 8 项均有修复、条件化或准确证据状态，无风险冒充故障、无静态证据冒充宿主行为。
- [x] 版本事实源统一为 `5.0.12`，没有兼容层、别名、无关重构或越权环境变化。
- [x] 后续单独执行 `@review` 与 `@ship`；本计划不授权提交、推送、安装、发布或部署。
- [x] 当前目标候选及三份正式过程事实源统一为 `5.0.19`，两宿主登记与缓存身份均为精确 `5.0.19`。
- [x] fresh CLI 证据区分成功行为与进程状态；不以 Claude 的正确输出掩盖预算门 exit 1，也不把当前已打开会话冒充新版本会话。
- [x] Codex 回滚制品完成真实安装／恢复演练，双宿主 `5.0.19` 多行 fresh-host smoke 均通过；本轮独立 `@ship` 结论为 GO。
