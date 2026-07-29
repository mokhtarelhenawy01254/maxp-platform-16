const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "super-admin", "SubscriptionCenter.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "super-admin", "subscriptionCenter.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "super-admin", "subscriptionCenter.json");
const NS = "subscriptionCenter";

[path.dirname(EN_SECTION), path.dirname(AR_SECTION)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function makeKey(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 4);
  const m = {
    "تم": "success", "فشل": "failed", "خطأ": "error", "يرجى": "please",
    "حفظ": "save", "تحديث": "update", "حذف": "delete", "إنشاء": "create",
    "تفعيل": "activate", "إلغاء": "cancel", "تحميل": "load", "جلب": "fetch",
    "إضافة": "add", "اشتراك": "subscription", "باقة": "plan", "خطة": "plan",
  };
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  const eng = words.map(w => m[w] || "").filter(Boolean);
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

let content = fs.readFileSync(FILE, "utf-8");
const lines = content.split(/\r?\n/);

// Check imports
console.log("=== File info ===");
for (let i = 0; i < 40; i++) {
  if (/toast|sonner|i18n|useTranslation/i.test(lines[i])) {
    console.log("  " + lines[i].trim());
  }
}

// Count patterns
const sq = (content.match(/toast\.\w+\s*\(\s*'[^']*[\u0600-\u06FF][^']*'/g) || []).length;
const dq = (content.match(/toast\.\w+\s*\(\s*"[^"]*[\u0600-\u06FF][^"]*"/g) || []).length;
console.log("\nPatterns: sq=" + sq + " dq=" + dq);
console.log("Lines: " + lines.length);

// Quick migration
let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const rep = [];

// Handle both quote styles
for (const q of ['"', "'"]) {
  const re = new RegExp(`toast\\.(\\w+)\\s*\\(\\s*${q}([^${q}]*[\\u0600-\\u06FF][^${q}]*?)${q}\\s*\\)`, 'g');
  let m;
  while ((m = re.exec(content)) !== null) {
    const method = m[1], text = m[2];
    if (text.includes("${")) continue;
    const key = makeKey(text);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: m[0], new: `tToast.${method}("${NS}.${key}")` });
  }
}

// Fallback: data.xxx || "arabic"
const fbRe = /(data\.\w+|data\.\w+\s*\|\|\s*data\.\w+)\s*\|\|\s*["']([^"']*[\u0600-\u06FF][^"']*?)["']/g;
let fm;
while ((fm = fbRe.exec(content)) !== null) {
  const prefix = fm[1], text = fm[2];
  const key = makeKey(text);
  enKeys[key] = text; arKeys[key] = text;
  rep.push({ old: fm[0], new: `${prefix} || i18n.t("${NS}.${key}")` });
}

// Deduplicate
const seen = new Set();
const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

console.log("Replacements: " + unique.length);

let nc = content;
for (const r of unique) {
  if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new);
  else console.log("  SKIP: " + r.old.slice(0, 50));
}

if (!nc.includes("i18n-toast")) {
  nc = nc.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport { tToast } from "../../utils/i18n-toast";');
}
if ((nc.includes('t("') || nc.includes("i18n.t(")) && !nc.includes("import i18n from")) {
  nc = nc.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport i18n from "../../i18n";');
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, nc, "utf-8");

console.log("Keys: " + Object.keys(enKeys).length);
console.log("Done!");