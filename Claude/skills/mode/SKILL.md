---
name: mode
description: "Explicit UXUCode mode command: set standard, lite, full, ultra, or off for unified implementation and output policy."
---

# Mode

Accept exactly one argument:

| Mode | Implementation | Output |
|---|---|---|
| `standard` | Smallest correct implementation | Complete, concise sentences |
| `lite` | Suggest simpler options without changing specified structure | More explanation and teaching context |
| `full` | Enforce reuse, YAGNI, and minimal maintainable changes | Conclusion first and compact |
| `ultra` | Aggressively remove valueless complexity | Extremely short for clear low-risk work |
| `off` | Disable UXUCode global simplification | Host-default output |

The prompt router persists the mode in `.uxucode-state.json`. Correctness and safety, explicit user requirements, workflow evidence, and minimal correctness always outrank brevity. Automatically use complete expression for security, irreversible deletion, migration, authentication, payment, permissions, deployment, architecture, rollback, or any case where shortening could change meaning.
