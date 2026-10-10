# AGENTS.md

<!-- Skeleton of what wrak.agentkit expects from a repository. Delete these comments, fill in the
     sections, and keep the headings: the agents and the verify-and-review skill look for them. -->

<One paragraph: what this repository is, its main components, and where the architecture docs live.>

## Build & Test

<!-- Required unless your tiers include a language tier that provides a default ladder (the dotnet
     tier infers one from your solution file and CI workflow); then this section is an optional
     override. The verify-and-review skill runs the commands in this block, in order. This should
     be the same ladder CI runs. Put any explanation (why a step exists, how to scope tests while
     iterating) in prose below the block. -->

```bash
# format, restore, build, test: whatever your CI runs, in order
```

While iterating, scope the test step to the project or class you are changing, for example
`<your scoped test command>`. Run the full ladder once before opening a PR.

## CI

<!-- Recommended. What CI runs after a PR is opened, so the skill can say what will be re-verified. -->

## Load-Bearing Conventions

<!-- Recommended. The rules reviewers cite. Use MUST / SHOULD / MUST NOT; every [Required] rule in
     your code-review-*.instructions.md files should trace to a MUST or MUST NOT here, and every
     [Suggested] rule to a SHOULD. -->

### MUST
-

### SHOULD
-

### MUST NOT
-

## Agent Review Triggers

<!-- Recommended. Examples from THIS repository that sharpen the generic reviewer trigger table in
     the verify-and-review skill. Example:
     - code-reviewer: any new or changed handler, controller, component, or database mapping.
     - test-reviewer: any new or changed validation rule or business rule.
     - security-reviewer: anything touching sign-in, roles/claims, file upload, or configuration
       that holds secrets. -->
