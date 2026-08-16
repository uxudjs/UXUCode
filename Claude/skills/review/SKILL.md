---
name: review
description: Review changes for correctness, readability, architecture, security, performance, and unnecessary complexity.
---

# Review

Review the relevant diff and surrounding code. Also check readability, architectural fit, security, performance, tests, and unnecessary abstractions.

Use the highest applicable evidence layer, in this order:

1. Current explicit user requirements that apply to the change;
2. An approved `work-products/SPEC.md` that applies to the change;
3. An existing applicable `work-products/plan.md` and its acceptance criteria;
4. Sufficient, reproducible debug evidence;
5. A verifiable objective reconstructed from the current diff, tests, project contracts, and historical intent.

Only stop for an irreconcilable conflict inside the highest applicable layer, or when no verifiable objective, scope, or acceptance criteria can be established. Lower-priority evidence may fill gaps left by higher-priority evidence, but must not rewrite its objective; when lower-priority evidence conflicts with a higher layer, treat it as inapplicable and ignore it. A missing plan is not itself a blocker.

Lead with findings ordered as `Critical`, `Important`, then `Suggestion`. Each finding must include a precise `file:line`, impact, evidence, and a concrete repair. Avoid style-only noise and do not invent findings. If no actionable defect is found, say so and state residual risks or validation gaps.

Return findings in the conversation by default. If a review report or other process file is created, place it only under `work-products/reviews/`.

Load only the needed internal references: `references/workflows/code-review-and-quality/`, `security-and-hardening/`, `performance-optimization/`, `api-and-interface-design/`, `frontend-ui-engineering/`, and `doubt-driven-development/`.
