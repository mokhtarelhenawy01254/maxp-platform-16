#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'src', 'config');

const errors = [];
let filesChecked = 0;
let iconsChecked = 0;

function collectTsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.') && !entry.name.endsWith('.spec.')) out.push(full);
  }
  return out;
}

function extractAllNamedImports(source) {
  const imported = new Set();
  const re = /import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    m[1].split(',').forEach(part => {
      const name = part.trim().replace(/^[\w]+\s+as\s+/, '').trim();
      if (name) imported.add(name);
    });
  }
  return imported;
}

function extractLocalConsts(source) {
  const locals = new Set();
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  let m;
  while ((m = re.exec(source)) !== null) locals.add(m[1]);
  return locals;
}

function extractIconReferences(source) {
  const refs = new Set();
  const re = /\bicon\s*:\s*([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const after = source.charAt(m.index + m[0].length);
    if (after === '.') continue;
    refs.add(m[1]);
  }
  return refs;
}

function checkFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const known = new Set([...extractAllNamedImports(source), ...extractLocalConsts(source)]);
  const referenced = extractIconReferences(source);
  filesChecked++;
  for (const icon of referenced) {
    iconsChecked++;
    if (!known.has(icon)) {
      errors.push(`${path.relative(ROOT, file)}: icon "${icon}" is referenced but not imported or defined anywhere in the file`);
    }
  }
}

for (const file of collectTsFiles(CONFIG_DIR)) checkFile(file);

if (errors.length > 0) {
  console.error(`[check-icon-imports] ${errors.length} invalid icon reference(s):`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`[check-icon-imports] OK — ${filesChecked} file(s), ${iconsChecked} icon reference(s) all valid.`);
