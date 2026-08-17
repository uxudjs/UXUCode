# Persistent-state crash fixture

Each scenario has Expected workers: 0 and Expected result: `BLOCKED`.

| Scenario | Receipt problem |
|---|---|
| worker wrote files but completion transaction is missing | completed bytes, pending ledger |
| leftover `in_progress` | prior attempt has no terminal receipt |
| interrupted atomic todo replacement | temporary ledger exists without verified replacement |
| plan/todo mismatch | todo Plan SHA-256 differs from the immutable plan |
| before-hash drift | allowed write target changed after attempt capture |
| missing validation receipt | completion cannot be attributed |
| unclear change ownership | worker and user edits overlap |

No scenario may automatically rerun work, use serial fallback, or unlock a downstream wave.
