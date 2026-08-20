const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "whatsapp", "WhatsAppChat.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "communication", "whatsappChat.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "communication", "whatsappChat.json");
const NS = "whatsappChat";

[path.dirname(EN_SECTION), path.dirname(AR_SECTION)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function makeKey(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 6);
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).slice(0, 3);
  return (words.join("_") + "_" + hash).slice(0, 50);
}

let content = fs.readFileSync(FILE, "utf-8");

let enKeys = {};
let arKeys = {};
if (fs.existsSync(EN_SECTION)) enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
if (fs.existsSync(AR_SECTION)) arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

const rep = [];
let added = 0;

// Pattern: toast.method('arabic') — single quotes
const sqRe = /toast\.(\w+)\s*\(\s*'([^']*[\u0600-\u06FF][^']*?)'\s*\)/g;
let m;
while ((m = sqRe.exec(content)) !== null) {
  const method = m[1], text = m[2];
  if (text.includes("${")) continue;
  const key = makeKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  rep.push({ old: m[0], new: `tToast.${method}("${NS}.${key}")` });
  added++;
}

// Pattern: toast.method("arabic") — double quotes
const dqRe = /toast\.(\w+)\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*?)"\s*\)/g;
while ((m = dqRe.exec(content)) !== null) {
  const method = m[1], text = m[2];
  if (text.includes("${")) continue;
  const key = makeKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  rep.push({ old: m[0], new: `tToast.${method}("${NS}.${key}")` });
  added++;
}

// Pattern: getErrorMessage(error, 'arabic')
const geRe = /getErrorMessage\(([^,]+),\s*'([^']*[\u0600-\u06FF][^']*?)'/g;
while ((m = geRe.exec(content)) !== null) {
  const errVar = m[1], text = m[2];
  const key = makeKey(text);
  enKeys[key] = text;
  arKeys[key] = text;
  const old = m[0];
  const nw = `getErrorMessage(${errVar}, i18n.t("${NS}.${key}")`;
  rep.push({ old, new: nw });
  added++;
}

// Deduplicate
const seen = new Set();
const unique = rep.filter(r => {
  if (seen.has(r.old)) return false;
  seen.add(r.old);
  return true;
});

console.log(`Found ${unique.length} unique replacements\n`);

// Show a few
for (const r of unique.slice(0, 8)) {
  console.log(`  ${r.new.slice(0, 70)}`);
}
if (unique.length > 8) console.log(`  ... and ${unique.length - 8} more`);

// Apply
let nc = content;
for (const r of unique) {
  if (nc.includes(r.old)) {
    nc = nc.split(r.old).join(r.new);
  } else {
    console.log(`  WARN: not found: ${r.old.slice(0, 50)}`);
  }
}

// Add imports
if (!nc.includes("i18n-toast")) {
  nc = nc.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport { tToast } from '../../utils/i18n-toast';"
  );
}
if (!nc.includes("import i18n from")) {
  nc = nc.replace(
    "import { toast } from 'sonner';",
    "import { toast } from 'sonner';\nimport i18n from '../../i18n';"
  );
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, nc, "utf-8");

console.log(`\nKeys added: ${Object.keys(enKeys).length}`);
console.log("Done!");
