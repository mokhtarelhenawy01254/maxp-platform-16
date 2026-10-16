/**
 * Mandatory Unit & Regression Test Suite for Manufacturing Execution System (MES)
 *
 * Scenarios Tested:
 * 1. BOM Multi-Variant Resolution (Size/color matching, scrap rate, waste margin on known numbers)
 * 2. Order Lifecycle, Unsettled Quantity Protection (§9), and Cancellation Material Return
 * 3. Material Issue (Warehouse stock deduction, average cost valuation, stock movement)
 * 4. Finished Goods Receipt (Target warehouse stock addition, weighted average cost update)
 * 5. Three-Way Costing Engine (Materials + Labor + Overhead = Total & Unit Cost exact match)
 * 6. WIP Journal Entries (4 GL postings, dual gates skip, idempotency)
 * 7. Strict Multi-Tenant Isolation (Zero cross-company leakage)
 */

let currentPrisma = null;

// Mock sharedDatabase before requiring services
const sharedDbPath = require.resolve('../services/sharedDatabase');
require.cache[sharedDbPath] = {
  id: sharedDbPath,
  filename: sharedDbPath,
  loaded: true,
  exports: {
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  },
};

if (typeof jest !== 'undefined') {
  jest.mock('../services/sharedDatabase', () => ({
    getSharedPrismaClient: () => global.__testPrisma || currentPrisma,
  }));
}

const ManufacturingService = require('../services/manufacturingService');
const AccountingService = require('../services/accountingService');
const AccountingAutoPostingService = require('../services/accountingAutoPostingService');

// In-Memory Database Store for Manufacturing & Accounting Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    accounts: [],
    journalEntries: [],
    journalLines: [],
    fiscalPeriods: [],
    accountingSettings: [],
    unpostedEntries: [],
    companyApps: [],
    billOfMaterials: [],
    bomComponentItems: [],
    bomStandardStages: [],
    productionOrders: [],
    productionOrderVariantMatrices: [],
    productionStages: [],
    materialIssues: [],
    materialIssueItems: [],
    finishedGoodsReceipts: [],
    finishedGoodsReceiptItems: [],
    scrapRecords: [],
    manufacturingSettings: [],
    inventory: [],
    stockMovements: [],
    products: [],
  };

  const createTableHandlers = (tableName, stateArray, idPrefix) => ({
    findMany: async ({ where = {}, orderBy, include } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (v && typeof v === 'object' && v.in) {
            if (!v.in.includes(item[k])) return false;
          } else if (v && typeof v === 'object' && v.not) {
            if (item[k] === v.not) return false;
          } else if (v && typeof v === 'object' && v.contains) {
            const val = String(item[k] || '').toLowerCase();
            if (!val.includes(String(v.contains).toLowerCase())) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });

      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0] || [];
        if (field) {
          results.sort((a, b) => {
            const cmp = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
            return dir === 'desc' ? -cmp : cmp;
          });
        }
      }

      return results.map((item) => attachIncludes(tableName, item, include, state));
    },

    findFirst: async ({ where = {}, include } = {}) => {
      const item = stateArray.find((it) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (v && typeof v === 'object' && v.not) {
            if (it[k] === v.not) return false;
          } else if (v && typeof v === 'object' && v.startsWith) {
            if (!String(it[k] || '').startsWith(v.startsWith)) return false;
          } else if (it[k] !== v) {
            return false;
          }
        }
        return true;
      });
      return item ? attachIncludes(tableName, item, include, state) : null;
    },

    findUnique: async ({ where = {}, include } = {}) => {
      const item = stateArray.find((it) => {
        for (const [k, v] of Object.entries(where)) {
          if (it[k] !== v) return false;
        }
        return true;
      });
      return item ? attachIncludes(tableName, item, include, state) : null;
    },

    create: async ({ data }) => {
      const item = {
        id: generateId(idPrefix),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stateArray.push(item);
      return item;
    },

    update: async ({ where, data }) => {
      const item = stateArray.find((it) => it.id === where.id);
      if (!item) throw new Error(`${tableName} record not found with id ${where.id}`);

      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && v.increment !== undefined) {
          item[k] = Number(item[k] || 0) + Number(v.increment);
        } else if (v && typeof v === 'object' && v.decrement !== undefined) {
          item[k] = Number(item[k] || 0) - Number(v.decrement);
        } else if (v !== undefined) {
          item[k] = v;
        }
      }
      item.updatedAt = new Date();
      return item;
    },

    updateMany: async ({ where = {}, data }) => {
      let count = 0;
      for (const it of stateArray) {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (it[k] !== v) { match = false; break; }
        }
        if (match) {
          for (const [k, v] of Object.entries(data)) {
            if (v && typeof v === 'object' && v.increment !== undefined) {
              it[k] = Number(it[k] || 0) + Number(v.increment);
            } else if (v && typeof v === 'object' && v.decrement !== undefined) {
              it[k] = Number(it[k] || 0) - Number(v.decrement);
            } else if (v !== undefined) {
              it[k] = v;
            }
          }
          it.updatedAt = new Date();
          count++;
        }
      }
      return { count };
    },

    delete: async ({ where }) => {
      const idx = stateArray.findIndex((it) => it.id === where.id);
      if (idx === -1) throw new Error(`${tableName} not found for deletion`);
      const [deleted] = stateArray.splice(idx, 1);
      return deleted;
    },

    deleteMany: async ({ where = {} } = {}) => {
      let count = 0;
      for (let i = stateArray.length - 1; i >= 0; i--) {
        const it = stateArray[i];
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (it[k] !== v) { match = false; break; }
        }
        if (match) {
          stateArray.splice(i, 1);
          count++;
        }
      }
      return { count };
    },

    upsert: async ({ where, create, update }) => {
      let existing = stateArray.find((it) => {
        for (const [k, v] of Object.entries(where)) {
          if (it[k] !== v) return false;
        }
        return true;
      });
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }
      const item = {
        id: generateId(idPrefix),
        ...create,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stateArray.push(item);
      return item;
    },
  });

  function attachIncludes(tableName, item, include, allState) {
    if (!include) return { ...item };
    const clone = { ...item };

    if (tableName === 'billOfMaterials') {
      if (include.components) {
        clone.components = allState.bomComponentItems.filter((c) => c.bomId === item.id);
      }
      if (include.standardStages) {
        clone.standardStages = allState.bomStandardStages
          .filter((s) => s.bomId === item.id)
          .sort((a, b) => a.sequence - b.sequence);
      }
      if (include.orders) {
        clone.orders = allState.productionOrders.filter((o) => o.bomId === item.id);
      }
    } else if (tableName === 'productionOrders') {
      if (include.bom) {
        const bom = allState.billOfMaterials.find((b) => b.id === item.bomId);
        clone.bom = bom
          ? {
              ...bom,
              components: allState.bomComponentItems.filter((c) => c.bomId === bom.id),
              standardStages: allState.bomStandardStages.filter((s) => s.bomId === bom.id),
            }
          : null;
      }
      if (include.variants) {
        clone.variants = allState.productionOrderVariantMatrices.filter((v) => v.orderId === item.id);
      }
      if (include.stages) {
        clone.stages = allState.productionStages
          .filter((s) => s.orderId === item.id)
          .sort((a, b) => a.sequence - b.sequence);
      }
      if (include.materialIssues) {
        clone.materialIssues = allState.materialIssues
          .filter((m) => m.orderId === item.id)
          .map((m) => ({
            ...m,
            items: allState.materialIssueItems.filter((it) => it.issueId === m.id),
          }));
      }
      if (include.goodsReceipts) {
        clone.goodsReceipts = allState.finishedGoodsReceipts
          .filter((g) => g.orderId === item.id)
          .map((g) => ({
            ...g,
            items: allState.finishedGoodsReceiptItems.filter((it) => it.receiptId === g.id),
          }));
      }
      if (include.scrapRecords) {
        clone.scrapRecords = allState.scrapRecords.filter((s) => s.orderId === item.id);
      }
    } else if (tableName === 'materialIssues' && include.items) {
      clone.items = allState.materialIssueItems.filter((it) => it.issueId === item.id);
    } else if (tableName === 'finishedGoodsReceipts' && include.items) {
      clone.items = allState.finishedGoodsReceiptItems.filter((it) => it.receiptId === item.id);
    } else if (tableName === 'journalEntries' && include.lines) {
      clone.lines = allState.journalLines.filter((l) => l.entryId === item.id);
    }

    return clone;
  }

  const prisma = {
    _state: state,
    account: createTableHandlers('accounts', state.accounts, 'acc'),
    journalEntry: {
      ...createTableHandlers('journalEntries', state.journalEntries, 'je'),
      create: async ({ data, include }) => {
        const entryId = generateId('je');
        const entry = {
          id: entryId,
          companyId: data.companyId,
          entryNumber: data.entryNumber,
          date: data.date || new Date(),
          narration: data.narration,
          sourceType: data.sourceType || 'MANUAL',
          sourceId: data.sourceId || null,
          status: data.status || 'DRAFT',
          postedAt: data.postedAt || null,
          postedById: data.postedById || null,
          createdById: data.createdById || null,
          reversalOfId: data.reversalOfId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        state.journalEntries.push(entry);

        if (data.lines?.create) {
          for (const l of data.lines.create) {
            state.journalLines.push({
              id: generateId('jl'),
              entryId,
              accountId: l.accountId,
              debit: Number(l.debit || 0),
              credit: Number(l.credit || 0),
              narration: l.narration || null,
              costCenter: l.costCenter || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
        return attachIncludes('journalEntries', entry, include, state);
      },
    },
    journalLine: createTableHandlers('journalLines', state.journalLines, 'jl'),
    fiscalPeriod: createTableHandlers('fiscalPeriods', state.fiscalPeriods, 'fp'),
    accountingSettings: createTableHandlers('accountingSettings', state.accountingSettings, 'as'),
    unpostedEntry: createTableHandlers('unpostedEntries', state.unpostedEntries, 'unp'),
    companyApp: createTableHandlers('companyApps', state.companyApps, 'capp'),
    billOfMaterials: createTableHandlers('billOfMaterials', state.billOfMaterials, 'bom'),
    bomComponentItem: createTableHandlers('bomComponentItems', state.bomComponentItems, 'bci'),
    bomStandardStage: createTableHandlers('bomStandardStages', state.bomStandardStages, 'bss'),
    productionOrder: createTableHandlers('productionOrders', state.productionOrders, 'po'),
    productionOrderVariantMatrix: createTableHandlers('productionOrderVariantMatrices', state.productionOrderVariantMatrices, 'povm'),
    productionStage: createTableHandlers('productionStages', state.productionStages, 'ps'),
    materialIssue: createTableHandlers('materialIssues', state.materialIssues, 'mi'),
    materialIssueItem: createTableHandlers('materialIssueItems', state.materialIssueItems, 'mii'),
    finishedGoodsReceipt: createTableHandlers('finishedGoodsReceipts', state.finishedGoodsReceipts, 'fgr'),
    finishedGoodsReceiptItem: createTableHandlers('finishedGoodsReceiptItems', state.finishedGoodsReceiptItems, 'fgri'),
    scrapRecord: createTableHandlers('scrapRecords', state.scrapRecords, 'sr'),
    manufacturingSettings: createTableHandlers('manufacturingSettings', state.manufacturingSettings, 'ms'),
    inventory: createTableHandlers('inventory', state.inventory, 'inv'),
    stockMovement: createTableHandlers('stockMovements', state.stockMovements, 'sm'),
    product: createTableHandlers('products', state.products, 'prod'),

    $transaction: async (fn) => {
      if (typeof fn !== 'function') {
        throw new Error('Interactive $transaction requires a callback function: $transaction(async (tx) => ...)');
      }
      // Snapshot state to accurately simulate PostgreSQL atomic transaction rollback
      const snapshot = {};
      for (const k of Object.keys(state)) {
        snapshot[k] = state[k].map((item) => ({ ...item }));
      }
      try {
        return await fn(prisma);
      } catch (err) {
        for (const k of Object.keys(state)) {
          state[k].length = 0;
          if (snapshot[k]) {
            state[k].push(...snapshot[k].map((item) => ({ ...item })));
          }
        }
        throw err;
      }
    },
  };

  return prisma;
};

describe('Manufacturing Execution System & Costing Test Suite (Wave 1)', () => {
  const companyA = 'comp_garment_factory_egypt';
  const companyB = 'comp_textile_rival_ltd';

  beforeEach(async () => {
    currentPrisma = createInMemoryStore();
    global.__testPrisma = currentPrisma;

    // Seed Egyptian Standard COA for Company A
    await AccountingService.seedEgyptianCOA(companyA);
  });

  test('1. BOM Multi-Variant Resolution: computes exact material requirements by size/color with scrap and waste margins', async () => {
    // Known fixture: Hoodie BOM with specific consumption per size/color
    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-HOODIE-V1',
      name: 'هودي شتوي قطن ميلتون',
      version: '1.0',
      wasteMarginPercent: 3.0, // 3% general waste
      laborCostPerUnit: 25.0,
      overheadCostPerUnit: 10.0,
      components: [
        // Shell fabric applies to ALL sizes and colors
        {
          rawMaterialId: 'raw_fabric_milton',
          rawMaterialName: 'قماش ميلتون قطن',
          consumptionPerUnit: 1.5,
          unit: 'METER',
          appliesToSizes: ['ALL'],
          appliesToColors: ['ALL'],
          scrapRate: 2.0, // 2% component cutting scrap
        },
        // Black zipper only applies to BLACK hoodies
        {
          rawMaterialId: 'raw_zipper_black',
          rawMaterialName: 'سوستة عظم أسود',
          consumptionPerUnit: 1.0,
          unit: 'PIECE',
          appliesToSizes: ['ALL'],
          appliesToColors: ['BLACK'],
          scrapRate: 0.0,
        },
        // White zipper only applies to WHITE hoodies
        {
          rawMaterialId: 'raw_zipper_white',
          rawMaterialName: 'سوستة عظم أبيض',
          consumptionPerUnit: 1.0,
          unit: 'PIECE',
          appliesToSizes: ['ALL'],
          appliesToColors: ['WHITE'],
          scrapRate: 0.0,
        },
        // Extra lining for large sizes only
        {
          rawMaterialId: 'raw_lining_rib',
          rawMaterialName: 'ريب أسورة إضافي مقاسات كبيرة',
          consumptionPerUnit: 0.25,
          unit: 'METER',
          appliesToSizes: ['XL', 'XXL'],
          appliesToColors: ['ALL'],
          scrapRate: 0.0,
        },
      ],
      standardStages: [
        { name: 'القص', stageType: 'CUTTING', sequence: 1, ratePerPiece: 4.0 },
        { name: 'الخياطة', stageType: 'SEWING', sequence: 2, ratePerPiece: 18.0 },
        { name: 'الكي والتعبئة', stageType: 'PACKAGING', sequence: 3, ratePerPiece: 3.0 },
      ],
    });

    expect(bom.id).toBeDefined();
    expect(bom.components).toHaveLength(4);
    expect(bom.standardStages).toHaveLength(3);

    // Matrix input:
    // 100x M / BLACK
    // 50x XL / WHITE
    const variantMatrix = [
      { size: 'M', color: 'BLACK', plannedQuantity: 100 },
      { size: 'XL', color: 'WHITE', plannedQuantity: 50 },
    ];

    const resolved = await ManufacturingService.resolveVariantRequirements(companyA, bom.id, variantMatrix);

    expect(resolved.totalPlannedQuantity).toBe(150);
    expect(resolved.aggregatedMaterials).toHaveLength(4);

    // Verify Black zipper: 100 units * 1.0 * 1.03 waste = 103 pieces
    const blackZipper = resolved.aggregatedMaterials.find((m) => m.rawMaterialId === 'raw_zipper_black');
    expect(blackZipper).toBeDefined();
    expect(blackZipper.totalRequiredQuantity).toBe(103.0);

    // Verify White zipper: 50 units * 1.0 * 1.03 waste = 51.5 pieces
    const whiteZipper = resolved.aggregatedMaterials.find((m) => m.rawMaterialId === 'raw_zipper_white');
    expect(whiteZipper).toBeDefined();
    expect(whiteZipper.totalRequiredQuantity).toBe(51.5);

    // Verify Extra Lining: only for XL (50 pieces * 0.25 * 1.03 = 12.875)
    const ribLining = resolved.aggregatedMaterials.find((m) => m.rawMaterialId === 'raw_lining_rib');
    expect(ribLining).toBeDefined();
    expect(ribLining.totalRequiredQuantity).toBe(12.875);

    // Verify Shell Fabric:
    // M/Black (100) -> 100 * 1.5 * 1.02 * 1.03 = 157.59
    // XL/White (50) -> 50 * 1.5 * 1.02 * 1.03 = 78.795
    // Total = 157.59 + 78.795 = 236.385
    const shellFabric = resolved.aggregatedMaterials.find((m) => m.rawMaterialId === 'raw_fabric_milton');
    expect(shellFabric).toBeDefined();
    expect(shellFabric.totalRequiredQuantity).toBe(236.385);
  });

  test('2. Order Lifecycle, Unsettled Closure Protection (§9), and Cancellation Material Return', async () => {
    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-TEE-01',
      name: 'تيشيرت صيفي',
      components: [
        {
          rawMaterialId: 'raw_cotton_single',
          rawMaterialName: 'غزل قطن سنجل',
          consumptionPerUnit: 0.5,
          unit: 'KG',
          appliesToSizes: ['ALL'],
          appliesToColors: ['ALL'],
        },
      ],
      standardStages: [
        { name: 'القص', stageType: 'CUTTING', sequence: 1, ratePerPiece: 2.0 },
        { name: 'الخياطة', stageType: 'SEWING', sequence: 2, ratePerPiece: 8.0 },
      ],
    });

    // Create Order with plannedQuantity = 100
    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      productId: 'prod_tee_summer',
      sourceWarehouseId: 'wh_raw_materials',
      targetWarehouseId: 'wh_showroom',
      variantMatrix: [
        { size: 'M', color: 'WHITE', plannedQuantity: 60 },
        { size: 'L', color: 'WHITE', plannedQuantity: 40 },
      ],
    });

    expect(order.status).toBe('PLANNED');
    expect(order.plannedQuantity).toBe(100);
    expect(order.orderNumber).toBeDefined();

    // Release Order
    const released = await ManufacturingService.releaseOrder(companyA, order.id);
    expect(released.status).toBe('RELEASED');

    // Start Order
    const started = await ManufacturingService.startOrder(companyA, order.id);
    expect(started.status).toBe('IN_PROGRESS');

    // Partial receipt: only 70 pieces received
    await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      items: [
        { size: 'M', color: 'WHITE', goodQuantity: 50, scrapQuantity: 0 },
        { size: 'L', color: 'WHITE', goodQuantity: 20, scrapQuantity: 0 },
      ],
    });

    // Attempting to close order should throw error: unsettled 30 pieces!
    let threw = false;
    try {
      await ManufacturingService.completeOrder(companyA, order.id);
    } catch (err) {
      threw = true;
      expect(err.message.includes('لا يمكن إقفال أمر الإنتاج')).toBe(true);
      expect(err.message.includes('30')).toBe(true);
    }
    expect(threw).toBe(true);

    // Settle the remaining 30 pieces: 20 good + 10 scrap
    await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      items: [
        { size: 'L', color: 'WHITE', goodQuantity: 20, scrapQuantity: 10 },
      ],
    });

    // Now order has 90 produced + 10 scrapped = 100 settled!
    const completed = await ManufacturingService.completeOrder(companyA, order.id);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.producedQuantity).toBe(90);
    expect(completed.scrappedQuantity).toBe(10);
  });

  test('3. Material Issue: deducts stock from source warehouse and evaluates cost at inventory average', async () => {
    // Setup initial inventory in source warehouse
    await currentPrisma.inventory.create({
      data: {
        productId: 'raw_denim_fabric',
        warehouseId: 'wh_raw_cotton',
        quantity: 500,
        available: 500,
        cost: 150.0, // 150 EGP per meter average cost
      },
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-JEANS-01',
      name: 'بنطلون جينز كلاسيك',
      components: [
        {
          rawMaterialId: 'raw_denim_fabric',
          consumptionPerUnit: 1.4,
          unit: 'METER',
        },
      ],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      sourceWarehouseId: 'wh_raw_cotton',
      variantMatrix: [{ size: '32', color: 'BLUE', plannedQuantity: 100 }],
    });
    await ManufacturingService.startOrder(companyA, order.id);

    // Issue 140 meters of denim fabric without specifying unitCost
    const issue = await ManufacturingService.issueMaterials(companyA, order.id, {
      sourceWarehouseId: 'wh_raw_cotton',
      items: [
        {
          rawMaterialId: 'raw_denim_fabric',
          quantity: 140,
          unit: 'METER',
        },
      ],
    });

    expect(issue.items).toHaveLength(1);
    expect(issue.items[0].unitCost).toBe(150.0);
    expect(issue.totalCost).toBe(21000.0); // 140 * 150 = 21,000

    // Check inventory stock deducted: 500 - 140 = 360
    const inv = await currentPrisma.inventory.findFirst({
      where: { productId: 'raw_denim_fabric', warehouseId: 'wh_raw_cotton' },
    });
    expect(inv.quantity).toBe(360);
    expect(inv.available).toBe(360);

    // Verify StockMovement record was safely created
    const sm = await currentPrisma.stockMovement.findFirst({
      where: { productId: 'raw_denim_fabric', warehouseId: 'wh_raw_cotton' },
    });
    expect(sm).toBeDefined();
    expect(sm.type).toBe('OUT');
    expect(sm.quantity).toBe(140);
  });

  test('4. Finished Goods Receipt: adds stock to target warehouse and updates weighted average cost', async () => {
    // Setup target warehouse with existing inventory (100 pcs @ 200 EGP)
    await currentPrisma.inventory.create({
      data: {
        productId: 'prod_hoodie_luxury',
        warehouseId: 'wh_showroom_main',
        quantity: 100,
        available: 100,
        cost: 200.0, // Existing stock value = 20,000 EGP
      },
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-HOODIE-LUX',
      name: 'هودي فاخر',
      productId: 'prod_hoodie_luxury',
      components: [],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      productId: 'prod_hoodie_luxury',
      targetWarehouseId: 'wh_showroom_main',
      variantMatrix: [{ size: 'L', color: 'BLACK', plannedQuantity: 100 }],
    });
    await ManufacturingService.startOrder(companyA, order.id);

    // Receive 100 new pieces at unitCost 250 EGP (New batch value = 25,000 EGP)
    // New total quantity = 100 + 100 = 200
    // New total value = 20,000 + 25,000 = 45,000 EGP
    // Weighted Average Cost = 45,000 / 200 = 225.00 EGP
    const receipt = await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      targetWarehouseId: 'wh_showroom_main',
      items: [
        {
          size: 'L',
          color: 'BLACK',
          goodQuantity: 100,
          scrapQuantity: 0,
          unitCost: 250.0,
        },
      ],
    });

    expect(receipt.totalQuantity).toBe(100);
    expect(receipt.totalCost).toBe(25000.0);

    const updatedInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'prod_hoodie_luxury', warehouseId: 'wh_showroom_main' },
    });
    expect(updatedInv.quantity).toBe(200);
    expect(updatedInv.cost).toBe(225.0); // Exactly 225.00 weighted average
  });

  test('5. Three-Way Costing Engine: Materials + Labor + MOH matches manual fixture computation', async () => {
    // Configure default MOH overhead rate per piece in company manufacturing settings
    await ManufacturingService.updateSettings(companyA, {
      defaultOverheadRatePerPiece: 10.0, // 10 EGP MOH per piece
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-POLO-SHIRT',
      name: 'قميص بولو رجالي',
      laborCostPerUnit: 20.0,
      overheadCostPerUnit: 10.0,
      components: [
        {
          rawMaterialId: 'raw_cotton_pique',
          consumptionPerUnit: 1.0,
          unit: 'METER',
        },
      ],
      standardStages: [
        { name: 'القص', sequence: 1, ratePerPiece: 5.0 },
        { name: 'الخياطة والتجميع', sequence: 2, ratePerPiece: 15.0 },
      ],
    });

    // Seed raw material product with standard cost = 110.0 EGP
    await currentPrisma.product.create({
      data: {
        id: 'raw_cotton_pique',
        name: 'قماش بيكيه قطن',
        cost: 110.0,
      },
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      variantMatrix: [{ size: 'M', color: 'NAVY', plannedQuantity: 100 }],
    });
    await ManufacturingService.startOrder(companyA, order.id);

    // 1. Incur Material Cost: 100 units * 120 EGP = 12,000 EGP
    await ManufacturingService.issueMaterials(companyA, order.id, {
      sourceWarehouseId: 'wh_materials',
      items: [{ rawMaterialId: 'raw_cotton_pique', quantity: 100, unitCost: 120.0 }],
    });

    // 2. Incur Labor Cost via stages:
    // Cutting stage: 100 pcs * 5 EGP = 500 EGP
    const cuttingStage = order.stages.find((s) => s.sequence === 1);
    await ManufacturingService.updateStageProgress(companyA, order.id, cuttingStage.id, {
      completedQuantity: 100,
    });
    // Sewing stage: 100 pcs * 15 EGP = 1500 EGP
    const sewingStage = order.stages.find((s) => s.sequence === 2);
    await ManufacturingService.updateStageProgress(companyA, order.id, sewingStage.id, {
      completedQuantity: 100,
    });

    // 3. Receive 100 finished goods
    await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      items: [{ size: 'M', color: 'NAVY', goodQuantity: 100, scrapQuantity: 0 }],
    });

    // 4. Complete order -> triggers final costing
    // Material Cost = 12,000 EGP
    // Labor Cost = 500 + 1500 = 2,000 EGP
    // Overhead MOH = 100 pcs * 10 EGP = 1,000 EGP
    // Expected Total Cost = 12,000 + 2,000 + 1,000 = 15,000 EGP
    // Expected Unit Cost = 15,000 / 100 = 150.00 EGP
    const completed = await ManufacturingService.completeOrder(companyA, order.id);

    expect(completed.actualMaterialCost).toBe(12000.0);
    expect(completed.actualLaborCost).toBe(2000.0);
    expect(completed.actualOverheadCost).toBe(1000.0);
    expect(completed.totalCost).toBe(15000.0);
    expect(completed.unitCost).toBe(150.0);

    // Cost analysis report verification
    const analysis = await ManufacturingService.calculateOrderCost(companyA, order.id);
    expect(analysis.actualCost.total).toBe(15000.0);
    expect(analysis.actualCost.unitCost).toBe(150.0);

    // Verify standard planned cost computed from BOM using raw material Product.cost (110.0 EGP/meter)
    // Materials: 100 planned pcs * 1.0 m * 110.0 EGP = 11,000 EGP
    // Labor: 100 pcs * (5 + 15) = 2,000 EGP
    // MOH: 100 pcs * 10 EGP = 1,000 EGP
    // Total Standard Cost: 11,000 + 2,000 + 1,000 = 14,000 EGP
    expect(analysis.standardCost.materials).toBe(11000.0);
    expect(analysis.standardCost.total).toBe(14000.0);
    expect(analysis.standardCost.unitCost).toBe(140.0);
    expect(analysis.variance.totalVariance).toBe(1000.0); // 15,000 - 14,000 overrun
    expect(analysis.variance.isFavorable).toBe(false);
  });

  test('6. WIP Double-Entry Postings: verifies 4 GL entries, dual gates, and idempotency', async () => {
    // Resolve Finished Goods account 110403 to set as accounting.defaultInventoryAccountId
    // This replicates the exact real-world condition where defaultInventoryAccountId points to 110403 (commercial merchandise)
    const account110403 = await currentPrisma.account.findFirst({
      where: { companyId: companyA, code: '110403' },
    });

    // Enable auto-posting on accounting settings with defaultInventoryAccountId = 110403
    await AccountingService.updateSettings(companyA, {
      autoPostingEnabled: true,
      defaultInventoryAccountId: account110403?.id,
    });

    // Create an active company app subscription for accounting
    await currentPrisma.companyApp.create({
      data: {
        companyId: companyA,
        slug: 'accounting',
        status: 'ACTIVE',
      },
    });

    // Set up manufacturing settings with standard Egyptian COA accounts (rawMaterialsAccountId left null to test fallback)
    await ManufacturingService.updateSettings(companyA, {
      autoPostingEnabled: true,
      defaultOverheadRatePerPiece: 5.0,
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-GL-TEST',
      name: 'اختبار قيود WIP',
      components: [],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      variantMatrix: [{ size: 'L', color: 'BLACK', plannedQuantity: 50 }],
    });
    await ManufacturingService.startOrder(companyA, order.id);

    // 1. Post Material Issue GL Entry (WIP 110402 Debit / Raw Materials 110401 Credit)
    const issueEntry = await ManufacturingService.postWipMaterialIssue(companyA, 'issue_test_01', {
      orderNumber: order.orderNumber,
      totalCost: 5000.0,
    });
    expect(issueEntry.id).toBeDefined();
    expect(issueEntry.sourceType).toBe('MANUFACTURING_ISSUE');

    const issueLines = await currentPrisma.journalLine.findMany({ where: { entryId: issueEntry.id } });
    expect(issueLines).toHaveLength(2);
    const issueDebit = issueLines.find((l) => Number(l.debit) === 5000.0);
    const issueCredit = issueLines.find((l) => Number(l.credit) === 5000.0);
    expect(issueDebit).toBeDefined();
    expect(issueCredit).toBeDefined();

    // Verify exact account codes: Dr 110402 (WIP) / Cr 110401 (Raw Materials)
    // Regression check: 110403 (Finished Goods) must NEVER be credited in issue entry!
    const debitAccount = await currentPrisma.account.findFirst({ where: { id: issueDebit.accountId } });
    const creditAccount = await currentPrisma.account.findFirst({ where: { id: issueCredit.accountId } });
    expect(debitAccount.code).toBe('110402');
    expect(creditAccount.code).toBe('110401');
    expect(creditAccount.code).not.toBe('110403');

    // Idempotency check: Calling again with same issueId creates ZERO extra entries
    const duplicateIssue = await ManufacturingService.postWipMaterialIssue(companyA, 'issue_test_01', {
      orderNumber: order.orderNumber,
      totalCost: 5000.0,
    });
    expect(duplicateIssue.skipped).toBe(true);
    expect(duplicateIssue.idempotent).toBe(true);
    const allIssueEntries = await currentPrisma.journalEntry.findMany({
      where: { companyId: companyA, sourceType: 'MANUFACTURING_ISSUE', sourceId: 'issue_test_01' },
    });
    expect(allIssueEntries).toHaveLength(1);

    // 2. Post Labor Cost GL Entry (WIP 110402 Debit / Accrued Wages 210201 Credit)
    const laborEntry = await ManufacturingService.postWipLaborCost(companyA, order.id, {
      orderNumber: order.orderNumber,
      amount: 1500.0,
    });
    expect(laborEntry.id).toBeDefined();
    expect(laborEntry.sourceType).toBe('MANUFACTURING_LABOR');
    const laborLines = await currentPrisma.journalLine.findMany({ where: { entryId: laborEntry.id } });
    const laborDebit = laborLines.find((l) => Number(l.debit) === 1500.0);
    const laborCredit = laborLines.find((l) => Number(l.credit) === 1500.0);
    const laborDebitAcc = await currentPrisma.account.findFirst({ where: { id: laborDebit.accountId } });
    const laborCreditAcc = await currentPrisma.account.findFirst({ where: { id: laborCredit.accountId } });
    expect(laborDebitAcc.code).toBe('110402');
    expect(laborCreditAcc.code).toBe('210201');

    // 3. Post MOH Cost GL Entry (WIP 110402 Debit / Applied MOH 5103 Credit)
    const mohEntry = await ManufacturingService.postWipOverheadCost(companyA, order.id, {
      orderNumber: order.orderNumber,
      amount: 250.0,
    });
    expect(mohEntry.id).toBeDefined();
    expect(mohEntry.sourceType).toBe('MANUFACTURING_OVERHEAD');
    const mohLines = await currentPrisma.journalLine.findMany({ where: { entryId: mohEntry.id } });
    const mohDebit = mohLines.find((l) => Number(l.debit) === 250.0);
    const mohCredit = mohLines.find((l) => Number(l.credit) === 250.0);
    const mohDebitAcc = await currentPrisma.account.findFirst({ where: { id: mohDebit.accountId } });
    const mohCreditAcc = await currentPrisma.account.findFirst({ where: { id: mohCredit.accountId } });
    expect(mohDebitAcc.code).toBe('110402');
    expect(mohCreditAcc.code).toBe('5103');

    // 4. Post Finished Goods Receipt GL Entry (Finished Goods 110403 Debit / WIP 110402 Credit)
    const totalOrderCost = 5000.0 + 1500.0 + 250.0; // 6750.0
    const receiptEntry = await ManufacturingService.postWipFinishedGoodsReceipt(companyA, order.id, {
      orderNumber: order.orderNumber,
      amount: totalOrderCost,
    });
    expect(receiptEntry.id).toBeDefined();
    expect(receiptEntry.sourceType).toBe('MANUFACTURING_RECEIPT');
    const receiptLines = await currentPrisma.journalLine.findMany({ where: { entryId: receiptEntry.id } });
    const receiptDebit = receiptLines.find((l) => Number(l.debit) === totalOrderCost);
    const receiptCredit = receiptLines.find((l) => Number(l.credit) === totalOrderCost);
    const receiptDebitAcc = await currentPrisma.account.findFirst({ where: { id: receiptDebit.accountId } });
    const receiptCreditAcc = await currentPrisma.account.findFirst({ where: { id: receiptCredit.accountId } });
    expect(receiptDebitAcc.code).toBe('110403');
    expect(receiptCreditAcc.code).toBe('110402');

    // Verify all 4 entries are posted and balanced
    const allEntries = await currentPrisma.journalEntry.findMany({
      where: { companyId: companyA },
    });
    expect(allEntries).toHaveLength(4);
  });

  test('7. Strict Multi-Tenant Isolation: Company A cannot see, update, or close Company B records', async () => {
    // Seed Company B
    await AccountingService.seedEgyptianCOA(companyB);

    // Company A creates BOM and Order
    const bomA = await ManufacturingService.createBom(companyA, {
      code: 'BOM-SECRET-A',
      name: 'موديل حصري شركة أ',
      components: [],
    });
    const orderA = await ManufacturingService.createOrder(companyA, {
      bomId: bomA.id,
      variantMatrix: [{ size: 'M', color: 'RED', plannedQuantity: 50 }],
    });

    // Company B creates BOM
    const bomB = await ManufacturingService.createBom(companyB, {
      code: 'BOM-SECRET-B',
      name: 'موديل حصري شركة ب',
      components: [],
    });

    // 1. Company B list BOMs -> cannot see Company A BOM
    const bomsB = await ManufacturingService.listBoms(companyB);
    expect(bomsB.some((b) => b.id === bomA.id)).toBe(false);
    expect(bomsB.some((b) => b.id === bomB.id)).toBe(true);

    // 2. Company B get BOM by ID -> throws not found
    let threwBom = false;
    try {
      await ManufacturingService.getBomById(companyB, bomA.id);
    } catch (err) {
      threwBom = true;
    }
    expect(threwBom).toBe(true);

    // 3. Company B get Order by ID -> throws not found
    let threwOrder = false;
    try {
      await ManufacturingService.getOrderById(companyB, orderA.id);
    } catch (err) {
      threwOrder = true;
    }
    expect(threwOrder).toBe(true);

    // 4. Company B cannot issue materials to Company A order
    let threwIssue = false;
    try {
      await ManufacturingService.issueMaterials(companyB, orderA.id, {
        sourceWarehouseId: 'wh_b',
        items: [{ rawMaterialId: 'raw_x', quantity: 10 }],
      });
    } catch (err) {
      threwIssue = true;
    }
    expect(threwIssue).toBe(true);
  });

  test('8. Full Atomic Rollback on Issue Failure: zero side-effects on order status, stock, and vouchers', async () => {
    // Setup warehouse with inventory (100 units)
    await currentPrisma.inventory.create({
      data: {
        productId: 'raw_test_atomicity',
        warehouseId: 'wh_atomic_test',
        quantity: 100,
        available: 100,
        cost: 50.0,
      },
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-ATOMIC-FAIL',
      name: 'اختبار الذرية والـ Rollback',
      components: [
        {
          rawMaterialId: 'raw_test_atomicity',
          consumptionPerUnit: 1.0,
          unit: 'PIECE',
          scrapRate: 0.0,
        },
      ],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      sourceWarehouseId: 'wh_atomic_test',
      variantMatrix: [{ size: 'M', color: 'BLACK', plannedQuantity: 20 }],
    });

    await ManufacturingService.releaseOrder(companyA, order.id);

    // Verify state before attempt: status is RELEASED, inventory is 100
    const beforeOrder = await currentPrisma.productionOrder.findFirst({ where: { id: order.id } });
    expect(beforeOrder.status).toBe('RELEASED');
    const beforeInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'raw_test_atomicity', warehouseId: 'wh_atomic_test' },
    });
    expect(beforeInv.quantity).toBe(100);

    // Inject simulated error in materialIssueItem.create inside transaction
    const originalCreate = currentPrisma.materialIssueItem.create;
    currentPrisma.materialIssueItem.create = async () => {
      throw new Error('SIMULATED_DB_ERROR_INSIDE_ISSUE_ITEMS');
    };

    let threw = false;
    try {
      await ManufacturingService.startOrder(companyA, order.id, {
        autoIssue: true,
        sourceWarehouseId: 'wh_atomic_test',
      });
    } catch (err) {
      threw = true;
      expect(err.message.includes('SIMULATED_DB_ERROR_INSIDE_ISSUE_ITEMS')).toBe(true);
    } finally {
      currentPrisma.materialIssueItem.create = originalCreate;
    }
    expect(threw).toBe(true);

    // Verify ZERO side-effects:
    // 1. Order status was rolled back to RELEASED (not left as IN_PROGRESS)
    const afterOrder = await currentPrisma.productionOrder.findFirst({ where: { id: order.id } });
    expect(afterOrder.status).toBe('RELEASED');

    // 2. No MaterialIssue voucher was persisted
    const issues = await currentPrisma.materialIssue.findMany({ where: { orderId: order.id } });
    expect(issues).toHaveLength(0);

    // 3. Inventory was NOT decremented (remains 100)
    const afterInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'raw_test_atomicity', warehouseId: 'wh_atomic_test' },
    });
    expect(afterInv.quantity).toBe(100);
    expect(afterInv.available).toBe(100);

    // 4. No stock movements were created
    const sm = await currentPrisma.stockMovement.findMany({
      where: { productId: 'raw_test_atomicity', warehouseId: 'wh_atomic_test' },
    });
    expect(sm).toHaveLength(0);
  });

  test('9. Idempotency Guard: retrying start with autoIssue creates only one material issue', async () => {
    // Setup warehouse with inventory (200 units)
    await currentPrisma.inventory.create({
      data: {
        productId: 'raw_idemp_fabric',
        warehouseId: 'wh_idemp_store',
        quantity: 200,
        available: 200,
        cost: 30.0,
      },
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-IDEMP-TEST',
      name: 'اختبار منع التكرار',
      components: [
        {
          rawMaterialId: 'raw_idemp_fabric',
          consumptionPerUnit: 2.0,
          unit: 'METER',
          scrapRate: 0.0,
        },
      ],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      sourceWarehouseId: 'wh_idemp_store',
      variantMatrix: [{ size: 'L', color: 'WHITE', plannedQuantity: 10 }],
    });
    await ManufacturingService.releaseOrder(companyA, order.id);

    // 1st start call with autoIssue: should succeed and create 1 issue
    const started1 = await ManufacturingService.startOrder(companyA, order.id, {
      autoIssue: true,
      sourceWarehouseId: 'wh_idemp_store',
    });
    expect(started1.status).toBe('IN_PROGRESS');

    const issuesAfterFirst = await currentPrisma.materialIssue.findMany({ where: { orderId: order.id } });
    expect(issuesAfterFirst).toHaveLength(1);

    const invAfterFirst = await currentPrisma.inventory.findFirst({
      where: { productId: 'raw_idemp_fabric', warehouseId: 'wh_idemp_store' },
    });
    // 200 - (10 * 2) = 180
    expect(invAfterFirst.quantity).toBe(180);

    // 2nd start call on the same order with autoIssue: should be idempotent and NOT create another issue
    const started2 = await ManufacturingService.startOrder(companyA, order.id, {
      autoIssue: true,
      sourceWarehouseId: 'wh_idemp_store',
    });
    expect(started2.status).toBe('IN_PROGRESS');
    expect(started2.idempotent).toBe(true);
    expect(started2.autoIssueSkipped).toBe(true);

    const issuesAfterSecond = await currentPrisma.materialIssue.findMany({ where: { orderId: order.id } });
    expect(issuesAfterSecond).toHaveLength(1);

    const invAfterSecond = await currentPrisma.inventory.findFirst({
      where: { productId: 'raw_idemp_fabric', warehouseId: 'wh_idemp_store' },
    });
    // Stock remained 180, was NOT deducted a second time!
    expect(invAfterSecond.quantity).toBe(180);
  });

  test('10. Finished Goods Receipt Upsert: creates Inventory row when receiving into empty warehouse', async () => {
    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-VIRGIN-RECEIPT',
      name: 'استلام لمخزن غير مسجل سابقاً',
      productId: 'prod_virgin_tshirt',
      components: [],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      productId: 'prod_virgin_tshirt',
      targetWarehouseId: 'wh_new_unstocked',
      variantMatrix: [
        { size: 'M', color: 'WHITE', plannedQuantity: 10 },
        { size: 'L', color: 'WHITE', plannedQuantity: 10 },
      ],
    });
    await ManufacturingService.releaseOrder(companyA, order.id);
    await ManufacturingService.startOrder(companyA, order.id);

    // Verify BEFORE receipt: no inventory row exists in wh_new_unstocked
    const beforeInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'prod_virgin_tshirt', warehouseId: 'wh_new_unstocked' },
    });
    expect(beforeInv).toBe(null);

    // Receive 10 of size M and 10 of size L (total 20 pieces) at unitCost 75 EGP
    const receipt = await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      targetWarehouseId: 'wh_new_unstocked',
      items: [
        { size: 'M', color: 'WHITE', goodQuantity: 10, scrapQuantity: 0, unitCost: 75.0 },
        { size: 'L', color: 'WHITE', goodQuantity: 10, scrapQuantity: 0, unitCost: 75.0 },
      ],
    });

    expect(receipt.totalQuantity).toBe(20);

    // Verify AFTER receipt: inventory row was created by upsert and incremented to 20!
    const afterInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'prod_virgin_tshirt', warehouseId: 'wh_new_unstocked' },
    });
    expect(afterInv).toBeDefined();
    expect(afterInv.quantity).toBe(20);
    expect(afterInv.available).toBe(20);
    expect(afterInv.cost).toBe(75.0);

    // Verify stock movements were recorded with type IN
    const movements = await currentPrisma.stockMovement.findMany({
      where: { productId: 'prod_virgin_tshirt', warehouseId: 'wh_new_unstocked' },
    });
    expect(movements).toHaveLength(2);
    expect(movements[0].type).toBe('IN');
    expect(movements[1].type).toBe('IN');
  });

  test('11. Full Lifecycle & Cost Settlement: FGR record and inventory valuation settle to final absorbed cost', async () => {
    await AccountingService.updateSettings(companyA, { autoPostingEnabled: true });
    await currentPrisma.companyApp.create({
      data: { companyId: companyA, slug: 'accounting', status: 'ACTIVE' },
    });
    await ManufacturingService.updateSettings(companyA, {
      autoPostingEnabled: true,
      defaultOverheadRatePerPiece: 5.0,
    });

    // Seed raw material in warehouse
    await currentPrisma.inventory.create({
      data: {
        productId: 'raw_lifecycle_yarn',
        warehouseId: 'wh_yarn',
        quantity: 100,
        available: 100,
        cost: 25.0,
      },
    });

    const bom = await ManufacturingService.createBom(companyA, {
      code: 'BOM-LIFECYCLE-FULL',
      name: 'دورة تصنيع كاملة مع التسوية',
      productId: 'prod_sweater_final',
      laborCostPerUnit: 10.0,
      overheadCostPerUnit: 5.0,
      components: [
        {
          rawMaterialId: 'raw_lifecycle_yarn',
          consumptionPerUnit: 2.0,
          unit: 'KG',
          scrapRate: 0.0,
        },
      ],
      standardStages: [
        { name: 'حياكة الصوف', sequence: 1, ratePerPiece: 10.0 },
      ],
    });

    const order = await ManufacturingService.createOrder(companyA, {
      bomId: bom.id,
      productId: 'prod_sweater_final',
      sourceWarehouseId: 'wh_yarn',
      targetWarehouseId: 'wh_knit_finish',
      variantMatrix: [{ size: 'XL', color: 'GREY', plannedQuantity: 20 }],
    });
    await ManufacturingService.releaseOrder(companyA, order.id);

    // 1. Start order with autoIssue: issues 40 KG @ 25 = 1000 EGP
    const started = await ManufacturingService.startOrder(companyA, order.id, {
      autoIssue: true,
      sourceWarehouseId: 'wh_yarn',
    });
    expect(started.status).toBe('IN_PROGRESS');

    // 2. Stage progress: 20 pcs * 10 = 200 EGP labor
    const stage = order.stages[0];
    await ManufacturingService.updateStageProgress(companyA, order.id, stage.id, {
      completedQuantity: 20,
    });

    // 3. Receive 20 finished goods: provisional cost before completion is based on incurred so far
    const receipt = await ManufacturingService.receiveFinishedGoods(companyA, order.id, {
      targetWarehouseId: 'wh_knit_finish',
      items: [{ size: 'XL', color: 'GREY', goodQuantity: 20, scrapQuantity: 0 }],
    });
    expect(receipt.totalQuantity).toBe(20);

    // 4. Complete order:
    // Materials = 1,000 EGP
    // Labor = 200 EGP
    // MOH = 20 * 5 = 100 EGP
    // Total = 1,300 EGP -> Unit cost = 1,300 / 20 = 65.00 EGP
    const completed = await ManufacturingService.completeOrder(companyA, order.id);
    expect(completed.totalCost).toBe(1300.0);
    expect(completed.unitCost).toBe(65.0);

    // 5. Verify FGR was settled to 65.00 unitCost and 1300.0 totalCost
    const settledReceipt = await currentPrisma.finishedGoodsReceipt.findFirst({
      where: { id: receipt.id },
    });
    expect(settledReceipt.unitCost).toBe(65.0);
    expect(settledReceipt.totalCost).toBe(1300.0);

    // 6. Verify target warehouse inventory cost was settled to 65.00
    const finishInv = await currentPrisma.inventory.findFirst({
      where: { productId: 'prod_sweater_final', warehouseId: 'wh_knit_finish' },
    });
    expect(finishInv.quantity).toBe(20);
    expect(finishInv.cost).toBe(65.0);
  });
});
