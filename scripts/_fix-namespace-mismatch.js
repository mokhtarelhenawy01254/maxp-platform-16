/**
 * Repair: Fix namespace mismatch in migrated files
 * Problem: Batch migrator used "module_filename" but translation keys use "filename" only
 * Example: "hooks_useCheckout.msg_bdcc" → "useCheckout.msg_bdcc"
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");
const SECTIONS_EN = path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections");

// Build correct namespace map from section file names
function buildNsMap(dir) {
  const map = new Map();
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fp);
      else if (entry.name.endsWith(".json")) {
        const sectionName = path.parse(entry.name).name; // filename without extension
        const relPath = path.relative(SECTIONS_EN, fp);
        map.set(relPath, sectionName);
      }
    }
  }
  walk(dir);
  return map;
}

const nsMap = buildNsMap(SECTIONS_EN);
console.log("Section names mapped: " + nsMap.size);

// Find all source files that use tToast or i18n.t with wrong namespace
function findMigratedFiles(dir) {
  const results = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", ".git", "locales", "__tests__"].includes(entry.name)) walk(fp);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fp, "utf-8");
          // Find tToast/i18n.t calls with namespace prefix that contains underscore
          const nsRe = /(?:tToast\.\w+\(|i18n\.t\()["']([a-zA-Z_]+_[a-zA-Z]+)\.\w+["']/g;
          let m;
          while ((m = nsRe.exec(content)) !== null) {
            const usedNs = m[1]; // e.g., "hooks_useCheckout"
            // Check if this namespace matches a section file
            const parts = usedNs.split("_");
            // Try to find the correct section name (it should be the last part, or a known pattern)
            const relPath = path.relative(SRC, fp);
            results.push({ file: relPath, fullPath: fp, usedNs });
            break; // One file can have multiple wrong namespaces, but we record it once
          }
        } catch (e) {}
      }
    }
  }
  walk(dir);
  return results;
}

const files = findMigratedFiles(SRC);

// For each file, determine the correct namespace
// The pattern is: section filename = path.parse(sectionFilePath).name = just the filename
// The wrong namespace used is typically: parentDir_filename (e.g., "hooks_useCheckout")
// The correct namespace should be: just the filename

const repairs = [];
for (const { file, fullPath, usedNs } of files) {
  // The correct namespace is the portion after the last underscore
  // But we need to verify it against the section files
  const fileBase = path.parse(file).name; // Source filename without extension
  const fileDir = path.dirname(file);
  
  // Build potential section file path
  const sectionRel = file.replace(/\.(tsx?|jsx?)$/, "") + ".json";
  
  // Find matching section
  let correctNs = null;
  for (const [secRel, secName] of nsMap) {
    if (secRel === sectionRel) {
      correctNs = secName;
      break;
    }
  }
  
  // Fallback: try matching by filename
  if (!correctNs) {
    if (nsMap.has(sectionRel)) {
      correctNs = nsMap.get(sectionRel);
    } else {
      // Last resort: use the source filename as namespace
      correctNs = fileBase;
    }
  }
  
  if (correctNs && correctNs !== usedNs) {
    repairs.push({ file: fullPath, usedNs, correctNs });
  }
}

// Group by file
const byFile = {};
for (const r of repairs) {
  if (!byFile[r.file]) byFile[r.file] = { file: r.file, replacements: [] };
  byFile[r.file].replacements.push(r);
}

console.log("\nFiles to repair: " + Object.keys(byFile).length + "\n");

// Apply repairs
let fixed = 0;
for (const [fp, data] of Object.entries(byFile)) {
  let content = fs.readFileSync(fp, "utf-8");
  let changed = false;
  
  for (const { usedNs, correctNs } of data.replacements) {
    // Replace all occurrences of "usedNs." → "correctNs."
    const oldStr = '"' + usedNs + '.';
    const newStr = '"' + correctNs + '.';
    if (content.includes(oldStr)) {
      content = content.split(oldStr).join(newStr);
      changed = true;
    }
    // Also single quotes
    const oldStrSq = "'" + usedNs + ".";
    const newStrSq = "'" + correctNs + ".";
    if (content.includes(oldStrSq)) {
      content = content.split(oldStrSq).join(newStrSq);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(fp, content, "utf-8");
    const rel = path.relative(SRC, fp);
    console.log("  FIXED: " + rel + " (" + data.replacements.map(r => r.usedNs + "→" + r.correctNs).join(", ") + ")");
    fixed++;
  }
}

console.log("\nTotal files fixed: " + fixed);