const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "affiliates", "AffiliatesManagement.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "settings", "affiliates.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "settings", "affiliates.json");
const NS = "affiliates";

// Read source file
let content = fs.readFileSync(FILE, "utf-8");

// Extract all toast calls with Arabic text
const toastRe = /toast\.(success|error|warning|info|loading)\s*\(\s*["'`]([^"'`]*?[\u0600-\u06FF][^"'`]*?)["'`]/g;
const found = [];
let m;
while ((m = toastRe.exec(content)) !== null) {
  found.push({ method: m[1], text: m[2], full: m[0] });
}

console.log("Found " + found.length + " toast calls with Arabic:\n");

// Map to English keys (based on semantic meaning)
const textToKey = {
  "فشل تحميل قائمة المسوقين":                 "loadFailed",
  "يجب إدخال سبب واضح قبل إيقاف المسوق":      "suspendReasonRequired",
  "برجاء إدخال قيمة عمولة صالحة":             "invalidCommissionValue",
  "تم تحديث العمولة بنجاح":                   "commissionUpdated",
  "فشل تحديث العمولة":                       "commissionUpdateFailed",
  "تم تحديث ضوابط المسوق بنجاح":              "controlsUpdated",
  "يجب إدخال سبب واضح قبل رفض مستند الاعتماد": "rejectionReasonRequired",
  "تم تحديث حالة المسوق بنجاح":               "statusUpdated",
  "فشل تحديث حالة المسوق":                    "statusUpdateFailed",
  "نسبة العمولة لا يمكن أن تتجاوز 100%":      "commissionRateMax",
  "تم تحديث بيانات المسوق بنجاح":             "updateSuccess",
  "فشل تحديث بيانات المسوق":                 "updateFailed",
  "تم حذف المسوق بنجاح":                     "deleteSuccess",
  "فشل حذف المسوق":                          "deleteFailed",
  "فشل توثيق المسوق":                        "verificationFailed",
};

// Build EN/AR section data
let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const usedKeys = new Set();
for (const { text, method } of found) {
  let key = textToKey[text];
  if (!key) {
    console.log("WARNING: No key mapping for: " + text);
    continue;
  }
  if (usedKeys.has(key)) continue; // skip duplicates
  usedKeys.add(key);

  enKeys[key] = text; // Arabic as placeholder until translated to English
  arKeys[key] = text;
  console.log("  [" + method + "] \"" + text + "\" => " + key);
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");

// Replace strings in source file
for (const [text, key] of Object.entries(textToKey)) {
  if (!usedKeys.has(key)) continue;
  content = content.split('"' + text + '"').join('"' + NS + "." + key + '"');
  content = content.split("'" + text + "'").join("'" + NS + "." + key + "'");
  content = content.split("`" + text + "`").join("`" + NS + "." + key + "`");
}

// Replace toast.X with tToast.X
content = content.replace(/toast\.(success|error|warning|info|loading)\s*\(\s*"affiliates\./g, 'tToast.$1("affiliates.');
content = content.replace(/toast\.(success|error|warning|info|loading)\s*\(\s*'affiliates\./g, "tToast.$1('affiliates.");

// Add import
if (!content.includes("i18n-toast")) {
  content = content.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { tToast } from "../../utils/i18n-toast";'
  );
}

fs.writeFileSync(FILE, content, "utf-8");
console.log("\nDone! " + usedKeys.size + " keys migrated.");