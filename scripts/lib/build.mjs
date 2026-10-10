/**
 * Builds every generated file in memory from src/. Used by generate.mjs (writes it) and
 * check.mjs (compares it with what is committed). Collects validation errors instead of
 * throwing so a single run reports everything that is wrong.
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readText, walk } from './fsutil.mjs';
import { parseDoc, serializeDoc } from './frontmatter.mjs';
import { renderBody, hasMarkup, pluginName } from './render.mjs';

export const TIERS = ['core', 'dotnet'];
export const MARKETPLACE = 'wrak-agentkit';
export const GENERATED_ROOTS = ['.claude-plugin', 'plugins', 'vendor'];

const TIER_DESCRIPTIONS = {
  core: 'Language-agnostic agent workflow: verify-and-review skill, code/test/security reviewer agents, commit-and-push confirmation guard rails.',
  dotnet: '.NET / ASP.NET Core / Blazor add-on: unit-test skill and review rules. Requires agentkit-core.',
};

const CLAUDE_TOOLS = { read: ['Read'], search: ['Grep', 'Glob'], execute: ['Bash'] };
const CLAUDE_AGENT_KEYS = new Set(['name', 'description', 'model', 'effort', 'maxTurns', 'tools', 'disallowedTools', 'skills', 'memory', 'background', 'omitClaudeMd', 'isolation', 'color']);
const COPILOT_AGENT_KEYS = new Set(['name', 'description', 'target', 'tools', 'model', 'mcp-servers', 'disable-model-invocation', 'user-invocable', 'metadata']);
const SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const INSTRUCTION_KEYS = new Set(['description', 'applyTo', 'excludeAgent']);
const EXCLUDE_AGENT = new Set(['code-review', 'cloud-agent']);
const SKILL_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COPILOT_BODY_LIMIT = 30000;

const json = (value) => JSON.stringify(value, null, 2) + '\n';

export function genHeader(version, srcRel) {
  return `<!-- GENERATED from wrak.agentkit@v${version} (${srcRel}). Do not edit; change the source in wrak.agentkit and re-sync. -->`;
}

function commentHeader(version, srcRel, prefix) {
  return `${prefix} GENERATED from wrak.agentkit@v${version} (${srcRel}). Do not edit; change the source in wrak.agentkit and re-sync.`;
}

/** Insert a generated-file comment into a script, after its shebang line if it has one. */
function stampScript(text, version, srcRel, prefix) {
  const normalized = text.replace(/\r\n?/g, '\n');
  const header = commentHeader(version, srcRel, prefix);
  if (normalized.startsWith('#!')) {
    const nl = normalized.indexOf('\n');
    return `${normalized.slice(0, nl + 1)}${header}\n${normalized.slice(nl + 1)}`;
  }
  return `${header}\n${normalized}`;
}

function listDir(dir, filter) {
  return exists(dir) ? fs.readdirSync(dir).filter(filter).sort() : [];
}

export function loadVersion(root) {
  return JSON.parse(readText(path.join(root, 'package.json'))).version;
}

/** @returns {{ files: Map<string, string|Buffer>, errors: string[], version: string }} */
export function build(root) {
  const version = loadVersion(root);
  const files = new Map();
  const errors = [];
  const registry = new Map();
  const items = { agents: [], skills: [], instructions: [] };

  const claim = (name, kind, tier, where) => {
    if (registry.has(name)) errors.push(`${where}: the name "${name}" is already used by a ${registry.get(name).kind} in tier ${registry.get(name).tier}`);
    else registry.set(name, { kind, tier });
  };

  // ---- pass 1: discover and register every agent and skill ----
  for (const tier of TIERS) {
    const base = path.join(root, 'src', tier);
    for (const f of listDir(path.join(base, 'agents'), (n) => n.endsWith('.md'))) {
      const rel = `src/${tier}/agents/${f}`;
      const doc = parseDoc(readText(path.join(root, rel)), rel);
      items.agents.push({ tier, rel, file: f, doc });
      claim(f.replace(/\.md$/, ''), 'agent', tier, rel);
    }
    for (const d of listDir(path.join(base, 'skills'), (n) => fs.statSync(path.join(base, 'skills', n)).isDirectory())) {
      const rel = `src/${tier}/skills/${d}/SKILL.md`;
      if (!exists(path.join(root, rel))) { errors.push(`src/${tier}/skills/${d}: missing SKILL.md`); continue; }
      items.skills.push({ tier, rel, dir: d, doc: parseDoc(readText(path.join(root, rel)), rel) });
      claim(d, 'skill', tier, rel);
    }
    for (const f of listDir(path.join(base, 'instructions'), (n) => n.endsWith('.instructions.md'))) {
      const rel = `src/${tier}/instructions/${f}`;
      items.instructions.push({ tier, rel, file: f, doc: parseDoc(readText(path.join(root, rel)), rel) });
    }
  }

  const ctxFor = (tier, where) => ({ registry, tier, where, errors });

  // ---- agents ----
  for (const a of items.agents) {
    const { data, body } = a.doc;
    const name = a.file.replace(/\.md$/, '');
    if (!data) { errors.push(`${a.rel}: missing frontmatter`); continue; }
    if (data.name !== name) errors.push(`${a.rel}: frontmatter name "${data.name}" must equal the file name "${name}"`);
    if (!data.description || typeof data.description !== 'string') errors.push(`${a.rel}: description is required`);
    for (const key of Object.keys(data)) {
      if (!['name', 'description', 'tools', 'claude', 'copilot'].includes(key)) errors.push(`${a.rel}: unknown frontmatter key "${key}" (platform-specific keys go under claude: or copilot:)`);
    }
    const tools = data.tools ?? [];
    for (const t of tools) if (!CLAUDE_TOOLS[t]) errors.push(`${a.rel}: unknown abstract tool "${t}" (use read, search, execute)`);

    const header = genHeader(version, a.rel);

    const claudeData = {
      name: data.name,
      description: data.description,
      tools: tools.flatMap((t) => CLAUDE_TOOLS[t] ?? []).join(', '),
      ...(data.claude ?? {}),
    };
    for (const key of Object.keys(claudeData)) if (!CLAUDE_AGENT_KEYS.has(key)) errors.push(`${a.rel}: "${key}" is not a supported Claude plugin agent field`);
    const claudeBody = renderBody(body, 'claude', ctxFor(a.tier, a.rel));
    files.set(`plugins/${pluginName(a.tier)}/agents/${a.file}`, serializeDoc(claudeData, claudeBody, header));

    const copilotData = {
      name: data.name,
      description: data.description,
      tools,
      ...(data.copilot ?? {}),
    };
    for (const key of Object.keys(copilotData)) if (!COPILOT_AGENT_KEYS.has(key)) errors.push(`${a.rel}: "${key}" is not a supported Copilot agent field`);
    const copilotBody = renderBody(body, 'copilot', ctxFor(a.tier, a.rel));
    if (copilotBody.length > COPILOT_BODY_LIMIT) errors.push(`${a.rel}: Copilot agent body is ${copilotBody.length} characters; the limit is ${COPILOT_BODY_LIMIT}`);
    files.set(`vendor/${a.tier}/.github/agents/${name}.agent.md`, serializeDoc(copilotData, copilotBody, header));
  }

  // ---- skills ----
  for (const s of items.skills) {
    const { data, body } = s.doc;
    if (!data) { errors.push(`${s.rel}: missing frontmatter`); continue; }
    if (data.name !== s.dir) errors.push(`${s.rel}: frontmatter name "${data.name}" must equal the directory name "${s.dir}"`);
    if (!SKILL_NAME.test(s.dir) || s.dir.length > 64) errors.push(`${s.rel}: skill name must be lowercase letters, digits and hyphens, at most 64 characters`);
    if (!data.description || typeof data.description !== 'string') errors.push(`${s.rel}: description is required`);
    for (const key of Object.keys(data)) if (!SKILL_KEYS.has(key)) errors.push(`${s.rel}: "${key}" is not a portable Agent Skills field (${[...SKILL_KEYS].join(', ')})`);
    if (body.split('\n').length > 500) errors.push(`${s.rel}: SKILL.md is over 500 lines; move detail into supporting files`);

    const header = genHeader(version, s.rel);
    const claudeBody = renderBody(body, 'claude', ctxFor(s.tier, s.rel));
    const copilotBody = renderBody(body, 'copilot', ctxFor(s.tier, s.rel));
    files.set(`plugins/${pluginName(s.tier)}/skills/${s.dir}/SKILL.md`, serializeDoc(data, claudeBody, header));
    files.set(`vendor/${s.tier}/.github/skills/${s.dir}/SKILL.md`, serializeDoc(data, copilotBody, header));

    // Supporting files are copied verbatim to both platforms.
    const skillDir = path.join(root, 'src', s.tier, 'skills', s.dir);
    for (const extra of walk(skillDir).filter((p) => p !== 'SKILL.md')) {
      const content = fs.readFileSync(path.join(skillDir, extra));
      files.set(`plugins/${pluginName(s.tier)}/skills/${s.dir}/${extra}`, content);
      files.set(`vendor/${s.tier}/.github/skills/${s.dir}/${extra}`, content);
    }
  }

  // ---- instruction (review rule) files: platform-neutral, vendored only ----
  for (const i of items.instructions) {
    const { data, body } = i.doc;
    if (!data) { errors.push(`${i.rel}: missing frontmatter`); continue; }
    if (!i.file.startsWith('code-review-kit-')) errors.push(`${i.rel}: kit instruction files must be named code-review-kit-*.instructions.md`);
    if (!data.description) errors.push(`${i.rel}: description is required`);
    if (!data.applyTo || typeof data.applyTo !== 'string') errors.push(`${i.rel}: applyTo is required`);
    if (data.excludeAgent !== undefined && !EXCLUDE_AGENT.has(data.excludeAgent)) errors.push(`${i.rel}: excludeAgent must be one of ${[...EXCLUDE_AGENT].join(', ')}`);
    for (const key of Object.keys(data)) if (!INSTRUCTION_KEYS.has(key)) errors.push(`${i.rel}: unknown frontmatter key "${key}"`);
    if (hasMarkup(body)) errors.push(`${i.rel}: instruction files are read by both platforms and must not use {{...}} tokens or <!-- if: --> blocks`);
    files.set(`vendor/${i.tier}/.github/instructions/${i.file}`, serializeDoc(data, body, genHeader(version, i.rel)));
  }

  // ---- core policy: Claude SessionStart context + Copilot always-on instructions ----
  const policyRel = 'src/core/policy.md';
  if (exists(path.join(root, policyRel))) {
    const { body } = parseDoc(readText(path.join(root, policyRel)), policyRel);
    const header = genHeader(version, policyRel);
    files.set(`plugins/${pluginName('core')}/context/policy.md`, serializeDoc(null, renderBody(body, 'claude', ctxFor('core', policyRel)), header));
    files.set(
      'vendor/core/.github/instructions/agentkit-workflow.instructions.md',
      serializeDoc(
        { description: 'Agent workflow policy shared across the organization: confirm before commit/push/PR, one primary agent, reviewers only at risk boundaries.', applyTo: '**', excludeAgent: 'code-review' },
        renderBody(body, 'copilot', ctxFor('core', policyRel)),
        header,
      ),
    );
  } else {
    errors.push(`${policyRel}: missing`);
  }

  // ---- core hooks (Claude only) ----
  const hooksDir = path.join(root, 'src', 'core', 'hooks');
  if (exists(path.join(hooksDir, 'hooks.json'))) {
    files.set(`plugins/${pluginName('core')}/hooks/hooks.json`, json(JSON.parse(readText(path.join(hooksDir, 'hooks.json')))));
    for (const script of walk(path.join(hooksDir, 'scripts'))) {
      const rel = `src/core/hooks/scripts/${script}`;
      const prefix = script.endsWith('.mjs') ? '//' : '#';
      files.set(`plugins/${pluginName('core')}/scripts/${script}`, stampScript(readText(path.join(root, rel)), version, rel, prefix));
    }
  }

  // ---- per-tier plugin manifest and Claude settings fragment ----
  const presentTiers = TIERS.filter((t) => exists(path.join(root, 'src', t)));
  for (const tier of presentTiers) {
    const manifest = {
      name: pluginName(tier),
      version,
      description: TIER_DESCRIPTIONS[tier],
      author: { name: 'Wrak' },
      keywords: ['code-review', 'workflow', ...(tier === 'dotnet' ? ['dotnet', 'blazor'] : [])],
      ...(tier === 'core' ? {} : { dependencies: [pluginName('core')] }),
      metadata: { generatedFrom: `wrak.agentkit@v${version}` },
    };
    files.set(`plugins/${pluginName(tier)}/.claude-plugin/plugin.json`, json(manifest));

    const permsPath = path.join(root, 'src', tier, 'settings', 'permissions.json');
    const perms = exists(permsPath) ? JSON.parse(readText(permsPath)) : { permissions: { allow: [] } };
    files.set(`vendor/${tier}/claude-settings.fragment.json`, json({
      _generatedFrom: `wrak.agentkit@v${version}`,
      permissions: perms.permissions,
      enabledPlugins: { [`${pluginName(tier)}@${MARKETPLACE}`]: true },
    }));
  }

  files.set('.claude-plugin/marketplace.json', json({
    name: MARKETPLACE,
    owner: { name: 'Wrak' },
    description: 'Shared AI-agent guidance (reviewers, skills, review rules) for Claude Code and GitHub Copilot.',
    plugins: presentTiers.map((tier) => ({
      name: pluginName(tier),
      source: `./plugins/${pluginName(tier)}`,
      description: TIER_DESCRIPTIONS[tier],
    })),
  }));

  return { files, errors, version };
}
