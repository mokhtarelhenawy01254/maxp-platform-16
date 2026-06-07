const fs = require('fs');
const path = require('path');

const schemaDir = path.join(__dirname, '..', 'backend', 'prisma', 'schema');
const outputFile = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma');

const files = fs.readdirSync(schemaDir)
  .filter(f => f.endsWith('.prisma'))
  .sort((a, b) => {
    // main.prisma should come first (contains datasource + generator)
    if (a === 'main.prisma') return -1;
    if (b === 'main.prisma') return 1;
    return a.localeCompare(b);
  });

let merged = '';
for (const file of files) {
  const content = fs.readFileSync(path.join(schemaDir, file), 'utf8');
  merged += `\n// --- From: ${file} ---\n`;
  merged += content;
  merged += '\n';
}

fs.writeFileSync(outputFile, merged);
console.log(`Merged ${files.length} schema files into prisma/schema.prisma`);
