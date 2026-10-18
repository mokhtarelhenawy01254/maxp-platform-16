/**
 * Unit & Integration Tests for Manufacturing Subcontracting & Attachments (Wave 2)
 *
 * Scenarios:
 * 1. PartnerFactory CRUD (name uniqueness per company, soft-delete toggle)
 * 2. Active Stage Protection (prevent partner factory deactivation when active stages exist)
 * 3. Stage Execution Assignment (INTERNAL <-> EXTERNAL, active factory validation, completed stage lock)
 * 4. Sequential Factory Events (SENT -> ACK_RECEIPT -> COMPLETED, strict transition guards)
 * 5. Manufacturing Attachments (create with auto-detected kind, list per order, role-based deletion)
 * 6. Subcontract Performance Metrics (on-time rate, cycle time, total labor cost)
 * 7. Multi-tenant isolation (zero cross-company leakage)
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

const ManufacturingSubcontractService = require('../services/manufacturingSubcontractService');

// In-Memory Database Store for Wave 2 Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    partnerFactories: [],
    productionOrders: [],
    productionStages: [],
    manufacturingAttachments: [],
  };

  const createTableHandlers = (tableName, stateArray, idPrefix) => ({
    findMany: async ({ where = {}, orderBy, include, select } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined) continue;
          if (k === 'OR' && Array.isArray(v)) {
            const matchesOr = v.some((orClause) => {
              for (const [orK, orV] of Object.entries(orClause)) {
                if (orV && typeof orV === 'object' && orV.contains) {
                  const val = String(item[orK] || '').toLowerCase();
                  if (val.includes(String(orV.contains).toLowerCase())) return true;
                } else if (item[orK] === orV) {
                  return true;
                }
              }
              return false;
            });
            if (!matchesOr) return false;
            continue;
          }
          if (k === 'NOT' && v && typeof v === 'object') {
            for (const [notK, notV] of Object.entries(v)) {
              if (item[notK] === notV) return false;
            }
            continue;
          }
          if (k === 'order' && typeof v === 'object' && tableName === 'production_stages') {
            const ord = state.productionOrders.find((o) => o.id === item.orderId);
            if (!ord) return false;
            for (const [ordK, ordV] of Object.entries(v)) {
              if (ordV && typeof ordV === 'object' && ordV.notIn) {
                if (ordV.notIn.includes(ord[ordK])) return false;
              } else if (ord[ordK] !== ordV) {
                return false;
              }
            }
            continue;
          }
          if (v && typeof v === 'object' && v.in) {
            if (!v.in.includes(item[k])) return false;
          } else if (v && typeof v === 'object' && v.notIn) {
            if (v.notIn.includes(item[k])) return false;
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

      return results.map((item) => {
        const copy = { ...item };
        if (include) {
          if (include.stages) {
            const filterFn = tableName === 'production_orders'
              ? (s) => s.orderId === item.id
              : (s) => s.partnerFactoryId === item.id;
            copy.stages = state.productionStages
              .filter(filterFn)
              .map((st) => {
                const stageCopy = { ...st };
                if (include.stages.include?.order) {
                  stageCopy.order = state.productionOrders.find((o) => o.id === st.orderId) || null;
                }
                if (include.stages.include?.attachments) {
                  stageCopy.attachments = state.manufacturingAttachments.filter((a) => a.stageId === st.id);
                }
                return stageCopy;
              });
          }
          if (include.partnerFactory) {
            copy.partnerFactory = state.partnerFactories.find((f) => f.id === item.partnerFactoryId) || null;
          }
          if (include.order) {
            copy.order = state.productionOrders.find((o) => o.id === item.orderId) || null;
          }
          if (include.stage) {
            copy.stage = state.productionStages.find((s) => s.id === item.stageId) || null;
          }
          if (include.attachments) {
            copy.attachments = state.manufacturingAttachments.filter((a) => a.stageId === item.id);
          }
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
      const items = await createTableHandlers(tableName, stateArray, idPrefix).findMany({
        where,
        orderBy,
        include,
        select,
      });
      return items[0] || null;
    },

    findUnique: async ({ where = {}, include, select } = {}) => {
      return createTableHandlers(tableName, stateArray, idPrefix).findFirst({
        where,
        include,
        select,
      });
    },

    create: async ({ data, include }) => {
      const item = {
        id: generateId(idPrefix),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stateArray.push(item);
      const copy = { ...item };
      if (include?.partnerFactory) {
        copy.partnerFactory = state.partnerFactories.find((f) => f.id === item.partnerFactoryId) || null;
      }
      if (include?.stage) {
        copy.stage = state.productionStages.find((s) => s.id === item.stageId) || null;
      }
      return copy;
    },

    update: async ({ where = {}, data, include }) => {
      const idx = stateArray.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found`);
      stateArray[idx] = { ...stateArray[idx], ...data, updatedAt: new Date() };
      const copy = { ...stateArray[idx] };
      if (include?.partnerFactory) {
        copy.partnerFactory = state.partnerFactories.find((f) => f.id === copy.partnerFactoryId) || null;
      }
      if (include?.stage) {
        copy.stage = state.productionStages.find((s) => s.id === copy.stageId) || null;
      }
      return copy;
    },

    delete: async ({ where = {} }) => {
      const idx = stateArray.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found`);
      const removed = stateArray.splice(idx, 1)[0];
      return removed;
    },
  });

  const prismaMock = {
    partnerFactory: createTableHandlers('partner_factories', state.partnerFactories, 'pf'),
    productionOrder: createTableHandlers('production_orders', state.productionOrders, 'po'),
    productionStage: createTableHandlers('production_stages', state.productionStages, 'ps'),
    manufacturingAttachment: createTableHandlers('manufacturing_attachments', state.manufacturingAttachments, 'att'),
    $executeRawUnsafe: async () => 1,
    _state: state,
  };

  return prismaMock;
};

describe('Manufacturing Subcontracting (Wave 2) Test Suite', () => {
  let db;
  const companyA = 'comp_alpha_1';
  const companyB = 'comp_beta_2';

  beforeEach(() => {
    db = createInMemoryStore();
    currentPrisma = db;
    global.__testPrisma = db;
  });

  test('1. PartnerFactory CRUD & Name Uniqueness', async () => {
    // 1. Create factory
    const factory1 = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'ورشة النور للتطريز',
      specialty: 'تطريز وطباعة',
      phone: '01012345678',
      contactPerson: 'عماد نور',
    });
    expect(factory1).toBeDefined();
    expect(factory1.id).toBeDefined();
    expect(factory1.name).toBe('ورشة النور للتطريز');
    expect(factory1.isActive).toBe(true);

    // 2. Reject duplicate name within same company
    let duplicateRejected = false;
    try {
      await ManufacturingSubcontractService.createPartnerFactory(companyA, {
        name: 'ورشة النور للتطريز',
      });
    } catch (err) {
      duplicateRejected = true;
      expect(err.message).toContain('مسجل بالفعل');
    }
    expect(duplicateRejected).toBe(true);

    // 3. Same name in different company is permitted
    const factoryCompanyB = await ManufacturingSubcontractService.createPartnerFactory(companyB, {
      name: 'ورشة النور للتطريز',
    });
    expect(factoryCompanyB.id).toBeDefined();
    expect(factoryCompanyB.companyId).toBe(companyB);

    // 4. Update factory
    const updated = await ManufacturingSubcontractService.updatePartnerFactory(companyA, factory1.id, {
      specialty: 'تطريز ديجيتال',
    });
    expect(updated.specialty).toBe('تطريز ديجيتال');
  });

  test('2. Soft Delete & Active Stage Protection', async () => {
    // Create factory
    const factory = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'مصنع الأهرام للخياطة',
    });

    // Create an active production order with external stage linked to this factory
    const order = await db.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00006',
        status: 'IN_PROGRESS',
        plannedQuantity: 500,
      },
    });

    const activeStage = await db.productionStage.create({
      data: {
        orderId: order.id,
        name: 'خياطة وتجميع',
        status: 'IN_PROGRESS',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factory.id,
      },
    });

    // Attempt to delete/deactivate factory while linked to active stage -> must throw 400
    let deactivationBlocked = false;
    try {
      await ManufacturingSubcontractService.deletePartnerFactory(companyA, factory.id);
    } catch (err) {
      deactivationBlocked = true;
      expect(err.message).toContain('مراحل تشغيل نشطة');
    }
    expect(deactivationBlocked).toBe(true);

    // Now complete the stage and order
    await db.productionStage.update({
      where: { id: activeStage.id },
      data: { status: 'COMPLETED' },
    });
    await db.productionOrder.update({
      where: { id: order.id },
      data: { status: 'COMPLETED' },
    });

    // Deactivation should now succeed
    const res = await ManufacturingSubcontractService.deletePartnerFactory(companyA, factory.id);
    expect(res.success).toBe(true);

    const checkFactory = await db.partnerFactory.findFirst({ where: { id: factory.id } });
    expect(checkFactory.isActive).toBe(false);
  });

  test('3. Stage Execution Assignment (INTERNAL <-> EXTERNAL)', async () => {
    const factory = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'مصبغة الأمل',
      isActive: true,
    });

    const order = await db.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00007',
        status: 'IN_PROGRESS',
        plannedQuantity: 1000,
      },
    });

    const stage = await db.productionStage.create({
      data: {
        orderId: order.id,
        name: 'صباغة ومعالجة',
        status: 'PENDING',
        executionEntity: 'INTERNAL',
      },
    });
    order.stages = [stage];

    // Assign to EXTERNAL without partnerFactoryId -> should fail
    let missingFactoryFailed = false;
    try {
      await ManufacturingSubcontractService.assignStageExecution(companyA, order.id, stage.id, {
        executionEntity: 'EXTERNAL',
      });
    } catch (err) {
      missingFactoryFailed = true;
      expect(err.message).toContain('يجب اختيار المصنع الشريك');
    }
    expect(missingFactoryFailed).toBe(true);

    // Assign to EXTERNAL with valid partnerFactoryId -> succeeds
    const assigned = await ManufacturingSubcontractService.assignStageExecution(companyA, order.id, stage.id, {
      executionEntity: 'EXTERNAL',
      partnerFactoryId: factory.id,
    });
    expect(assigned.executionEntity).toBe('EXTERNAL');
    expect(assigned.partnerFactoryId).toBe(factory.id);

    // Switch back to INTERNAL -> clears partnerFactoryId
    const reverted = await ManufacturingSubcontractService.assignStageExecution(companyA, order.id, stage.id, {
      executionEntity: 'INTERNAL',
    });
    expect(reverted.executionEntity).toBe('INTERNAL');
    expect(reverted.partnerFactoryId).toBeNull();
  });

  test('4. Sequential Factory Events (SENT -> ACK_RECEIPT -> COMPLETED)', async () => {
    const factory = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'ورشة الإتقان للتطريز',
    });

    const order = await db.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00008',
        status: 'IN_PROGRESS',
        plannedQuantity: 400,
      },
    });

    const stage = await db.productionStage.create({
      data: {
        orderId: order.id,
        name: 'تطريز الشعار',
        status: 'PENDING',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factory.id,
        ratePerPiece: 5.0,
      },
    });
    order.stages = [stage];

    // 1. Try ACK_RECEIPT before SENT -> Must be rejected
    let ackBeforeSentRejected = false;
    try {
      await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
        event: 'ACK_RECEIPT',
      });
    } catch (err) {
      ackBeforeSentRejected = true;
      expect(err.message).toContain('قبل تسجيل إرسال المرحلة للمصنع أولاً');
    }
    expect(ackBeforeSentRejected).toBe(true);

    // 2. Try COMPLETED before SENT/ACK -> Must be rejected
    let completedPrematureRejected = false;
    try {
      await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
        event: 'COMPLETED',
      });
    } catch (err) {
      completedPrematureRejected = true;
      expect(err.message).toContain('قبل إرسالها للمصنع');
    }
    expect(completedPrematureRejected).toBe(true);

    // 3. Record SENT -> valid, transitions stage to IN_PROGRESS
    const sentStage = await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
      event: 'SENT',
      notes: 'تم تسليم القطع لمندوب الورشة',
    });
    expect(sentStage.sentToFactoryAt).toBeDefined();
    expect(sentStage.status).toBe('IN_PROGRESS');
    expect(sentStage.factoryNotes).toContain('تم تسليم القطع');

    // Update order.stages with new state for subsequent steps
    Object.assign(stage, sentStage);

    // 4. Try COMPLETED before ACK_RECEIPT -> Must be rejected
    let completedBeforeAckRejected = false;
    try {
      await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
        event: 'COMPLETED',
      });
    } catch (err) {
      completedBeforeAckRejected = true;
      expect(err.message).toContain('قبل تأكيد استلام المصنع لها أولاً');
    }
    expect(completedBeforeAckRejected).toBe(true);

    // 5. Record ACK_RECEIPT -> valid
    const ackStage = await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
      event: 'ACK_RECEIPT',
      notes: 'أكدت الورشة استلام 400 قطعة سليمة',
    });
    expect(ackStage.factoryAckReceiptAt).toBeDefined();
    Object.assign(stage, ackStage);

    // 6. Record COMPLETED -> valid, stage marked COMPLETED and completedQty filled
    const completedStage = await ManufacturingSubcontractService.recordStageFactoryEvent(companyA, order.id, stage.id, {
      event: 'COMPLETED',
      notes: 'تم فحص العينات واستلام الشحنة كاملة',
    });
    expect(completedStage.factoryCompletedAt).toBeDefined();
    expect(completedStage.status).toBe('COMPLETED');
    expect(completedStage.completedQuantity).toBe(400);
    expect(completedStage.stageLaborCost).toBe(2000); // 400 * 5.0
  });

  test('5. Attachments CRUD, Kind Detection & Access Control', async () => {
    const order = await db.productionOrder.create({
      data: { companyId: companyA, orderNumber: 'MO-2026-00009', status: 'IN_PROGRESS' },
    });

    // 1. Create image attachment
    const imgAtt = await ManufacturingSubcontractService.createAttachment(
      companyA,
      {
        orderId: order.id,
        url: '/uploads/products/sample-sample-123.jpg',
        caption: 'عينة تطريز أولية',
      },
      'user_100'
    );
    expect(imgAtt.kind).toBe('IMAGE');
    expect(imgAtt.caption).toBe('عينة تطريز أولية');

    // 2. Create document attachment
    const docAtt = await ManufacturingSubcontractService.createAttachment(
      companyA,
      {
        orderId: order.id,
        url: '/uploads/services/tech-spec-sheet.pdf',
        caption: 'المواصفات الفنية المعتمدة',
      },
      'user_100'
    );
    expect(docAtt.kind).toBe('DOC');

    // 3. List attachments
    const list = await ManufacturingSubcontractService.listOrderAttachments(companyA, order.id);
    expect(list).toHaveLength(2);

    // 4. Unauthorized user cannot delete attachment
    let unauthorizedBlocked = false;
    try {
      await ManufacturingSubcontractService.deleteAttachment(
        companyA,
        imgAtt.id,
        { id: 'user_stranger', role: 'OPERATOR' }
      );
    } catch (err) {
      unauthorizedBlocked = true;
      expect(err.message).toContain('غير مصرح لك');
    }
    expect(unauthorizedBlocked).toBe(true);

    // 5. Original uploader or admin can delete
    const deleteRes = await ManufacturingSubcontractService.deleteAttachment(
      companyA,
      imgAtt.id,
      { id: 'user_100', role: 'OPERATOR' }
    );
    expect(deleteRes.success).toBe(true);

    const remaining = await ManufacturingSubcontractService.listOrderAttachments(companyA, order.id);
    expect(remaining).toHaveLength(1);
  });

  test('6. Subcontract Performance Metrics', async () => {
    const factory = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'مصنع الأمل للطباعة',
    });

    const dueDate = new Date(Date.now() + 5 * 86400000); // 5 days in future
    const order = await db.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00010',
        dueDate,
      },
    });

    const sentDate = new Date(Date.now() - 2 * 86400000); // 2 days ago
    const completedDate = new Date(); // now

    await db.productionStage.create({
      data: {
        orderId: order.id,
        name: 'طباعة حرارية',
        status: 'COMPLETED',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factory.id,
        sentToFactoryAt: sentDate,
        factoryAckReceiptAt: sentDate,
        factoryCompletedAt: completedDate,
        stageLaborCost: 3500,
      },
    });

    const performance = await ManufacturingSubcontractService.getPartnerFactoriesPerformance(companyA);
    expect(performance).toHaveLength(1);
    const p = performance[0];
    expect(p.name).toBe('مصنع الأمل للطباعة');
    expect(p.assignedStagesCount).toBe(1);
    expect(p.assignedOrdersCount).toBe(1);
    expect(p.completedStagesCount).toBe(1);
    expect(p.onTimeCount).toBe(1);
    expect(p.totalLaborCost).toBe(3500);
    expect(p.avgExecutionDays).toBeGreaterThanOrEqual(1.9);
  });

  test('7. Multi-tenant Isolation: Company B Cannot View or Access Company A Data', async () => {
    const factoryA = await ManufacturingSubcontractService.createPartnerFactory(companyA, {
      name: 'خاص بالشركة الأولى',
    });

    const listB = await ManufacturingSubcontractService.listPartnerFactories(companyB);
    expect(listB).toHaveLength(0);

    let crossCompanyAccessBlocked = false;
    try {
      await ManufacturingSubcontractService.getPartnerFactoryById(companyB, factoryA.id);
    } catch (err) {
      crossCompanyAccessBlocked = true;
      expect(err.message).toContain('غير موجود');
    }
    expect(crossCompanyAccessBlocked).toBe(true);
  });
});
