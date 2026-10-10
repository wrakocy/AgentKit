---
description: Example repository-specific review rules. Copy to .github/instructions/code-review-<area>.instructions.md and replace the content. Do not name it code-review-kit-* (reserved for files synced from wrak.agentkit).
applyTo: "src/MyApp.Core/**/*.cs"
---

# Code Review Standards: <Area>

Severity tags follow `code-review-kit-general.instructions.md`:

- **[Required]** corresponds to a MUST / MUST NOT in `AGENTS.md`. A violation blocks the PR.
- **[Suggested]** corresponds to a SHOULD. A non-blocking suggestion.

Cite the AGENTS.md rule each one comes from, so the reviewer (and the author) can see why.

## <Topic>

- **[Required]** Flag <specific, checkable thing> in <where>. (AGENTS.md MUST: <the rule>)
- **[Suggested]** Flag <specific, checkable thing>. (AGENTS.md SHOULD: <the rule>)
