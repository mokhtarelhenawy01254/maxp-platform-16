/**
 * Unit & Integration Tests for Standard Production Stage Templates & Sets (Wave 6)
 *
 * Scenarios:
 * 1. ProductionStageTemplate CRUD:
 *    - Code uniqueness per tenant company
 *    - Rate per piece, standard minutes, execution entity (INTERNAL/EXTERNAL), instructions
 *    - Multi-tenant isolation (companyA vs companyB)
 * 2. Stage Template Sets & Items Management:
 *    - Create set, add items in sequence
 *    - Reorder set items, remove item and maintain 1..N sequence
 * 3. Snapshot Copy (استدعاء مراحل الإنتاج للأمر والـBOM):
 *    - Create 3 templates: قص (4 EGP/15m), خياطة (18 EGP/45m), تشطيب EXTERNAL
 *    - Create set "مسار هودي"
 *    - Apply to new ProductionOrder -> Verify ProductionStage created with snapshot values
 *    - Modify sewing template rate to 20 -> Verify old order unchanged (snapshot), new order gets 20
 * 4. Validation & Rejection Guards:
 *    - Reject empty set (400)
 *    - Reject inactive set (400)
 *    - Reject non-existent set (404)
 *    - Reject REPLACE_IF_EMPTY when order already has stages (400)
 *    - Reject COMPLETED and CANCELLED orders (400)
 *    - Increment usageCount on successful apply
 * 5. Apply to Bill of Materials (BOM):
 *    - Apply set with APPEND and REPLACE_ALL modes
 *    - Verify BomStandardStage records generated accurately
 */

const assert = require('assert');

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

const ManufacturingStageTemplateService = require('../services/manufacturingStageTemplateService');

// In-Memory Database Store for Wave 6 Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    templates: [],
    sets: [],
    setItems: [],
    productionOrders: [],
    productionStages: [],
    boms: [],
    bomStandardStages: [],
    partnerFactories: [],
  };

  const createTableHandlers = (stateArray, idPrefix, includeHandler) => ({
    findMany: async ({ where = {}, orderBy, include, select } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (v && typeof v === 'object' && v.not !== undefined) {
            if (item[k] === v.not) return false;
          } else if (v && typeof v === 'object' && v.contains !== undefined) {
            const val = String(item[k] || '').toLowerCase();
            if (!val.includes(String(v.contains).toLowerCase())) return false;
          } else if (k === 'OR' && Array.isArray(v)) {
            const orMatch = v.some((cond) => {
              for (const [subK, subV] of Object.entries(cond)) {
                if (subV && typeof subV === 'object' && subV.contains !== undefined) {
                  const val = String(item[subK] || '').toLowerCase();
                  if (val.includes(String(subV.contains).toLowerCase())) return true;
                } else if (item[subK] === subV) {
                  return true;
                }
              }
              return false;
            });
            if (!orMatch) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });

      if (orderBy) {
        const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];
        results.sort((a, b) => {
          for (const ord of orderList) {
            const [field, dir] = Object.entries(ord)[0] || [];
            if (field) {
              const cmp = a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0;
              if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
            }
          }
          return 0;
        });
      }

      return results.map((item) => {
        const copy = { ...item };
        if (include && includeHandler) {
          includeHandler(copy, include, state);
        }
        if (select) {
          const selected = {};
          for (const field of Object.keys(select)) {
            if (select[field]) selected[field] = copy[field];
          }
          return selected;
        }
        return copy;
      });
    },

    findFirst: async ({ where = {}, orderBy, include, select } = {}) => {
      const items = await createTableHandlers(stateArray, idPrefix, includeHandler).findMany({
        where,
        orderBy,
        include,
        select,
      });
      return items[0] || null;
    },

    create: async ({ data }) => {
      const record = {
        id: data.id || generateId(idPrefix),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stateArray.push(record);
      return { ...record };
    },

    update: async ({ where, data }) => {
      const idx = stateArray.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found`);

      const current = stateArray[idx];
      const updated = { ...current, ...data, updatedAt: new Date() };

      if (data.usageCount && typeof data.usageCount === 'object' && data.usageCount.increment) {
        updated.usageCount = (current.usageCount || 0) + data.usageCount.increment;
      }

      stateArray[idx] = updated;
      return { ...updated };
    },

    delete: async ({ where }) => {
      const idx = stateArray.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found`);
      const deleted = stateArray.splice(idx, 1)[0];
      return deleted;
    },

    deleteMany: async ({ where = {} } = {}) => {
      const initialCount = stateArray.length;
      for (let i = stateArray.length - 1; i >= 0; i--) {
        const item = stateArray[i];
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) {
            match = false;
            break;
          }
        }
        if (match) {
          stateArray.splice(i, 1);
        }
      }
      return { count: initialCount - stateArray.length };
    },
  });

  const prismaMock = {
    $executeRawUnsafe: async () => {},

    productionStageTemplate: createTableHandlers(state.templates, 'tmpl', (copy, include, st) => {
      if (include.defaultPartnerFactory) {
        copy.defaultPartnerFactory = st.partnerFactories.find((f) => f.id === copy.defaultPartnerFactoryId) || null;
      }
    }),

    productionStageTemplateSet: createTableHandlers(state.sets, 'set', (copy, include, st) => {
      if (include.items) {
        const items = st.setItems
          .filter((it) => it.setId === copy.id)
          .sort((a, b) => a.sequence - b.sequence);
        copy.items = items.map((it) => {
          const itemCopy = { ...it };
          if (include.items.include?.template) {
            itemCopy.template = st.templates.find((t) => t.id === it.templateId) || null;
          }
          return itemCopy;
        });
      }
    }),

    productionStageTemplateSetItem: createTableHandlers(state.setItems, 'item', (copy, include, st) => {
      if (include?.template) {
        copy.template = st.templates.find((t) => t.id === copy.templateId) || null;
      }
    }),

    productionOrder: createTableHandlers(state.productionOrders, 'order', (copy, include, st) => {
      if (include?.stages) {
        copy.stages = st.productionStages
          .filter((s) => s.orderId === copy.id)
          .sort((a, b) => a.sequence - b.sequence);
      }
    }),

    productionStage: createTableHandlers(state.productionStages, 'stage'),

    billOfMaterials: createTableHandlers(state.boms, 'bom', (copy, include, st) => {
      if (include?.standardStages) {
        copy.standardStages = st.bomStandardStages
          .filter((s) => s.bomId === copy.id)
          .sort((a, b) => a.sequence - b.sequence);
      }
    }),

    bomStandardStage: createTableHandlers(state.bomStandardStages, 'bomstage'),

    partnerFactory: createTableHandlers(state.partnerFactories, 'fac'),

    _state: state,
  };

  return prismaMock;
};

// ============================================================================
// Test Suite
// ============================================================================

describe('Wave 6: Standard Production Stage Templates Library & Sets', () => {
  const companyA = 'comp_alpha';
  const companyB = 'comp_beta';

  beforeEach(() => {
    currentPrisma = createInMemoryStore();
    global.__testPrisma = currentPrisma;
  });

  test('1. Stage template creation with auto-code, validations, and multi-tenant isolation', async () => {
    const tmpl1 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'STG-CUT',
      name: 'قص أوتوماتيكي',
      stageType: 'CUTTING',
      sequence: 1,
      ratePerPiece: 4.5,
      standardMinutes: 15,
      executionEntity: 'INTERNAL',
      instructions: 'تجميع الفرش ورص الباترون',
    });

    assert.strictEqual(tmpl1.code, 'STG-CUT');
    assert.strictEqual(tmpl1.name, 'قص أوتوماتيكي');
    assert.strictEqual(tmpl1.ratePerPiece, 4.5);
    assert.strictEqual(tmpl1.standardMinutes, 15);
    assert.strictEqual(tmpl1.executionEntity, 'INTERNAL');
    assert.strictEqual(tmpl1.isActive, true);
    assert.strictEqual(tmpl1.usageCount, 0);

    // Duplicate code in same company must fail
    await assert.rejects(
      async () => {
        await ManufacturingStageTemplateService.createTemplate(companyA, {
          code: 'STG-CUT',
          name: 'قص مكرر',
        });
      },
      (err) => err.status === 400 && err.message.includes('مسجل بالفعل')
    );

    // Same code in another company must succeed
    const tmplB = await ManufacturingStageTemplateService.createTemplate(companyB, {
      code: 'STG-CUT',
      name: 'قص شركة بيتا',
    });
    assert.strictEqual(tmplB.companyId, companyB);
    assert.strictEqual(tmplB.code, 'STG-CUT');

    // Auto-code generation when code omitted
    const autoTmpl = await ManufacturingStageTemplateService.createTemplate(companyA, {
      name: 'تطريز كمبيوتر',
      stageType: 'PRINTING_EMBROIDERY',
    });
    assert.ok(autoTmpl.code.startsWith('PST-'));
  });

  test('2. Stage template update and archive', async () => {
    const tmpl = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'STG-SEW',
      name: 'حياكة أوفر وتجميع',
      stageType: 'SEWING',
      ratePerPiece: 18.0,
      standardMinutes: 45,
    });

    const updated = await ManufacturingStageTemplateService.updateTemplate(companyA, tmpl.id, {
      ratePerPiece: 20.0,
      standardMinutes: 50,
      instructions: 'مراجعة نظافة الغرزة',
    });

    assert.strictEqual(updated.ratePerPiece, 20.0);
    assert.strictEqual(updated.standardMinutes, 50);
    assert.strictEqual(updated.instructions, 'مراجعة نظافة الغرزة');

    // Archive template
    await ManufacturingStageTemplateService.archiveTemplate(companyA, tmpl.id);
    const archived = await ManufacturingStageTemplateService.getTemplateById(companyA, tmpl.id);
    assert.strictEqual(archived.isActive, false);
  });

  test('3. Template Sets & Items management (add, reorder, remove)', async () => {
    const t1 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T1',
      name: 'قص',
      sequence: 1,
    });
    const t2 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T2',
      name: 'خياطة',
      sequence: 2,
    });
    const t3 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T3',
      name: 'تشطيب وتعبئة',
      sequence: 3,
    });

    // Create set with initial items
    const set = await ManufacturingStageTemplateService.createSet(companyA, {
      code: 'SET-HOODIE',
      name: 'مسار هودي كاجوال',
      description: 'المسار القياسي لتصنيع الهودي',
      itemTemplateIds: [t1.id, t2.id],
    });

    assert.strictEqual(set.code, 'SET-HOODIE');
    assert.strictEqual(set.items.length, 2);
    assert.strictEqual(set.items[0].sequence, 1);
    assert.strictEqual(set.items[1].sequence, 2);

    // Add 3rd item
    const withItem3 = await ManufacturingStageTemplateService.addSetItem(companyA, set.id, {
      templateId: t3.id,
    });
    assert.strictEqual(withItem3.items.length, 3);
    assert.strictEqual(withItem3.items[2].sequence, 3);

    // Reorder items: [t3, t1, t2]
    const itemIds = [withItem3.items[2].id, withItem3.items[0].id, withItem3.items[1].id];
    const reordered = await ManufacturingStageTemplateService.reorderSetItems(companyA, set.id, itemIds);
    assert.strictEqual(reordered.items[0].templateId, t3.id);
    assert.strictEqual(reordered.items[0].sequence, 1);
    assert.strictEqual(reordered.items[1].templateId, t1.id);
    assert.strictEqual(reordered.items[1].sequence, 2);

    // Remove item
    const afterDelete = await ManufacturingStageTemplateService.removeSetItem(
      companyA,
      set.id,
      reordered.items[1].id
    );
    assert.strictEqual(afterDelete.items.length, 2);
    assert.strictEqual(afterDelete.items[0].sequence, 1);
    assert.strictEqual(afterDelete.items[1].sequence, 2);
  });

  test('4. Mandatory E2E Snapshot Scenario: 3 templates -> Set -> Order -> Verify Snapshot & Rate Change Law', async () => {
    // A) Create 3 templates
    const tCutting = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T-CUT',
      name: 'قص',
      stageType: 'CUTTING',
      ratePerPiece: 4.0,
      standardMinutes: 15.0,
      executionEntity: 'INTERNAL',
    });

    const tSewing = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T-SEW',
      name: 'خياطة',
      stageType: 'SEWING',
      ratePerPiece: 18.0,
      standardMinutes: 45.0,
      executionEntity: 'INTERNAL',
    });

    const tFinishing = await ManufacturingStageTemplateService.createTemplate(companyA, {
      code: 'T-FIN',
      name: 'تشطيب شامل',
      stageType: 'FINISHING',
      ratePerPiece: 10.0,
      standardMinutes: 20.0,
      executionEntity: 'EXTERNAL',
      instructions: 'فحص الخيوط والكي والتغليف النهائي',
    });

    // B) Create Set "مسار هودي"
    const hoodieSet = await ManufacturingStageTemplateService.createSet(companyA, {
      code: 'SET-HOODIE-STD',
      name: 'مسار هودي',
      itemTemplateIds: [tCutting.id, tSewing.id, tFinishing.id],
    });

    // C) Create fresh Production Order 1
    const order1 = await currentPrisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'WO-2026-001',
        bomId: 'bom_hoodie_1',
        plannedQuantity: 100,
        status: 'PLANNED',
      },
    });

    // D) Apply set to Order 1
    const res1 = await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, order1.id, {
      setId: hoodieSet.id,
      mode: 'APPEND',
    });

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.count, 3);

    // Verify stages created on Order 1
    const order1Stages = await currentPrisma.productionStage.findMany({
      where: { orderId: order1.id },
      orderBy: { sequence: 'asc' },
    });

    assert.strictEqual(order1Stages.length, 3);
    assert.strictEqual(order1Stages[0].name, 'قص');
    assert.strictEqual(order1Stages[0].ratePerPiece, 4.0);
    assert.strictEqual(order1Stages[0].standardMinutes, 15.0);
    assert.strictEqual(order1Stages[0].executionEntity, 'INTERNAL');

    assert.strictEqual(order1Stages[1].name, 'خياطة');
    assert.strictEqual(order1Stages[1].ratePerPiece, 18.0);
    assert.strictEqual(order1Stages[1].standardMinutes, 45.0);

    assert.strictEqual(order1Stages[2].name, 'تشطيب شامل');
    assert.strictEqual(order1Stages[2].ratePerPiece, 10.0);
    assert.strictEqual(order1Stages[2].executionEntity, 'EXTERNAL');
    assert.strictEqual(order1Stages[2].notes, 'فحص الخيوط والكي والتغليف النهائي');

    // E) Verify usage count incremented
    const setAfterUse = await ManufacturingStageTemplateService.getSetById(companyA, hoodieSet.id);
    assert.strictEqual(setAfterUse.usageCount, 1);
    assert.ok(setAfterUse.lastUsedAt !== null);

    const sewingTmplAfterUse = await ManufacturingStageTemplateService.getTemplateById(companyA, tSewing.id);
    assert.strictEqual(sewingTmplAfterUse.usageCount, 1);

    // F) CRITICAL SNAPSHOT TEST: Update template rate to 20
    await ManufacturingStageTemplateService.updateTemplate(companyA, tSewing.id, {
      ratePerPiece: 20.0,
    });

    // Old order 1 MUST NOT CHANGE! (Snapshot Law)
    const order1StagesAfterUpdate = await currentPrisma.productionStage.findMany({
      where: { orderId: order1.id },
      orderBy: { sequence: 'asc' },
    });
    assert.strictEqual(order1StagesAfterUpdate[1].ratePerPiece, 18.0, 'Old order rate must stay 18.0 (snapshot)!');

    // G) Create fresh Order 2 and apply set -> New order MUST get updated rate 20.0!
    const order2 = await currentPrisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'WO-2026-002',
        bomId: 'bom_hoodie_1',
        plannedQuantity: 200,
        status: 'PLANNED',
      },
    });

    const res2 = await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, order2.id, {
      setId: hoodieSet.id,
      mode: 'APPEND',
    });
    assert.strictEqual(res2.count, 3);

    const order2Stages = await currentPrisma.productionStage.findMany({
      where: { orderId: order2.id },
      orderBy: { sequence: 'asc' },
    });
    assert.strictEqual(order2Stages[1].ratePerPiece, 20.0, 'New order must receive updated rate 20.0!');
  });

  test('5. Rejection Validations: Empty set, Inactive set, REPLACE_IF_EMPTY with stages, COMPLETED order', async () => {
    // A) Empty Set
    const emptySet = await ManufacturingStageTemplateService.createSet(companyA, {
      name: 'مجموعة فارغة',
    });

    const activeOrder = await currentPrisma.productionOrder.create({
      data: { companyId: companyA, orderNumber: 'WO-ACT', bomId: 'bom1', plannedQuantity: 50, status: 'PLANNED' },
    });

    await assert.rejects(
      async () => {
        await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, activeOrder.id, {
          setId: emptySet.id,
        });
      },
      (err) => err.status === 400 && err.message.includes('فارغة')
    );

    // B) Inactive Set
    const tmpl = await ManufacturingStageTemplateService.createTemplate(companyA, { name: 'قص', ratePerPiece: 3 });
    const inactiveSet = await ManufacturingStageTemplateService.createSet(companyA, {
      name: 'مجموعة معطلة',
      isActive: false,
      itemTemplateIds: [tmpl.id],
    });

    await assert.rejects(
      async () => {
        await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, activeOrder.id, {
          setId: inactiveSet.id,
        });
      },
      (err) => err.status === 400 && err.message.includes('معطلة')
    );

    // C) Order with existing stages + REPLACE_IF_EMPTY mode
    const validSet = await ManufacturingStageTemplateService.createSet(companyA, {
      name: 'مجموعة صالحة',
      itemTemplateIds: [tmpl.id],
    });

    // Add a stage to order
    await currentPrisma.productionStage.create({
      data: { orderId: activeOrder.id, name: 'مرحلة قديمة', sequence: 1 },
    });

    await assert.rejects(
      async () => {
        await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, activeOrder.id, {
          setId: validSet.id,
          mode: 'REPLACE_IF_EMPTY',
        });
      },
      (err) => err.status === 400 && err.message.includes('يحتوي بالفعل على مراحل')
    );

    // D) COMPLETED Order
    const completedOrder = await currentPrisma.productionOrder.create({
      data: { companyId: companyA, orderNumber: 'WO-DONE', bomId: 'bom1', plannedQuantity: 50, status: 'COMPLETED' },
    });

    await assert.rejects(
      async () => {
        await ManufacturingStageTemplateService.applyStageSetToOrder(companyA, completedOrder.id, {
          setId: validSet.id,
        });
      },
      (err) => err.status === 400 && err.message.includes('مكتمل أو ملغي')
    );
  });

  test('6. Apply to Bill of Materials (BOM) with APPEND and REPLACE_ALL modes', async () => {
    const t1 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      name: 'قص أقمشة',
      stageType: 'CUTTING',
      ratePerPiece: 5.0,
      standardMinutes: 12.0,
    });
    const t2 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      name: 'حياكة تيشرت',
      stageType: 'SEWING',
      ratePerPiece: 12.0,
      standardMinutes: 30.0,
    });

    const set = await ManufacturingStageTemplateService.createSet(companyA, {
      name: 'مسار تيشرت',
      itemTemplateIds: [t1.id, t2.id],
    });

    const bom = await currentPrisma.billOfMaterials.create({
      data: {
        companyId: companyA,
        code: 'BOM-TSHIRT',
        name: 'تيشرت بولو',
      },
    });

    // 1) Apply to BOM
    const bomRes = await ManufacturingStageTemplateService.applyStageSetToBom(companyA, bom.id, {
      setId: set.id,
      mode: 'APPEND',
    });

    assert.strictEqual(bomRes.success, true);
    assert.strictEqual(bomRes.count, 2);

    const bomStages = await currentPrisma.bomStandardStage.findMany({
      where: { bomId: bom.id },
      orderBy: { sequence: 'asc' },
    });
    assert.strictEqual(bomStages.length, 2);
    assert.strictEqual(bomStages[0].name, 'قص أقمشة');
    assert.strictEqual(bomStages[1].name, 'حياكة تيشرت');

    // 2) Replace All mode
    const t3 = await ManufacturingStageTemplateService.createTemplate(companyA, {
      name: 'فحص وجودة QC',
      stageType: 'QC',
      ratePerPiece: 3.0,
      standardMinutes: 5.0,
    });
    const setQc = await ManufacturingStageTemplateService.createSet(companyA, {
      name: 'مسار فحص',
      itemTemplateIds: [t3.id],
    });

    await ManufacturingStageTemplateService.applyStageSetToBom(companyA, bom.id, {
      setId: setQc.id,
      mode: 'REPLACE_ALL',
    });

    const replacedStages = await currentPrisma.bomStandardStage.findMany({
      where: { bomId: bom.id },
    });
    assert.strictEqual(replacedStages.length, 1);
    assert.strictEqual(replacedStages[0].name, 'فحص وجودة QC');
  });
});
