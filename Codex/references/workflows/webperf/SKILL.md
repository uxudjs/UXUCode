---
name: webperf
description: Web performance audit in deep mode (Lighthouse/PSI/CrUX) or quick mode (code scan).
---

用户输入 "webperf" 时，加载 `performance-optimization` 的 Web 性能审计子流程。

- **Deep 模式**：有 Lighthouse JSON / PageSpeed Insights JSON / CrUX 数据 / Chrome DevTools trace / 实时 URL 时启用，收集真实指标
- **Quick 模式**（默认）：扫描源码结构反模式，标注为 potential impact

加载 `performance-optimization`，输出含评分卡、排名发现、正面观察和优化建议。仅限 Web 应用——CLI/库/纯服务端不适用。
