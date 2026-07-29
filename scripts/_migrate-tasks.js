const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "tasks", "Tasks.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "tasks", "tasks.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "tasks", "tasks.json");
const NS = "tasks";

[path.dirname(EN_SECTION), path.dirname(AR_SECTION)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

const WORD_MAP = {
  "تم": "success", "فشل": "failed", "خطأ": "error", "انتهت": "expired",
  "صلاحية": "session", "يرجى": "please", "تعذر": "unable", "جاري": "loading",
  "إنشاء": "create", "تحديث": "update", "حذف": "delete", "تحميل": "load",
  "إضافة": "add", "إرسال": "send", "حفظ": "save", "تسجيل": "login",
  "الدخول": "login", "قسم": "section", "مهمة": "task", "اسم": "name",
  "مطلوب": "required", "الاتصال": "connect", "الخادم": "server",
  "تحقق": "check", "اتصالك": "connection", "المهام": "tasks",
};

function makeKey(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 4);
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 4);
  const eng = words.map(w => WORD_MAP[w] || w).filter(w => /^[a-zA-Z]/.test(w));
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

let content = fs.readFileSync(FILE, "utf-8");

let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const rep = [];

// Fixed strings: toast.method("arabic")
const dqRe = /toast\.(\w+)\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*?)"\s*\)/g;
let m;
while ((m = dqRe.exec(content)) !== null) {
  const method = m[1], text = m[2];
  if (text.includes("${")) continue;
  const key = makeKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  rep.push({ old: m[0], new: `tToast.${method}("${NS}.${key}")` });
}

// Template strings: toast.method(`arabic ${var}`)
const btRe = /toast\.(\w+)\s*\(\s*`([^`]*[\u0600-\u06FF][^`]*?)`\s*\)/g;
while ((m = btRe.exec(content)) !== null) {
  const method = m[1], text = m[2];
  const vars = [...text.matchAll(/\$\{([\w.]+)\}/g)].map(v => {
    const parts = v[1].split(".");
    return parts[parts.length - 1];
  });
  if (vars.length === 0 || vars.length > 2) {
    console.log("  SKIP (complex): " + text.slice(0, 50));
    continue;
  }
  let tpl = text;
  for (const v of vars) tpl = tpl.replace(/\$\{[\w.]+\}/g, "{{" + v + "}}");
  const key = makeKey(text);
  enKeys[key] = tpl;
  arKeys[key] = tpl;
  const varPairs = vars.map(v => v + ": " + v).join(", ");
  rep.push({ old: m[0], new: `toast.${method}(i18n.t("${NS}.${key}", { ${varPairs} }))` });
}

// Deduplicate
const seen = new Set();
const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

console.log(unique.length + " replacements to apply\n");

let nc = content;
for (const r of unique) {
  if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new);
  else console.log("  SKIP: " + r.old.slice(0, 50));
}

// Add imports
if (!nc.includes("i18n-toast")) {
  nc = nc.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { tToast } from "../../utils/i18n-toast";'
  );
}
if (!nc.includes("import i18n from") && nc.includes('t("') || nc.includes('i18n.t(')) {
  nc = nc.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport i18n from "../../i18n";'
  );
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, nc, "utf-8");

console.log("\nKeys: " + Object.keys(enKeys).length);
console.log("Done!");