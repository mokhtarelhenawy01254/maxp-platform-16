const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  const companyId = 'dreamer_comp';

  // 1. Ensure categories exist
  const categoryDefs = [
    { name: 'أزياء نسائية', sortOrder: 1 },
    { name: 'أزياء رجالية', sortOrder: 2 },
    { name: 'إكسسوارات', sortOrder: 3 },
  ];
  const categoryMap = {};
  for (const cat of categoryDefs) {
    let existing = await prisma.category.findFirst({
      where: { companyId, name: cat.name },
    });
    if (!existing) {
      existing = await prisma.category.create({
        data: {
          companyId,
          name: cat.name,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
      console.log(`  CREATED category: ${existing.name}`);
    } else {
      console.log(`  FOUND category: ${existing.name}`);
    }
    categoryMap[cat.name] = existing.id;
  }

  // 2. Seed products with variants
  const products = [
    {
      name: 'فستان كلاسيك أسود',
      sku: 'DRESS-001',
      description: 'فستان كلاسيك أنيق مناسب للمناسبات',
      price: 450,
      categoryId: categoryMap['أزياء نسائية'],
      stock: 25,
      mainImage: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
      variants: [
        { name: 'أسود / M', type: 'color', sku: 'DRESS-001-BLK-M', price: 450, stock: 10 },
        { name: 'أسود / L', type: 'color', sku: 'DRESS-001-BLK-L', price: 450, stock: 8 },
        { name: 'أسود / XL', type: 'color', sku: 'DRESS-001-BLK-XL', price: 470, stock: 5 },
      ]
    },
    {
      name: 'بلوزة حرير بيج',
      sku: 'BLOUSE-001',
      description: 'بلوزة حرير ناعمة راقية',
      price: 320,
      categoryId: categoryMap['أزياء نسائية'],
      stock: 30,
      mainImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
      variants: [
        { name: 'بيج / S', type: 'color', sku: 'BLOUSE-001-BEG-S', price: 320, stock: 12 },
        { name: 'بيج / M', type: 'color', sku: 'BLOUSE-001-BEG-M', price: 320, stock: 15 },
        { name: 'أبيض / M', type: 'color', sku: 'BLOUSE-001-WHT-M', price: 340, stock: 10 },
      ]
    },
    {
      name: 'بدلة رجالي رمادي',
      sku: 'SUIT-001',
      description: 'بدلة رجالي رسمية عالية الجودة',
      price: 1200,
      categoryId: categoryMap['أزياء رجالية'],
      stock: 15,
      mainImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
      variants: [
        { name: 'رمادي / L', type: 'color', sku: 'SUIT-001-GRY-L', price: 1200, stock: 5 },
        { name: 'رمادي / XL', type: 'color', sku: 'SUIT-001-GRY-XL', price: 1250, stock: 4 },
        { name: 'كحلي / L', type: 'color', sku: 'SUIT-001-NVY-L', price: 1300, stock: 3 },
      ]
    },
    {
      name: 'تيشيرت قطني',
      sku: 'TSHIRT-001',
      description: 'تيشيرت قطن ١٠٠٪ مريح',
      price: 150,
      categoryId: categoryMap['أزياء رجالية'],
      stock: 100,
      mainImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      variants: [
        { name: 'أبيض / M', type: 'color', sku: 'TSHIRT-001-WHT-M', price: 150, stock: 30 },
        { name: 'أبيض / L', type: 'color', sku: 'TSHIRT-001-WHT-L', price: 150, stock: 40 },
        { name: 'أسود / M', type: 'color', sku: 'TSHIRT-001-BLK-M', price: 150, stock: 35 },
        { name: 'أسود / L', type: 'color', sku: 'TSHIRT-001-BLK-L', price: 150, stock: 40 },
      ]
    },
    {
      name: 'حقيبة جلد بني',
      sku: 'BAG-001',
      description: 'حقيبة جلد طبيعي فاخرة',
      price: 850,
      categoryId: categoryMap['إكسسوارات'],
      stock: 10,
      mainImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400',
      variants: [
        { name: 'بني', type: 'color', sku: 'BAG-001-BRN', price: 850, stock: 5 },
        { name: 'أسود', type: 'color', sku: 'BAG-001-BLK', price: 880, stock: 3 },
      ]
    },
    {
      name: 'ساعة يد أنيقة',
      sku: 'WATCH-001',
      description: 'ساعة يد بسوار من الستانلس ستيل',
      price: 650,
      categoryId: categoryMap['إكسسوارات'],
      stock: 20,
      mainImage: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
      variants: [
        { name: 'فضي', type: 'color', sku: 'WATCH-001-SLV', price: 650, stock: 10 },
        { name: 'ذهبي', type: 'color', sku: 'WATCH-001-GLD', price: 750, stock: 6 },
      ]
    },
  ];

  for (const product of products) {
    const { variants, ...productData } = product;
    const existing = await prisma.product.findFirst({
      where: { companyId, sku: productData.sku },
    });
    if (existing) {
      console.log(`  SKIP ${productData.sku} - already exists`);
      continue;
    }
    const created = await prisma.product.create({
      data: {
        companyId,
        name: productData.name,
        sku: productData.sku,
        description: productData.description || '',
        price: productData.price,
        stock: productData.stock || 0,
        mainImage: productData.mainImage || null,
        categoryId: productData.categoryId,
        isActive: true,
        trackInventory: true,
        productVariants: {
          create: variants.map(v => ({
            name: v.name,
            type: v.type || 'color',
            sku: v.sku,
            price: v.price,
            stock: v.stock || 0,
            isActive: true,
          }))
        }
      },
    });
    console.log(`  CREATED ${created.sku} - ${created.name}`);
  }

  console.log('Done!');
}

main()
  .catch(e => { console.error(e); process.exit(1); });