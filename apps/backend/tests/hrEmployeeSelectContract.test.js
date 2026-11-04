/**
 * Contract test: every top-level `select: { ... }` used on `prisma.employee.*` must
 * name a real field of the Employee model. Prisma throws at runtime
 * ("Unknown field X for select statement") — which is how
 * /api/hr/attendance/missing-punches shipped a 500 in production (the select asked
 * for `employeeId`; the column is `employeeNumber`).
 *
 * Dependency-free on purpose: `node tests/hrEmployeeSelectContract.test.js` runs it
 * without node_modules, and jest picks it up as well.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIR = path.join(ROOT, 'prisma', 'schema');

function employeeFields() {
  const files = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.prisma'));
  for (const f of files) {
    const src = fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8');
    const m = src.match(/model\s+Employee\s*\{([\s\S]*?)\n\}/);
    if (!m) continue;
    return new Set(
      m[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@'))
        .map((line) => line.split(/\s+/)[0])
        .filter(Boolean)
    );
  }
  throw new Error('Employee model not found in prisma/schema');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Index of the brace that closes the one at `start`. */
function matchingBrace(src, start) {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Top-level `key: true` entries of a select block; nested relation selects ignored. */
function topLevelTrueKeys(block) {
  const keys = [];
  let depth = 0;
  for (let i = 0; i < block.length; i += 1) {
    const ch = block[i];
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth -= 1; continue; }
    if (depth !== 1) continue;
    const m = /^([A-Za-z_$][\w$]*)\s*:\s*true\b/.exec(block.slice(i));
    if (m) {
      keys.push(m[1]);
      i += m[0].length - 1;
    }
  }
  return keys;
}

/** Index of a `select:` key that sits at depth 1 inside the call arguments. */
function topLevelSelectIndex(args) {
  let depth = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth -= 1; continue; }
    if (depth !== 1) continue;
    if (/^select\s*:\s*\{/.test(args.slice(i))) return i;
  }
  return -1;
}

function employeeSelectBlocks(src) {
  const blocks = [];
  const call = 'prisma.employee.';
  let idx = 0;
  while ((idx = src.indexOf(call, idx)) !== -1) {
    const open = src.indexOf('{', idx);
    if (open === -1) break;
    const close = matchingBrace(src, open);
    if (close === -1) break;
    const args = src.slice(open, close + 1);
    // Only a `select:` at depth 1 belongs to the employee query itself; a `select:`
    // nested inside `include: { relation: { select: ... } }` does not.
    const selIdx = topLevelSelectIndex(args);
    if (selIdx !== -1) {
      const s0 = args.indexOf('{', selIdx);
      const s1 = matchingBrace(args, s0);
      if (s0 !== -1 && s1 !== -1) blocks.push(args.slice(s0, s1 + 1));
    }
    idx = close + 1;
  }
  return blocks;
}

const fields = employeeFields();
const files = [
  ...walk(path.join(ROOT, 'services')),
  ...walk(path.join(ROOT, 'controller')),
  ...walk(path.join(ROOT, 'routes')),
];
const violations = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const block of employeeSelectBlocks(src)) {
    for (const key of topLevelTrueKeys(block)) {
      if (!fields.has(key)) {
        violations.push(
          `${path.relative(ROOT, file)}: employee select asks for "${key}" (not a field of Employee)`
        );
      }
    }
  }
}

if (typeof test === 'function') {
  test('employee selects only name real Employee fields', () => {
    expect(violations).toEqual([]);
  });
} else {
  if (violations.length) {
    console.error('FAIL');
    violations.forEach((v) => console.error(' - ' + v));
    process.exit(1);
  }
  console.log('OK — employee selects match the Employee model');
}
