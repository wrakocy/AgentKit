# Changelog

All notable changes to wrak.agentkit. Versions follow [SemVer](https://semver.org/): MAJOR for a
breaking change to the consumer contract (required sections, renamed or removed agents, skills or
rule files), MINOR for new agents, skills or rules, PATCH for wording fixes.

## [1.1.0] - Unreleased

Fewer things a repository has to write before the kit works.

- `dotnet-default-build-test` skill (dotnet tier): when `AGENTS.md` has no `## Build & Test`
  section, `verify-and-review` now falls back to a language tier's default ladder instead of
  stopping. For .NET it infers restore / format / build / test from the solution file and the CI
  workflow, and tells the user what it inferred. With only the core tier it still stops and asks.
- `sync.mjs` creates a starter `AGENTS.md` and `CLAUDE.md` (from `templates/seed/`) when they
  are missing, and never touches them afterwards. It warns, without changing anything, when a
  core-only repo has no Build & Test section or when `CLAUDE.md` doesn't import `AGENTS.md`.

## [1.0.0] - 2026-10-10

Initial release, extracted from the Wrak.CleanBlazor template.

- `agentkit-core` plugin: `verify-and-review` skill; `code-reviewer`, `test-reviewer` and
  `security-reviewer` agents; SessionStart policy context; confirm-before-commit/push/PR and
  reviewer read-only hooks.
- `agentkit-dotnet` plugin: `dotnet-unit-test` skill.
- Copilot files under `vendor/`: the same agents and skills as `*.agent.md` and `SKILL.md`, plus
  the `code-review-kit-*` rule files and the always-on `agentkit-workflow` instructions.
- `scripts/sync.mjs` and the reusable `sync.yml` workflow that keep consumers up to date.
