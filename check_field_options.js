const fs = require('fs');
const content = fs.readFileSync('src/storefront/sections/manifest.ts', 'utf8');

// Find the STOREFRONT_SECTION_MANIFEST object
const manifestStart = content.indexOf('export const STOREFRONT_SECTION_MANIFEST = {');
if (manifestStart === -1) {
  console.log('Manifest not found');
  process.exit(1);
}

const manifestContent = content.slice(manifestStart);

// Find all "options:" occurrences in field definitions
const optionsRegex = /options:\s*\[/g;
let match;
let optionsCount = 0;
let foundAnyDupes = false;

while ((match = optionsRegex.exec(manifestContent)) !== null) {
  optionsCount++;
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
  
  // Check for duplicates
  const seen = new Set();
  const dupes = [];
  for (const l of labels) {
    if (seen.has(l)) {
      dupes.push(l);
    } else {
      seen.add(l);
    }
  }
  
  if (dupes.length > 0) {
    console.log(`Options block #${optionsCount} has ${dupes.length} duplicate label(s):`, dupes);
    console.log('All labels:', labels);
    foundAnyDupes = true;
  }
}

if (!foundAnyDupes) {
  console.log('✅ No duplicate select field option labels found!');
}
console.log(`Total options blocks checked: ${optionsCount}`);