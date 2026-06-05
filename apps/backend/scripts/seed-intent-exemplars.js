const { t: i18n } = require('./i18n');
/**
 * @module seed-intent-exemplars
 * @description Seeds default exemplars for intent classification.
 * Run with: node scripts/seed-intent-exemplars.js [companyId]
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const intentExemplarService = require('../legacy-ai-agent/aiAgent/intentExemplarService');

function getPrisma() {
  return getSharedPrismaClient();
}

/**
 * Default exemplars for each intent.
 * Each exemplar includes: query, intent, slots, difficulty, locale
 */
const DEFAULT_EXEMPLARS = [
  // orders.create_confirmed - Arabic
  {
    query: i18n.t('msg.51df8f69'),
    intent: 'orders.create_confirmed',
    slots: { productName: i18n.t('msg.2d7ff803'), productSize: 'L', customerName: i18n.t('msg.603ac397'), customerPhone: '01012345678' },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.0e0d0eb8'),
    intent: 'orders.create_confirmed',
    slots: { productName: i18n.t('msg.e56e101b'), productSize: '42', productColor: i18n.t('msg.c88682c2'), quantity: 1, city: i18n.t('msg.1f89409c') },
    difficulty: 'medium',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.e7fe441f'),
    intent: 'orders.create_confirmed',
    slots: { customerName: i18n.t('msg.30779869'), customerPhone: '01123456789', productName: i18n.t('msg.385aba62'), productColor: i18n.t('msg.9c716ef9'), productSize: '43' },
    difficulty: 'medium',
    locale: 'ar',
  },
  // orders.create_confirmed - English
  {
    query: 'I want to order a blue t-shirt size M, my name is John and my phone is 01012345678',
    intent: 'orders.create_confirmed',
    slots: { productName: 'blue t-shirt', productSize: 'M', customerName: 'John', customerPhone: '01012345678' },
    difficulty: 'easy',
    locale: 'en',
  },

  // orders.create_draft - Arabic
  {
    query: i18n.t('msg.d346b3b0'),
    intent: 'orders.create_draft',
    slots: { customerName: i18n.t('msg.8ba10ac8'), productName: i18n.t('msg.351defd1'), productSize: 'XL' },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.81e0640c'),
    intent: 'orders.create_draft',
    slots: { customerName: i18n.t('msg.d45f10f6'), productName: i18n.t('msg.8b639c5a'), productColor: i18n.t('msg.c88682c2'), productSize: '38' },
    difficulty: 'medium',
    locale: 'ar',
  },

  // inventory - Arabic
  {
    query: i18n.t('msg.1fb2db45'),
    intent: 'inventory',
    slots: { productName: i18n.t('msg.82810e3b') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.9248b783'),
    intent: 'inventory',
    slots: { productName: i18n.t('msg.efad41a8') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.ff780e0c'),
    intent: 'inventory',
    slots: {},
    difficulty: 'medium',
    locale: 'ar',
  },

  // products - Arabic
  {
    query: i18n.t('msg.bbcb21a0'),
    intent: 'products',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.bdcbc0ac'),
    intent: 'products',
    slots: { productName: i18n.t('msg.98deb8b9') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.97212f38'),
    intent: 'products',
    slots: { requestedProductImage: true },
    difficulty: 'medium',
    locale: 'ar',
  },

  // shipping.rates - Arabic
  {
    query: i18n.t('msg.9211f643'),
    intent: 'shipping.rates',
    slots: { city: i18n.t('msg.dfa5b431') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.06f78881'),
    intent: 'shipping.rates',
    slots: { city: i18n.t('msg.b0b75b31') },
    difficulty: 'easy',
    locale: 'ar',
  },

  // support.exchange - Arabic
  {
    query: i18n.t('msg.3850ef9f'),
    intent: 'support.exchange',
    slots: { exchangeReason: i18n.t('msg.81ee7b6d') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.2401cce3'),
    intent: 'support.exchange',
    slots: { exchangeReason: i18n.t('msg.affb79f5') },
    difficulty: 'medium',
    locale: 'ar',
  },

  // support.refund - Arabic
  {
    query: i18n.t('msg.160163c8'),
    intent: 'support.refund',
    slots: { refundReason: i18n.t('msg.679535b1') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.3dacd182'),
    intent: 'support.refund',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },

  // support.complaint - Arabic
  {
    query: i18n.t('msg.2455584d'),
    intent: 'support.complaint',
    slots: { complaintDetails: i18n.t('msg.22db2d3e') },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.cb47b221'),
    intent: 'support.complaint',
    slots: { complaintDetails: i18n.t('msg.e1ca178d') },
    difficulty: 'medium',
    locale: 'ar',
  },

  // orders (lookup) - Arabic
  {
    query: i18n.t('msg.830bdbed'),
    intent: 'orders',
    slots: { orderNumber: '12345' },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.6bf1c10a'),
    intent: 'orders',
    slots: {},
    difficulty: 'medium',
    locale: 'ar',
  },

  // sales - Arabic
  {
    query: i18n.t('msg.3f37b02a'),
    intent: 'sales',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.b1899f07'),
    intent: 'sales',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },

  // agents.manage - Arabic
  {
    query: i18n.t('msg.9ce1102e'),
    intent: 'agents.manage',
    slots: { agentRole: 'sales' },
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.f4fe39ff'),
    intent: 'agents.manage',
    slots: { agentRole: 'sales', channel: 'FACEBOOK' },
    difficulty: 'medium',
    locale: 'ar',
  },

  // skills.manage - Arabic
  {
    query: i18n.t('msg.dfee4694'),
    intent: 'skills.manage',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.334757e3'),
    intent: 'skills.manage',
    slots: { skillName: i18n.t('msg.6973d331') },
    difficulty: 'medium',
    locale: 'ar',
  },

  // general.chat - Arabic
  {
    query: i18n.t('msg.c9449306'),
    intent: 'general.chat',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.e6bf98a8'),
    intent: 'general.chat',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.3a6eefcd'),
    intent: 'general.chat',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },

  // general.chat - English
  {
    query: 'Hello',
    intent: 'general.chat',
    slots: {},
    difficulty: 'easy',
    locale: 'en',
  },
  {
    query: 'Thank you',
    intent: 'general.chat',
    slots: {},
    difficulty: 'easy',
    locale: 'en',
  },

  // hr.attendance.today - Arabic
  {
    query: i18n.t('msg.9c8a3df1'),
    intent: 'hr.attendance.today',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.6e033884'),
    intent: 'hr.attendance.today',
    slots: {},
    difficulty: 'easy',
    locale: 'ar',
  },

  // Edge cases - Arabic
  {
    query: i18n.t('msg.00aa031a'),
    intent: 'orders.create_draft',
    slots: { confirmedByCustomer: false },
    difficulty: 'hard',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.f3b6857e'),
    intent: 'general.chat',
    slots: { requestedProductImage: false },
    difficulty: 'hard',
    locale: 'ar',
  },
  {
    query: i18n.t('msg.3211b4f6'),
    intent: 'inventory',
    slots: { productColor: i18n.t('msg.0788f367') },
    difficulty: 'hard',
    locale: 'ar',
  },
];

/**
 * Seed exemplars for a company.
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Seeding results
 */
async function seedExemplars(companyId) {
  if (!companyId) {
    console.error('Usage: node scripts/seed-intent-exemplars.js <companyId>');
    process.exit(1);
  }

  console.log(`Seeding exemplars for company: ${companyId}`);

  const results = {
    total: 0,
    success: 0,
    failed: 0,
    byIntent: {},
  };

  for (const exemplar of DEFAULT_EXEMPLARS) {
    try {
      await intentExemplarService.addExemplar({
        companyId,
        ...exemplar,
        channel: null, // Global exemplars
      });
      results.success++;
      results.total++;
      results.byIntent[exemplar.intent] = (results.byIntent[exemplar.intent] || 0) + 1;
      console.log(`  ✓ [${exemplar.intent}] ${exemplar.query.substring(0, 50)}...`);
    } catch (error) {
      results.failed++;
      results.total++;
      console.error(`  ✗ [${exemplar.intent}] Failed: ${error.message}`);
    }
  }

  console.log('\n--- Seeding Complete ---');
  console.log(`Total: ${results.total}`);
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log('\nBy Intent:');
  for (const [intent, count] of Object.entries(results.byIntent)) {
    console.log(`  ${intent}: ${count}`);
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  const companyId = process.argv[2];
  seedExemplars(companyId)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedExemplars, DEFAULT_EXEMPLARS };
