/**
 * @file seed-agentic-dev.js
 * @description Seeds minimal development data for Agentic AI testing.
 * Uses raw SQL with quoted column names.
 */

const { getSharedPrismaClient } = require('../backend/services/sharedDatabase');

async function seed() {
  const prisma = getSharedPrismaClient();

  console.log('[SEED] Starting Agentic AI dev seed...');

  // Check if company exists
  const existingCompany = await prisma.$queryRaw`
    SELECT id FROM "companies" WHERE email = 'dev@maxp.test' LIMIT 1
  `;

  let companyId;
  if (existingCompany.length > 0) {
    companyId = existingCompany[0].id;
    console.log('[SEED] Company already exists:', companyId);
  } else {
    companyId = 'dev_company_' + Date.now();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "companies" (id, name, email, phone, currency, plan, "isActive", timezone, "sidebarLayout", "createdAt", "updatedAt")
      VALUES ('${companyId}', 'MaxP Dev Company', 'dev@maxp.test', '01000000000', 'EGP', 'ENTERPRISE', true, 'Africa/Cairo', 'three-tier', NOW(), NOW())
    `);
    console.log('[SEED] Created company:', companyId);
  }

  // Create a test user
  const existingUser = await prisma.$queryRaw`
    SELECT id FROM "users" WHERE email = 'dev@maxp.test' LIMIT 1
  `;
  if (existingUser.length === 0) {
    const userId = 'dev_user_' + Date.now();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "users" (id, email, password, "firstName", "lastName", "isActive", "companyId", "createdAt", "updatedAt")
      VALUES ('${userId}', 'dev@maxp.test', 'dev123456', 'Dev', 'User', true, '${companyId}', NOW(), NOW())
    `);
    console.log('[SEED] Created user:', userId);
  } else {
    console.log('[SEED] User already exists');
  }

  // Create default agent departments
  const departments = [
    { key: 'executive', name: 'الإدارة الرئيسية', description: 'المدير الرئيسي وتنسيق الوكلاء', icon: '👑', sortOrder: 1 },
    { key: 'sales', name: 'المبيعات', description: 'مبيعات العملاء ومسودات الطلبات', icon: '💼', sortOrder: 10 },
    { key: 'support', name: 'الدعم', description: 'خدمة العملاء ومتابعة الطلبات', icon: '🎧', sortOrder: 20 },
    { key: 'inventory', name: 'المخزون والتسعير', description: 'المخزون والأسعار والمنتجات', icon: '📦', sortOrder: 30 },
    { key: 'marketing', name: 'التسويق', description: 'الحملات والإعلانات', icon: '📣', sortOrder: 40 },
    { key: 'messenger', name: 'فيسبوك وماسنجر', description: 'ردود Facebook Messenger', icon: '💬', sortOrder: 50 },
    { key: 'operations', name: 'العمليات', description: 'الشحن والتشغيل والمتابعة', icon: '⚙️', sortOrder: 60 },
  ];

  for (const dept of departments) {
    const id = `agent_dept_${companyId.slice(-6)}_${dept.key}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "agent_departments" (id, "companyId", key, name, description, icon, "sortOrder", "createdAt", "updatedAt")
      VALUES ('${id}', '${companyId}', '${dept.key.replace(/'/g, "''")}', '${dept.name.replace(/'/g, "''")}', '${(dept.description || '').replace(/'/g, "''")}', '${dept.icon}', ${dept.sortOrder}, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('[SEED] Created/updated', departments.length, 'departments');

  // Create a CEO agent
  const ceoId = `agent_${companyId.slice(-6)}_ceo`;
  await prisma.$executeRawUnsafe(`
    INSERT INTO "company_agents" (id, "companyId", name, role, description, icon, status, "templateSlug", "createdBy", "createdAt", "updatedAt")
    VALUES ('${ceoId}', '${companyId}', 'CEO Agent', 'CEO', 'المدير التنفيذي للوكلاء', '👑', 'ACTIVE', 'manager-ceo', 'seed_script', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('[SEED] Created CEO agent:', ceoId);

  // Create test products
  for (let i = 1; i <= 3; i++) {
    const productId = `seed_product_${i}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "products" (id, "companyId", name, description, price, stock, "isActive", sku, "createdAt", "updatedAt")
      VALUES ('${productId}', '${companyId}', 'Test Product ${i}', 'Development test product ${i}', ${100 * i}, 50, true, 'DEV-SKU-${i}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
  console.log('[SEED] Created 3 test products');

  console.log('[SEED] Done! Company ID for testing:', companyId);
  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('[SEED] Error:', e);
  process.exit(1);
});
