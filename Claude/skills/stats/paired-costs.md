# Paired task costs

Use one `pairs` array in a UTF-8 JSON file. Each `id` uniquely identifies a task and repetition, with one `baseline` run and one `candidate` run.

Each run needs a boolean `accepted` based on the same task acceptance criteria. Record observed string identifiers for `host` (including version), `model`, `effort`, `tools`, `cache` and `workload` (fixtures, sequence and acceptance criteria). Missing or different conditions are listed in `unmatchedConditions`.

`costUsd` is the measured charge for the entire task, including retries, subagents and controller calls. Use disjoint `freshInputTokens`, `cacheReadTokens`, `cacheWriteTokens` and `outputTokens`. Subtract included cache tokens from a host's total input before reporting fresh input. Omit unknown measurements or use `null`. A missing measurement makes that side's corresponding total unknown.

Run the calculator on the supplied aggregate. Divide all measured costs, including failed work, by the number of accepted tasks. Report both arms and `qualityRegressions`. The reduction is `null` when costs or comparison conditions are missing, conditions differ, a denominator is zero, or a previously accepted task fails.
