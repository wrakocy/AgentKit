/**
 * Body rendering: conditional platform blocks and {{agent:x}} / {{skill:x}} tokens.
 * See src/AUTHORING.md for the syntax.
 */

export const PLATFORMS = ['claude', 'copilot'];

const BLOCK = /<!-- if:(claude|copilot) -->([\s\S]*?)<!-- endif -->/g;
const REMOVED = '\u0000REMOVED\u0000';
const TOKEN = /\{\{(agent|skill):([a-z0-9-]+)\}\}/g;

export const pluginName = (tier) => `agentkit-${tier}`;

function resolveConditionals(body, platform, where, errors) {
  let out = body.replace(BLOCK, (_, target, inner) => {
    if (inner.includes('<!-- if:')) errors.push(`${where}: conditional blocks must not nest`);
    if (target !== platform) return REMOVED;
    return inner.replace(/^\n/, '').replace(/\n$/, '');
  });
  // A removed block that sat alone on a line takes the whole line with it.
  out = out.replace(new RegExp(`^[ \\t]*${REMOVED}[ \\t]*\\n`, 'gm'), '');
  out = out.split(REMOVED).join('');
  if (/<!-- (if:|endif)/.test(out)) errors.push(`${where}: unbalanced or malformed <!-- if:... --> / <!-- endif --> markers`);
  return out;
}

/**
 * @param {string} body
 * @param {'claude'|'copilot'} platform
 * @param {{ registry: Map<string,{kind:string,tier:string}>, tier: string, where: string, errors: string[] }} ctx
 */
export function renderBody(body, platform, ctx) {
  const { registry, tier, where, errors } = ctx;
  const text = resolveConditionals(body, platform, where, errors);
  return text.replace(TOKEN, (match, kind, name) => {
    const target = registry.get(name);
    if (!target || target.kind !== kind) {
      errors.push(`${where}: ${match} does not name a known ${kind}`);
      return match;
    }
    if (tier === 'core' && target.tier !== 'core') {
      errors.push(`${where}: core content must not reference the ${target.tier}-tier ${kind} "${name}"`);
    }
    if (platform === 'claude') {
      const qualified = `${pluginName(target.tier)}:${name}`;
      return kind === 'skill' ? `/${qualified}` : qualified;
    }
    return name;
  });
}

export function hasMarkup(text) {
  return /\{\{(agent|skill):|<!-- (if:|endif)/.test(text);
}
