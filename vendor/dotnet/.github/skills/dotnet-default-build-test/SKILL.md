---
name: dotnet-default-build-test
description: "The default Build & Test ladder for .NET repositories whose AGENTS.md has no \"## Build & Test\" section. Use from the verify-and-review skill, or whenever you need to build, test or verify a .NET repository that doesn't say how: it works out the restore, format, build and test commands from the solution layout and the CI workflow, and tells the user they were inferred."
---
<!-- GENERATED from wrak.agentkit@v1.2.0 (src/dotnet/skills/dotnet-default-build-test/SKILL.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Default Build & Test for .NET

Use this only when `AGENTS.md` has no `## Build & Test` section with a fenced `bash` block. If it
has one, that block is authoritative; use it and ignore this skill.

## 1. Find what to build

Look at the repository root (Glob `*.slnx`, `*.sln`):

- Exactly one solution file: use it as `<entry>`.
- None: if there is exactly one `*.csproj` in the repository, use it. Otherwise ask the user.
- More than one: check `AGENTS.md`, the README and the CI workflow for the one that is built and
  tested. If that doesn't settle it, ask the user. Don't pick one.

## 2. Prefer what CI does

Read the CI workflow if there is one (`.github/workflows/*.yml`, `azure-pipelines.yml`). If it
runs `dotnet restore`, `dotnet format`, `dotnet build` or `dotnet test` on this repository, use the
same commands in the same order, leaving out options that only make sense in CI (published
artifacts, test-result loggers, build-number stamping). If CI also runs repository scripts as part
of verification, include them and mention that you did. If the workflow is unclear, or there is no
CI, use the defaults below.

## 3. Defaults

```bash
dotnet restore <entry>
dotnet format <entry> --no-restore     # only if the repository has an .editorconfig
dotnet build <entry> --no-restore
dotnet test <entry> --no-build
```

If `dotnet format` changes files, re-run build and test afterward.

## 4. Scoping tests while iterating

Run one test project, or filter to a class:

```bash
dotnet test <TestProject> --filter "FullyQualifiedName~<ClassName>"
```

Run the full ladder once before opening a PR.

## 5. Tell the user

Say once per session which commands you used and that they were inferred, not configured. Suggest
adding a `## Build & Test` section to `AGENTS.md` with them, so the ladder is explicit and matches
CI. Whenever something would change what runs (several solutions, custom build scripts, an
unfamiliar CI setup), ask instead of guessing.
