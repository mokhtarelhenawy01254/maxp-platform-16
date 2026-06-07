// scripts/replace-arabic-with-i18n.js

/**
 * Simple script to replace Arabic string literals in .js files with i18n.t calls.
 * It scans the repository for Arabic Unicode characters in string literals, generates a key based on a hash,
 * and updates the file and translation JSON files.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const projectRoot = process.cwd(); // Use current working directory as project root

const enFile = path.join(projectRoot, 'backend', 'src', 'locales', 'en', 'translation.json');
const arFile = path.join(projectRoot, 'backend', 'src', 'locales', 'ar', 'translation.json');

let enTranslations = {};
let arTranslations = {};
if (fs.existsSync(enFile)) enTranslations = JSON.parse(fs.readFileSync(enFile, 'utf8'));
if (fs.existsSync(arFile)) arTranslations = JSON.parse(fs.readFileSync(arFile, 'utf8'));

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function generateKey(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex').slice(0, 8);
  return `msg.${hash}`;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // 1️⃣ Replace Arabic literals in single or double quotes
  const regex = /(["'])([^"'\\\\]*[\u0600-\u06FF][^"'\\\\]*)\1/g;
  let match;
  let newContent = content;
  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0];
    const quote = match[1];
    const arabicStr = match[2];
    const key = generateKey(arabicStr);
    if (!enTranslations[key]) enTranslations[key] = arabicStr;
    if (!arTranslations[key]) arTranslations[key] = arabicStr;
    const replacement = `i18n.t('${key}')`;
    newContent = newContent.replace(fullMatch, replacement);
  }

  // 2️⃣ Handle back‑ticked template literals – replace Arabic fragments while preserving ${} placeholders
  const backtickRegex = /`([^`]*[\u0600-\u06FF][^`]*)`/g;
  let btMatch;
  while ((btMatch = backtickRegex.exec(newContent)) !== null) {
    const fullBacktick = btMatch[0]; // includes the backticks
    const inner = btMatch[1];
    const parts = inner.split(/(\$\{[^}]+\})/g);
    const replacedParts = parts.map(part => {
      if (/^\$\{/.test(part)) return part;
        if (/[\u0600-\u06FF]/.test(part)) {
          const key = generateKey(part);
          if (!enTranslations[key]) enTranslations[key] = part;
          if (!arTranslations[key]) arTranslations[key] = part;
          return '${i18n.t(\'' + key + '\')}';
        }
      return part;
    });
    const newBacktick = '`' + replacedParts.join('') + '`';
    newContent = newContent.replace(fullBacktick, newBacktick);
  }

  if (newContent !== content) {
    // Ensure i18n is required at top
    if (!/require\(['"]\.\/i18n['"]\)/.test(newContent)) {
      const lines = newContent.split('\n');
      lines.splice(0, 0, "const { t: i18n } = require('./i18n');");
      newContent = lines.join('\n');
    }
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Processed ${filePath}`);
  }
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue; // skip node_modules
      if (fullPath.includes('$RECYCLE.BIN') || fullPath.includes('System Volume Information')) continue;
      walk(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.ts'))) {
      processFile(fullPath);
    }
  }
}


walk(projectRoot);
// Write back translation files
fs.writeFileSync(enFile, JSON.stringify(enTranslations, null, 2), 'utf8');
fs.writeFileSync(arFile, JSON.stringify(arTranslations, null, 2), 'utf8');
console.log('Translation files updated.');
