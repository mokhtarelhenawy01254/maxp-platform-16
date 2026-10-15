const fs = require('fs');
const path = require('path');

const files = [
  'apps/frontend/src/pages/admin/booking/InsuranceCompaniesTab.tsx',
  'apps/frontend/src/pages/admin/booking/MemberTypesTab.tsx',
  'apps/frontend/src/pages/admin/booking/WorkflowPage.tsx',
  'apps/frontend/src/pages/admin/booking/WorkflowStatusBadge.tsx',
  'apps/frontend/src/pages/admin/booking/BookingReportsTab.tsx',
  'apps/frontend/src/pages/admin/booking/BookingReportViews.tsx',
  'apps/frontend/src/pages/admin/booking/OperationsPage.tsx',
  'apps/frontend/src/pages/admin/booking/OperationsLabelsTab.tsx',
  'apps/frontend/src/pages/admin/booking/OperationsDeliveriesTab.tsx',
  'apps/frontend/src/pages/admin/booking/OperationsTransactionsTab.tsx',
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

let hasErrors = false;

files.forEach(file => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING: ${file}`);
    hasErrors = true;
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n').length;
  console.log(`${file}: ${lines} lines`);
  if (lines > 400) {
    console.error(`ERROR: ${file} exceeds 400 lines (${lines})`);
    hasErrors = true;
  }
  if (emojiRegex.test(content)) {
    console.error(`ERROR: ${file} contains emojis`);
    hasErrors = true;
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('ALL BATCH 101 FILES COMPLY WITH SIZE & ZERO-EMOJI LAWS!');
}
