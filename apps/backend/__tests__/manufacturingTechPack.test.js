/**
 * Wave 4: Technical Product Specification (Tech Pack) & Multi-Source Size Charts Test Suite
 *
 * Verifies:
 * 1. TechPack CRUD, mandatory approval threshold (name + fabricSummary + >=1 file).
 * 2. Immutable approved versioning: modifying an APPROVED record automatically spawns a new DRAFT version.
 * 3. Multi-source Size Charts (Customer, Pattern, Factory) matrix generation and tolerance violation flags.
 * 4. Factory portal resolver: ONLY APPROVED records returned to portal; DRAFT is strictly hidden; 0 pricing fields.
 * 5. Cross-tenant isolation (companyId scoping).
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

const ManufacturingTechPackService = require('../services/manufacturingTechPackService');
const FactoryPortalService = require('../services/factoryPortalService');

// In-Memory Database Store for Wave 4 Tests
const createInMemoryStore = () => {
  let idCounter = 1;
  const generateId = (prefix = 'id') => `${prefix}_${idCounter++}`;

  const state = {
    techPacks: [],
    techPackFiles: [],
    sizeCharts: [],
    sizeChartRows: [],
    productionOrders: [],
    billOfMaterials: [],
  };

  const createTableHandlers = (tableName, stateArray, idPrefix) => ({
    findMany: async ({ where = {}, orderBy, include, select } = {}) => {
      let results = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (k === 'OR' && Array.isArray(v)) {
            const orMatch = v.some((cond) => {
              for (const [ck, cv] of Object.entries(cond)) {
                if (cv && cv.contains) {
                  const val = String(item[ck] || '').toLowerCase();
                  if (!val.includes(String(cv.contains).toLowerCase())) return false;
                } else if (item[ck] !== cv) {
                  return false;
                }
              }
              return true;
            });
            if (!orMatch) return false;
          } else if (v && typeof v === 'object' && v.contains) {
            const val = String(item[k] || '').toLowerCase();
            if (!val.includes(String(v.contains).toLowerCase())) return false;
          } else if (item[k] !== v) {
            return false;
          }
        }
        return true;
      });

      // Attach relations if requested
      return results.map((item) => {
        const copy = { ...item };
        if (include?.files) {
          copy.files = state.techPackFiles.filter((f) => f.techPackId === item.id);
        }
        if (include?.rows) {
          copy.rows = state.sizeChartRows.filter((r) => r.chartId === item.id);
        }
        if (include?.sizeCharts) {
          copy.sizeCharts = state.sizeCharts.filter((sc) => sc.techPackId === item.id);
        }
        if (include?.techPack) {
          copy.techPack = state.techPacks.find((tp) => tp.id === item.techPackId) || null;
        }
        if (select) {
          const selected = {};
          for (const k of Object.keys(select)) {
            selected[k] = copy[k];
          }
          return selected;
        }
        return copy;
      });
    },

    findFirst: async ({ where = {}, include } = {}) => {
      const items = await createTableHandlers(tableName, stateArray, idPrefix).findMany({
        where,
        include,
      });
      return items[0] || null;
    },

    create: async ({ data = {}, include } = {}) => {
      const id = data.id || generateId(idPrefix);
      const { files, rows, ...fields } = data;
      const record = {
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...fields,
      };
      stateArray.push(record);

      if (files?.create && Array.isArray(files.create)) {
        for (const f of files.create) {
          state.techPackFiles.push({
            id: generateId('file'),
            techPackId: id,
            uploadedAt: new Date(),
            ...f,
          });
        }
      }

      if (rows?.create && Array.isArray(rows.create)) {
        for (const r of rows.create) {
          state.sizeChartRows.push({
            id: generateId('row'),
            chartId: id,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...r,
          });
        }
      }

      const res = { ...record };
      if (include?.files) {
        res.files = state.techPackFiles.filter((f) => f.techPackId === id);
      }
      if (include?.rows) {
        res.rows = state.sizeChartRows.filter((r) => r.chartId === id);
      }
      return res;
    },

    update: async ({ where = {}, data = {}, include } = {}) => {
      const idx = stateArray.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found in ${tableName}`);
      stateArray[idx] = {
        ...stateArray[idx],
        ...data,
        updatedAt: new Date(),
      };
      const res = { ...stateArray[idx] };
      if (include?.files) {
        res.files = state.techPackFiles.filter((f) => f.techPackId === where.id);
      }
      if (include?.rows) {
        res.rows = state.sizeChartRows.filter((r) => r.chartId === where.id);
      }
      return res;
    },

    delete: async ({ where = {} } = {}) => {
      const idx = stateArray.findIndex((item) => item.id === where.id);
      if (idx === -1) throw new Error(`Record with id ${where.id} not found in ${tableName}`);
      const deleted = stateArray.splice(idx, 1)[0];
      return deleted;
    },

    deleteMany: async ({ where = {} } = {}) => {
      const initialLen = stateArray.length;
      const remaining = stateArray.filter((item) => {
        for (const [k, v] of Object.entries(where)) {
          if (item[k] === v) return false;
        }
        return true;
      });
      stateArray.length = 0;
      stateArray.push(...remaining);
      return { count: initialLen - remaining.length };
    },

    createMany: async ({ data = [] } = {}) => {
      for (const d of data) {
        stateArray.push({
          id: generateId(idPrefix),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...d,
        });
      }
      return { count: data.length };
    },

    count: async ({ where = {} } = {}) => {
      const items = await createTableHandlers(tableName, stateArray, idPrefix).findMany({ where });
      return items.length;
    },
  });

  return {
    state,
    techPack: createTableHandlers('techPack', state.techPacks, 'tp'),
    techPackFile: createTableHandlers('techPackFile', state.techPackFiles, 'tpf'),
    sizeChart: createTableHandlers('sizeChart', state.sizeCharts, 'sc'),
    sizeChartRow: createTableHandlers('sizeChartRow', state.sizeChartRows, 'scr'),
    productionOrder: createTableHandlers('productionOrder', state.productionOrders, 'po'),
    billOfMaterials: createTableHandlers('billOfMaterials', state.billOfMaterials, 'bom'),
    $executeRawUnsafe: async () => 1,
  };
};

describe('Wave 4: Tech Pack & Size Charts Engine', () => {
  const companyA = 'comp_huinzo_apparel';
  const companyB = 'comp_other_tenant';
  const adminUser = { id: 'usr_mokhtar', name: 'مختار المدير', role: 'COMPANY_ADMIN' };

  let mockPrisma;

  beforeEach(() => {
    mockPrisma = createInMemoryStore();
    currentPrisma = mockPrisma;
    global.__testPrisma = mockPrisma;
  });

  describe('(1) Tech Pack Lifecycle & Approval Threshold', () => {
    test('creates new Tech Pack in DRAFT status with default version 1', async () => {
      const tp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'سويت شيرت رجالي شتوي',
        brand: 'HUINZO',
        fabricSummary: 'ميلتون قطن 100% - وزن 320 GSM - عرض 185 سم',
      });

      expect(tp.id).toBeDefined();
      expect(tp.status).toBe('DRAFT');
      expect(tp.version).toBe(1);
      expect(tp.code).toMatch(/^TP-\d{4}-\d{5}$/);
      expect(tp.companyId).toBe(companyA);
    });

    test('rejects approval if required fields (name, fabricSummary, files) are missing', async () => {
      // Missing fabricSummary and files
      const incomplete = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'هودي أوفر سايز',
      });

      await expect(
        ManufacturingTechPackService.approveTechPack(companyA, adminUser, incomplete.id)
      ).rejects.toThrow('لا يمكن اعتماد ملف المنتج الفني بدون استيفاء الحد الأدنى المطلوب');

      // Add fabricSummary but still no files
      await ManufacturingTechPackService.updateTechPack(companyA, adminUser, incomplete.id, {
        fabricSummary: 'ميلتون مبطن 340 GSM',
      });

      await expect(
        ManufacturingTechPackService.approveTechPack(companyA, adminUser, incomplete.id)
      ).rejects.toThrow('ملف أو صورة فنية واحدة على الأقل');
    });

    test('approves Tech Pack once minimum requirements are met', async () => {
      const tp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'جاكيت جينز عصري',
        fabricSummary: 'دينم قطن 12 أونصة',
      });

      // Add technical file
      await ManufacturingTechPackService.addTechPackFile(companyA, adminUser, tp.id, {
        fileName: 'front_back_sketch.png',
        url: '/uploads/manufacturing/front_back_sketch.png',
        kind: 'IMAGE',
      });

      const approved = await ManufacturingTechPackService.approveTechPack(companyA, adminUser, tp.id);

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('مختار المدير');
      expect(approved.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('(2) Versioning Law: Immutable Approved Copies', () => {
    test('updating an APPROVED Tech Pack spawns a new DRAFT version and leaves original untouched', async () => {
      const tp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'قميص أكسفورد كاجوال',
        fabricSummary: 'قطن أكسفورد 140 GSM',
      });

      await ManufacturingTechPackService.addTechPackFile(companyA, adminUser, tp.id, {
        fileName: 'spec_sheet.pdf',
        url: '/uploads/manufacturing/spec_sheet.pdf',
        kind: 'PDF',
      });

      const approvedV1 = await ManufacturingTechPackService.approveTechPack(companyA, adminUser, tp.id);
      expect(approvedV1.version).toBe(1);
      expect(approvedV1.status).toBe('APPROVED');

      // Update approved Tech Pack
      const updateResult = await ManufacturingTechPackService.updateTechPack(companyA, adminUser, tp.id, {
        name: 'قميص أكسفورد كاجوال - ياقة معدلة',
        instructions: 'تعديل عرض الياقة لتصبح 4.5 سم بدلاً من 4 سم',
      });

      expect(updateResult.isNewVersion).toBe(true);
      expect(updateResult.techPack.version).toBe(2);
      expect(updateResult.techPack.status).toBe('DRAFT');
      expect(updateResult.techPack.supersedesId).toBe(approvedV1.id);
      expect(updateResult.techPack.code).toBe(approvedV1.code);

      // Verify original V1 remains strictly APPROVED and unchanged
      const checkV1 = await ManufacturingTechPackService.getTechPackById(companyA, approvedV1.id);
      expect(checkV1.status).toBe('APPROVED');
      expect(checkV1.version).toBe(1);
      expect(checkV1.name).toBe('قميص أكسفورد كاجوال');
    });

    test('explicit cloneVersion creates incremented draft version copying files', async () => {
      const tp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'بنطلون جبردين كارجو',
        fabricSummary: 'جبردين قطن ليكرا 280 GSM',
      });

      await ManufacturingTechPackService.addTechPackFile(companyA, adminUser, tp.id, {
        fileName: 'pocket_details.png',
        url: '/uploads/manufacturing/pocket_details.png',
        kind: 'IMAGE',
      });

      const cloned = await ManufacturingTechPackService.cloneVersion(companyA, adminUser, tp.id, {
        name: 'بنطلون جبردين كارجو - إصدار صيفي',
      });

      expect(cloned.version).toBe(2);
      expect(cloned.status).toBe('DRAFT');
      expect(cloned.supersedesId).toBe(tp.id);
      expect(cloned.files.length).toBe(1);
      expect(cloned.files[0].fileName).toBe('pocket_details.png');
    });

    test('getTechPackVersions returns complete sequential history', async () => {
      const tp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'تي شيرت بيسك قطن',
        fabricSummary: 'قطن سنجل جيرسي 180 GSM',
      });

      await ManufacturingTechPackService.cloneVersion(companyA, adminUser, tp.id);

      const versions = await ManufacturingTechPackService.getTechPackVersions(companyA, tp.id);
      expect(versions.length).toBe(2);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
    });
  });

  describe('(3) Size Charts & 3-Source Matrix (Customer vs Pattern vs Factory)', () => {
    test('creates and approves Size Chart with sizes and measurements', async () => {
      const sc = await ManufacturingTechPackService.createSizeChart(companyA, adminUser, {
        name: 'جدول مقاسات السويت شيرت الأساسي',
        unit: 'CM',
        measurementMethod: 'FLAT',
        rows: [
          { sizeLabel: 'M', measurementKey: 'CHEST', value: 56.0, tolerance: 1.0, source: 'CUSTOMER' },
          { sizeLabel: 'M', measurementKey: 'LENGTH', value: 72.0, tolerance: 1.5, source: 'CUSTOMER' },
        ],
      });

      expect(sc.status).toBe('DRAFT');
      expect(sc.rows.length).toBe(2);

      const approved = await ManufacturingTechPackService.approveSizeChart(companyA, adminUser, sc.id);
      expect(approved.status).toBe('APPROVED');
    });

    test('computes 3-source matrix and accurately flags tolerance violations', async () => {
      // S, M with 3 copies:
      // M Chest: Customer=56, Pattern=56.5 (diff=0.5 <= 1.0 OK), Factory=58.0 (diff=2.0 > 1.0 EXCEEDED!)
      const sc = await ManufacturingTechPackService.createSizeChart(companyA, adminUser, {
        name: 'مصفوفة مقاسات الهودي الشتوي',
        unit: 'CM',
        rows: [
          // Customer baseline
          { sizeLabel: 'M', measurementKey: 'CHEST', value: 56.0, tolerance: 1.0, source: 'CUSTOMER' },
          { sizeLabel: 'M', measurementKey: 'LENGTH', value: 72.0, tolerance: 1.0, source: 'CUSTOMER' },

          // Pattern specs
          { sizeLabel: 'M', measurementKey: 'CHEST', value: 56.5, tolerance: 1.0, source: 'PATTERN' },
          { sizeLabel: 'M', measurementKey: 'LENGTH', value: 72.2, tolerance: 1.0, source: 'PATTERN' },

          // Factory measured sample
          { sizeLabel: 'M', measurementKey: 'CHEST', value: 58.0, tolerance: 1.0, source: 'FACTORY' }, // +2.0 violation!
          { sizeLabel: 'M', measurementKey: 'LENGTH', value: 72.5, tolerance: 1.0, source: 'FACTORY' }, // +0.5 within tol
        ],
      });

      const matrixData = await ManufacturingTechPackService.getSizeChartMatrix(companyA, sc.id);

      expect(matrixData.totalCells).toBe(2); // M Chest & M Length
      expect(matrixData.hasExceededTolerance).toBe(true);
      expect(matrixData.exceededCount).toBe(1);

      const chestCell = matrixData.matrix.find((c) => c.measurementKey === 'CHEST');
      expect(chestCell.customerValue).toBe(56.0);
      expect(chestCell.patternValue).toBe(56.5);
      expect(chestCell.factoryValue).toBe(58.0);
      expect(chestCell.diffPatternVsCustomer).toBe(0.5);
      expect(chestCell.diffFactoryVsCustomer).toBe(2.0);
      expect(chestCell.isToleranceExceeded).toBe(true);
      expect(chestCell.exceededSources.length).toBeGreaterThan(0);

      const lengthCell = matrixData.matrix.find((c) => c.measurementKey === 'LENGTH');
      expect(lengthCell.diffFactoryVsCustomer).toBe(0.5);
      expect(lengthCell.isToleranceExceeded).toBe(false);
    });
  });

  describe('(4) Factory Portal Whitelist & Sensitive Data Immunity', () => {
    test('resolves ONLY APPROVED TechPack & SizeChart for factory portal assignments', async () => {
      // 1. Create a Draft TechPack and Approved TechPack
      const draftTp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'مسودة فنية سرية',
        fabricSummary: 'خامة تجريبية',
      });

      const approvedTp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'جاكيت معتمد للتشغيل',
        fabricSummary: 'قطن ووتربروف 220 GSM',
      });
      await ManufacturingTechPackService.addTechPackFile(companyA, adminUser, approvedTp.id, {
        fileName: 'sewing_guide.pdf',
        url: '/uploads/manufacturing/sewing_guide.pdf',
        kind: 'PDF',
      });
      await ManufacturingTechPackService.approveTechPack(companyA, adminUser, approvedTp.id);

      // 2. Production order linked to draft tech pack
      const draftOrder = {
        id: 'ord_draft',
        companyId: companyA,
        techPackId: draftTp.id,
      };

      const resolvedDraft = await ManufacturingTechPackService.getApprovedTechPackForOrder(companyA, draftOrder);
      expect(resolvedDraft).toBeNull(); // DRAFT IS NEVER EXPOSED

      // 3. Production order linked to approved tech pack
      const approvedOrder = {
        id: 'ord_approved',
        companyId: companyA,
        techPackId: approvedTp.id,
      };

      const resolvedApproved = await ManufacturingTechPackService.getApprovedTechPackForOrder(companyA, approvedOrder);
      expect(resolvedApproved).not.toBeNull();
      expect(resolvedApproved.id).toBe(approvedTp.id);
      expect(resolvedApproved.status).toBe('APPROVED');
      expect(resolvedApproved.files.length).toBe(1);

      // Run security audit on resolved Tech Pack to verify zero prohibited fields
      expect(() => {
        FactoryPortalService.auditSanitizedPayload(resolvedApproved, 'techPack');
      }).not.toThrow();
    });

    test('portal assignment strictly excludes customer sale prices and profit margins', async () => {
      const approvedTp = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'هودي تصدير معتمد',
        fabricSummary: 'ميلتون قطن 100%',
      });
      await ManufacturingTechPackService.addTechPackFile(companyA, adminUser, approvedTp.id, {
        fileName: 'print_placement.png',
        url: '/uploads/manufacturing/print_placement.png',
        kind: 'IMAGE',
      });
      await ManufacturingTechPackService.approveTechPack(companyA, adminUser, approvedTp.id);

      const approvedSc = await ManufacturingTechPackService.createSizeChart(companyA, adminUser, {
        name: 'مقاسات تصدير معتمدة',
        techPackId: approvedTp.id,
        rows: [{ sizeLabel: 'L', measurementKey: 'CHEST', value: 58.0, tolerance: 1.0 }],
      });
      await ManufacturingTechPackService.approveSizeChart(companyA, adminUser, approvedSc.id);

      const order = {
        id: 'ord_100',
        orderNumber: 'MO-2026-00001',
        techPackId: approvedTp.id,
        sizeChartId: approvedSc.id,
        plannedQuantity: 500,
        unit: 'قطعة',
      };

      const factory = { id: 'factory_1', companyId: companyA };

      const portalTp = await ManufacturingTechPackService.getApprovedTechPackForOrder(factory.companyId, order);
      const portalSc = await ManufacturingTechPackService.getApprovedSizeChartForOrder(
        factory.companyId,
        order,
        portalTp?.id
      );

      const assignmentPayload = {
        id: 'stage_1',
        orderNumber: order.orderNumber,
        techPack: portalTp,
        sizeChart: portalSc,
      };

      // Must strictly pass security whitelist audit with zero exceptions
      expect(() => {
        FactoryPortalService.auditSanitizedPayload(assignmentPayload, 'assignment');
      }).not.toThrow();

      // Deep inspection of keys: zero pricing or margin keys allowed
      const str = JSON.stringify(assignmentPayload);
      expect(str).not.toContain('salePrice');
      expect(str).not.toContain('salePricePerUnit');
      expect(str).not.toContain('profit');
      expect(str).not.toContain('margin');
      expect(str).not.toContain('unitCost');
      expect(str).not.toContain('totalCost');
    });

    test('strictly enforces tenant isolation: company A cannot access company B Tech Packs', async () => {
      const tpA = await ManufacturingTechPackService.createTechPack(companyA, adminUser, {
        name: 'موديل خاص بشركة هوانزو',
        fabricSummary: 'خامة قطنية',
      });

      // Company B attempts to read company A's tech pack
      await expect(
        ManufacturingTechPackService.getTechPackById(companyB, tpA.id)
      ).rejects.toThrow('ملف المنتج الفني غير موجود');
    });
  });
});
