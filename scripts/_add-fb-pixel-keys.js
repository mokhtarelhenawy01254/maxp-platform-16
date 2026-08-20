const fs = require("fs");
const path = require("path");

const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "settings", "facebookPixel.json");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "settings", "facebookPixel.json");

let en = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
let ar = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// Add template keys
const newKeys = {
  "msg_vcygkc": "❌ فشل الاتصال: {{message}}",
  "msg_s5gii5": "✅ تم العثور على {{length}} Pixel",
  "msg_1l2s94": "✅ تم إنشاء Pixel بنجاح! ID: {{pixelId}}",
};

for (const [k, v] of Object.entries(newKeys)) {
  en[k] = v;
  ar[k] = v;
}

fs.writeFileSync(EN_SECTION, JSON.stringify(en, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(ar, null, 2), "utf-8");
console.log("Added 3 template keys");
console.log("Total keys: " + Object.keys(en).length);
