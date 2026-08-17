---
name: webperf
description: Web performance audit in deep mode (Lighthouse/PSI/CrUX) or quick mode (code scan).
---

`webperf` is an internal reference, not a public command, alias, natural-language trigger, or routing entry. Load it only when a registered public Skill explicitly selects this workflow.

- **Deep 模式**：有 Lighthouse JSON / PageSpeed Insights JSON / CrUX 数据 / Chrome DevTools trace / 实时 URL 时启用，收集真实指标
- **Quick 模式**（默认）：扫描源码结构反模式，标注为 potential impact

加载 `performance-optimization`，输出含评分卡、排名发现、正面观察和优化建议。仅限 Web 应用——CLI/库/纯服务端不适用。
