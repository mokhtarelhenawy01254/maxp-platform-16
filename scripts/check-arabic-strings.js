#!/usr/bin/env node
/**
 * check-arabic-strings.js
 *
 * Scans source files for hardcoded Arabic strings that should use i18n or LLM generation.
 * By default scans only the backend. Use --all to include frontend.
 *
 * Usage:
 *   node scripts/check-arabic-strings.js          # backend only
 *   node scripts/check-arabic-strings.js --all    # backend + frontend
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const scanAll = process.argv.includes('--all');
const scanStaged = process.argv.includes('--staged');

// Parse files passed via --staged or command line arguments
const filesToScan = [];
if (scanStaged) {
  process.argv.slice(2).forEach(arg => {
    if (!arg.startsWith('--') && !arg.endsWith('check-arabic-strings.js')) {
      const fullPath = path.isAbsolute(arg) ? arg : path.resolve(ROOT, arg);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        filesToScan.push(fullPath);
      }
    }
  });
}

const scanAgentOnly = process.argv.includes('--agent-only');

// Directories to scan
const SCAN_DIRS = [];
if (scanAgentOnly) {
  SCAN_DIRS.push(path.join(ROOT, 'backend', 'services', 'aiAgent'));
} else {
  SCAN_DIRS.push(path.join(ROOT, 'backend'));
}

if (scanAll) {
  SCAN_DIRS.push(path.join(ROOT, 'frontend', 'src', 'utils'));
  SCAN_DIRS.push(path.join(ROOT, 'frontend', 'src', 'services'));
}

// Patterns to skip (relative to ROOT)
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /dist/,
  /build/,
  /locales/,           // translation files are expected to have Arabic
  /i18n\.js$/,         // i18n config files
  /i18n[/\\]index\.ts$/,
  /\.test\./,
  /\.spec\./,
  /\.min\./,
  /seed/i,             // seed data files
  /migration/i,        // database migrations
  /\.uat\./,           // UAT test scripts
  /uat[/\\]/,          // UAT directories
  /platformSubscriptionController\.js$/,
  /superAdminSettingsController\.js$/,
  /StoreSettings\.tsx$/,
  /PlatformPlans\.tsx$/,
  /SubscriptionCenter\.tsx$/,
  /SuperAdminPaymentSettings\.tsx$/,
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx'];

// Arabic Unicode range regex (Arabic + Arabic Supplement + Arabic Extended)
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

// Known safe patterns (comments, prompts, etc.)
const SAFE_LINE_PATTERNS = [
  /^\s*\/\//,            // single-line comments
  /^\s*\*/,              // block comment lines
  /^\s*\/\*/,            // block comment start
  /console\.(log|debug|info|warn|error)/, // logging
  /\.prompt\s*[=(]/,     // LLM prompt construction
  /role:\s*['"]system['"]/, // system prompt role
  /role:\s*['"]user['"]/,   // user prompt role
  /content:\s*[`'"]/,    // prompt content strings
  /systemPrompt/,        // system prompt variable
  /\.content\s*=\s*`.*`/,
  /\/\/\s*no-arabic-check/, // inline bypass comment
];

function shouldSkip(filePath) {
  const relative = path.relative(ROOT, filePath);
  return SKIP_PATTERNS.some(p => p.test(relative));
}

let totalViolations = 0;
let filesScanned = 0;
const violatedFiles = [];

function getStagedAddedLines(filePath) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', '--cached', '--unified=0', '--', relative], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  } catch (error) {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map((content, index) => ({ line: index + 1, content }));
  }
  const lines = [];
  let newLine = 0;

  for (const diffLine of diff.split('\n')) {
    const hunk = diffLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    if (diffLine.startsWith('+++') || diffLine.startsWith('---')) continue;

    if (diffLine.startsWith('+')) {
      lines.push({ line: newLine, content: diffLine.slice(1) });
      newLine += 1;
    } else if (!diffLine.startsWith('-')) {
      newLine += 1;
    }
  }

  return lines;
}

function scanFile(filePath, stagedOnly = false) {
  const lines = stagedOnly
    ? getStagedAddedLines(filePath)
    : fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map((content, index) => ({ line: index + 1, content }));
  const violations = [];

  lines.forEach(({ line, content }) => {
    if (SAFE_LINE_PATTERNS.some(p => p.test(content))) return;

    const matches = content.match(ARABIC_REGEX);
    if (matches) {
      violations.push({ line, content: content.trim() });
    }
  });

  if (violations.length > 0) {
    const relative = path.relative(ROOT, filePath);
    console.log(`\n⚠️  ${relative} (${violations.length} violation${violations.length > 1 ? 's' : ''}):`);
    violations.forEach(v => {
      console.log(`   Line ${v.line}: ${v.content}`);
    });
    totalViolations += violations.length;
    violatedFiles.push({ file: relative, count: violations.length });
  }

  filesScanned++;
}

function parseUnifiedDiffAddedLines(diffText) {
  const addedLines = [];
  let newLineNumber = 0;

  diffText.split('\n').forEach(line => {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNumber = Number(hunkMatch[1]);
      return;
    }

    if (line.startsWith('+++') || line.startsWith('---')) {
      return;
    }

    if (line.startsWith('+')) {
      addedLines.push({
        line: newLineNumber,
        content: line.slice(1),
      });
      newLineNumber += 1;
      return;
    }

    if (line.startsWith('-')) {
      return;
    }

    if (newLineNumber > 0) {
      newLineNumber += 1;
    }
  });

  return addedLines;
}

function getGitDiff(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (error) {
    return '';
  }
}

function getAddedLinesForFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const stagedDiff = getGitDiff(['diff', '--cached', '--unified=0', '--', relative]);
  if (stagedDiff.trim()) {
    return parseUnifiedDiffAddedLines(stagedDiff);
  }

  const commitDiff = getGitDiff(['diff', '--unified=0', 'HEAD~1', 'HEAD', '--', relative]);
  if (commitDiff.trim()) {
    return parseUnifiedDiffAddedLines(commitDiff);
  }

  return null;
}

function scanLineEntries(filePath, lineEntries) {
  const violations = [];

  lineEntries.forEach(entry => {
    const line = entry.content;
    if (SAFE_LINE_PATTERNS.some(p => p.test(line))) return;

    const matches = line.match(ARABIC_REGEX);
    if (matches) {
      violations.push({ line: entry.line, content: line.trim() });
    }
  });

  if (violations.length > 0) {
    const relative = path.relative(ROOT, filePath);
    console.log(`\n⚠️  ${relative} (${violations.length} violation${violations.length > 1 ? 's' : ''}):`);
    violations.forEach(v => {
      console.log(`   Line ${v.line}: ${v.content}`);
    });
    totalViolations += violations.length;
    violatedFiles.push({ file: relative, count: violations.length });
  }

  filesScanned++;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldSkip(fullPath)) continue;

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && SCAN_EXTENSIONS.includes(path.extname(entry.name))) {
      scanFile(fullPath);
    }
  }
}

// Main
let scope = '';
if (scanStaged) {
  scope = `staged files only (${filesToScan.length} files)`;
} else if (scanAgentOnly) {
  scope = 'AI Agent service only';
} else if (scanAll) {
  scope = 'backend + frontend utilities';
} else {
  scope = 'backend only';
}
console.log(`🔍 Scanning for hardcoded Arabic strings (${scope})...\n`);

if (scanStaged) {
  filesToScan.forEach(file => {
    if (!shouldSkip(file) && SCAN_EXTENSIONS.includes(path.extname(file))) {
      const addedLines = getAddedLinesForFile(file);
      if (addedLines) {
        scanLineEntries(file, addedLines);
      } else {
        scanFile(file);
      }
    }
  });
} else {
  SCAN_DIRS.forEach(dir => walkDir(dir));
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`📊 Results: ${filesScanned} files scanned, ${totalViolations} violation(s) found.`);

if (violatedFiles.length > 0) {
  console.log('\n📁 Files with violations:');
  violatedFiles.forEach(f => console.log(`   ${f.file}: ${f.count}`));
}

if (totalViolations > 0) {
  console.log('\n💡 Actions needed:');
  console.log('   • Customer chat replies → use generateWithLLMResult()');
  console.log('   • UI labels/statuses → use i18n.t() with translation keys');
  console.log('   • Tool output keys → use English enum keys');
  console.log('\n   See AGENTS.md for detailed guidelines.');
  process.exit(1);
} else {
  console.log('\n✅ No hardcoded Arabic strings found!');
  process.exit(0);
}
