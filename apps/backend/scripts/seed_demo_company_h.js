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
  { name: 'إلكترونيات', nameEn: 'Electronics' },
  { name: 'ملابس', nameEn: 'Clothing' },
  { name: 'منزل', nameEn: 'Home' },
];

const productsData = [
  { name: 'سماعة بلوتوث', price: 299, cat: 'إلكترونيات', stock: 50, sku: 'BT-001', desc: 'سماعة بلوتوث لاسلكية بجودة صوت عالية' },
  { name: 'شاحن متنقل', price: 199, cat: 'إلكترونيات', stock: 100, sku: 'PB-001', desc: 'شاحن متنقل 10000mAh سعة كبيرة' },
  { name: 'ساعة ذكية', price: 650, cat: 'إلكترونيات', stock: 25, sku: 'SW-001', desc: 'ساعة ذكية تدعم المكالمات والإشعارات' },
  { name: 'تيشيرت قطني', price: 89, cat: 'ملابس', stock: 200, sku: 'TS-001', desc: 'تيشيرت قطني فاخر بمقاسات متعددة' },
  { name: 'حذاء رياضي', price: 450, cat: 'ملابس', stock: 75, sku: 'SN-001', desc: 'حذاء رياضي مريح للمشي والرياضة' },
  { name: 'حقيبة ظهر', price: 320, cat: 'ملابس', stock: 40, sku: 'BP-001', desc: 'حقيبة ظهر عصرية متعددة الجيوب' },
  { name: 'مصباح طاولة', price: 150, cat: 'منزل', stock: 30, sku: 'TL-001', desc: 'مصباح طاولة أنيق بإضاءة هادئة' },
  { name: 'أكواب قهوة (طقم)', price: 120, cat: 'منزل', stock: 60, sku: 'CC-001', desc: 'طقم أكواب قهوة سيراميك فاخر' },
];

const tasksData = [
  { title: 'مراجعة المخزون', description: 'مراجعة المخزون الشهرية وتحديث الأرصدة', status: 'IN_PROGRESS', priority: 'HIGH' },
  { title: 'تحديث الأسعار', description: 'تحديث أسعار المنتجات للعروض الجديدة', status: 'PENDING', priority: 'MEDIUM' },
  { title: 'التسويق للحملة الجديدة', description: 'إعداد حملة تسويقية للمنتجات الجديدة', status: 'PENDING', priority: 'HIGH' },
  { title: 'متابعة طلبات العملاء', description: 'متابعة طلبات العملاء والتأكد من التوصيل', status: 'COMPLETED', priority: 'MEDIUM' },
];

async function main() {
  console.log(`🔍 Looking for company: ${COMPANY_EMAIL}...`);
  let company = await prisma.company.findFirst({ where: { email: COMPANY_EMAIL } });

  let ownerUserId = null;
  if (!company) {
    console.log('🏢 Company not found, creating it...');
    const uniqueSlug = 'h-' + Date.now();
    company = await prisma.company.create({
      data: {
        name: 'شركة الهيمه للتجارة',
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
    console.log('✅ Company created:', company.id, company.name);

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
    console.log('✅ Owner user created:', owner.email);
  } else {
    console.log('🏢 Company found:', company.id, company.name);
    const owner = await prisma.user.findFirst({ where: { email: COMPANY_EMAIL } });
    ownerUserId = owner ? owner.id : null;
  }

  // 1. Categories
  console.log('\n📂 Categories...');
  const createdCats = {};
  for (const cat of categories) {
    let c = await prisma.category.findFirst({ where: { companyId: company.id, name: cat.name } });
    if (!c) {
      c = await prisma.category.create({ data: { name: cat.name, companyId: company.id, isActive: true } });
      console.log('  ✅ Created:', cat.name);
    }
    createdCats[cat.name] = c;
  }

  // 2. Products
  console.log('\n📦 Products...');
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
          categoryId: createdCats[p.cat]?.id || createdCats['إلكترونيات'].id,
          companyId: company.id,
          trackInventory: true,
        },
      });
      console.log('  ✅ Created:', p.name, '-', p.price, 'EGP');
    }
    createdProducts[p.sku] = product;
  }

  // 3. Customer
  console.log('\n👤 Customer...');
  let customer = await prisma.customer.findFirst({ where: { companyId: company.id, phone: '01123456789' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: 'عميل',
        lastName: 'تجريبي',
        phone: '01123456789',
        email: 'customer@demo.com',
      },
    });
    console.log('  ✅ Created customer:', customer.id);
  }

  // 4. Orders
  console.log('\n📋 Orders...');
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
      console.log('  ✅ Created order:', order.orderNumber, '|', statuses[i], '|', price, 'EGP');
    }
  } else {
    console.log('  ⏭️ Orders already exist, skipping');
  }

  // 5. Tasks
  console.log('\n📌 Tasks...');
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
      console.log('  ✅ Created task:', t.title);
    }
  } else {
    console.log('  ⏭️ Tasks already exist, skipping');
  }

  // 6. Employees (HR)
  console.log('\n👥 Employees...');
  const deptNames = ['المبيعات', 'المخزون', 'خدمة العملاء'];
  const deptIds = {};
  for (const dn of deptNames) {
    let d = await prisma.department.findFirst({ where: { companyId: company.id, name: dn } });
    if (!d) {
      d = await prisma.department.create({ data: { companyId: company.id, name: dn, isActive: true } });
    }
    deptIds[dn] = d.id;
  }

  const employees = [
    { firstName: 'H', lastName: 'User', dept: 'المبيعات', num: 'EMP001', email: COMPANY_EMAIL },
    { firstName: 'أحمد', lastName: 'موظف', dept: 'المخزون', num: 'EMP002', email: 'emp1@demo.com' },
    { firstName: 'سارة', lastName: 'موظفة', dept: 'خدمة العملاء', num: 'EMP003', email: 'emp2@demo.com' },
  ];

  for (const emp of employees) {
    const existing = await prisma.employee.findFirst({
      where: { companyId: company.id, employeeNumber: emp.num },
    });
    if (!existing) {
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
      console.log('  ✅ Created employee:', emp.firstName, emp.lastName);
    } else {
      console.log('  ⏭️ Employee exists:', emp.num);
    }
  }

  console.log('\n🎉 Done! Company:', company.id, '| Email:', COMPANY_EMAIL);
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
