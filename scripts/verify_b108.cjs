const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/woocommerce/components/ConnectionStatus.tsx',
  'apps/frontend/src/pages/woocommerce/components/ExportTab.tsx',
  'apps/frontend/src/pages/woocommerce/components/StatusMappingTab.tsx',
  'apps/frontend/src/pages/woocommerce/components/ImportTab.tsx',
  'apps/frontend/src/pages/woocommerce/components/ImportJobProgressBanner.tsx',
  'apps/frontend/src/pages/woocommerce/components/ProductsTab.tsx',
  'apps/frontend/src/pages/woocommerce/components/WooProductItemCard.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

let hasError = false;

for (const rel of files) {
  const fullPath = path.resolve(rel);
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING FILE: ${rel}`);
    hasError = true;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  console.log(`[CHECK] ${rel} -> ${lines.length} lines`);

  if (lines.length > 400) {
    console.error(`  ERROR: Line count ${lines.length} exceeds 400 limit!`);
    hasError = true;
  }

  const emojiMatches = content.match(emojiRegex);
  if (emojiMatches) {
    console.error(`  ERROR: Emoji found: ${emojiMatches[0]}`);
    hasError = true;
  }

  if (content.includes('@heroicons/react')) {
    console.error(`  ERROR: File still contains @heroicons/react!`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\nVerification FAILED!');
  process.exit(1);
} else {
  console.log('\nAll files in Batch 108 PASSED line count & anti-slop checks!');
}
