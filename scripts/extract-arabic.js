const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/settings/OrderInvoiceSettings.tsx',
  'apps/frontend/src/pages/admin/OrderInvoices.tsx',
  'apps/frontend/src/pages/pos/PosPage.tsx',
  'apps/frontend/src/pages/orders/PreparationQueue.tsx',
  'apps/frontend/src/pages/admin/ManualOrder/ManualOrderPage.tsx',
  'apps/frontend/src/pages/admin/ManualOrder/components/CartColumn.tsx',
  'apps/frontend/src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx',
  'apps/frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx'
];

const projectRoot = path.join(__dirname, '..');

files.forEach(relPath => {
  const filePath = path.join(projectRoot, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${relPath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const arabicStrings = new Set();

  // 1. Matches in double/single quotes/backticks
  const quoteRegex = /(["'`])([^"'`\n\r]*[\u0600-\u06FF][^"'`\n\r]*)\1/g;
  let match;
  while ((match = quoteRegex.exec(content)) !== null) {
    arabicStrings.add(match[2].trim());
  }

  // 2. Matches in JSX text nodes
  const jsxRegex = />([^<>\n\r]*[\u0600-\u06FF][^<>\n\r]*)</g;
  while ((match = jsxRegex.exec(content)) !== null) {
    arabicStrings.add(match[1].trim());
  }

  console.log(`\n📄 File: ${relPath} (${arabicStrings.size} Arabic strings)`);
  Array.from(arabicStrings).slice(0, 10).forEach(str => {
    console.log(`  - ${str}`);
  });
  if (arabicStrings.size > 10) {
    console.log(`  ... and ${arabicStrings.size - 10} more`);
  }
});
