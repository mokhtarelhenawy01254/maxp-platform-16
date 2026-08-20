const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "super-admin", "SubscriptionCenter.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "super-admin", "subscriptionCenter.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "super-admin", "subscriptionCenter.json");
const NS = "subscriptionCenter";

let content = fs.readFileSync(FILE, "utf-8");
let enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
let arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// #1: serverMsg || "Arabic"
const fix1 = {
  old: 'toast.error(serverMsg || "خطأ في الحفظ")',
  new: 'toast.error(serverMsg || i18n.t("subscriptionCenter.saveError"))'
};
enKeys.saveError = "خطأ في الحفظ";
arKeys.saveError = "خطأ في الحفظ";
content = content.split(fix1.old).join(fix1.new);
console.log("Fixed: serverMsg || fallback");

// #2: Complex ternary template — SKIP
console.log("SKIP: complex ternary template (needs code refactor)");

// #3: Simple template with 1 variable
const fix3 = {
  old: 'toast.error(`تعذر تحديث ${failedCount} قالب. راجع الشبكة ثم أعد المحاولة.`)',
  new: 'toast.error(i18n.t("subscriptionCenter.templateUpdateFailed", { failedCount }))'
};
enKeys.templateUpdateFailed = "تعذر تحديث {{failedCount}} قالب. راجع الشبكة ثم أعد المحاولة.";
arKeys.templateUpdateFailed = "تعذر تحديث {{failedCount}} قالب. راجع الشبكة ثم أعد المحاولة.";
content = content.split(fix3.old).join(fix3.new);
console.log("Fixed: template with failedCount");

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, content, "utf-8");

console.log("Total keys: " + Object.keys(enKeys).length);
