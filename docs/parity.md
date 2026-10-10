# Parity with the Wrak.CleanBlazor originals

This checklist shows where each substantive instruction from the source repository's agent setup
went. Use it to confirm that nothing was lost when the content was made generic.

**Destinations:**

- **T1** is `src/core`.
- **T2** is `src/dotnet`.
- **Consumer** means the instruction moves into the consuming repository: its `AGENTS.md`, its
  own `code-review-*.instructions.md` files, or its own skills.
- **Contract** means the instruction became an item of the consumer contract (README,
  "Consumer contract").

## Reviewer agents (`.claude/agents/*.md` and `.github/agents/*.agent.md`)

The Claude and Copilot copies differed only in wording and in which files they pointed to. Both now
render from one source per agent.

| Original instruction | Where it went |
|---|---|
| Independent senior reviewer; review what was built, not what was claimed | T1 agents, opening paragraph |
| Ask for the task, diff range and changed files if missing | T1 agents, plus a new fallback: derive them and state the assumption (Copilot subagents often can't ask) |
| Diff against the merge-base with `main`, otherwise `HEAD` / `git status` | T1, using `defaultBranch` from `.github/agentkit.json`, falling back to `origin/HEAD` (Contract) |
| Read beyond the diff only when needed; prefer targeted reads | T1, unchanged |
| The caller already ran format/build/test, so don't re-run them | T1, now pointing to the AGENTS.md `## Build & Test` ladder |
| Sources of truth: AGENTS.md, then standards file, then only the layer files whose `applyTo` matches, then the security file only on security surface | T1, made generic: `code-review-kit-general` is always read, then the matching `code-review-*` files, then the security files on security surface |
| Sources of truth: `docs/01`/`docs/03` only if unresolved | T1, as "the docs AGENTS.md links to" |
| Sources of truth: the single matching `add-*` skill | T1, as "the single matching repository task skill" |
| If no rule covers it, raise a Question; don't invent a rule | T1, unchanged |
| Evaluation list (task fit, correctness, domain model, boundary mapping, nullability, async/cancellation, errors, architecture, coupling, duplication, placement, maintainability, complexity, back-compat, scope creep) | T1, unchanged; the .NET specifics are detailed in T2 `code-review-kit-dotnet` |
| Find the nearest real sibling before flagging a divergence | T1 agent and `code-review-kit-general` |
| Don't flag what `dotnet format`/`.editorconfig`/analyzers enforce | T1, made generic ("the formatter, linters, analyzers, compiler in Build & Test"); the .NET form is in T2 |
| Leave test adequacy to test-reviewer and deep security to security-reviewer; still note obvious gaps | T1, unchanged |
| UI section: states, validation presentation, a11y, responsive, design-system reuse, design-artifact fidelity; skip it for backend-only changes | T1 (correction 1 in the plan) |
| UI section: `_appState.Working`, Progress/ProgressOverlay, MudBlazor, FluentValidation display | T2 `code-review-kit-blazor` (generic Blazor forms); named components go to Consumer |
| Review-only: no edits, commits, pushes or PR comments, no silent fixes | T1, unchanged; also in `policy.md` |
| Output taxonomy and ordering, `file:line`, cite the driving rule, report to the caller, don't write a file | T1, unchanged |
| `tools: Bash(git status:*)…` (meant to allow git-only Bash) | **Changed.** Current Claude Code docs say `tools` takes tool names only, so these specifiers never enforced anything. Now: an abstract `execute` tool, a prompt rule allowing only read-only git, and a planned PreToolUse guard (plan §3) |
| `model: opus` | T1 `claude:` frontmatter; Copilot gets no model, so it uses the model picker |
| test-reviewer: headline question, start from the requirement | T1, unchanged |
| test-reviewer: read production code first, then tests; siblings only to judge shape | T1, unchanged |
| test-reviewer: narrowly scoped `dotnet test` allowed, not the whole suite | T1, as "the scoped form of the repository's test command (Build & Test)"; the `dotnet test` permission is in T2 `settings/permissions.json` |
| test-reviewer: sources (`code-review-tests`, the standards "Tests" section only, the matching test skill, `docs/04` / AGENTS SHOULD) | T1, made generic |
| test-reviewer: evaluation list, including the architectural-assumption check | T1, unchanged; adds "retry behavior" as an example |
| test-reviewer: unit/integration/functional/bUnit placement | T1 (generic test levels); bUnit is in T2 `code-review-kit-dotnet-tests` |
| test-reviewer: "no Playwright suite today" (Copilot copy only) | T1, as "evaluate end-to-end suites, where present, like functional tests" |
| test-reviewer: don't rewrite adequate suites | T1, unchanged |
| test-reviewer: output taxonomy | T1, unchanged |
| security-reviewer: persona "Blazor Server, Identity.Web/OIDC, cookie auth, DataProtection" | T1 now establishes the stack from AGENTS.md and the code; the specifics are in T2 `code-review-kit-dotnet-security` |
| security-reviewer: read beyond the diff only to confirm wiring; no repo sweep; note unrelated issues briefly | T1, unchanged |
| security-reviewer: all eight evaluation categories | T1 agent and `code-review-kit-security`; adds SSRF and secure random tokens |
| security-reviewer: `DevelopmentAuthHandler`, `ClaimsPrincipalExtensions.IsAdmin`, `IAppBus` ops, Key Vault, Serilog enrichers, `CacheServiceBase` | Generic forms in T1/T2; the named types go to Consumer (`code-review-security.instructions.md`) |
| security-reviewer: static only, no probing of live systems | T1, unchanged |
| "Mirrors … keep in sync" banners | Removed; the generator and the generated header replace them |

## `verify-and-review` skill

| Original instruction | Where it went |
|---|---|
| The skill is the orchestration layer; read the selection rules before spawning | T1, unchanged |
| The five `dotnet …` / `Verify-Package-Versions.ps1` commands | Consumer (AGENTS.md `## Build & Test`); T1 runs that block (Contract) |
| Scope `dotnet test` while iterating; full run before the PR | T1, made generic |
| The `Verify-Package-Versions.ps1` / MediatR 12.x explanation | Consumer (prose in its Build & Test section) |
| Re-run build/test if `dotnet format` changed anything | T1, made generic ("a formatting step") |
| (new) Stop if `## Build & Test` is missing; don't move on with a red ladder | T1 addition |
| Review your own diff first; it drives routing | T1, unchanged |
| Risk-based selection; no "to be safe" reviews | T1, unchanged |
| Trigger table | T1, with generic triggers; the repo-specific examples (handler, validator, domain event, Infrastructure integration) go to Consumer `## Agent Review Triggers` |
| UI review is part of code-reviewer; attach the design artifact | T1, unchanged |
| Multiple reviewers can apply, or none; code and test are common, security is the exception | T1, unchanged |
| (new) How to invoke a reviewer on each platform; run reviewers in parallel | T1 addition (conditional blocks) |
| Briefing contents; don't hand the reviewer the repo | T1, adds "say which other reviewers are running" |
| Address findings, re-run only the affected checks, re-invoke only if the risk area changed | T1, adds "explain disagreements instead of silently ignoring" |
| Confirm commit, push and PR separately, stating what and where | T1 skill, `policy.md`, and a planned PreToolUse `ask` hook |
| CI (`ci.yml` steps) and human review still apply; SonarQube/CodeQL re-verify but don't replace | T1, made generic; the CI details go to Consumer `## CI` |

## AGENTS.md "PR Workflow" and copilot-instructions "Development & Review Workflow"

| Original instruction | Where it went |
|---|---|
| One primary agent; reviewers only at risk boundaries | T1 `policy.md` (always-on) and the skill |
| Never commit/push/PR without explicit, in-the-moment confirmation; applies to every agent | T1 `policy.md` (Claude SessionStart hook; Copilot `agentkit-workflow.instructions.md`) |
| Steps 1–8 | T1 skill |
| Reviewer table with repo-specific triggers | T1 (generic) and Consumer `## Agent Review Triggers` |

## Rule files

| Original | Where it went |
|---|---|
| standards: severity definitions and MUST/SHOULD mapping | T1 `code-review-kit-general` (adds kit-vs-repo precedence) |
| standards: nearest-sibling rule | T1 `code-review-kit-general` |
| standards: architecture boundaries, layering/leakage, cache-pattern misuse, persistence-shape mixing, `ValidationExtensions`, `[Inject]` naming, `Throw` guards | Consumer |
| standards: tests correlated with Core changes; functional test per new page; integration test per Infrastructure operation | T1 (generic principle at the same severities); the specific project and page forms go to Consumer |
| standards: no hand-edits to generated code | T1 `code-review-kit-general` |
| standards: speculative empty folders and interfaces; commented-out code | T1 `code-review-kit-general` (adds scope creep) |
| standards: second unit-test project | Consumer |
| security: every [Required]/[Suggested] rule | T1 (generic form), T2 (ASP.NET Core form), Consumer (named types and Key Vault) |
| tests: unit with real dependency / integration with mocks | T1 `code-review-kit-general` |
| tests: one file per method, guard-path test, readonly mocks, builders, Fact/Theory, FluentValidation.TestHelper | T2 `code-review-kit-dotnet-tests` (same severities) |
| tests: single test project per kind; functional test naming, paths, assertions, `WithId`/`WithoutId`, shared factory | Consumer |
| web-blazor: code-behind vs. `@code`, logic in markup | T2 `code-review-kit-blazor` (same severities) |
| web-blazor: `AppComponentBase`, `_appBus`-only data access | T2 (generic "designated application-layer entry point"); named types go to Consumer |
| web-blazor: shared component reuse | T2 (generic); the named components go to Consumer |
| web-blazor: `_appState.Working` spinner pattern, local-storage query keys, `AppConstants` | T2 (generic loading-feedback rule); named patterns go to Consumer |
| web-blazor: user-facing behavior and accessibility (all bullets) | T2 `code-review-kit-blazor` (same severities) |
| web-blazor: component test coverage (bUnit or code-behind test) | T2 `code-review-kit-blazor` |
| web-blazor: functional tests must not exercise interactivity | Consumer |
| AGENTS.md MUST: Singleton for cross-circuit services, Scoped for user state | T2 `code-review-kit-blazor` (Blazor Server lifetimes) |
| `add-unit-test`: all generic xUnit/Moq steps | T2 `dotnet-unit-test` (adds cancellation-token and narrow-test-run steps) |
| `add-unit-test`: `Throw`, `Wrak.RandomData`, `Builders/<Domain>`, single UnitTests project, `docs/04` | Consumer |

## Permissions (`.claude/settings.json`)

| Original | Where it went |
|---|---|
| Read, Glob, Grep, `ls`, git read commands, gh read commands | T1 `settings/permissions.json`. **Tightened:** `git branch:*` became `--show-current` / `--list:*` because `git branch -D` deletes, and `git remote:*` became `-v` / `get-url:*` because `git remote add/remove` changes config. Added `rev-parse`, `merge-base` and `symbolic-ref`, which the diff procedure uses |
| `dotnet restore/build/test/format/list`, `--version`, `--info` | T2 `settings/permissions.json` |
| `pwsh ./Verify-Package-Versions.ps1` | Consumer |

## New rules with no original

These go beyond the source repository. They're marked here so you can veto any of them.

- **T1 security:** SSRF; a non-cryptographic random source for tokens; CSRF/antiforgery in the
  exposure rule.
- **T2 `code-review-kit-dotnet`:** the whole file is new. The originals only named "nullability,
  async/cancellation". It covers async void, sync-over-async, CancellationToken pass-through,
  captive dependencies, DbContext lifetime, HttpClient, disposal, `throw ex`, catch-all swallowing,
  log message templates, and EF materialization / N+1 / AsNoTracking.
- **T2 `code-review-kit-dotnet-security`:** the concrete ASP.NET Core forms, such as
  `FromSqlRaw`, `TypeNameHandling`, `BinaryFormatter`, `IFormFile`, cookie/CORS/antiforgery
  settings, `ValidateOnStart`, and the Identity.Web `TokenValidationParameters` rules.
- **T2 `code-review-kit-blazor`:** event-unsubscribe/disposal, `InvokeAsync` for off-render
  updates, JS interop timing, and thread-safe singleton state.
- **T2 `code-review-kit-dotnet-tests`:** "Verify-only tests" and the bUnit implementation-details
  rule.
