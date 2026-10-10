# wrak.agentkit

Shared AI-agent guidance for every repository in the organization, usable from **Claude Code** and
**GitHub Copilot**. One canonical copy of each agent, skill and review rule lives in `src/`; a
generator produces a Claude Code plugin marketplace and the Copilot-format files that consuming
repositories commit.

## What you get

| | `core` (any language) | `dotnet` (adds to core) |
|---|---|---|
| Skill | `verify-and-review`: run the repo's Build & Test ladder, review your own diff, pick reviewers by risk, brief them, address findings, confirm before commit/push/PR | `dotnet-unit-test`: xUnit + Moq + builder conventions |
| Agents | `code-reviewer`, `test-reviewer`, `security-reviewer` (independent, read-only, Must Fix / Should Fix / Questions / No Action output) | |
| Review rules | `code-review-kit-general` (severity scheme, test/generated-code rules), `code-review-kit-security` | `code-review-kit-dotnet`, `-dotnet-tests`, `-dotnet-security`, `-blazor` |
| Always-on policy | Never commit, push or create/update/merge a PR without explicit per-action confirmation | |
| Claude guard rails | Hook that forces a prompt on `git commit/push` and `gh pr create/edit/merge`; hook that keeps the code and security reviewers read-only | |
| Claude permissions | git/gh read-only allowlist | dotnet restore/build/test/format/list |

Anything specific to one repository (architecture rules, its own `add-*` skills, its layer review
files) stays in that repository and plugs in through the contract below.

## How it reaches each tool

| Surface | Mechanism |
|---|---|
| Claude Code | Plugins `agentkit-core` / `agentkit-dotnet` from the `wrak-agentkit` marketplace, enabled and pinned in the consumer's `.claude/settings.json` |
| Copilot cloud agent, Copilot CLI, VS Code, Visual Studio, JetBrains | Files committed in the consumer repo under `.github/` (agents, skills, instructions) |
| Copilot code review | The committed `.github/instructions/code-review-*.instructions.md` files (it does not use custom agents) |

Copilot has no plugin install in Visual Studio or in code review, so those surfaces only see files in
the repository. That is why the Copilot side is **vendored** into each consumer and kept current by a
sync PR, rather than distributed as a plugin. The rule files are always vendored, for both tools:
the Claude reviewers read the same copy Copilot code review does.

## Consumer contract

A repository using the kit must provide:

1. **`AGENTS.md` with a `## Build & Test` section** containing one fenced `bash` block: the full
   verification ladder, in order, the same one CI runs. `verify-and-review` runs it instead of any
   hard-coded command.
2. **`CLAUDE.md` containing `@AGENTS.md`**, so Claude Code loads it. (Visual Studio does not read
   `AGENTS.md`; the kit's agents and skill read it explicitly.)
3. **`.github/agentkit.json`**:
   ```json
   { "version": "1.0.0", "tiers": ["core", "dotnet"], "repo": "OWNER/wrak-agentkit", "track": "1.x", "defaultBranch": "main" }
   ```
   `tiers` must include `core`. `defaultBranch` is what the reviewers diff against (falling back to
   `origin/HEAD`). `repo` and `track` drive sync; `version` is maintained by sync.
4. **Repo-specific rule files** named `.github/instructions/code-review-<area>.instructions.md`, each
   with an `applyTo` glob and `[Required]` / `[Suggested]` tags. `[Required]` should trace to a MUST
   or MUST NOT in `AGENTS.md`, `[Suggested]` to a SHOULD. The names `code-review-kit-*` and
   `agentkit-*` are reserved for synced files. When a repo rule conflicts with a kit rule, the repo
   rule wins.
5. **`.claude/settings.json` is shared**: sync owns the `wrak-agentkit` marketplace entry, the
   `agentkit-*` entries in `enabledPlugins`, and the permission entries it added (recorded in the
   lock file); everything else is yours.

Recommended `AGENTS.md` sections: `## Load-Bearing Conventions` (MUST / SHOULD / MUST NOT),
`## Agent Review Triggers` (your repo's own examples of when each reviewer applies), `## CI`.
See `templates/AGENTS.md` and `templates/code-review-example.instructions.md`.

## Quick start

### 1. Wire the repository (once)

```bash
# in the consumer repo
cp <kit>/templates/agentkit.json .github/agentkit.json     # edit tiers, repo, defaultBranch
# make sure AGENTS.md has "## Build & Test" and CLAUDE.md contains @AGENTS.md

# vendor the kit at a release tag (any machine with access to the kit repo)
git clone --branch v1.0.0 --depth 1 https://github.com/OWNER/wrak-agentkit.git /tmp/wrak-agentkit
node /tmp/wrak-agentkit/scripts/sync.mjs --target .
```

Review and commit what it wrote: `.github/{agents,skills,instructions}/…`, `.github/agentkit.json`,
`.github/agentkit.lock.json`, and `.claude/settings.json`. Add `--dry-run` to preview. Sync needs
only Node 22+.

### 2. Claude Code

Nothing else to do. When a developer opens the repo and trusts the folder, Claude Code registers the
marketplace at the pinned tag and enables the plugins (settings written by sync). The kit repository
is private, so each developer needs git access to it (`gh auth login && gh auth setup-git`).
Skills are namespaced: `/agentkit-core:verify-and-review`. Agents appear as
`agentkit-core:code-reviewer` and so on. If the repo has a project agent or skill with the same
name, the project one wins.

To roll out to a whole organization instead, put `extraKnownMarketplaces` and `enabledPlugins` in
Claude Code managed settings.

### 3. GitHub Copilot

Nothing else to do: the files are committed. Pick the custom agents from the agent picker (VS Code,
Visual Studio, JetBrains) or by name on the cloud agent and CLI. Copilot code review applies the
`code-review-*.instructions.md` files automatically. In Visual Studio, custom instructions must be
enabled once under *Tools > Options > GitHub > Copilot > Copilot Chat*.

### 4. Keeping a repository current

Copy `templates/agentkit-sync.yml` to `.github/workflows/agentkit-sync.yml`. Each week it opens a PR
that moves the repo to the newest release inside its `track` (a new major version is a deliberate
manual change to `track`). One PR updates the vendored files, the `.claude/settings.json` pin, and
`agentkit.json`, so Claude and Copilot never drift apart. Setup:

- Secret `AGENTKIT_TOKEN` in the consumer: a fine-grained token with *Contents: read* on the kit repo.
- In the kit repo: *Settings > Actions > General > Access* must allow the organization's repos to
  call its workflows.
- In the consumer: *Settings > Actions > General* must allow Actions to create pull requests. Pushes
  made with the default token do not trigger other workflows, so CI will not run on the sync PR by
  itself; push an empty commit or close and reopen it.

Sync **never overwrites a vendored file that was edited by hand, or that existed before the first
sync**. It lists those as conflicts in the PR body. Fix them by moving the change into the kit,
deleting the local copy, or re-running with `--force`. Files the kit stops shipping are removed, and
permission entries it added are removed, unless you changed them.

## Versioning and releases

One kit-wide [SemVer](https://semver.org/) version, the `package.json` version, stamped into both
`plugin.json` files, every generated header and the lock file.

- **MAJOR**: breaking change to the contract (required sections, renamed or removed agents, skills or
  rule files).
- **MINOR**: new agents, skills or rules. **PATCH**: wording fixes.

Release: bump `version` in `package.json`, add a `## [x.y.z]` section to `CHANGELOG.md`, run
`npm run generate`, commit, tag `vx.y.z`, push the tag. CI fails if the tag differs from
`package.json`, if the CHANGELOG section is missing, or if the committed output differs from what
the generator produces. Also move the floating `v1` tag used by the sync workflow reference
(`git tag -f v1 && git push -f origin v1`) after every non-breaking release.

Claude Code only updates a cached plugin when its `version` changes, which is why every release bumps it.

## Working on the kit

```bash
npm ci
npm run generate          # src/ -> plugins/, vendor/, .claude-plugin/ (commit the result)
npm run check             # what CI runs: output matches src/, tier-1 has no language/product terms, release metadata
npm test                  # generator, hook and sync tests
npm run validate:claude   # claude plugin validate on the marketplace and both plugins (--strict)
```

Edit only `src/`. Never edit `plugins/`, `vendor/` or `.claude-plugin/`; CI will fail. Authoring
syntax (platform tool mapping, `{{agent:x}}` / `{{skill:x}}` tokens, `<!-- if:claude -->` blocks) is
in [src/AUTHORING.md](src/AUTHORING.md). [docs/parity.md](docs/parity.md) records where each
instruction from the original Wrak.CleanBlazor setup went.

```
src/{core,dotnet}/      agents/, skills/, instructions/, settings/permissions.json  (core also: policy.md, hooks/)
scripts/                generate.mjs, check.mjs, sync.mjs, lib/, test/
templates/              starting points for consumers (AGENTS.md, agentkit.json, sync workflow, example rule file)
.github/workflows/      ci.yml, sync.yml (reusable)
plugins/ vendor/ .claude-plugin/    generated
```

## Known limits

- **Not verified in a live session:** that `git commit/push` and `gh pr ...` actually trigger the
  confirmation prompt through the hook's `if` filter and that `ask` is honored in auto mode (the
  hook scripts and plugin loading are tested; a full model session was not run); how Copilot treats
  the agents' tool names in every IDE; whether VS Code shows duplicate agents when it reads both the
  Claude plugin and `.github/agents` (if it does, set `chat.plugins.enabled` to `false` for that workspace).
- The reviewer read-only guard needs Node on the developer's machine. Without it the hook does
  nothing and the normal permission flow applies; it is a guard rail, not a security boundary.
- Copilot organization-level agents and instructions (`.github-private`, org custom instructions)
  are not used; the kit is delivered per repository.
- `git -C <dir> commit` is not matched by the confirmation hook's filter. The policy text still applies.
