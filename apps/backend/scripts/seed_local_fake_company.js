const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
  errorFormat: 'minimal',
});

const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const PASSWORD = 'Test@123456';

const fakeNames = {
  first: ['أحمد', 'محمد', 'علي', 'خالد', 'سارة', 'نورة', 'فاطمة', 'مريم', 'يوسف', 'عمر', 'حسين', 'محمود', 'إبراهيم', 'عبدالله', 'حسن', 'ناصر', '高明', 'ماجد', 'تامر', 'هاني'],
  last: ['السيد', 'محمد', 'أحمد', 'علي', 'خالد', 'عبدالله', 'حسن', 'ناصر', 'محمود', 'إبراهيم', 'يوسف', 'عمر', 'حسين', 'سالم', 'نبيل', 'كمال', 'جمال', 'سامي', 'عمار', 'موسى'],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rint(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rphone() { const p = ['010','011','012','015']; return `+20${pick(p)}${String(rint(10000000,99999999))}`; }
function remail(p) { const d = ['gmail.com','yahoo.com','hotmail.com','outlook.com','maxp.online']; return `${p}+${stamp}${rint(1,999)}@${pick(d)}`; }
function rbool() { return Math.random() > 0.5; }

const ucRoleMap = { COMPANY_ADMIN:'COMPANY_ADMIN', SALES_MANAGER:'MANAGER', SALES_AGENT:'AGENT', ACCOUNTANT:'MANAGER', SUPPORT_AGENT:'AGENT', MARKETING:'AGENT', INVENTORY_MANAGER:'MANAGER', AGENT:'AGENT', AFFILIATE:'AFFILIATE', OWNER:'OWNER' };

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  const COMPANY_SLUG = `al-tijara-${stamp}`;
  const COMPANY_NAME = 'شركة التجارة المتطورة';

  const result = await prisma.$transaction(async (tx) => {
    const ownerEmail = remail('owner');

    // --- Company ---
    const company = await tx.company.create({
      data: {
        name: COMPANY_NAME,
        slug: COMPANY_SLUG,
        email: ownerEmail,
        phone: rphone(),
        website: 'https://al-tijara.example.com',
        currency: 'EGP',
        plan: 'ENTERPRISE',
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
        settings: JSON.stringify({
          language: 'ar',
          demoCreatedAt: new Date().toISOString(),
          onboarding: {
            status: 'completed', version: 1, currentStep: 4, totalSteps: 4,
            completedSteps: ['welcome','operations','identity','integrations'],
            completedAt: new Date().toISOString(),
            profile: { workspaceName: COMPANY_NAME, industry: 'ecommerce', currency: 'EGP', tone: 'executive', whatsappNumber: rphone(), phone: rphone() },
          },
        }),
      },
    });

    // --- Owner ---
    const owner = await tx.user.create({
      data: {
        email: ownerEmail, password: hash, firstName: 'المالك', lastName: 'الرئيسي',
        phone: rphone(), role: 'OWNER', companyId: company.id, isActive: true,
        isEmailVerified: true, emailVerifiedAt: new Date(), timezone: 'Africa/Cairo',
      },
    });
    await tx.userCompany.create({ data: { userId: owner.id, companyId: company.id, role: 'OWNER', isActive: true, isDefault: true } });

    // --- Departments ---
    const deptNames = ['مبيعات', 'محاسبة', 'دعم العملاء', 'تسويق', 'مخازن', 'إدارة', 'شؤون موظفين', 'تطوير'];
    const depts = [];
    for (const n of deptNames) {
      depts.push(await tx.department.create({ data: { companyId: company.id, name: n, isActive: true } }));
    }

    // --- Employees (25 users) ---
    const employees = [];
    const empRoles = [
      { role: 'COMPANY_ADMIN', count: 2 }, { role: 'SALES_MANAGER', count: 3 },
      { role: 'SALES_AGENT', count: 5 }, { role: 'ACCOUNTANT', count: 2 },
      { role: 'SUPPORT_AGENT', count: 4 }, { role: 'MARKETING', count: 3 },
      { role: 'INVENTORY_MANAGER', count: 2 }, { role: 'AGENT', count: 4 },
    ];
    let eidx = 0;
    for (const grp of empRoles) {
      for (let i = 0; i < grp.count; i++) {
        const empNum = `EMP${String(eidx+1).padStart(5,'0')}`;
        const fn = pick(fakeNames.first); const ln = pick(fakeNames.last);
        const ee = remail(`emp${eidx}`);
        const u = await tx.user.create({
          data: { email: ee, password: hash, firstName: fn, lastName: ln, phone: rphone(), role: grp.role, companyId: company.id, isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), timezone: 'Africa/Cairo', employeeNumber: empNum },
        });
        await tx.userCompany.create({ data: { userId: u.id, companyId: company.id, role: ucRoleMap[grp.role] || 'AGENT', isActive: true, isDefault: true } });
        const depName = grp.role.includes('SALES') ? 'مبيعات' : grp.role.includes('ACCOUNT') ? 'محاسبة' : grp.role.includes('SUPPORT') ? 'دعم' : grp.role.includes('MARKET') ? 'تسويق' : grp.role.includes('INVENTORY') ? 'مخازن' : 'إدارة';
        const emp = await tx.employee.create({
          data: { companyId: company.id, userId: u.id, employeeNumber: empNum, firstName: fn, lastName: ln, email: ee, phone: rphone(), departmentId: (depts.find(d => d.name === depName) || depts[0]).id, hireDate: new Date(Date.now() - rint(30, 365) * 86400000), baseSalary: rint(5000, 25000), status: 'ACTIVE' },
        });
        employees.push({ user: u, employee: emp, role: grp.role });
        eidx++;
      }
    }

    // --- Warehouses ---
    const whData = [
      { name: 'المخزن الرئيسي - القاهرة', location: 'مدينة نصر، القاهرة', type: 'main', capacity: 5000 },
      { name: 'المخزن الفرعي - الجيزة', location: 'الدقي، الجيزة', type: 'backup', capacity: 2000 },
      { name: 'مخزن الإسكندرية', location: 'المنتزة، الإسكندرية', type: 'regional', capacity: 1500 },
    ];
    const warehouses = [];
    for (const w of whData) {
      warehouses.push(await tx.warehouse.create({ data: { companyId: company.id, name: w.name, location: w.location, type: w.type, capacity: w.capacity, isActive: true } }));
    }

    // --- Categories ---
    const catData = [
      { name: 'إلكترونيات', slug: 'electronics' }, { name: 'ملابس', slug: 'clothing' },
      { name: 'منزل ومطبخ', slug: 'home-kitchen' }, { name: 'عناية شخصية', slug: 'personal-care' },
      { name: 'رياضة', slug: 'sports' }, { name: 'ألعاب أطفال', slug: 'toys' },
      { name: 'كتب وقرطاسية', slug: 'books' }, { name: 'أثاث', slug: 'furniture' },
      { name: 'أطعمة ومشروبات', slug: 'food-drinks' }, { name: 'حيوانات أليفة', slug: 'pets' },
    ];
    const cats = {};
    for (const c of catData) {
      cats[c.slug] = await tx.category.create({ data: { companyId: company.id, name: c.name, slug: c.slug, isActive: true, displayType: 'default' } });
    }

    // --- Products (50 products) ---
    const prodData = [
      { name: 'هاتف ذكي X200', sku: 'ELC-001', cat: 'electronics', price: 12500, cost: 8500, stock: 50 },
      { name: 'لابتوب برو 15', sku: 'ELC-002', cat: 'electronics', price: 28500, cost: 19500, stock: 25 },
      { name: 'سماعات بلوتوث', sku: 'ELC-003', cat: 'electronics', price: 1250, cost: 650, stock: 120 },
      { name: 'ساعة ذكية', sku: 'ELC-004', cat: 'electronics', price: 3500, cost: 2200, stock: 40 },
      { name: 'شاحن متنقل 20000mAh', sku: 'ELC-005', cat: 'electronics', price: 850, cost: 450, stock: 200 },
      { name: 'تيشيرت قطن', sku: 'CLT-001', cat: 'clothing', price: 350, cost: 150, stock: 300 },
      { name: 'بنطلون جينز', sku: 'CLT-002', cat: 'clothing', price: 650, cost: 320, stock: 150 },
      { name: 'فستان سهرة', sku: 'CLT-003', cat: 'clothing', price: 1800, cost: 900, stock: 40 },
      { name: 'جاكيت شتوي', sku: 'CLT-004', cat: 'clothing', price: 2200, cost: 1100, stock: 60 },
      { name: 'حذاء رياضي', sku: 'CLT-005', cat: 'clothing', price: 1200, cost: 600, stock: 80 },
      { name: 'طقم قدور ستانلس', sku: 'HOM-001', cat: 'home-kitchen', price: 2500, cost: 1400, stock: 30 },
      { name: 'خلاط كهربائي', sku: 'HOM-002', cat: 'home-kitchen', price: 950, cost: 500, stock: 65 },
      { name: 'ميكروويف', sku: 'HOM-003', cat: 'home-kitchen', price: 3200, cost: 2100, stock: 35 },
      { name: 'مكانس كهربائية', sku: 'HOM-004', cat: 'home-kitchen', price: 4500, cost: 2800, stock: 20 },
      { name: 'طقم صحون 12 قطعة', sku: 'HOM-005', cat: 'home-kitchen', price: 850, cost: 400, stock: 100 },
      { name: 'كريم ترطيب بشرة', sku: 'PCR-001', cat: 'personal-care', price: 280, cost: 120, stock: 250 },
      { name: 'شامبو طبيعي', sku: 'PCR-002', cat: 'personal-care', price: 180, cost: 75, stock: 400 },
      { name: 'عطر فرنسي', sku: 'PCR-003', cat: 'personal-care', price: 1500, cost: 750, stock: 45 },
      { name: 'ماسك للوجه', sku: 'PCR-004', cat: 'personal-care', price: 120, cost: 50, stock: 500 },
      { name: 'زيت شعر أركان', sku: 'PCR-005', cat: 'personal-care', price: 350, cost: 180, stock: 180 },
      { name: 'أدوات جيم كاملة', sku: 'SPT-001', cat: 'sports', price: 5500, cost: 3500, stock: 15 },
      { name: 'ترامبولين صغير', sku: 'SPT-002', cat: 'sports', price: 1800, cost: 1000, stock: 25 },
      { name: 'مشايه كهربائية', sku: 'SPT-003', cat: 'sports', price: 12000, cost: 8000, stock: 10 },
      { name: 'دمبلز 20 كجم', sku: 'SPT-004', cat: 'sports', price: 900, cost: 500, stock: 40 },
      { name: 'حبل قفز احترافي', sku: 'SPT-005', cat: 'sports', price: 150, cost: 70, stock: 300 },
      { name: 'لعبة تعليمية للأطفال', sku: 'TOY-001', cat: 'toys', price: 250, cost: 120, stock: 200 },
      { name: 'دمية محشوة', sku: 'TOY-002', cat: 'toys', price: 180, cost: 80, stock: 150 },
      { name: 'سيارة تحكم عن بعد', sku: 'TOY-003', cat: 'toys', price: 650, cost: 350, stock: 60 },
      { name: 'ليجو مدينة', sku: 'TOY-004', cat: 'toys', price: 450, cost: 250, stock: 80 },
      { name: 'ألغاز 1000 قطعة', sku: 'TOY-005', cat: 'toys', price: 200, cost: 90, stock: 120 },
      { name: 'رواية الخيال العلمي', sku: 'BOK-001', cat: 'books', price: 120, cost: 55, stock: 500 },
      { name: 'كتاب تطوير الذات', sku: 'BOK-002', cat: 'books', price: 150, cost: 70, stock: 350 },
      { name: 'دفتر ملاحظات فاخر', sku: 'BOK-003', cat: 'books', price: 85, cost: 35, stock: 600 },
      { name: 'أقلام رسم احترافية', sku: 'BOK-004', cat: 'books', price: 220, cost: 110, stock: 200 },
      { name: 'مكتب زجاجي', sku: 'FRN-001', cat: 'furniture', price: 4500, cost: 2800, stock: 12 },
      { name: 'كرسي مكتب مريح', sku: 'FRN-002', cat: 'furniture', price: 3200, cost: 1800, stock: 20 },
      { name: 'رف كتب 5 طوابق', sku: 'FRN-003', cat: 'furniture', price: 1800, cost: 950, stock: 25 },
      { name: 'طاولة طعام 6 كراسي', sku: 'FRN-004', cat: 'furniture', price: 8500, cost: 5200, stock: 8 },
      { name: 'كنبة زاوية كبيرة', sku: 'FRN-005', cat: 'furniture', price: 12000, cost: 7500, stock: 5 },
      { name: 'قهوة عضوية 1كجم', sku: 'FOD-001', cat: 'food-drinks', price: 320, cost: 180, stock: 400 },
      { name: 'عسل نحل طبيعي', sku: 'FOD-002', cat: 'food-drinks', price: 250, cost: 130, stock: 300 },
      { name: 'شاي أخضر فاخر', sku: 'FOD-003', cat: 'food-drinks', price: 180, cost: 80, stock: 500 },
      { name: 'مكسرات مشكلة 500جم', sku: 'FOD-004', cat: 'food-drinks', price: 220, cost: 130, stock: 250 },
      { name: 'زيت زيتون بكر', sku: 'FOD-005', cat: 'food-drinks', price: 180, cost: 90, stock: 350 },
      { name: 'طعام كلاب 10كجم', sku: 'PET-001', cat: 'pets', price: 450, cost: 250, stock: 100 },
      { name: 'صنارة صيد', sku: 'PET-002', cat: 'pets', price: 120, cost: 55, stock: 200 },
      { name: 'قفص طيور كبير', sku: 'PET-003', cat: 'pets', price: 950, cost: 500, stock: 20 },
      { name: 'سرير كلاب مريح', sku: 'PET-004', cat: 'pets', price: 650, cost: 350, stock: 35 },
      { name: 'طوق كلب جلد', sku: 'PET-005', cat: 'pets', price: 180, cost: 80, stock: 150 },
    ];
    const products = [];
    for (const p of prodData) {
      const slug = p.sku.toLowerCase();
      const prod = await tx.product.create({
        data: {
          companyId: company.id, name: p.name, slug: slug || p.sku.toLowerCase(), sku: p.sku,
          description: `منتج ${p.name} عالي الجودة.`, categoryId: cats[p.cat].id,
          price: p.price, comparePrice: Math.round(p.price * 1.25), cost: p.cost, basePrice: p.cost,
          stock: p.stock, isActive: true, isFeatured: rbool(),
          mainImage: `https://picsum.photos/seed/${p.sku}/400/400`,
          images: JSON.stringify([`https://picsum.photos/seed/${p.sku}/400/400`]),
          tags: p.cat, metadata: JSON.stringify({ fakeData: true }),
        },
      });
      products.push(prod);
      let rem = p.stock;
      for (let wi = 0; wi < warehouses.length && rem > 0; wi++) {
        const qty = wi < warehouses.length - 1 ? Math.floor(p.stock / warehouses.length) : rem;
        if (qty > 0) {
          await tx.inventory.create({
            data: { productId: prod.id, warehouseId: warehouses[wi].id, quantity: qty, available: qty, minStock: Math.max(2, Math.floor(qty * 0.1)), maxStock: Math.max(10, qty * 2), reorderPoint: Math.max(2, Math.floor(qty * 0.15)), reorderQuantity: Math.max(5, Math.floor(qty * 0.5)), cost: p.cost, batchNumber: `${p.sku}-WH${wi+1}` },
          });
          rem -= qty;
        }
      }
    }

    // --- Shipping Companies ---
    const carriers = [
      { name: 'سريع إكسبريس', providerKey: 'SAREe', mode: 'API' },
      { name: 'بوسطا', providerKey: 'BOSTA', mode: 'API' },
      { name: 'أرامكس', providerKey: 'ARAMEX', mode: 'MANUAL' },
      { name: 'دي إتش إل', providerKey: 'DHL', mode: 'MANUAL' },
    ];
    const shippingCos = [];
    for (const c of carriers) {
      shippingCos.push(await tx.shippingCompany.create({
        data: { companyId: company.id, name: c.name, slug: c.name.replace(/\s/g, '-'), providerKey: c.providerKey, integrationMode: c.mode, isActive: true },
      }));
    }

    // --- Customers (100) ---
    const cf = ['سارة','نورة','مريم','فاطمة','أحمد','محمد','خالد','يوسف','هند','ليلى','عائشة','رقية','مها','هدى','أمل','سامي','ماجد','ناصر','تامر','هاني'];
    const cl = ['السيد','محمد','أحمد','علي','عبدالله','حسن','ناصر','سالم','نبيل','كمال','جمال','موسى','شوقي','فؤاد','راشد','زكي','مراد','بهجت','نجيب','فكري'];
    const customers = [];
    for (let i = 0; i < 100; i++) {
      customers.push(await tx.customer.create({
        data: {
          companyId: company.id, firstName: pick(cf), lastName: pick(cl),
          email: remail(`cust${i}`), phone: rphone(),
          status: pick(['ACTIVE','ACTIVE','ACTIVE','ACTIVE','LEAD']),
          tags: pick(['new','vip','regular','wholesale','new']),
          notes: i % 10 === 0 ? 'عميل مهم' : null,
        },
      }));
    }

    // --- Orders (200) ---
    const govs = ['القاهرة','الجيزة','الإسكندرية','الدقهلية','الشرقية','القليوبية','المنوفية','الغربية','دمياط','بورسعيد'];
    for (let i = 0; i < 200; i++) {
      const cust = pick(customers);
      const gov = pick(govs);
      const numItems = rint(1, 4);
      const sel = [];
      for (let j = 0; j < numItems; j++) sel.push(pick(products));
      let subtotal = 0;
      const items = [];
      for (const p of sel) {
        const qty = rint(1, 3);
        const t = p.price * qty; subtotal += t;
        items.push({ productId: p.id, productName: p.name, productSku: p.sku, quantity: qty, price: p.price, total: t, basePrice: Number(p.cost || 0), productImage: p.mainImage });
      }
      const shipping = rint(30, 120);
      const discount = i % 5 === 0 ? rint(50, 500) : 0;
      const total = subtotal + shipping - discount;
      const statuses = ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','DELIVERED','DELIVERED','CANCELLED'];
      const status = pick(statuses);
      await tx.order.create({
        data: {
          companyId: company.id, customerId: cust.id,
          orderNumber: `ORD-${stamp}-${String(i+1).padStart(4,'0')}`,
          status, paymentMethod: pick(['CASH','CREDIT_CARD','BANK_TRANSFER','WALLET']),
          paymentStatus: status === 'CANCELLED' ? 'FAILED' : status === 'DELIVERED' ? 'COMPLETED' : pick(['PENDING','COMPLETED']),
          subtotal, shipping, discount, total, currency: 'EGP',
          customerName: `${cust.firstName} ${cust.lastName}`, customerPhone: cust.phone, customerEmail: cust.email,
          city: gov, governorate: gov,
          orderSource: pick(['REGULAR','AFFILIATE_REFERRAL','AFFILIATE_DIRECT','INTERNAL_IMPORT']),
          createdAt: new Date(Date.now() - rint(0, 90) * 86400000),
          createdBy: owner.id, createdByName: `${owner.firstName} ${owner.lastName}`,
          orderItems: { create: items },
        },
      });
    }

    // --- Affiliate Settings ---
    await tx.affiliateSetting.create({
      data: { companyId: company.id, commissionType: 'PERCENTAGE', commissionRate: 10, cookieDuration: 30, termsAndConditions: 'شروط التسويق بالعمولة.', isActive: true, platformMarginType: 'FIXED', platformMarginValue: 15 },
    });

    // --- Affiliates (5) ---
    for (let i = 0; i < 5; i++) {
      const fn = pick(fakeNames.first); const ln = pick(fakeNames.last);
      const ae = remail(`aff${i}`);
      const au = await tx.user.create({
        data: { email: ae, password: hash, firstName: fn, lastName: ln, phone: rphone(), role: 'AFFILIATE', companyId: company.id, isActive: true, isEmailVerified: true, emailVerifiedAt: new Date(), timezone: 'Africa/Cairo' },
      });
      await tx.userCompany.create({ data: { userId: au.id, companyId: company.id, role: 'AFFILIATE', isActive: true, isDefault: true } });
      await tx.affiliate.create({
        data: { userId: au.id, companyId: company.id, affiliateCode: `AFF${stamp.slice(-4)}${String(i+1).padStart(2,'0')}`, commissionType: 'PERCENTAGE', commissionRate: 10, status: 'ACTIVE', paymentMethod: 'WALLET', paymentDetails: JSON.stringify({ wallet: rphone() }), minPayout: 200, totalEarnings: rint(0, 5000), pendingEarnings: rint(0, 2000), totalSales: rint(0, 50), totalClicks: rint(0, 500), conversionRate: rint(2, 15) },
      });
    }

    // --- Conversations (30) ---
    for (let i = 0; i < 30; i++) {
      const cust = pick(customers);
      const as = employees.filter(e => ['SUPPORT_AGENT','SALES_AGENT'].includes(e.role));
      const conv = await tx.conversation.create({
        data: {
          companyId: company.id, customerId: cust.id, channel: pick(['WHATSAPP','FACEBOOK','TELEGRAM','WEBSITE']),
          status: pick(['ACTIVE','ACTIVE','CLOSED','PENDING']),
          lastMessageAt: new Date(Date.now() - rint(0, 168) * 3600000),
          assignedUserId: as.length > 0 ? pick(as).user.id : owner.id,
        },
      });
      for (let j = 0; j < rint(2, 8); j++) {
        await tx.message.create({
          data: { conversationId: conv.id, senderId: j % 2 === 0 ? null : conv.assignedUserId, isFromCustomer: j % 2 === 0, content: pick(['السلام عليكم','كم السعر؟','متى الشحن؟','شكراً','هل المتوفر؟','أريد استرجاع','المنتج ممتاز']), type: 'TEXT', createdAt: new Date(Date.now() - rint(0, 168) * 3600000) },
        });
      }
    }

    // --- Notifications (30) ---
    for (let i = 0; i < 30; i++) {
      await tx.notification.create({
        data: { companyId: company.id, userId: pick(employees).user.id, type: pick(['ORDER','SYSTEM','ALERT','REMINDER']), title: pick(['طلب جديد','تأكيد طلب','تنبيه مخزون','تذكير']), message: pick(['تم استلام طلب','تم تأكيد الطلب','المخزون منخفض','موعد اجتماع']), isRead: rbool(), createdAt: new Date(Date.now() - rint(0, 7) * 86400000) },
      });
    }

    // --- Activity Logs (50) ---
    for (let i = 0; i < 50; i++) {
      await tx.activityLog.create({
        data: { companyId: company.id, userId: pick(employees).user.id, category: pick(['ORDER','USER','PRODUCT','SETTINGS','INVENTORY']), action: pick(['CREATE','UPDATE','DELETE','VIEW']), description: pick(['أنشأ طلب','حدث منتج','حذف عميل','عرض تقرير','حدث إعدادات']), severity: pick(['LOW','MEDIUM','HIGH']), isSuccess: true, createdAt: new Date(Date.now() - rint(0, 30) * 86400000) },
      });
    }

    // --- Suppliers (8) ---
    for (const sn of ['مورد الإلكترونيات','شركة الملابس','مستودع الأغذية','مستلزمات المنزل','شركة العطور','مصنع الأثاث','الأدوات الرياضية','الألعاب التعليمية']) {
      await tx.supplier.create({ data: { companyId: company.id, name: sn, email: remail('supplier'), phone: rphone(), contactPerson: `${pick(fakeNames.first)} ${pick(fakeNames.last)}`, paymentTerms: pick(['شهر','شهرين','نقداً']), isActive: true } });
    }

    // --- Policies (4) ---
    for (const p of [{t:'سياسة الخصوصية'},{t:'سياسة الشحن'},{t:'سياسة الاسترجاع'},{t:'سياسة الضمان'}]) {
      await tx.policy.create({ data: { companyId: company.id, title: p.t, content: 'نص السياسة...', isActive: true } });
    }

    // --- FAQs (5) ---
    for (const f of [{q:'ما طرق الدفع؟',a:'نقداً، بطاقات، تحويل'},{q:'مدة الشحن؟',a:'3-7 أيام'},{q:'الإلغاء؟',a:'قبل الشحن'},{q:'التتبع؟',a:'عبر رابط التتبع'},{q:'شحن دولي؟',a:'نعم'}]) {
      await tx.faq.create({ data: { companyId: company.id, question: f.q, answer: f.a, isActive: true } });
    }

    // --- Installed Apps ---
    const appSlugs = ['ecommerce-basic','order-core','order-shipping-turbo','order-invoicing','conversion-suite','inventory-pro','affiliate-pro','procurement-pro','crm-basic','crm-loyalty','analytics-advanced','wallet-system'];
    const apps = await tx.marketplaceApp.findMany({ where: { slug: { in: appSlugs }, isActive: true }, select: { id: true, slug: true } });
    for (const app of apps) {
      await tx.companyApp.upsert({ where: { companyId_appId: { companyId: company.id, appId: app.id } }, update: { status: 'ACTIVE' }, create: { companyId: company.id, appId: app.id, status: 'ACTIVE', activePricingModel: 'SUBSCRIPTION' } });
    }

    return { company, owner };
  });

  console.log(JSON.stringify({
    success: true,
    company: { id: result.company.id, name: result.company.name, slug: result.company.slug },
    credentials: { email: result.owner.email, password: PASSWORD },
  }, null, 2));
}

main().catch(e => { console.error('Seed failed:', e); process.exitCode = 1; }).finally(() => prisma.$disconnect().catch(() => {}));
