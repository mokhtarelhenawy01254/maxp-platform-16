/**
 * i18n Batch Migrator — migrates multiple files at once
 * Usage: node scripts/i18n-batch-migrate.js
 * Safe: creates section files, replaces toast/alert strings, verifies
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

// Files to migrate (from scan report, sorted by impact)
const FILES = [
  { file: "components/whatsapp/GroupInfoDrawer.tsx", ns: "groupInfoDrawer", section: "communication/groupInfoDrawer" },
  { file: "pages/hr/recruitment/sections/ApplicationFormsSection.tsx", ns: "applicationForms", section: "hr/applicationForms" },
  { file: "pages/advertising/CreateAd.tsx", ns: "createAd", section: "advertising/createAd" },
  { file: "pages/hr/ManualAttendanceEdit.tsx", ns: "manualAttendance", section: "hr/manualAttendance" },
  { file: "pages/products/Products.tsx", ns: "products", section: "products/products" },
  { file: "pages/tasks/components/TaskIntegrationsTab.tsx", ns: "taskIntegrations", section: "tasks/taskIntegrations" },
  { file: "pages/hr/Payroll.tsx", ns: "payroll", section: "hr/payroll" },
  { file: "pages/hr/CreateGoal.tsx", ns: "createGoal", section: "hr/createGoal" },
  { file: "pages/hr/HRSettings.tsx", ns: "hrSettings", section: "hr/hrSettings" },
  { file: "pages/comments/PostComments.jsx", ns: "postComments", section: "comments/postComments" },
  { file: "pages/hr/Attendance.tsx", ns: "attendance", section: "hr/attendance" },
  { file: "pages/hr/Departments.tsx", ns: "departments", section: "hr/departments" },
  { file: "pages/products/ProductsTrash.tsx", ns: "productsTrash", section: "products/productsTrash" },
  { file: "pages/affiliates/AffiliatesManagement.tsx", ns: "affiliates", section: "settings/affiliates" },
];

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function makeKey(text, ns) {
  const hash = crypto.createHash("md5").update(ns + ":" + text).digest("hex").slice(0, 4);
  const M = {
    "تم": "success", "فشل": "failed", "خطأ": "error", "يرجى": "please",
    "حفظ": "save", "تحديث": "update", "حذف": "delete", "إنشاء": "create",
    "تفعيل": "activate", "تحميل": "load", "جلب": "fetch", "إضافة": "add",
    "إرسال": "send", "تسجيل": "login", "الدخول": "login", "اسم": "name",
    "مطلوب": "required", "تعذر": "unable", "الاتصال": "connect",
    "حدث": "error", "جاري": "loading", "قسم": "section", "مهمة": "task",
    "حساب": "account", "باقة": "plan", "اشتراك": "subscription",
    "نسبة": "rate", "حالة": "status", "قيمة": "value", "سبب": "reason",
  };
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  const eng = words.map(w => M[w] || "").filter(Boolean);
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

let totalMigrated = 0;
const results = [];

for (const { file, ns, section } of FILES) {
  const filePath = path.join(SRC, file);
  if (!fs.existsSync(filePath)) {
    console.log("SKIP (not found): " + file);
    continue;
  }

  const enSectionPath = path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections", section + ".json");
  const arSectionPath = path.join(ROOT, "apps", "frontend", "src", "locales", "ar", "sections", section + ".json");

  // Ensure dirs
  [path.dirname(enSectionPath), path.dirname(arSectionPath)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  let content = fs.readFileSync(filePath, "utf-8");
  let enKeys = fs.existsSync(enSectionPath) ? JSON.parse(fs.readFileSync(enSectionPath, "utf-8")) : {};
  let arKeys = fs.existsSync(arSectionPath) ? JSON.parse(fs.readFileSync(arSectionPath, "utf-8")) : {};

  const rep = [];
  let fileMigrated = 0;

  // Pattern 1: Fixed strings (both quote styles)
  for (const q of ['"', "'"]) {
    const re = new RegExp(`toast\\.(\\w+)\\s*\\(\\s*${q}([^${q}]*?[\\u0600-\\u06FF][^${q}]*?)${q}\\s*\\)`, 'g');
    let m;
    while ((m = re.exec(content)) !== null) {
      const method = m[1], text = m[2];
      if (text.includes("${")) continue;
      const key = makeKey(text, ns);
      enKeys[key] = text; arKeys[key] = text;
      rep.push({ old: m[0], new: `tToast.${method}("${ns}.${key}")` });
      fileMigrated++;
    }
  }

  // Pattern 2: Fallback patterns
  const fbRe = /(\w+Error|\w+Msg|data\.\w+|errorMessage|serverMsg)\s*\|\|\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let fm;
  while ((fm = fbRe.exec(content)) !== null) {
    const prefix = fm[1], text = fm[2];
    const key = makeKey(text, ns);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: fm[0], new: `${prefix} || i18n.t("${ns}.${key}")` });
    fileMigrated++;
  }

  // Pattern 3: getErrorMessage(error, 'arabic')
  const geRe = /getErrorMessage\([^,]+,\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let gm;
  while ((gm = geRe.exec(content)) !== null) {
    const text = gm[1];
    const key = makeKey(text, ns);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: gm[0], new: gm[0].replace(/["'][^"']*[\u0600-\u06FF][^"']*["']/g, `i18n.t("${ns}.${key}")`) });
    fileMigrated++;
  }

  // Pattern 4: alert('arabic')
  const alertRe = /alert\s*\(\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']\s*\)/g;
  let am;
  while ((am = alertRe.exec(content)) !== null) {
    const text = am[1];
    if (text.includes("${")) continue;
    const key = makeKey(text, ns);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: am[0], new: `alert(i18n.t("${ns}.${key}"))` });
    fileMigrated++;
  }

  // Deduplicate
  const seen = new Set();
  const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

  if (unique.length === 0) {
    console.log("  (no Arabic strings found) " + file);
    continue;
  }

  // Apply
  let nc = content;
  for (const r of unique) {
    if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new);
    else console.log("    WARN: not found: " + r.old.slice(0, 50));
  }

  // Add imports
  if (nc.includes("tToast.") && !nc.includes("i18n-toast")) {
    const toastImport = nc.match(/import \{ toast \} from ["']sonner["'];?/);
    if (toastImport) {
      nc = nc.replace(toastImport[0], toastImport[0] + '\nimport { tToast } from "../../utils/i18n-toast";');
    }
  }
  if ((nc.includes('i18n.t(') || nc.includes('t("')) && !nc.includes("import i18n from") && !nc.includes("useTranslation")) {
    const toastImport = nc.match(/import \{ toast \} from ["']sonner["'];?/);
    if (toastImport) {
      nc = nc.replace(toastImport[0], toastImport[0] + '\nimport i18n from "../../i18n";');
    } else if (nc.includes("import React")) {
      nc = nc.replace(/import React/, 'import i18n from "../../i18n";\nimport React');
    }
  }

  // Save
  fs.writeFileSync(enSectionPath, JSON.stringify(enKeys, null, 2), "utf-8");
  fs.writeFileSync(arSectionPath, JSON.stringify(arKeys, null, 2), "utf-8");
  fs.writeFileSync(filePath, nc, "utf-8");

  console.log(`  ${file}: ${unique.length} strings migrated`);
  totalMigrated += unique.length;
  results.push({ file, count: unique.length, keys: Object.keys(enKeys).length });
}

console.log("\n" + "=".repeat(50));
console.log("Total files: " + results.length);
console.log("Total strings migrated: " + totalMigrated);
for (const r of results) {
  console.log(`  ${r.file}: ${r.count} strings (${r.keys} keys)`);
}
