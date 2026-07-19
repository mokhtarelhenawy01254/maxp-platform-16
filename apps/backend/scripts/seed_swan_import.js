/**
 * Seed script: Create Swan company + 10 test orders in local PostgreSQL.
 * 
 * Order IDs used:
 *   2373, 2374 (wc-completed), 657, 661 (wc-refunded),
 *   3040, 3011 (wc-cancelled), 3081, 3121 (wc-failed),
 *   2375, 2376 (wc-completed)
 * 
 * Run: node seed_swan_import.js
 */
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'generated', 'postgresql_v2'));
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🏗️  Creating Swan company...');

  // 1. Create company
  const company = await prisma.company.upsert({
    where: { email: 'swan@test.com' },
    update: {},
    create: {
      name: 'Swan',
      email: 'swan@test.com',
      phone: '01000000000',
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      isActive: true,
    },
  });
  console.log(`  ✅ Company: ${company.id} (${company.name})`);

  // 2. Create admin user
  const hashedPwd = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'swanadmin@test.com' },
    update: {},
    create: {
      email: 'swanadmin@test.com',
      password: hashedPwd,
      firstName: 'Swan',
      lastName: 'Admin',
      role: 'COMPANY_ADMIN',
      isActive: true,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  ✅ User: ${user.id} (${user.email})`);

  // Link user to company
  await prisma.userCompany.create({
    data: {
      userId: user.id,
      companyId: company.id,
      role: 'COMPANY_ADMIN',
      isActive: true,
      isDefault: true,
    },
  }).catch(() => {
    // May already exist
    console.log('  ℹ️  User-company link already exists');
  });

  // 3. Create customers for the test orders
  const customers = [
    { firstName: 'أحمد', lastName: 'علي', phone: '01001112233', email: 'ahmed@example.com' },
    { firstName: 'مريم', lastName: 'حسن', phone: '01002223344', email: 'maryam@example.com' },
    { firstName: 'محمد', lastName: 'إبراهيم', phone: '01003334455', email: 'mohamed@example.com' },
    { firstName: 'نور', lastName: 'أحمد', phone: '01004445566', email: 'noor@example.com' },
    { firstName: 'سارة', lastName: 'خالد', phone: '01005556677', email: 'sarah@example.com' },
  ];

  const createdCustomers = [];
  for (const c of customers) {
    let customer = await prisma.customer.findFirst({
      where: { phone: c.phone, companyId: company.id },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email,
          status: 'ACTIVE',
          customerRating: 'GOOD',
          companyId: company.id,
        },
      });
    }
    createdCustomers.push(customer);
  }
  console.log(`  ✅ ${createdCustomers.length} customers created`);

  // 4. Create products
  const products = [
    { name: 'فستان أنيق', price: 450, sku: 'SWN-001', stock: 50 },
    { name: 'حقيبة يد', price: 320, sku: 'SWN-002', stock: 30 },
    { name: 'حذاء رياضي', price: 550, sku: 'SWN-003', stock: 25 },
    { name: 'ساعة كلاسيك', price: 280, sku: 'SWN-004', stock: 40 },
    { name: 'نظارة شمسية', price: 180, sku: 'SWN-005', stock: 60 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const product = await prisma.product.create({
      data: {
        name: p.name,
        price: p.price,
        sku: p.sku,
        stock: p.stock,
        trackInventory: true,
        isActive: true,
        companyId: company.id,
      },
    });
    createdProducts.push(product);
  }
  console.log(`  ✅ ${createdProducts.length} products created`);

  // 5. Create 10 test orders
  const orderData = [
    { customerIdx: 0, status: 'DELIVERED',  paymentMethod: 'CASH',       subtotal: 450, shipping: 50, total: 500, items: [{ pIdx: 0, qty: 1 }] },
    { customerIdx: 1, status: 'DELIVERED',  paymentMethod: 'CASH',       subtotal: 640, shipping: 50, total: 690, items: [{ pIdx: 1, qty: 2 }] },
    { customerIdx: 2, status: 'REFUNDED',   paymentMethod: 'CASH',       subtotal: 550, shipping: 50, total: 600, items: [{ pIdx: 2, qty: 1 }] },
    { customerIdx: 3, status: 'REFUNDED',   paymentMethod: 'CREDIT_CARD', subtotal: 280, shipping: 0, total: 280, items: [{ pIdx: 3, qty: 1 }] },
    { customerIdx: 4, status: 'CANCELLED',  paymentMethod: 'CASH',       subtotal: 180, shipping: 50, total: 230, items: [{ pIdx: 4, qty: 1 }] },
    { customerIdx: 0, status: 'CANCELLED',  paymentMethod: 'BANK_TRANSFER', subtotal: 900, shipping: 70, total: 970, items: [{ pIdx: 0, qty: 2 }] },
    { customerIdx: 1, status: 'CANCELLED',  paymentMethod: 'CASH',       subtotal: 320, shipping: 50, total: 370, items: [{ pIdx: 1, qty: 1 }] },
    { customerIdx: 2, status: 'CANCELLED',  paymentMethod: 'CASH',       subtotal: 830, shipping: 50, total: 880, items: [{ pIdx: 0, qty: 1 }, { pIdx: 2, qty: 1 }] },
    { customerIdx: 3, status: 'DELIVERED',  paymentMethod: 'WALLET',     subtotal: 450, shipping: 50, total: 500, items: [{ pIdx: 0, qty: 1 }] },
    { customerIdx: 4, status: 'DELIVERED',  paymentMethod: 'CASH',       subtotal: 630, shipping: 50, total: 680, items: [{ pIdx: 2, qty: 1 }, { pIdx: 4, qty: 1 }] },
  ];

  const wooStatusMap = {
    'DELIVERED': 'wc-completed',
    'REFUNDED': 'wc-refunded',
    'CANCELLED': 'wc-cancelled',
  };

  for (let i = 0; i < orderData.length; i++) {
    const od = orderData[i];
    const customer = createdCustomers[od.customerIdx];
    const wooId = [2373, 2374, 657, 661, 3040, 3011, 3081, 3121, 2375, 2376][i];

    const order = await prisma.order.create({
      data: {
        orderNumber: `SWN-${String(i + 1).padStart(4, '0')}`,
        customerId: customer.id,
        companyId: company.id,
        status: od.status,
        paymentStatus: od.status === 'DELIVERED' ? 'COMPLETED' : od.status === 'REFUNDED' ? 'REFUNDED' : 'PENDING',
        paymentMethod: od.paymentMethod,
        subtotal: od.subtotal,
        shipping: od.shipping,
        total: od.total,
        currency: 'EGP',
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'Cairo',
        customerAddress: 'شارع رئيسي، القاهرة',
        sourceType: 'woocommerce',
        syncedFromWoo: true,
        wooCommerceId: String(wooId),
        wooCommerceStatus: wooStatusMap[od.status],
        wooCommerceDateCreated: new Date(),
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`,
      },
    });

    // Create order items
    for (const item of od.items) {
      const product = createdProducts[item.pIdx];
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: item.qty,
          price: product.price,
          total: product.price * item.qty,
          productName: product.name,
          productSku: product.sku,
        },
      });
    }

    // Create status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: od.status,
        oldStatus: 'PENDING',
        changedBy: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        reason: 'Imported from old store',
        createdAt: new Date(),
      },
    });

    console.log(`  📦 Order ${i + 1}/10: #${wooId} (${od.status}) - ${od.total} EGP`);
  }

  console.log('\n🎉 Done! 10 test orders imported.');
  console.log(`\nLogin credentials:`);
  console.log(`  Email: swanadmin@test.com`);
  console.log(`  Password: admin123`);
  console.log(`  Company: Swan`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
