import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBody } from '../lib/render.mjs';
import { parseDoc, serializeDoc } from '../lib/frontmatter.mjs';

const registry = new Map([
  ['code-reviewer', { kind: 'agent', tier: 'core' }],
  ['verify-and-review', { kind: 'skill', tier: 'core' }],
  ['dotnet-unit-test', { kind: 'skill', tier: 'dotnet' }],
]);
const render = (body, platform, tier = 'core') => {
  const errors = [];
  const out = renderBody(body, platform, { registry, tier, where: 'test', errors });
  return { out, errors };
};

test('resolves tokens per platform', () => {
  const body = 'Use {{agent:code-reviewer}} via {{skill:verify-and-review}}.';
  assert.equal(render(body, 'claude').out, 'Use agentkit-core:code-reviewer via /agentkit-core:verify-and-review.');
  assert.equal(render(body, 'copilot').out, 'Use code-reviewer via verify-and-review.');
});

test('reports unknown names and wrong kinds', () => {
  assert.match(render('{{agent:nope}}', 'claude').errors[0], /does not name a known agent/);
  assert.match(render('{{skill:code-reviewer}}', 'claude').errors[0], /does not name a known skill/);
});

test('core content may not reference dotnet-tier names; dotnet content may reference core', () => {
  assert.match(render('{{skill:dotnet-unit-test}}', 'claude', 'core').errors[0], /must not reference the dotnet-tier/);
  assert.deepEqual(render('{{agent:code-reviewer}}', 'claude', 'dotnet').errors, []);
});

test('conditional blocks: own-line blocks vanish cleanly, inline blocks keep indentation', () => {
  const body = 'a\n\n<!-- if:claude -->\nC\n<!-- endif -->\n<!-- if:copilot -->\nP\n<!-- endif -->\nz\n';
  assert.equal(render(body, 'claude').out, 'a\n\nC\nz\n');
  assert.equal(render(body, 'copilot').out, 'a\n\nP\nz\n');
  const inline = '1. x\n   <!-- if:copilot -->extra<!-- endif -->\n2. y\n';
  assert.equal(render(inline, 'claude').out, '1. x\n2. y\n');
  assert.equal(render(inline, 'copilot').out, '1. x\n   extra\n2. y\n');
});

test('rejects nested and unbalanced markers', () => {
  assert.match(render('<!-- if:claude -->a<!-- if:copilot -->b<!-- endif --><!-- endif -->', 'claude').errors.join(), /nest|unbalanced/);
  assert.match(render('<!-- if:claude -->never closed', 'claude').errors.join(), /unbalanced/);
});

test('frontmatter round-trips and inserts the header after the closing delimiter', () => {
  const src = '---\nname: x\ndescription: "A: b"\n---\n\n# Title\n';
  const { data, body } = parseDoc(src, 'x.md');
  assert.equal(data.description, 'A: b');
  const out = serializeDoc(data, body, '<!-- H -->');
  assert.equal(out, '---\nname: x\ndescription: "A: b"\n---\n<!-- H -->\n\n# Title\n');
  assert.equal(parseDoc(out, 'x.md').data.name, 'x');
});

test('CRLF input is normalized', () => {
  assert.equal(parseDoc('---\r\nname: x\r\n---\r\n\r\nbody\r\n', 'x.md').body, '\nbody\n');
});
