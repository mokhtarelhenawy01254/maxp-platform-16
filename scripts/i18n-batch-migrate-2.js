const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

// Remaining files from scan report (not yet migrated)
const FILES = [
  { file: "pages/super-admin/company-details/useCompanyDetails.ts", ns: "companyDetails", section: "super-admin/companyDetails" },
  { file: "pages/woocommerce/hooks/useWooCommerceImport.ts", ns: "wooImport", section: "woocommerce/wooImport" },
  { file: "pages/woocommerce/hooks/useWooCommerceSettings.ts", ns: "wooSettings", section: "woocommerce/wooSettings" },
  { file: "pages/woocommerce/hooks/useWooCommerceImportEnhanced.ts", ns: "wooImportEnhanced", section: "woocommerce/wooImportEnhanced" },
  { file: "components/facebook-inbox/TextGallery/TextGalleryModal.tsx", ns: "textGallery", section: "facebookInbox/textGallery" },
  { file: "pages/public/PublicApplicationForm.tsx", ns: "publicApp", section: "public/publicApp" },
  { file: "pages/settings/OrderStatusManager.tsx", ns: "orderStatusManager", section: "settings/orderStatusManager" },
  { file: "pages/comments/UnifiedCommentsManagement.jsx", ns: "unifiedComments", section: "comments/unifiedComments" },
  { file: "pages/hr/Benefits.tsx", ns: "benefits", section: "hr/benefits" },
  { file: "pages/orders/hooks/useOrderDetails.ts", ns: "orderDetails", section: "orders/orderDetails" },
  { file: "components/advertising/dashboard/BudgetAlertsPanel.tsx", ns: "budgetAlerts", section: "advertising/budgetAlerts" },
  { file: "pages/hr/Recruitment.tsx", ns: "recruitment", section: "hr/recruitment" },
  { file: "pages/settings/StoreConversionSettings.tsx", ns: "storeConversion", section: "settings/storeConversion" },
  { file: "pages/marketing/UpsellPlanner.tsx", ns: "upsellPlanner", section: "marketing/upsellPlanner" },
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
    "حدث": "error", "جاري": "loading", "حالة": "status", "قيمة": "value",
    "نسبة": "rate", "سبب": "reason", "مهمة": "task", "سجل": "record",
  };
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  const eng = words.map(w => M[w] || "").filter(Boolean);
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

let totalMigrated = 0;

for (const { file, ns, section } of FILES) {
  const filePath = path.join(SRC, file);
  if (!fs.existsSync(filePath)) { console.log("SKIP: " + file); continue; }

  const enSectionPath = path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections", section + ".json");
  const arSectionPath = path.join(ROOT, "apps", "frontend", "src", "locales", "ar", "sections", section + ".json");
  [path.dirname(enSectionPath), path.dirname(arSectionPath)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  let content = fs.readFileSync(filePath, "utf-8");
  let enKeys = fs.existsSync(enSectionPath) ? JSON.parse(fs.readFileSync(enSectionPath, "utf-8")) : {};
  let arKeys = fs.existsSync(arSectionPath) ? JSON.parse(fs.readFileSync(arSectionPath, "utf-8")) : {};

  const rep = [];
  let fileMigrated = 0;

  // Fixed strings (both quote styles)
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

  // Fallback: xxx || "arabic"
  const fbRe = /(\w+Error|\w+Msg|data\.\w+|errorMessage|serverMsg|err\.\w+)\s*\|\|\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let fm;
  while ((fm = fbRe.exec(content)) !== null) {
    const prefix = fm[1], text = fm[2];
    const key = makeKey(text, ns);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: fm[0], new: `${prefix} || i18n.t("${ns}.${key}")` });
    fileMigrated++;
  }

  // getErrorMessage
  const geRe = /getErrorMessage\([^,]+,\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let gm;
  while ((gm = geRe.exec(content)) !== null) {
    const text = gm[1];
    const key = makeKey(text, ns);
    enKeys[key] = text; arKeys[key] = text;
    rep.push({ old: gm[0], new: gm[0].replace(/["'][^"']*[\u0600-\u06FF][^"']*["']/g, `i18n.t("${ns}.${key}")`) });
    fileMigrated++;
  }

  // alert
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

  if (fileMigrated === 0) { console.log("  (0 strings) " + file); continue; }

  const seen = new Set();
  const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

  let nc = content;
  for (const r of unique) {
    if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new);
  }

  // Add imports
  const isHook = file.endsWith(".ts") && file.includes("hooks/");
  if (nc.includes("tToast.") && !nc.includes("i18n-toast")) {
    const match = nc.match(/import \{ toast \} from ["']sonner["'];?/);
    if (match) nc = nc.replace(match[0], match[0] + '\nimport { tToast } from "../../../utils/i18n-toast";');
  }
  if ((nc.includes("i18n.t(")) && !nc.includes("import i18n from")) {
    if (nc.includes('import { toast } from')) {
      const match = nc.match(/import \{ toast \} from ["']sonner["'];?/);
      if (match) nc = nc.replace(match[0], match[0] + '\nimport i18n from "../../../i18n";');
    }
  }

  fs.writeFileSync(enSectionPath, JSON.stringify(enKeys, null, 2), "utf-8");
  fs.writeFileSync(arSectionPath, JSON.stringify(arKeys, null, 2), "utf-8");
  fs.writeFileSync(filePath, nc, "utf-8");

  console.log(`  ${file}: ${unique.length} strings`);
  totalMigrated += unique.length;
}

console.log("\n=== Total: " + totalMigrated + " strings ===");
