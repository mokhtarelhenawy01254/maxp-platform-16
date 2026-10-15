const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/admin/booking/BranchesTab.tsx',
  'apps/frontend/src/pages/admin/booking/DoctorsTab.tsx',
  'apps/frontend/src/pages/admin/booking/ServicesTab.tsx',
  'apps/frontend/src/pages/admin/booking/InvoicesTab.tsx',
  'apps/frontend/src/pages/admin/booking/PriceListsTab.tsx',
  'apps/frontend/src/pages/admin/booking/PriceListModal.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}]/u;

let allPassed = true;

console.log('--- Batch 100 Code Verification ---');

files.forEach(file => {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${file}`);
    allPassed = false;
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  
  if (lines > 400) {
    console.error(`[FAIL] ${file} exceeds 400 lines: ${lines} lines`);
    allPassed = false;
  } else {
    console.log(`[PASS] ${file}: ${lines} lines (< 400)`);
  }

  const match = content.match(emojiRegex);
  if (match) {
    console.error(`[FAIL] ${file} contains emoji: ${match[0]}`);
    allPassed = false;
  } else {
    console.log(`[PASS] ${file}: 0 emojis detected`);
  }
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log('ALL BATCH 100 CODE CHECKS PASSED!');
}
