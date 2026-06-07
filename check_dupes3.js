const fs = require('fs');
const content = fs.readFileSync('src/storefront/sections/manifest.ts', 'utf8');

// Find the STOREFRONT_SECTION_MANIFEST object
const manifestStart = content.indexOf('export const STOREFRONT_SECTION_MANIFEST = {');
if (manifestStart === -1) {
  console.log('Manifest not found');
  process.exit(1);
}

// Extract from the start of the manifest to the end of the file
const manifestContent = content.slice(manifestStart);

// Simple approach: find all "variants:" occurrences and parse the array
const variantsRegex = /variants:\s*\[/g;
let match;
let variantCount = 0;

while ((match = variantsRegex.exec(manifestContent)) !== null) {
  variantCount++;
  const startIdx = match.index + match[0].length;
  let bracketCount = 1;
  let endIdx = startIdx;
  
  while (bracketCount > 0 && endIdx < manifestContent.length) {
    if (manifestContent[endIdx] === '[') bracketCount++;
    else if (manifestContent[endIdx] === ']') bracketCount--;
    endIdx++;
  }
  
  const arrayContent = manifestContent.slice(startIdx, endIdx - 1);
  
  // Extract labels
  const labelRegex = /label:\s*"([^"]+)"/g;
  const labels = [];
  let lmatch;
  while ((lmatch = labelRegex.exec(arrayContent)) !== null) {
    labels.push(lmatch[1]);
  }
  
  // Check for duplicates within this array
  const seen = new Set();
  const dupes = labels.filter(l => seen.has(l) || seen.add(l));
  
  if (dupes.length > 0) {
    console.log(`Variant block #${variantCount} has duplicate labels:`, dupes);
    console.log('All labels:', labels);
    console.log('---');
  }
}

console.log(`Total variant blocks found: ${variantCount}`);