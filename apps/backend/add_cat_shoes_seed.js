const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function seedCategoriesAndLinkShoes() {
  try {
    const prisma = await getSharedPrismaClientAsync();

    // Find the company by name or slug
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

    const companyId = company.id;

    // Define 5 categories with Images
    const categoriesData = [
      { name: "أحذية رياضية", slug: "sports-shoes", image: "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800&q=80" },
      { name: "أحذية الجري", slug: "running-shoes", image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80" },
      { name: "أحذية كلاسيكية ورسمية", slug: "classic-shoes", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80" },
      { name: "بوت وأحذية شتوية", slug: "winter-boots", image: "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&q=80" },
      { name: "أحذية كاجوال ويومية", slug: "casual-shoes", image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=80" }
    ];

    const categoryMap = {};

    console.log(`Creating 5 categories for company: ${company.name}...`);
    for (const cat of categoriesData) {
      const createdCat = await prisma.category.upsert({
        where: { companyId_slug: { companyId, slug: cat.slug } },
        update: { name: cat.name, image: cat.image },
        create: {
          name: cat.name,
          slug: cat.slug,
          companyId,
          image: cat.image,
          isActive: true
        }
      });
      categoryMap[cat.slug] = createdCat.id;
    }

    // Map SKUs to Category Slugs
    const shoeCategoryMapping = {
      "SH-AIR-PRO": "sports-shoes",
      "SH-TRN-ULT": "sports-shoes",
      
      "SH-RUN-V2": "running-shoes",
      "SH-WLK-MED": "running-shoes",

      "SH-FRM-IT": "classic-shoes",
      
      "BT-LTR-WNTR": "winter-boots",
      "SH-TRK-01": "winter-boots",

      "SH-CLS-001": "casual-shoes",
      "SN-SMR-LT": "casual-shoes",
      "SH-CAS-LTR": "casual-shoes"
    };

    console.log('Linking products to categories...');
    let updatedCount = 0;
    
    for (const [sku, catSlug] of Object.entries(shoeCategoryMapping)) {
      const categoryId = categoryMap[catSlug];
      if (!categoryId) continue;

      const updated = await prisma.product.updateMany({
        where: { companyId, sku },
        data: { categoryId }
      });
      
      updatedCount += updated.count;
    }

    console.log(`Successfully created 5 categories and linked ${updatedCount} products.`);
    process.exit(0);
  } catch (error) {
    console.error('Error in script:', error);
    process.exit(1);
  }
}

seedCategoriesAndLinkShoes();
