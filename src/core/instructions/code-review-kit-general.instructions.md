---
description: Organization-wide PR review conventions for every repository using wrak.agentkit. Defines the [Required]/[Suggested] severity tags that all code-review-*.instructions.md files use, the nearest-sibling rule, and language-agnostic rules on tests, generated code and dead code. Repository-specific rule files sit beside this one and take precedence where they conflict.
applyTo: "**"
---

# Code Review Standards: Organization-Wide

This file is the shared base for every `code-review-*.instructions.md` file in this folder. The
others are either repository-specific (written by this repository's maintainers) or
stack-specific (other `code-review-kit-*` files).

## Severity tags

All review rule files use two tags:

- **[Required]**: a blocking finding; the PR should not merge as written. In a
  repository-specific file, each [Required] rule corresponds to a MUST or MUST NOT in the
  repository's `AGENTS.md`.
- **[Suggested]**: a non-blocking suggestion the author can accept or explain. In a
  repository-specific file, each corresponds to a SHOULD or a "prefer X" in `AGENTS.md` or the
  docs it links to.

When a repository-specific rule conflicts with a `code-review-kit-*` rule, the repository rule
wins. Note the conflict so the kit or the repository can be corrected.

## How to apply the rules

- **Before flagging a [Suggested] item, or any item about "existing", "sibling" or "neighboring"
  code, look at the nearest analogous code already in the repository**: the same kind of
  component, the same layer, a sibling feature. Don't judge the new code in isolation. A new
  pattern that diverges from every existing example in the same area is a much stronger signal
  than a rule read on its own.
- Don't flag what the repository's formatter, linters, analyzers or compiler already enforce;
  the author ran them before review (`AGENTS.md`, `## Build & Test`).
- Apply a rule only to what the diff touches. Pre-existing violations outside the diff are, at
  most, a separate brief note.

## Tests: correlate behavior changes with coverage

- **[Required]** Flag a PR that adds or changes business logic, a validation rule, a public
  operation, or a handler for an event or message with no corresponding new or updated test.
  Every such change needs at least a happy-path test and a test of its failure or guard path, and
  every validation rule needs its own test. The repository's testing conventions decide the test
  level.
- **[Required]** Flag a test classified as a unit test that touches a real external dependency
  (file system, network, database, clock or randomness the test doesn't control) instead of a
  test double; it belongs with the integration tests. Conversely, flag an integration test that
  replaces the very dependency it exists to exercise with a test double; it defeats the purpose of
  an integration test.
- **[Suggested]** Flag a new or changed integration with an external dependency (a repository or
  data-access operation, an API-client call) with no integration test for the real-dependency
  concern and no unit test covering the calling code's handling of that call.

## Generated code

- **[Required]** Flag any hand edit to a file produced by a tool: generated API clients and
  data-transfer types, ORM migration snapshots, generated serializers, lockfiles edited by hand.
  These must be regenerated, not hand-patched. Hand-written glue belongs in a separate file
  (for example, a partial class or a wrapper), and the hand-written call sites should be fixed
  instead.

## Unnecessary code and abstractions

- **[Suggested]** Flag large commented-out blocks of a half-built or removed feature left in the
  diff. Delete unused code rather than commenting it out; version control keeps the history.
- **[Suggested]** Flag speculative structure added ahead of need: empty folders, an interface or
  abstraction with no consumer yet, a configuration option nothing reads.
- **[Suggested]** Flag changes unrelated to the PR's stated purpose (scope creep). Ask for them to
  be split out unless they are trivial and clearly intentional.
