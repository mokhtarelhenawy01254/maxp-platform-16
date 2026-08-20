/**
 * Repair: Add missing i18n / tToast imports to migrated files
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "apps", "frontend", "src");

function findDepth(filePath) {
  const rel = path.relative(SRC, filePath);
  const parts = rel.split(/[/\\]/);
  return parts.length - 1; // 0 = in src/, 1 = in src/pages/, etc.
}

function makeRelativeImport(filePath, target) {
  // target: "utils/i18n-toast" or "i18n"
  const depth = findDepth(filePath);
  const prefix = "../".repeat(depth);
  return prefix + target;
}

// Scan all files
function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".git", "locales", "__tests__"].includes(entry.name)) {
        results.push(...walk(fp));
      }
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      try {
        const content = fs.readFileSync(fp, "utf-8");
        const needs = {
          needsTToast: content.includes("tToast.") && !content.includes("i18n-toast"),
          needsI18n: (content.match(/i18n\.t\(/g) || []).length > 0 && !content.includes("import i18n from") && !content.includes("useTranslation"),
        };
        if (needs.needsTToast || needs.needsI18n) {
          results.push({ file: fp, ...needs });
        }
      } catch (e) {}
    }
  }
  return results;
}

const all = walk(SRC);
console.log("Missing tToast import: " + all.filter(f => f.needsTToast).length);
console.log("Missing i18n import: " + all.filter(f => f.needsI18n).length);

let fixed = 0;
for (const { file, needsTToast, needsI18n } of all) {
  let content = fs.readFileSync(file, "utf-8");
  let changed = false;
  
  if (needsTToast) {
    const tToastImport = 'import { tToast } from "' + makeRelativeImport(file, "utils/i18n-toast") + '";';
    // Insert after sonner import, or after React import
    if (content.includes('from "sonner"') || content.includes("from 'sonner'")) {
      content = content.replace(
        /(import \{ toast[^}]*\} from ["']sonner["'];?)/,
        '$1\n' + tToastImport
      );
    } else {
      // Insert after first import
      content = content.replace(
        /(import [^;]+;)/,
        '$1\n' + tToastImport
      );
    }
    changed = true;
  }
  
  if (needsI18n) {
    const i18nImport = 'import i18n from "' + makeRelativeImport(file, "i18n") + '";';
    // Check if useTranslation is used but i18n not destructured
    if (content.includes("useTranslation")) {
      // Change const { t } = useTranslation() to const { t, i18n } = useTranslation()
      if (content.includes("const { t } = useTranslation()")) {
        content = content.replace(
          "const { t } = useTranslation()",
          "const { t, i18n } = useTranslation()"
        );
      } else if (content.match(/const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\)/)) {
        content = content.replace(
          /const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\)/,
          'const { t, i18n } = useTranslation()'
        );
      }
    } else {
      // Add direct import
      if (content.includes('from "sonner"') || content.includes("from 'sonner'")) {
        content = content.replace(
          /(import \{ toast[^}]*\} from ["']sonner["'];?)/,
          '$1\n' + i18nImport
        );
      } else {
        content = content.replace(
          /(import [^;]+;)/,
          '$1\n' + i18nImport
        );
      }
    }
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content, "utf-8");
    const rel = path.relative(SRC, file);
    const what = [needsTToast && "tToast", needsI18n && "i18n"].filter(Boolean).join("+");
    console.log("  " + rel + " (+" + what + ")");
    fixed++;
  }
}

console.log("\nFiles fixed: " + fixed);
