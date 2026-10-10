#!/usr/bin/env node
// Regenerates plugins/, vendor/ and .claude-plugin/ from src/. Usage: npm run generate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, GENERATED_ROOTS } from './lib/build.mjs';
import { writeFileEnsured } from './lib/fsutil.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files, errors, version } = build(root);

if (errors.length > 0) {
  console.error(`generate: ${errors.length} problem(s) in src/:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

for (const dir of GENERATED_ROOTS) fs.rmSync(path.join(root, dir), { recursive: true, force: true });
for (const [rel, content] of files) writeFileEnsured(path.join(root, rel), content);

console.log(`generate: wrote ${files.size} files for wrak.agentkit v${version}`);
