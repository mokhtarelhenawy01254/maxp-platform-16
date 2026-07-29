/**
 * i18n Lint — CI-ready translation quality checker
 * Usage: node scripts/i18n-lint.js [--ci]
 *   Default: warnings only, exit 0
 *   --ci: errors cause exit 1 (blocks deployment)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SECTIONS_EN = path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections");
const SECTIONS_AR = path.join(ROOT, "apps", "frontend", "src", "locales", "ar", "sections");
const SRC = path.join(ROOT, "apps", "frontend", "src");

const CI = process.argv.includes("--ci");

let errors = 0;
let warnings = 0;

function warn(msg) { warnings++; console.log("  ⚠️  WARN: " + msg); }
function err(msg) { errors++; console.log("  ❌ ERROR: " + msg); }

// -------------------------------------------------
// CHECK 1: Missing Arabic translations (⚠️ EN: marker)
// -------------------------------------------------
console.log("\n🔍 Check 1: Untranslated Arabic keys...");
function findUntranslated(dir, filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  function scan(obj, prefix) {
    for (const k in obj) {
      if (typeof obj[k] === "string" && obj[k].startsWith("⚠️ EN:")) {
        const key = prefix ? prefix + "." + k : k;
        if (CI) err(`Untranslated: ${key} in ${filePath}`);
        else warn(`Untranslated: ${key} (fallback: ${obj[k].replace("⚠️ EN:", "")})`);
      } else if (typeof obj[k] === "object" && obj[k] !== null) {
        scan(obj[k], prefix ? prefix + "." + k : k);
      }
    }
  }
  scan(content, "");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fp);
    else if (entry.name.endsWith(".json")) findUntranslated(dir, fp);
  }
}
walk(SECTIONS_AR);

// -------------------------------------------------
// CHECK 2: Single-brace {var} patterns (should be {{var}})
// -------------------------------------------------
console.log("\n🔍 Check 2: Single-brace interpolation patterns...");
function checkBraces(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    // Only check non-WhatsApp files (they use {var} as template hints)
    if (filePath.includes("whatsappJourney") || filePath.includes("whatsappNotify") ||
        filePath.includes("whatsappLeadFollowup") || filePath.includes("whatsappSettings")) continue;
    
    const matches = lines[i].match(/(?<!\{)\{([a-z_][a-z0-9_]*)\}(?!\})/g);
    if (matches) {
      for (const m of matches) {
        const relPath = path.relative(ROOT, filePath);
        if (CI) err(`Single-brace: ${m} in ${relPath}:${i+1}`);
        else warn(`Single-brace: ${m} in ${relPath}:${i+1}`);
      }
    }
  }
}
walk(SECTIONS_EN);
walk(SECTIONS_AR);

// -------------------------------------------------
// CHECK 3: English text in Arabic translation files
// -------------------------------------------------
console.log("\n🔍 Check 3: English text in Arabic translations...");
function checkEnglishInAr(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  // Skip translation.json (generated file) and backup files
  if (filePath.includes("translation.json") || filePath.includes("backup")) return;
  
  // Look for English sentences in translation values (3+ words)
  const matches = content.match(/"[a-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}[^"]*"/gi);
  if (matches) {
    for (const m of matches) {
      // Skip intentional English (like "SKILL.md", "JSON", "API", "Eng" labels)
      if (/"(SKILL|JSON|API|OS|UI|SEO|OTP|EGP|URL|ID|DNS|CSV|HTML|CSS|MB|GB|JPG|PNG|GIF|GMT|UTC|OK|App|Web|POS|HR|MR|Mrs|ShieldCheck|BuildingOffice)"/i.test(m)) continue;
      // Skip keys that are clearly English labels (like language switch names)
      if (m === '"English"' || m === '"Arabic"') continue;
      
      const relPath = path.relative(ROOT, filePath);
      if (CI) err(`English in AR: ${m.slice(0, 60)} in ${relPath}`);
      else warn(`English in AR: ${m.slice(0, 60)} in ${relPath}`);
    }
  }
}
walk(SECTIONS_AR);

// -------------------------------------------------
// CHECK 4: Section key parity
// -------------------------------------------------
console.log("\n🔍 Check 4: EN/AR key parity...");
function getKeys(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const keys = new Set();
  function collect(obj, prefix) {
    for (const k in obj) {
      const fullKey = prefix ? prefix + "." + k : k;
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        collect(obj[k], fullKey);
      } else {
        keys.add(fullKey);
      }
    }
  }
  collect(content, "");
  return keys;
}

const enSectionFiles = [];
const arSectionFiles = [];
function collectFiles(dir, arr) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(fp, arr);
    else if (entry.name.endsWith(".json")) arr.push(fp);
  }
}
collectFiles(SECTIONS_EN, enSectionFiles);
collectFiles(SECTIONS_AR, arSectionFiles);

const enFileMap = new Map(enSectionFiles.map(f => [path.relative(SECTIONS_EN, f), f]));
const arFileMap = new Map(arSectionFiles.map(f => [path.relative(SECTIONS_AR, f), f]));

for (const [rel, fp] of enFileMap) {
  if (!arFileMap.has(rel)) {
    err(`Missing AR section: ${rel}`);
  } else {
    const enKeys = getKeys(fp);
    const arKeys = getKeys(arFileMap.get(rel));
    if (enKeys && arKeys) {
      for (const k of enKeys) {
        if (!arKeys.has(k)) {
          if (CI) err(`Key missing in AR: ${k} (${rel})`);
          else warn(`Key missing in AR: ${k} (${rel})`);
        }
      }
    }
  }
}

  // Also check AR->EN (extra keys in AR that don't exist in EN)
  for (const [rel, fp] of arFileMap) {
    if (!enFileMap.has(rel)) {
      if (CI) err(Orphan AR section (no EN counterpart): );
      else warn(Orphan AR section (no EN counterpart): );
    } else {
      const enKeys = getKeys(enFileMap.get(rel));
      const arKeys = getKeys(fp);
      if (enKeys && arKeys) {
        for (const k of arKeys) {
          if (!enKeys.has(k)) {
            if (CI) err(Extra key in AR (missing from EN):  ());
            else warn(Extra key in AR (missing from EN):  ());
          }
        }
      }
    }
  }

// -------------------------------------------------
// Summary
// -------------------------------------------------
console.log("\n" + "=".repeat(50));
console.log(`Lint complete: ${errors} errors, ${warnings} warnings`);

if (CI && errors > 0) {
  console.log("❌ CI check FAILED — " + errors + " errors found");
  process.exit(1);
} else if (CI) {
  console.log("✅ CI check PASSED");
  process.exit(0);
} else {
  console.log(errors > 0 ? "❌ Run with --ci to block deployment" : "✅ All checks passed");
}