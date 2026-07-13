
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function main() {
  const companyId = 'cmmzjisyt0000vp1w5t4g7gry';
  const themeId = 'aura-chic';

  console.log('--- Aura Chic Activation Script ---');
  
  const prisma = getSharedPrismaClient();
  if (!prisma) {
    throw new Error('Failed to get shared Prisma client');
  }

  // 1. Find the active template
  const activeTemplate = await prisma.homepageTemplate.findFirst({
    where: { companyId, isActive: true }
  });

  if (!activeTemplate) {
    console.warn('No active template found for company:', companyId);
    // Create one if needed? Or just fail?
    // Let's create one if none exists.
    const newTemplate = await prisma.homepageTemplate.create({
      data: {
        companyId,
        name: 'Aura Chic Homepage',
        isActive: true,
        sourceSlug: themeId,
        slug: 'home',
        content: { sections: [], settings: {} },
        pageType: 'HOMEPAGE'
      }
    });
    console.log('Created new active template:', newTemplate.id);
  } else {
    console.log('Current active template:', activeTemplate.id, 'sourceSlug:', activeTemplate.sourceSlug);
    
    // 2. Update the existing active template to use aura-chic
    const updated = await prisma.homepageTemplate.update({
      where: { id: activeTemplate.id },
      data: {
        sourceSlug: themeId,
        name: 'Aura Chic (' + activeTemplate.name + ')'
      }
    });
    console.log('Updated active template to aura-chic:', updated.id);
  }

  // 3. Update StorefrontSettings to include the designTokens and mode
  const settings = await prisma.storefrontSettings.upsert({
    where: { companyId },
    update: {
      designTokens: {
        primaryColor: '#333333',
        accentColor: '#D4AF37',
        backgroundColor: '#FFFFFF',
        borderRadius: '0px',
        headingFont: "'Playfair Display', serif",
        bodyFont: "'Montserrat', sans-serif",
        storefrontPageAssignments: {
          homepage: { mode: 'template-page' },
          shop: { mode: 'native', runtimeLayout: 'aura-chic' },
          product: { mode: 'native', runtimeLayout: 'aura-chic' }
        }
      },
      supportedLanguages: "ar,en"
    },
    create: {
      companyId,
      supportedLanguages: "ar,en",
      designTokens: {
        primaryColor: '#333333',
        accentColor: '#D4AF37',
        backgroundColor: '#FFFFFF',
        borderRadius: '0px',
        headingFont: "'Playfair Display', serif",
        bodyFont: "'Montserrat', sans-serif"
      }
    }
  });

  console.log('Updated StorefrontSettings designTokens.');
}

main()
  .catch(err => {
    console.error('Error during activation:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
