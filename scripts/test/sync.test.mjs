import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sync } from '../sync.mjs';

const write = (file, content) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
const read = (file) => fs.readFileSync(file, 'utf8');
const readJson = (file) => JSON.parse(read(file));

/** A tiny fake kit: package.json plus vendor/core and vendor/dotnet. */
function makeKit(version, files) {
  const kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  write(path.join(kit, 'package.json'), JSON.stringify({ version }));
  for (const [rel, content] of Object.entries(files)) write(path.join(kit, rel), content);
  return kit;
}
const fragment = (plugin, allow) => JSON.stringify({ permissions: { allow }, enabledPlugins: { [`${plugin}@wrak-agentkit`]: true } });
const baseFiles = (extra = {}) => ({
  'vendor/core/.github/agents/a.agent.md': 'A1\n',
  'vendor/core/.github/instructions/r.instructions.md': 'R1\n',
  'vendor/core/claude-settings.fragment.json': fragment('agentkit-core', ['Read', 'Bash(git status:*)']),
  'vendor/dotnet/.github/skills/s/SKILL.md': 'S1\n',
  'vendor/dotnet/claude-settings.fragment.json': fragment('agentkit-dotnet', ['Bash(dotnet test:*)']),
  ...extra,
});
function makeConsumer(config = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'consumer-'));
  write(path.join(dir, '.github/agentkit.json'), JSON.stringify({ version: '0.0.0', tiers: ['core'], repo: 'acme/kit', ...config }));
  return dir;
}

test('first sync adds files, settings, config version and lock', () => {
  const kit = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer({ tiers: ['core', 'dotnet'] });
  write(path.join(dir, '.claude/settings.json'), JSON.stringify({ permissions: { allow: ['Read', 'Bash(npm test)'] }, other: 1 }));
  const { report } = sync({ target: dir, kit });
  assert.deepEqual(report.added.sort(), ['.github/agents/a.agent.md', '.github/instructions/r.instructions.md', '.github/skills/s/SKILL.md']);
  const s = readJson(path.join(dir, '.claude/settings.json'));
  assert.deepEqual(s.permissions.allow, ['Read', 'Bash(npm test)', 'Bash(git status:*)', 'Bash(dotnet test:*)']);
  assert.equal(s.other, 1);
  assert.deepEqual(s.enabledPlugins, { 'agentkit-core@wrak-agentkit': true, 'agentkit-dotnet@wrak-agentkit': true });
  assert.deepEqual(s.extraKnownMarketplaces['wrak-agentkit'], { source: { source: 'github', repo: 'acme/kit', ref: 'v1.0.0' } });
  assert.equal(readJson(path.join(dir, '.github/agentkit.json')).version, '1.0.0');
  const lock = readJson(path.join(dir, '.github/agentkit.lock.json'));
  assert.equal(Object.keys(lock.files).length, 3);
  assert.deepEqual(lock.claudeSettings.allow, ['Bash(git status:*)', 'Bash(dotnet test:*)']);
});

test('a second run with the same kit changes nothing', () => {
  const kit = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer({ tiers: ['core', 'dotnet'] });
  sync({ target: dir, kit });
  const again = sync({ target: dir, kit });
  assert.equal(again.report.added.length + again.report.updated.length + again.report.removed.length, 0);
  assert.deepEqual(again.changedMeta, []);
});

test('upgrade updates untouched files, removes dropped ones, and refuses hand-edited ones', () => {
  const v1 = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer({ tiers: ['core', 'dotnet'] });
  sync({ target: dir, kit: v1 });
  write(path.join(dir, '.github/instructions/r.instructions.md'), 'locally edited\n');

  const v2 = makeKit('1.1.0', {
    'vendor/core/.github/agents/a.agent.md': 'A2\n',
    'vendor/core/claude-settings.fragment.json': fragment('agentkit-core', ['Read']),
    'vendor/dotnet/claude-settings.fragment.json': fragment('agentkit-dotnet', ['Bash(dotnet test:*)']),
  });
  const { report } = sync({ target: dir, kit: v2 });
  assert.deepEqual(report.updated, ['.github/agents/a.agent.md']);
  assert.equal(read(path.join(dir, '.github/agents/a.agent.md')), 'A2\n');
  assert.deepEqual(report.removed, ['.github/skills/s/SKILL.md']);
  assert.ok(!fs.existsSync(path.join(dir, '.github/skills')), 'empty directory pruned');
  assert.deepEqual(report.keptModified, ['.github/instructions/r.instructions.md']);
  assert.equal(read(path.join(dir, '.github/instructions/r.instructions.md')), 'locally edited\n');
  const s = readJson(path.join(dir, '.claude/settings.json'));
  assert.ok(!s.permissions.allow.includes('Bash(git status:*)'), 'permission the kit stopped shipping is removed');
  assert.equal(s.extraKnownMarketplaces['wrak-agentkit'].source.ref, 'v1.1.0');
});

test('a hand-edited vendored file is a conflict, not overwritten, unless forced', () => {
  const kit1 = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer();
  sync({ target: dir, kit: kit1 });
  write(path.join(dir, '.github/agents/a.agent.md'), 'mine\n');
  const kit2 = makeKit('1.0.1', baseFiles({ 'vendor/core/.github/agents/a.agent.md': 'A2\n' }));
  assert.deepEqual(sync({ target: dir, kit: kit2 }).report.conflicts, ['.github/agents/a.agent.md']);
  assert.equal(read(path.join(dir, '.github/agents/a.agent.md')), 'mine\n');
  assert.deepEqual(sync({ target: dir, kit: kit2, force: true }).report.updated, ['.github/agents/a.agent.md']);
  assert.equal(read(path.join(dir, '.github/agents/a.agent.md')), 'A2\n');
});

test('a pre-existing unmanaged file at a vendored path is a conflict on first sync', () => {
  const kit = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer();
  write(path.join(dir, '.github/agents/a.agent.md'), 'older hand-written copy\n');
  const { report } = sync({ target: dir, kit });
  assert.deepEqual(report.conflicts, ['.github/agents/a.agent.md']);
  assert.ok(!('.github/agents/a.agent.md' in readJson(path.join(dir, '.github/agentkit.lock.json')).files), 'conflicting file is not claimed by the lock');
});

test('CRLF checkouts of unmodified files are not treated as local edits', () => {
  const kit1 = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer();
  sync({ target: dir, kit: kit1 });
  write(path.join(dir, '.github/agents/a.agent.md'), 'A1\r\n');
  const kit2 = makeKit('1.0.1', baseFiles({ 'vendor/core/.github/agents/a.agent.md': 'A2\n' }));
  assert.deepEqual(sync({ target: dir, kit: kit2 }).report.updated, ['.github/agents/a.agent.md']);
});

test('dry run writes nothing', () => {
  const kit = makeKit('1.0.0', baseFiles());
  const dir = makeConsumer();
  const before = read(path.join(dir, '.github/agentkit.json'));
  const { report } = sync({ target: dir, kit, dryRun: true });
  assert.equal(report.added.length, 2);
  assert.ok(!fs.existsSync(path.join(dir, '.github/agents')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude/settings.json')));
  assert.equal(read(path.join(dir, '.github/agentkit.json')), before);
});

test('refuses to run with a bad config', () => {
  const kit = makeKit('1.0.0', baseFiles());
  assert.throws(() => sync({ target: makeConsumer({ repo: 'OWNER/kit' }), kit }), /set "repo"/);
  assert.throws(() => sync({ target: makeConsumer({ tiers: ['dotnet'] }), kit }), /includes "core"/);
  assert.throws(() => sync({ target: makeConsumer({ tiers: ['core', 'nope'] }), kit }), /unknown tier/);
  assert.throws(() => sync({ target: fs.mkdtempSync(path.join(os.tmpdir(), 'empty-')), kit }), /agentkit\.json not found/);
});
