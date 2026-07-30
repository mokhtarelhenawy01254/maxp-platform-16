const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../apps/frontend/src/locales');

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

  const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.json'));
  const merged = {};

  files.sort().forEach(file => {
    const sectionName = path.basename(file, '.json');
    const filePath = path.join(sectionsDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      merged[sectionName] = content;
    } catch (err) {
      console.error(`❌ ERROR in ${lang}/sections/${file}: ${err.message}`);
      process.exit(1);
    }
  });

  const outputPath = path.join(LOCALES_DIR, lang, 'translation.json');
  const output = JSON.stringify(merged, null, 2);

  // Warn if translation.json was manually edited (has keys not in sections)
  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const existingKeys = new Set(getKeys(existing));
    const mergedKeys = new Set(getKeys(merged));
    const lostKeys = [...existingKeys].filter(k => !mergedKeys.has(k));

    if (lostKeys.length > 0) {
      console.warn(`⚠️  WARNING: ${lang}/translation.json has ${lostKeys.length} key(s) not found in sections/.`);
      console.warn(`   These keys were likely edited directly in translation.json and will be OVERWRITTEN.`);
      console.warn(`   To keep them, add them to the matching file in sections/ or create a new section file.`);
      // Backup
      const backupPath = outputPath.replace('.json', '.backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(existing, null, 2), 'utf8');
      console.warn(`   Backup saved to ${lang}/translation.backup.json`);

      // Write scratch report
      const scratchDir = path.join(__dirname, '../scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(
        path.join(scratchDir, `lost-keys-${lang}.json`),
        JSON.stringify(lostKeys, null, 2),
        'utf8'
      );
    }
  }

  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`✓ Merged ${files.length} sections into ${lang}/translation.json (${getKeys(merged).length} keys)`);
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

  const enFiles = fs.readdirSync(enSectionsDir).filter(f => f.endsWith('.json'));
  let filled = 0;

  enFiles.forEach(file => {
    const enPath = path.join(enSectionsDir, file);
    const arPath = path.join(arSectionsDir, file);

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    let arContent = fs.existsSync(arPath) ? JSON.parse(fs.readFileSync(arPath, 'utf8')) : {};
    let changed = false;

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
mergeFiles('en');
mergeFiles('ar');
reportMissingKeys(filled);
console.log('Done!');
