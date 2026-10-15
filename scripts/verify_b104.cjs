const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/admin/booking/CategoryModal.tsx',
  'apps/frontend/src/pages/admin/booking/DoctorAvailabilityModal.tsx',
  'apps/frontend/src/pages/admin/booking/DoctorModal.tsx',
  'apps/frontend/src/pages/admin/booking/InvoiceModal.tsx',
  'apps/frontend/src/pages/admin/booking/PaymentModal.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/u;

let allPassed = true;

for (const rel of files) {
  const fullPath = path.resolve(rel);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${rel}`);
    allPassed = false;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;
  console.log(`[CHECK] ${rel}: ${lineCount} lines`);

  if (lineCount > 400) {
    console.error(`  [ERROR] Exceeds 400 lines (${lineCount} > 400)`);
    allPassed = false;
  }

  let emojiFound = false;
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      console.error(`  [EMOJI] Line ${idx + 1}: ${line.trim()}`);
      emojiFound = true;
      allPassed = false;
    }
  });

  if (!emojiFound && lineCount <= 400) {
    console.log(`  [OK] Lines < 400, 0 emojis`);
  }
}

if (!allPassed) {
  console.error('\nVerification FAILED!');
  process.exit(1);
} else {
  console.log('\nAll 5 Batch 104 files PASSED verification!');
}
