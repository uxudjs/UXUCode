---
name: review
description: "Five-axis code review: correctness, readability, architecture, security, performance."
---

用户输入 "review" 时，加载 `code-review-and-quality`。

对当前改动（staged 或最近 commits）进行五轴审查：
1. **Correctness**：是否符合 spec？边缘情况处理？测试充分？
2. **Readability**：命名清晰？逻辑直观？组织良好？
3. **Architecture**：遵循现有模式？边界清晰？抽象层级适当？
4. **Security**：输入验证？密钥安全？权限检查？（配合 `security-and-hardening`）
5. **Performance**：无 N+1 查询？无无界操作？（配合 `performance-optimization`）

发现按 Critical / Important / Suggestion 分级，输出结构化审查含 file:line 引用和修复建议。
