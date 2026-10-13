#!/usr/bin/env node
// Installs the plugins the way a developer does (user scope, from a marketplace source) into a
// throwaway Claude config directory, and checks both plugins come up at the expected version.
//
//   node scripts/smoke-install.mjs [--source <marketplace source>] [--version <x.y.z>]
//
// --source defaults to this checkout; pass a git URL such as
// https://github.com/wrakocy/AgentKit.git#v1 to check a published tag. --version defaults to
// package.json. Never touches the caller's own ~/.claude: CLAUDE_CONFIG_DIR points at a temp dir.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKETPLACE = 'wrak-agentkit';
const PLUGINS = ['agentkit-core', 'agentkit-dotnet'];
const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { source: kitRoot, version: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') args.source = argv[++i];
    else if (a === '--version') args.version = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  args.version ??= JSON.parse(fs.readFileSync(path.join(kitRoot, 'package.json'), 'utf8')).version;
  return args;
}

const args = parseArgs(process.argv.slice(2));
const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentkit-smoke-'));
const env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };
// Run outside the checkout so no project-scoped .claude/settings.json is picked up. A shell
// command string (not execFile) because an npm-installed claude on Windows is a .cmd shim.
const claude = (...cmd) =>
  execSync(['claude', 'plugin', ...cmd].map((a) => `"${a}"`).join(' '), { env, cwd: configDir, encoding: 'utf8' });

try {
  claude('marketplace', 'add', args.source);
  for (const p of PLUGINS) claude('install', `${p}@${MARKETPLACE}`, '--scope', 'user');

  const installed = JSON.parse(claude('list', '--json'));
  const problems = [];
  for (const p of PLUGINS) {
    const entry = installed.find((e) => e.id === `${p}@${MARKETPLACE}`);
    if (!entry) problems.push(`${p} is not installed`);
    else if (entry.version !== args.version) problems.push(`${p} is ${entry.version}, expected ${args.version}`);
    else if (!entry.enabled) problems.push(`${p} is installed but not enabled`);
  }
  if (problems.length) {
    console.error(`smoke-install: FAILED (${args.source})\n  - ${problems.join('\n  - ')}`);
    process.exitCode = 1;
  } else {
    console.log(`smoke-install: ok (${PLUGINS.join(', ')} at ${args.version} from ${args.source})`);
  }
} finally {
  fs.rmSync(configDir, { recursive: true, force: true });
}
