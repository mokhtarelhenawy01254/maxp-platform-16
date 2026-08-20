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

function generateKey(text) {
  // Simple semantic key from the text
  const clean = text.replace(/[؟،!\.]/g, "").trim();
  const hash = crypto.createHash("md5").update(clean).digest("hex").slice(0, 4);
  const words = clean.split(/\s+/).slice(0, 3);
  // Map Arabic words to English concepts
  const map = {
    "تم": "success", "فشل": "failed", "حدث": "error",
    "يرجى": "please", "جاري": "loading", "خطأ": "error",
    "حفظ": "save", "تحديث": "update", "حذف": "delete",
    "إنشاء": "create", "تفعيل": "activate", "إلغاء": "cancel",
    "تحميل": "load", "جلب": "fetch", "إرسال": "send",
    "إدخال": "enter", "إعدادات": "settings",
  };
  const engWords = words.map(w => map[w] || w.toLowerCase().replace(/[^a-z]/g, ""));
  return (engWords.join("_") + "_" + hash).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
}

let content = fs.readFileSync(FILE, "utf-8");

// Load existing
let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const replacements = [];

// === PATTERN 1: Fixed strings ===
const fixedRe = /toast\.(success|error|warning|info)\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*?)"/g;
let m;
while ((m = fixedRe.exec(content)) !== null) {
  const method = m[1];
  const text = m[2];
  if (text.includes("${")) continue;
  const key = generateKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  replacements.push({ 
    type: "fixed", method, text, key, 
    old: m[0], 
    new: 'tToast.' + method + '("' + NS + '.' + key + '")' 
  });
}

// === PATTERN 2: Template literals with variables ===
const templRe = /toast\.(success|error|warning|info)\s*\(\s*`([^`]*[\u0600-\u06FF][^`]*?)`/g;
while ((m = templRe.exec(content)) !== null) {
  const method = m[1];
  const text = m[2];
  // Extract variables from ${var}
  const vars = [];
  const varRe = /\$\{(\w+)\}/g;
  let vm;
  while ((vm = varRe.exec(text)) !== null) {
    vars.push(vm[1]);
  }
  if (vars.length === 0 || vars.length > 2) {
    console.log("  SKIP (too many vars): " + text.slice(0, 60));
    continue;
  }

  // Create translation template with {{var}} 
  let translationTemplate = text;
  for (const v of vars) {
    translationTemplate = translationTemplate.replace('${' + v + '}', '{{' + v + '}}');
  }
  
  const key = generateKey(text);
  enKeys[key] = translationTemplate;
  arKeys[key] = translationTemplate;
  
  // Build the replacement
  const varPairs = vars.map(v => v + ': ' + v).join(', ');
  const newCall = 'i18n.t("' + NS + '.' + key + '", { ' + varPairs + ' })';
  replacements.push({ 
    type: "template", method, text: text.slice(0, 40), key, 
    old: m[0], 
    new: 'toast.' + method + '(' + newCall + ')' 
  });
}

// === PATTERN 3: getErrorMessage defaults ===
const errRe = /getErrorMessage\([^,]+,\s*"([^"]*[\u0600-\u06FF][^"]*?)"/g;
while ((m = errRe.exec(content)) !== null) {
  const text = m[1];
  const key = generateKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  replacements.push({ 
    type: "errorDefault", text, key, 
    old: m[0], 
    new: m[0].replace('"' + text + '"', 'i18n.t("' + NS + '.' + key + '")') 
  });
}

// Deduplicate
const seen = new Set();
const unique = [];
for (const r of replacements) {
  const sig = r.old + r.new;
  if (!seen.has(sig)) {
    seen.add(sig);
    unique.push(r);
  }
}

// Sort by position in file (replace from bottom to top to preserve positions)
unique.sort((a, b) => content.indexOf(a.old) - content.indexOf(b.old));

console.log("=== Migration Plan ===");
console.log("Fixed strings: " + unique.filter(r => r.type === "fixed").length);
console.log("Template literals: " + unique.filter(r => r.type === "template").length);
console.log("getErrorMessage defaults: " + unique.filter(r => r.type === "errorDefault").length);
console.log("Total replacements: " + unique.length + "\n");

// Show plan
for (const r of unique) {
  console.log(`  [${r.type}] "${r.text ? r.text.slice(0, 50) : ''}" => ${r.key}`);
}

// Apply (bottom-up to preserve positions)
let newContent = content;
for (const r of unique) {
  if (newContent.includes(r.old)) {
    newContent = newContent.split(r.old).join(r.new);
  } else if (r.type === "fixed") {
    // Try with slight variations
    const alt1 = r.old.replace(/"/g, "'");
    const alt2 = r.old.replace(/'/g, '"');
    if (newContent.includes(alt1)) newContent = newContent.split(alt1).join(r.new.replace(/"/g, "'"));
    else if (newContent.includes(alt2)) newContent = newContent.split(alt2).join(r.new);
    else console.log("  WARN: Could not find: " + r.old.slice(0, 40));
  }
}

// Add imports
if (!newContent.includes("i18n-toast")) {
  newContent = newContent.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { tToast } from "../../utils/i18n-toast";'
  );
}
if (!newContent.includes('import i18n from')) {
  newContent = newContent.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport i18n from "../../i18n";'
  );
}

// Save
fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, newContent, "utf-8");

console.log("\nSection keys: " + Object.keys(enKeys).length);
console.log("File updated: FacebookPixelSettings.tsx");
console.log("Done!");
