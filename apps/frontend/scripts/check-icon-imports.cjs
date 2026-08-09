/**
 * Frontend icon-import safety gate (config icon maps)
 *
 * يفحص ملفات src/config (خرائط الأيقونات مثل sidebar.ts) للتأكد أن كل
 * "icon: X" يستخدم معرّفاً مستورداً فعلاً في الملف.
 *
 * هذه الفئة من الأخطاء سبّبت انهيار كامل للـ dashboard (ReferenceError: X is not defined)
 * عندما استُخدمت أيقونة lucide-react في config/sidebar.ts بدون إضافتها للـ import.
 *
 * Usage: node scripts/check-icon-imports.cjs
 * Exit code 1 = تم العثور على مشاكل (يمنع الـ deploy).
 */

const fs = require('node:fs');
const path = require('node:path');

const configRoot = path.resolve(__dirname, '..', 'src', 'config');

// قيمة icon يجب أن تكون معرّفاً بسيطاً متبوعاً بـ , } أو نهاية سطر
// (يستبعد الأنواع: React.ElementType / String(...) / A | B)
const ICON_VALUE_RE = /icon\s*:\s*([A-Z][A-Za-z0-9_]*)\s*(?=[,}\n])/g;

function extractImports(content) {
  const imported = new Set();
  const re = /import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const block = m[0];
    const named = block.match(/\{([^}]*)\}/g) || [];
    for (const group of named) {
      for (const part of group.replace(/[{}]/g, '').split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop().trim();
        if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) imported.add(name);
      }
    }
    const def = block.match(/import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from/);
    if (def) imported.add(def[1]);
  }
  return imported;
}

function isDeclaredElsewhere(content, name) {
  // معرّف مُعرّف داخل الملف (const/let/var/function/class/interface type)
  return new RegExp(`(?:const|let|var|function|class|interface|type)\\s+${name}\\b`).test(content) ||
    new RegExp(`\\b${name}\\s*\\??:\\s`).test(content); // نوع أو destructure alias
}

const files = [];
try {
  fs.readdirSync(configRoot, { withFileTypes: true }).forEach((e) => {
    if (e.isFile() && /\.(ts|tsx|js|jsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      files.push(path.join(configRoot, e.name));
    }
  });
} catch {
  console.error(`❌ [ICON-IMPORTS] Cannot read config dir: ${configRoot}`);
  process.exit(1);
}

const failures = [];

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const imports = extractImports(content);
  let m;
  ICON_VALUE_RE.lastIndex = 0;
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  while ((m = ICON_VALUE_RE.exec(content)) !== null) {
    const name = m[1];
    if (imports.has(name)) continue;
    if (isDeclaredElsewhere(content, name)) continue;
    const line = content.slice(0, m.index).split('\n').length;
    failures.push(`${rel}:${line} — icon '${name}' is NOT imported in this file`);
  }
}

if (failures.length > 0) {
  console.error(`❌ [ICON-IMPORTS] ${failures.length} icon(s) used without import (crashes the dashboard):`);
  for (const f of failures) console.error(`   - ${f}`);
  console.error('Refusing to proceed — add the missing icon to the file import.');
  process.exit(1);
}

console.log(`✅ [ICON-IMPORTS] Scanned ${files.length} config files: all "icon:" references are imported.`);
process.exit(0);
