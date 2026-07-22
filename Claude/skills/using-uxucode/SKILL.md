---
name: using-uxucode
description: "Internal UXUCode router that selects the minimum workflow needed for an explicit UXUCode command."
---

# Using UXUCode

Route explicit host-native commands to the same-named Skill. Load only the current workflow plus `implementation-policy` and `output-policy`.

Recommended sequence for a non-trivial feature:

`spec → plan → build → review → simplify → ship`

Use `debug → review → ship` for an observed defect. Use `build auto` only for an approved stable plan with reliable tests. Do not infer or support alternative command names. Internal agents are implementation details and are never user commands.
