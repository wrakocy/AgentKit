---
name: verify-and-review
description: >-
  The pre-PR procedure: run the repository's deterministic verification ladder, review your own
  diff, decide which specialist reviewers (code, test, security) the change actually warrants,
  brief them, address findings, and get explicit confirmation before committing, pushing or
  opening a PR. Use once an implementation and its tests are locally complete, before opening a
  PR, or whenever the user asks for a change to be verified or reviewed.
---

# Verify and Review

This is the orchestration layer for the repository's agent workflow. It exists so that specialist
reviewers are invoked deliberately, at real risk boundaries, instead of by default. Read
"Risk-based reviewer selection" below before spawning anything.

## 1. Deterministic verification

Run these checks yourself; none of them need a model.

1. Open `AGENTS.md` at the repository root and find the `## Build & Test` section (a real heading,
   not one inside an HTML comment). Run the commands in its fenced `bash` block, in order. That
   block is the repository's full verification ladder, and normally what CI runs too.
2. If there is no such section (or no fenced block in it), look for a default ladder supplied by a
   language tier of the kit: a skill whose description says it provides the default Build & Test
   ladder for the repository's language. If one is available, follow it to work out the commands,
   and tell the user once that they were inferred and that adding a `## Build & Test` section to
   `AGENTS.md` makes them explicit.
3. If there is neither a section nor a default ladder, stop and tell the user. The repository
   hasn't met the agent kit's contract, and guessing the commands is worse than asking. The same
   goes when a default ladder reports an ambiguity it can't resolve.
4. While iterating, scope the test step to the project, class or file you're touching, as the
   section (or the default ladder) describes. Run the full ladder once before opening the PR.
5. If a formatting step changes any files, re-run the build and test steps afterward. Don't
   assume a formatting pass is a no-op for compilation.
6. If any step fails, fix the cause and re-run from that step. Don't move on to review with a red
   ladder.

## 2. Review your own diff

Before invoking any specialist reviewer, read the diff yourself: against the merge-base with the
base branch (`defaultBranch` in `.github/agentkit.json`, else `origin/HEAD`), or `git diff HEAD`
for uncommitted work. Catching the obvious issues here is cheaper than paying a reviewer agent to
find them. It also tells you which reviewers below are warranted; you can't route correctly
without having looked at what changed.

## 3. Risk-based reviewer selection

Invoke only the reviewers whose trigger condition the diff actually meets. Don't invoke a reviewer
"to be safe". An unconditional review on every change is exactly the cost and quality tradeoff
this skill exists to avoid.

| Reviewer | Invoke when the diff includes... | Skip when |
| --- | --- | --- |
| {{agent:code-reviewer}} | New or changed behavior, a public contract, an integration with a database or external system, a UI component, or cross-cutting wiring/configuration: any change where a correctness or architecture-boundary mistake is plausible | Docs- or comment-only edits, a single-constant change, a rename the compiler or tooling already verified |
| {{agent:test-reviewer}} | Behavior materially changed, or the change carries real regression risk (new or changed business logic, validation rules, events/messages, data mapping at a persistence or integration boundary) | No behavior changed and no tests needed changing |
| {{agent:security-reviewer}} | Authentication, authorization, identity/claims, secrets or security-sensitive configuration, sensitive data, externally supplied input, file upload, cryptography, or endpoint/permission exposure | Ordinary CRUD with no security boundary crossed |

If `AGENTS.md` has a `## Agent Review Triggers` section, apply it too. It names this repository's
own examples of each trigger (for example, which kinds of component always warrant a test review).

**UI review is part of {{agent:code-reviewer}}, not a separate agent.** When the diff touches UI
behavior, states, validation presentation, accessibility, responsive layout or design-system
usage, say so in the briefing, and attach any design artifact (a Figma or Zeplin link, a
screenshot) it should compare against. A second agent re-reading the same diff for the UI slice
would duplicate most of the first one's context for little added independence.

One change can warrant more than one reviewer. For example, a new authenticated page warrants
{{agent:code-reviewer}}, with the UI section in play, plus {{agent:security-reviewer}}. It's also
normal for a change to warrant none of them: a pure refactor with full test coverage and no
behavior change may only need steps 1 and 2.

{{agent:code-reviewer}} and {{agent:test-reviewer}} are the common case for any non-trivial
implementation change. {{agent:security-reviewer}} is boundary-specific and should be the
exception, not the default.

<!-- if:claude -->
Invoke each reviewer as a subagent (subagent type `{{agent:code-reviewer}}`, and so on). When more
than one is warranted, run them in parallel; they are independent and read-only.
<!-- endif -->
<!-- if:copilot -->
Invoke each reviewer as a subagent if your environment can run custom agents as subagents.
Otherwise, give the user the briefing below and ask them to run the named custom agent from the
agent picker.
<!-- endif -->

## 4. Brief the reviewer; don't hand it the repo

Each reviewer already knows how to find the repository's rules (`AGENTS.md` and the
`.github/instructions/code-review-*.instructions.md` files). Don't restate them. What the reviewer
needs from you is the specific change:

- the task or acceptance criteria, in a sentence or two
- the diff range (`git diff <merge-base>...HEAD`), or a note that the work is uncommitted
- the list of changed files
- which other reviewers are also reviewing this change, so each can leave the others' areas to
  them
- only if the reviewer would otherwise have to guess or search blindly: the few supporting files
  that give necessary context but aren't in the diff (the interface a new class implements, the
  sibling page being mirrored), and any design artifact

Don't tell a reviewer to "review the whole repo" or to re-derive architecture that is already
documented. That wastes context on both sides.

## 5. Address findings and re-verify

- Resolve the findings you agree with. Reviewers are read-only and never edit anything
  themselves. If you disagree with a finding, tell the user why instead of silently ignoring it.
- Re-run only the deterministic checks the fix affects (for example, the tests of the touched
  project, not necessarily the full ladder).
- Re-invoke a reviewer only if the fix changed the risk area that reviewer examined. A trivial
  follow-up fix (renaming a variable the reviewer flagged, adding one missing test) doesn't need a
  fresh full review pass.

## 6. Commit, push and open the PR: each needs explicit confirmation

Never run `git commit` or `git push`, and never create, update or merge a pull request, without
asking the user first and getting a clear yes for that specific action, in the moment. Finishing
implementation, tests and review doesn't imply permission to commit or push. Ask before
committing, ask again before pushing, and ask again before opening the PR. Each time, say what
you're about to do (files or a summary, branch, remote).

Once the PR is open, the repository's CI (described in `AGENTS.md`, if it has a `## CI` section)
and human review apply unchanged. This skill's local verification and specialist reviews
supplement that pipeline; they don't replace it. If CI runs static or security analysis, it
re-verifies what the local {{agent:security-reviewer}} pass already checked; it doesn't substitute
for it.
