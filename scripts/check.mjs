#!/usr/bin/env node
// CI gate. Fails if src/ is invalid, if the committed generated output differs from what the
// generator produces, if tier-1 content mentions a language/product, or if release metadata
// (CHANGELOG, tag) is inconsistent. Usage: npm run check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, GENERATED_ROOTS } from './lib/build.mjs';
import { walk, readText, exists } from './lib/fsutil.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files, errors, version } = build(root);
const problems = [...errors];

// 1. Committed output must equal freshly generated output.
const onDisk = new Set(GENERATED_ROOTS.flatMap((dir) => walk(path.join(root, dir)).map((f) => `${dir}/${f}`)));
for (const [rel, expected] of files) {
  const file = path.join(root, rel);
  if (!exists(file)) { problems.push(`generated file is missing: ${rel}`); continue; }
  const actual = fs.readFileSync(file);
  const want = Buffer.isBuffer(expected) ? expected : Buffer.from(expected, 'utf8');
  if (!actual.equals(want)) problems.push(`generated file is out of date: ${rel}`);
  onDisk.delete(rel);
}
for (const stale of onDisk) problems.push(`stale generated file with no source: ${stale}`);

// 2. Tier 1 must stay language- and product-agnostic (see src/AUTHORING.md).
const FORBIDDEN = /CleanBlazor|MediatR|IAppBus|MudBlazor|Blazor|dotnet|xUnit|Moq|C#|\.NET|ASP\.NET|Verify-Package-Versions|\bmain\b|\bmaster\b/;
const tier1 = [
  ...walk(path.join(root, 'src', 'core')).map((f) => `src/core/${f}`),
  ...[...files.keys()].filter((f) => f.startsWith('vendor/core/') || f.startsWith('plugins/agentkit-core/')),
];
for (const rel of new Set(tier1)) {
  const text = files.has(rel) ? String(files.get(rel)) : readText(path.join(root, rel));
  text.split('\n').forEach((line, i) => {
    const m = FORBIDDEN.exec(line);
    if (m) problems.push(`${rel}:${i + 1}: tier-1 content must not mention "${m[0]}"`);
  });
}

// 3. Release metadata.
const changelog = exists(path.join(root, 'CHANGELOG.md')) ? readText(path.join(root, 'CHANGELOG.md')) : '';
if (!new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm').test(changelog)) {
  problems.push(`CHANGELOG.md has no "## [${version}]" section`);
}
// A release tag is v<version>; the floating major tag consumers' sync workflow calls (v1) is also allowed.
const allowedTags = [`v${version}`, `v${version.split('.')[0]}`];
if (process.env.GITHUB_REF_TYPE === 'tag' && !allowedTags.includes(process.env.GITHUB_REF_NAME)) {
  problems.push(`tag ${process.env.GITHUB_REF_NAME} must be ${allowedTags.join(' or ')} (package.json version is ${version})`);
}

if (problems.length > 0) {
  console.error(`check: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  if (problems.some((p) => p.includes('out of date') || p.includes('missing') || p.includes('stale'))) {
    console.error('\nRun "npm run generate" and commit the result.');
  }
  process.exit(1);
}
console.log(`check: ok (${files.size} generated files, v${version})`);
