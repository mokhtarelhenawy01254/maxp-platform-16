/**
 * Full backend syntax gate
 * يفحص سينتاكس كل ملفات الجافاسكريبت في الباكند (باستثناء المجلدات المولّدة/الثقيلة)
 * لمنع وصول أي كوميت فيه Syntax Error إلى الإنتاج.
 *
 * Usage: node scripts/check_syntax.js
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'generated',
  'legacy_mysql',
  'uploads',
  'coverage',
  'dist',
  'build',
  '.cache',
  '.next',
  'scripts',
  'scratch',
  'tests',
  'examples',
  'plans',
  'docs',
  'data',
]);

// ملفات جذرية معروفة أنها سكريبتات صيانة قديمة اتشوّش محتواها بسكربت ترجمة قديم
// (مش جزء من التشغيل وبتتفحص يدوي لو اتحتاجت)
const EXCLUDED_FILES = new Set([
  'fix_controller.js',
  'fix_luxury_data.js',
]);

const run = (command, args, options = {}) =>
  spawn(command, args, {
    cwd: backendRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  });

function collectFiles(dir, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolute, acc);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) {
      const relative = path.relative(backendRoot, absolute);
      if (EXCLUDED_FILES.has(relative.replace(/\\/g, '/'))) continue;
      acc.push(absolute);
    }
  }

  return acc;
}

const files = collectFiles(backendRoot);
if (files.length === 0) {
  console.error('No JavaScript files found to check.');
  process.exit(1);
}

console.log(`Checking syntax for ${files.length} backend JS file(s)...`);

const failures = [];

// 🚀 Parallel syntax check — spawning `node --check` per file is the hot path
// (was ~25s sequential on the runner + again on the server). A bounded pool
// keeps it fast without exhausting CPU. Order of failures is not guaranteed.
const POOL_SIZE = Math.min(16, Math.max(4, Math.floor(files.length / 8)));

function checkFile(absoluteFile) {
  return new Promise((resolve) => {
    const relativeFile = path.relative(backendRoot, absoluteFile);
    const child = run(process.execPath, ['--check', absoluteFile]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      failures.push(relativeFile);
      console.error(`FAIL ${relativeFile}`);
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      resolve();
    });
  });
}

(async () => {
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const current = cursor++;
      await checkFile(files[current]);
    }
  }

  await Promise.all(Array.from({ length: POOL_SIZE }, worker));

  if (failures.length > 0) {
    console.error(
      `Syntax check FAILED for ${failures.length} file(s) out of ${files.length}. ` +
        `Refusing to proceed — a syntax error in production would crash the backend.`
    );
    for (const file of failures) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  console.log(`All ${files.length} backend files passed syntax check.`);
})();
