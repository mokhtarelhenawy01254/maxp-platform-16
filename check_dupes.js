const fs = require('fs');
const content = fs.readFileSync('src/storefront/sections/manifest.ts', 'utf8');

const variantRegex = /variants:\s*\[([\s\S]*?)\]/g;
let match;
while ((match = variantRegex.exec(content)) !== null) {
  const block = match[1];
  const labelRegex = /label:\s*"([^"]+)"/g;
  const labels = [];
  let lmatch;
  while ((lmatch = labelRegex.exec(block)) !== null) {
    labels.push(lmatch[1]);
  }
  const seen = new Set();
  const dupes = labels.filter(l => seen.has(l) || seen.add(l));
  if (dupes.length > 0) {
    console.log('Duplicates found:', dupes);
    console.log('---');
  }
}