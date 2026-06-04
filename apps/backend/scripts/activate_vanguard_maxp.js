const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs');
const path = require('path');

const COMPANY_ID = 'cmmhkxobb0000vpk440j1n6ui';
const TEMPLATE_SLUG = 'vanguard-premium';

async function run() {
  const prisma = getSharedPrismaClient();
  if (!prisma) {
    console.error('Failed to get prisma client');
    process.exit(1);
  }

  try {
    console.log(`Starting activation for company ${COMPANY_ID}...`);

    // 1. Load system template data
    const manifestPath = path.join(__dirname, '..', 'src', 'templates', 'system', TEMPLATE_SLUG, 'manifest.json');
    const contentPath = path.join(__dirname, '..', 'src', 'templates', 'system', TEMPLATE_SLUG, 'content.json');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

    // 2. Find or Create HomepageTemplate for the company
    let template = await prisma.homepageTemplate.findFirst({
      where: { companyId: COMPANY_ID, slug: TEMPLATE_SLUG }
    });

    if (!template) {
      console.log('Creating new HomepageTemplate from system template...');
      template = await prisma.homepageTemplate.create({
        data: {
          companyId: COMPANY_ID,
          name: manifest.name || 'Vanguard Premium',
          description: manifest.description || '',
          content: content,
          slug: TEMPLATE_SLUG,
          thumbnail: manifest.thumbnail || `/template-thumbs/${TEMPLATE_SLUG}.png`,
          category: manifest.category || 'general',
          isActive: false,
          isSystem: false,
          sourceSlug: TEMPLATE_SLUG,
          version: 1
        }
      });
    }

    // 3. Activate the template in a transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate others
      await tx.homepageTemplate.updateMany({
        where: { companyId: COMPANY_ID },
        data: { isActive: false }
      });

      // Activate this one
      await tx.homepageTemplate.update({
        where: { id: template.id },
        data: { isActive: true }
      });

      // 4. Update StorefrontSettings
      const settings = await tx.storefrontSettings.findUnique({
        where: { companyId: COMPANY_ID }
      });

      if (settings) {
        console.log('Updating storefront settings...');
        let designTokens = settings.designTokens || {};
        if (typeof designTokens === 'string') {
          try {
            designTokens = JSON.parse(designTokens);
          } catch (e) {
            designTokens = {};
          }
        }

        if (!designTokens.storefrontPageAssignments) {
          designTokens.storefrontPageAssignments = {};
        }
        if (!designTokens.storefrontPageAssignments.homepage) {
          designTokens.storefrontPageAssignments.homepage = {};
        }

        designTokens.storefrontPageAssignments.homepage.mode = 'template-page';

        await tx.storefrontSettings.update({
          where: { companyId: COMPANY_ID },
          data: { designTokens }
        });
      }
    });

    console.log('Success! Vanguard Premium is now active for MaxP Platform.');
  } catch (error) {
    console.error('Error during activation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
