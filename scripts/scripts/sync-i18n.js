import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../frontend/src/locales');

function syncObject(source, target) {
  const result = {};
  
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = syncObject(source[key], target[key] || {});
    } else {
      // Keep existing translation, or use English as fallback
      result[key] = target[key] !== undefined ? target[key] : source[key];
    }
  }
  
  return result;
}

function syncSections() {
  const enSectionsDir = path.join(LOCALES_DIR, 'en', 'sections');
  const arSectionsDir = path.join(LOCALES_DIR, 'ar', 'sections');

  if (!fs.existsSync(enSectionsDir) || !fs.existsSync(arSectionsDir)) {
    console.error('Sections directories missing.');
    return;
  }

  const enFiles = fs.readdirSync(enSectionsDir).filter(f => f.endsWith('.json'));
  const arFiles = fs.readdirSync(arSectionsDir).filter(f => f.endsWith('.json'));

  // 1. Remove sections in AR that don't exist in EN
  arFiles.forEach(file => {
    if (!enFiles.includes(file)) {
      console.log(`🗑️ Removing extra section: ar/sections/${file}`);
      fs.unlinkSync(path.join(arSectionsDir, file));
    }
  });

  // 2. Sync each section
  enFiles.forEach(file => {
    const enPath = path.join(enSectionsDir, file);
    const arPath = path.join(arSectionsDir, file);

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    let arContent = {};

    if (fs.existsSync(arPath)) {
      arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    } else {
      console.log(`🆕 Creating missing section: ar/sections/${file}`);
    }

    const syncedAr = syncObject(enContent, arContent);
    fs.writeFileSync(arPath, JSON.stringify(syncedAr, null, 2), 'utf8');
  });

  console.log('✅ Sync complete! All AR sections now match EN structure.');
}

syncSections();
