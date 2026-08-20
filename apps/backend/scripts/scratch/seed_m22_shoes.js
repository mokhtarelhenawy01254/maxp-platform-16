const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

const categories = [
  { name: 'سنيكرز', slug: 'sneakers-m22', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80' },
  { name: 'حذاء كلاسيك', slug: 'formal-m22', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80' },
  { name: 'كاجوال', slug: 'casual-m22', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80' },
  { name: 'بوت', slug: 'boots-m22', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80' }
];

const colors = ["Black", "White", "Brown", "Grey", "Blue"];
const sizes = ["40", "41", "42", "43", "44", "45"];

const shoeData = [
  // 8 Sneakers
  ...Array.from({length: 8}, (_, i) => ({
    name: `سنيكرز رياضي فئة ${i+1}`,
    cat: 'سنيكرز',
    price: 850 + i * 50,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
  })),
  // 8 Formal
  ...Array.from({length: 8}, (_, i) => ({
    name: `حذاء رسمي جلدي فئة ${i+1}`,
    cat: 'حذاء كلاسيك',
    price: 1200 + i * 100,
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'
  })),
  // 8 Casual
  ...Array.from({length: 8}, (_, i) => ({
    name: `حذاء كاجوال يومي فئة ${i+1}`,
    cat: 'كاجوال',
    price: 650 + i * 40,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'
  })),
  // 6 Boots
  ...Array.from({length: 6}, (_, i) => ({
    name: `بوت شتوي متين فئة ${i+1}`,
    cat: 'بوت',
    price: 1850 + i * 150,
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'
  }))
];

async function seedM22Shoes() {
  let prisma;
  try {
    prisma = await getSharedPrismaClientAsync();

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
      console.log('No active m22 company found.');
      process.exit(1);
    }

    const companyId = company.id;
    console.log(`Working with company: ${company.name} (${companyId})`);

    // Ensure Categories
    const categoryMap = {};
    for (const cat of categories) {
      let existing = await prisma.category.findFirst({
        where: { companyId, name: cat.name }
      });
      if (!existing) {
        existing = await prisma.category.create({
          data: {
            companyId,
            name: cat.name,
            slug: cat.slug,
            image: cat.image,
            isActive: true
          }
        });
      }
      categoryMap[cat.name] = existing.id;
    }

    console.log('Categories set up.');

    // Add 30 Products
    let count = 0;
    for (let i = 0; i < shoeData.length; i++) {
        const d = shoeData[i];
        const uniqueSuffix = Math.floor(Math.random() * 10000);
        const sku = `M22-${d.cat.substring(0,3).toUpperCase()}-${String(i+1).padStart(2, '0')}-${uniqueSuffix}`;
        const slug = `m22-${d.cat.substring(0,3).toLowerCase()}-${i+1}-${uniqueSuffix}`;
        
        let existingProduct = await prisma.product.findFirst({
            where: { companyId, sku }
        });

        if (!existingProduct) {
            try {
                existingProduct = await prisma.product.create({
                    data: {
                        companyId,
                        name: d.name,
                        slug,
                        sku,
                        price: d.price,
                        comparePrice: d.price * 1.2,
                        stock: 50,
                        categoryId: categoryMap[d.cat],
                        isActive: true,
                        images: JSON.stringify([
                            { url: d.image, alt: d.name }
                        ]),
                        mainImage: d.image,
                        description: `أفضل ${d.name} للراحة والأناقة, منتج أصلي عالي الجودة بنعل مبطن.`
                    }
                });
                count++;
                
                // Mix colors and sizes
                const productColors = [colors[i % colors.length], colors[(i+1) % colors.length]];
                const productSizes = [sizes[i % sizes.length], sizes[(i+1) % sizes.length]];
                
                for (const color of productColors) {
                    for (const size of productSizes) {
                        const variantSku = `${sku}-${color.substring(0,2).toUpperCase()}-${size}`;
                        await prisma.productVariant.create({
                            data: {
                                productId: existingProduct.id,
                                name: `${color} / ${size}`,
                                sku: variantSku,
                                price: d.price,
                                stock: 20,
                                isActive: true,
                                metadata: JSON.stringify({
                                    Color: color,
                                    Size: size
                                })
                            }
                        });
                    }
                }
            } catch (err) {
                console.error(`Failed to insert product ${sku}:`, err.message || err);
            }
        }
    }

    console.log(`Successfully created ${count} products with variants.`);
    
  } catch (error) {
    console.error('Error adding products:', error);
  } finally {
    if (prisma) await prisma.$disconnect();
    process.exit(0);
  }
}

seedM22Shoes();
