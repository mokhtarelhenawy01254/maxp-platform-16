const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../apps/frontend/src/locales');

function mergeFiles(lang) {
  const sectionsDir = path.join(LOCALES_DIR, lang, 'sections');
  if (!fs.existsSync(sectionsDir)) {
    console.log(`Sections directory not found for ${lang}: ${sectionsDir}`);
    return;
  }

  const files = fs.readdirSync(sectionsDir).filter(f => f.endsWith('.json'));
  const merged = {};

  // Sort files to ensure deterministic output
  files.sort().forEach(file => {
    const sectionName = path.basename(file, '.json');
    const content = JSON.parse(fs.readFileSync(path.join(sectionsDir, file), 'utf8'));
    merged[sectionName] = content;
  });

  const outputPath = path.join(LOCALES_DIR, lang, 'translation.json');
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Merged ${files.length} sections into ${lang}/translation.json`);
}

console.log('Merging translations...');
mergeFiles('en');
mergeFiles('ar');
console.log('Done!');
