const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

// Remaining top files from rescan
const FILES = [
  "components/orders/OrderModal.tsx",
  "pages/admin/FormsBuilderPage.tsx",
  "pages/advertising/BudgetAlertsPage.tsx",
  "pages/hr/CompanyPolicy.tsx",
  "pages/owner/OwnerReports.tsx",
  "pages/platform/CommissionsManagement.tsx",
  "components/facebook-inbox/Modals/QuickOrderModal.tsx",
  "components/whatsapp/PrivacySettingsDialog.tsx",
  "hooks/useKeyMutations.ts",
  "hooks/useWishlistPage.ts",
  "pages/advertising/CreateCampaign.tsx",
  "pages/advertising/ProductLandingPages.tsx",
  "pages/affiliates/AffiliateProducts.tsx",
  "pages/affiliates/AffiliateProfile.tsx",
  "pages/affiliates/AffiliateQuickActions.tsx",
  "pages/affiliates/CompanyConsumerDetail.tsx",
  "pages/affiliates/CompanyProviderDetail.tsx",
  "pages/appointments/Appointments.tsx",
  "pages/facebook-inbox/FacebookInbox.tsx",
  "pages/hr/assets/sections/DocumentsSection.tsx",
  "pages/hr/Deductions.tsx",
  "pages/hr/Documents.tsx",
  "pages/hr/MyCompaniesDashboard.tsx",
  "pages/products/ProductReviews.tsx",
  "pages/products/Products.tsx",
];

function isArabic(text) { return /[\u0600-\u06FF]/.test(text); }

function makeKey(text, ns) {
  const hash = crypto.createHash("md5").update(ns + ":" + text).digest("hex").slice(0, 4);
  const M = {
    "تم": "success", "فشل": "failed", "خطأ": "error", "يرجى": "please",
    "حفظ": "save", "تحديث": "update", "حذف": "delete", "إنشاء": "create",
    "تفعيل": "activate", "تحميل": "load", "جلب": "fetch", "إضافة": "add",
    "إرسال": "send", "تعذر": "unable", "حدث": "error", "جاري": "loading",
    "حالة": "status", "قيمة": "value", "سبب": "reason", "اسم": "name",
    "مطلوب": "required", "نسبة": "rate", "سجل": "record", "اتصال": "connect",
  };
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  const eng = words.map(w => M[w] || "").filter(Boolean);
  return (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
}

function getNs(filePath) {
  // Extract meaningful namespace from file path
  const parts = filePath.replace(/\.(tsx?|jsx?)$/, "").split(/[/\\]/);
  const module = parts[0] === "pages" ? parts[1] : parts[0];
  const name = parts[parts.length - 1].replace(/\.(tsx?|jsx?)$/, "");
  return module + "_" + name;
}

let total = 0;

for (const file of FILES) {
  const filePath = path.join(SRC, file);
  if (!fs.existsSync(filePath)) { console.log("  SKIP: " + file); continue; }

  const ns = getNs(file);
  const section = file.replace(/\.(tsx?|jsx?)$/, "").replace(/^pages\//, "").replace(/^components\//, "").replace(/^hooks\//, "");
  const enPath = path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections", section + ".json");
  const arPath = path.join(ROOT, "apps", "frontend", "src", "locales", "ar", "sections", section + ".json");
  [path.dirname(enPath), path.dirname(arPath)].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  let content = fs.readFileSync(filePath, "utf-8");
  let enKeys = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, "utf-8")) : {};
  let arKeys = fs.existsSync(arPath) ? JSON.parse(fs.readFileSync(arPath, "utf-8")) : {};

  const rep = [];
  let count = 0;

  // All patterns
  for (const q of ['"', "'"]) {
    const re = new RegExp(`toast\\.(\\w+)\\s*\\(\\s*${q}([^${q}]*?[\\u0600-\\u06FF][^${q}]*?)${q}\\s*\\)`, 'g');
    let m; while ((m = re.exec(content)) !== null) {
      if (m[2].includes("${")) continue;
      const key = makeKey(m[2], ns); enKeys[key] = m[2]; arKeys[key] = m[2];
      rep.push({ old: m[0], new: `tToast.${m[1]}("${ns}.${key}")` }); count++;
    }
  }

  const fbRe = /(\w+Error|\w+Msg|data\.\w+|errorMessage|serverMsg|err\.\w+)\s*\|\|\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let fm; while ((fm = fbRe.exec(content)) !== null) {
    const key = makeKey(fm[2], ns); enKeys[key] = fm[2]; arKeys[key] = fm[2];
    rep.push({ old: fm[0], new: `${fm[1]} || i18n.t("${ns}.${key}")` }); count++;
  }

  const geRe = /getErrorMessage\([^,]+,\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']/g;
  let gm; while ((gm = geRe.exec(content)) !== null) {
    const key = makeKey(gm[1], ns); enKeys[key] = gm[1]; arKeys[key] = gm[1];
    rep.push({ old: gm[0], new: gm[0].replace(/["'][^"']*[\u0600-\u06FF][^"']*["']/g, `i18n.t("${ns}.${key}")`) }); count++;
  }

  const alRe = /alert\s*\(\s*["']([^"']*?[\u0600-\u06FF][^"']*?)["']\s*\)/g;
  let am; while ((am = alRe.exec(content)) !== null) {
    if (am[1].includes("${")) continue;
    const key = makeKey(am[1], ns); enKeys[key] = am[1]; arKeys[key] = am[1];
    rep.push({ old: am[0], new: `alert(i18n.t("${ns}.${key}"))` }); count++;
  }

  if (count === 0) { console.log("  (0) " + file); continue; }

  const seen = new Set();
  const unique = rep.filter(r => { if (seen.has(r.old)) return false; seen.add(r.old); return true; });

  let nc = content;
  for (const r of unique) { if (nc.includes(r.old)) nc = nc.split(r.old).join(r.new); }

  // Imports
  if (nc.includes("tToast.") && !nc.includes("i18n-toast")) {
    const ti = nc.match(/import \{ toast \} from ["']sonner["'];?/);
    if (ti) nc = nc.replace(ti[0], ti[0] + '\nimport { tToast } from "../../utils/i18n-toast";');
  }
  if (nc.includes("i18n.t(") && !nc.includes("import i18n from") && !nc.includes("useTranslation")) {
    const ti = nc.match(/import \{ toast \} from ["']sonner["'];?/);
    if (ti) nc = nc.replace(ti[0], ti[0] + '\nimport i18n from "../../i18n";');
  }

  fs.writeFileSync(enPath, JSON.stringify(enKeys, null, 2), "utf-8");
  fs.writeFileSync(arPath, JSON.stringify(arKeys, null, 2), "utf-8");
  fs.writeFileSync(filePath, nc, "utf-8");

  console.log(`  ${file}: ${unique.length}`);
  total += unique.length;
}

console.log("\n=== Total: " + total + " ===");