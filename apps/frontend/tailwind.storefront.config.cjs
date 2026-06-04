const baseConfig = require('./tailwind.config.cjs');

module.exports = {
  ...baseConfig,
  content: [
    './index.html',
    './src/AppRoot.tsx',
    './src/StorefrontApp.tsx',
    './src/components/storefront/**/*.{js,ts,jsx,tsx}',
    './src/components/layout/StorefrontLayout.{js,ts,jsx,tsx}',
    './src/components/layout/storefront/**/*.{js,ts,jsx,tsx}',
    './src/components/common/Footer.{js,ts,jsx,tsx}',
    './src/components/ui/**/*.{js,ts,jsx,tsx}',
    './src/pages/storefront/**/*.{js,ts,jsx,tsx}',
    './src/pages/landing/**/*.{js,ts,jsx,tsx}',
    './src/pages/PublicCompanyLinks.{js,ts,jsx,tsx}',
    './src/pages/TestPublic.{js,ts,jsx,tsx}',
    './src/pages/TestMinimal.{js,ts,jsx,tsx}',
    './src/pages/wallet/WalletPage.{js,ts,jsx,tsx}',
    './src/components/PerformanceOptimizer.{js,ts,jsx,tsx}',
    './src/providers/**/*.{js,ts,jsx,tsx}',
  ],
};
