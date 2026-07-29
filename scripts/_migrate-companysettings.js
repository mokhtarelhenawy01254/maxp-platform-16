const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "settings", "CompanySettings.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "settings", "companySettings.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "settings", "companySettings.json");
const NS = "companySettings";

[path.dirname(EN_SECTION), path.dirname(AR_SECTION)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function makeKey(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 4);
  const m = {
    "فشل": "failed", "تم": "success", "حدث": "error", "يرجى": "please",
    "حفظ": "save", "تحديث": "update", "حذف": "delete", "اسم": "name",
    "رابط": "link", "وصف": "description", "شعار": "logo", "علامة": "tab",
    "نطاق": "domain", "ملكية": "ownership", "رمز": "code", "تحقق": "verify",
    "نقل": "transfer", "خطأ": "error", "التاريخ": "date", "الشركة": "company",
  };
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  const eng = words.map(w => m[w] || "").filter(Boolean);
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

let content = fs.readFileSync(FILE, "utf-8");

let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const rep = [];

// Pattern: alert('arabic')
const alertSqRe = /alert\s*\(\s*'([^']*[\u0600-\u06FF][^']*?)'\s*\)/g;
const alertDqRe = /alert\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*?)"\s*\)/g;
let m;

while ((m = alertSqRe.exec(content)) !== null) {
  const text = m[1];
  if (text.includes("${")) continue;
  const key = makeKey(text);
  enKeys[key] = text; arKeys[key] = text;
  rep.push({ old: m[0], new: `alert(i18n.t("${NS}.${key}"))` });
}
while ((m = alertDqRe.exec(content)) !== null) {
  const text = m[1];
  if (text.includes("${")) continue;
  const key = makeKey(text);
  enKeys[key] = text; arKeys[key] = text;
  rep.push({ old: m[0], new: `alert(i18n.t("${NS}.${key}"))` });
}

// Pattern: alert(data.error || 'arabic')
const alertFallRe = /(data\.\w+|data\.\w+\s*\|\|\s*data\.\w+)\s*\|\|\s*'([^']*[\u0600-\u06FF][^']*?)'/g;
while ((m = alertFallRe.exec(content)) !== null) {
  const prefix = m[1], text = m[2];
  const key = makeKey(text);
  enKeys[key] = text; arKeys[key] = text;
  rep.push({ old: m[0], new: `${prefix} || i18n.t("${NS}.${key}")` });
}

// Deduplicate
const seen = new Set();
const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

console.log(unique.length + " alert() replacements\n");

let nc = content;
for (const r of unique) {
  if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new);
  else console.log("  NOT FOUND: " + r.old.slice(0, 50));
}

// Ensure i18n import (file already has it)
if (!nc.includes("import i18n from") && nc.includes("i18n.t(")) {
  nc = 'import i18n from "../../i18n";\n' + nc;
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, nc, "utf-8");

console.log("\nKeys: " + Object.keys(enKeys).length);
console.log("Done!");