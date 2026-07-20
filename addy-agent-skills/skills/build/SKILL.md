---
name: build
description: Shortcut for incremental-implementation + test-driven-development. "build" = next task, "build auto" = run whole plan.
---

当用户输入 "build" 或 "build auto" 时，委托给完整技能：

- `build`（无参数）→ 调用 agent-skills:incremental-implementation，执行 plan 中下一个待办任务（逐片实现 → 测试 → 验证 → 提交 → 停止）
- `build auto` / `build all` → 调用 agent-skills:incremental-implementation 自主模式：先确保有 spec 和 plan，获用户批准后自动执行全部任务，每任务一个 commit

配合 agent-skills:test-driven-development 和 agent-skills:planning-and-task-breakdown 使用。
