const { PrismaClient } = require('/var/www/backend2/prisma/generated/postgresql_v2');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' } }
});

const COMPANY_ID = 'cmth0nnxy0104jumu9onticyy';

async function main() {
  const row = await prisma.storefrontSettings.findUnique({
    where: { companyId: COMPANY_ID },
  });

  if (!row) {
    console.log('NO storefront_settings for company', COMPANY_ID);
    process.exit(1);
  }

  const tokens = row.designTokens || {};
  const overrides = tokens.pageOverrides || {};
  const pdp = overrides.pdp || {};
  const sections = Array.isArray(pdp.sections) ? pdp.sections : [];

  const info = sections.find((s) => s && typeof s === 'object' && s.type === 'product-info');

  console.log('=== FOUND product-info section ===');
  console.log('variant:', info ? info.variant : '(none)');
  console.log('settings keys:', info && info.settings ? Object.keys(info.settings).join(', ') : '(none)');
  console.log('has showSizeGuide:', !!(info && info.settings && Object.prototype.hasOwnProperty.call(info.settings, 'showSizeGuide')));
}

main()
  .catch((e) => { console.error('ERROR', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
