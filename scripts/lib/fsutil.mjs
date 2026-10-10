import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const toPosix = (p) => p.split(path.sep).join('/');

export function exists(p) {
  return fs.existsSync(p);
}

export function isBinary(buf) {
  return buf.includes(0);
}

/** Recursively list files under dir as sorted posix paths relative to dir. */
export function walk(dir) {
  const out = [];
  const visit = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) out.push(toPosix(path.relative(dir, full)));
    }
  };
  if (fs.existsSync(dir)) visit(dir);
  return out.sort();
}

export function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

/** Hash of file content, ignoring CRLF vs LF for text files. */
export function hashContent(buf) {
  const data = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8');
  const normalized = isBinary(data) ? data : Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function writeFileEnsured(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** Remove empty parent directories up to (not including) stopAt. */
export function pruneEmptyDirs(start, stopAt) {
  let dir = start;
  const stop = path.resolve(stopAt);
  while (path.resolve(dir) !== stop && path.resolve(dir).startsWith(stop)) {
    if (!fs.existsSync(dir) || fs.readdirSync(dir).length > 0) return;
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}
