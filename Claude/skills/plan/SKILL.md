---
name: plan
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering.
---

用户输入 "plan" 或 "planning" 时，加载 `planning-and-task-breakdown`。

基于已有 SPEC.md 进行任务分解：
1. 只读模式——不修改代码
2. 识别组件间依赖关系
3. 纵向切片（每个任务是一条完整路径，非横向分层）
4. 每个任务含验收标准和验证步骤
5. 阶段间设置检查点
6. 保存到 tasks/plan.md 和 tasks/todo.md
