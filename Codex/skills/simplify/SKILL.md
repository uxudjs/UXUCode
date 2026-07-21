---
name: simplify
description: Simplify code for clarity without changing behavior. Reduce complexity, eliminate duplication.
---

用户输入 "simplify" 或 "code-simplify" 时，加载 `code-simplification`。

对最近改动或指定范围进行代码简化：
1. 先理解代码目的、调用方、边缘情况、测试覆盖
2. 扫描简化机会：深层嵌套 → guard clause/helper、长函数 → 按职责拆分、嵌套三目 → if/switch、泛化命名 → 描述性命名、重复逻辑 → 共享函数、死代码 → 确认后删除
3. 每次只做一个简化，改完就跑测试
4. 全量通过后输出干净 diff
