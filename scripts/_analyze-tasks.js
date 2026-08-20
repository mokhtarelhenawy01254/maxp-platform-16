const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "apps", "frontend", "src", "pages", "tasks", "Tasks.tsx");

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

const content = fs.readFileSync(FILE, "utf-8");
const lines = content.split(/\r?\n/);

// Imports
console.log("=== Imports ===");
for (let i = 0; i < 60; i++) {
  if (/toast|sonner|i18n|useTranslation|useLocalizedText/i.test(lines[i])) {
    console.log("  L" + i + ": " + lines[i].trim());
  }
}

// Count patterns
let sq = 0, dq = 0, bt = 0, ge = 0, al = 0;
const sqRe = /toast\.\w+\s*\(\s*'([^']*[\u0600-\u06FF][^']*)'/g;
const dqRe = /toast\.\w+\s*\(\s*"([^"]*[\u0600-\u06FF][^"]*)"/g;
const btRe = /toast\.\w+\s*\(\s*`([^`]*[\u0600-\u06FF][^`]*)`/g;
let m;
while ((m = sqRe.exec(content)) !== null) sq++;
while ((m = dqRe.exec(content)) !== null) dq++;
while ((m = btRe.exec(content)) !== null) bt++;
ge = (content.match(/getErrorMessage/g) || []).length;
al = (content.match(/alert\s*\(\s*["'`][^"'`]*[\u0600-\u06FF]/g) || []).length;

console.log("\n=== Patterns ===");
console.log("  Single-quote toast: " + sq);
console.log("  Double-quote toast: " + dq);
console.log("  Template toast: " + bt);
console.log("  getErrorMessage: " + ge);
console.log("  alert: " + al);
console.log("  Total lines: " + lines.length);

// Show a few sample strings
const allRe = /toast\.\w+\s*\(\s*['"]([^'"`]*[\u0600-\u06FF][^'"`]*)['"]/g;
console.log("\n=== Sample Arabic strings ===");
let count = 0;
while ((m = allRe.exec(content)) !== null) {
  count++;
  if (count <= 10) console.log("  " + m[0].slice(0, 80));
}
console.log("  ... (" + count + " total)");

// Check if it already uses tToast
if (content.includes("tToast")) console.log("\n⚠ Already uses tToast!");
if (content.includes("useTranslation")) console.log("✓ Already imports useTranslation");
if (content.includes("react-i18next")) console.log("✓ Already imports react-i18next");
