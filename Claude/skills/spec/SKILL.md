---
name: spec
description: Define a verifiable specification before implementation.
---

# Specification

Use for new features, cross-module behavior changes, unclear acceptance criteria, or meaningful interface and risk decisions. Skip for obvious one-line fixes or when an approved `work-products/SPEC.md` already exists.

Clarify the objective, users, scope, non-goals, constraints, interfaces, risks, test strategy, and measurable acceptance criteria. Do not implement business code. Save the agreed result as `work-products/SPEC.md`; create every other process or test file only under `work-products/`. Treat the approved specification as a shared, version-controlled project fact: its ignore rules must permit normal Git tracking, never depend on `git add -f`. Stop for approval when material questions remain.

Load only the internal references needed for the request: `references/workflows/idea-refine/`, `spec-driven-development/`, `api-and-interface-design/`, `frontend-ui-engineering/`, and `documentation-and-adrs/`.
