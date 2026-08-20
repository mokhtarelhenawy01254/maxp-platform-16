const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");
const EN_SECTION = path.join(SRC, "locales", "en", "sections", "communication", "whatsappChat.json");
const AR_SECTION = path.join(SRC, "locales", "ar", "sections", "communication", "whatsappChat.json");
const SOURCE = path.join(SRC, "pages", "whatsapp", "WhatsAppChat.tsx");
const NS = "whatsappChat";

function isArabic(text) { return /[\u0600-\u06FF]/.test(text); }

let enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
let arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));
let source = fs.readFileSync(SOURCE, "utf-8");

// Map Arabic keys → English keys
const keyMap = {};
const newEn = {};
const newAr = {};

const WORD_MAP = {
  "تم": "success", "فشل": "failed", "خطأ": "error", "يرجى": "please",
  "حفظ": "save", "تحديث": "update", "حذف": "delete", "إنشاء": "create",
  "نشر": "publish", "حالة": "status", "رسالة": "message", "إرسال": "send",
  "تسجيل": "login", "دخول": "login", "محادثة": "chat", "نسخ": "copy",
  "نص": "text", "تفاعل": "reaction", "العثور": "found", "مسح": "clear",
  "تحديد": "select", "مزامنة": "sync", "طلب": "request", "تعذر": "unable",
  "أثناء": "during", "حدث": "error", "تحميل": "load", "رفض": "reject",
  "سبب": "reason", "إدخال": "enter", "جاري": "loading", "قائمة": "list",
  "بيانات": "data", "حساب": "account", "ربط": "connect", "اتصال": "connect",
};

for (const key of Object.keys(enKeys)) {
  if (isArabic(key)) {
    // Generate English key from Arabic name
    const hash = crypto.createHash("md5").update(key).digest("hex").slice(0, 4);
    const words = key.replace(/_/g, " ").split(/\s+/).slice(0, 3);
    const eng = words.map(w => WORD_MAP[w] || "").filter(Boolean);
    const newKey = (eng.length >= 2 ? eng.join("_") : "msg") + "_" + hash;
    keyMap[key] = newKey;
    newEn[newKey] = enKeys[key];
    newAr[newKey] = arKeys[key];
  } else {
    newEn[key] = enKeys[key];
    newAr[key] = arKeys[key];
  }
}

console.log("Renamed " + Object.keys(keyMap).length + " Arabic keys to English\n");

// Update source file
for (const [oldKey, newKey] of Object.entries(keyMap)) {
  const oldRef = NS + "." + oldKey;
  const newRef = NS + "." + newKey;
  source = source.split('"' + oldRef + '"').join('"' + newRef + '"');
  source = source.split("'" + oldRef + "'").join("'" + newRef + "'");
}

fs.writeFileSync(EN_SECTION, JSON.stringify(newEn, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(newAr, null, 2), "utf-8");
fs.writeFileSync(SOURCE, source, "utf-8");

// Verify no Arabic left in keys
const remaining = Object.keys(newEn).filter(isArabic).length;
console.log("Remaining Arabic keys: " + remaining);
console.log("Total keys: " + Object.keys(newEn).length);
console.log("Done!");
