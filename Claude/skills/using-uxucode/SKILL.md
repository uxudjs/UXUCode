---
name: using-uxucode
description: Internal router that selects the smallest applicable UXUCode workflow for the current task.
user-invocable: false
---

# UXUCode Routing

Select only the public workflow needed for the current phase:
- unclear or high-risk feature → `spec`
- approved specification, clear multi-step request or thorough debug evidence → `plan`
- approved task → `build`
- observed defect → `debug`
- test work → `test`
- misplaced UXUCode process artifacts → `clean`
- completed implementation → `review`, optionally `simplify`, then `ship`

Apply `implementation-policy` and `output-policy` according to the current mode. Create every workflow, plan, task, review, and ship file only under `work-products/`, and every test file under `work-products/tests/`. Test artifacts must use relative paths from their final location instead of machine-specific absolute paths. Never infer a legacy command or compatibility alias. Do not invoke `ship` before implementation is complete.

