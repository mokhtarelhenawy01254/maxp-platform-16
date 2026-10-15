const fs = require('fs');
const path = require('path');

const filesToVerify = [
  'apps/frontend/src/pages/admin/BookingManagementPage.tsx',
  'apps/frontend/src/pages/admin/booking/BookingManagementHeader.tsx',
  'apps/frontend/src/pages/admin/booking/BookingConfirmModals.tsx',
  'apps/frontend/src/pages/admin/booking/BookingTabRouter.tsx',
  'apps/frontend/src/pages/admin/booking/useBookingOperations.ts',
  'apps/frontend/src/pages/admin/booking/DashboardTab.tsx',
  'apps/frontend/src/pages/admin/booking/AppointmentsFilterBar.tsx',
  'apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx',
  'apps/frontend/src/pages/admin/booking/CalendarTab.tsx',
  'apps/frontend/src/pages/admin/booking/PatientsTab.tsx',
];

// Emoji regex covering emojis and unicode symbols
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

let failed = false;

console.log('=== Batch 99 Verification ===');

for (const relPath of filesToVerify) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: File not found: ${relPath}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const lineCount = lines.length;

  console.log(`Checking ${relPath}: ${lineCount} lines...`);
  if (lineCount > 400) {
    console.error(`  ❌ FAILED line count rule (> 400 lines): ${lineCount} lines!`);
    failed = true;
  } else {
    console.log(`  ✓ Passed line count (< 400 lines).`);
  }

  const emojisFound = [];
  lines.forEach((line, idx) => {
    const match = line.match(emojiRegex);
    if (match) {
      emojisFound.push({ lineNum: idx + 1, char: match[0], text: line.trim() });
    }
  });

  if (emojisFound.length > 0) {
    console.error(`  ❌ FAILED zero-emoji rule! Found ${emojisFound.length} emoji(s):`);
    emojisFound.forEach((e) => console.error(`    Line ${e.lineNum}: [${e.char}] ${e.text}`));
    failed = true;
  } else {
    console.log(`  ✓ Passed zero-emoji check.`);
  }
}

if (failed) {
  console.error('\n❌ Verification FAILED!');
  process.exit(1);
} else {
  console.log('\n✅ All Batch 99 files passed verification (0 emojis, all < 400 lines)!');
  process.exit(0);
}
