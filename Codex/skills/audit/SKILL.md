---
name: audit
description: "Explicit UXUCode audit command: scan the repository for removable, reusable, or replaceable complexity."
---

# Audit

Inspect the requested repository scope for:

- duplicate implementations;
- abstractions without demonstrated reuse;
- custom code replaceable by existing repository, standard-library, or platform capabilities;
- dead configuration and unreachable paths;
- unbounded work, hidden security risk, or needless dependencies.

Return evidence-backed candidates with location, cost, safe action, validation needed, and priority. Do not delete or rewrite code during an audit unless the user separately authorizes implementation.
