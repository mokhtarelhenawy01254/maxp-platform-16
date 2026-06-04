const { t: i18n } = require('./i18n');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const fs = require('fs');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const log = (msg) => {
    console.log(msg);
    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
    fs.appendFileSync('./tmp/conversion-debug.log', msg + '\n');
  };

  log('🚀 Forcing conversion triggers with FINAL SCHEMA MAPPINGS...');

  try {
    const companyId = 'cmmhkxobb0000vpk440j1n6ui';
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('Company not found');

    const conversionSuite = {
      enabled: true,
      settings: {
        modules: {
          exitIntentPopup: true,
          freeShippingBar: true,
          inactiveTab: true,
          saleCountdown: true,
          fakeVisitorCounter: true,
          fakeSalePopup: true,
          lowStockNotice: true,
          estimatedDelivery: true,
          crossSell: true,
          preOrder: true,
          backInStock: true,
          soldCount: true,
          soldCounter: true,
          purchaseFomo: true,
          trustedBadges: true,
          reviews: true
        },
        thresholds: {
          freeShippingAmount: 2000,
          lowStockLimit: 10,
          fakeVisitorMin: 12,
          fakeVisitorMax: 38,
          purchaseFomoCartWindowHours: 24,
          purchaseFomoRecentPurchaseWindowHours: 48
        },
        estimatedDelivery: {
          minDays: 2,
          maxDays: 4,
          label: "Estimated Delivery"
        },
        countdown: {
          endsAt: new Date(Date.now() + 86400000).toISOString(),
          label: "Flash Sale Ends In:"
        },
        copy: {
            exitIntentTitle: "Wait! Get 10% Off",
            exitIntentDescription: "Don't leave yet. Use code PRIME10 at checkout.",
            fakeVisitorMessage: "{{count}} people are looking at this right now!",
            soldCounterMessage: "Sold {{count}} times in the last 24h",
            purchaseFomoCartMessage: "{{count}} people have this in their cart!",
            freeShippingMessage: "Add {{remaining}} more for Free Shipping!",
            trustedBadgeItems: "Verified Quality,Fast Shipping,Secure Payment"
        }
      }
    };

    let currentSettings = {};
    if (company.settings) {
        if (typeof company.settings === 'string') {
            try { currentSettings = JSON.parse(company.settings); } catch(e) { currentSettings = {}; }
        } else {
            currentSettings = company.settings;
        }
    }

    const updatedSettings = {
      ...currentSettings,
      storefront: {
        ...(currentSettings.storefront || {}),
        apps: {
          ...(currentSettings.storefront?.apps || {}),
          "conversion-suite": conversionSuite
        }
      }
    };

    log('⏳ Updating company settings...');
    await prisma.company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(updatedSettings) }
    });

    // 2. Update Product
    const testProduct = await prisma.product.findFirst({
        where: { companyId, slug: 'tuscany-bespoke-suit' }
    });

    if (testProduct) {
      log('🛠️ Enriching Product: ' + testProduct.name);
      let meta = {};
      try { meta = JSON.parse(testProduct.metadata || '{}'); } catch(e) { meta = {}; }
      
      await prisma.product.update({
        where: { id: testProduct.id },
        data: {
          stock: 2,
          saleEndDate: new Date(Date.now() + 43200000), // Updated mapping
          preOrderDate: new Date(Date.now() + 86400000), // Updated mapping
          metadata: JSON.stringify({
            ...meta,
            isPreOrder: true, // For frontend bracket access
            isExternal: false,
            showFakeStock: true,
            socialProof: {
                soldCount: 154,
                orderCount: 88,
                recentOrderCount: 12,
                activeCartCount: 8
            },
            variantOptions: meta.variantOptions || {
                colors: [i18n.t('msg.6f357595'), i18n.t('msg.69654f66')],
                sizes: ["M", "L"]
            }
          })
        }
      });
      log('✅ Product enriched.');
    }

    log('🏁 SUCCESS!');
  } catch (err) {
    log('❌ ERROR: ' + err.message);
    process.exit(1);
  }
}

main().catch(console.error);
