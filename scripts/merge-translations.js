const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../apps/frontend/src/locales');

function findJsonFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const k = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], k));
    } else {
      keys.push(k);
    }
  }
  return keys;
}

function mergeFiles(lang) {
  const sectionsDir = path.join(LOCALES_DIR, lang, 'sections');
  if (!fs.existsSync(sectionsDir)) {
    console.log(`Sections directory not found for ${lang}: ${sectionsDir}`);
    return;
  }

  const files = findJsonFiles(sectionsDir);
  const merged = {};

  files.forEach(filePath => {
    const sectionName = path.parse(filePath).name;
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    merged[sectionName] = content;
  });

  const outputPath = path.join(LOCALES_DIR, lang, 'translation.json');
  const output = JSON.stringify(merged, null, 2);

  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const existingKeys = new Set(getKeys(existing));
    const mergedKeys = new Set(getKeys(merged));
    const lostKeys = [...existingKeys].filter(k => !mergedKeys.has(k));

    if (lostKeys.length > 0) {
      console.warn(`⚠️  WARNING: ${lang}/translation.json has ${lostKeys.length} key(s) not found in sections/.`);
      console.warn(`   These keys will be OVERWRITTEN.`);
      const backupPath = outputPath.replace('.json', '.backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2), 'utf8');
      console.warn(`   Backup saved to ${lang}/translation.backup.json`);
    }
  }

  fs.writeFileSync(outputPath, output, 'utf8');
  const allKeys = getKeys(merged);
  console.log(`  ${files.length} files → ${allKeys.length} keys`);
}

function setKey(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function syncArFromEn() {
  const enSectionsDir = path.join(LOCALES_DIR, 'en', 'sections');
  const arSectionsDir = path.join(LOCALES_DIR, 'ar', 'sections');

  if (!fs.existsSync(enSectionsDir) || !fs.existsSync(arSectionsDir)) return [];

  const enFiles = findJsonFiles(enSectionsDir);
  let filled = 0;

  enFiles.forEach(enPath => {
    const relPath = path.relative(enSectionsDir, enPath);
    const arPath = path.join(arSectionsDir, relPath);
    const arDir = path.dirname(arPath);

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    let arContent = fs.existsSync(arPath) ? JSON.parse(fs.readFileSync(arPath, 'utf8')) : {};
    let changed = false;

    if (!fs.existsSync(arDir)) {
      fs.mkdirSync(arDir, { recursive: true });
    }

    const enKeys = getKeys(enContent);
    const arKeys = new Set(getKeys(arContent));

    enKeys.forEach(k => {
      if (!arKeys.has(k)) {
        const val = k.split('.').reduce((o, p) => o?.[p], enContent);
        if (val !== undefined) {
          setKey(arContent, k, `[AR] ${val}`);
          filled++;
          changed = true;
        }
      }
    });

    if (changed) {
      fs.writeFileSync(arPath, JSON.stringify(arContent, null, 2), 'utf8');
    }
  });

  return filled;
}

function reportMissingKeys(filled) {
  const enPath = path.join(LOCALES_DIR, 'en', 'translation.json');
  const arPath = path.join(LOCALES_DIR, 'ar', 'translation.json');
  if (!fs.existsSync(enPath) || !fs.existsSync(arPath)) return;

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const enKeys = new Set(getKeys(en));
  const arKeys = new Set(getKeys(ar));
  const missingFromAr = [...enKeys].filter(k => !arKeys.has(k));

  if (filled > 0) {
    console.log(`ℹ️  Auto-filled ${filled} missing AR key(s) from EN (marked with [AR] prefix)`);
  }

  if (missingFromAr.length > 0) {
    console.warn(`⚠️  AR is still missing ${missingFromAr.length} key(s) that exist in EN:`);
    missingFromAr.slice(0, 10).forEach(k => console.warn(`   - ${k}`));
    if (missingFromAr.length > 10) console.warn(`   ... and ${missingFromAr.length - 10} more`);
  }
}

console.log('Merging translations...');
const filled = syncArFromEn();
console.log(`\nEN:`);
mergeFiles('en');
console.log(`\nAR:`);
mergeFiles('ar');
reportMissingKeys(filled);
console.log('\nDone!');
