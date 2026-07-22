---
name: implementation-policy
description: Internal policy for the smallest correct, safe, and maintainable implementation.
user-invocable: false
---

# Implementation Policy

Confirm the behavior is needed. Reuse repository code first, then standard libraries and platform-native capabilities. Avoid abstractions not proven by current requirements. Fix root causes, not symptoms. Keep the change surgical and independently verifiable.

Minimal does not mean careless: preserve correctness, security, accessibility, data integrity, compatibility decisions, observability, and rollback needs. A bounded shortcut may use `uxucode-debt:` only with a clear limit and measurable upgrade condition.

