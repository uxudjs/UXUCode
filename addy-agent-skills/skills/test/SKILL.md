---
name: test
description: TDD workflow: write failing tests, implement, verify. For bugs use the Prove-It pattern.
---

用户输入 "test" 时，委托给 agent-skills:test-driven-development。

- **新功能**：先写失败测试（RED）→ 最小实现使其通过（GREEN）→ 在保持通过的前提下重构
- **Bug 修复**（Prove-It 模式）：写一个复现 bug 的测试（必须失败）→ 确认失败 → 实现修复 → 确认通过 → 跑全量回归测试
- 浏览器相关问题还需调用 agent-skills:browser-testing-with-devtools
