import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function getRelPath(fullPath, baseDir) {
  return path.relative(baseDir, fullPath);
}

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function checkConsistency() {
  const enSectionsDir = path.join(LOCALES_DIR, 'en', 'sections');
  const arSectionsDir = path.join(LOCALES_DIR, 'ar', 'sections');

  const enFiles = findJsonFiles(enSectionsDir);
  const arFiles = findJsonFiles(arSectionsDir);

  const enFileMap = new Map();
  enFiles.forEach(f => enFileMap.set(path.parse(f).name, f));
  const arFileMap = new Map();
  arFiles.forEach(f => arFileMap.set(path.parse(f).name, f));

  const allSections = Array.from(new Set([...enFileMap.keys(), ...arFileMap.keys()])).sort();

  console.log(`--- i18n Section Consistency Check ---`);
  
  let totalMissing = 0;
  let totalExtra = 0;
  let outOfSyncFilesCount = 0;

  allSections.forEach(sectionName => {
    const enFilePath = enFileMap.get(sectionName);
    const arFilePath = arFileMap.get(sectionName);

    if (!enFilePath) {
      console.warn(`[MISSING SECTION] ${sectionName} exists in AR but not in EN`);
      totalExtra++;
      return;
    }

    if (!arFilePath) {
      console.warn(`[MISSING SECTION] ${sectionName} exists in EN but not in AR`);
      totalMissing++;
      return;
    }

    const enData = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
    const arData = JSON.parse(fs.readFileSync(arFilePath, 'utf8'));

    const enKeys = getAllKeys(enData);
    const arKeys = getAllKeys(arData);

    const missingInAr = enKeys.filter(k => !arKeys.includes(k));
    const extraInAr = arKeys.filter(k => !enKeys.includes(k));

    if (missingInAr.length > 0 || extraInAr.length > 0) {
      outOfSyncFilesCount++;
      console.log(`\n📄 Section: ${sectionName}`);
      if (missingInAr.length > 0) {
        console.log(`   🔴 Missing in AR: ${missingInAr.length} keys`);
        missingInAr.forEach(k => console.log(`      - ${k}`));
        totalMissing += missingInAr.length;
      }
      if (extraInAr.length > 0) {
        console.log(`   🟡 Extra in AR: ${extraInAr.length} keys`);
        extraInAr.forEach(k => console.log(`      - ${k}`));
        totalExtra += extraInAr.length;
      }
    }
  });

  console.log(`\n-------------------------------------`);
  console.log(`Summary:`);
  console.log(` - Out-of-sync sections: ${outOfSyncFilesCount}`);
  console.log(` - Total missing keys in AR: ${totalMissing}`);
  console.log(` - Total extra keys in AR: ${totalExtra}`);

  if (totalMissing === 0 && totalExtra === 0) {
    console.log('\n✅ All sections are perfectly in sync!');
  }
}

checkConsistency();
