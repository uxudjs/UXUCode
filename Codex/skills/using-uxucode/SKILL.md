---
name: using-uxucode
description: Internal router that selects the smallest applicable UXUCode workflow for the current task.
user-invocable: false
---

# UXUCode Routing

Select only the public workflow needed for the current phase:
- unclear feature → `spec`
- approved specification → `plan`
- approved task → `build`
- observed defect → `debug`
- test work → `test`
- completed implementation → `review`, optionally `simplify`, then `ship`

Apply `implementation-policy` and `output-policy` according to the current mode. Never infer a legacy command or compatibility alias. Do not invoke `ship` before implementation is complete.

