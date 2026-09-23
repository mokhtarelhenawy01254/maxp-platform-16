#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 🛡️ FRONTEND UNDECLARED COMPONENTS & ICONS GUARD
 *
 * Scans all React TSX/JSX/TS/JS source files in `src/` using Babel AST.
 * Verifies that every JSX element tag and referenced icon component
 * is either explicitly imported, declared locally, or a known global.
 *
 * Prevents runtime `ReferenceError: <Component> is not defined` from reaching production.
 */

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');

const GLOBAL_BUILTINS = new Set([
  'React', 'Fragment', 'Suspense', 'StrictMode',
  'Element', 'HTMLElement', 'HTMLDivElement', 'HTMLInputElement', 'HTMLButtonElement',
  'Image', 'Audio', 'Option', 'Map', 'Set', 'Date', 'Promise', 'Error',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Math', 'JSON',
  'Window', 'Document', 'Blob', 'File', 'FormData', 'URL', 'URLSearchParams',
  'Intl', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
  'TouchEvent', 'MouseEvent', 'KeyboardEvent', 'Event', 'CustomEvent',
  'WebSocket', 'Worker', 'Notification', 'ClipboardItem'
]);

function collectFiles(dir, exts = ['.tsx', '.jsx'], out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'backup-pages') {
        continue;
      }
      collectFiles(full, exts, out);
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      if (!entry.name.endsWith('.d.ts') && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.spec.tsx')) {
        out.push(full);
      }
    }
  }
  return out;
}

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'comments' || key === 'loc' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) walk(c, visitor);
    } else if (child && typeof child === 'object') {
      walk(child, visitor);
    }
  }
}

const files = collectFiles(SRC_DIR);
const errors = [];
let filesChecked = 0;
let tagsChecked = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = babelParser.parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncDoExpressions',
        'doExpressions'
      ]
    });
  } catch (err) {
    // If a file has syntax errors, report it
    errors.push({
      file: path.relative(ROOT, file),
      name: 'SyntaxError',
      line: err.loc ? err.loc.line : 0,
      col: err.loc ? err.loc.column : 0,
      message: `Syntax error: ${err.message}`
    });
    continue;
  }

  filesChecked++;
  const declared = new Set([...GLOBAL_BUILTINS]);
  const jsxUsages = [];

  // Pass 1: Collect all declared identifiers in file
  walk(ast, (node) => {
    // Imports
    if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') {
      if (node.local && node.local.name) declared.add(node.local.name);
    }
    // const/let/var declarations
    if (node.type === 'VariableDeclarator' && node.id) {
      if (node.id.type === 'Identifier') declared.add(node.id.name);
      else if (node.id.type === 'ObjectPattern') {
        walk(node.id, (child) => {
          if ((child.type === 'ObjectProperty' || child.type === 'Property') && child.value) {
            if (child.value.type === 'Identifier') declared.add(child.value.name);
            else if (child.value.type === 'AssignmentPattern' && child.value.left && child.value.left.type === 'Identifier') {
              declared.add(child.value.left.name);
            }
          } else if (child.type === 'RestElement' && child.argument && child.argument.type === 'Identifier') {
            declared.add(child.argument.name);
          }
        });
      } else if (node.id.type === 'ArrayPattern') {
        walk(node.id, (child) => {
          if (child.type === 'Identifier') declared.add(child.name);
        });
      }
    }
    // Functions, Classes, Types, Interfaces, Enums
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' ||
         node.type === 'TSTypeAliasDeclaration' || node.type === 'TSInterfaceDeclaration' ||
         node.type === 'TSEnumDeclaration') && node.id) {
      declared.add(node.id.name);
    }
    // Function parameters
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      if (node.params) {
        for (const p of node.params) {
          if (p.type === 'Identifier') declared.add(p.name);
          else if (p.type === 'ObjectPattern' || p.type === 'ArrayPattern') {
            walk(p, (child) => {
              if (child.type === 'Identifier') declared.add(child.name);
            });
          } else if (p.type === 'AssignmentPattern' && p.left) {
            if (p.left.type === 'Identifier') declared.add(p.left.name);
          }
        }
      }
    }
    // Object properties with icon: SomeIcon or Icon: SomeIcon
    if (node.type === 'ObjectProperty' && node.key && (node.key.name === 'icon' || node.key.name === 'Icon')) {
      if (node.value && node.value.type === 'Identifier' && /^[A-Z]/.test(node.value.name)) {
        jsxUsages.push({
          name: node.value.name,
          line: node.loc ? node.loc.start.line : 0,
          col: node.loc ? node.loc.start.column : 0
        });
      }
    }
    // JSXOpeningElement
    if (node.type === 'JSXOpeningElement' && node.name) {
      if (node.name.type === 'JSXIdentifier') {
        const name = node.name.name;
        // React component tags start with Uppercase letter
        if (/^[A-Z]/.test(name)) {
          jsxUsages.push({
            name,
            line: node.loc ? node.loc.start.line : 0,
            col: node.loc ? node.loc.start.column : 0
          });
        }
      }
    }
  });

  // Pass 2: Verify all JSX usages
  for (const usage of jsxUsages) {
    tagsChecked++;
    if (!declared.has(usage.name)) {
      errors.push({
        file: path.relative(ROOT, file),
        name: usage.name,
        line: usage.line,
        col: usage.col,
        message: `JSX element <${usage.name} /> is referenced but not imported or declared in this file`
      });
    }
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [check-undeclared-components] Found ${errors.length} undeclared component/icon reference(s):`);
  for (const err of errors) {
    console.error(`  - ${err.file}:${err.line}:${err.col} -> ${err.message}`);
  }
  console.error(`\n🚨 Build blocked: Fix the missing imports above to prevent runtime crashes.\n`);
  process.exit(1);
}

console.log(`✅ [check-undeclared-components] OK — ${filesChecked} file(s), ${tagsChecked} JSX component tag(s) all valid.`);
process.exit(0);
