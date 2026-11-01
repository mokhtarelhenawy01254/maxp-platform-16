/**
 * Guard: no Prisma `user: { select: { ... } }` may reference a field that does
 * not exist on the `User` model.
 *
 * Origin: an Oct-31-2026 production 500 — `voiceCallController.js` selected
 * `name: true` on User, which has only firstName/lastName. Prisma rejected the
 * query before hitting the database and the whole endpoint failed.
 *
 * This scan is structural (brace-matched), so nested selects such as
 * `company: { select: { name: true } }` are not false positives.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(BACKEND_ROOT, 'prisma/schema/core.prisma');

function readUserFields() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const match = schema.match(/model User \{([\s\S]*?)\n\}/);
  if (!match) throw new Error('model User not found in core.prisma');

  const fields = new Set();
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 2) fields.add(parts[0]);
  }
  return fields;
}

function extractBlock(src, openBraceIndex) {
  let depth = 0;
  for (let i = openBraceIndex; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(openBraceIndex + 1, i);
    }
  }
  return null;
}

function topLevelKeys(body) {
  const segments = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if ('{[('.includes(ch)) depth += 1;
    else if ('}])'.includes(ch)) depth -= 1;

    if (depth === 0 && ch === ',') {
      segments.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) segments.push(current);

  return segments
    .map((seg) => {
      const m = seg.match(/^\s*(\w+)\s*:/);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

function listSourceFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === '__tests__') continue;
      listSourceFiles(full, acc);
    } else if (/\.(js|ts)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Prisma User select guard', () => {
  it('every user: { select } block only references real User fields', () => {
    const userFields = readUserFields();
    expect(userFields.size).toBeGreaterThan(10);
    expect(userFields.has('firstName')).toBe(true);
    expect(userFields.has('name')).toBe(false); // the whole point

    const violations = [];
    for (const file of listSourceFiles(BACKEND_ROOT)) {
      let src;
      try {
        src = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }

      const userRe = /\buser\s*:\s*\{/g;
      let m;
      while ((m = userRe.exec(src)) !== null) {
        const userBody = extractBlock(src, m.index + m[0].length - 1);
        if (!userBody) continue;

        const selectMatch = userBody.match(/\bselect\s*:\s*\{/);
        if (!selectMatch) continue;

        const selectBody = extractBlock(
          userBody,
          selectMatch.index + selectMatch[0].length - 1
        );
        if (!selectBody) continue;

        const invalid = topLevelKeys(selectBody).filter((key) => !userFields.has(key));
        if (invalid.length) {
          const line = src.slice(0, m.index).split('\n').length;
          violations.push(
            `${path.relative(BACKEND_ROOT, file)}:${line} -> ${invalid.join(', ')}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
