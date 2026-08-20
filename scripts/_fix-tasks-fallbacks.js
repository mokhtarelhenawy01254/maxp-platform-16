const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "tasks", "Tasks.tsx");
const EN_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "en", "sections", "tasks", "tasks.json");
const AR_SECTION = path.join(__dirname, "..", "apps", "frontend", "src", "locales", "ar", "sections", "tasks", "tasks.json");
const NS = "tasks";

let content = fs.readFileSync(FILE, "utf-8");
let enKeys = JSON.parse(fs.readFileSync(EN_SECTION, "utf-8"));
let arKeys = JSON.parse(fs.readFileSync(AR_SECTION, "utf-8"));

// Pattern: data.error || "Arabic fallback"
const fallbackRe = /(data\.\w+\s*\|\|\s*)"([^"]*[\u0600-\u06FF][^"]*?)"/g;
let m;
const fixes = [];
while ((m = fallbackRe.exec(content)) !== null) {
  const prefix = m[1];
  const text = m[2];
  // Make key from text
  const clean = text.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/);
  const key = words.filter(w => w.length > 1).slice(0, 3).join("_") + "_" + require("crypto").createHash("md5").update(text).digest("hex").slice(0, 4);
  enKeys[key] = text;
  arKeys[key] = text;
  const old = m[0];
  // Keep the prefix, replace just the Arabic with i18n.t
  const nw = prefix + 'i18n.t("' + NS + '.' + key + '")';
  fixes.push({ old, new: nw, text: text.slice(0, 40) });
  console.log("  " + text.slice(0, 50) + " => " + key);
}

// Apply
for (const f of fixes) {
  content = content.split(f.old).join(f.new);
}

// Ensure i18n import
if (!content.includes("import i18n from")) {
  content = content.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport i18n from "../../i18n";'
  );
}

fs.writeFileSync(EN_SECTION, JSON.stringify(enKeys, null, 2), "utf-8");
fs.writeFileSync(AR_SECTION, JSON.stringify(arKeys, null, 2), "utf-8");
fs.writeFileSync(FILE, content, "utf-8");

console.log("\nFixed " + fixes.length + " fallback patterns");
console.log("Total keys: " + Object.keys(enKeys).length);
