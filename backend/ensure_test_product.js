const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log("No company found.");
      return;
    }

    console.log("Found company:", company.id);
    
    const products = await prisma.product.findMany({
      where: { companyId: company.id }
    });

    console.log(`Company has ${products.length} products.`);
    
    if (products.length === 0) {
      console.log("Creating a test product...");
      const product = await prisma.product.create({
        data: {
          name: "Neo-Brutalism Test Product",
          description: "A test product to verify the brutal variant styling.",
          price: 99.99,
          companyId: company.id,
          isActive: true,
          slug: "brutal-test-product",
          images: JSON.stringify(["https://placehold.co/600x400/000000/FFFFFF/png?text=Brutal+Product"])
        }
      });
      console.log("Created test product:", product.id);
    }
  } catch (error) {
    console.error("Error checking products:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
