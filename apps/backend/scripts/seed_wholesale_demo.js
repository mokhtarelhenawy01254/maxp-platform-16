const path = require('path');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
  errorFormat: 'minimal',
});

async function main() {
  const hashedPassword = await bcrypt.hash('Test@123456', 10);
  const stamp = Date.now().toString().slice(-6);

  // Create company
  const company = await prisma.company.upsert({
    where: { email: 'wholesale@demo.com' },
    update: {},
    create: {
      name: 'شركة الأحذية للجملة',
      email: 'wholesale@demo.com',
      slug: `wholesale-demo-${stamp}`,
      currency: 'EGP',
      isActive: true,
    },
  });
  console.log('✅ Company:', company.name, company.id);

  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'admin@wholesale.com' },
    update: { password: hashedPassword },
    create: {
      email: 'admin@wholesale.com',
      password: hashedPassword,
      firstName: 'أحمد',
      lastName: 'مدير الجملة',
      role: 'COMPANY_ADMIN',
      companyId: company.id,
      isActive: true,
    },
  });
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: {},
    create: { userId: user.id, companyId: company.id, role: 'COMPANY_ADMIN', isActive: true, isDefault: true },
  });
  console.log('✅ User:', user.email);

  // Install store + wholesale-pro apps
  const appSlugs = ['store', 'wholesale-pro'];
  const apps = await prisma.marketplaceApp.findMany({ where: { slug: { in: appSlugs } } });
  for (const app of apps) {
    await prisma.companyApp.upsert({
      where: { companyId_appId: { companyId: company.id, appId: app.id } },
      update: { status: 'ACTIVE' },
      create: { companyId: company.id, appId: app.id, status: 'ACTIVE', activePricingModel: 'SUBSCRIPTION' },
    });
    console.log('  📦 App installed:', app.slug);
  }

  // Create categories
  const cat1 = await prisma.category.create({ data: { name: 'أحذية رجالي', slug: `wholesale-men-${stamp}`, companyId: company.id, isActive: true, displayType: 'default' } });
  const cat2 = await prisma.category.create({ data: { name: 'أحذية حريمي', slug: `wholesale-women-${stamp}`, companyId: company.id, isActive: true, displayType: 'default' } });

  // Create products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'حذاء رياضي رجالي', price: 850, cost: 450, companyId: company.id, categoryId: cat1.id, stock: 500, isActive: true, slug: `sport-shoe-${stamp}-1` } }),
    prisma.product.create({ data: { name: 'حذاء كاجوال رجالي', price: 650, cost: 320, companyId: company.id, categoryId: cat1.id, stock: 300, isActive: true, slug: `casual-shoe-${stamp}-2` } }),
    prisma.product.create({ data: { name: 'حذاء رسمي رجالي', price: 1200, cost: 680, companyId: company.id, categoryId: cat1.id, stock: 200, isActive: true, slug: `formal-shoe-${stamp}-3` } }),
    prisma.product.create({ data: { name: 'حذاء رياضي حريمي', price: 750, cost: 380, companyId: company.id, categoryId: cat2.id, stock: 400, isActive: true, slug: `women-sport-${stamp}-4` } }),
    prisma.product.create({ data: { name: 'صندل حريمي', price: 350, cost: 150, companyId: company.id, categoryId: cat2.id, stock: 600, isActive: true, slug: `sandal-${stamp}-5` } }),
    prisma.product.create({ data: { name: 'بوت شتوي رجالي', price: 1400, cost: 780, companyId: company.id, categoryId: cat1.id, stock: 150, isActive: true, slug: `boot-${stamp}-6` } }),
  ]);
  console.log(`✅ ${products.length} products created`);

  // Create wholesale price list
  const priceList = await prisma.wholesalePriceList.create({
    data: {
      name: 'قائمة أسعار الجملة الأساسية',
      nameAr: 'قائمة الجملة',
      description: 'أسعار الجملة للموزعين المعتمدين',
      companyId: company.id,
      type: 'PUBLIC',
      isActive: true,
      items: {
        create: products.map(p => ({
          productId: p.id,
          price: Number(p.cost) * 1.25,
          minQuantity: 10,
        })),
      },
    },
  });
  console.log('✅ Wholesale price list created with', products.length, 'items');

  // Create wholesale customers
  const customerData = [
    { firstName: 'محمود', lastName: 'السيد', phone: '+201001234560', credit: 50000 },
    { firstName: 'إبراهيم', lastName: 'علي', phone: '+201001234561', credit: 30000 },
    { firstName: 'نورهان', lastName: 'حسن', phone: '+201001234562', credit: 20000 },
  ];
  const wholesaleCustomers = [];
  for (const cd of customerData) {
    const customer = await prisma.customer.create({
      data: {
        firstName: cd.firstName,
        lastName: cd.lastName,
        phone: cd.phone,
        companyId: company.id,
        status: 'ACTIVE',
        tags: 'موزع جملة',
      },
    });
    const wc = await prisma.wholesaleCustomer.create({
      data: {
        customerId: customer.id,
        companyId: company.id,
        creditLimit: cd.credit,
        currentBalance: Math.floor(cd.credit * 0.4),
        isActive: true,
      },
    });
    wholesaleCustomers.push(wc);

    await prisma.wholesaleCustomerPriceList.create({
      data: { customerId: customer.id, priceListId: priceList.id, companyId: company.id, priority: 0 },
    });

    // Seed some transactions
    const bal = Number(wc.currentBalance);
    const invoiceAmt = -(Math.floor(Math.random() * 15000 + 5000));
    await prisma.wholesaleTransaction.create({
      data: {
        wholesaleCustomerId: wc.id,
        companyId: company.id,
        type: 'INVOICE',
        amount: invoiceAmt,
        balanceBefore: bal,
        balanceAfter: bal + invoiceAmt,
        referenceType: 'ORDER',
        notes: 'فاتورة مشتريات جملة',
      },
    });

    console.log(`  👤 Wholesale customer: ${cd.firstName} ${cd.lastName} (credit: ${cd.credit})`);
  }

  console.log('\n============== ✅ Wholesale Demo Ready ==============');
  console.log('📧 Login: admin@wholesale.com');
  console.log('🔑 Password: Test@123456');
  console.log('====================================================');
}

main().catch(e => { console.error('Seed failed:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect().catch(() => {}));
