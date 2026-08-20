/**
 * Production seed: creates/fills the company for h@gmail.com
 * with products, categories, customer, orders, tasks, and employee records.
 * Idempotent - safe to re-run.
 */
const path = require('path');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
});

const COMPANY_EMAIL = 'h@gmail.com';

const categories = [
  { name: '╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬', nameEn: 'Electronics' },
  { name: '┘à┘ä╪º╪¿╪│', nameEn: 'Clothing' },
  { name: '┘à┘å╪▓┘ä', nameEn: 'Home' },
];

const productsData = [
  { name: '╪│┘à╪º╪╣╪⌐ ╪¿┘ä┘ê╪¬┘ê╪½', price: 299, cat: '╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬', stock: 50, sku: 'BT-001', desc: '╪│┘à╪º╪╣╪⌐ ╪¿┘ä┘ê╪¬┘ê╪½ ┘ä╪º╪│┘ä┘â┘è╪⌐ ╪¿╪¼┘ê╪»╪⌐ ╪╡┘ê╪¬ ╪╣╪º┘ä┘è╪⌐' },
  { name: '╪┤╪º╪¡┘å ┘à╪¬┘å┘é┘ä', price: 199, cat: '╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬', stock: 100, sku: 'PB-001', desc: '╪┤╪º╪¡┘å ┘à╪¬┘å┘é┘ä 10000mAh ╪│╪╣╪⌐ ┘â╪¿┘è╪▒╪⌐' },
  { name: '╪│╪º╪╣╪⌐ ╪░┘â┘è╪⌐', price: 650, cat: '╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬', stock: 25, sku: 'SW-001', desc: '╪│╪º╪╣╪⌐ ╪░┘â┘è╪⌐ ╪¬╪»╪╣┘à ╪º┘ä┘à┘â╪º┘ä┘à╪º╪¬ ┘ê╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬' },
  { name: '╪¬┘è╪┤┘è╪▒╪¬ ┘é╪╖┘å┘è', price: 89, cat: '┘à┘ä╪º╪¿╪│', stock: 200, sku: 'TS-001', desc: '╪¬┘è╪┤┘è╪▒╪¬ ┘é╪╖┘å┘è ┘ü╪º╪«╪▒ ╪¿┘à┘é╪º╪│╪º╪¬ ┘à╪¬╪╣╪»╪»╪⌐' },
  { name: '╪¡╪░╪º╪í ╪▒┘è╪º╪╢┘è', price: 450, cat: '┘à┘ä╪º╪¿╪│', stock: 75, sku: 'SN-001', desc: '╪¡╪░╪º╪í ╪▒┘è╪º╪╢┘è ┘à╪▒┘è╪¡ ┘ä┘ä┘à╪┤┘è ┘ê╪º┘ä╪▒┘è╪º╪╢╪⌐' },
  { name: '╪¡┘é┘è╪¿╪⌐ ╪╕┘ç╪▒', price: 320, cat: '┘à┘ä╪º╪¿╪│', stock: 40, sku: 'BP-001', desc: '╪¡┘é┘è╪¿╪⌐ ╪╕┘ç╪▒ ╪╣╪╡╪▒┘è╪⌐ ┘à╪¬╪╣╪»╪»╪⌐ ╪º┘ä╪¼┘è┘ê╪¿' },
  { name: '┘à╪╡╪¿╪º╪¡ ╪╖╪º┘ê┘ä╪⌐', price: 150, cat: '┘à┘å╪▓┘ä', stock: 30, sku: 'TL-001', desc: '┘à╪╡╪¿╪º╪¡ ╪╖╪º┘ê┘ä╪⌐ ╪ú┘å┘è┘é ╪¿╪Ñ╪╢╪º╪í╪⌐ ┘ç╪º╪»╪ª╪⌐' },
  { name: '╪ú┘â┘ê╪º╪¿ ┘é┘ç┘ê╪⌐ (╪╖┘é┘à)', price: 120, cat: '┘à┘å╪▓┘ä', stock: 60, sku: 'CC-001', desc: '╪╖┘é┘à ╪ú┘â┘ê╪º╪¿ ┘é┘ç┘ê╪⌐ ╪│┘è╪▒╪º┘à┘è┘â ┘ü╪º╪«╪▒' },
];

const tasksData = [
  { title: '┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å', description: '┘à╪▒╪º╪¼╪╣╪⌐ ╪º┘ä┘à╪«╪▓┘ê┘å ╪º┘ä╪┤┘ç╪▒┘è╪⌐ ┘ê╪¬╪¡╪»┘è╪½ ╪º┘ä╪ú╪▒╪╡╪»╪⌐', status: 'IN_PROGRESS', priority: 'HIGH' },
  { title: '╪¬╪¡╪»┘è╪½ ╪º┘ä╪ú╪│╪╣╪º╪▒', description: '╪¬╪¡╪»┘è╪½ ╪ú╪│╪╣╪º╪▒ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ┘ä┘ä╪╣╪▒┘ê╪╢ ╪º┘ä╪¼╪»┘è╪»╪⌐', status: 'PENDING', priority: 'MEDIUM' },
  { title: '╪º┘ä╪¬╪│┘ê┘è┘é ┘ä┘ä╪¡┘à┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐', description: '╪Ñ╪╣╪»╪º╪» ╪¡┘à┘ä╪⌐ ╪¬╪│┘ê┘è┘é┘è╪⌐ ┘ä┘ä┘à┘å╪¬╪¼╪º╪¬ ╪º┘ä╪¼╪»┘è╪»╪⌐', status: 'PENDING', priority: 'HIGH' },
  { title: '┘à╪¬╪º╪¿╪╣╪⌐ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í', description: '┘à╪¬╪º╪¿╪╣╪⌐ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í ┘ê╪º┘ä╪¬╪ú┘â╪» ┘à┘å ╪º┘ä╪¬┘ê╪╡┘è┘ä', status: 'COMPLETED', priority: 'MEDIUM' },
];

async function main() {
  console.log(`≡ƒöì Looking for company: ${COMPANY_EMAIL}...`);
  let company = await prisma.company.findFirst({ where: { email: COMPANY_EMAIL } });

  let ownerUserId = null;
  if (!company) {
    console.log('≡ƒÅó Company not found, creating it...');
    const uniqueSlug = 'h-' + Date.now();
    company = await prisma.company.create({
      data: {
        name: '╪┤╪▒┘â╪⌐ ╪º┘ä┘ç┘è┘à┘ç ┘ä┘ä╪¬╪¼╪º╪▒╪⌐',
        email: COMPANY_EMAIL,
        phone: '01000000000',
        currency: 'EGP',
        isActive: true,
        timezone: 'Africa/Cairo',
        sidebarLayout: 'three-tier',
        slug: uniqueSlug,
        settings: JSON.stringify({ lastSystemChange: new Date().toISOString(), systemChangeBy: 'seed' }),
      },
    });
    console.log('Γ£à Company created:', company.id, company.name);

    // Create owner user
    const hashedPassword = await bcrypt.hash('123456', 10);
    const owner = await prisma.user.create({
      data: {
        email: COMPANY_EMAIL,
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
    ownerUserId = owner.id;
    await prisma.userCompany.create({
      data: { userId: owner.id, companyId: company.id, role: 'OWNER', isActive: true, isDefault: true },
    });
    console.log('Γ£à Owner user created:', owner.email);
  } else {
    console.log('≡ƒÅó Company found:', company.id, company.name);
    const owner = await prisma.user.findFirst({ where: { email: COMPANY_EMAIL } });
    ownerUserId = owner ? owner.id : null;
  }

  // 1. Categories
  console.log('\n≡ƒôé Categories...');
  const createdCats = {};
  for (const cat of categories) {
    let c = await prisma.category.findFirst({ where: { companyId: company.id, name: cat.name } });
    if (!c) {
      c = await prisma.category.create({ data: { name: cat.name, companyId: company.id, isActive: true } });
      console.log('  Γ£à Created:', cat.name);
    }
    createdCats[cat.name] = c;
  }

  // 2. Products
  console.log('\n≡ƒôª Products...');
  const createdProducts = {};
  for (const p of productsData) {
    let product = await prisma.product.findFirst({ where: { companyId: company.id, sku: p.sku } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          description: p.desc,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          isActive: true,
          isFeatured: true,
          categoryId: createdCats[p.cat]?.id || createdCats['╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º╪¬'].id,
          companyId: company.id,
          trackInventory: true,
        },
      });
      console.log('  Γ£à Created:', p.name, '-', p.price, 'EGP');
    }
    createdProducts[p.sku] = product;
  }

  // 3. Customer
  console.log('\n≡ƒæñ Customer...');
  let customer = await prisma.customer.findFirst({ where: { companyId: company.id, phone: '01123456789' } });
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
    console.log('  Γ£à Created customer:', customer.id);
  }

  // 4. Orders
  console.log('\n≡ƒôï Orders...');
  const existingOrder = await prisma.order.findFirst({ where: { companyId: company.id } });
  if (!existingOrder) {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];
    const skuKeys = Object.keys(createdProducts);
    for (let i = 0; i < 4; i++) {
      const product = createdProducts[skuKeys[i]];
      const price = Number(product.price);
      const order = await prisma.order.create({
        data: {
          orderNumber: `DEMO-${String(i + 1).padStart(4, '0')}`,
          customerId: customer.id,
          status: statuses[i],
          subtotal: price,
          total: price,
          shipping: 0,
          discount: 0,
          tax: 0,
          currency: 'EGP',
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phone,
          companyId: company.id,
          createdBy: ownerUserId,
        },
      });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: 1,
          price: product.price,
          total: product.price,
          productName: product.name,
        },
      });
      console.log('  Γ£à Created order:', order.orderNumber, '|', statuses[i], '|', price, 'EGP');
    }
  } else {
    console.log('  ΓÅ¡∩╕Å Orders already exist, skipping');
  }

  // 5. Tasks
  console.log('\n≡ƒôî Tasks...');
  const existingTask = await prisma.task.findFirst({ where: { companyId: company.id } });
  if (!existingTask) {
    for (const t of tasksData) {
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedTo: ownerUserId,
          createdBy: ownerUserId,
          companyId: company.id,
        },
      });
      console.log('  Γ£à Created task:', t.title);
    }
  } else {
    console.log('  ΓÅ¡∩╕Å Tasks already exist, skipping');
  }

  // 6. Employees (HR)
  console.log('\n≡ƒæÑ Employees...');
  const deptNames = ['╪º┘ä┘à╪¿┘è╪╣╪º╪¬', '╪º┘ä┘à╪«╪▓┘ê┘å', '╪«╪»┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í'];
  const deptIds = {};
  for (const dn of deptNames) {
    let d = await prisma.department.findFirst({ where: { companyId: company.id, name: dn } });
    if (!d) {
      d = await prisma.department.create({ data: { companyId: company.id, name: dn, isActive: true } });
    }
    deptIds[dn] = d.id;
  }

  const employees = [
    { firstName: 'H', lastName: 'User', dept: '╪º┘ä┘à╪¿┘è╪╣╪º╪¬', num: 'EMP001', email: COMPANY_EMAIL },
    { firstName: '╪ú╪¡┘à╪»', lastName: '┘à┘ê╪╕┘ü', dept: '╪º┘ä┘à╪«╪▓┘ê┘å', num: 'EMP002', email: 'emp1@demo.com' },
    { firstName: '╪│╪º╪▒╪⌐', lastName: '┘à┘ê╪╕┘ü╪⌐', dept: '╪«╪»┘à╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í', num: 'EMP003', email: 'emp2@demo.com' },
  ];

  for (const emp of employees) {
    // Ensure a linked user exists
    let user = await prisma.user.findFirst({ where: { email: emp.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: emp.email,
          password: await bcrypt.hash('123456', 10),
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: 'AGENT',
          isActive: true,
          companyId: company.id,
        },
      });
    }
    // Ensure UserCompany link exists
    const link = await prisma.userCompany.findFirst({
      where: { userId: user.id, companyId: company.id },
    });
    if (!link) {
      await prisma.userCompany.create({
        data: { userId: user.id, companyId: company.id, role: 'AGENT', isActive: true },
      });
    }
    // Create or reuse an Employee record for this user (userId is unique)
    const existing = await prisma.employee.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      console.log('  ΓÅ¡∩╕Å Employee already exists for', emp.email, '| num:', existing.employeeNumber);
      continue;
    }
    await prisma.employee.create({
      data: {
        companyId: company.id,
        userId: user.id,
        employeeNumber: emp.num,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        hireDate: new Date(),
        departmentId: deptIds[emp.dept],
        status: 'ACTIVE',
      },
    });
    console.log('  Γ£à Created employee:', emp.firstName, emp.lastName);
  }

  console.log('\n≡ƒÄë Done! Company:', company.id, '| Email:', COMPANY_EMAIL);
}

main()
  .catch(e => { console.error('Γ¥î Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
