// scripts/scan-hardcoded-arabic.js
// SAFE: Read only. Generates a CSV report of hardcoded Arabic strings.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCAN_DIR = path.join(PROJECT_ROOT, "apps", "frontend", "src");
const OUT_DIR = path.join(PROJECT_ROOT, "reports");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUTPUT_CSV = path.join(OUT_DIR, "hardcoded-arabic-strings.csv");
const OUTPUT_JSON = path.join(OUT_DIR, "hardcoded-arabic-strings.json");

const EXCLUDE = new Set(["node_modules", ".git", "dist", "build", "locales"]);

function isArabic(text) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

function extract(filePath) {
  const results = [];
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    const alertRe = /alert\s*\(\s*(["'`])([\s\S]*?)\1\s*\)/g;
    let m;
    while ((m = alertRe.exec(line)) !== null) {
      if (isArabic(m[2])) results.push({ file: path.relative(SCAN_DIR, filePath), line: ln, category: "alert", string: m[2].replace(/\n/g, "\\n") });
    }

    const toastRe = /(?:toast|showToast|enqueueToast)\s*\.\s*(?:error|success|warning|info|loading)\s*\(\s*(["'`])([\s\S]*?)\1/g;
    while ((m = toastRe.exec(line)) !== null) {
      if (isArabic(m[2])) results.push({ file: path.relative(SCAN_DIR, filePath), line: ln, category: "toast", string: m[2].replace(/\n/g, "\\n") });
    }

    const consoleRe = /console\s*\.\s*(?:error|warn|log|debug|info)\s*\(\s*(["'`])([\s\S]*?)\1/g;
    while ((m = consoleRe.exec(line)) !== null) {
      if (isArabic(m[2])) results.push({ file: path.relative(SCAN_DIR, filePath), line: ln, category: "console", string: m[2].replace(/\n/g, "\\n") });
    }
  }
  return results;
}

function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE.has(entry.name) && entry.name.indexOf("__tests__") === -1 && entry.name.indexOf(".test") === -1) {
        results.push(...walk(fp));
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !entry.name.includes(".test.") && !entry.name.endsWith(".d.ts")) {
      try { results.push(...extract(fp)); } catch (e) {}
    }
  }
  return results;
}

console.log("Scanning for hardcoded Arabic...");
const results = walk(SCAN_DIR);

const byCat = {};
for (const r of results) {
  if (!byCat[r.category]) byCat[r.category] = [];
  byCat[r.category].push(r);
}

const byFile = {};
for (const r of results) {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
}
const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);

console.log("\n=== Hardcoded Arabic Strings ===");
console.log("Total: " + results.length);
for (const [cat, items] of Object.entries(byCat)) {
  console.log("  " + cat + ": " + items.length);
}

console.log("\n=== Top 25 Files ===");
for (const [file, items] of sorted.slice(0, 25)) {
  console.log("  " + String(items.length).padStart(4) + " | " + file);
}

let csv = "file,line,category,string\n";
for (const r of results) {
  csv += r.file + "," + r.line + "," + r.category + ',"' + r.string.replace(/"/g, '""') + '"\n';
}
fs.writeFileSync(OUTPUT_CSV, csv, "utf-8");
fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ total: results.length, byCategory: byCat }, null, 2), "utf-8");

console.log("\nCSV: " + OUTPUT_CSV);
console.log("JSON: " + OUTPUT_JSON);
