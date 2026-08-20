const fs = require('fs');
const path = require('path');
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function forceApplyTemplate() {
  try {
    const prisma = await getSharedPrismaClientAsync();

    const company = await prisma.company.findFirst({
        where: { 
          OR: [
            { name: { contains: 'm22', mode: 'insensitive' } },
            { slug: { contains: 'm22', mode: 'insensitive' } }
          ],
          isActive: true 
        }
    });

    if (!company) {
      console.log('Company m22 not found.');
      process.exit(1);
    }

    const templatePath = path.join(__dirname, '../frontend/src/storefront/themes/mystic-desert.json');
    const templateContent = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // The frontend engine merges template JSON with StorefrontSettings.designTokens
    // To hard-override the DB version (if they clicked save before), we just wipe or update the db designTokens.
    // If we set `designTokens.templateId = "mystic-desert"` and update the overrides, it works.

    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId: company.id }
    });

    if (settings) {
      // Forcing the new pages layout into the design tokens directly
      const currentTokens = typeof settings.designTokens === 'string' ? JSON.parse(settings.designTokens) : (settings.designTokens || {});
      
      currentTokens.templateId = "mystic-desert";
      currentTokens.theme = "mystic-desert";
      
      // Inject the latest layout and structure to bypass DB caching
      currentTokens.heroContentStudio = templateContent.pages.home.sections[0].settings;
      currentTokens.themeOverrides = {
        pages: templateContent.pages
      };
      
      await prisma.storefrontSettings.update({
        where: { id: settings.id },
        data: {
          designTokens: currentTokens
        }
      });
      console.log('Successfully forced template JSON into StorefrontSettings for m22.');
    } else {
      console.log('No storefront settings found, creating one...');
      await prisma.storefrontSettings.create({
        data: {
          companyId: company.id,
          supportedLanguages: "ar,en",
          designTokens: {
            templateId: "mystic-desert",
            theme: "mystic-desert",
            themeOverrides: {
              pages: templateContent.pages
            }
          }
        }
      });
    }

    process.exit(0);
  } catch (error) {
    fs.writeFileSync('error.log', String(error.message) + '\n' + String(error.stack));
    process.exit(1);
  }
}

forceApplyTemplate();
