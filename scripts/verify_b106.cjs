const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/settings/components/OrderWebhookDocsModal.tsx',
  'apps/frontend/src/pages/settings/components/OrderWebhookDocsData.ts',
  'apps/frontend/src/pages/settings/components/OrderWebhookFormModal.tsx',
  'apps/frontend/src/pages/settings/components/OrderWebhookItemCard.tsx',
  'apps/frontend/src/pages/settings/components/OrderWebhookLogsModal.tsx',
  'apps/frontend/src/pages/settings/CheckoutAddressSettingsSection.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

let passed = true;

console.log('=== Batch 106 Modular Verification ===');
for (const file of files) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.error(`[FAIL] File missing: ${file}`);
    passed = false;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  const hasEmoji = emojiRegex.test(content);

  console.log(`- ${path.basename(file)}: ${lines} lines, emoji: ${hasEmoji}`);

  if (lines > 400) {
    console.error(`[FAIL] ${file} exceeds 400 lines: ${lines}`);
    passed = false;
  }
  if (hasEmoji) {
    console.error(`[FAIL] ${file} contains emojis!`);
    passed = false;
  }
}

if (!passed) {
  console.error('\nVerification FAILED!');
  process.exit(1);
} else {
  console.log('\nAll Batch 106 files PASSED (<400 lines and 0 emojis)!');
}
