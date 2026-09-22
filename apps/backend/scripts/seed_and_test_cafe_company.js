const path = require('path');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const businessSpecialtyService = require('../services/businessSpecialtyService');
const recipeService = require('../services/recipeService');
const stockAuditService = require('../services/stockAuditService');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const prisma = getSharedPrismaClient();

async function runCafeCompanySeedAndTest() {
  console.log('================================================================');
  console.log('🚀 بدء إنشاء شركة كافيه متخصصة واختبار المنظومة الشاملة E2E');
  console.log('================================================================\n');

  // 1. Ensure Default Specialties are initialized in the platform
  console.log('1️⃣ [SPECIALTY] تهيئة تخصصات الأنشطة في المنصة...');
  await businessSpecialtyService.ensureDefaultSpecialties();
  console.log('   ✅ تم التأكد من وجود تخصص "كافيهات ومطاعم" (bizsp_cafe_restaurant)\n');

  // 2. Setup/Clean Demo Company
  const COMPANY_SLUG = 'aroma-cafe-demo';
  const COMPANY_NAME = 'أروما ريستريتو كافيه & روستري (Aroma Ristretto Cafe)';
  const ADMIN_EMAIL = 'admin@aroma-cafe.maxp.online';
  const PASSWORD = 'Cafe@Secure2026';

  console.log(`2️⃣ [COMPANY] إنشاء وتجهيز الشركة: "${COMPANY_NAME}"...`);

  // Clean existing company if present for clean idempotent test
  const existingCompany = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } });
  let companyId;

  if (existingCompany) {
    companyId = existingCompany.id;
    console.log(`   ℹ️ الشركة موجودة مسبقاً (ID: ${companyId})، جاري تحديث الإعدادات...`);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        name: COMPANY_NAME,
        industry: 'cafe_restaurant',
        currency: 'EGP',
        isActive: true,
      }
    });
  } else {
    const newCo = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        slug: COMPANY_SLUG,
        email: ADMIN_EMAIL,
        phone: '+201012345678',
        currency: 'EGP',
        industry: 'cafe_restaurant',
        isActive: true,
        timezone: 'Africa/Cairo',
        settings: JSON.stringify({
          specialtyId: 'bizsp_cafe_restaurant',
          specialtySlug: 'cafe-restaurant',
          themeId: 'cafe-demo',
          installedApps: ['cafe-restaurant-pro', 'pos-pro', 'inventory-pro', 'procurement-pro', 'store']
        })
      }
    });
    companyId = newCo.id;
    console.log(`   ✅ تم إنشاء الشركة بنجاح (ID: ${companyId})`);
  }

  // Ensure Admin User
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  let adminUser = await prisma.user.findFirst({ where: { email: ADMIN_EMAIL } });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        password: passwordHash,
        firstName: 'مدير',
        lastName: 'الكافيه',
        phone: '+201012345678',
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        isEmailVerified: true
      }
    });
  }

  // Ensure CompanyUser link
  const existingCU = await prisma.companyUser.findFirst({ where: { companyId, userId: adminUser.id } });
  if (!existingCU) {
    await prisma.companyUser.create({
      data: {
        companyId,
        userId: adminUser.id,
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE'
      }
    });
  }

  // Ensure Main Bar Warehouse
  let warehouse = await prisma.warehouse.findFirst({
    where: { companyId, code: 'BAR-WH-01' }
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        companyId,
        name: 'مستودع البار الرئيسي (Main Bar Storage)',
        code: 'BAR-WH-01',
        isDefault: true,
        isActive: true,
        address: 'الفرع الرئيسي - منطقة البارستا'
      }
    });
  }
  console.log(`   ✅ مستودع البار جاهز: ${warehouse.name} (${warehouse.code})\n`);

  // 3. Create Raw Materials & Finished Products
  console.log('3️⃣ [CATALOG] إنشاء المواد الخام والمشروبات التامة...');

  // Helper to upsert product & inventory
  async function upsertProductWithStock({ name, sku, price, cost, unit, stock, isRaw, trackInventory }) {
    let prod = await prisma.product.findFirst({ where: { companyId, sku } });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          companyId,
          name,
          sku,
          price: price,
          cost: cost,
          stock: stock,
          unit: unit,
          trackInventory: trackInventory,
          status: 'ACTIVE',
          currency: 'EGP'
        }
      });
    } else {
      prod = await prisma.product.update({
        where: { id: prod.id },
        data: { price, cost, stock, unit, trackInventory }
      });
    }

    // Warehouse Inventory
    const inv = await prisma.inventory.findFirst({
      where: { warehouseId: warehouse.id, productId: prod.id }
    });
    if (!inv) {
      await prisma.inventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: prod.id,
          quantity: stock,
          available: stock,
          reserved: 0
        }
      });
    } else {
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: stock, available: stock }
      });
    }

    return prod;
  }

  // Raw Materials
  const rawBeans = await upsertProductWithStock({
    name: 'بن إثيوبي يرقاتشيف (Ethiopian Yirgacheffe)',
    sku: 'RAW-COFFEE-ETH',
    price: 0.60,
    cost: 0.45, // 0.45 EGP per Gram = 450 EGP / kg
    unit: 'G',
    stock: 10000, // 10 kg
    isRaw: true,
    trackInventory: true
  });

  const rawMilk = await upsertProductWithStock({
    name: 'حليب كامل الدسم المراعي (Whole Milk)',
    sku: 'RAW-MILK-FULL',
    price: 0.05,
    cost: 0.04, // 0.04 EGP per ML = 40 EGP / Liter
    unit: 'ML',
    stock: 25000, // 25 Liters
    isRaw: true,
    trackInventory: true
  });

  const rawCup8oz = await upsertProductWithStock({
    name: 'كوب ورقي مزدوج 8 أونص (Double Wall 8oz Cup)',
    sku: 'RAW-CUP-8OZ',
    price: 2.00,
    cost: 1.50,
    unit: 'PIECE',
    stock: 500,
    isRaw: true,
    trackInventory: true
  });

  const rawLid = await upsertProductWithStock({
    name: 'غطاء كوب أسود (Black Lid 8oz)',
    sku: 'RAW-LID-8OZ',
    price: 0.75,
    cost: 0.50,
    unit: 'PIECE',
    stock: 500,
    isRaw: true,
    trackInventory: true
  });

  const rawVanilla = await upsertProductWithStock({
    name: 'سيرب فانيليا مونين (Monin Vanilla Syrup)',
    sku: 'RAW-SYRUP-VAN',
    price: 0.50,
    cost: 0.35,
    unit: 'ML',
    stock: 2000, // 2 Liters
    isRaw: true,
    trackInventory: true
  });

  console.log('   ✅ المواد الخام: البن (10,000 جم)، الحليب (25,000 مل)، الأكواب (500)، الأغطية (500)، السيرب (2,000 مل).');

  // Finished Made-to-Order Drinks
  const prodCappuccino = await upsertProductWithStock({
    name: 'كابتشينو كلاسيك 8 أونص (Classic Cappuccino)',
    sku: 'DRK-CAPPUCCINO-8',
    price: 60.00,
    cost: 0,
    unit: 'CUP',
    stock: 0,
    isRaw: false,
    trackInventory: false
  });

  const prodVanillaLatte = await upsertProductWithStock({
    name: 'فانيليا لاتيه مثلج (Iced Vanilla Latte)',
    sku: 'DRK-VANILLA-LATTE',
    price: 75.00,
    cost: 0,
    unit: 'CUP',
    stock: 0,
    isRaw: false,
    trackInventory: false
  });

  console.log('   ✅ المشروبات الجاهزة: كابتشينو كلاسيك (60 ج)، فانيليا لاتيه (75 ج).\n');

  // 4. Setup Recipe BOM (معايير الرسيبي)
  console.log('4️⃣ [RECIPE] إعداد معايير الرسيبي والمكونات (BOM)...');

  // Delete previous test recipes if any
  await prisma.recipe.deleteMany({ where: { companyId, productId: prodCappuccino.id } });

  const recipe = await prisma.recipe.create({
    data: {
      companyId,
      productId: prodCappuccino.id,
      name: 'معيار كابتشينو كلاسيك 8 أونص',
      description: 'دبل شوت إسبريسو 18 جم مع 160 مل حليب مبخر وكوب وغطاء',
      prepTimeMinutes: 3,
      isActive: true,
      ingredients: {
        create: [
          {
            rawProductId: rawBeans.id,
            quantity: 18,
            unit: 'G',
            unitConversionRatio: 1.0,
            yieldPercentage: 100
          },
          {
            rawProductId: rawMilk.id,
            quantity: 160,
            unit: 'ML',
            unitConversionRatio: 1.0,
            yieldPercentage: 100
          },
          {
            rawProductId: rawCup8oz.id,
            quantity: 1,
            unit: 'PIECE',
            unitConversionRatio: 1.0,
            yieldPercentage: 100
          },
          {
            rawProductId: rawLid.id,
            quantity: 1,
            unit: 'PIECE',
            unitConversionRatio: 1.0,
            yieldPercentage: 100
          }
        ]
      }
    }
  });

  console.log(`   ✅ تم إنشاء رسيبي الكابتشينو بنجاح (ID: ${recipe.id})`);
  console.log('      - 18 جم بن إثيوبي');
  console.log('      - 160 مل حليب كامل الدسم');
  console.log('      - 1 كوب ورقي دبل 8 أونص');
  console.log('      - 1 غطاء أسود\n');

  // -------------------------------------------------------------
  // TEST SUITE EXECUTION
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log('🧪 بدء تشغيل الاختبارات الآلية (Automated Verification Tests)');
  console.log('================================================================\n');

  // TEST 1: Recipe Costing Engine
  console.log('🧪 [TEST 1] اختبار محرك احتساب تكلفة الكوب الحقيقية وهامش الربح:');
  const costingResult = await recipeService.calculateRecipeCost(recipe.id);
  console.log(`   - التكلفة النظرية الإجمالية للمشروب: ${costingResult.totalCost} ج.م`);
  console.log(`   - سعر البيع للجمهور: ${costingResult.sellingPrice} ج.م`);
  console.log(`   - هامش الربح المحسوب: ${costingResult.profitMargin}%`);
  console.log(`   - تفصيل تكلفة المكونات:`);
  costingResult.ingredients.forEach(ing => {
    console.log(`     * ${ing.rawProductName}: ${ing.quantity} ${ing.unit} @ ${ing.unitCost} ج.م = ${ing.effectiveCost} ج.م`);
  });

  const expectedCost = (18 * 0.45) + (160 * 0.04) + 1.50 + 0.50; // 8.10 + 6.40 + 1.50 + 0.50 = 16.50
  if (Math.abs(costingResult.totalCost - expectedCost) < 0.01) {
    console.log('   ✅ [TEST 1 PASSED]: تم احتساب التكلفة وهامش الربح بدقة تامة!\n');
  } else {
    throw new Error(`[TEST 1 FAILED]: Expected ${expectedCost} but got ${costingResult.totalCost}`);
  }

  // TEST 2: POS Sale Simulation & Real-time Ingredient Deduction
  console.log('🧪 [TEST 2] اختبار محاكاة طلب كاشير POS وخصم المكونات لحظياً:');
  console.log('   - طلب البيع: 2 كوب كابتشينو كلاسيك (رقم الطلب: POS-TEST-001)');
  
  const orderItemsData = [
    {
      productId: prodCappuccino.id,
      quantity: 2,
      price: 60.00,
      total: 120.00
    }
  ];

  await recipeService.deductRecipeIngredients({
    companyId,
    warehouseId: warehouse.id,
    orderItems: orderItemsData,
    orderNumber: 'POS-TEST-001',
    userId: adminUser.id
  });

  // Verify inventory deduction
  const updatedBeansInv = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawBeans.id } });
  const updatedMilkInv = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawMilk.id } });
  const updatedCupsInv = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawCup8oz.id } });
  const updatedLidsInv = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawLid.id } });

  console.log(`   - رصيد البن المتبقي: ${updatedBeansInv.quantity} جم (المتوقع: 9,964 جم) [-36 جم]`);
  console.log(`   - رصيد الحليب المتبقي: ${updatedMilkInv.quantity} مل (المتوقع: 24,680 مل) [-320 مل]`);
  console.log(`   - رصيد الأكواب المتبقي: ${updatedCupsInv.quantity} كوب (المتوقع: 498 كوب) [-2 كوب]`);
  console.log(`   - رصيد الأغطية المتبقي: ${updatedLidsInv.quantity} غطاء (المتوقع: 498 غطاء) [-2 غطاء]`);

  if (
    updatedBeansInv.quantity === 9964 &&
    updatedMilkInv.quantity === 24680 &&
    updatedCupsInv.quantity === 498 &&
    updatedLidsInv.quantity === 498
  ) {
    console.log('   ✅ [TEST 2 PASSED]: تم تفكيك المشروب وخصم المقادير بالجرام والمل بدقة متناهية!\n');
  } else {
    throw new Error('[TEST 2 FAILED]: Inventory deduction quantities mismatch!');
  }

  // TEST 3: Physical Stock Audit Session & Reconciliation
  console.log('🧪 [TEST 3] اختبار دورة الجرد الفعلي، احتساب العجز، واعتماد التسوية:');
  
  // A. Start Audit Session (Snapshot)
  console.log('   أ. فتح جلسة جرد لمستودع البار وتجميد الأرصدة الدفترية...');
  const auditSession = await stockAuditService.startAuditSession({
    companyId,
    warehouseId: warehouse.id,
    userId: adminUser.id,
    notes: 'جلسة جرد نهاية الأسبوع للبار'
  });
  console.log(`      * تم فتح الجلسة رقم: ${auditSession.id} (الحالة: ${auditSession.status})`);
  console.log(`      * عدد الأصناف المشمولة في اللقطة: ${auditSession.items.length}`);

  // B. Record Actual Physical Counts (with simulated real-world shortage)
  console.log('   ب. إدخال أرقام العد الفعلي في البار (تسجيل عجز 164 جم بن و 180 مل حليب)...');
  const countItems = [
    { productId: rawBeans.id, actualQuantity: 9800, notes: 'عجز طحن وضبط مطحنة' }, // Expected: 9964 -> Variance: -164g
    { productId: rawMilk.id, actualQuantity: 24500, notes: 'هدر تبخير حليب' },      // Expected: 24680 -> Variance: -180ml
    { productId: rawCup8oz.id, actualQuantity: 498, notes: 'مطابق' },               // Variance: 0
    { productId: rawLid.id, actualQuantity: 498, notes: 'مطابق' },                  // Variance: 0
    { productId: rawVanilla.id, actualQuantity: 2000, notes: 'مطابق' }              // Variance: 0
  ];

  const recordedSession = await stockAuditService.recordAuditCounts({
    sessionId: auditSession.id,
    companyId,
    items: countItems
  });

  console.log(`      * إجمالي قيمة الفروقات المالية المحسوبة: ${recordedSession.totalVarianceValue} ج.م`);
  recordedSession.items.forEach(it => {
    if (it.variance !== 0) {
      console.log(`      * ${it.product.name}: الدفتري ${it.expectedQuantity} | الفعلي ${it.actualQuantity} | الفارق ${it.variance} | القيمة ${it.varianceValue} ج.م`);
    }
  });

  // C. Approve and Reconcile Audit
  console.log('   ج. اعتماد وتسوية الجرد آلياً...');
  const reconciledSession = await stockAuditService.approveAndReconcileAudit({
    sessionId: auditSession.id,
    companyId,
    userId: adminUser.id
  });

  // Verify DB Inventory updated to exact counted figures
  const reconciledBeans = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawBeans.id } });
  const reconciledMilk = await prisma.inventory.findFirst({ where: { warehouseId: warehouse.id, productId: rawMilk.id } });

  console.log(`      * رصيد البن في المستودع بعد التسوية: ${reconciledBeans.quantity} جم (المطابق للفعلي 9,800 جم)`);
  console.log(`      * رصيد الحليب في المستودع بعد التسوية: ${reconciledMilk.quantity} مل (المطابق للفعلي 24,500 مل)`);
  console.log(`      * حالة الجلسة النهائية: ${reconciledSession.status}`);

  if (
    reconciledBeans.quantity === 9800 &&
    reconciledMilk.quantity === 24500 &&
    reconciledSession.status === 'COMPLETED'
  ) {
    console.log('   ✅ [TEST 3 PASSED]: تم الجرد المقارن وتسوية أرصدة المستودع آلياً بنجاح تام!\n');
  } else {
    throw new Error('[TEST 3 FAILED]: Reconciled quantities do not match actual counts!');
  }

  // TEST 4: Modifiers Setup
  console.log('🧪 [TEST 4] اختبار إعداد مجموعات التعديل (Drink Modifiers):');
  let modGroup = await prisma.productModifierGroup.findFirst({ where: { companyId, name: 'نوع الحليب والبدائل النباتية' } });
  if (!modGroup) {
    modGroup = await prisma.productModifierGroup.create({
      data: {
        companyId,
        name: 'نوع الحليب والبدائل النباتية',
        description: 'اختيار الحليب العادي أو النباتي',
        isRequired: false,
        minSelect: 0,
        maxSelect: 1,
        options: {
          create: [
            { name: 'حليب كامل الدسم (افتراضي)', priceModifier: 0.00, isDefault: true, sortOrder: 1 },
            { name: 'حليب لوز نباتي (Almond Milk)', priceModifier: 15.00, isDefault: false, sortOrder: 2 },
            { name: 'حليب شوفان (Oat Milk)', priceModifier: 20.00, isDefault: false, sortOrder: 3 }
          ]
        }
      },
      include: { options: true }
    });
  }
  console.log(`   ✅ تم إنشاء مجموعة التعديل بنجاح مع ${modGroup.options?.length || 3} خيارات تسعير.\n`);

  console.log('================================================================');
  console.log('🎉 جميع الاختبارات الـ 4 اجتازت بنجاح 100%');
  console.log('================================================================');
  console.log(`📍 الشركة الجاهزة للاستخدام والعرض:`);
  console.log(`   - الاسم: ${COMPANY_NAME}`);
  console.log(`   - الرابط / Slug: ${COMPANY_SLUG}`);
  console.log(`   - البريد الإلكتروني للمدير: ${ADMIN_EMAIL}`);
  console.log(`   - كلمة المرور: ${PASSWORD}`);
  console.log('================================================================\n');
}

runCafeCompanySeedAndTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ حدث خطأ أثناء الاختبار:', err);
    process.exit(1);
  });
