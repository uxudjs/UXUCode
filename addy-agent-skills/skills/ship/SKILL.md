---
name: ship
description: Pre-launch checklist: parallel fan-out to code-reviewer + security-auditor + test-engineer, then merge into go/no-go decision.
---

用户输入 "ship" 时，委托给 agent-skills:shipping-and-launch。

执行三阶段并行审查工作流：
1. **并行扇出**：同时调用 code-reviewer（五轴代码审查）+ security-auditor（安全审计）+ test-engineer（测试覆盖率分析）
2. **合并**：在主上下文中综合三份报告，去重，归类为 Blocker / Recommended / Acknowledged
3. **决策**：输出 GO/NO-GO 判定 + 回滚计划

若改动 ≤2 文件且 ≤50 行且不涉及认证/支付/数据/配置，可跳过扇出直接判定。否则默认启用并行审查。
