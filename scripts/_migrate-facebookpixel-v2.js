const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "advertising", "FacebookPixelSettings.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "settings", "facebookPixel.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "settings", "facebookPixel.json");
const NS = "facebookPixel";

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

// Clean Arabic text → English-readable key
const KEY_WORDS = {
  "تم": "success", "فشل": "failed", "خطأ": "error",
  "يرجى": "required", "جاري": "loading", "حدث": "error",
  "حفظ": "save", "تحديث": "update", "حذف": "delete",
  "إنشاء": "create", "تفعيل": "activate", "ربط": "connect",
  "تحميل": "load", "جلب": "fetch", "إرسال": "send",
  "إدخال": "enter", "الإعدادات": "settings", "اختبار": "test",
  "فحص": "check", "تعيين": "assign", "اسم": "name",
  "حساب": "account", "صالحة": "valid", "صحيح": "correct",
  "ناجح": "success", "اختيار": "select", "إيقاف": "stop",
  "واضح": "clear", "سبب": "reason", "قيمة": "value",
  "عمولة": "commission", "ضوابط": "controls", "مستند": "document",
  "اعتماد": "approval", "رفض": "reject", "قائمة": "list",
  "بيانات": "data", "حالة": "status", "نسبة": "rate",
  "تتجاوز": "exceed", "توثيق": "verify", "رقم": "number",
};

function generateKey(text) {
  const clean = text.replace(/[✅❌⚠️❗✔️🔴🟢🔵🟡\u{1F600}-\u{1F6FF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[؟،!\.\(\)\[\]\{\}:]/g, " ").trim();
  const words = clean.split(/\s+/).slice(0, 4);
  const engWords = words.map(w => KEY_WORDS[w] || null).filter(Boolean);
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 4);
  const base = engWords.length >= 2 ? engWords.join("_") : "msg";
  return (base + "_" + hash).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 45);
}

let content = fs.readFileSync(FILE, "utf-8");

let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// Build replacements list
const replacements = [];
const keyIndex = {};

// === PATTERN 1: Fixed strings toast.method("arabic") ===
const fixedRe = /(toast\.(success|error|warning|info|loading)\s*\(\s*)"([^"]*[\u0600-\u06FF][^"]*?)"(\s*\))/g;
let m;
while ((m = fixedRe.exec(content)) !== null) {
  const prefix = m[1];  // toast.success(
  const method = m[2];  // success
  const text = m[3];    // Arabic text
  const suffix = m[4];  // )
  if (text.includes("${")) continue;
  
  let key = generateKey(text);
  if (keyIndex[key] !== undefined) key = key + "_" + (++keyIndex[key]);
  else keyIndex[key] = 0;
  
  enKeys[key] = text;
  arKeys[key] = text;
  replacements.push({
    old: m[0],
    new: 'tToast.' + method + '("' + NS + '.' + key + '")'
  });
}

// === PATTERN 2: Template literals toast.method(`arabic ${var}`)  ===
const templRe = /(toast\.(success|error|warning|info)\s*\(\s*)`([^`]*[\u0600-\u06FF][^`]*?)`(\s*\))/g;
while ((m = templRe.exec(content)) !== null) {
  const prefix = m[1];
  const method = m[2];
  const text = m[3];
  const suffix = m[4];
  
  const vars = [...text.matchAll(/\$\{(\w+)\}/g)].map(m => m[1]);
  const uniqueVars = [...new Set(vars)];
  
  if (uniqueVars.length === 0 || uniqueVars.length > 2) {
    console.log("  SKIP (vars=" + uniqueVars.length + "): " + text.slice(0, 50) + "...");
    continue;
  }

  let tplText = text;
  for (const v of uniqueVars) {
    tplText = tplText.replace('${' + v + '}', '{{' + v + '}}');
  }
  
  let key = generateKey(text);
  if (keyIndex[key] !== undefined) key = key + "_" + (++keyIndex[key]);
  else keyIndex[key] = 0;
  
  enKeys[key] = tplText;
  arKeys[key] = tplText;
  
  const varPairs = uniqueVars.map(v => v).join(', ');
  replacements.push({
    old: m[0],
    new: 'toast.' + method + '(i18n.t("' + NS + '.' + key + '", { ' + varPairs + ' }))'
  });
}

// === PATTERN 3: getErrorMessage with Arabic default ===
const errRe = /(getErrorMessage\([^,]+,\s*)"([^"]*[\u0600-\u06FF][^"]*?)"/g;
while ((m = errRe.exec(content)) !== null) {
  const prefix = m[1];
  const text = m[2];
  
  let key = generateKey(text);
  if (keyIndex[key] !== undefined) key = key + "_" + (++keyIndex[key]);
  else keyIndex[key] = 0;
  
  enKeys[key] = text;
  arKeys[key] = text;
  replacements.push({
    old: m[0],
    new: prefix + 'i18n.t("' + NS + '.' + key + '")'
  });
}

// Deduplicate + sort
const unique = [];
const seen = new Set();
for (const r of replacements) {
  if (!seen.has(r.old)) {
    seen.add(r.old);
    unique.push(r);
  }
}

console.log("Found " + unique.length + " unique replacements\n");

// Show summary
let fixedCount = 0, templCount = 0, errCount = 0;
for (const r of unique) {
  if (r.new.startsWith('tToast.')) { fixedCount++; console.log("  [fixed]      " + r.new.slice(0, 60)); }
  else if (r.new.startsWith('toast.')) { templCount++; console.log("  [template]   " + r.new.slice(0, 60)); }
  else { errCount++; console.log("  [errDefault] " + r.new.slice(0, 60)); }
}
console.log("\nFixed: " + fixedCount + " | Template: " + templCount + " | Error defaults: " + errCount);

// Apply replacements
let newContent = content;
for (const r of unique) {
  if (!newContent.includes(r.old)) {
    console.log("  WARN: pattern not found, trying alt quotes...");
    if (r.old.includes('"') && newContent.includes(r.old.replace(/"/g, "'"))) {
      r.old = r.old.replace(/"/g, "'");
      r.new = r.new.replace(/"/g, "'");
    } else {
      console.log("  SKIP: " + r.old.slice(0, 40) + "...");
      continue;
    }
  }
  newContent = newContent.split(r.old).join(r.new);
}

// Add imports
if (!newContent.includes("i18n-toast")) {
  newContent = newContent.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { tToast } from "../../utils/i18n-toast";'
  );
}
if (!newContent.includes('import i18n from') && !newContent.includes("import i18n from")) {
  newContent = newContent.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport i18n from "../../i18n";'
  );
}

// Verify no double-parens
const doubleParenCheck = newContent.match(/tToast\.\w+\("[^"]+"\)\)/g);
if (doubleParenCheck) {
  console.log("\nERROR: Found double parens! Fixing...");
  for (const dp of doubleParenCheck) {
    console.log("  " + dp);
  }
}

// Save
fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, newContent, "utf-8");

console.log("\nSection keys: " + Object.keys(enKeys).length);
console.log("File written!");