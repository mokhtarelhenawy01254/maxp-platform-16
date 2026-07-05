const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();

    const companyId = 'cmleybpf70028juo2wwpmp8rt';
    const email = 'swan@h2m.com';
    const passwordHash = await bcrypt.hash('0165676135', 10);

    // 1. Create or update company
    const company = await prisma.company.upsert({
      where: { id: companyId },
      update: {
        name: 'Swan',
        slug: 'swan',
        email: 'swan@h2m.com',
        isActive: true,
      },
      create: {
        id: companyId,
        name: 'Swan',
        slug: 'swan',
        email: 'swan@h2m.com',
        isActive: true,
      },
    });
    console.log(`✅ Upserted Company: ${company.name} (${company.id})`);

    // 2. Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        companyId,
        role: 'COMPANY_ADMIN',
        isActive: true,
      },
      create: {
        email,
        password: passwordHash,
        firstName: 'Swan',
        lastName: 'Company',
        role: 'COMPANY_ADMIN',
        companyId,
        isActive: true,
      },
    });
    console.log(`✅ Upserted User: ${user.email} (${user.id})`);

    // 3. Create category
    const category = await prisma.category.findFirst({
      where: { companyId, name: 'أحذية' }
    }) || await prisma.category.create({
      data: {
        name: 'أحذية',
        companyId,
      }
    });
    console.log(`✅ Upserted Category: ${category.name} (${category.id})`);

    // 4. Create product
    const product = await prisma.product.upsert({
      where: { companyId_slug: { companyId, slug: 'sswan' } },
      update: {
        name: 'كوتشي الاسكوتش من سوان',
        price: 499,
        stock: 1000,
        isActive: true,
        deletedAt: null,
        categoryId: category.id,
      },
      create: {
        name: 'كوتشي الاسكوتش من سوان',
        slug: 'sswan',
        sku: 'sswan',
        price: 499,
        stock: 1000,
        isActive: true,
        companyId,
        categoryId: category.id,
      },
    });
    console.log(`✅ Upserted Product: ${product.name} (${product.id})`);

    // 5. Create variants
    const colors = ['أسود', 'أبيض', 'كحلي'];
    const sizes = ['38', '39', '40', '41', '42'];
    let variantCount = 0;

    // Delete existing variants first
    await prisma.productVariant.deleteMany({
      where: { productId: product.id }
    });

    // Composite variants (color + size) for granular stock tracking
    for (const color of colors) {
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            name: `${color} / ${size}`,
            type: 'size',
            sku: `sswan-${color}-${size}`,
            stock: 50,
            isActive: true,
          }
        });
        variantCount++;
      }
    }

    // Standalone color variants for AI agent filtering
    for (const color of colors) {
      const totalStock = sizes.length * 50;
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: color,
          type: 'color',
          sku: `sswan-color-${color}`,
          stock: totalStock,
          isActive: true,
        }
      });
      variantCount++;
    }

    console.log(`✅ Created ${variantCount} product variants (composite + color)`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
