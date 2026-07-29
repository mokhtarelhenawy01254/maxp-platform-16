const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

function calcDepth(filePath) {
  return path.relative(SRC, filePath).split(/[/\\]/).length - 1;
}

function correctImport(filePath, target) {
  return "../".repeat(calcDepth(filePath)) + target;
}

// Find all files with wrong import paths
function walk(dir) {
  const fixes = [];
  if (!fs.existsSync(dir)) return fixes;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "locales", "__tests__"].includes(entry.name)) {
        fixes.push(...walk(fp));
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.includes(".test.")) {
      try {
        let content = fs.readFileSync(fp, "utf-8");
        let changed = false;
        
        // Fix i18n-toast import
        const tToastPattern = /import \{ tToast \} from ["']([^"']+)["'];?/g;
        let m;
        while ((m = tToastPattern.exec(content)) !== null) {
          const oldPath = m[1];
          const correctPath = correctImport(fp, "utils/i18n-toast");
          if (oldPath !== correctPath) {
            content = content.replace(m[0], 'import { tToast } from "' + correctPath + '";');
            changed = true;
          }
        }
        
        // Fix i18n import (but not from react-i18next or sonner)
        const i18nPattern = /import i18n from ["']([^"']+)["'];?/g;
        while ((m = i18nPattern.exec(content)) !== null) {
          const oldPath = m[1];
          const correctPath = correctImport(fp, "i18n");
          if (oldPath !== correctPath && oldPath !== "i18next" && oldPath !== "react-i18next") {
            content = content.replace(m[0], 'import i18n from "' + correctPath + '";');
            changed = true;
          }
        }
        
        if (changed) {
          fs.writeFileSync(fp, content, "utf-8");
          const rel = path.relative(SRC, fp);
          fixes.push(rel);
        }
      } catch (e) {}
    }
  }
  return fixes;
}

const fixes = walk(SRC);
console.log("Files with fixed import paths: " + fixes.length);
for (const f of fixes) {
  console.log("  " + f);
}