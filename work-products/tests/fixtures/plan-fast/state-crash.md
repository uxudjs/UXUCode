# Persistent-state crash fixture

Each scenario has Expected workers: 0 and Expected result: `BLOCKED`.

| Scenario | Receipt problem |
|---|---|
| worker wrote files but completion transaction is missing | completed bytes, pending ledger |
| leftover `in_progress` | prior attempt has no terminal receipt |
| interrupted atomic todo replacement | temporary ledger exists without verified replacement |
| plan/snapshot mismatch | current plan does not stream-compare equal to the approval snapshot |
| raw-byte drift | allowed write target differs from its attempt-owned snapshot |
| missing baseline snapshot | the recorded snapshot cannot be read |
| baseline snapshot replacement | snapshot ownership or no-replace evidence is invalid |
| missing validation receipt | completion cannot be attributed |
| unclear change ownership | worker and user edits overlap |

No scenario may automatically rerun work, use serial fallback, or unlock a downstream wave.
