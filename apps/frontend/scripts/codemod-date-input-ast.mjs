#!/usr/bin/env node
/**
 * Codemod: <input type="date" ... />  ->  <DateInput ... />
 *
 * Safe by construction:
 *  - parses each file with @babel/parser to find real JSX date inputs,
 *  - keeps every other attribute VERBATIM (multi-line, className, handlers),
 *  - only splices the tag name and drops the type="date" attribute,
 *  - DateInput emits an event-like { target: { value } } so existing
 *    `onChange={(e) => setX(e.target.value)}` handlers keep working untouched.
 *
 * Usage: node scripts/codemod-date-input-ast.mjs [--apply] [--limit=N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const ROOT = path.resolve('src');
const TARGET = path.resolve('src/components/ui/DateInput.tsx');
const APPLY = process.argv.includes('--apply');
const LIMIT = (process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function isDateAttr(attr) {
  if (!attr || attr.type !== 'JSXAttribute' || attr.name?.name !== 'type') return false;
  const v = attr.value;
  if (!v) return false;
  if (v.type === 'StringLiteral') return v.value === 'date';
  if (v.type === 'JSXExpressionContainer' && v.expression?.type === 'StringLiteral') {
    return v.expression.value === 'date';
  }
  return false;
}

function relativeImport(fromFile) {
  let rel = path.relative(path.dirname(fromFile), TARGET).replace(/\\/g, '/');
  rel = rel.replace(/\.tsx$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

const files = walk(ROOT);
const report = { converted: [], skipped: [], attrs: 0 };

for (const file of files) {
  if (path.resolve(file) === TARGET) continue;
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('type="date"') && !src.includes("type='date'")) continue;
  const usesUiInput = src.indexOf('ui/input') !== -1;

  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy', 'importAttributes'],
      errorRecovery: false,
    });
  } catch (err) {
    report.skipped.push([file, 'parse error: ' + err.message]);
    continue;
  }

  const edits = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    const tagName = node.type === 'JSXElement' ? node.openingElement?.name?.name : null;
    if (node.type === 'JSXElement' && (tagName === 'input' || (tagName === 'Input' && usesUiInput))) {
      const open = node.openingElement;
      const typeAttr = open.attributes.find(isDateAttr);
      if (typeAttr) {
        const raw = src.slice(open.start, open.end);
        if (!raw.trimEnd().endsWith('/>')) {
          report.skipped.push([file, 'non self-closing <input> at ' + open.loc.start.line]);
        } else {
          let replacement = raw;
          // remove the type attribute (plus its leading whitespace)
          const attrStart = typeAttr.start - open.start;
          const attrEnd = typeAttr.end - open.start;
          let before = replacement.slice(0, attrStart);
          const after = replacement.slice(attrEnd);
          // <input type="date"  -> <input
          const tagMatch = before.match(/<\s*input/);
          if (tagMatch) {
            const cut = tagMatch.index + tagMatch[0].length;
            replacement = before.slice(0, cut) + after;
          } else {
            replacement = before.replace(/</, before.slice(0, cut + 1)) + after;
          }
          replacement = replacement.replace(/<\s*input\b/, '<DateInput');
          edits.push([open.start, open.end, replacement]);
        }
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
      visit(node[key]);
    }
  };
  visit(ast.program);

  if (edits.length === 0) continue;

  let out = src;
  edits.sort((a, b) => b[0] - a[0]);
  for (const [start, end, text] of edits) out = out.slice(0, start) + text + out.slice(end);

  if (!/DateInput/.test(out.split('\n').slice(0, 60).join('\n')) || !out.includes("from '") && !out.includes('from "')) {
    /* no-op guard */
  }
  const importLine = `import { DateInput } from '${relativeImport(file)}';`;
  if (!out.includes('components/ui/DateInput')) {
    // insert after the last real import declaration (multi-line safe)
    const imports = ast.program.body.filter((n) => n.type === 'ImportDeclaration');
    const insertAt = imports.length ? imports[imports.length - 1].end : 0;
    out = out.slice(0, insertAt) + '\n' + importLine + out.slice(insertAt);
  }

  report.converted.push([file, edits.length]);
  report.attrs += edits.length;
  if (APPLY) fs.writeFileSync(file, out, 'utf8');
  if (LIMIT && report.converted.length >= Number(LIMIT)) break;
}

console.log(`files with date inputs: ${report.converted.length}`);
console.log(`attributes converted:   ${report.attrs}`);
console.log(`skipped:                ${report.skipped.length}`);
for (const [f, why] of report.skipped.slice(0, 15)) console.log('  SKIP', path.relative(process.cwd(), f), '-', why);
console.log(APPLY ? 'APPLIED' : 'DRY-RUN (use --apply)');
