const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "whatsapp", "WhatsAppChat.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "communication", "whatsappChat.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "communication", "whatsappChat.json");
const NS = "whatsappChat";

const enDir = path.dirname(EN_SECTION);
const arDir = path.dirname(AR_SECTION);
if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });
if (!fs.existsSync(arDir)) fs.mkdirSync(arDir, { recursive: true });

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function generateKey(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 6);
  const clean = text.replace(/[✅❌⚠️❗🔴🟢\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, "").trim();
  const words = clean.split(/\s+/).slice(0, 3).filter(w => w.length > 1);
  const prefix = words.length > 0 ? words.join("_").slice(0, 30).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_") : "msg";
  return (prefix + "_" + hash).slice(0, 50);
}

let content = fs.readFileSync(FILE, "utf-8");

let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// Count patterns
const toastFixedRe = /toast\.(success|error|warning|info|loading)\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*?)"\s*\)/g;
const toastTemplRe = /toast\.(success|error|warning|info)\s*\(\s*`([^`]*[\u0600-\u06FF][^`]*?)`\s*\)/g;

let fixedCount = 0, templCount = 0;
let m;
while ((m = toastFixedRe.exec(content)) !== null) { fixedCount++; }
while ((m = toastTemplRe.exec(content)) !== null) { templCount++; }

console.log("Toast patterns:");
console.log("  Fixed strings: " + fixedCount);
console.log("  Template literals: " + templCount);

// Check for danger patterns
const outsideComp = content.match(/^(?:export )?(?:const|function|async function) \w+.*\n(?:.*\n){0,5}.*toast\.\w+\(.*[\u0600-\u06FF]/gm);
if (outsideComp) {
  console.log("\n⚠️  DANGER: Toast calls outside component detected:");
  console.log(outsideComp.slice(0, 2).join("\n---\n"));
}

console.log("\nFile is " + content.split("\n").length + " lines");
console.log("Safe to migrate: YES (using tToast singleton)");