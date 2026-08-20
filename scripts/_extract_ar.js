const fs = require('fs');
const content = fs.readFileSync('apps/frontend/src/pages/orders/PreparationQueue.tsx', 'utf8');
const lines = content.split('\n');
const ar = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!ar.test(line)) continue;
  const trimmed = line.trim().substring(0, 160);
  const matches = trimmed.match(/['"`][^'"`]{4,}['"`]/g);
  if (!matches) continue;
  for (const m of matches) {
    if (ar.test(m)) {
      console.log((i + 1) + '\t' + m.substring(0, 130));
    }
  }
}
