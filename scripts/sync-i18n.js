import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../apps/frontend/src/locales');

function findJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
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

function syncObject(source, target) {
  const result = {};
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = syncObject(source[key], target[key] || {});
    } else {
      result[key] = target[key] !== undefined ? target[key] : '\u26A0\uFE0F EN:' + source[key];
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

  const enFiles = findJsonFiles(enSectionsDir);

  // Build map of AR files by relative path
  const arFileMap = new Map();
  const arFiles = findJsonFiles(arSectionsDir);
  arFiles.forEach(f => {
    const relPath = path.relative(arSectionsDir, f);
    arFileMap.set(relPath, f);
  });

  // Build set of EN files (for cleanup)
  const enRelPaths = new Set();
  enFiles.forEach(f => enRelPaths.add(path.relative(enSectionsDir, f)));

  // 1. Remove AR files that don't exist in EN
  arFiles.forEach(f => {
    const relPath = path.relative(arSectionsDir, f);
    if (!enRelPaths.has(relPath)) {
      console.log(`🗑️ Removing extra section: ar/sections/${relPath}`);
      fs.unlinkSync(f);
    }
  });

  // 2. Sync each section
  enFiles.forEach(enPath => {
    const relPath = path.relative(enSectionsDir, enPath);
    const arPath = path.join(arSectionsDir, relPath);
    const arDir = path.dirname(arPath);

    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    let arContent = {};

    if (fs.existsSync(arPath)) {
      arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    } else {
      console.log(`🆕 Creating missing section: ar/sections/${relPath}`);
      if (!fs.existsSync(arDir)) {
        fs.mkdirSync(arDir, { recursive: true });
      }
    }

    const syncedAr = syncObject(enContent, arContent);
    fs.writeFileSync(arPath, JSON.stringify(syncedAr, null, 2), 'utf8');
  });

  console.log('✅ Sync complete! All AR sections now match EN structure.');
}

syncSections();
