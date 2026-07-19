import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../apps/frontend/src/locales');

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

  const enFiles = fs.readdirSync(enSectionsDir).filter(f => f.endsWith('.json'));
  const arFiles = fs.readdirSync(arSectionsDir).filter(f => f.endsWith('.json'));

  const allSections = Array.from(new Set([...enFiles, ...arFiles])).sort();

  console.log(`--- i18n Section Consistency Check ---`);
  
  let totalMissing = 0;
  let totalExtra = 0;
  let outOfSyncFilesCount = 0;

  allSections.forEach(file => {
    const enFilePath = path.join(enSectionsDir, file);
    const arFilePath = path.join(arSectionsDir, file);

    const enExists = fs.existsSync(enFilePath);
    const arExists = fs.existsSync(arFilePath);

    if (!enExists) {
      console.warn(`[MISSING SECTION] ${file} exists in AR but not in EN`);
      totalExtra++;
      return;
    }

    if (!arExists) {
      console.warn(`[MISSING SECTION] ${file} exists in EN but not in AR`);
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
      console.log(`\n📄 Section: ${file}`);
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
