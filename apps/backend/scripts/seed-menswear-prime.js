const { t: i18n } = require('./i18n');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  console.log('🌱 Starting Menswear Prime Extended Data Seeding...');

  let company = await prisma.company.findFirst({
    where: { name: { contains: 'MaxP Platform', mode: 'insensitive' } }
  });

  if (!company) {
    company = await prisma.company.findFirst();
  }

  const companyId = company.id;

  // Set all existing products to not featured to clean up the storefront grids
  await prisma.product.updateMany({
    where: { companyId },
    data: { isFeatured: false }
  });

  const categories = [
    { slug: 'suits', name: i18n.t('msg.07c634a5'), image: 'https://images.unsplash.com/photo-1594938298596-03fd629bf56c?w=800&q=80' },
    { slug: 'shirts', name: i18n.t('msg.cb288607'), image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80' },
    { slug: 'shoes', name: i18n.t('msg.f226da21'), image: 'https://images.unsplash.com/photo-1614252209317-dc132a0d9b4b?w=800&q=80' },
    { slug: 'accessories', name: i18n.t('msg.963a197c'), image: 'https://images.unsplash.com/photo-1622434641400-9c16bc75c87a?w=800&q=80' }
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const dbCat = await prisma.category.findFirst({ where: { companyId, slug: cat.slug } });
    if (dbCat) categoryMap[cat.slug] = dbCat.id;
  }

  // 12 Products, 3 images each, encoded as a JSON array string just in case
  const productsData = [
    // SUITS
    {
      name: i18n.t('msg.8d839851'),
      slug: 'tuscany-double-breasted-suit',
      price: 8500.00, comparePrice: 11000.00, sku: 'SUIT-001', categoryId: categoryMap['suits'],
      mainImage: 'https://images.unsplash.com/photo-1594938298596-03fd629bf56c?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1594938298596-03fd629bf56c?w=800&q=80',
        'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=80',
        'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.787d87c4'),
      slug: 'navy-pure-wool-suit',
      price: 9200.00, comparePrice: null, sku: 'SUIT-002', categoryId: categoryMap['suits'],
      mainImage: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80',
        'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=800&q=80',
        'https://images.unsplash.com/photo-1592878940526-0214b0f374ce?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.0a457bd7'),
      slug: 'evening-tuxedo-suit',
      price: 12500.00, comparePrice: 15000.00, sku: 'SUIT-003', categoryId: categoryMap['suits'],
      mainImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80',
        'https://images.unsplash.com/photo-1594938291221-94f18cbb5660?w=800&q=80'
      ])
    },
    // SHIRTS
    {
      name: i18n.t('msg.845b8707'),
      slug: 'crisp-white-oxford-shirt',
      price: 1200.00, comparePrice: 1500.00, sku: 'SHRT-001', categoryId: categoryMap['shirts'],
      mainImage: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
        'https://images.unsplash.com/photo-1620012253295-c15bc3e658f3?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.73203bd9'),
      slug: 'classic-striped-shirt',
      price: 1100.00, comparePrice: 1300.00, sku: 'SHRT-002', categoryId: categoryMap['shirts'],
      mainImage: 'https://images.unsplash.com/photo-1596755094514-f87e32f85e2b?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1596755094514-f87e32f85e2b?w=800&q=80',
        'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=800&q=80',
        'https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.30a0f569'),
      slug: 'relaxed-linen-shirt',
      price: 1450.00, comparePrice: null, sku: 'SHRT-003', categoryId: categoryMap['shirts'],
      mainImage: 'https://images.unsplash.com/photo-1626497764746-6dc36546b388?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1626497764746-6dc36546b388?w=800&q=80',
        'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=800&q=80',
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80'
      ])
    },
    // SHOES
    {
      name: i18n.t('msg.f6db3684'),
      slug: 'genuine-leather-oxford-shoe',
      price: 3400.00, comparePrice: null, sku: 'SHOE-001', categoryId: categoryMap['shoes'],
      mainImage: 'https://images.unsplash.com/photo-1614252209317-dc132a0d9b4b?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1614252209317-dc132a0d9b4b?w=800&q=80',
        'https://images.unsplash.com/photo-1614252339474-d071b64744eb?w=800&q=80',
        'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.c3661d2d'),
      slug: 'italian-suede-loafer',
      price: 2900.00, comparePrice: 3200.00, sku: 'SHOE-002', categoryId: categoryMap['shoes'],
      mainImage: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=800&q=80',
        'https://images.unsplash.com/photo-1616406432449-cd8b0496ac74?w=800&q=80',
        'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.d64e752a'),
      slug: 'classic-derby-shoe',
      price: 3100.00, comparePrice: null, sku: 'SHOE-003', categoryId: categoryMap['shoes'],
      mainImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
        'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80',
        'https://images.unsplash.com/photo-1514996937319-344454492b37?w=800&q=80'
      ])
    },
    // ACCESSORIES
    {
      name: i18n.t('msg.c441a253'),
      slug: 'silk-geometric-tie-premium',
      price: 650.00, comparePrice: null, sku: 'ACC-001', categoryId: categoryMap['accessories'],
      mainImage: 'https://images.unsplash.com/photo-1622434641400-9c16bc75c87a?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1622434641400-9c16bc75c87a?w=800&q=80',
        'https://images.unsplash.com/photo-1583741639017-d5ab714ca3db?w=800&q=80',
        'https://images.unsplash.com/photo-1578330758411-fb73eac0552b?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.07784658'),
      slug: 'genuine-leather-belt',
      price: 850.00, comparePrice: 950.00, sku: 'ACC-002', categoryId: categoryMap['accessories'],
      mainImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
        'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80',
        'https://images.unsplash.com/photo-1553062407-eefadd03ebdd?w=800&q=80'
      ])
    },
    {
      name: i18n.t('msg.4434a130'),
      slug: 'classic-leather-watch',
      price: 4500.00, comparePrice: 5200.00, sku: 'ACC-003', categoryId: categoryMap['accessories'],
      mainImage: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
        'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80',
        'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80'
      ])
    }
  ];

  for (const p of productsData) {
    let product = await prisma.product.findFirst({
      where: { companyId, slug: p.slug }
    });

    if (product) {
       await prisma.product.update({
         where: { id: product.id },
         data: { ...p, isFeatured: true }
       });
       console.log('Updated product with 3 images:', p.slug);
    } else {
       product = await prisma.product.create({
         data: { ...p, companyId, isFeatured: true, description: i18n.t('msg.b2106088'), stock: 50 }
       });
       console.log('Created product with 3 images:', p.slug);
    }
    
    // Refresh basic variants so it displays prices correctly in grid
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: 'Default',
        sku: p.sku + '-DEF',
        price: p.price,
        stock: 50,
        isActive: true
      }
    });
  }

  console.log('✅ Seeded 12 Premium Menswear products, 3 images each. Hiding old products.');
}

main().catch(e => {
  console.error('❌ Error during seeding:\n', e);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
