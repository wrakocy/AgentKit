# Authoring canonical sources

Everything under `src/` is hand-edited. Everything under `plugins/`, `vendor/` and
`.claude-plugin/` is generated from it by `npm run generate`. Never edit generated output.

```
src/<tier>/                 tier = core (language-agnostic) | dotnet (.NET / ASP.NET Core / Blazor)
  policy.md                 core only: always-on rules (Claude: SessionStart hook; Copilot: agentkit-workflow.instructions.md)
  agents/<name>.md          reviewer agents
  skills/<name>/SKILL.md    Agent Skills (open standard)
  instructions/<file>.instructions.md   review rule files, vendored into consumers' .github/instructions/
  settings/permissions.json Claude Code permission allowlist fragment, merged into consumers' .claude/settings.json
```

## Agent frontmatter (superset, rendered per platform)

```yaml
---
name: code-reviewer                 # both platforms; must equal the file name
description: >-                     # both platforms; required
  ...
tools: [read, search, execute]      # abstract tool set, mapped by the generator:
                                    #   claude:  read→Read, search→Grep, Glob, execute→Bash   (comma-separated string)
                                    #   copilot: kept as-is                                  (YAML list)
claude:                             # merged into the Claude output only
  model: opus
copilot: {}                         # merged into the Copilot output only (e.g. target, model)
---
```

Output: Claude → `plugins/agentkit-<tier>/agents/<name>.md`; Copilot →
`vendor/<tier>/.github/agents/<name>.agent.md`.

## Skill frontmatter

Only the six portable Agent Skills fields: `name`, `description`, `license`, `compatibility`,
`metadata`, `allowed-tools`. `name` must equal the directory name. Same body for both platforms.

Output: Claude → `plugins/agentkit-<tier>/skills/<name>/SKILL.md`; Copilot →
`vendor/<tier>/.github/skills/<name>/SKILL.md`.

## Instruction files

Standard Copilot path-specific instruction frontmatter (`description`, `applyTo`, optional
`excludeAgent`). Copied as-is (plus the generated header) to
`vendor/<tier>/.github/instructions/`. Names are reserved: `code-review-kit-*` and `agentkit-*`.

Instruction files are read by both Copilot and the Claude reviewers from the same vendored copy,
so they must be platform-neutral: **no `{{...}}` tokens and no `<!-- if: -->` blocks** (the
generator fails on them). File names must start with `code-review-kit-`.

## Hooks (Claude only)

`src/core/hooks/hooks.json` is copied to `plugins/agentkit-core/hooks/hooks.json`, and every file in
`src/core/hooks/scripts/` to `plugins/agentkit-core/scripts/` with a generated-file comment added
(after the shebang, if there is one). Hooks run `sh "${CLAUDE_PLUGIN_ROOT}/scripts/<file>"` rather
than executing the file directly, so no executable bit is needed. Copilot has no equivalent; the
same rules reach it as text in `policy.md`.

## Body syntax (agents, skills, policy)

| Syntax | Claude rendering | Copilot rendering |
|---|---|---|
| `{{agent:code-reviewer}}` | `agentkit-core:code-reviewer` | `code-reviewer` |
| `{{skill:verify-and-review}}` | `/agentkit-core:verify-and-review` | `verify-and-review` |
| `{{skill:dotnet-unit-test}}` | `/agentkit-dotnet:dotnet-unit-test` | `dotnet-unit-test` |
| `<!-- if:claude -->…<!-- endif -->` | content kept, markers removed | block removed |
| `<!-- if:copilot -->…<!-- endif -->` | block removed | content kept, markers removed |

The generator resolves `{{agent:x}}` and `{{skill:x}}` by looking the name up across all tiers
(names are unique kit-wide) and fails on an unknown name. Conditional blocks don't nest. A
Tier 1 (`core`) source must not reference a Tier 2 agent or skill, because a consumer can
install core alone. The generator enforces this.

## Generated header

Inserted on the line after the closing `---` of the frontmatter (or at the top when there is
no frontmatter):

```
<!-- GENERATED from wrak.agentkit@v<version> (src/<path>). Do not edit; change the source in wrak.agentkit and re-sync. -->
```

## Writing rules

- Tier 1 text names no language, framework, product, path, branch or command. The consumer
  supplies those through the contract (AGENTS.md `## Build & Test`, `.github/agentkit.json`,
  its own `code-review-*.instructions.md`). `check.mjs` lints for forbidden terms.
- Write for both platforms. Use a conditional block only where behavior really differs (how to
  invoke a subagent, how to ask the user).
- When you change the substance of a rule, update `docs/parity.md` if it changes how an original
  instruction from the source repo maps.
