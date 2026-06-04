import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../frontend/src/locales');

function splitFile(lang) {
  const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const sectionsDir = path.join(LOCALES_DIR, lang, 'sections');
  if (!fs.existsSync(sectionsDir)) {
    fs.mkdirSync(sectionsDir, { recursive: true });
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  for (const [key, value] of Object.entries(content)) {
    const sectionPath = path.join(sectionsDir, `${key}.json`);
    fs.writeFileSync(sectionPath, JSON.stringify(value, null, 2), 'utf8');
    console.log(`Created section: ${key}.json for ${lang}`);
  }
}

console.log('Splitting translations...');
splitFile('en');
splitFile('ar');
console.log('Done!');
