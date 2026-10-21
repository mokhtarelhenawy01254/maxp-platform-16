/**
 * Full backend relative require & import gate
 * يفحص جميع مسارات require و import النسبية (./ و ../) في جميع ملفات الباكند
 * ويتأكد أن الملف الهدف موجود فعلياً ومطابق لحالة الأحرف (case-sensitive)
 * لمنع تكرار عطل الإنتاج الناتج عن require لموديول غير موجود في الشجرة المنشورة.
 *
 * Usage: node scripts/check_requires.js [--dry-run-server]
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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
  'src', // Legacy unreferenced duplicate of routes/services/controllers
]);

const EXCLUDED_FILES = new Set([
  // Old standalone scratch files in backend root
  'fix_controller.js',
  'fix_luxury_data.js',
  'test4.js',
  'debug_personalization.js',
  'fix_pd_imports.js',
  // Deprecated unmounted routes/controllers/middleware (commented out in server.js)
  'routes/agentServiceBridgeRoutes.js',
  'routes/hr/autoDeductionRoutes.js',
  'controller/hr/autoDeductionController.js',
  'services/autoDeductionService.js',
  'middleware/activityLogger.simple.js',
]);

const JS_EXTENSIONS = ['.js', '.json', '.node', '.mjs', '.cjs'];

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
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs') || entry.name.endsWith('.cjs')) {
      const relative = path.relative(backendRoot, absolute).replace(/\\/g, '/');
      if (EXCLUDED_FILES.has(relative)) continue;
      acc.push(absolute);
    }
  }

  return acc;
}

/**
 * Strips comments from JavaScript source while preserving newlines
 * so that line and column numbers remain 100% accurate.
 */
function stripCommentsPreservingLines(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => {
    return match.replace(/[^\r\n]/g, ' ');
  });
}

/**
 * Checks if a path exists with exact case match on disk (critical for Linux CI/production).
 */
function fileExistsWithCase(resolvedPath) {
  if (!fs.existsSync(resolvedPath)) {
    return false;
  }

  try {
    const dir = path.dirname(resolvedPath);
    const basename = path.basename(resolvedPath);
    const entries = fs.readdirSync(dir);
    return entries.includes(basename);
  } catch {
    return false;
  }
}

/**
 * Resolves a relative module specifier to an existing disk file, matching Node resolution.
 */
function resolveRelativeSpecifier(fromFile, specifier) {
  // Allow generated prisma client paths if prisma has not generated them in this runner yet
  if (specifier.includes('prisma/generated') || specifier.includes('generated/')) {
    return { ok: true, resolved: 'prisma_generated_skipped' };
  }

  const fromDir = path.dirname(fromFile);
  const targetBase = path.resolve(fromDir, specifier);

  // 1. Exact match (e.g. require('./foo.json') or require('./foo.js'))
  if (fileExistsWithCase(targetBase)) {
    const stat = fs.statSync(targetBase);
    if (stat.isFile()) return { ok: true, resolved: targetBase };
  }

  // 2. Target + extension
  for (const ext of JS_EXTENSIONS) {
    const candidate = targetBase + ext;
    if (fileExistsWithCase(candidate)) {
      return { ok: true, resolved: candidate };
    }
  }

  // 3. Directory with index file
  if (fs.existsSync(targetBase) && fs.statSync(targetBase).isDirectory()) {
    for (const ext of JS_EXTENSIONS) {
      const candidate = path.join(targetBase, `index${ext}`);
      if (fileExistsWithCase(candidate)) {
        return { ok: true, resolved: candidate };
      }
    }
  }

  return { ok: false, attempted: targetBase };
}

function getLineNumber(content, index) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function scanFile(absoluteFile) {
  const relativeFile = path.relative(backendRoot, absoluteFile).replace(/\\/g, '/');
  let rawContent;
  try {
    rawContent = fs.readFileSync(absoluteFile, 'utf8');
  } catch (err) {
    return [{ file: relativeFile, line: 1, col: 1, specifier: '', error: `Cannot read file: ${err.message}` }];
  }

  const cleanedContent = stripCommentsPreservingLines(rawContent);
  const failures = [];
  // Match require('./...') or require('../...') and dynamic import('./...') or import('../...')
  const requireRegex = /\b(?:require|import)\s*\(\s*(['"`])(\.[^'"`\r\n]+)\1\s*\)/g;
  let match;

  while ((match = requireRegex.exec(cleanedContent)) !== null) {
    const specifier = match[2].trim();
    if (!specifier.startsWith('.')) continue;

    const res = resolveRelativeSpecifier(absoluteFile, specifier);
    if (!res.ok) {
      const { line, col } = getLineNumber(rawContent, match.index);
      failures.push({
        file: relativeFile,
        line,
        col,
        specifier,
        attempted: path.relative(backendRoot, res.attempted).replace(/\\/g, '/'),
      });
    }
  }

  return failures;
}

function runRelativeRequireScan() {
  const files = collectFiles(backendRoot);
  console.log(`🔎 Scanning ${files.length} backend runtime JS file(s) for broken relative require/import paths...`);

  const allFailures = [];

  for (const file of files) {
    const fileFailures = scanFile(file);
    if (fileFailures.length > 0) {
      allFailures.push(...fileFailures);
    }
  }

  if (allFailures.length > 0) {
    console.error('\n🚨 ═══════════════════════════════════════════════════════════════════');
    console.error(`🚨 BROKEN RELATIVE REQUIRES DETECTED: ${allFailures.length} failure(s) found!`);
    console.error('🚨 This commit would cause a runtime crash on boot (e.g. MODULE_NOT_FOUND).');
    console.error('🚨 ═══════════════════════════════════════════════════════════════════\n');

    for (const f of allFailures) {
      console.error(`❌ ${f.file}:${f.line}:${f.col}`);
      console.error(`   require('${f.specifier}')`);
      console.error(`   -> Missing target file: ${f.attempted} [.js, .json, /index.js]`);
      console.error('');
    }

    console.error('🛑 Build rejected. Please commit or restore the missing file(s) before deploying.');
    process.exit(1);
  }

  console.log(`✅ All ${files.length} backend runtime JS file(s) passed relative require checks (0 broken requires).`);
}

function runServerDryRun() {
  console.log('🩺 Performing dry-run require test of server.js...');
  const serverPath = path.resolve(backendRoot, 'server.js');
  const checkCode = `
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.PORT = process.env.PORT || '3099';
    try {
      require(${JSON.stringify(serverPath)});
      console.log('✅ server.js successfully loaded without throwing require/syntax errors.');
      process.exit(0);
    } catch (err) {
      console.error(err.stack || err.message);
      process.exit(1);
    }
  `;

  const child = spawnSync(process.execPath, ['-e', checkCode], {
    cwd: backendRoot,
    encoding: 'utf8',
    timeout: 30000,
  });

  if (child.status !== 0) {
    console.error('\n🚨 FATAL: server.js failed to load during dry-run require test!');
    if (child.stdout) console.log(child.stdout);
    if (child.stderr) console.error(child.stderr);
    process.exit(1);
  }

  if (child.stdout) console.log(child.stdout.trim());
}

// Main execution
const shouldDryRunServer = process.argv.includes('--dry-run-server');

runRelativeRequireScan();

if (shouldDryRunServer) {
  runServerDryRun();
}
