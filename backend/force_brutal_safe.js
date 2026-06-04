const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function forceBrutal() {
  try {
    let company = await prisma.company.findFirst();
    if (!company) {
      console.log("No company found.");
      return;
    }

    console.log("Found company:", company.id);
    
    // Find or create StorefrontSettings
    let storefrontSettings = await prisma.storefrontSettings.findUnique({
      where: { companyId: company.id }
    });

    if (!storefrontSettings) {
      console.log("Creating storefront settings...");
      storefrontSettings = await prisma.storefrontSettings.create({
        data: {
          companyId: company.id,
          supportedLanguages: "ar,en",
          designTokens: {}
        }
      });
    }

    let designTokens = storefrontSettings.designTokens || {};
    if (typeof designTokens === 'string') {
        try { designTokens = JSON.parse(designTokens); } catch (e) { designTokens = {}; }
    }

    // Update shopStudio in designTokens
    if (!designTokens.shopStudio) designTokens.shopStudio = {};
    if (!designTokens.shopStudio.productCard) designTokens.shopStudio.productCard = {};
    designTokens.shopStudio.productCard.variant = "brutal";

    await prisma.storefrontSettings.update({
      where: { companyId: company.id },
      data: { designTokens: designTokens }
    });

    console.log("Successfully updated storefrontSettings.designTokens to brutal!");
  } catch (error) {
    console.error("Error updating database:", error);
    if (error.stack) console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

forceBrutal();
