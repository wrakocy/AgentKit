# Changelog

All notable changes to wrak.agentkit. Versions follow [SemVer](https://semver.org/): MAJOR for a
breaking change to the consumer contract (required sections, renamed or removed agents, skills or
rule files), MINOR for new agents, skills or rules, PATCH for wording fixes.

## [Unreleased]

- The kit repository is public. The reusable `sync.yml` workflow no longer needs a token
  (`AGENTKIT_TOKEN` is optional, for private copies of the kit) and consumers no longer need git
  access to the kit. Reason: GitHub does not let a public repository call a reusable workflow stored
  in a private one, which broke the sync for public consumers such as the CleanBlazor template.
  Delivered through the floating `v1` tag; no plugin or vendored-file changes.

## [1.1.0] - 2026-10-10

Fewer things a repository has to write before the kit works.

- `dotnet-default-build-test` skill (dotnet tier): when `AGENTS.md` has no `## Build & Test`
  section, `verify-and-review` now falls back to a language tier's default ladder instead of
  stopping. For .NET it infers restore / format / build / test from the solution file and the CI
  workflow, and tells the user what it inferred. With only the core tier it still stops and asks.
- `sync.mjs` creates a starter `AGENTS.md` and `CLAUDE.md` (from `templates/seed/`) when they
  are missing, and never touches them afterwards. It warns, without changing anything, when a
  core-only repo has no Build & Test section or when `CLAUDE.md` doesn't import `AGENTS.md`.
- Fix: the Blazor Server service-lifetime rules moved from the Blazor file (`.razor` only) to the
  .NET file (`.cs`), so they apply to the files where services are registered.
- Fix: `test-reviewer` also reads the "Tests..." sections of rule files that match changed
  production files, so it catches production changes that come with no test changes.

## [1.0.0] - 2026-10-10

Initial release, extracted from the Wrak.CleanBlazor template.

- `agentkit-core` plugin: `verify-and-review` skill; `code-reviewer`, `test-reviewer` and
  `security-reviewer` agents; SessionStart policy context; confirm-before-commit/push/PR and
  reviewer read-only hooks.
- `agentkit-dotnet` plugin: `dotnet-unit-test` skill.
- Copilot files under `vendor/`: the same agents and skills as `*.agent.md` and `SKILL.md`, plus
  the `code-review-kit-*` rule files and the always-on `agentkit-workflow` instructions.
- `scripts/sync.mjs` and the reusable `sync.yml` workflow that keep consumers up to date.
