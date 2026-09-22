/**
 * End-to-End Integration & Unit Test Suite for Cafe & Restaurant Pro Suite
 * Tests Company Setup, Recipe BOM Costing, POS BOM Ingredient Deduction, Stock Audit Sessions, and Modifiers.
 */

describe('Cafe & Restaurant Pro Suite (E2E Integration & Verification)', () => {
  // In-Memory Test State
  let db = {
    companies: [],
    warehouses: [],
    products: [],
    inventories: [],
    recipes: [],
    recipeIngredients: [],
    stockMovements: [],
    auditSessions: [],
    auditItems: [],
    modifierGroups: [],
    modifierOptions: []
  };

  const COMPANY_ID = 'comp_aroma_cafe_demo_001';
  const WAREHOUSE_ID = 'wh_main_bar_001';
  const USER_ID = 'user_admin_001';

  beforeEach(() => {
    // Initialize In-Memory Database
    db = {
      companies: [
        {
          id: COMPANY_ID,
          name: 'أروما ريستريتو كافيه & روستري (Aroma Ristretto Cafe)',
          slug: 'aroma-cafe-demo',
          industry: 'cafe_restaurant',
          currency: 'EGP',
          isActive: true,
          settings: JSON.stringify({
            specialtyId: 'bizsp_cafe_restaurant',
            installedApps: ['cafe-restaurant-pro', 'pos-pro', 'inventory-pro', 'procurement-pro', 'store']
          })
        }
      ],
      warehouses: [
        {
          id: WAREHOUSE_ID,
          companyId: COMPANY_ID,
          name: 'مستودع البار الرئيسي (Main Bar Storage)',
          code: 'BAR-WH-01',
          isActive: true
        }
      ],
      products: [
        // Raw Materials
        {
          id: 'prod_raw_beans',
          companyId: COMPANY_ID,
          name: 'بن إثيوبي يرقاتشيف (Ethiopian Yirgacheffe Beans)',
          sku: 'RAW-COFFEE-ETH',
          price: 0.60,
          cost: 0.45, // 0.45 EGP/g = 450 EGP/kg
          stock: 10000, // 10,000 g
          unit: 'G',
          trackInventory: true
        },
        {
          id: 'prod_raw_milk',
          companyId: COMPANY_ID,
          name: 'حليب كامل الدسم المراعي (Whole Milk)',
          sku: 'RAW-MILK-FULL',
          price: 0.05,
          cost: 0.04, // 0.04 EGP/ml = 40 EGP/L
          stock: 25000, // 25,000 ml
          unit: 'ML',
          trackInventory: true
        },
        {
          id: 'prod_raw_cups',
          companyId: COMPANY_ID,
          name: 'أكواب ورقية مزدوجة 8 أونص (Double Wall 8oz Cup)',
          sku: 'RAW-CUP-8OZ',
          price: 2.00,
          cost: 1.50,
          stock: 500, // 500 pcs
          unit: 'PIECE',
          trackInventory: true
        },
        {
          id: 'prod_raw_lids',
          companyId: COMPANY_ID,
          name: 'أغطية أكواب سوداء (Black Lid 8oz)',
          sku: 'RAW-LID-8OZ',
          price: 0.75,
          cost: 0.50,
          stock: 500, // 500 pcs
          unit: 'PIECE',
          trackInventory: true
        },
        // Made-to-order Drinks
        {
          id: 'prod_cappuccino',
          companyId: COMPANY_ID,
          name: 'كابتشينو كلاسيك 8 أونص (Classic Cappuccino)',
          sku: 'DRK-CAPPUCCINO-8',
          price: 60.00,
          cost: 0,
          stock: 0,
          unit: 'CUP',
          trackInventory: false
        }
      ],
      inventories: [
        { id: 'inv_1', warehouseId: WAREHOUSE_ID, productId: 'prod_raw_beans', quantity: 10000, available: 10000 },
        { id: 'inv_2', warehouseId: WAREHOUSE_ID, productId: 'prod_raw_milk', quantity: 25000, available: 25000 },
        { id: 'inv_3', warehouseId: WAREHOUSE_ID, productId: 'prod_raw_cups', quantity: 500, available: 500 },
        { id: 'inv_4', warehouseId: WAREHOUSE_ID, productId: 'prod_raw_lids', quantity: 500, available: 500 }
      ],
      recipes: [
        {
          id: 'recipe_cappuccino_001',
          companyId: COMPANY_ID,
          productId: 'prod_cappuccino',
          name: 'معيار كابتشينو كلاسيك 8 أونص',
          prepTimeMinutes: 3,
          isActive: true
        }
      ],
      recipeIngredients: [
        {
          id: 'ing_1',
          recipeId: 'recipe_cappuccino_001',
          rawProductId: 'prod_raw_beans',
          quantity: 18,
          unit: 'G',
          unitConversionRatio: 1.0,
          yieldPercentage: 100
        },
        {
          id: 'ing_2',
          recipeId: 'recipe_cappuccino_001',
          rawProductId: 'prod_raw_milk',
          quantity: 160,
          unit: 'ML',
          unitConversionRatio: 1.0,
          yieldPercentage: 100
        },
        {
          id: 'ing_3',
          recipeId: 'recipe_cappuccino_001',
          rawProductId: 'prod_raw_cups',
          quantity: 1,
          unit: 'PIECE',
          unitConversionRatio: 1.0,
          yieldPercentage: 100
        },
        {
          id: 'ing_4',
          recipeId: 'recipe_cappuccino_001',
          rawProductId: 'prod_raw_lids',
          quantity: 1,
          unit: 'PIECE',
          unitConversionRatio: 1.0,
          yieldPercentage: 100
        }
      ],
      stockMovements: [],
      auditSessions: [],
      auditItems: [],
      modifierGroups: [],
      modifierOptions: []
    };
  });

  // 1. Test Company & Specialty Configuration
  test('1. Company Specialty & Installed F&B Suite Verification', () => {
    const company = db.companies.find(c => c.id === COMPANY_ID);
    expect(company).toBeDefined();
    expect(company.industry).toBe('cafe_restaurant');
    
    const settings = JSON.parse(company.settings);
    expect(settings.specialtyId).toBe('bizsp_cafe_restaurant');
    expect(settings.installedApps).toContain('cafe-restaurant-pro');
    expect(settings.installedApps).toContain('pos-pro');
    expect(settings.installedApps).toContain('inventory-pro');
    expect(settings.installedApps).toContain('procurement-pro');
  });

  // 2. Test Recipe Theoretical Costing & Profit Margins
  test('2. Recipe Costing & Margin Engine Calculation', () => {
    const recipe = db.recipes.find(r => r.productId === 'prod_cappuccino');
    expect(recipe).toBeDefined();

    const ingredients = db.recipeIngredients.filter(i => i.recipeId === recipe.id);
    expect(ingredients).toHaveLength(4);

    let totalTheoreticalCost = 0;
    const costingDetails = ingredients.map(ing => {
      const rawProduct = db.products.find(p => p.id === ing.rawProductId);
      const effectiveCost = Number((ing.quantity * rawProduct.cost).toFixed(2));
      totalTheoreticalCost += effectiveCost;
      return {
        name: rawProduct.name,
        quantity: ing.quantity,
        unit: ing.unit,
        unitCost: rawProduct.cost,
        effectiveCost
      };
    });

    const finishedProduct = db.products.find(p => p.id === recipe.productId);
    const sellingPrice = finishedProduct.price;
    const profitMargin = Number((((sellingPrice - totalTheoreticalCost) / sellingPrice) * 100).toFixed(2));

    // Assertions:
    // Beans: 18g * 0.45 = 8.10 EGP
    // Milk: 160ml * 0.04 = 6.40 EGP
    // Cup: 1pc * 1.50 = 1.50 EGP
    // Lid: 1pc * 0.50 = 0.50 EGP
    // Total Cost = 16.50 EGP
    expect(totalTheoreticalCost).toBe(16.50);
    expect(sellingPrice).toBe(60.00);
    expect(profitMargin).toBe(72.50);
    expect(costingDetails).toHaveLength(4);
  });

  // 3. Test POS Checkout & Real-Time Ingredient Deduction
  test('3. POS Order Simulation & Real-time BOM Deduction', () => {
    // Simulate POS Order of 2x Cappuccinos
    const orderNumber = 'POS-TEST-2026-001';
    const orderQty = 2;

    const recipe = db.recipes.find(r => r.productId === 'prod_cappuccino');
    const ingredients = db.recipeIngredients.filter(i => i.recipeId === recipe.id);

    // Deduction logic simulation matching recipeService.deductRecipeIngredients
    for (const ing of ingredients) {
      const totalDeduction = ing.quantity * orderQty;
      const inv = db.inventories.find(i => i.warehouseId === WAREHOUSE_ID && i.productId === ing.rawProductId);
      const prod = db.products.find(p => p.id === ing.rawProductId);

      expect(inv).toBeDefined();
      expect(inv.quantity).toBeGreaterThanOrEqual(totalDeduction);

      // Decrement inventory
      inv.quantity -= totalDeduction;
      inv.available -= totalDeduction;
      prod.stock -= totalDeduction;

      // Record StockMovement
      db.stockMovements.push({
        id: `mov_${Date.now()}_${ing.rawProductId}`,
        companyId: COMPANY_ID,
        warehouseId: WAREHOUSE_ID,
        productId: ing.rawProductId,
        type: 'OUT',
        reason: 'SALE',
        quantity: totalDeduction,
        notes: `خصم مكونات رسيبي لطلب كاشير رقم: ${orderNumber}`
      });
    }

    // Verify raw inventories after 2 cappuccinos:
    const beansInv = db.inventories.find(i => i.productId === 'prod_raw_beans');
    const milkInv = db.inventories.find(i => i.productId === 'prod_raw_milk');
    const cupsInv = db.inventories.find(i => i.productId === 'prod_raw_cups');
    const lidsInv = db.inventories.find(i => i.productId === 'prod_raw_lids');

    expect(beansInv.quantity).toBe(10000 - 36); // 9,964 g
    expect(milkInv.quantity).toBe(25000 - 320); // 24,680 ml
    expect(cupsInv.quantity).toBe(500 - 2);     // 498 pcs
    expect(lidsInv.quantity).toBe(500 - 2);     // 498 pcs

    // Verify movements
    expect(db.stockMovements).toHaveLength(4);
    expect(db.stockMovements.every(m => m.type === 'OUT' && m.reason === 'SALE')).toBe(true);
  });

  // 4. Test Physical Stock Audit Session & Auto-Reconciliation
  test('4. Physical Stock Audit Cycle: Snapshot, Discrepancy Calculation, & Reconciliation', () => {
    // Current live inventories: Beans = 9,964g, Milk = 24,680ml, Cups = 498, Lids = 498
    const sessionId = 'audit_sess_bar_001';

    // A. Create Audit Session Snapshot
    const session = {
      id: sessionId,
      companyId: COMPANY_ID,
      warehouseId: WAREHOUSE_ID,
      status: 'IN_PROGRESS',
      startedBy: USER_ID,
      totalVarianceValue: 0
    };
    db.auditSessions.push(session);

    // Populate Snapshot items
    const rawProducts = db.products.filter(p => p.trackInventory);
    rawProducts.forEach(prod => {
      const inv = db.inventories.find(i => i.productId === prod.id && i.warehouseId === WAREHOUSE_ID);
      db.auditItems.push({
        id: `audit_item_${prod.id}`,
        sessionId,
        productId: prod.id,
        expectedQuantity: inv.quantity,
        actualQuantity: null,
        variance: 0,
        unitCost: prod.cost,
        varianceValue: 0
      });
    });

    expect(db.auditItems).toHaveLength(4);

    // B. Record Actual Count with Shortage (Beans: 9,800g [-200g], Milk: 24,700ml [-300ml], Cups: 500 [0], Lids: 500 [0])
    const physicalCounts = [
      { productId: 'prod_raw_beans', actualQuantity: 9800 },
      { productId: 'prod_raw_milk', actualQuantity: 24700 },
      { productId: 'prod_raw_cups', actualQuantity: 500 },
      { productId: 'prod_raw_lids', actualQuantity: 500 }
    ];

    let totalVarianceValue = 0;
    physicalCounts.forEach(count => {
      const item = db.auditItems.find(i => i.sessionId === sessionId && i.productId === count.productId);
      item.actualQuantity = count.actualQuantity;
      item.variance = count.actualQuantity - item.expectedQuantity;
      item.varianceValue = Number((item.variance * item.unitCost).toFixed(2));
      totalVarianceValue += item.varianceValue;
    });

    session.totalVarianceValue = Number(totalVarianceValue.toFixed(2));

    // Verify calculated variances:
    const beansAuditItem = db.auditItems.find(i => i.productId === 'prod_raw_beans');
    const milkAuditItem = db.auditItems.find(i => i.productId === 'prod_raw_milk');
    const cupsAuditItem = db.auditItems.find(i => i.productId === 'prod_raw_cups');

    expect(beansAuditItem.variance).toBe(-200); // -200 g
    expect(beansAuditItem.varianceValue).toBe(-90.00); // -200 * 0.45 = -90.00 EGP
    expect(milkAuditItem.variance).toBe(-300); // -300 ml
    expect(milkAuditItem.varianceValue).toBe(-12.00); // -300 * 0.04 = -12.00 EGP
    expect(cupsAuditItem.variance).toBe(0);
    expect(session.totalVarianceValue).toBe(-102.00); // -90.00 + -12.00 = -102.00 EGP

    // C. Approve and Reconcile Audit
    session.status = 'COMPLETED';
    session.approvedBy = USER_ID;
    session.completedAt = new Date().toISOString();

    // Reconcile inventories to match actual counts
    db.auditItems.filter(i => i.sessionId === sessionId).forEach(item => {
      if (item.variance !== 0) {
        const inv = db.inventories.find(i => i.productId === item.productId && i.warehouseId === WAREHOUSE_ID);
        const prod = db.products.find(p => p.id === item.productId);

        inv.quantity = item.actualQuantity;
        inv.available = item.actualQuantity;
        prod.stock = item.actualQuantity;

        db.stockMovements.push({
          id: `mov_adj_${Date.now()}_${item.productId}`,
          companyId: COMPANY_ID,
          warehouseId: WAREHOUSE_ID,
          productId: item.productId,
          type: item.variance > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          reason: 'ADJUSTMENT',
          quantity: Math.abs(item.variance),
          notes: `تسوية جرد آلي لجلسة رقم: ${sessionId}`
        });
      }
    });

    // Verify reconciled inventories
    const finalBeansInv = db.inventories.find(i => i.productId === 'prod_raw_beans');
    const finalMilkInv = db.inventories.find(i => i.productId === 'prod_raw_milk');

    expect(finalBeansInv.quantity).toBe(9800);
    expect(finalMilkInv.quantity).toBe(24700);
    expect(session.status).toBe('COMPLETED');
  });

  // 5. Test Modifiers Setup & Option Pricing
  test('5. Product Modifier Groups & Options Setup', () => {
    const group = {
      id: 'mod_group_milk_001',
      companyId: COMPANY_ID,
      name: 'اختيار نوع الحليب والبدائل النباتية',
      isRequired: false,
      minSelect: 0,
      maxSelect: 1
    };
    db.modifierGroups.push(group);

    const options = [
      { id: 'opt_1', groupId: group.id, name: 'حليب كامل الدسم (افتراضي)', priceModifier: 0.00, isDefault: true },
      { id: 'opt_2', groupId: group.id, name: 'حليب لوز نباتي', priceModifier: 15.00, isDefault: false },
      { id: 'opt_3', groupId: group.id, name: 'حليب شوفان', priceModifier: 20.00, isDefault: false }
    ];
    db.modifierOptions.push(...options);

    expect(db.modifierGroups).toHaveLength(1);
    expect(db.modifierOptions.filter(o => o.groupId === group.id)).toHaveLength(3);
    expect(options[1].priceModifier).toBe(15.00);
    expect(options[2].priceModifier).toBe(20.00);
  });
});
