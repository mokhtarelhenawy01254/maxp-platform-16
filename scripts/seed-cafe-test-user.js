const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function seedCafeDemo() {
  const p = getSharedPrismaClient();

  console.log("1. Finding or creating company...");
  let company = await p.company.findFirst({
    where: { slug: 'roast-brew' }
  });

  if (!company) {
    company = await p.company.create({
      data: {
        name: 'كافيه روست آند برو (Roast & Brew Cafe)',
        slug: 'roast-brew',
        email: 'cafe@maxp.online',
        phone: '01012345678',
        currency: 'EGP',
        isActive: true,
        address: 'التجمع الخامس - القاهرة',
        trialModeEnabled: false
      }
    });
    console.log("   Created company:", company.id);
  } else {
    await p.company.update({
      where: { id: company.id },
      data: { name: 'كافيه روست آند برو (Roast & Brew Cafe)' }
    });
    console.log("   Found and updated company:", company.id);
  }

  console.log("2. Creating or updating user cafe@maxp.online...");
  const hashedPassword = await bcrypt.hash('Password@123', 10);
  let user = await p.user.findFirst({
    where: { email: 'cafe@maxp.online' }
  });

  if (!user) {
    user = await p.user.create({
      data: {
        email: 'cafe@maxp.online',
        password: hashedPassword,
        firstName: 'أحمد',
        lastName: 'الشناوي',
        role: 'OWNER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true
      }
    });
    console.log("   Created user:", user.id);
  } else {
    user = await p.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        firstName: 'أحمد',
        lastName: 'الشناوي',
        companyId: company.id,
        isActive: true,
        role: 'OWNER'
      }
    });
    console.log("   Updated user password and company:", user.id);
  }

  console.log("3. Installing marketplace apps...");
  const targetAppSlugs = ['cafe-restaurant-pro', 'pos-pro', 'inventory-pro'];
  for (const slug of targetAppSlugs) {
    const app = await p.marketplaceApp.findUnique({ where: { slug } });
    if (app) {
      await p.companyApp.upsert({
        where: {
          companyId_appId: {
            companyId: company.id,
            appId: app.id
          }
        },
        create: {
          companyId: company.id,
          appId: app.id,
          status: 'ACTIVE',
          activePricingModel: 'SUBSCRIPTION'
        },
        update: {
          status: 'ACTIVE'
        }
      });
      console.log(`   Installed/Activated app: ${slug}`);
    }
  }

  console.log("4. Setting up main warehouse...");
  let warehouse = await p.warehouse.findFirst({
    where: { companyId: company.id }
  });

  if (!warehouse) {
    warehouse = await p.warehouse.create({
      data: {
        companyId: company.id,
        name: 'البار والمستودع الرئيسي (Main Bar)',
        location: 'البار الرئيسي',
        isActive: true
      }
    });
    console.log("   Created warehouse:", warehouse.id);
  } else {
    await p.warehouse.update({
      where: { id: warehouse.id },
      data: { name: 'البار والمستودع الرئيسي (Main Bar)', isActive: true }
    });
  }

  console.log("5. Creating raw materials (خامات المخزون)...");
  const rawMaterialsData = [
    { name: 'بن سبيشالتي إثيوبي فاخر', sku: 'RAW-COF-01', unit: 'KG', cost: 420, price: 420, stock: 35 },
    { name: 'حليب طازج كامل الدسم', sku: 'RAW-MLK-01', unit: 'L', cost: 36, price: 36, stock: 90 },
    { name: 'حليب لوز نباتي مستورد', sku: 'RAW-ALM-01', unit: 'L', cost: 95, price: 95, stock: 30 },
    { name: 'سيرب كراميل فرنسي (Monin)', sku: 'RAW-CAR-01', unit: 'L', cost: 160, price: 160, stock: 15 }
  ];

  const rawMap = {};
  for (const raw of rawMaterialsData) {
    let pRecord = await p.product.findFirst({
      where: { companyId: company.id, sku: raw.sku }
    });
    if (!pRecord) {
      pRecord = await p.product.create({
        data: {
          companyId: company.id,
          name: raw.name,
          sku: raw.sku,
          price: raw.price,
          cost: raw.cost,
          stock: raw.stock,
          trackInventory: true
        }
      });
    } else {
      await p.product.update({
        where: { id: pRecord.id },
        data: { name: raw.name, stock: raw.stock, cost: raw.cost }
      });
    }
    rawMap[raw.sku] = pRecord;

    // Ensure inventory row in warehouse
    const existingInv = await p.inventory.findFirst({
      where: { warehouseId: warehouse.id, productId: pRecord.id }
    });
    if (!existingInv) {
      await p.inventory.create({
        data: {
          warehouseId: warehouse.id,
          productId: pRecord.id,
          quantity: raw.stock,
          available: raw.stock
        }
      });
    } else {
      await p.inventory.update({
        where: { id: existingInv.id },
        data: { quantity: raw.stock, available: raw.stock }
      });
    }
  }

  console.log("6. Creating menu drinks (مشروبات المنيو)...");
  const menuDrinks = [
    { name: 'سبانش لاتيه بارد (Iced Spanish)', sku: 'DRK-SPL-01', price: 85, cost: 22 },
    { name: 'فلات وايت ساخن (Flat White)', sku: 'DRK-FLW-02', price: 75, cost: 18 },
    { name: 'كيمكس / V60 إثيوبي مقطر', sku: 'DRK-V60-03', price: 95, cost: 25 },
    { name: 'كورتادو كلاسيك (Cortado)', sku: 'DRK-CRT-04', price: 70, cost: 16 },
    { name: 'كرواسون زبدة طازج', sku: 'BAK-CRS-01', price: 55, cost: 25 }
  ];

  const menuMap = {};
  for (const item of menuDrinks) {
    let pRecord = await p.product.findFirst({
      where: { companyId: company.id, sku: item.sku }
    });
    if (!pRecord) {
      pRecord = await p.product.create({
        data: {
          companyId: company.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          cost: item.cost,
          stock: 999,
          trackInventory: false
        }
      });
    } else {
      await p.product.update({
        where: { id: pRecord.id },
        data: { name: item.name, price: item.price }
      });
    }
    menuMap[item.sku] = pRecord;
  }

  console.log("7. Creating drink modifier groups & options...");
  // Group 1: Milk
  let milkGroup = await p.productModifierGroup.findFirst({
    where: { companyId: company.id, name: 'نوع الحليب (Milk Options)' }
  });
  if (!milkGroup) {
    milkGroup = await p.productModifierGroup.create({
      data: {
        companyId: company.id,
        name: 'نوع الحليب (Milk Options)',
        selectionType: 'SINGLE',
        isRequired: false,
        options: {
          create: [
            { name: 'حليب كامل الدسم', additionalPrice: 0 },
            { name: 'حليب لوز نباتي', additionalPrice: 25, rawProductId: rawMap['RAW-ALM-01']?.id, rawQuantity: 0.25 },
            { name: 'حليب شوفان', additionalPrice: 25 }
          ]
        }
      }
    });
    console.log("   Created milk group");
  }

  // Group 2: Extra Shot
  let shotGroup = await p.productModifierGroup.findFirst({
    where: { companyId: company.id, name: 'شوت إضافي (Extra Shots)' }
  });
  if (!shotGroup) {
    shotGroup = await p.productModifierGroup.create({
      data: {
        companyId: company.id,
        name: 'شوت إضافي (Extra Shots)',
        selectionType: 'SINGLE',
        isRequired: false,
        options: {
          create: [
            { name: 'شوت إسبريسو سنغل', additionalPrice: 15, rawProductId: rawMap['RAW-COF-01']?.id, rawQuantity: 0.018 },
            { name: 'شوت إسبريسو دبل', additionalPrice: 25, rawProductId: rawMap['RAW-COF-01']?.id, rawQuantity: 0.036 }
          ]
        }
      }
    });
    console.log("   Created shot group");
  }

  // Group 3: Syrups
  let syrupGroup = await p.productModifierGroup.findFirst({
    where: { companyId: company.id, name: 'النكهات والسيرب (Syrup Flavors)' }
  });
  if (!syrupGroup) {
    syrupGroup = await p.productModifierGroup.create({
      data: {
        companyId: company.id,
        name: 'النكهات والسيرب (Syrup Flavors)',
        selectionType: 'MULTIPLE',
        isRequired: false,
        options: {
          create: [
            { name: 'سيرب كراميل فرنسي', additionalPrice: 15, rawProductId: rawMap['RAW-CAR-01']?.id, rawQuantity: 0.03 },
            { name: 'سيرب فانيليا خالي السكر', additionalPrice: 15 }
          ]
        }
      }
    });
    console.log("   Created syrup group");
  }

  console.log("8. Creating sample recipe BOM for Spanish Latte...");
  const spanishLatte = menuMap['DRK-SPL-01'];
  if (spanishLatte) {
    const existingRecipe = await p.recipe.findFirst({
      where: { companyId: company.id, productId: spanishLatte.id }
    });
    if (!existingRecipe) {
      await p.recipe.create({
        data: {
          companyId: company.id,
          productId: spanishLatte.id,
          name: 'رسيبي سبانش لاتيه بارد',
          yieldQuantity: 1,
          description: 'استخلاص 36 جم دبل إسبريسو وتبخير 200 مل حليب كامل الدسم',
          ingredients: {
            create: [
              { rawProductId: rawMap['RAW-COF-01']?.id, quantity: 0.018, unit: 'KG' },
              { rawProductId: rawMap['RAW-MLK-01']?.id, quantity: 0.22, unit: 'L' }
            ]
          }
        }
      });
      console.log("   Created recipe for Spanish Latte");
    }
  }

  console.log("\n========================================================");
  console.log("✅ SEEDING COMPLETE FOR CAFE DEMO ACCOUNT!");
  console.log("URL: https://maxp.online/login");
  console.log("Email: cafe@maxp.online");
  console.log("Password: Password@123");
  console.log("Company: كافيه روست آند برو (Roast & Brew Cafe)");
  console.log("========================================================\n");

  process.exit(0);
}

seedCafeDemo().catch(err => {
  console.error("SEEDING_FAILED:", err);
  process.exit(1);
});
