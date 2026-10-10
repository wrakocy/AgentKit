import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/core/hooks/scripts/reviewer-readonly.mjs');

function run(input) {
  const r = spawnSync(process.execPath, [script], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput : null;
}
const bash = (command, agent_type = 'agentkit-core:code-reviewer') => ({ agent_type, tool_name: 'Bash', tool_input: { command } });

test('allows plain read-only git commands for reviewers', () => {
  for (const c of ['git status', 'git diff HEAD', 'git diff main...HEAD -- src/a.cs', 'git log --oneline -20', 'git show HEAD~1',
    'git merge-base HEAD origin/main', 'git symbolic-ref refs/remotes/origin/HEAD', 'git branch --list', 'git branch --show-current', 'git remote -v', 'git remote get-url origin']) {
    assert.equal(run(bash(c)), null, c);
  }
});

test('denies anything else, including chaining, redirects and writes', () => {
  for (const c of ['git commit -m x', 'git push', 'git branch -D x', 'git remote add x y', 'git diff --output=out.txt', 'git -c core.pager=x log',
    'git status; rm -rf .', 'git status && ls', 'git log | head', 'git status > out', 'git show $(whoami)', 'ls', 'dotnet test', 'rm -rf .', 'git']) {
    const out = run(bash(c));
    assert.equal(out?.permissionDecision, 'deny', c);
  }
});

test('applies to security-reviewer and the unprefixed name, but not test-reviewer or the main session', () => {
  assert.equal(run(bash('ls', 'agentkit-core:security-reviewer'))?.permissionDecision, 'deny');
  assert.equal(run(bash('ls', 'code-reviewer'))?.permissionDecision, 'deny');
  assert.equal(run(bash('dotnet test', 'agentkit-core:test-reviewer')), null);
  assert.equal(run({ tool_name: 'Bash', tool_input: { command: 'ls' } }), null);
});

test('ignores non-Bash tools and fails open on bad input', () => {
  assert.equal(run({ agent_type: 'agentkit-core:code-reviewer', tool_name: 'Read', tool_input: { file_path: 'x' } }), null);
  assert.equal(run('not json'), null);
  assert.equal(run(''), null);
});
