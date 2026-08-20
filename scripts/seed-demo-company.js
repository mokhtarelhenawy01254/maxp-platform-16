/**
 * Seed script: Creates a demo company with dummy products, orders, employees, and tasks
 * for the account h@gmail.com
 */
const { getSharedPrismaClient } = require('../apps/backend/services/sharedDatabase');
const bcrypt = require('bcryptjs');

async function seed() {
  const prisma = getSharedPrismaClient();
  console.log('[SEED] Starting demo company seed...');

  const companyEmail = 'h@gmail.com';
  const companyName = '╪┤╪▒┘â╪⌐ ╪º┘ä┘ç┘è┘à┘ç ┘ä┘ä╪¬╪¼╪º╪▒╪⌐';
  const ownerEmail = 'h@gmail.com';

  // 1. Create or get company
  let company = await prisma.company.findFirst({ where: { email: companyEmail } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: companyName,
        email: companyEmail,
        phone: '01000000000',
        currency: 'EGP',
        isActive: true,
        timezone: 'Africa/Cairo',
        sidebarLayout: 'three-tier',
        settings: JSON.stringify({ lastSystemChange: new Date().toISOString(), systemChangeBy: 'seed' }),
      },
    });
    console.log('[SEED] Created company:', company.id, company.name);
  } else {
    console.log('[SEED] Company already exists:', company.id, company.name);
  }

  // 2. Create or get owner user
  let owner = await prisma.user.findFirst({ where: { email: ownerEmail } });
  if (!owner) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hashedPassword,
        firstName: 'H',
        lastName: 'User',
        role: 'OWNER',
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        companyId: company.id,
      },
    });
    console.log('[SEED] Created user:', owner.id, owner.email);
  } else {
    const updates = {};
    if (owner.companyId !== company.id) updates.companyId = company.id;
    if (!owner.role) updates.role = 'OWNER';
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: owner.id }, data: updates });
      console.log('[SEED] Updated existing user:', Object.keys(updates).join(', '));
    }
    console.log('[SEED] User already exists:', owner.id, owner.email);
  }

  // 3. Link user to company as OWNER
  const existingLink = await prisma.userCompany.findFirst({
    where: { userId: owner.id, companyId: company.id },
  });
  if (!existingLink) {
    await prisma.userCompany.create({
      data: { userId: owner.id, companyId: company.id, role: 'OWNER', isActive: true, isDefault: true },
    });
    console.log('[SEED] Linked user to company as OWNER');
  }

  // 4. Create 2 additional employee users (workers)
  const employeeUsers = [
    { email: 'emp1@demo.com', firstName: '╪ú╪¡┘à╪»', lastName: '┘à┘ê╪╕┘ü' },
    { email: 'emp2@demo.com', firstName: '╪│╪º╪▒╪⌐', lastName: '┘à┘ê╪╕┘ü╪⌐' },
  ];
  const createdUsers = [owner];
  for (const emp of employeeUsers) {
    let user = await prisma.user.findFirst({ where: { email: emp.email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      user = await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: 'AGENT',
          isActive: true,
          companyId: company.id,
        },
      });
    }
    const empUpdates = {};
    if (user.companyId !== company.id) empUpdates.companyId = company.id;
    if (!user.role) empUpdates.role = 'AGENT';
    if (Object.keys(empUpdates).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: empUpdates });
    }
    const link = await prisma.userCompany.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!link) {
      await prisma.userCompany.create({
        data: { userId: user.id, companyId: company.id, role: 'AGENT', isActive: true },
      });
    }
    createdUsers.push(user);
  }
  console.log('[SEED] Created/linked', createdUsers.length, 'users');

  // 5. Create departments
  const departments = [
    { name: '╪º┘ä┘à╪¿┘è╪╣╪º╪¬', nameEn: 'Sales' },
    { name: '╪º┘ä┘à╪«╪▓┘ê┘å', nameEn: 'Inventory' },
    { name: '╪«╪»┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í', nameEn: 'Customer Service' },
  ];
  const createdDepts = [];
  for (const dept of departments) {
    const existing = await prisma.department.findFirst({
      where: { companyId: company.id, name: dept.name },
    });
    if (!existing) {
      const d = await prisma.department.create({
        data: { companyId: company.id, name: dept.name, nameEn: dept.nameEn, isActive: true },
      });
      createdDepts.push(d);
    } else {
      createdDepts.push(existing);
    }
  }
  // Create Employees (HR records)
  for (let i = 0; i < createdUsers.length && i < createdDepts.length; i++) {
    const existing = await prisma.employee.findFirst({
      where: { companyId: company.id, userId: createdUsers[i].id },
    });
    if (!existing) {
      await prisma.employee.create({
        data: {
          companyId: company.id,
          userId: createdUsers[i].id,
          employeeNumber: `EMP${String(i + 1).padStart(3, '0')}`,
          firstName: createdUsers[i].firstName || 'Employee',
          lastName: createdUsers[i].lastName || String(i + 1),
          email: createdUsers[i].email,
          hireDate: new Date(),
          departmentId: createdDepts[i]?.id || createdDepts[0].id,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('[SEED] Created departments and employee records');

  // 6. Create product categories
  const categories = ['╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬', '┘à┘ä╪º╪¿╪│', '┘à┘å╪▓┘ä'];
  const createdCats = [];
  for (const name of categories) {
    const existing = await prisma.category.findFirst({
      where: { companyId: company.id, name },
    });
    if (!existing) {
      const c = await prisma.category.create({
        data: { companyId: company.id, name, isActive: true },
      });
      createdCats.push(c);
    } else {
      createdCats.push(existing);
    }
  }
  console.log('[SEED] Created categories');

  // 7. Create products
  const productsData = [
    { name: '╪│┘à╪º╪╣╪⌐ ╪¿┘ä┘ê╪¬┘ê╪½', nameEn: 'Bluetooth Headphones', price: 299.00, categoryIdx: 0, stock: 50, sku: 'BT-001' },
    { name: '╪┤╪º╪¡┘å ┘à╪¬┘å┘é┘ä', nameEn: 'Power Bank', price: 199.00, categoryIdx: 0, stock: 100, sku: 'PB-001' },
    { name: '╪¬┘è╪┤┘è╪▒╪¬ ┘é╪╖┘å┘è', nameEn: 'Cotton T-Shirt', price: 89.00, categoryIdx: 1, stock: 200, sku: 'TS-001' },
    { name: '╪¡╪░╪º╪í ╪▒┘è╪º╪╢┘è', nameEn: 'Sneakers', price: 450.00, categoryIdx: 1, stock: 75, sku: 'SN-001' },
    { name: '┘à╪╡╪¿╪º╪¡ ╪╖╪º┘ê┘ä╪⌐', nameEn: 'Table Lamp', price: 150.00, categoryIdx: 2, stock: 30, sku: 'TL-001' },
    { name: '╪│╪º╪╣╪⌐ ╪░┘â┘è╪⌐', nameEn: 'Smart Watch', price: 650.00, categoryIdx: 0, stock: 25, sku: 'SW-001' },
    { name: '╪¡┘é┘è╪¿╪⌐ ╪╕┘ç╪▒', nameEn: 'Backpack', price: 320.00, categoryIdx: 1, stock: 40, sku: 'BP-001' },
    { name: '╪ú┘â┘ê╪º╪¿ ┘é┘ç┘ê╪⌐ (╪╖┘é┘à)', nameEn: 'Coffee Cups Set', price: 120.00, categoryIdx: 2, stock: 60, sku: 'CC-001' },
  ];
  const createdProducts = [];
  for (const p of productsData) {
    const existing = await prisma.product.findFirst({
      where: { companyId: company.id, sku: p.sku },
    });
    if (!existing) {
      const product = await prisma.product.create({
        data: {
          name: p.name,
          description: `┘à┘å╪¬╪¼ ${p.nameEn} - ${p.name}`,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          isActive: true,
          isFeatured: true,
          tags: JSON.stringify([p.nameEn, p.name]),
          companyId: company.id,
          categoryId: createdCats[p.categoryIdx]?.id || createdCats[0].id,
        },
      });
      createdProducts.push(product);
    } else {
      createdProducts.push(existing);
    }
  }
  console.log('[SEED] Created', createdProducts.length, 'products');

  // 8. Create a customer (needed for orders)
  let customer = await prisma.customer.findFirst({
    where: { companyId: company.id, phone: '01123456789' },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: '╪╣┘à┘è┘ä',
        lastName: '╪¬╪¼╪▒┘è╪¿┘è',
        phone: '01123456789',
        email: 'customer@demo.com',
      },
    });
  }
  console.log('[SEED] Created customer:', customer.id);

  // 9. Create orders
  const existingOrders = await prisma.order.findFirst({
    where: { companyId: company.id },
  });
  if (!existingOrders) {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];
    for (let i = 0; i < 4; i++) {
      const order = await prisma.order.create({
        data: {
          orderNumber: `DEMO-${String(i + 1).padStart(4, '0')}`,
          customerId: customer.id,
          status: statuses[i],
          subtotal: createdProducts[i] ? Number(createdProducts[i].price) : 100,
          total: createdProducts[i] ? Number(createdProducts[i].price) : 100,
          shipping: 0,
          discount: 0,
          tax: 0,
          currency: 'EGP',
          customerName: customer.name,
          customerPhone: customer.phone,
          companyId: company.id,
          createdBy: owner.id,
        },
      });
      // Add order items
      if (createdProducts[i]) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: createdProducts[i].id,
            quantity: 1,
            price: createdProducts[i].price,
            total: createdProducts[i].price,
            productName: createdProducts[i].name,
          },
        });
      }
    }
    console.log('[SEED] Created 4 demo orders');
  } else {
    console.log('[SEED] Orders already exist, skipping');
  }

  // 10. Create tasks (╪º┘ä┘à┘ç┘à╪º╪¬)
  const existingTasks = await prisma.task.findFirst({
    where: { companyId: company.id },
  });
  if (!existingTasks) {
    const taskData = [
      { title: '┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å', description: '┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å ╪º┘ä╪┤┘ç╪▒┘è╪⌐ ┘ê╪¬╪¡╪»┘è╪½ ╪º┘ä╪ú╪▒╪╡╪»╪⌐', status: 'IN_PROGRESS', priority: 'HIGH' },
      { title: '╪¬╪¡╪»┘è╪½ ╪º┘ä╪ú╪│╪╣╪º╪▒', description: '╪¬╪¡╪»┘è╪½ ╪ú╪│╪╣╪º╪▒ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ┘ä┘ä╪╣╪▒┘ê╪╢ ╪º┘ä╪¼╪»┘è╪»╪⌐', status: 'PENDING', priority: 'MEDIUM' },
      { title: '╪º┘ä╪¬╪│┘ê┘è┘é ┘ä┘ä╪¡┘à┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐', description: '╪Ñ╪╣╪»╪º╪» ╪¡┘à┘ä╪⌐ ╪¬╪│┘ê┘è┘é┘è╪⌐ ┘ä┘ä┘à┘å╪¬╪¼╪º╪¬ ╪º┘ä╪¼╪»┘è╪»╪⌐', status: 'PENDING', priority: 'HIGH' },
      { title: '┘à╪¬╪º╪¿╪╣╪⌐ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í', description: '┘à╪¬╪º╪¿╪╣╪⌐ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í ┘ê╪º┘ä╪¬╪ú┘â╪» ┘à┘å ╪º┘ä╪¬┘ê╪╡┘è┘ä', status: 'COMPLETED', priority: 'MEDIUM' },
    ];
    for (const t of taskData) {
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedTo: owner.id,
          createdBy: owner.id,
          companyId: company.id,
        },
      });
    }
    console.log('[SEED] Created', taskData.length, 'tasks');
  } else {
    console.log('[SEED] Tasks already exist, skipping');
  }

  console.log('[SEED] Γ£à Done! Company ID:', company.id);
  console.log('[SEED]   Owner email: h@gmail.com');
  console.log('[SEED]   Owner password: 123456');
  console.log('[SEED]   Employee emails: emp1@demo.com, emp2@demo.com');
  console.log('[SEED]   Employee password: 123456');

  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('[SEED] Error:', e);
  process.exit(1);
});
