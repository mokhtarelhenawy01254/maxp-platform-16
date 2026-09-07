const { PrismaClient } = require('/var/www/backend2/prisma/generated/postgresql_v2');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' } }
});

const COMPANY_ID = 'cmth0nnxy0104jumu9onticyy';

async function main() {
  const row = await prisma.storefrontSettings.findUnique({
    where: { companyId: COMPANY_ID },
  });

  if (!row) throw new Error('storefront_settings not found');

  const original = row.designTokens || {};

  // Backup original designTokens to disk before mutating
  fs.writeFileSync('/tmp/fiore_designTokens_backup.json', JSON.stringify(original, null, 2));
  console.log('Backup written to /tmp/fiore_designTokens_backup.json');

  const tokens = JSON.parse(JSON.stringify(original));
  const overrides = tokens.pageOverrides || {};
  const pdp = overrides.pdp || {};
  const sections = Array.isArray(pdp.sections) ? pdp.sections : [];

  const info = sections.find((s) => s && typeof s === 'object' && s.type === 'product-info');
  if (!info) throw new Error('product-info section not found in pdp overrides');

  if (!info.settings || typeof info.settings !== 'object' || Array.isArray(info.settings)) {
    info.settings = {};
  }

  info.settings.showSizeGuide = 'hidden';

  tokens.pageOverrides = overrides;
  tokens.pageOverrides.pdp = { ...pdp, sections };

  const updated = await prisma.storefrontSettings.update({
    where: { companyId: COMPANY_ID },
    data: { designTokens: tokens },
  });

  console.log('✅ Updated storefront_settings for', COMPANY_ID);
  console.log('showSizeGuide now =', updated.designTokens.pageOverrides.pdp.sections.find(s => s.type === 'product-info').settings.showSizeGuide);
  console.log('Other settings preserved:', Object.keys(updated.designTokens.pageOverrides.pdp.sections.find(s => s.type === 'product-info').settings).join(', '));
}

main()
  .catch((e) => { console.error('ERROR', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
