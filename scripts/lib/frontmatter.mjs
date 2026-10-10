import YAML from 'yaml';

const FRONTMATTER = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/;

export function normalize(text) {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** Split a markdown document into { data, body }. data is null when there is no frontmatter. */
export function parseDoc(text, file) {
  const t = normalize(text);
  const m = FRONTMATTER.exec(t);
  if (!m) return { data: null, body: t };
  let data;
  try {
    data = YAML.parse(m[1]);
  } catch (e) {
    throw new Error(`${file}: invalid YAML frontmatter: ${e.message}`);
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${file}: frontmatter must be a YAML mapping`);
  }
  return { data, body: m[2] };
}

/** Join frontmatter, an optional header comment line, and a body into one document. */
export function serializeDoc(data, body, header) {
  if (!data) {
    return (header ? `${header}\n\n` : '') + body;
  }
  const fm = YAML.stringify(data, { lineWidth: 0 });
  const rest = body.replace(/^\n*/, '\n');
  return `---\n${fm}---\n${header ? `${header}\n` : ''}${rest}`;
}
