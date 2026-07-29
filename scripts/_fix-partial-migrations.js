const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

function isArabic(text) { return /[\u0600-\u06FF]/.test(text); }

// Fix partially-migrated files: convert remaining raw toast.error("Arabic: " + err) to tToast.error("key")
const FILES = [
  { file: "pages/comments/UnifiedCommentsManagement.jsx", ns: "UnifiedCommentsManagement", sec: "comments/unifiedComments" },
  { file: "pages/comments/PostComments.jsx", ns: "PostComments", sec: "comments/postComments" },
  { file: "pages/whatsapp/WhatsAppChat.tsx", ns: "whatsappChat", sec: "communication/whatsappChat" },
];

let total = 0;

for (const { file, ns, sec } of FILES) {
  const fp = path.join(SRC, file);
  if (!fs.existsSync(fp)) { console.log("SKIP: " + file); continue; }
  
  let content = fs.readFileSync(fp, "utf-8");
  const enSec = path.join(SRC, "locales", "en", "sections", sec + ".json");
  const arSec = path.join(SRC, "locales", "ar", "sections", sec + ".json");
  let enKeys = fs.existsSync(enSec) ? JSON.parse(fs.readFileSync(enSec, "utf-8")) : {};
  let arKeys = fs.existsSync(arSec) ? JSON.parse(fs.readFileSync(arSec, "utf-8")) : {};
  
  // Pattern: toast.error("Arabic: " + errorVar)
  const concatRe = /toast\.(\w+)\(["']([^"']*[\u0600-\u06FF][^"']*?)["']\s*\+\s*(\w+(?:\.\w+)*)/g;
  let m, count = 0;
  
  while ((m = concatRe.exec(content)) !== null) {
    const method = m[1], arabicText = m[2], errorVar = m[3];
    const hash = crypto.createHash("md5").update(arabicText + ns).digest("hex").slice(0, 4);
    const key = "msg_" + hash;
    enKeys[key] = arabicText + " {{error}}";
    arKeys[key] = arabicText + " {{error}}";
    
    const old = m[0];
    const nw = 'toast.' + method + '(i18n.t("' + ns + '.' + key + '", { error: ' + errorVar + ' }))';
    content = content.split(old).join(nw);
    count++;
  }
  
  // Pattern: toast.error("Arabic" + (resultVar || "fallback"))
  const concatRe2 = /toast\.(\w+)\(["']([^"']*[\u0600-\u06FF][^"']*?)["']\s*\+\s*\(([^)]+)\)/g;
  while ((m = concatRe2.exec(content)) !== null) {
    const method = m[1], arabicText = m[2], expr = m[3];
    const hash = crypto.createHash("md5").update(arabicText + ns).digest("hex").slice(0, 4);
    const key = "msg_" + hash;
    enKeys[key] = arabicText + " {{error}}";
    arKeys[key] = arabicText + " {{error}}";
    
    const old = m[0];
    const nw = 'toast.' + method + '(i18n.t("' + ns + '.' + key + '", { error: ' + expr + ' }))';
    content = content.split(old).join(nw);
    count++;
  }
  
  if (count > 0) {
    fs.writeFileSync(enSec, JSON.stringify(enKeys, null, 2), "utf-8");
    fs.writeFileSync(arSec, JSON.stringify(arKeys, null, 2), "utf-8");
    fs.writeFileSync(fp, content, "utf-8");
    console.log("  " + file + ": " + count + " remaining strings fixed");
    total += count;
  } else {
    console.log("  " + file + ": no remaining strings found");
  }
  
  // Ensure i18n import
  let c2 = fs.readFileSync(fp, "utf-8");
  if (c2.includes("i18n.t(") && !c2.includes("import i18n from") && !c2.includes("useTranslation")) {
    if (c2.includes('from "sonner"')) {
      c2 = c2.replace(/(import \{ toast[^}]*\} from ["']sonner["'];?)/, '$1\nimport i18n from "../../i18n";');
    }
    fs.writeFileSync(fp, c2, "utf-8");
  }
}

console.log("\nTotal: " + total);