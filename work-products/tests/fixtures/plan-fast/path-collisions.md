# Path and shared-resource collision fixture

Every case below must be classified as `conflict` or `serial` before any worker starts.

| Case | Left | Right | Expected |
|---|---|---|---|
| canonical normalization | `../../../../docs/../docs/USAGE.en.md` | `../../../../docs/USAGE.en.md` | conflict |
| Windows case alias | `../../../../Claude/skills/plan/SKILL.md` | `../../../../claude/skills/plan/SKILL.md` | conflict on Windows |
| ancestor/descendant | `../../../../docs/` | `../../../../docs/USAGE.en.md` | conflict |
| symlink/realpath | `fixture-link/plan.md` | `fixture-real/plan.md` | conflict when realpaths match |
| generated-output alias | `generated/guide.md` | `../../../../docs/USAGE.en.md` | conflict when the generated target resolves right |
| shared lock | `lock:guide-parity` | `lock:guide-parity` | serial |
| shared cache | `cache:plugin-package` | `cache:plugin-package` | serial |
| shared temporary directory | `temp:host-smoke` | `temp:host-smoke` | serial |
| unparseable path | `dynamic:${unknown}` | `../../../../README.md` | serial |
