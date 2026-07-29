const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

// SECTION FILE MAP: relative section path -> correct namespace (= filename without ext)
function buildSectionMap() {
  const map = {};
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fp);
      else if (entry.name.endsWith(".json")) {
        const relPath = path.relative(path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections"), fp);
        const ns = path.parse(entry.name).name;
        map[ns.toLowerCase()] = ns;
      }
    }
  }
  walk(path.join(ROOT, "apps", "frontend", "src", "locales", "en", "sections"));
  return map;
}

const sectionMap = buildSectionMap();
console.log("Section names mapped: " + Object.keys(sectionMap).length);

// FIX RULES
const fixes = [];

// Fix 1: Case mismatches in source code namespace prefixes
const caseFixes = {
  "PostComments": "postComments",
  "ProductReviews": "productReviews", 
  "Products": "products",
  "UnifiedCommentsManagement": "unifiedComments",
};

// Fix 2: Super-admin prefix (super-admin_FileName -> FileName)
// and other dir_filename patterns

function findAndFix(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf-8");
  let changed = false;

  // Find all tToast/i18n.t calls with namespace prefixes
  const keyRe = /(?:tToast\.\w+\(|i18n\.t\()["']([a-zA-Z0-9_-]+)\.(\w+)["']/g;
  let m;
  while ((m = keyRe.exec(content)) !== null) {
    const fullNs = m[1];
    const suffix = m[2];
    let correctNs = fullNs;

    // Check case fixes
    for (const [wrong, right] of Object.entries(caseFixes)) {
      if (fullNs === wrong) {
        correctNs = right;
        break;
      }
    }

    // Check underscore patterns (super-admin_FileName -> FileName)
    if (correctNs === fullNs && fullNs.includes("_")) {
      const parts = fullNs.split("_");
      // Try dropping the first part (parentDir)
      const candidate = parts.slice(1).join("_");
      if (sectionMap[candidate.toLowerCase()]) {
        correctNs = candidate;
      }
      // Try just the last part
      const lastOnly = parts[parts.length - 1];
      if (sectionMap[lastOnly.toLowerCase()]) {
        correctNs = lastOnly;
      }
    }

    if (correctNs !== fullNs) {
      const oldStr = '"' + fullNs + '.' + suffix + '"';
      const newStr = '"' + correctNs + '.' + suffix + '"';
      content = content.split(oldStr).join(newStr);
      
      // Also single quotes
      const oldSq = "'" + fullNs + "." + suffix + "'";
      const newSq = "'" + correctNs + "." + suffix + "'";
      content = content.split(oldSq).join(newSq);
      
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf-8");
    return path.relative(SRC, filePath);
  }
  return null;
}

// Scan all source files
function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "locales", "__tests__"].includes(entry.name)) {
        results.push(...walkDir(fp));
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.includes(".test.")) {
      const fixed = findAndFix(fp);
      if (fixed) results.push(fixed);
    }
  }
  return results;
}

const fixed = walkDir(SRC);
console.log("\nFiles fixed: " + fixed.length);
for (const f of fixed) console.log("  " + f);