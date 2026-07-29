const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "affiliates", "AffiliatesManagement.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "settings", "affiliates.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "settings", "affiliates.json");
const NS = "affiliates";

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function generateKey(text) {
  const words = text.replace(/[^a-z0-9\u0600-\u06FF\s]/gi, "").trim().split(/\s+/).slice(0, 4);
  return words.map(w => w.toLowerCase()).join("_").slice(0, 50) || "generic";
}

// Read source file
let content = fs.readFileSync(FILE, "utf-8");

// Extract toast success/error calls
const toastRe = /(toast\.(?:success|error|warning|info|loading)\s*\(\s*["'`])([^"'`]*[\u0600-\u06FF][^"'`]*?)(["'`])/g;
const matches = [];
let m;
while ((m = toastRe.exec(content)) !== null) {
  matches.push({ full: m[0], prefix: m[1], text: m[2], suffix: m[3], method: m[1].replace(/toast\.|\s*\(\s*["']/g, "").trim() });
}

console.log("Found " + matches.length + " toast calls with Arabic:\n");

// Load existing translations
let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// Map strings to keys
const stringToKey = {};
for (const { text, method } of matches) {
  let key = generateKey(text);
  // Ensure unique
  let suffix = 0;
  let baseKey = key;
  while (Object.values(stringToKey).includes(key) || enKeys[key] !== undefined) {
    suffix++;
    key = baseKey + "_" + suffix;
  }
  stringToKey[text] = key;
  enKeys[key] = text; // Use Arabic as placeholder for EN - needs human translation
  arKeys[key] = text;
  console.log("  [" + method + "] \"" + text + "\" => " + key);
}

// Save translation files
fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
console.log("\nUpdated EN + AR section files with " + Object.keys(stringToKey).length + " new keys");

// Replace strings in source file
for (const [text, key] of Object.entries(stringToKey)) {
  content = content.split('"' + text + '"').join('"' + NS + "." + key + '"');
  content = content.split("'" + text + "'").join("'" + NS + "." + key + "'");
  content = content.split("`" + text + "`").join("`" + NS + "." + key + "`");
}

// Replace toast.X with tToast.X
content = content.replace(/toast\.(success|error|warning|info|loading)\s*\(\s*"/g, 'tToast.$1("');

// Add import if needed
if (!content.includes("i18n-toast")) {
  const toastImport = 'import { toast } from "sonner";';
  const newImport = toastImport + '\nimport { tToast } from "../../utils/i18n-toast";';
  content = content.replace(toastImport, newImport);
}

fs.writeFileSync(FILE, content, "utf-8");
console.log("Updated AffiliatesManagement.tsx\n");
console.log("Done!");