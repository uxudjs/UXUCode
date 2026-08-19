---
name: spec
description: Define a verifiable specification before implementation.
---

# Specification

Use for new features, cross-module behavior changes, unclear acceptance criteria, or meaningful interface and risk decisions. Skip for obvious one-line fixes or when an approved `work-products/SPEC.md` already exists.

Clarify the objective, users, scope, non-goals, constraints, interfaces, risks, test strategy, and measurable acceptance criteria. Do not implement business code. Save the agreed result as `work-products/SPEC.md`; place every planned test file under `work-products/tests/` and require test references to use paths relative to their final location. Treat the approved specification as a shared, version-controlled project fact: its ignore rules must permit normal Git tracking, never depend on `git add -f`. Stop for approval when material questions remain.

## Ordinary Approval Boundary

Judge ordinary approval from the whole sentence and the current candidate context, never from a keyword or regular-expression match. Ordinary specification or plan approval never requires the user to provide, copy, or repeat a SHA. Negation, questions, quotations, conditions, requests to edit first, and requests to continue review are not approval. Ordinary approval does not invoke the next public command or authorize auto execution, commit, push, network access, payment, training, external writes, release, or deployment.

A new or materially revised work-products/SPEC.md stays pending until the user clearly approves the one current presented candidate. After clear approval, update only the specification approval metadata; any later material change returns it to pending approval. A project may define action-scoped exact-set authorization only by directly enumerating the stable action_id and its complete safety boundary in the approved specification.

Load only the internal references needed for the request: `references/workflows/idea-refine/`, `spec-driven-development/`, `api-and-interface-design/`, `frontend-ui-engineering/`, and `documentation-and-adrs/`.
