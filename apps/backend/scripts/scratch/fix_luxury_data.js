const { t: i18n } = require('./i18n');
require('dotenv').config();
const { postgresPrisma: prisma } = require('./services/postgresDatabase');

async function main() {
  console.log('--- Checking Company ---');
  
  if (!prisma) {
    console.error('❌ Prisma client not initialized');
    return;
  }

  const companyById = await prisma.company.findUnique({
    where: { id: 'maxp' }
  });
  
  const companyBySlug = await prisma.company.findFirst({
    where: { OR: [{ slug: 'maxp' }, { name: 'maxp' }] }
  });

  console.log('Company by ID (maxp):', companyById?.id || 'Not Found');
  console.log('Company by slug/name (maxp):', companyBySlug?.id || 'Not Found');
  
  const allCompanies = await prisma.company.findMany({ select: { id: true, name: true, slug: true } });
  console.log('All Companies:', JSON.stringify(allCompanies, null, 2));

  const companyId = companyBySlug?.id || companyById?.id || 'cmmhkxobb0000vpk440j1n6ui';
  console.log('Selected Company ID:', companyId);

  const allKeys = [];
  let obj = prisma;
  while (obj && obj !== Object.prototype) {
    allKeys.push(...Object.getOwnPropertyNames(obj));
    obj = Object.getPrototypeOf(obj);
  }
  
  const models = allKeys.filter(key => 
    !key.startsWith('$') && 
    !key.startsWith('_') && 
    key !== 'constructor' &&
    typeof prisma[key] === 'object' &&
    prisma[key] !== null
  );

  console.log('Detected Models:', models.join(', '));

  // If Category is not found, try to find it in the list
  const categoryModel = models.find(m => m.toLowerCase() === 'category');
  const productModel = models.find(m => m.toLowerCase() === 'product');

  console.log(`Using Category model: ${categoryModel}`);
  console.log(`Using Product model: ${productModel}`);

  if (!categoryModel || !productModel) {
    console.error('❌ Critical models not found');
    return;
  }

  // 1. Update ALL Categories
  const allCategories = await prisma[categoryModel].findMany({
    where: { companyId }
  });

  const categoryTranslations = {
    i18n.t('msg.cf59dc58'): i18n.t('msg.d2a6b181'),
    i18n.t('msg.ec9b06e9'): i18n.t('msg.369e1746'),
    i18n.t('msg.e4fd50d1'): i18n.t('msg.9fe8ce2a'),
    i18n.t('msg.c1835807'): i18n.t('msg.aa0f2be9'),
    i18n.t('msg.32742343'): i18n.t('msg.3170c7f5'),
    i18n.t('msg.696cbfaf'): i18n.t('msg.48033c70'),
    i18n.t('msg.f6a850bc'): i18n.t('msg.f3fb3ad9')
  };

  const shoeImages = [
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop', // Blue Heels
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop', // White Sneakers
    'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800&auto=format&fit=crop', // Brown Boots
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop', // Colorful Sneakers
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop', // Red Sneakers
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&auto=format&fit=crop', // Vans-style
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop', // Blue Running
    'https://images.unsplash.com/photo-1512374382149-4332c6c02151?w=800&auto=format&fit=crop', // Shoe on wall
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop', // New Balance
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&auto=format&fit=crop', // Running close-up
    'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&auto=format&fit=crop', // Classic Sneakers
    'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800&auto=format&fit=crop', // Fashion high heels
    'https://images.unsplash.com/photo-1581101767113-1677fe2bdcf5?w=800&auto=format&fit=crop', // Luxury pumps
    'https://images.unsplash.com/photo-1595341888016-a392ef81b7de?w=800&auto=format&fit=crop', // Leather sandals
    'https://images.unsplash.com/photo-1605733513597-a8f8d410fe3a?w=800&auto=format&fit=crop', // Formal loafers
    'https://images.unsplash.com/photo-1610398041455-accba6e9a37e?w=800&auto=format&fit=crop', // Oxford shoes
    'https://images.unsplash.com/photo-1543508472-bfe67553941d?w=800&auto=format&fit=crop', // High top sneakers
    'https://images.unsplash.com/photo-1575537302964-9acd53969fe0?w=800&auto=format&fit=crop', // Luxury brand heels
    'https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&auto=format&fit=crop', // Sleek boots
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop', // Brown leather shoes
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&auto=format&fit=crop', // Colorful sneakers
    'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=800&auto=format&fit=crop'  // Brown boots
  ];

  for (const cat of allCategories) {
    let cleanName = cat.name.replace(/Luxury /g, '').replace(/ Luxury/g, '').trim();
    let newName = categoryTranslations[cleanName] || cleanName;
    
    // Add "Luxury" prefix if it's English
    if (!newName.match(/[\u0600-\u06FF]/)) {
        newName = `Luxury ${newName}`;
    }
    
    let baseSlug = cleanName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '').slice(0, 30);
    
    // Ensure uniqueness within the company
    let counter = 1;
    let finalSlug = baseSlug;
    while (true) {
        const conflict = await prisma[categoryModel].findFirst({
            where: { companyId, slug: finalSlug, NOT: { id: cat.id } }
        });
        if (!conflict) break;
        finalSlug = `${baseSlug}-${counter++}`;
    }

    // Pick a thematic image for category
    let catImage = shoeImages[cat.name.length % shoeImages.length];
    if (cleanName.toLowerCase().includes('sneaker')) catImage = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop";
    if (cleanName.toLowerCase().includes('boot')) catImage = "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&auto=format&fit=crop";

    await prisma[categoryModel].update({
      where: { id: cat.id },
      data: { 
        name: newName, 
        slug: finalSlug,
        image: catImage
      }
    });
    console.log(`✅ Updated category: ${cat.name} -> ${newName} (${finalSlug})`);
  }

  // 2. Update ALL Products
  const luxuryShoes = [
    { name: 'Luxury Velvet Heels', price: 4500, slug: 'velvet-heels' },
    { name: 'Premium Leather Sneakers', price: 3200, slug: 'leather-sneakers' },
    { name: 'Designer Italian Boots', price: 5800, slug: 'italian-boots' },
    { name: 'Classic Suede Flats', price: 2100, slug: 'suede-flats' },
    { name: 'Elegant Evening Sandals', price: 3900, slug: 'evening-sandals' },
    { name: 'Golden Silk Pumps', price: 4200, slug: 'golden-silk-pumps' },
    { name: 'Midnight Sparkle Stilettos', price: 5100, slug: 'midnight-sparkle' },
    { name: 'Urban Chic Loafers', price: 2800, slug: 'urban-chic-loafers' },
    { name: 'Royal Wedding Bloomers', price: 6500, slug: 'royal-wedding' },
    { name: 'Artisan Crafted Mules', price: 3400, slug: 'artisan-mules' }
  ];

  const products = await prisma[productModel].findMany({
    where: { companyId }
  });

  for (let i = 0; i < products.length; i++) {
    const shoe = luxuryShoes[i % luxuryShoes.length];
    const shoeImageUrl = shoeImages[i % shoeImages.length];
    let baseSlug = shoe.slug;
    
    let counter = 1;
    let finalSlug = baseSlug;
    while (true) {
        const conflict = await prisma[productModel].findFirst({
            where: { companyId, slug: finalSlug, NOT: { id: products[i].id } }
        });
        if (!conflict) break;
        finalSlug = `${baseSlug}-${counter++}`;
    }

    // Use structured JSON for images to satisfy frontend normalizeProductImages
    const productImages = JSON.stringify([{ url: shoeImageUrl, alt: shoe.name }]);

    await prisma[productModel].update({
      where: { id: products[i].id },
      data: {
        name: `${shoe.name} - Edition ${i+1}`, 
        price: shoe.price + (i * 100),
        slug: finalSlug,
        images: productImages,
        mainImage: shoeImageUrl, // Fallback for components that don't parse JSON
        description: `Experience ultimate luxury with our ${shoe.name}. Handcrafted with the finest materials for the most discerning tastes.`
      }
    });
    console.log(`✅ Updated product: ${products[i].name} -> ${shoe.name} (${finalSlug})`);
  }

  console.log('--- Luxury Data Fix Completed ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
