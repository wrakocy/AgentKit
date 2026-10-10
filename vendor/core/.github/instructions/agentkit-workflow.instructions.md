---
description: "Agent workflow policy shared across the organization: confirm before commit/push/PR, one primary agent, reviewers only at risk boundaries."
applyTo: "**"
excludeAgent: code-review
---
<!-- GENERATED from wrak.agentkit@v1.1.0 (src/core/policy.md). Do not edit; change the source in wrak.agentkit and re-sync. -->

# Agent workflow policy (wrak.agentkit)

These rules apply to every agent working in this repository: the primary agent and every
specialist reviewer.

**Never `git commit`, `git push`, or create, update or merge a pull request without the user's
explicit, in-the-moment confirmation of that specific action.** Implementing, testing and
locally reviewing a change never implies permission to commit or push it. Ask, say exactly what
you are about to commit or push (files or a summary) and to which branch or remote, and wait for a
clear yes. Committing, pushing and opening the PR each need their own confirmation. An earlier,
more general approval does not count.

How work is done here:

1. One primary agent implements the change, writes or updates its tests, and runs the
   repository's deterministic verification (the `## Build & Test` section of `AGENTS.md`). Don't
   spawn a fleet of subagents by habit.
2. Before opening a pull request, or whenever the user asks for the change to be verified or
   reviewed, follow the verify-and-review skill. It decides which specialist reviewers
   (code-reviewer, test-reviewer, security-reviewer) the change
   actually warrants. Reviewers are independent verification at real risk boundaries, not a
   default step for every change.
3. Specialist reviewers are read-only. They report findings and never edit files, commit, push,
   or comment on pull requests.
4. Files named `code-review-kit-*`, `agentkit-*`, and the kit's agents and skills are generated
   from wrak.agentkit. Don't edit them in this repository; propose the change to the kit instead.
