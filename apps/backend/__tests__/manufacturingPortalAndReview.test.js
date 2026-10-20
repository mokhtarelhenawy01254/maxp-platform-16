/**
 * Wave 3: Factory Portal & Media Review System Test Suite
 *
 * Verifies:
 * 1. Token generation, rotation, toggle enable/disable, revocation.
 * 2. Unauthenticated portal access via token & 403 on disabled/revoked tokens.
 * 3. Security Audit: Whitelist sanitization of assignments payload (0 customer sale price, 0 HUINZO profit, 0 internal unit costs).
 * 4. Cross-tenant & cross-factory isolation (Token A cannot access Factory B).
 * 5. Sequential factory lifecycle actions (confirm receipt -> start -> update -> upload media -> request approval -> report issue).
 * 6. Media Review System: list, reject with mandatory reason, approve, publish to customer, hide.
 * 7. Non-admin visibility: unapproved/unpublished media is strictly hidden from non-admin endpoints.
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

const FactoryPortalService = require('../services/factoryPortalService');
const ManufacturingSubcontractService = require('../services/manufacturingSubcontractService');

// In-Memory Database Store for Wave 3 Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    partnerFactories: [],
    productionOrders: [],
    productionStages: [],
    manufacturingAttachments: [],
    materialIssues: [],
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

      // Hydrate relations
      results = results.map((item) => {
        const copy = { ...item };
        if (include?.order && item.orderId) {
          const ord = state.productionOrders.find((o) => o.id === item.orderId);
          if (ord) {
            copy.order = { ...ord };
            if (include.order.include?.materialIssues) {
              copy.order.materialIssues = state.materialIssues
                .filter((mi) => mi.orderId === ord.id)
                .map((mi) => ({ ...mi, items: mi.items || [] }));
            }
            if (include.order.include?.attachments) {
              copy.order.attachments = state.manufacturingAttachments.filter(
                (att) => att.orderId === ord.id
              );
            }
          }
        }
        if (include?.attachments) {
          copy.attachments = state.manufacturingAttachments.filter(
            (att) => att.stageId === item.id
          );
        }
        if (include?.partnerFactory && item.partnerFactoryId) {
          copy.partnerFactory = state.partnerFactories.find(
            (f) => f.id === item.partnerFactoryId
          );
        }
        if (include?.stage && item.stageId) {
          copy.stage = state.productionStages.find((s) => s.id === item.stageId);
        }
        return copy;
      });

      return results;
    },

    findFirst: async ({ where = {}, include } = {}) => {
      const all = await createTableHandlers(tableName, stateArray, idPrefix).findMany({
        where,
        include,
      });
      return all.length > 0 ? all[0] : null;
    },

    findUnique: async ({ where = {}, include } = {}) => {
      return createTableHandlers(tableName, stateArray, idPrefix).findFirst({
        where,
        include,
      });
    },

    create: async ({ data, include } = {}) => {
      const record = {
        id: data.id || generateId(idPrefix),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stateArray.push(record);

      const copy = { ...record };
      if (include?.stage && record.stageId) {
        copy.stage = state.productionStages.find((s) => s.id === record.stageId);
      }
      if (include?.partnerFactory && record.partnerFactoryId) {
        copy.partnerFactory = state.partnerFactories.find(
          (f) => f.id === record.partnerFactoryId
        );
      }
      return copy;
    },

    update: async ({ where, data } = {}) => {
      const idx = stateArray.findIndex((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx === -1) throw new Error(`${tableName} record not found for update`);

      stateArray[idx] = {
        ...stateArray[idx],
        ...data,
        updatedAt: new Date(),
      };
      return stateArray[idx];
    },

    delete: async ({ where } = {}) => {
      const idx = stateArray.findIndex((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx === -1) throw new Error(`${tableName} record not found for delete`);
      const deleted = stateArray.splice(idx, 1)[0];
      return deleted;
    },

    count: async ({ where = {} } = {}) => {
      const all = await createTableHandlers(tableName, stateArray, idPrefix).findMany({
        where,
      });
      return all.length;
    },
  });

  return {
    state,
    partnerFactory: createTableHandlers('partner_factories', state.partnerFactories, 'fact'),
    productionOrder: createTableHandlers('production_orders', state.productionOrders, 'mo'),
    productionStage: createTableHandlers('production_stages', state.productionStages, 'stg'),
    manufacturingAttachment: createTableHandlers(
      'manufacturing_attachments',
      state.manufacturingAttachments,
      'att'
    ),
    materialIssue: createTableHandlers('material_issues', state.materialIssues, 'mi'),
    $executeRawUnsafe: async () => {},
  };
};

describe('Manufacturing Factory Portal & Media Review Suite (Wave 3)', () => {
  const companyA = 'comp_huinzo_sports';
  const companyB = 'comp_other_merchant';

  let mockPrisma;

  beforeEach(() => {
    mockPrisma = createInMemoryStore();
    currentPrisma = mockPrisma;
    global.__testPrisma = mockPrisma;
  });

  afterEach(() => {
    currentPrisma = null;
    global.__testPrisma = null;
  });

  test('1. Portal Link Lifecycle: Generate, Toggle, Rotate & Revoke', async () => {
    const factory = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'مصنع الأمل للتريكو والتطريز',
        code: 'FAC-AMAL',
        isActive: true,
      },
    });

    // 1. Generate Link
    const genResult = await FactoryPortalService.generatePortalLink(companyA, factory.id);
    expect(genResult.success).toBe(true);
    expect(genResult.portalEnabled).toBe(true);
    expect(genResult.accessToken).toBeTruthy();
    expect(genResult.portalUrl).toContain(genResult.accessToken);

    // Verify in DB
    const refreshed = await mockPrisma.partnerFactory.findFirst({ where: { id: factory.id } });
    expect(refreshed.accessToken).toBe(genResult.accessToken);
    expect(refreshed.portalEnabled).toBe(true);

    // 2. Toggle Disable
    const toggleOff = await FactoryPortalService.togglePortalLink(companyA, factory.id, {
      portalEnabled: false,
    });
    expect(toggleOff.portalEnabled).toBe(false);

    // Attempting access when disabled must throw 403
    await expect(FactoryPortalService.verifyToken(genResult.accessToken)).rejects.toThrow(
      'تم تعطيل أو إيقاف بوابة هذا المصنع الشريك حالياً'
    );

    // 3. Toggle Re-Enable
    const toggleOn = await FactoryPortalService.togglePortalLink(companyA, factory.id, {
      portalEnabled: true,
    });
    expect(toggleOn.portalEnabled).toBe(true);

    const verified = await FactoryPortalService.verifyToken(genResult.accessToken);
    expect(verified.id).toBe(factory.id);
    expect(verified.portalLastAccessAt).toBeDefined();

    // 4. Revoke Link
    const revokeResult = await FactoryPortalService.revokePortalLink(companyA, factory.id);
    expect(revokeResult.portalEnabled).toBe(false);

    await expect(FactoryPortalService.verifyToken(genResult.accessToken)).rejects.toThrow(
      'رابط البوابة غير صالح أو انتهت صلاحيته'
    );
  });

  test('2. Token Authentication & 403 Security Guards', async () => {
    // Missing / Empty Token
    await expect(FactoryPortalService.verifyToken('')).rejects.toThrow(
      'رمز الدخول لبوابة المصنع مطلوب'
    );
    await expect(FactoryPortalService.verifyToken(null)).rejects.toThrow(
      'رمز الدخول لبوابة المصنع مطلوب'
    );

    // Non-existent Token
    await expect(FactoryPortalService.verifyToken('invalid_token_12345')).rejects.toThrow(
      'رابط البوابة غير صالح أو انتهت صلاحيته'
    );

    // Soft-deleted / Inactive Factory
    const inactiveFactory = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'مصنع متوقف',
        accessToken: 'token_inactive_123',
        portalEnabled: true,
        isActive: false,
      },
    });

    await expect(FactoryPortalService.verifyToken(inactiveFactory.accessToken)).rejects.toThrow(
      'تم تعطيل أو إيقاف بوابة هذا المصنع الشريك حالياً'
    );
  });

  test('3. Mandatory Security Rule: Whitelist Sanitization & Zero Sensitive Leak', async () => {
    const factory = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'ورشة النور للقص والخياطة',
        accessToken: 'token_alnoor_safe',
        portalEnabled: true,
        isActive: true,
      },
    });

    // Create an order with sensitive financial fields (customer sale price, profit, cost analysis)
    const sensitiveOrder = await mockPrisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00006',
        brandName: 'HUINZO Premium Athletic',
        plannedQuantity: 400,
        unit: 'قطعة',
        // SENSITIVE DATA:
        salePricePerUnit: 450,
        actualMaterialCost: 18000,
        actualLaborCost: 6000,
        actualOverheadCost: 2000,
        totalCost: 26000,
        variantMatrix: [
          { size: 'L', color: 'Black', plannedQuantity: 200 },
          { size: 'XL', color: 'Black', plannedQuantity: 200 },
        ],
      },
    });

    // Delivered materials with sensitive internal supplier unit cost
    mockPrisma.state.materialIssues.push({
      id: 'mi_issue_1',
      orderId: sensitiveOrder.id,
      status: 'ISSUED',
      items: [
        {
          rawMaterialName: 'قماش ميلتون قطن 100%',
          quantity: 240,
          unit: 'KG',
          unitCost: 150, // SENSITIVE
          totalCost: 36000, // SENSITIVE
        },
      ],
    });

    // Create EXTERNAL stage assigned to this factory
    await mockPrisma.productionStage.create({
      data: {
        orderId: sensitiveOrder.id,
        name: 'خياطة وتجميع هودي رياضي',
        stageType: 'SEWING',
        sequence: 2,
        status: 'PENDING',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factory.id,
        ratePerPiece: 15, // Factory agreed rate
        stageLaborCost: 6000,
        sentToFactoryAt: new Date('2026-10-19T10:00:00Z'),
      },
    });

    // 1. Fetch public context
    const context = await FactoryPortalService.getContext(factory);
    expect(context.name).toBe('ورشة النور للقص والخياطة');
    expect(context.portalEnabled).toBe(true);

    // Context field audit
    expect(context.salePricePerUnit).toBeUndefined();
    expect(context.totalCost).toBeUndefined();

    // 2. Fetch assignments
    const assignments = await FactoryPortalService.getAssignments(factory);
    expect(assignments).toHaveLength(1);

    const asg = assignments[0];
    expect(asg.name).toBe('خياطة وتجميع هودي رياضي');
    expect(asg.order.orderNumber).toBe('MO-2026-00006');
    expect(asg.order.plannedQuantity).toBe(400);

    // Verify factory agreement cost IS returned
    expect(asg.agreement.ratePerPiece).toBe(15);
    expect(asg.agreement.partnerAgreedCost).toBe(6000);

    // Verify delivered materials ARE returned with quantities, but NO unitCost or totalCost
    expect(asg.deliveredMaterials).toHaveLength(1);
    expect(asg.deliveredMaterials[0].rawMaterialName).toBe('قماش ميلتون قطن 100%');
    expect(asg.deliveredMaterials[0].quantity).toBe(240);
    expect(asg.deliveredMaterials[0].unit).toBe('KG');
    expect(asg.deliveredMaterials[0].unitCost).toBeUndefined();
    expect(asg.deliveredMaterials[0].totalCost).toBeUndefined();

    // DEEP RECURSIVE FIELD AUDIT: Verify ZERO prohibited fields anywhere in response
    const bannedKeys = [
      'salePricePerUnit',
      'unitPrice',
      'totalPrice',
      'customerOrderPayment',
      'customerOrder',
      'payments',
      'profit',
      'margin',
      'actualMaterialCost',
      'actualLaborCost',
      'actualOverheadCost',
      'totalCost',
      'unitCost',
      'overheadCostPerUnit',
      'laborCostPerUnit',
    ];

    const deepKeysScan = (obj) => {
      const keys = [];
      const traverse = (o) => {
        if (!o || typeof o !== 'object') return;
        for (const [k, v] of Object.entries(o)) {
          keys.push(k);
          if (v && typeof v === 'object') traverse(v);
        }
      };
      traverse(obj);
      return keys;
    };

    const allKeys = deepKeysScan(assignments);
    for (const banned of bannedKeys) {
      expect(allKeys).not.toContain(banned);
    }
  });

  test('4. Cross-Tenant & Cross-Factory Isolation: Token A Cannot Access Factory B Data', async () => {
    const factoryA = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'مصنع A',
        accessToken: 'token_factory_A',
        portalEnabled: true,
        isActive: true,
      },
    });

    const factoryB = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyB,
        name: 'مصنع B',
        accessToken: 'token_factory_B',
        portalEnabled: true,
        isActive: true,
      },
    });

    const stageB = await mockPrisma.productionStage.create({
      data: {
        orderId: 'mo_b_1',
        name: 'تطريز خاص بمصنع B',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factoryB.id,
      },
    });

    // Factory A tries to view assignments -> must NOT include stageB
    const assignmentsA = await FactoryPortalService.getAssignments(factoryA);
    expect(assignmentsA.find((a) => a.id === stageB.id)).toBeUndefined();

    // Factory A tries to confirm receipt, start, or update on stageB -> 404 forbidden
    await expect(FactoryPortalService.confirmReceipt(factoryA, stageB.id)).rejects.toThrow(
      'مرحلة التشغيل غير موجودة أو ليست مسندة لهذا المصنع'
    );
    await expect(FactoryPortalService.startStage(factoryA, stageB.id)).rejects.toThrow(
      'مرحلة التشغيل غير موجودة أو ليست مسندة لهذا المصنع'
    );
    await expect(FactoryPortalService.updateStage(factoryA, stageB.id, { completedQuantity: 50 })).rejects.toThrow(
      'مرحلة التشغيل غير موجودة أو ليست مسندة لهذا المصنع'
    );
  });

  test('5. Sequential Factory Portal Lifecycle with Media Upload & Issue Reporting', async () => {
    const factory = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'مصنع الفرسان للتشغيل',
        accessToken: 'token_forsan',
        portalEnabled: true,
        isActive: true,
      },
    });

    const order = await mockPrisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00007',
        plannedQuantity: 600,
      },
    });

    const stage = await mockPrisma.productionStage.create({
      data: {
        orderId: order.id,
        name: 'خياطة CMT',
        executionEntity: 'EXTERNAL',
        partnerFactoryId: factory.id,
        ratePerPiece: 20,
        status: 'PENDING',
        sentToFactoryAt: null, // NOT SENT YET!
      },
    });

    // 1. Confirm receipt before SENT -> must be rejected
    await expect(FactoryPortalService.confirmReceipt(factory, stage.id)).rejects.toThrow(
      'لا يمكن تأكيد الاستلام قبل إرسال أمر التشغيل من إدارة المصنع أولاً (SENT)'
    );

    // Management sends stage
    await mockPrisma.productionStage.update({
      where: { id: stage.id },
      data: { sentToFactoryAt: new Date() },
    });

    // 2. Start before confirm receipt -> must be rejected
    await expect(FactoryPortalService.startStage(factory, stage.id)).rejects.toThrow(
      'يجب تأكيد استلام الخامات أولاً قبل بدء مرحلة التشغيل (ACK_RECEIPT)'
    );

    // 3. Confirm Receipt
    const ackRes = await FactoryPortalService.confirmReceipt(factory, stage.id, {
      notes: 'تم فحص أثواب القماش واستلامها بالكامل',
    });
    expect(ackRes.success).toBe(true);
    expect(ackRes.factoryAckReceiptAt).toBeDefined();

    // 4. Start Stage Execution
    const startRes = await FactoryPortalService.startStage(factory, stage.id, {
      notes: 'بدء القص والخياطة على 4 خطوط إنتاج',
    });
    expect(startRes.success).toBe(true);
    expect(startRes.status).toBe('IN_PROGRESS');

    // 5. Update Executed Quantities
    const updateRes = await FactoryPortalService.updateStage(factory, stage.id, {
      completedQuantity: 200,
      scrapQuantity: 5,
      reworkQuantity: 2,
      notes: 'تم إنهاء الدفعة الأولى بنجاح',
    });
    expect(updateRes.completedQuantity).toBe(200);
    expect(updateRes.stageLaborCost).toBe(4000); // 200 * 20

    // 6. Upload Media (automatically UNDER_REVIEW)
    const mediaRes = await FactoryPortalService.uploadMedia(factory, stage.id, {
      url: '/uploads/manufacturing/sample-sewing-stitch.jpg',
      kind: 'IMAGE',
      caption: 'عينة جودة الخياطة المزدوجة على السحّاب',
    });
    expect(mediaRes.success).toBe(true);
    expect(mediaRes.attachment.reviewStatus).toBe('UNDER_REVIEW');
    expect(mediaRes.attachment.id).toBeDefined();

    // 7. Request Approval
    const reqRes = await FactoryPortalService.requestApproval(factory, stage.id, {
      notes: 'نرجو من الإدارة اعتماد العينة لنستمر في كامل الكمية',
    });
    expect(reqRes.success).toBe(true);

    // 8. Report Issue
    const issueRes = await FactoryPortalService.reportIssue(factory, stage.id, {
      issue: 'تأخر توريد خيط التطريز الأبيض',
    });
    expect(issueRes.success).toBe(true);
  });

  test('6. Management Media Review Lifecycle: Reject (Mandatory Reason), Approve, Publish, Hide', async () => {
    const adminUser = { id: 'usr_admin_1', name: 'مختار المدير', role: 'SUPER_ADMIN' };

    const factory = await mockPrisma.partnerFactory.create({
      data: {
        companyId: companyA,
        name: 'مصنع الأقمشة الماسية',
        accessToken: 'token_diamond',
        portalEnabled: true,
      },
    });

    const attachment = await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId: companyA,
        partnerFactoryId: factory.id,
        url: '/uploads/manufacturing/pocket-sample.jpg',
        kind: 'IMAGE',
        caption: 'تشطيب الجيب الداخلي',
        reviewStatus: 'UNDER_REVIEW',
      },
    });

    // 1. List reviews & underReviewCount
    const initialReviews = await FactoryPortalService.listReviews(companyA);
    expect(initialReviews.underReviewCount).toBe(1);
    expect(initialReviews.attachments).toHaveLength(1);

    // 2. Reject without reason -> MUST FAIL with 400
    await expect(
      FactoryPortalService.rejectAttachment(companyA, attachment.id, adminUser, { reason: '' })
    ).rejects.toThrow('سبب رفض المرفق إلزامي');

    // 3. Reject with valid reason
    const rejectRes = await FactoryPortalService.rejectAttachment(
      companyA,
      attachment.id,
      adminUser,
      { reason: 'زاوية التصوير غير واضحة ويوجد اهتزاز في خيط السرفلة' }
    );
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.attachment.reviewStatus).toBe('REJECTED');
    expect(rejectRes.attachment.rejectReason).toBe(
      'زاوية التصوير غير واضحة ويوجد اهتزاز في خيط السرفلة'
    );
    expect(rejectRes.attachment.reviewedBy).toBe('مختار المدير');

    // 4. Approve
    const approveRes = await FactoryPortalService.approveAttachment(
      companyA,
      attachment.id,
      adminUser
    );
    expect(approveRes.success).toBe(true);
    expect(approveRes.attachment.reviewStatus).toBe('APPROVED');
    expect(approveRes.attachment.rejectReason).toBeNull();

    // 5. Publish to customer
    const publishRes = await FactoryPortalService.publishAttachment(
      companyA,
      attachment.id,
      adminUser
    );
    expect(publishRes.success).toBe(true);
    expect(publishRes.attachment.reviewStatus).toBe('PUBLISHED');
    expect(publishRes.attachment.publishedBy).toBe('مختار المدير');
    expect(publishRes.attachment.publishedAt).toBeDefined();

    // 6. Hide / Revoke publication
    const hideRes = await FactoryPortalService.hideAttachment(
      companyA,
      attachment.id,
      adminUser
    );
    expect(hideRes.success).toBe(true);
    expect(hideRes.attachment.reviewStatus).toBe('HIDDEN');
  });

  test('7. Non-Admin Visibility: Unapproved & Rejected Media Strictly Hidden from Public View', async () => {
    const order = await mockPrisma.productionOrder.create({
      data: {
        companyId: companyA,
        orderNumber: 'MO-2026-00008',
      },
    });

    // Create 3 attachments: one under review, one rejected, one published
    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId: companyA,
        orderId: order.id,
        url: '/img/under-review.jpg',
        reviewStatus: 'UNDER_REVIEW',
      },
    });

    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId: companyA,
        orderId: order.id,
        url: '/img/rejected.jpg',
        reviewStatus: 'REJECTED',
        rejectReason: 'مرفوض',
      },
    });

    await mockPrisma.manufacturingAttachment.create({
      data: {
        companyId: companyA,
        orderId: order.id,
        url: '/img/published.jpg',
        reviewStatus: 'PUBLISHED',
      },
    });

    // Non-admin query with publicOnly = true
    const publicAttachments = await ManufacturingSubcontractService.listOrderAttachments(
      companyA,
      order.id,
      { publicOnly: true }
    );

    // Only the published attachment may be returned!
    expect(publicAttachments).toHaveLength(1);
    expect(publicAttachments[0].url).toBe('/img/published.jpg');
    expect(publicAttachments[0].reviewStatus).toBe('PUBLISHED');
  });
});
