# Changelog

All notable changes to wrak.agentkit. Versions follow [SemVer](https://semver.org/): MAJOR for a
breaking change to the consumer contract (required sections, renamed or removed agents, skills or
rule files), MINOR for new agents, skills or rules, PATCH for wording fixes.

## [1.0.0] - Unreleased

Initial release, extracted from the Wrak.CleanBlazor template.

- `agentkit-core` plugin: `verify-and-review` skill; `code-reviewer`, `test-reviewer` and
  `security-reviewer` agents; SessionStart policy context; confirm-before-commit/push/PR and
  reviewer read-only hooks.
- `agentkit-dotnet` plugin: `dotnet-unit-test` skill.
- Copilot files under `vendor/`: the same agents and skills as `*.agent.md` and `SKILL.md`, plus
  the `code-review-kit-*` rule files and the always-on `agentkit-workflow` instructions.
- `scripts/sync.mjs` and the reusable `sync.yml` workflow that keep consumers up to date.
