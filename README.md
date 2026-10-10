# Wrak.AgentKit

Shared AI-agent setup for our repositories, for both **Claude Code** and **GitHub Copilot**: a
pre-PR workflow (`verify-and-review`), three read-only reviewer agents (code, test, security), and
review rules. You write nothing per tool: the kit generates the Claude and Copilot versions from one
source, and you pull them into your repo with one command.

## Use it in your repo

You need Node 22+ and read access to this repository.

**1. Nothing to prepare.** Sync (step 3) creates a starter `AGENTS.md` and a `CLAUDE.md` containing
`@AGENTS.md` if your repo has none, and never touches them again. What the workflow needs to know:

- **How to build and test.** With the `dotnet` tier, nothing: if `AGENTS.md` has no
  `## Build & Test` section, `verify-and-review` works out the restore / format / build / test
  commands from your solution file and CI workflow, and tells you what it inferred. With only the
  `core` tier there is no default, so add the section yourself: one fenced `bash` block with the
  commands that verify your code, in order. Add it for `dotnet` repos too when you want the ladder
  to match CI exactly.
- **Your conventions** (optional): MUST / SHOULD / MUST NOT rules in `AGENTS.md` for the reviewers
  to enforce. See [templates/AGENTS.md](templates/AGENTS.md) for the optional sections.

**2. Add `.github/agentkit.json`.** Copy [templates/agentkit.json](templates/agentkit.json) and set:

```json
{
  "version": "0.0.0",
  "tiers": ["core"],
  "repo": "wrakocy/AgentKit",
  "track": "1.x",
  "defaultBranch": "main"
}
```

`tiers`: `["core"]` for any language, or `["core", "dotnet"]` to add the .NET / Blazor pieces.
`defaultBranch`: the branch reviewers diff against. Leave the rest as is.

**3. Pull the kit in (run once).** From your repo's root:

```bash
git clone --branch v1.0.0 --depth 1 https://github.com/wrakocy/AgentKit.git /tmp/AgentKit
node /tmp/AgentKit/scripts/sync.mjs --target .
```

Add `--dry-run` to preview without writing anything. Then commit what it wrote:

| Path in your repo | What it is |
|---|---|
| `.github/agents/`, `.github/skills/`, `.github/instructions/` | The Copilot versions of the agents, skills and review rules. Copilot reads these directly. |
| `.claude/settings.json` | Turns on the Claude Code plugins at this exact version and allows read-only git/gh commands. Your own settings are kept. |
| `.github/agentkit.json`, `.github/agentkit.lock.json` | Records the installed version and which files the kit owns. |
| `AGENTS.md`, `CLAUDE.md` (only if missing) | Short starter files for you to edit. Sync never overwrites or updates them. |

If something the workflow needs is missing (for example a `core`-only repo with no Build & Test
section, or a `CLAUDE.md` that doesn't import `AGENTS.md`), sync prints a warning and lists it in
the PR body; it doesn't change those files.

**4. (Optional) Get updates automatically.** Copy
[templates/agentkit-sync.yml](templates/agentkit-sync.yml) to `.github/workflows/agentkit-sync.yml`
and add a repo secret `AGENTKIT_TOKEN` (a fine-grained token with *Contents: read* on this repo).
Each week it opens a PR with the newest release in your `track`.

That's it. Nothing else to install.

## What you'll see

**Claude Code:** when a developer opens the repo and trusts the folder, the plugins load. Run
`/agentkit-core:verify-and-review` before opening a PR. It runs your Build & Test commands, reviews
your diff, and calls the reviewers that your change warrants (`agentkit-core:code-reviewer`, ...).
Developers need git access to this repo (`gh auth login && gh auth setup-git`).

**Copilot (VS Code, Visual Studio, JetBrains, CLI, cloud agent):** the agents appear in the agent
picker, and the same `verify-and-review` skill is available. Copilot code review applies the review
rules on every PR. In Visual Studio, turn on custom instructions once under *Tools > Options >
GitHub > Copilot*.

**Both:** the agents never commit, push or open a PR without asking you first, and the reviewers
never edit files.

## Adding your own rules

The kit covers what is true of any repo. Put what is specific to yours in the repo itself:

- Write your conventions in `AGENTS.md` as **MUST / SHOULD / MUST NOT** rules.
- Add review rules as `.github/instructions/code-review-<area>.instructions.md`, with an `applyTo`
  glob and `[Required]` (blocks the PR, comes from a MUST) or `[Suggested]` (comes from a SHOULD)
  tags. Example: [templates/code-review-example.instructions.md](templates/code-review-example.instructions.md).
- Optional `## Agent Review Triggers` in `AGENTS.md`: your own examples of when each reviewer applies.

Don't name your files `code-review-kit-*` or `agentkit-*`; those belong to the kit and are
overwritten on sync. Don't edit synced files: change them in this repo and release. If a rule of
yours conflicts with a kit rule, yours wins.

## Updating and conflicts

Re-run step 3 with a newer tag, or merge the weekly sync PR. Sync updates the files it owns and
removes ones the kit dropped. It **never overwrites a synced file you edited**, or a file that
already existed at the same path before the first sync (for example an older hand-written
`.github/agents/code-reviewer.agent.md`). It lists those as conflicts: delete your copy, or move your
change into the kit, or re-run with `--force`. `track: "1.x"` follows 1.x releases only; moving to
2.x is a deliberate edit.

## Troubleshooting

| Problem | Fix |
|---|---|
| `set "repo" to the kit repository` | `repo` in `.github/agentkit.json` must be `wrakocy/AgentKit`. |
| Skill says there is no Build & Test and no default | You're on the `core` tier only, or the default couldn't decide (several solution files). Add the section from step 1. |
| Claude Code doesn't show the plugins | Trust the folder; check you have git access to this repo; `/plugin` lists errors. |
| Agents show up twice in VS Code | It reads both the Claude plugin and `.github/agents`. Disable plugins for that workspace (`chat.plugins.enabled: false`). |
| Sync PR doesn't run CI | Pushes by the default token don't trigger workflows. Close and reopen the PR. |
| The weekly workflow can't find the shared workflow | In this repo: *Settings > Actions > General > Access*, allow repos in the organization to use it. In your repo: allow Actions to create PRs. |

## What's in the kit

| | `core` (any language) | `dotnet` (adds to core) |
|---|---|---|
| Skill | `verify-and-review` | `dotnet-unit-test` (xUnit + Moq conventions), `dotnet-default-build-test` (inferred ladder when `AGENTS.md` has none) |
| Agents | `code-reviewer`, `test-reviewer`, `security-reviewer` | |
| Review rules | `code-review-kit-general`, `code-review-kit-security` | `-dotnet`, `-dotnet-tests`, `-dotnet-security`, `-blazor` |
| Claude only | Hook asking before `git commit/push` and `gh pr create/edit/merge`; hook keeping the code and security reviewers read-only | dotnet command permissions |

## Maintaining the kit

Edit only `src/` (see [src/AUTHORING.md](src/AUTHORING.md)). `plugins/`, `vendor/` and
`.claude-plugin/` are generated.

```bash
npm ci
npm run generate          # src/ -> generated output (commit it)
npm run check             # what CI runs: output matches src/, tier-1 text is language-agnostic, release metadata
npm test                  # generator, hook and sync tests
npm run validate:claude   # claude plugin validate on the marketplace and both plugins
```

**Release:** bump `version` in `package.json`, add a `## [x.y.z]` section to `CHANGELOG.md`, run
`npm run generate`, commit, tag `vx.y.z` and push the tag. Use SemVer: MAJOR for a breaking change
to what consumers must provide, MINOR for new agents/skills/rules, PATCH for wording. Then move the
floating `v1` tag that the weekly workflow uses: `git tag -f v1 && git push -f origin v1`.
[docs/parity.md](docs/parity.md) records where each instruction from the original
Wrak.CleanBlazor setup went.

## Known limits

- The confirmation prompt on `git commit/push` is implemented as a Claude Code hook; it has been
  tested in isolation but not yet seen firing in a live session. `git -C <dir> commit` isn't matched.
- The read-only guard for reviewers needs Node on the developer's machine; without it the hook does
  nothing (the instructions still apply).
- Copilot organization-level agents and instructions aren't used; the kit is delivered per repo.
