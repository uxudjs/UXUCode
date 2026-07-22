---
name: spec
description: "Explicit UXUCode spec command: define and confirm a verifiable specification before non-trivial implementation."
---

# Specification

Use for new features, cross-module behavior changes, unclear acceptance criteria, or material interface and risk decisions. Skip for obvious one-line fixes or when an approved `SPEC.md` already covers the work.

1. Clarify the goal, users, scenarios, constraints, non-goals, interfaces, risks, testing strategy, and acceptance criteria.
2. Resolve material ambiguity before implementation.
3. Write a structured `SPEC.md`.
4. Ask for confirmation when choices would materially change scope or behavior.
5. Do not modify business code in this workflow.

Apply `implementation-policy` and `output-policy`.
