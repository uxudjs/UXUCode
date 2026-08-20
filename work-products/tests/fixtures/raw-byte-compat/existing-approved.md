# Existing Approved Raw-Byte Compatibility

Plan header state: CANDIDATE_AWAITING_APPROVAL
Todo approval state: approved
Legacy top-level candidate identity: read-only
Task count: 15 pending
Approval snapshot state: missing

Approved snapshot root: work-products/tests/.tmp/GUARD/{attempt_id}/approval-plan.raw
Approved execution root: work-products/tests/.tmp/GUARD/{attempt_id}/

Expected preflight writes: todo snapshot reference + approved snapshot root only
Forbidden path: work-products/debug/execution-baselines/
Plan bytes: unchanged
Renewed approval: no
Mode field: absent

Missing or conflicting legacy identity: BLOCKED with zero workers
Unavailable approved root or snapshot creation failure: BLOCKED with zero workers
Post-verification byte drift: BLOCKED with zero workers
