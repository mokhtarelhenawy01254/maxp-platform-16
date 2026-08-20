const fs = require('fs');
const path = require('path');
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function forceApplyKidsPlayMaxP() {
  try {
    const prisma = await getSharedPrismaClientAsync();

    const company = await prisma.company.findFirst({
        where: { 
          slug: 'maxp'
        }
    });

    if (!company) {
      console.log('Company maxp not found.');
      process.exit(1);
    }

    const templatePath = path.join(__dirname, '../frontend/src/storefront/themes/kids-play.json');
    const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId: company.id }
    });

    const designTokens = {
      templateId: "kids-play",
      theme: "kids-play",
      themeOverrides: {
        pages: templateContent.pages
      }
    };

    if (settings) {
      await prisma.storefrontSettings.update({
        where: { id: settings.id },
        data: {
          designTokens: designTokens
        }
      });
      console.log('Successfully forced Kids Play theme into StorefrontSettings for maxp.');
    } else {
      await prisma.storefrontSettings.create({
        data: {
          companyId: company.id,
          supportedLanguages: "ar,en",
          designTokens: designTokens
        }
      });
      console.log('Created StorefrontSettings with Kids Play theme for maxp.');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

forceApplyKidsPlayMaxP();
