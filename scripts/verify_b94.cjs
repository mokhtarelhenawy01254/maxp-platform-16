const fs = require('fs');

const files = [
  'apps/frontend/src/pages/dashboard/MainDashboardPage.tsx',
  'apps/frontend/src/pages/Analytics/StoreAnalyticsDashboard.tsx',
  'apps/frontend/src/pages/advertising/CreateABTest.tsx',
  'apps/frontend/src/pages/advertising/CreateABTestVariantsStep.tsx',
  'apps/frontend/src/pages/advertising/CreateABTestReview.tsx',
  'apps/frontend/src/pages/cafe/RecipeManagementPage.tsx',
  'apps/frontend/src/pages/cafe/RecipeModal.tsx',
  'apps/frontend/src/pages/advertising/CatalogDetails.tsx',
  'apps/frontend/src/pages/advertising/CatalogProductsTable.tsx'
];

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

let hasErrors = false;

files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`ERROR: File not found: ${f}`);
    hasErrors = true;
    return;
  }
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  console.log(`${f} -> ${lines} lines`);

  if (lines >= 400) {
    console.error(`ERROR: File exceeds 400 lines limit: ${f} (${lines} lines)`);
    hasErrors = true;
  }

  if (content.includes('@heroicons')) {
    console.error(`ERROR: File still imports @heroicons: ${f}`);
    hasErrors = true;
  }

  if (emojiRegex.test(content)) {
    console.error(`ERROR: File contains emoji: ${f}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error("Batch 94 verification FAILED!");
  process.exit(1);
} else {
  console.log("Batch 94 verification PASSED with 0 errors!");
}
