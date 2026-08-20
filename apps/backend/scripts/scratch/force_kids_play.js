const fs = require('fs');
const path = require('path');
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function forceApplyKidsPlay() {
  try {
    const prisma = await getSharedPrismaClientAsync();

    const company = await prisma.company.findFirst({
        where: { 
          slug: 'velvet-vine'
        }
    });

    if (!company) {
      console.log('Company velvet-vine not found.');
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
      console.log('Successfully forced Kids Play theme into StorefrontSettings for velvet-vine.');
    } else {
      await prisma.storefrontSettings.create({
        data: {
          companyId: company.id,
          supportedLanguages: "ar,en",
          designTokens: designTokens
        }
      });
      console.log('Created StorefrontSettings with Kids Play theme for velvet-vine.');
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

forceApplyKidsPlay();
