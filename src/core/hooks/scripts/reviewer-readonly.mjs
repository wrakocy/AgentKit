#!/usr/bin/env node
// PreToolUse hook (Bash): keep the code and security reviewer subagents read-only.
//
// Plugin agent frontmatter can only name tools ("Bash"), not restrict commands, so this hook
// denies any Bash command from those two reviewers that is not a plain read-only git inspection.
// test-reviewer is deliberately not covered: it must run the repository's scoped test command.
//
// Fail-open by design: on any parse problem the hook says nothing and the normal permission flow
// applies. This is a guard rail for the prompt rule, not a security boundary.
import { readFileSync } from 'node:fs';

const REVIEWER = /(^|:)(code|security)-reviewer$/;

const READ_ONLY_SUBCOMMANDS = new Set([
  'status', 'diff', 'log', 'show', 'rev-parse', 'merge-base', 'symbolic-ref', 'ls-files',
  'ls-tree', 'blame', 'describe', 'shortlog', 'rev-list', 'show-ref', 'cat-file', 'diff-tree',
]);
const BRANCH_FLAGS = new Set(['--show-current', '--list', '-a', '-r', '-v', '-vv', '--all', '--remotes']);
const FORBIDDEN_ARG = /^(--output(=|$)|--ext-diff$|--textconv$|-c$|-C$|--exec-path|--git-dir|--work-tree)/;

function isReadOnlyGit(command) {
  if (/[;&|<>`\n\r]|\$\(|\$\{/.test(command)) return false;
  const tokens = command.split(/\s+/);
  if (tokens[0] !== 'git' || tokens.length < 2) return false;
  const [, sub, ...args] = tokens;
  if (args.some((a) => FORBIDDEN_ARG.test(a))) return false;
  if (READ_ONLY_SUBCOMMANDS.has(sub)) return true;
  if (sub === 'branch') return args.every((a) => BRANCH_FLAGS.has(a) || !a.startsWith('-'))
    && !args.some((a) => /^-[dDmMcCfu]/.test(a));
  if (sub === 'remote') return args.length === 0 || (args.length === 1 && args[0] === '-v')
    || (args.length === 2 && args[0] === 'get-url');
  return false;
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

if (!REVIEWER.test(String(input.agent_type ?? '')) || input.tool_name !== 'Bash') process.exit(0);

const command = String(input.tool_input?.command ?? '').trim();
if (!isReadOnlyGit(command)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Reviewer agents are read-only. Only a single plain read-only git command is allowed ' +
        '(git status|diff|log|show|rev-parse|merge-base|symbolic-ref|ls-files|ls-tree|blame|describe|' +
        'shortlog|rev-list|show-ref|cat-file|diff-tree|branch --list|remote -v), with no pipes, ' +
        'redirects or command chaining. Use the Read, Grep and Glob tools for file contents.',
    },
  }) + '\n');
}
