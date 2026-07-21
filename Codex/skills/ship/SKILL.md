---
name: ship
description: "Pre-launch checklist: combine code quality, security, and test readiness into a go/no-go decision."
---

用户输入 "ship" 时，加载 `shipping-and-launch`。

执行三阶段审查工作流：
1. **审查**：分别加载 `code-review-and-quality`、`security-and-hardening`、`test-driven-development`；宿主支持并行 Agent 时可并行执行，否则顺序执行
2. **合并**：在主上下文中综合三份报告，去重，归类为 Blocker / Recommended / Acknowledged
3. **决策**：输出 GO/NO-GO 判定 + 回滚计划

若改动 ≤2 文件且 ≤50 行且不涉及认证/支付/数据/配置，可跳过扇出直接判定。否则默认启用并行审查。
