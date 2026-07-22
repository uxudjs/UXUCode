---
name: review
description: Review changes for correctness, readability, architecture, security, performance, and unnecessary complexity.
---

# Review

Review the relevant diff and surrounding code. Check correctness against the specification, readability, architectural fit, security, performance, tests, and unnecessary abstractions.

Lead with findings ordered as `Critical`, `Important`, then `Suggestion`. Each finding must include a precise `file:line`, impact, evidence, and a concrete repair. Avoid style-only noise and do not invent findings. If no actionable defect is found, say so and state residual risks or validation gaps.

Load only the needed internal references: `references/workflows/code-review-and-quality/`, `security-and-hardening/`, `performance-optimization/`, `api-and-interface-design/`, `frontend-ui-engineering/`, and `doubt-driven-development/`.
