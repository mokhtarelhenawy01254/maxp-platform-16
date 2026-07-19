const fs = require('fs');

const data = fs.readFileSync('apps/backend/scripts/swan-import-log.csv', 'utf8').trim().split('\n').slice(1);

const col4 = new Set();
const col5 = new Set();
let sampleLine = null;
let multiPartLine = null;

for (const line of data) {
  const parts = line.split(',');
  if (parts.length > 6 && !multiPartLine) {
    multiPartLine = { line, count: parts.length };
  }
  if (parts[3] === 'return_created') {
    col4.add(parts[4]);
    col5.add(parts.slice(5).join(','));
    if (!sampleLine) sampleLine = line;
  }
}

console.log('Columns detected (split by comma):');
if (multiPartLine) {
  console.log('First line with >6 parts:', multiPartLine.count, multiPartLine.line.slice(0, 200));
}

console.log('\nSample return_created line:', sampleLine);
console.log('parts[4] unique count:', col4.size);
console.log('parts[4] values:', [...col4]);
console.log('parts[5+] unique count:', col5.size);
console.log('Sample cleaned ID:', [...col5][0]);

// Now let's see how many return_failed lines have extra commas
let failSamples = 0;
for (const line of data) {
  if (line.includes('return_failed') && failSamples < 3) {
    console.log('\nFail line:', line.slice(0, 200));
    failSamples++;
  }
}
