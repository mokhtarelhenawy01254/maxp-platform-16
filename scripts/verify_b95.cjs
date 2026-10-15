const fs = require('fs');

const files = [
  'apps/frontend/src/pages/auth/AcceptInvitation.tsx',
  'apps/frontend/src/pages/auth/ResetPassword.tsx',
  'apps/frontend/src/pages/affiliates/CompanyProviderDetail.tsx',
  'apps/frontend/src/pages/affiliates/CompanyProviderTabs.tsx',
  'apps/frontend/src/pages/shipping/couriers/CourierSettlementPage.tsx',
  'apps/frontend/src/pages/shipping/couriers/CourierSettlementForm.tsx',
  'apps/frontend/src/pages/advertising/CreateAd.tsx',
  'apps/frontend/src/pages/advertising/CreateAdStepsNav.tsx',
  'apps/frontend/src/pages/advertising/CreateAdStepContent.tsx',
  'apps/frontend/src/pages/advertising/CreateAdMobilePreview.tsx'
];

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

let hasErrors = false;

files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`MISSING FILE: ${f}`);
    hasErrors = true;
    return;
  }
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  console.log(`${f}: ${lines} lines`);
  if (lines > 400) {
    console.error(`ERROR: ${f} exceeds 400 lines (${lines})`);
    hasErrors = true;
  }
  const match = emojiRegex.exec(content);
  if (match) {
    console.error(`ERROR: Emoji found in ${f}: ${match[0]}`);
    hasErrors = true;
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('ALL BATCH 95 CHECKS PASSED: < 400 lines and 0 emojis!');
}
