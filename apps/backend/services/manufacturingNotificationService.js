/**
 * Manufacturing WhatsApp Notification Service (T01)
 *
 * Implements:
 * 1. 9 Manufacturing WhatsApp notification events (SAMPLE_*, PRODUCTION_*)
 * 2. Multi-recipient fan-out (CUSTOMER, FACTORY, TEAM)
 * 3. Settings management stored in ManufacturingSettings.manufacturingNotifications JSON
 * 4. Idempotent deduplication via unique constraint (companyId, dedupKey)
 * 5. Complete audit logging via manufacturing_notification_logs
 * 6. Non-blocking error handling (never crashes parent transaction or caller)
 * 7. Safe integration with WhatsAppNotificationService (SYSTEM category, ANNOUNCEMENT persisted event)
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

const MFG_EVENTS = {
  SAMPLE_CREATED:             { entity: 'SAMPLE_ORDER',     recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  SAMPLE_APPROVED:            { entity: 'SAMPLE_ORDER',     recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  SAMPLE_REJECTED:            { entity: 'SAMPLE_ORDER',     recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  SAMPLE_CONVERTED:           { entity: 'SAMPLE_ORDER',     recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  SAMPLE_RECEIVED:            { entity: 'SAMPLE_ORDER',     recipients: ['CUSTOMER', 'TEAM'] },
  PRODUCTION_STAGE_STARTED:   { entity: 'STAGE',            recipients: ['FACTORY', 'TEAM'] },
  PRODUCTION_STAGE_COMPLETED: { entity: 'STAGE',            recipients: ['FACTORY', 'TEAM'] },
  PRODUCTION_ORDER_DELAYED:   { entity: 'PRODUCTION_ORDER', recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  PRODUCTION_ORDER_COMPLETED: { entity: 'PRODUCTION_ORDER', recipients: ['CUSTOMER', 'FACTORY', 'TEAM'] },
  MATERIAL_SHORTAGE:          { entity: 'PRODUCTION_ORDER', recipients: ['FACTORY', 'TEAM'] },
};

const DEFAULT_BODIES = {
  SAMPLE_CREATED: `تم إنشاء طلب العينة {sampleNumber} ({productName}) بنجاح ✅
العميل: {customerName}
الماركة: {brandName}
الكمية المخططة: {plannedQuantity}
موعد التسليم المتوقع: {dueDate}`,

  SAMPLE_APPROVED: `تمت الموافقة على العينة {sampleNumber} ({productName}) بنجاح ✅
العميل: {customerName}
الماركة: {brandName}
جاهزة للتحويل لأمر إنتاج.`,

  SAMPLE_REJECTED: `تم رفض العينة {sampleNumber} ({productName}) ❌
السبب: {reason}
يرجى مراجعة الملاحظات وإعادة المحاولة.`,

  SAMPLE_CONVERTED: `تم تحويل عينتك {sampleNumber} ({productName}) إلى أمر تصنيع {orderNumber} ✅
الكمية المخططة: {plannedQuantity} قطعة
موعد التسليم المتوقع: {dueDate}`,

  SAMPLE_RECEIVED: `تم استلام العينة {sampleNumber} ({productName}) في المقر بنجاح ✅
العميل: {customerName}
شكراً لتعاونكم.`,

  PRODUCTION_STAGE_STARTED: `تم بدء مرحلة {stageName} لأمر التصنيع {orderNumber} ({productName}) ⏳
المصنع: {factoryName}`,

  PRODUCTION_STAGE_COMPLETED: `تم إتمام مرحلة {stageName} لأمر التصنيع {orderNumber} ({productName}) بنجاح ✅
المصنع: {factoryName}`,

  PRODUCTION_ORDER_DELAYED: `تنبيه: تأخر أمر التصنيع {orderNumber} ({productName}) عن موعد التسليم المحدد يوم {dueDate} ⏰
يرجى المتابعة العاجلة.`,

  PRODUCTION_ORDER_COMPLETED: `تم اكتمال أمر التصنيع {orderNumber} ({productName}) بالكامل وجاهز للاستلام ✅
الكمية: {plannedQuantity} قطعة`,

  MATERIAL_SHORTAGE: `تنبيه: نقص خامات لأمر التصنيع {orderNumber} ({productName}) ⚠️
الخامات الناقصة:
{shortages}
يرجى توفير النواقص لبدء أو استكمال التشغيل.`,
};

const DEFAULT_SETTINGS = {
  isEnabled: true,
  teamPhone: null,
  events: Object.keys(MFG_EVENTS).reduce((acc, k) => {
    acc[k] = {
      enabled: true,
      recipients: {
        CUSTOMER: MFG_EVENTS[k].recipients.includes('CUSTOMER'),
        FACTORY: MFG_EVENTS[k].recipients.includes('FACTORY'),
        TEAM: MFG_EVENTS[k].recipients.includes('TEAM'),
      },
      templateId: null,
      body: k === 'MATERIAL_SHORTAGE' ? null : (DEFAULT_BODIES[k] || ''),
    };
    return acc;
  }, {}),
};

class ManufacturingNotificationService {
  /**
   * Runtime schema guard for PostgreSQL (DDL idempotent)
   */
  static async ensureSchema() {
    if (this._schemaEnsured) return;
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.$executeRawUnsafe) return;

      const stmts = [
        `DO $$ BEGIN CREATE TYPE "ManufacturingNotificationRecipient" AS ENUM ('CUSTOMER','FACTORY','TEAM'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `DO $$ BEGIN CREATE TYPE "ManufacturingNotificationStatus" AS ENUM ('PENDING','SENT','FAILED','SKIPPED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
        `CREATE TABLE IF NOT EXISTS "manufacturing_notification_logs" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "eventKey" TEXT NOT NULL,
          "entityType" TEXT NOT NULL,
          "entityId" TEXT NOT NULL,
          "sampleOrderId" TEXT,
          "productionOrderId" TEXT,
          "stageId" TEXT,
          "recipientType" "ManufacturingNotificationRecipient" NOT NULL,
          "recipientName" TEXT,
          "recipientPhone" TEXT,
          "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
          "status" "ManufacturingNotificationStatus" NOT NULL DEFAULT 'PENDING',
          "reason" TEXT,
          "errorCode" TEXT,
          "whatsappLogId" TEXT,
          "dedupKey" TEXT NOT NULL,
          "payload" JSONB,
          "sentAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "mfg_notif_logs_company_dedup_key" ON "manufacturing_notification_logs"("companyId","dedupKey");`,
        `CREATE INDEX IF NOT EXISTS "mfg_notif_logs_company_created_idx" ON "manufacturing_notification_logs"("companyId","createdAt");`,
        `CREATE INDEX IF NOT EXISTS "mfg_notif_logs_company_event_status_idx" ON "manufacturing_notification_logs"("companyId","eventKey","status");`,
        `CREATE INDEX IF NOT EXISTS "mfg_notif_logs_sample_idx" ON "manufacturing_notification_logs"("sampleOrderId");`,
        `CREATE INDEX IF NOT EXISTS "mfg_notif_logs_order_idx" ON "manufacturing_notification_logs"("productionOrderId");`,
        `ALTER TABLE "manufacturing_settings" ADD COLUMN IF NOT EXISTS "manufacturingNotifications" JSONB;`,
      ];

      for (const sql of stmts) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (e) {
          console.warn('[MfgNotification] ensureSchema stmt failed:', e.message);
        }
      }
      this._schemaEnsured = true;
    } catch (err) {
      console.warn('[MfgNotification] ensureSchema guard failed:', err.message);
    }
  }

  /**
   * Normalize raw settings object or JSON into a standard structure
   */
  static normalizeSettings(raw) {
    let parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        parsed = null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }

    const isEnabled = parsed.isEnabled !== undefined ? Boolean(parsed.isEnabled) : true;
    const teamPhone = parsed.teamPhone ? String(parsed.teamPhone).trim() : null;
    const events = {};

    for (const [key, def] of Object.entries(MFG_EVENTS)) {
      const pEv = parsed.events && parsed.events[key] ? parsed.events[key] : {};
      events[key] = {
        enabled: pEv.enabled !== undefined ? Boolean(pEv.enabled) : true,
        recipients: {
          CUSTOMER: pEv.recipients?.CUSTOMER !== undefined ? Boolean(pEv.recipients.CUSTOMER) : def.recipients.includes('CUSTOMER'),
          FACTORY: pEv.recipients?.FACTORY !== undefined ? Boolean(pEv.recipients.FACTORY) : def.recipients.includes('FACTORY'),
          TEAM: pEv.recipients?.TEAM !== undefined ? Boolean(pEv.recipients.TEAM) : def.recipients.includes('TEAM'),
        },
        templateId: pEv.templateId ? String(pEv.templateId).trim() : null,
        body: pEv.body !== undefined && pEv.body !== null ? String(pEv.body) : (DEFAULT_BODIES[key] || ''),
      };
    }

    return {
      isEnabled,
      teamPhone,
      events,
    };
  }

  /**
   * Get notification settings for a company
   */
  static async getNotificationSettings(companyId) {
    await this.ensureSchema();
    const ManufacturingService = require('./manufacturingService');
    const settings = await ManufacturingService.getSettings(companyId);
    return this.normalizeSettings(settings?.manufacturingNotifications);
  }

  /**
   * Update notification settings with deep merge per event
   */
  static async updateNotificationSettings(companyId, patch = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();
    const current = await this.getNotificationSettings(companyId);

    if (patch.isEnabled !== undefined) {
      current.isEnabled = Boolean(patch.isEnabled);
    }
    if (patch.teamPhone !== undefined) {
      current.teamPhone = patch.teamPhone ? String(patch.teamPhone).trim() : null;
    }
    if (patch.events && typeof patch.events === 'object') {
      for (const [k, evPatch] of Object.entries(patch.events)) {
        if (!current.events[k] || !evPatch || typeof evPatch !== 'object') continue;
        if (evPatch.enabled !== undefined) {
          current.events[k].enabled = Boolean(evPatch.enabled);
        }
        if (evPatch.templateId !== undefined) {
          current.events[k].templateId = evPatch.templateId ? String(evPatch.templateId).trim() : null;
        }
        if (evPatch.body !== undefined) {
          current.events[k].body = String(evPatch.body);
        }
        if (evPatch.recipients && typeof evPatch.recipients === 'object') {
          current.events[k].recipients = {
            ...current.events[k].recipients,
            ...evPatch.recipients,
          };
        }
      }
    }

    if (prisma.manufacturingSettings?.upsert) {
      await prisma.manufacturingSettings.upsert({
        where: { companyId },
        create: {
          companyId,
          manufacturingNotifications: current,
        },
        update: {
          manufacturingNotifications: current,
        },
      });
    }

    return current;
  }

  /**
   * Build dedupKey based on event key, entities, and recipient type
   */
  static buildDedupKey(eventKey, entities, recipientType, dateStr = null) {
    if (eventKey.startsWith('SAMPLE_')) {
      return `MFG:${eventKey}:${entities.sampleOrderId || entities.entityId}:${recipientType}`;
    }
    if (eventKey.startsWith('PRODUCTION_STAGE_')) {
      return `MFG:${eventKey}:${entities.stageId || entities.entityId}:${recipientType}`;
    }
    if (eventKey === 'PRODUCTION_ORDER_COMPLETED') {
      return `MFG:PRODUCTION_ORDER_COMPLETED:${entities.productionOrderId || entities.entityId}:${recipientType}`;
    }
    if (eventKey === 'PRODUCTION_ORDER_DELAYED') {
      const d = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
      return `MFG:PRODUCTION_ORDER_DELAYED:${entities.productionOrderId || entities.entityId}:${d}:${recipientType}`;
    }
    if (eventKey === 'MATERIAL_SHORTAGE') {
      const d = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
      const orderId = entities.productionOrderId || entities.entityId;
      return recipientType
        ? `MFG:MATERIAL_SHORTAGE:${orderId}:${d}:${recipientType}`
        : `MATERIAL_SHORTAGE:${orderId}:${d}`;
    }
    return `MFG:${eventKey}:${entities.entityId}:${recipientType}`;
  }

  /**
   * Build entity references for audit logs
   */
  static buildEntities(eventKey, ctx) {
    const sample = ctx.sampleOrder || null;
    const order = ctx.productionOrder || null;
    const stage = ctx.stage || null;

    if (eventKey.startsWith('SAMPLE_')) {
      return {
        entityType: 'SAMPLE_ORDER',
        entityId: sample?.id || ctx.entityId,
        sampleOrderId: sample?.id || ctx.entityId,
        productionOrderId: order?.id || sample?.convertedOrderId || null,
        stageId: stage?.id || null,
      };
    }
    if (eventKey.startsWith('PRODUCTION_STAGE_')) {
      return {
        entityType: 'STAGE',
        entityId: stage?.id || ctx.entityId,
        sampleOrderId: order?.sourceSampleOrderId || null,
        productionOrderId: order?.id || stage?.orderId || null,
        stageId: stage?.id || ctx.entityId,
      };
    }
    return {
      entityType: 'PRODUCTION_ORDER',
      entityId: order?.id || ctx.entityId,
      sampleOrderId: order?.sourceSampleOrderId || null,
      productionOrderId: order?.id || ctx.entityId,
      stageId: null,
    };
  }

  /**
   * Build variables dictionary for template interpolation
   */
  static buildVariables(eventKey, ctx, recipient) {
    const sample = ctx.sampleOrder || {};
    const order = ctx.productionOrder || {};
    const stage = ctx.stage || {};

    const sampleNumber = sample.sampleNumber || '';
    const productName = sample.productName || order.product?.name || order.productName || '';
    const orderNumber = order.orderNumber || '';
    const stageName = stage.name || '';

    const rawDue = sample.dueDate || sample.expectedDeliveryAt || order.dueDate;
    let dueDate = '';
    if (rawDue) {
      try {
        const d = new Date(rawDue);
        dueDate = isNaN(d.getTime()) ? String(rawDue) : d.toISOString().split('T')[0];
      } catch (_) {
        dueDate = String(rawDue);
      }
    }

    const customerName = recipient.type === 'CUSTOMER' ? recipient.name : (sample.customerName || order.customer?.name || '');
    const factoryName = recipient.type === 'FACTORY' ? recipient.name : (stage.partnerFactory?.name || '');
    const brandName = sample.brandName || order.brandName || '';
    const plannedQuantity = String(order.plannedQuantity || sample.plannedQuantity || 1);
    const reason = sample.resultNotes || '';

    const shortagesList = Array.isArray(ctx.shortages) ? ctx.shortages : [];
    const shortageLines = shortagesList
      .map((s) => {
        const name = s.name || s.rawMaterialName || 'خامة';
        const req = s.required !== undefined ? s.required : (s.requiredQuantity !== undefined ? s.requiredQuantity : '');
        const avail = s.available !== undefined ? s.available : (s.availableQuantity !== undefined ? s.availableQuantity : 0);
        const unit = s.unit ? ` ${s.unit}` : '';
        return `- ${name}: المطلوب ${req}${unit}، المتاح ${avail}${unit}`;
      })
      .join('\n');

    return {
      sampleNumber,
      productName,
      orderNumber,
      stageName,
      dueDate,
      customerName,
      factoryName,
      brandName,
      plannedQuantity,
      reason,
      shortageLines: shortageLines || (shortagesList.length ? JSON.stringify(shortagesList) : ''),
      shortages: shortageLines || (shortagesList.length ? JSON.stringify(shortagesList) : ''),
    };
  }

  /**
   * Replace placeholders {key} in string
   */
  static replaceVariables(template, vars) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? vars[key] : ''));
  }

  /**
   * Resolve recipients list for the event
   */
  static async resolveRecipients(eventKey, ctx, settings, cfg) {
    const prisma = getSharedPrismaClient();
    const companyId = ctx.companyId;
    const recipients = [];
    const def = MFG_EVENTS[eventKey];
    if (!def) return recipients;

    // 1. CUSTOMER
    if (def.recipients.includes('CUSTOMER') && cfg?.recipients?.CUSTOMER !== false) {
      let customerId = ctx.sampleOrder?.customerId || ctx.productionOrder?.customerId || null;
      if (customerId) {
        try {
          const cust = await prisma.customer.findFirst({
            where: { id: customerId, companyId },
            select: { id: true, firstName: true, lastName: true, phone: true, phoneNormalized: true },
          });
          if (cust) {
            const phone = cust.phone || cust.phoneNormalized || null;
            const name = [cust.firstName, cust.lastName].filter(Boolean).join(' ').trim() || ctx.sampleOrder?.customerName || 'العميل العزيز';
            recipients.push({
              type: 'CUSTOMER',
              name,
              phone: phone ? String(phone).trim() : null,
            });
          }
        } catch (err) {
          console.warn('[MfgNotification] Error resolving customer:', err.message);
        }
      }
    }

    // 2. FACTORY
    if (def.recipients.includes('FACTORY') && cfg?.recipients?.FACTORY !== false) {
      let factory = ctx.partnerFactory || ctx.productionOrder?.partnerFactory || null;

      // (a) ctx.stage.partnerFactoryId -> partnerFactory
      if (!factory && ctx.stage?.partnerFactoryId) {
        if (ctx.stage.partnerFactory) {
          factory = ctx.stage.partnerFactory;
        } else {
          try {
            factory = await prisma.partnerFactory.findFirst({
              where: { id: ctx.stage.partnerFactoryId, companyId },
              select: { id: true, name: true, phone: true, isActive: true },
            });
          } catch (_) {}
        }
      }

      // (b) sample.partnerFactoryId if present
      if (!factory && ctx.sampleOrder?.partnerFactoryId) {
        try {
          factory = await prisma.partnerFactory.findFirst({
            where: { id: ctx.sampleOrder.partnerFactoryId, companyId },
            select: { id: true, name: true, phone: true, isActive: true },
          });
        } catch (_) {}
      }

      // (c) productionOrder.partnerFactoryId if present
      if (!factory && ctx.productionOrder?.partnerFactoryId) {
        try {
          factory = await prisma.partnerFactory.findFirst({
            where: { id: ctx.productionOrder.partnerFactoryId, companyId },
            select: { id: true, name: true, phone: true, isActive: true },
          });
        } catch (_) {}
      }

      // (d) first stage in production order that has partnerFactoryId
      const orderId = ctx.productionOrder?.id || ctx.stage?.orderId;
      if (!factory && orderId) {
        try {
          const stageWithFactory = await prisma.productionStage.findFirst({
            where: { orderId, partnerFactoryId: { not: null } },
            orderBy: { sequence: 'asc' },
            include: { partnerFactory: true },
          });
          if (stageWithFactory?.partnerFactory) {
            factory = stageWithFactory.partnerFactory;
          }
        } catch (_) {}
      }

      if (factory && factory.isActive !== false) {
        recipients.push({
          type: 'FACTORY',
          name: factory.name || 'المصنع الشريك',
          phone: factory.phone ? String(factory.phone).trim() : null,
        });
      }
    }

    // 3. TEAM
    if (def.recipients.includes('TEAM') && cfg?.recipients?.TEAM !== false) {
      let phone = settings.teamPhone ? String(settings.teamPhone).trim() : null;
      let name = 'فريق العمل';
      if (!phone) {
        try {
          const company = await prisma.company.findFirst({
            where: { id: companyId },
            select: { id: true, name: true, phone: true },
          });
          if (company?.phone) {
            phone = String(company.phone).trim();
          }
          if (company?.name) {
            name = company.name;
          }
        } catch (_) {}
      }
      recipients.push({
        type: 'TEAM',
        name,
        phone: phone || null,
      });
    }

    return recipients;
  }

  /**
   * Main notification emitter
   */
  static async emit(eventKey, ctx = {}) {
    await this.ensureSchema();
    const def = MFG_EVENTS[eventKey];
    if (!def) {
      const err = new Error('حدث تصنيع غير معروف');
      err.statusCode = 400;
      throw err;
    }

    const companyId = ctx.companyId || ctx.sampleOrder?.companyId || ctx.productionOrder?.companyId;
    if (!companyId) {
      return { success: false, reason: 'missing_company_id', fanout: [] };
    }
    ctx.companyId = companyId;

    const settings = await this.getNotificationSettings(companyId);
    if (!settings.isEnabled) {
      return { success: true, skipped: 'module_disabled', fanout: [] };
    }

    const cfg = settings.events[eventKey];
    if (!cfg || cfg.enabled === false) {
      return { success: true, skipped: 'event_disabled', fanout: [] };
    }

    const prisma = getSharedPrismaClient();
    const recipients = await this.resolveRecipients(eventKey, ctx, settings, cfg);
    const entities = this.buildEntities(eventKey, ctx);

    const out = [];
    for (const r of recipients) {
      const dedupKey = this.buildDedupKey(eventKey, entities, r.type);
      const vars = this.buildVariables(eventKey, ctx, r);
      const template = cfg.body || DEFAULT_BODIES[eventKey] || '';
      const body = this.replaceVariables(template, vars);

      let row;
      try {
        row = await prisma.manufacturingNotificationLog.create({
          data: {
            companyId,
            eventKey,
            entityType: entities.entityType,
            entityId: entities.entityId,
            sampleOrderId: entities.sampleOrderId || null,
            productionOrderId: entities.productionOrderId || null,
            stageId: entities.stageId || null,
            recipientType: r.type,
            recipientName: r.name,
            recipientPhone: r.phone,
            channel: 'WHATSAPP',
            status: 'PENDING',
            dedupKey,
            payload: { body, vars, templateId: cfg.templateId || null },
          },
        });
      } catch (e) {
        if (e.code === 'P2002') {
          out.push({ type: r.type, status: 'DUPLICATE' });
          continue;
        }
        throw e;
      }

      if (!r.phone) {
        await prisma.manufacturingNotificationLog.update({
          where: { id: row.id },
          data: { status: 'SKIPPED', reason: 'no_phone' },
        });
        out.push({ type: r.type, status: 'SKIPPED', reason: 'no_phone', logId: row.id });
        continue;
      }

      let result = null;
      try {
        result = await WhatsAppNotificationService.sendNotification({
          companyId,
          recipientPhone: r.phone,
          recipientName: r.name,
          recipientType: r.type === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN',
          category: 'SYSTEM',
          eventType: `MFG_${eventKey}`,
          persistedEventType: 'ANNOUNCEMENT',
          rawEventType: `MFG_${eventKey}`,
          variables: vars,
          contentOverride: body,
          preferredTemplateId: cfg.templateId || null,
          priority: 4,
        });
      } catch (sendErr) {
        result = { success: false, reason: sendErr.message };
      }

      const ok = result && result.success === true;
      const status = ok ? 'SENT' : (result?.reason === 'no_phone' ? 'SKIPPED' : 'FAILED');
      const reason = ok ? null : (result?.reason || 'unknown');

      await prisma.manufacturingNotificationLog.update({
        where: { id: row.id },
        data: {
          status,
          reason,
          errorCode: result?.errorCode || null,
          whatsappLogId: result?.notificationId || null,
          sentAt: ok ? new Date() : null,
        },
      });

      out.push({
        type: r.type,
        recipientPhone: r.phone,
        status,
        reason,
        logId: row.id,
      });
    }

    return { success: true, fanout: out };
  }

  /**
   * List notification logs with filters & pagination
   */
  static async listNotificationLogs(companyId, query = {}) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const {
      eventKey,
      status,
      sampleOrderId,
      productionOrderId,
      stageId,
      recipientType,
      search,
      page = 1,
      limit = 20,
    } = query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = { companyId };
    if (eventKey && eventKey !== 'ALL') where.eventKey = eventKey;
    if (status && status !== 'ALL') where.status = status;
    if (sampleOrderId) where.sampleOrderId = sampleOrderId;
    if (productionOrderId) where.productionOrderId = productionOrderId;
    if (stageId) where.stageId = stageId;
    if (recipientType && recipientType !== 'ALL') where.recipientType = recipientType;

    if (search && String(search).trim()) {
      const s = String(search).trim();
      where.OR = [
        { recipientName: { contains: s, mode: 'insensitive' } },
        { recipientPhone: { contains: s, mode: 'insensitive' } },
        { dedupKey: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.manufacturingNotificationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.manufacturingNotificationLog.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Retry single notification log entry
   */
  static async retryNotificationLog(companyId, id, user = null) {
    await this.ensureSchema();
    const prisma = getSharedPrismaClient();

    const old = await prisma.manufacturingNotificationLog.findFirst({
      where: { id, companyId },
    });

    if (!old) {
      const err = new Error('سجل الإشعار غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (old.status === 'SENT') {
      const err = new Error('الإشعار تم إرساله بنجاح بالفعل');
      err.statusCode = 400;
      throw err;
    }

    const baseKey = old.dedupKey.split(':retry:')[0];
    const retryCount = await prisma.manufacturingNotificationLog.count({
      where: {
        companyId,
        dedupKey: { startsWith: `${baseKey}:retry:` },
      },
    });

    const nextRetryNum = retryCount + 1;
    const newDedupKey = `${baseKey}:retry:${nextRetryNum}`;

    const newRow = await prisma.manufacturingNotificationLog.create({
      data: {
        companyId,
        eventKey: old.eventKey,
        entityType: old.entityType,
        entityId: old.entityId,
        sampleOrderId: old.sampleOrderId,
        productionOrderId: old.productionOrderId,
        stageId: old.stageId,
        recipientType: old.recipientType,
        recipientName: old.recipientName,
        recipientPhone: old.recipientPhone,
        channel: old.channel || 'WHATSAPP',
        status: 'PENDING',
        dedupKey: newDedupKey,
        payload: old.payload,
      },
    });

    if (!old.recipientPhone) {
      return await prisma.manufacturingNotificationLog.update({
        where: { id: newRow.id },
        data: { status: 'SKIPPED', reason: 'no_phone' },
      });
    }

    const vars = old.payload?.vars || {};
    const body = old.payload?.body || '';

    let result = null;
    try {
      result = await WhatsAppNotificationService.sendNotification({
        companyId,
        recipientPhone: old.recipientPhone,
        recipientName: old.recipientName,
        recipientType: old.recipientType === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN',
        category: 'SYSTEM',
        eventType: `MFG_${old.eventKey}`,
        persistedEventType: 'ANNOUNCEMENT',
        rawEventType: `MFG_${old.eventKey}`,
        variables: vars,
        contentOverride: body,
        preferredTemplateId: old.payload?.templateId || null,
        priority: 4,
      });
    } catch (e) {
      result = { success: false, reason: e.message };
    }

    const ok = result && result.success === true;
    const status = ok ? 'SENT' : (result?.reason === 'no_phone' ? 'SKIPPED' : 'FAILED');
    const reason = ok ? null : (result?.reason || 'unknown');

    const updated = await prisma.manufacturingNotificationLog.update({
      where: { id: newRow.id },
      data: {
        status,
        reason,
        errorCode: result?.errorCode || null,
        whatsappLogId: result?.notificationId || null,
        sentAt: ok ? new Date() : null,
      },
    });

    return updated;
  }
}

ManufacturingNotificationService.MFG_EVENTS = MFG_EVENTS;
ManufacturingNotificationService.DEFAULT_BODIES = DEFAULT_BODIES;
ManufacturingNotificationService.DEFAULT_SETTINGS = DEFAULT_SETTINGS;

module.exports = ManufacturingNotificationService;
