/**
 * Manufacturing Standard Production Stage Templates & Sets Service (Wave 6)
 *
 * Implements:
 * 1. ProductionStageTemplate CRUD + Archive:
 *    - Standalone master library of reusable production stages.
 *    - Unique code per company, standardMinutes, ratePerPiece, executionEntity, defaultPartnerFactory.
 * 2. ProductionStageTemplateSet & Items CRUD:
 *    - Curated stage sequences (Standards) for garment archetypes (e.g., Hoodie, Polo, T-Shirt).
 *    - Add, delete, and reorder set items.
 * 3. Snapshot Copy (استدعاء مراحل الإنتاج):
 *    - POST /orders/:orderId/apply-stage-set (APPEND | REPLACE_IF_EMPTY)
 *    - POST /boms/:bomId/apply-stage-set (APPEND | REPLACE_ALL)
 *    - Strict snapshot semantics: Modifying templates later NEVER mutates existing orders/BOMs.
 *    - Validation guards: Reject COMPLETED/CANCELLED orders, empty sets, inactive sets,
 *      and REPLACE_IF_EMPTY when stages already exist.
 *    - Real-time usageCount and lastUsedAt tracking.
 * 4. Idempotent runtime PostgreSQL DDL (ensureSchema).
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

class ManufacturingStageTemplateService {
  /**
   * Idempotent runtime DDL guard for PostgreSQL
   */
  static async ensureSchema() {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma || !prisma.$executeRawUnsafe) return;

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "ProductionStageType" AS ENUM (
            'CUTTING', 'PRINTING_EMBROIDERY', 'SEWING', 'FINISHING', 'QC', 'PACKAGING', 'CUSTOM'
          );
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        DO $$ BEGIN
          CREATE TYPE "StageExecutionEntity" AS ENUM ('INTERNAL', 'EXTERNAL');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;

        CREATE TABLE IF NOT EXISTS "production_stage_templates" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "stageType" "ProductionStageType" NOT NULL DEFAULT 'CUSTOM',
          "sequence" INTEGER NOT NULL DEFAULT 1,
          "standardMinutes" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
          "ratePerPiece" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          "executionEntity" "StageExecutionEntity" NOT NULL DEFAULT 'INTERNAL',
          "defaultPartnerFactoryId" TEXT REFERENCES "partner_factories"("id") ON DELETE SET NULL,
          "instructions" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "usageCount" INTEGER NOT NULL DEFAULT 0,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "production_stage_templates_companyId_code_key"
          ON "production_stage_templates"("companyId", "code");
        CREATE INDEX IF NOT EXISTS "production_stage_templates_companyId_isActive_idx"
          ON "production_stage_templates"("companyId", "isActive");
        CREATE INDEX IF NOT EXISTS "production_stage_templates_companyId_stageType_idx"
          ON "production_stage_templates"("companyId", "stageType");

        CREATE TABLE IF NOT EXISTS "production_stage_template_sets" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "usageCount" INTEGER NOT NULL DEFAULT 0,
          "lastUsedAt" TIMESTAMP(3),
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "production_stage_template_sets_companyId_code_key"
          ON "production_stage_template_sets"("companyId", "code");
        CREATE INDEX IF NOT EXISTS "production_stage_template_sets_companyId_isActive_idx"
          ON "production_stage_template_sets"("companyId", "isActive");

        CREATE TABLE IF NOT EXISTS "production_stage_template_set_items" (
          "id" TEXT PRIMARY KEY,
          "setId" TEXT NOT NULL REFERENCES "production_stage_template_sets"("id") ON DELETE CASCADE,
          "templateId" TEXT NOT NULL REFERENCES "production_stage_templates"("id") ON DELETE RESTRICT,
          "sequence" INTEGER NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS "production_stage_template_set_items_setId_sequence_key"
          ON "production_stage_template_set_items"("setId", "sequence");
        CREATE INDEX IF NOT EXISTS "production_stage_template_set_items_setId_idx"
          ON "production_stage_template_set_items"("setId");
        CREATE INDEX IF NOT EXISTS "production_stage_template_set_items_templateId_idx"
          ON "production_stage_template_set_items"("templateId");
      `);
    } catch (err) {
      console.warn('[ManufacturingStageTemplateService] ensureSchema note:', err.message);
    }
  }

  // ============================================================================
  // 1. Stage Templates CRUD
  // ============================================================================

  static async listTemplates(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }
    if (query.stageType) {
      where.stageType = query.stageType;
    }
    if (query.executionEntity) {
      where.executionEntity = query.executionEntity;
    }
    if (query.search) {
      const s = String(query.search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.productionStageTemplate.findMany({
      where,
      include: {
        defaultPartnerFactory: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ sequence: 'asc' }, { createdAt: 'desc' }],
    });

    return templates;
  }

  static async getTemplateById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const template = await prisma.productionStageTemplate.findFirst({
      where: { id, companyId },
      include: {
        defaultPartnerFactory: {
          select: { id: true, name: true, code: true, specialty: true },
        },
      },
    });

    if (!template) {
      const err = new Error('قالب المرحلة غير موجود');
      err.status = 404;
      throw err;
    }

    return template;
  }

  static async createTemplate(companyId, data, createdById = null) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    if (!data.name || !String(data.name).trim()) {
      const err = new Error('اسم مرحلة الإنتاج القياسية مطلوب');
      err.status = 400;
      throw err;
    }

    let code = data.code ? String(data.code).trim().toUpperCase() : '';
    if (!code) {
      code = `PST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    // Check code uniqueness within company
    const existing = await prisma.productionStageTemplate.findFirst({
      where: { companyId, code },
    });
    if (existing) {
      const err = new Error(`كود المرحلة (${code}) مسجل بالفعل في مكتبة شركتك`);
      err.status = 400;
      throw err;
    }

    // If EXTERNAL partner factory given, verify it belongs to tenant
    if (data.defaultPartnerFactoryId) {
      const factory = await prisma.partnerFactory.findFirst({
        where: { id: data.defaultPartnerFactoryId, companyId },
      });
      if (!factory) {
        const err = new Error('المصنع الشريك الافتراضي غير موجود أو لا ينتمي لشركتك');
        err.status = 400;
        throw err;
      }
    }

    const template = await prisma.productionStageTemplate.create({
      data: {
        companyId,
        code,
        name: String(data.name).trim(),
        stageType: data.stageType || 'CUSTOM',
        sequence: parseInt(data.sequence, 10) || 1,
        standardMinutes: round2(data.standardMinutes || 0),
        ratePerPiece: round2(data.ratePerPiece || 0),
        executionEntity: data.executionEntity === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
        defaultPartnerFactoryId: data.defaultPartnerFactoryId || null,
        instructions: data.instructions ? String(data.instructions).trim() : null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        usageCount: 0,
        createdById,
      },
      include: {
        defaultPartnerFactory: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return template;
  }

  static async updateTemplate(companyId, id, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await this.getTemplateById(companyId, id);

    const updateData = {};
    if (data.name !== undefined) {
      if (!String(data.name).trim()) {
        const err = new Error('اسم المرحلة لا يمكن أن يكون فارغاً');
        err.status = 400;
        throw err;
      }
      updateData.name = String(data.name).trim();
    }

    if (data.code !== undefined) {
      const newCode = String(data.code).trim().toUpperCase();
      if (!newCode) {
        const err = new Error('كود المرحلة لا يمكن أن يكون فارغاً');
        err.status = 400;
        throw err;
      }
      if (newCode !== existing.code) {
        const dup = await prisma.productionStageTemplate.findFirst({
          where: { companyId, code: newCode, id: { not: id } },
        });
        if (dup) {
          const err = new Error(`كود المرحلة (${newCode}) مسجل بالفعل في مكتبة شركتك`);
          err.status = 400;
          throw err;
        }
        updateData.code = newCode;
      }
    }

    if (data.stageType !== undefined) updateData.stageType = data.stageType;
    if (data.sequence !== undefined) updateData.sequence = parseInt(data.sequence, 10) || 1;
    if (data.standardMinutes !== undefined) updateData.standardMinutes = round2(data.standardMinutes);
    if (data.ratePerPiece !== undefined) updateData.ratePerPiece = round2(data.ratePerPiece);
    if (data.executionEntity !== undefined) {
      updateData.executionEntity = data.executionEntity === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL';
    }
    if (data.defaultPartnerFactoryId !== undefined) {
      if (data.defaultPartnerFactoryId) {
        const factory = await prisma.partnerFactory.findFirst({
          where: { id: data.defaultPartnerFactoryId, companyId },
        });
        if (!factory) {
          const err = new Error('المصنع الشريك غير موجود أو لا ينتمي لشركتك');
          err.status = 400;
          throw err;
        }
        updateData.defaultPartnerFactoryId = data.defaultPartnerFactoryId;
      } else {
        updateData.defaultPartnerFactoryId = null;
      }
    }
    if (data.instructions !== undefined) {
      updateData.instructions = data.instructions ? String(data.instructions).trim() : null;
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    const updated = await prisma.productionStageTemplate.update({
      where: { id },
      data: updateData,
      include: {
        defaultPartnerFactory: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return updated;
  }

  static async archiveTemplate(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    await this.getTemplateById(companyId, id);

    return prisma.productionStageTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // 2. Stage Template Sets CRUD & Items Management
  // ============================================================================

  static async listSets(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (query.isActive !== undefined && query.isActive !== '') {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }
    if (query.search) {
      const s = String(query.search).trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sets = await prisma.productionStageTemplateSet.findMany({
      where,
      include: {
        items: {
          include: {
            template: {
              include: {
                defaultPartnerFactory: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sets;
  }

  static async getSetById(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const set = await prisma.productionStageTemplateSet.findFirst({
      where: { id, companyId },
      include: {
        items: {
          include: {
            template: {
              include: {
                defaultPartnerFactory: {
                  select: { id: true, name: true, code: true, specialty: true },
                },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!set) {
      const err = new Error('مجموعة مراحل الإنتاج القياسية غير موجودة');
      err.status = 404;
      throw err;
    }

    return set;
  }

  static async createSet(companyId, data, createdById = null) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    if (!data.name || !String(data.name).trim()) {
      const err = new Error('اسم مجموعة المراحل القياسية مطلوب');
      err.status = 400;
      throw err;
    }

    let code = data.code ? String(data.code).trim().toUpperCase() : '';
    if (!code) {
      code = `SET-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    }

    const existing = await prisma.productionStageTemplateSet.findFirst({
      where: { companyId, code },
    });
    if (existing) {
      const err = new Error(`كود المجموعة (${code}) مسجل بالفعل في مكتبة شركتك`);
      err.status = 400;
      throw err;
    }

    const set = await prisma.productionStageTemplateSet.create({
      data: {
        companyId,
        code,
        name: String(data.name).trim(),
        description: data.description ? String(data.description).trim() : null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        usageCount: 0,
        createdById,
      },
    });

    // If template IDs provided at creation, insert them in sequence
    if (Array.isArray(data.itemTemplateIds) && data.itemTemplateIds.length > 0) {
      for (let i = 0; i < data.itemTemplateIds.length; i++) {
        const tId = data.itemTemplateIds[i];
        await prisma.productionStageTemplateSetItem.create({
          data: {
            setId: set.id,
            templateId: tId,
            sequence: i + 1,
          },
        });
      }
    }

    return this.getSetById(companyId, set.id);
  }

  static async updateSet(companyId, id, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const existing = await this.getSetById(companyId, id);
    const updateData = {};

    if (data.name !== undefined) {
      if (!String(data.name).trim()) {
        const err = new Error('اسم المجموعة لا يمكن أن يكون فارغاً');
        err.status = 400;
        throw err;
      }
      updateData.name = String(data.name).trim();
    }

    if (data.code !== undefined) {
      const newCode = String(data.code).trim().toUpperCase();
      if (!newCode) {
        const err = new Error('كود المجموعة لا يمكن أن يكون فارغاً');
        err.status = 400;
        throw err;
      }
      if (newCode !== existing.code) {
        const dup = await prisma.productionStageTemplateSet.findFirst({
          where: { companyId, code: newCode, id: { not: id } },
        });
        if (dup) {
          const err = new Error(`كود المجموعة (${newCode}) مسجل بالفعل`);
          err.status = 400;
          throw err;
        }
        updateData.code = newCode;
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? String(data.description).trim() : null;
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);

    await prisma.productionStageTemplateSet.update({
      where: { id },
      data: updateData,
    });

    return this.getSetById(companyId, id);
  }

  static async archiveSet(companyId, id) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    await this.getSetById(companyId, id);

    return prisma.productionStageTemplateSet.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async addSetItem(companyId, setId, data) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const set = await this.getSetById(companyId, setId);
    const template = await this.getTemplateById(companyId, data.templateId);

    if (!template.isActive) {
      const err = new Error('لا يمكن إضافة قالب معطل إلى المجموعة القياسية');
      err.status = 400;
      throw err;
    }

    const existingItems = set.items || [];
    let sequence = parseInt(data.sequence, 10);
    if (!sequence || sequence < 1 || existingItems.some((it) => it.sequence === sequence)) {
      sequence = existingItems.reduce((max, it) => Math.max(max, it.sequence), 0) + 1;
    }

    await prisma.productionStageTemplateSetItem.create({
      data: {
        setId,
        templateId: template.id,
        sequence,
      },
    });

    return this.getSetById(companyId, setId);
  }

  static async removeSetItem(companyId, setId, itemId) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    await this.getSetById(companyId, setId);

    const item = await prisma.productionStageTemplateSetItem.findFirst({
      where: { id: itemId, setId },
    });
    if (!item) {
      const err = new Error('بند المرحلة غير موجود في هذه المجموعة');
      err.status = 404;
      throw err;
    }

    await prisma.productionStageTemplateSetItem.delete({
      where: { id: itemId },
    });

    // Re-sequence remaining items cleanly: 1..N
    const remaining = await prisma.productionStageTemplateSetItem.findMany({
      where: { setId },
      orderBy: { sequence: 'asc' },
    });

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sequence !== i + 1) {
        await prisma.productionStageTemplateSetItem.update({
          where: { id: remaining[i].id },
          data: { sequence: i + 1 },
        });
      }
    }

    return this.getSetById(companyId, setId);
  }

  static async reorderSetItems(companyId, setId, orderedItemIds) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    await this.getSetById(companyId, setId);

    if (!Array.isArray(orderedItemIds) || orderedItemIds.length === 0) {
      const err = new Error('قائمة ترتيب البنود مطلوبة');
      err.status = 400;
      throw err;
    }

    // Temporary offset sequence to prevent unique constraint collisions (setId, sequence)
    for (let i = 0; i < orderedItemIds.length; i++) {
      await prisma.productionStageTemplateSetItem.update({
        where: { id: orderedItemIds[i] },
        data: { sequence: 1000 + i },
      });
    }

    // Apply real 1..N sequence
    for (let i = 0; i < orderedItemIds.length; i++) {
      await prisma.productionStageTemplateSetItem.update({
        where: { id: orderedItemIds[i] },
        data: { sequence: i + 1 },
      });
    }

    return this.getSetById(companyId, setId);
  }

  // ============================================================================
  // 3. Snapshot Copy to Production Order & BOM
  // ============================================================================

  /**
   * Apply Stage Template Set to a Production Order (Snapshot copy)
   *
   * @param {string} companyId - Tenant company
   * @param {string} orderId - Production order or sample order
   * @param {object} options - { setId, mode: 'APPEND' | 'REPLACE_IF_EMPTY' }
   */
  static async applyStageSetToOrder(companyId, orderId, { setId, mode = 'APPEND' }, createdById = null) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    if (!setId) {
      const err = new Error('معرف مجموعة المراحل القياسية مطلوب');
      err.status = 400;
      throw err;
    }

    // 1. Resolve Order (ProductionOrder or optional SampleOrder)
    let isSampleOrder = false;
    let order = await prisma.productionOrder.findFirst({
      where: { id: orderId, companyId },
      include: { stages: { orderBy: { sequence: 'asc' } } },
    });

    if (!order && prisma.sampleOrder) {
      const sample = await prisma.sampleOrder.findFirst({
        where: { id: orderId, companyId },
        include: { stages: { orderBy: { sequence: 'asc' } } },
      });
      if (sample) {
        order = sample;
        isSampleOrder = true;
      }
    }

    if (!order) {
      const err = new Error('أمر التشغيل أو العينة غير موجود في شركتك');
      err.status = 404;
      throw err;
    }

    // 2. Reject closed orders
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      const err = new Error('لا يمكن استدعاء أو تعديل مراحل لأمر تشغيل مكتمل أو ملغي');
      err.status = 400;
      throw err;
    }

    // 3. Validate template set
    const set = await prisma.productionStageTemplateSet.findFirst({
      where: { id: setId, companyId },
      include: {
        items: {
          include: {
            template: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!set) {
      const err = new Error('مجموعة المراحل القياسية غير موجودة');
      err.status = 404;
      throw err;
    }

    if (!set.isActive) {
      const err = new Error('مجموعة المراحل القياسية معطلة ولا يمكن استدعاؤها');
      err.status = 400;
      throw err;
    }

    if (!set.items || set.items.length === 0) {
      const err = new Error('مجموعة المراحل المحددة فارغة ولا تحتوي على أي مراحل قياسية');
      err.status = 400;
      throw err;
    }

    // 4. Validate Mode & Existing Stages
    const existingStages = order.stages || [];
    if (mode === 'REPLACE_IF_EMPTY' && existingStages.length > 0) {
      const err = new Error('أمر التشغيل يحتوي بالفعل على مراحل؛ يرجى اختيار وضع الإلحاق (APPEND)');
      err.status = 400;
      throw err;
    }

    let startSequence = 1;
    if (mode === 'APPEND' && existingStages.length > 0) {
      startSequence = existingStages.reduce((max, s) => Math.max(max, s.sequence), 0) + 1;
    }

    const createdStages = [];
    const usedTemplateIds = new Set();

    // 5. Create snapshot copies of stages
    for (let i = 0; i < set.items.length; i++) {
      const item = set.items[i];
      const tmpl = item.template;
      if (!tmpl) continue;

      usedTemplateIds.add(tmpl.id);
      const stageSequence = startSequence + i;

      if (isSampleOrder && prisma.sampleOrderStage) {
        const stage = await prisma.sampleOrderStage.create({
          data: {
            sampleOrderId: order.id,
            name: tmpl.name,
            stageType: tmpl.stageType,
            sequence: stageSequence,
            status: 'PENDING',
            notes: tmpl.instructions || null,
            templateSetId: set.id,
            templateId: tmpl.id,
          },
        });
        createdStages.push(stage);
      } else {
        const stage = await prisma.productionStage.create({
          data: {
            orderId: order.id,
            name: tmpl.name,
            stageType: tmpl.stageType,
            sequence: stageSequence,
            status: 'PENDING',
            ratePerPiece: round2(tmpl.ratePerPiece),
            standardMinutes: round2(tmpl.standardMinutes),
            actualMinutes: 0.0,
            completedQuantity: 0.0,
            stageLaborCost: 0.0,
            executionEntity: tmpl.executionEntity || 'INTERNAL',
            partnerFactoryId: tmpl.defaultPartnerFactoryId || null,
            notes: tmpl.instructions || null,
          },
        });
        createdStages.push(stage);
      }
    }

    // 6. Increment usage counts & record lastUsedAt
    try {
      await prisma.productionStageTemplateSet.update({
        where: { id: set.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      for (const tId of usedTemplateIds) {
        await prisma.productionStageTemplate.update({
          where: { id: tId },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }
    } catch (ignoreUsageErr) {
      console.warn('[ManufacturingStageTemplateService] usageCount increment note:', ignoreUsageErr.message);
    }

    return {
      success: true,
      count: createdStages.length,
      mode,
      setName: set.name,
      stages: createdStages,
    };
  }

  /**
   * Apply Stage Template Set to a Bill of Materials (BOM)
   *
   * @param {string} companyId - Tenant company
   * @param {string} bomId - Bill of materials ID
   * @param {object} options - { setId, mode: 'APPEND' | 'REPLACE_ALL' }
   */
  static async applyStageSetToBom(companyId, bomId, { setId, mode = 'APPEND' }) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    if (!setId) {
      const err = new Error('معرف مجموعة المراحل القياسية مطلوب');
      err.status = 400;
      throw err;
    }

    const bom = await prisma.billOfMaterials.findFirst({
      where: { id: bomId, companyId },
      include: { standardStages: { orderBy: { sequence: 'asc' } } },
    });

    if (!bom) {
      const err = new Error('قائمة المكونات (BOM) غير موجودة في شركتك');
      err.status = 404;
      throw err;
    }

    const set = await prisma.productionStageTemplateSet.findFirst({
      where: { id: setId, companyId },
      include: {
        items: {
          include: {
            template: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!set) {
      const err = new Error('مجموعة المراحل القياسية غير موجودة');
      err.status = 404;
      throw err;
    }

    if (!set.isActive) {
      const err = new Error('مجموعة المراحل القياسية معطلة ولا يمكن استدعاؤها');
      err.status = 400;
      throw err;
    }

    if (!set.items || set.items.length === 0) {
      const err = new Error('مجموعة المراحل المحددة فارغة ولا تحتوي على أي مراحل قياسية');
      err.status = 400;
      throw err;
    }

    if (mode === 'REPLACE_ALL') {
      await prisma.bomStandardStage.deleteMany({
        where: { bomId: bom.id },
      });
    }

    const existingStages = mode === 'REPLACE_ALL' ? [] : (bom.standardStages || []);
    let startSequence = 1;
    if (existingStages.length > 0) {
      startSequence = existingStages.reduce((max, s) => Math.max(max, s.sequence), 0) + 1;
    }

    const createdStages = [];
    const usedTemplateIds = new Set();

    for (let i = 0; i < set.items.length; i++) {
      const item = set.items[i];
      const tmpl = item.template;
      if (!tmpl) continue;

      usedTemplateIds.add(tmpl.id);
      const stageSequence = startSequence + i;

      const stage = await prisma.bomStandardStage.create({
        data: {
          bomId: bom.id,
          name: tmpl.name,
          stageType: tmpl.stageType,
          sequence: stageSequence,
          ratePerPiece: round2(tmpl.ratePerPiece),
          standardMinutes: round2(tmpl.standardMinutes),
        },
      });
      createdStages.push(stage);
    }

    // Increment usage counts
    try {
      await prisma.productionStageTemplateSet.update({
        where: { id: set.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      for (const tId of usedTemplateIds) {
        await prisma.productionStageTemplate.update({
          where: { id: tId },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }
    } catch (ignoreUsageErr) {
      console.warn('[ManufacturingStageTemplateService] usageCount increment note:', ignoreUsageErr.message);
    }

    return {
      success: true,
      count: createdStages.length,
      mode,
      setName: set.name,
      stages: createdStages,
    };
  }
}

module.exports = ManufacturingStageTemplateService;
