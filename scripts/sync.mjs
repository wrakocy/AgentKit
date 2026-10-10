#!/usr/bin/env node
// Vendors this kit's Copilot files and Claude settings into a consumer repository.
//
//   node scripts/sync.mjs --target <consumer-dir> [--dry-run] [--force] [--summary <file>]
//
// Reads <target>/.github/agentkit.json (version, tiers, repo, ...) and writes:
//   - the files under vendor/<tier>/ for each enabled tier, at the same relative paths
//   - the kit-managed entries in <target>/.claude/settings.json (marketplace + ref, enabledPlugins,
//     permissions.allow)
//   - <target>/.github/agentkit.json (version) and <target>/.github/agentkit.lock.json
//
// It never overwrites a vendored file that was edited by hand (or already existed before the first
// sync); those are reported as conflicts. Dependency-free on purpose: consumer CI runs it as-is.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashContent, pruneEmptyDirs, walk, writeFileEnsured } from './lib/fsutil.mjs';

const MARKETPLACE = 'wrak-agentkit';
const FRAGMENT = 'claude-settings.fragment.json';
const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { dryRun: false, force: false, target: null, summary: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--target') args.target = argv[++i];
    else if (a === '--summary') args.summary = argv[++i];
    else fail(`unknown argument: ${a}`);
  }
  if (!args.target) fail('usage: node scripts/sync.mjs --target <consumer-dir> [--dry-run] [--force] [--summary <file>]');
  return args;
}

function fail(message) {
  throw new Error(message);
}

const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
const toJson = (value) => JSON.stringify(value, null, 2) + '\n';
const sortedObject = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));

const stripHtmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');

export function sync({ target, dryRun = false, force = false, kit = kitRoot }) {
  const kitVersion = JSON.parse(fs.readFileSync(path.join(kit, 'package.json'), 'utf8')).version;
  const configPath = path.join(target, '.github', 'agentkit.json');
  const lockPath = path.join(target, '.github', 'agentkit.lock.json');
  const settingsPath = path.join(target, '.claude', 'settings.json');

  if (!fs.existsSync(configPath)) {
    fail(`${configPath} not found. Copy templates/agentkit.json from the kit into the repository and edit it first.`);
  }
  const config = readJson(configPath);
  const tiers = config.tiers ?? [];
  if (!Array.isArray(tiers) || tiers.length === 0 || !tiers.includes('core')) fail('agentkit.json: "tiers" must be an array that includes "core"');
  if (!config.repo || /OWNER/.test(config.repo)) fail('agentkit.json: set "repo" to the kit repository (owner/name)');
  for (const t of tiers) if (!fs.existsSync(path.join(kit, 'vendor', t))) fail(`unknown tier "${t}" (no vendor/${t} in the kit)`);

  const lock = readJson(lockPath, { files: {}, claudeSettings: { allow: [], enabledPlugins: [] } });
  const report = { added: [], updated: [], unchanged: [], removed: [], conflicts: [], keptModified: [], seeded: [], warnings: [] };

  // ---- desired vendored files ----
  const desired = new Map();
  for (const tier of tiers) {
    const base = path.join(kit, 'vendor', tier);
    for (const rel of walk(base).filter((f) => f !== FRAGMENT)) {
      if (desired.has(rel)) fail(`${rel} is provided by more than one tier`);
      desired.set(rel, fs.readFileSync(path.join(base, rel)));
    }
  }

  const newLockFiles = {};
  for (const [rel, content] of desired) {
    const dest = path.join(target, rel);
    const newHash = hashContent(content);
    const locked = lock.files[rel];
    if (!fs.existsSync(dest)) {
      report.added.push(rel);
      newLockFiles[rel] = newHash;
      if (!dryRun) writeFileEnsured(dest, content);
      continue;
    }
    const currentHash = hashContent(fs.readFileSync(dest));
    if (currentHash === newHash) {
      report.unchanged.push(rel);
      newLockFiles[rel] = newHash;
    } else if (force || (locked && currentHash === locked)) {
      report.updated.push(rel);
      newLockFiles[rel] = newHash;
      if (!dryRun) writeFileEnsured(dest, content);
    } else {
      report.conflicts.push(rel);
      if (locked) newLockFiles[rel] = locked;
    }
  }

  // ---- files the kit no longer ships ----
  for (const [rel, locked] of Object.entries(lock.files)) {
    if (desired.has(rel)) continue;
    const dest = path.join(target, rel);
    if (!fs.existsSync(dest)) continue;
    if (force || hashContent(fs.readFileSync(dest)) === locked) {
      report.removed.push(rel);
      if (!dryRun) {
        fs.rmSync(dest);
        pruneEmptyDirs(path.dirname(dest), target);
      }
    } else {
      report.keptModified.push(rel);
    }
  }

  // ---- Claude settings ----
  const settings = readJson(settingsPath, {});
  const prev = lock.claudeSettings ?? { allow: [], enabledPlugins: [] };
  const wantAllow = new Set();
  const wantPlugins = new Set();
  for (const tier of tiers) {
    const fragment = readJson(path.join(kit, 'vendor', tier, FRAGMENT), {});
    for (const entry of fragment.permissions?.allow ?? []) wantAllow.add(entry);
    for (const [name, on] of Object.entries(fragment.enabledPlugins ?? {})) if (on) wantPlugins.add(name);
  }

  const userAllow = (settings.permissions?.allow ?? []).filter((e) => !prev.allow.includes(e));
  const managedAllow = [...wantAllow].filter((e) => !userAllow.includes(e));
  settings.permissions = { ...(settings.permissions ?? {}), allow: [...userAllow, ...managedAllow] };

  const enabled = { ...(settings.enabledPlugins ?? {}) };
  for (const name of prev.enabledPlugins) if (!wantPlugins.has(name) && enabled[name] === true) delete enabled[name];
  for (const name of wantPlugins) enabled[name] = true;
  settings.enabledPlugins = enabled;

  settings.extraKnownMarketplaces = {
    ...(settings.extraKnownMarketplaces ?? {}),
    [MARKETPLACE]: { source: { source: 'github', repo: config.repo, ref: `v${kitVersion}` } },
  };

  // ---- starter files: created once if missing, never owned or overwritten afterwards ----
  const seedDir = path.join(kit, 'templates', 'seed');
  for (const rel of walk(seedDir)) {
    const dest = path.join(target, rel);
    if (fs.existsSync(dest)) continue;
    report.seeded.push(rel);
    if (!dryRun) writeFileEnsured(dest, fs.readFileSync(path.join(seedDir, rel)));
  }

  // ---- contract warnings (the files are the repository's own; sync only reports) ----
  const hasLanguageTier = tiers.some((t) => t !== 'core');
  const agentsFile = path.join(target, 'AGENTS.md');
  if (!hasLanguageTier) {
    const text = fs.existsSync(agentsFile) ? stripHtmlComments(fs.readFileSync(agentsFile, 'utf8')) : '';
    if (!/^#{2,3}[ \t]+Build[ \t]*&[ \t]*Test\b/im.test(text)) {
      report.warnings.push('AGENTS.md has no "## Build & Test" section and only the core tier is enabled, so verify-and-review has no commands to run. Add the section (see templates/AGENTS.md), or enable a language tier that provides a default ladder.');
    }
  }
  const claudeFile = path.join(target, 'CLAUDE.md');
  if (!report.seeded.includes('CLAUDE.md') && fs.existsSync(claudeFile) && !/@AGENTS\.md/.test(fs.readFileSync(claudeFile, 'utf8'))) {
    report.warnings.push('CLAUDE.md does not import AGENTS.md. Add a line containing "@AGENTS.md" so Claude Code loads it.');
  }

  // ---- write config, settings, lock ----
  const newConfig = { ...config, version: kitVersion };
  const newLock = {
    kitVersion,
    files: sortedObject(newLockFiles),
    claudeSettings: { allow: managedAllow, enabledPlugins: [...wantPlugins].sort() },
  };
  const writes = [
    [settingsPath, toJson(settings)],
    [configPath, toJson(newConfig)],
    [lockPath, toJson(newLock)],
  ];
  const changedMeta = [];
  for (const [file, content] of writes) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current !== content) {
      changedMeta.push(path.relative(target, file).split(path.sep).join('/'));
      if (!dryRun) writeFileEnsured(file, content);
    }
  }

  return { kitVersion, previousVersion: config.version, report, changedMeta };
}

export function formatSummary({ kitVersion, previousVersion, report, changedMeta }, dryRun) {
  const lines = [`## wrak.agentkit sync: ${previousVersion ?? 'none'} -> v${kitVersion}${dryRun ? ' (dry run)' : ''}`, ''];
  const section = (title, items) => {
    if (items.length === 0) return;
    lines.push(`**${title}** (${items.length})`, ...items.map((f) => `- \`${f}\``), '');
  };
  section('Created starter files (yours to edit; sync never overwrites them)', report.seeded);
  section('Added', report.added);
  section('Updated', report.updated);
  section('Removed (no longer shipped by the kit)', report.removed);
  section('Settings and metadata changed', changedMeta);
  section('CONFLICT: not overwritten (edited locally, or already existed before the first sync). Review, then delete the local file or re-run with --force', report.conflicts);
  section('Kept: no longer shipped by the kit but modified locally', report.keptModified);
  section('WARNING', report.warnings);
  if (report.added.length + report.updated.length + report.removed.length + report.seeded.length + changedMeta.length === 0 && report.conflicts.length === 0 && report.warnings.length === 0) {
    lines.push('Already up to date.', '');
  }
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = sync({ target: path.resolve(args.target), dryRun: args.dryRun, force: args.force });
    const summary = formatSummary(result, args.dryRun);
    console.log(summary);
    if (args.summary && !args.dryRun) fs.writeFileSync(args.summary, summary);
  } catch (e) {
    console.error(`sync: ${e.message}`);
    process.exit(1);
  }
}
