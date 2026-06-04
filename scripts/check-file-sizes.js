#!/usr/bin/env node
/**
 * check-file-sizes.js
 *
 * Scans directories for files exceeding size limits to prevent monolithic file regression.
 *
 * Usage:
 *   node scripts/check-file-sizes.js --max-kb=80
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Read argument for max file size (default 80KB)
const maxKbArg = process.argv.find(arg => arg.startsWith('--max-kb='));
const MAX_KB = maxKbArg ? parseInt(maxKbArg.split('=')[1], 10) : 80;
const WARN_KB = 50; // Warn when exceeding 50KB

const SCAN_DIR = path.join(ROOT, 'backend', 'services', 'aiAgent');

let exceededCount = 0;
let warnedCount = 0;
let filesScanned = 0;

function checkFile(filePath) {
  const stats = fs.statSync(filePath);
  const sizeBytes = stats.size;
  const sizeKb = sizeBytes / 1024;
  const relativePath = path.relative(ROOT, filePath);

  filesScanned++;

  if (sizeKb > MAX_KB) {
    console.log(`❌ BLOCK: ${relativePath} is ${sizeKb.toFixed(2)} KB (Max allowed is ${MAX_KB} KB)`);
    exceededCount++;
  } else if (sizeKb > WARN_KB) {
    console.log(`⚠️ WARN: ${relativePath} is ${sizeKb.toFixed(2)} KB (Approaching ${MAX_KB} KB limit)`);
    warnedCount++;
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules or common skip patterns if any
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        walk(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      checkFile(fullPath);
    }
  }
}

console.log(`📏 Scanning for file sizes in backend/services/aiAgent/ (Limit: ${MAX_KB} KB)...`);
walk(SCAN_DIR);

console.log(`\n📊 Scan completed: ${filesScanned} files checked.`);

if (exceededCount > 0) {
  console.log(`\n❌ Failed: ${exceededCount} file(s) exceeded the ${MAX_KB} KB limit!`);
  console.log('   Please refactor and split large files into modular components.');
  process.exit(1);
} else {
  if (warnedCount > 0) {
    console.log(`\n⚠️ Warn: ${warnedCount} file(s) are larger than ${WARN_KB} KB but within limits.`);
  } else {
    console.log('\n✅ All file sizes are well within clean limits.');
  }
  process.exit(0);
}
