const sharedDb = require("./sharedDatabase");
const WhatsAppNotificationService = require("./whatsapp/WhatsAppNotificationService");

/**
 * Service for automated monitoring of stock levels and order target alerts.
 */
class StockAndTargetAlertService {
  /**
   * Atomic idempotency gate (T00 §2.3)
   */
  async claim(companyId, alertKey, payload) {
    try {
      await sharedDb.safeQuery((prisma) =>
        prisma.aiRuntimeLedger.create({
          data: {
            companyId,
            idempotencyKey: alertKey,
            channel: "SYSTEM",
            status: "RUNNING",
            metadata: typeof payload === "string" ? payload : JSON.stringify(payload),
          },
        }),
      );
      return true;
    } catch (e) {
      if (
        e?.code === "P2002" ||
        e?.message?.includes("P2002") ||
        e?.message?.includes("Unique constraint")
      ) {
        return false;
      }
      throw e;
    }
  }

  async updateLedgerStatus(alertKey, status, extra = {}) {
    try {
      await sharedDb.safeQuery((prisma) =>
        prisma.aiRuntimeLedger.update({
          where: { idempotencyKey: alertKey },
          data: {
            status,
            completedAt: status === "COMPLETED" ? new Date() : null,
            ...extra,
          },
        }),
      );
    } catch (e) {
      console.warn(`⚠️ [StockAndTargetAlertService] Failed to update ledger status for ${alertKey}:`, e.message);
    }
  }

  /**
   * Main check routine triggered by the cron scheduler or manual route.
   */
  async runDueChecks(opts = {}) {
    let checkedCompanies = 0;
    let targetAlertsSent = 0;
    let stockAlertsSent = 0;
    let skipped = 0;
    const errors = [];

    const dryRun = Boolean(opts.dryRun);
    const force = Boolean(opts.force);

    let companies = [];
    try {
      if (opts.companyId) {
        const singleComp = await sharedDb.safeQuery((prisma) =>
          prisma.company.findUnique({
            where: { id: opts.companyId },
            select: {
              id: true,
              name: true,
              phone: true,
              settings: true,
              currency: true,
              isActive: true,
            },
          }),
        );
        if (singleComp) {
          companies = [singleComp];
        }
      } else {
        companies = await sharedDb.safeQuery((prisma) =>
          prisma.company.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              phone: true,
              settings: true,
              currency: true,
            },
          }),
        );
      }
    } catch (e) {
      console.error("❌ [StockAndTargetAlertService] Query companies error:", e);
      errors.push({ companyId: opts.companyId || "ALL", error: e.message });
      return { checkedCompanies: 0, targetAlertsSent: 0, stockAlertsSent: 0, skipped: 0, errors };
    }

    if (!Array.isArray(companies)) {
      return { checkedCompanies: 0, targetAlertsSent: 0, stockAlertsSent: 0, skipped: 0, errors: [] };
    }

    for (const company of companies) {
      checkedCompanies++;
      try {
        const settings = this._parseSettings(company.settings);
        const targetConfig = settings.order_targets || {};

        // Enabled check (§3.1 و): if undefined -> true; if false -> skip unless force
        const isEnabled = targetConfig.enabled !== undefined ? Boolean(targetConfig.enabled) : true;
        if (!isEnabled && !force) {
          skipped++;
          continue;
        }

        if (targetConfig.notify_whatsapp === false) {
          skipped++;
          continue;
        }

        const recipientPhone = targetConfig.alert_phone || company.phone;
        if (!recipientPhone) {
          skipped++;
          continue;
        }

        // 1. Check daily order target milestone
        const dailyTargetAlert = await this._evaluateDailyOrderTargets(
          company,
          targetConfig,
          recipientPhone,
          { dryRun },
        );
        if (dailyTargetAlert) targetAlertsSent++;

        // 2. Check weekly order target milestone
        const weeklyTargetAlert = await this._evaluateWeeklyOrderTargets(
          company,
          targetConfig,
          recipientPhone,
          { dryRun },
        );
        if (weeklyTargetAlert) targetAlertsSent++;

        // 3. Check low stock items
        const stockAlert = await this._evaluateStockLevels(
          company,
          targetConfig,
          recipientPhone,
          { dryRun },
        );
        if (stockAlert) stockAlertsSent++;

        // 4. Daily Scheduled Report check (if forced, or if due in Cairo timezone)
        const now = new Date();
        const cairoTimeStr = now.toLocaleTimeString("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" });
        const companyReportTime = targetConfig.report_time || "09:00";
        const isTimeDue = cairoTimeStr === companyReportTime;

        if (opts.includeDailyReport || force || isTimeDue) {
          const reportRes = await this.dispatchDailyReport(company.id, {
            dryRun,
            force: force || false,
          });
          if (reportRes.success && !reportRes.skipped) {
            targetAlertsSent++;
          }
        }
      } catch (err) {
        console.error(`❌ [StockAndTargetAlertService] Error checking company ${company.id}:`, err);
        errors.push({ companyId: company.id, error: err.message });
      }
    }

    return { checkedCompanies, targetAlertsSent, stockAlertsSent, skipped, errors };
  }

  async getSettings(companyId) {
    if (!companyId) {
      throw new Error("companyId is required");
    }
    const comp = await sharedDb.safeQuery((prisma) =>
      prisma.company.findUnique({
        where: { id: companyId },
        select: { phone: true, settings: true },
      }),
    );
    const parsed = this._parseSettings(comp?.settings);
    const stored = parsed.order_targets || {};
    return {
      enabled: stored.enabled !== undefined ? Boolean(stored.enabled) : false,
      daily_orders: Number(stored.daily_orders) || 0,
      weekly_orders: Number(stored.weekly_orders) || 0,
      monthly_orders: Number(stored.monthly_orders) || 0,
      daily_revenue: Number(stored.daily_revenue) || 0,
      weekly_revenue: Number(stored.weekly_revenue) || 0,
      monthly_revenue: Number(stored.monthly_revenue) || 0,
      min_stock_threshold: Number(stored.min_stock_threshold) || 5,
      report_time: stored.report_time || "09:00",
      alert_phone: stored.alert_phone || comp?.phone || null,
      notify_whatsapp: stored.notify_whatsapp !== undefined ? Boolean(stored.notify_whatsapp) : true,
      milestones: Array.isArray(stored.milestones) && stored.milestones.length > 0 ? stored.milestones : [50, 80, 100],
      last_notified_target_date: stored.last_notified_target_date || null,
      notified_milestones: stored.notified_milestones || [],
      last_notified_weekly_target_date: stored.last_notified_weekly_target_date || null,
      notified_weekly_milestones: stored.notified_weekly_milestones || [],
      last_stock_alert_date: stored.last_stock_alert_date || null,
      notified_stock_today: stored.notified_stock_today || null,
      last_daily_report_date: stored.last_daily_report_date || null,
    };
  }

  async updateSettings(companyId, patch) {
    if (!companyId) {
      throw new Error("companyId is required");
    }
    const validatedPatch = {};

    if (patch.enabled !== undefined) {
      validatedPatch.enabled = Boolean(patch.enabled);
    }
    if (patch.daily_orders !== undefined) {
      const v = Number(patch.daily_orders);
      if (isNaN(v) || v < 0) throw new Error("تارجت الأوردرات اليومي غير صالح");
      validatedPatch.daily_orders = Math.floor(v);
    }
    if (patch.weekly_orders !== undefined) {
      const v = Number(patch.weekly_orders);
      if (isNaN(v) || v < 0) throw new Error("تارجت الأوردرات الأسبوعي غير صالح");
      validatedPatch.weekly_orders = Math.floor(v);
    }
    if (patch.monthly_orders !== undefined) {
      const v = Number(patch.monthly_orders);
      if (isNaN(v) || v < 0) throw new Error("تارجت الأوردرات الشهري غير صالح");
      validatedPatch.monthly_orders = Math.floor(v);
    }
    if (patch.daily_revenue !== undefined) {
      const v = Number(patch.daily_revenue);
      if (isNaN(v) || v < 0) throw new Error("تارجت الإيراد اليومي غير صالح");
      validatedPatch.daily_revenue = v;
    }
    if (patch.weekly_revenue !== undefined) {
      const v = Number(patch.weekly_revenue);
      if (isNaN(v) || v < 0) throw new Error("تارجت الإيراد الأسبوعي غير صالح");
      validatedPatch.weekly_revenue = v;
    }
    if (patch.monthly_revenue !== undefined) {
      const v = Number(patch.monthly_revenue);
      if (isNaN(v) || v < 0) throw new Error("تارجت الإيراد الشهري غير صالح");
      validatedPatch.monthly_revenue = v;
    }
    if (patch.min_stock_threshold !== undefined) {
      const v = Number(patch.min_stock_threshold);
      if (isNaN(v) || v <= 0) throw new Error("الحد الأدنى للمخزون يجب أن يكون أكبر من صفر");
      validatedPatch.min_stock_threshold = Math.floor(v);
    }
    if (patch.report_time !== undefined) {
      const t = String(patch.report_time).trim();
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(t)) {
        throw new Error("وقت التقرير غير صالح (الصيغة المطلوبة HH:mm)");
      }
      validatedPatch.report_time = t;
    }
    if (patch.alert_phone !== undefined) {
      validatedPatch.alert_phone = patch.alert_phone ? String(patch.alert_phone).trim() : null;
    }
    if (patch.notify_whatsapp !== undefined) {
      validatedPatch.notify_whatsapp = Boolean(patch.notify_whatsapp);
    }
    if (patch.milestones !== undefined) {
      if (!Array.isArray(patch.milestones) || patch.milestones.length === 0) {
        throw new Error("مراحل التنبيه لا يمكن أن تكون فارغة");
      }
      const cleaned = patch.milestones
        .map((m) => Number(String(m).replace("%", "")))
        .filter((n) => !isNaN(n) && n > 0);
      if (cleaned.length === 0) {
        throw new Error("مراحل التنبيه لا يمكن أن تكون فارغة");
      }
      validatedPatch.milestones = cleaned;
    }

    await this._persistTargetMeta(companyId, validatedPatch);
    const updatedSettings = await this.getSettings(companyId);

    // Sync node-cron scheduled job in aiCronSchedulerService
    try {
      const aiCronSchedulerService = require("./aiCronSchedulerService");
      if (aiCronSchedulerService && typeof aiCronSchedulerService.syncStockTargetCronJob === "function") {
        await aiCronSchedulerService.syncStockTargetCronJob(companyId, updatedSettings);
      }
    } catch (schedErr) {
      console.warn("⚠️ [StockAndTargetAlertService] Cron sync warning:", schedErr.message);
    }

    return updatedSettings;
  }

  getWeekStartDate(now = new Date()) {
    const date = new Date(now);
    // Saturday as week start in Egypt / MENA retail calendar
    const day = date.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const diff = (day + 1) % 7;
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Alias for backward compatibility
  async _evaluateOrderTargets(company, targetConfig, recipientPhone, options = {}) {
    return this._evaluateDailyOrderTargets(company, targetConfig, recipientPhone, options);
  }

  async _evaluateDailyOrderTargets(company, targetConfig, recipientPhone, options = {}) {
    const dailyTarget = Number(targetConfig.daily_orders) || 0;
    if (dailyTarget <= 0) return false;

    const dryRun = Boolean(options.dryRun);
    const now = new Date();
    const todayDateKey = now.toISOString().slice(0, 10);
    const lastNotifiedKey = targetConfig.last_notified_target_date;
    let notifiedMilestones = Array.isArray(targetConfig.notified_milestones)
      ? [...targetConfig.notified_milestones]
      : [];

    // Reset milestones if new day
    if (lastNotifiedKey !== todayDateKey) {
      notifiedMilestones = [];
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const todayOrdersCount = await sharedDb.safeQuery((prisma) =>
      prisma.order.count({
        where: {
          companyId: company.id,
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
      }),
    );

    const pct = Math.round((todayOrdersCount / dailyTarget) * 100);

    const rawMilestones =
      Array.isArray(targetConfig.milestones) && targetConfig.milestones.length > 0
        ? targetConfig.milestones
        : [50, 80, 100];
    const milestones = rawMilestones
      .map((m) => Number(String(m).replace("%", "")))
      .filter((n) => !isNaN(n) && n > 0);

    // Calculate highest reached milestone
    const reached = milestones.filter((m) => pct >= m).sort((a, b) => b - a)[0];
    if (!reached) return false;

    const milestoneToTrigger = `${reached}%`;
    if (
      notifiedMilestones.includes(milestoneToTrigger) ||
      notifiedMilestones.includes(reached) ||
      notifiedMilestones.includes(String(reached))
    ) {
      return false;
    }

    const alertKey = `target:${company.id}:daily:${todayDateKey}:${reached}`;
    const payload = {
      period: "daily",
      milestone: milestoneToTrigger,
      actualOrders: todayOrdersCount,
      targetOrders: dailyTarget,
      pct,
      dryRun,
    };

    const claimed = await this.claim(company.id, alertKey, payload);
    if (!claimed) {
      return false;
    }

    const message = this._formatTargetAlertMessage({
      storeName: company.name,
      milestone: milestoneToTrigger,
      actualOrders: todayOrdersCount,
      targetOrders: dailyTarget,
      percentage: pct,
    });

    if (dryRun) {
      try {
        await sharedDb.safeQuery((prisma) =>
          prisma.aiNotification.create({
            data: {
              companyId: company.id,
              type: "AGENT_TARGET_MILESTONE",
              severity: "medium",
              title: `تارجت daily ${reached}%`,
              message,
              metadata: JSON.stringify({
                slug: "stock-target-monitor-agent",
                alertKey,
                period: "daily",
                dryRun: true,
              }),
            },
          }),
        );
      } catch (nErr) {
        console.warn(`[StockAndTargetAlertService] AiNotification create error:`, nErr.message);
      }
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      const updatedNotified = [...new Set([...notifiedMilestones, milestoneToTrigger])];
      await this._persistTargetMeta(company.id, {
        last_notified_target_date: todayDateKey,
        notified_milestones: updatedNotified,
      });
      return true;
    }

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      try {
        await sharedDb.safeQuery((prisma) =>
          prisma.aiNotification.create({
            data: {
              companyId: company.id,
              type: "AGENT_TARGET_MILESTONE",
              severity: "medium",
              title: `تارجت daily ${reached}%`,
              message,
              metadata: JSON.stringify({
                slug: "stock-target-monitor-agent",
                alertKey,
                period: "daily",
              }),
            },
          }),
        );
      } catch (nErr) {
        console.warn(`[StockAndTargetAlertService] AiNotification create error:`, nErr.message);
      }
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      const updatedNotified = [...new Set([...notifiedMilestones, milestoneToTrigger])];
      await this._persistTargetMeta(company.id, {
        last_notified_target_date: todayDateKey,
        notified_milestones: updatedNotified,
      });
      return true;
    } else {
      await this.updateLedgerStatus(alertKey, "FAILED");
      return false;
    }
  }

  async _evaluateWeeklyOrderTargets(company, targetConfig, recipientPhone, options = {}) {
    const weeklyTarget = Number(targetConfig.weekly_orders) || 0;
    if (weeklyTarget <= 0) return false;

    const dryRun = Boolean(options.dryRun);
    const now = new Date();
    const weekStartDate = this.getWeekStartDate(now);
    const weekDateKey = weekStartDate.toISOString().slice(0, 10);
    const lastNotifiedWeekKey = targetConfig.last_notified_weekly_target_date;
    let notifiedWeeklyMilestones = Array.isArray(targetConfig.notified_weekly_milestones)
      ? [...targetConfig.notified_weekly_milestones]
      : [];

    // Reset milestones if new week
    if (lastNotifiedWeekKey !== weekDateKey) {
      notifiedWeeklyMilestones = [];
    }

    const weekOrdersCount = await sharedDb.safeQuery((prisma) =>
      prisma.order.count({
        where: {
          companyId: company.id,
          createdAt: { gte: weekStartDate },
          status: { not: "CANCELLED" },
        },
      }),
    );

    const pct = Math.round((weekOrdersCount / weeklyTarget) * 100);

    const rawMilestones =
      Array.isArray(targetConfig.milestones) && targetConfig.milestones.length > 0
        ? targetConfig.milestones
        : [50, 80, 100];
    const milestones = rawMilestones
      .map((m) => Number(String(m).replace("%", "")))
      .filter((n) => !isNaN(n) && n > 0);

    const reached = milestones.filter((m) => pct >= m).sort((a, b) => b - a)[0];
    if (!reached) return false;

    const milestoneToTrigger = `${reached}%`;
    if (
      notifiedWeeklyMilestones.includes(milestoneToTrigger) ||
      notifiedWeeklyMilestones.includes(reached) ||
      notifiedWeeklyMilestones.includes(String(reached))
    ) {
      return false;
    }

    const alertKey = `target:${company.id}:weekly:${weekDateKey}:${reached}`;
    const payload = {
      period: "weekly",
      milestone: milestoneToTrigger,
      actualOrders: weekOrdersCount,
      targetOrders: weeklyTarget,
      pct,
      dryRun,
    };

    const claimed = await this.claim(company.id, alertKey, payload);
    if (!claimed) {
      return false;
    }

    const remainingOrders = Math.max(0, weeklyTarget - weekOrdersCount);
    const message = this._formatWeeklyTargetAlertMessage({
      storeName: company.name,
      milestone: milestoneToTrigger,
      actualOrders: weekOrdersCount,
      targetOrders: weeklyTarget,
      percentage: pct,
      remainingOrders,
    });

    if (dryRun) {
      try {
        await sharedDb.safeQuery((prisma) =>
          prisma.aiNotification.create({
            data: {
              companyId: company.id,
              type: "AGENT_TARGET_MILESTONE",
              severity: "medium",
              title: `تارجت weekly ${reached}%`,
              message,
              metadata: JSON.stringify({
                slug: "stock-target-monitor-agent",
                alertKey,
                period: "weekly",
                dryRun: true,
              }),
            },
          }),
        );
      } catch (nErr) {
        console.warn(`[StockAndTargetAlertService] AiNotification create error:`, nErr.message);
      }
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      const updatedWeekly = [...new Set([...notifiedWeeklyMilestones, milestoneToTrigger])];
      await this._persistTargetMeta(company.id, {
        last_notified_weekly_target_date: weekDateKey,
        notified_weekly_milestones: updatedWeekly,
      });
      return true;
    }

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      try {
        await sharedDb.safeQuery((prisma) =>
          prisma.aiNotification.create({
            data: {
              companyId: company.id,
              type: "AGENT_TARGET_MILESTONE",
              severity: "medium",
              title: `تارجت weekly ${reached}%`,
              message,
              metadata: JSON.stringify({
                slug: "stock-target-monitor-agent",
                alertKey,
                period: "weekly",
              }),
            },
          }),
        );
      } catch (nErr) {
        console.warn(`[StockAndTargetAlertService] AiNotification create error:`, nErr.message);
      }
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      const updatedWeekly = [...new Set([...notifiedWeeklyMilestones, milestoneToTrigger])];
      await this._persistTargetMeta(company.id, {
        last_notified_weekly_target_date: weekDateKey,
        notified_weekly_milestones: updatedWeekly,
      });
      return true;
    } else {
      await this.updateLedgerStatus(alertKey, "FAILED");
      return false;
    }
  }

  async _evaluateStockLevels(company, targetConfig, recipientPhone, options = {}) {
    const threshold = Number(targetConfig.min_stock_threshold) || 5;
    const dryRun = Boolean(options.dryRun);
    const now = new Date();
    const todayDateKey = now.toISOString().slice(0, 10);
    const alertKey = `stock:${company.id}:${todayDateKey}`;

    // Scan products
    const lowStockProducts = await sharedDb.safeQuery((prisma) =>
      prisma.product.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          isActive: true,
          trackInventory: true,
          stock: { lte: threshold },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
        },
        orderBy: { stock: "asc" },
        take: 12,
      }),
    );

    // Scan variants
    const lowStockVariants = await sharedDb.safeQuery((prisma) =>
      prisma.productVariant.findMany({
        where: {
          product: { companyId: company.id, deletedAt: null, isActive: true },
          isActive: true,
          trackInventory: true,
          stock: { lte: threshold },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          product: { select: { name: true } },
        },
        orderBy: { stock: "asc" },
        take: 12,
      }),
    );

    const items = [];
    if (Array.isArray(lowStockProducts)) {
      for (const p of lowStockProducts) {
        items.push({
          id: p.id,
          name: p.name,
          sku: p.sku || "N/A",
          stock: p.stock,
          isVariant: false,
        });
      }
    }

    if (Array.isArray(lowStockVariants)) {
      for (const v of lowStockVariants) {
        items.push({
          id: v.id,
          name: `${v.product?.name || ""} (${v.name})`,
          sku: v.sku || "N/A",
          stock: v.stock,
          isVariant: true,
        });
      }
    }

    if (items.length === 0) {
      return false;
    }

    // Rule: "منع التكرار: نفس التنبيه لنفس المنتج مايتكررش في نفس اليوم. منتج تحت الحد يظهر مرة واحدة"
    const alreadyNotifiedItemIds = new Set(
      targetConfig.notified_stock_today?.date === todayDateKey
        ? (targetConfig.notified_stock_today.itemIds || [])
        : []
    );

    const newItems = items.filter((it) => !alreadyNotifiedItemIds.has(it.id));
    if (newItems.length === 0) {
      return false; // All low-stock products have already been alerted today!
    }

    const payload = {
      type: "stock",
      threshold,
      totalLowItems: newItems.length,
      dryRun,
    };

    const claimed = await this.claim(company.id, alertKey, payload);
    if (!claimed) {
      return false;
    }

    // Sort by stock ascending
    newItems.sort((a, b) => a.stock - b.stock);
    const topItems = newItems.slice(0, 6);

    const message = this._formatStockAlertMessage({
      storeName: company.name,
      totalLowItems: newItems.length,
      items: topItems,
      threshold,
    });

    const updatedNotifiedIds = [...alreadyNotifiedItemIds, ...newItems.map((i) => i.id)];

    if (dryRun) {
      await this._createNotifications(company.id, company.name, message, alertKey, {
        slug: "stock-target-monitor-agent",
        totalLowItems: newItems.length,
        dryRun: true,
      });
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      await this._persistTargetMeta(company.id, {
        last_stock_alert_date: todayDateKey,
        notified_stock_today: {
          date: todayDateKey,
          itemIds: updatedNotifiedIds,
        },
      });
      return true;
    }

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      await this._createNotifications(company.id, company.name, message, alertKey, {
        slug: "stock-target-monitor-agent",
        totalLowItems: newItems.length,
      });
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      await this._persistTargetMeta(company.id, {
        last_stock_alert_date: todayDateKey,
        notified_stock_today: {
          date: todayDateKey,
          itemIds: updatedNotifiedIds,
        },
      });
      return true;
    } else {
      await this.updateLedgerStatus(alertKey, "FAILED");
      return false;
    }
  }

  /**
   * Dispatches the comprehensive scheduled daily report:
   * - Month orders count vs monthly target + achievement % (queried directly from PostgreSQL DB, zero cache)
   * - Stock under threshold items (with strict per-product deduplication per day: no item repeated on the same day)
   * - Multi-channel delivery: WhatsApp + Platform Notification Center + Agent Automation Profile
   */
  async dispatchDailyReport(companyId, options = {}) {
    if (!companyId) throw new Error("companyId is required");
    const dryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);

    const company = await sharedDb.safeQuery((prisma) =>
      prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, phone: true, settings: true, isActive: true },
      }),
    );

    if (!company || !company.isActive) {
      return { success: false, skipped: true, reason: "COMPANY_NOT_FOUND_OR_INACTIVE" };
    }

    const settings = this._parseSettings(company.settings);
    const targetConfig = settings.order_targets || {};

    const isEnabled = targetConfig.enabled !== undefined ? Boolean(targetConfig.enabled) : true;
    if (!isEnabled && !force) {
      return { success: false, skipped: true, reason: "AGENT_DISABLED" };
    }

    const minStockThreshold = Number(targetConfig.min_stock_threshold) || 0;
    const monthlyTarget = Number(targetConfig.monthly_orders) || 0;

    // Rule: "ممنوع: تنبيه بدون حد متظبط"
    if (minStockThreshold <= 0 && monthlyTarget <= 0) {
      return { success: false, skipped: true, reason: "NO_LIMITS_CONFIGURED" };
    }

    const now = new Date();
    const todayDateKey = now.toISOString().slice(0, 10);
    const alertKey = `daily_report:${company.id}:${todayDateKey}`;

    // Claim idempotency gate unless force
    if (!force) {
      const claimed = await this.claim(company.id, alertKey, {
        type: "daily_report",
        todayDateKey,
        dryRun,
      });
      if (!claimed) {
        return { success: false, skipped: true, reason: "ALREADY_SENT_TODAY" };
      }
    }

    // Direct PostgreSQL queries (Zero cache)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const [monthOrdersCount, todayOrdersCount] = await Promise.all([
      sharedDb.safeQuery((prisma) =>
        prisma.order.count({
          where: {
            companyId: company.id,
            createdAt: { gte: monthStart },
            status: { not: "CANCELLED" },
          },
        }),
      ),
      sharedDb.safeQuery((prisma) =>
        prisma.order.count({
          where: {
            companyId: company.id,
            createdAt: { gte: todayStart },
            status: { not: "CANCELLED" },
          },
        }),
      ),
    ]);

    // Query Stock under threshold
    let newLowItems = [];
    let allLowItems = [];
    const alreadyNotifiedItemIds = new Set(
      targetConfig.notified_stock_today?.date === todayDateKey
        ? (targetConfig.notified_stock_today.itemIds || [])
        : []
    );

    if (minStockThreshold > 0) {
      const [lowProducts, lowVariants] = await Promise.all([
        sharedDb.safeQuery((prisma) =>
          prisma.product.findMany({
            where: {
              companyId: company.id,
              deletedAt: null,
              isActive: true,
              trackInventory: true,
              stock: { lte: minStockThreshold },
            },
            select: { id: true, name: true, sku: true, stock: true },
            orderBy: { stock: "asc" },
            take: 20,
          }),
        ),
        sharedDb.safeQuery((prisma) =>
          prisma.productVariant.findMany({
            where: {
              product: { companyId: company.id, deletedAt: null, isActive: true },
              isActive: true,
              trackInventory: true,
              stock: { lte: minStockThreshold },
            },
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true,
              product: { select: { name: true } },
            },
            orderBy: { stock: "asc" },
            take: 20,
          }),
        ),
      ]);

      if (Array.isArray(lowProducts)) {
        for (const p of lowProducts) {
          allLowItems.push({
            id: p.id,
            name: p.name,
            sku: p.sku || "N/A",
            stock: p.stock,
            isVariant: false,
          });
        }
      }

      if (Array.isArray(lowVariants)) {
        for (const v of lowVariants) {
          allLowItems.push({
            id: v.id,
            name: `${v.product?.name || ""} (${v.name})`,
            sku: v.sku || "N/A",
            stock: v.stock,
            isVariant: true,
          });
        }
      }

      // Sort by stock ascending
      allLowItems.sort((a, b) => a.stock - b.stock);

      // Rule: "منع التكرار: نفس التنبيه لنفس المنتج مايتكررش في نفس اليوم. منتج تحت الحد يظهر مرة واحدة"
      newLowItems = allLowItems.filter((item) => !alreadyNotifiedItemIds.has(item.id));
    }

    const pct = monthlyTarget > 0 ? Math.round((monthOrdersCount / monthlyTarget) * 100) : 0;
    const remainingOrders = Math.max(0, monthlyTarget - monthOrdersCount);

    // Format daily report text
    const message = this._formatDailyReportMessage({
      storeName: company.name,
      monthlyTarget,
      monthOrdersCount,
      todayOrdersCount,
      percentage: pct,
      remainingOrders,
      minStockThreshold,
      items: newLowItems.slice(0, 8),
      totalLowItems: newLowItems.length,
      hasStockChecked: minStockThreshold > 0,
      allStockLowCount: allLowItems.length,
    });

    const recipientPhone = targetConfig.alert_phone || company.phone;
    let deliveredWhatsApp = false;
    let deliveredNotification = false;

    const updatedNotifiedStock = {
      date: todayDateKey,
      itemIds: [...alreadyNotifiedItemIds, ...newLowItems.map((i) => i.id)],
    };

    if (dryRun) {
      deliveredNotification = await this._createNotifications(company.id, company.name, message, alertKey, {
        monthlyTarget,
        monthOrdersCount,
        pct,
        lowStockCount: newLowItems.length,
        dryRun: true,
      });
      await this.updateLedgerStatus(alertKey, "COMPLETED");
      await this._persistTargetMeta(company.id, {
        last_daily_report_date: todayDateKey,
        notified_stock_today: updatedNotifiedStock,
      });
      return {
        success: true,
        dryRun: true,
        messageText: message,
        deliveredWhatsApp: false,
        deliveredNotification: true,
        metrics: {
          monthOrdersCount,
          monthlyTarget,
          achievementPct: pct,
          todayOrdersCount,
          newLowItemsCount: newLowItems.length,
          allLowItemsCount: allLowItems.length,
        },
      };
    }

    // Send WhatsApp notification
    if (targetConfig.notify_whatsapp !== false && recipientPhone) {
      deliveredWhatsApp = await this._sendWhatsApp(company.id, recipientPhone, message);
    }

    // Deliver to platform notifications screen and agent automation tab
    deliveredNotification = await this._createNotifications(company.id, company.name, message, alertKey, {
      monthlyTarget,
      monthOrdersCount,
      pct,
      lowStockCount: newLowItems.length,
    });

    await this.updateLedgerStatus(alertKey, deliveredWhatsApp || deliveredNotification ? "COMPLETED" : "FAILED");

    // Atomically persist meta to guarantee per-product daily deduplication
    await this._persistTargetMeta(company.id, {
      last_daily_report_date: todayDateKey,
      notified_stock_today: updatedNotifiedStock,
    });

    return {
      success: deliveredWhatsApp || deliveredNotification,
      messageText: message,
      deliveredWhatsApp,
      deliveredNotification,
      metrics: {
        monthOrdersCount,
        monthlyTarget,
        achievementPct: pct,
        todayOrdersCount,
        newLowItemsCount: newLowItems.length,
        allLowItemsCount: allLowItems.length,
      },
    };
  }

  async _createNotifications(companyId, companyName, message, alertKey, meta = {}) {
    let created = false;
    // 1. Agent Notification (for Agent Profile automation tab & agent alerts)
    try {
      await sharedDb.safeQuery((prisma) =>
        prisma.aiNotification.create({
          data: {
            companyId,
            type: "AGENT_TARGET_MILESTONE",
            severity: "medium",
            title: `تقرير المتابعة والأهداف — ${companyName}`,
            message,
            metadata: JSON.stringify({
              slug: "stock-target-monitor-agent",
              alertKey,
              ...meta,
            }),
          },
        }),
      );
      created = true;
    } catch (e) {
      console.warn("⚠️ [StockAndTargetAlertService] AiNotification create error:", e.message);
    }

    // 2. Platform Notification (for platform Notifications screen /notifications)
    try {
      await sharedDb.safeQuery(async (prisma) => {
        if (prisma.notification && typeof prisma.notification.create === "function") {
          return await prisma.notification.create({
            data: {
              companyId,
              userId: null,
              type: "STOCK_TARGET_DAILY_REPORT",
              title: "تقرير المتابعة والأهداف اليومي",
              message,
              severity: "info",
              read: false,
            },
          });
        }
        return Promise.resolve();
      });
      created = true;
    } catch (e) {
      console.warn("⚠️ [StockAndTargetAlertService] Notification table create error:", e.message);
    }

    return created;
  }

  _formatDailyReportMessage({
    storeName,
    monthlyTarget,
    monthOrdersCount,
    todayOrdersCount,
    percentage,
    remainingOrders,
    minStockThreshold,
    items,
    totalLowItems,
    hasStockChecked,
    allStockLowCount,
  }) {
    const todayStr = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let msg = `📊 تقرير المتابعة والأهداف اليومي — متجر ${storeName}\n📅 ${todayStr}\n\n`;

    if (monthlyTarget > 0) {
      const badge = percentage >= 100 ? "🎉 (تم تحقيق التارجت!)" : percentage >= 80 ? "🔥 (أداء ممتاز)" : "⏳";
      msg += `🎯 تارجت أوردرات الشهر:\n`;
      msg += `• الهدف الشهري: ${monthlyTarget} أوردر\n`;
      msg += `• المحقق من الداتابيز: ${monthOrdersCount} أوردر\n`;
      msg += `• نسبة الإنجاز: ${percentage}% ${badge}\n`;
      msg += `• المتبقي لتحقيق الهدف: ${remainingOrders} أوردر\n`;
      msg += `• أوردرات اليوم المحققة: ${todayOrdersCount} أوردر\n\n`;
    }

    if (hasStockChecked) {
      msg += `📦 رصيد المخزون (الحد الأدنى: ${minStockThreshold} قطع):\n`;
      if (totalLowItems > 0) {
        msg += `⚠️ يوجد ${totalLowItems} صنف وصل للحد الأدنى أو قارب على النفاد:\n`;
        for (const it of items) {
          msg += `• ${it.name}: المتبقي ${it.stock} قطعة ${it.stock <= 0 ? "(نافد)" : ""}\n`;
        }
        msg += `يُرجى تجهيز أذون التوريد لتجنب توقف المبيعات.\n`;
      } else if (allStockLowCount > 0) {
        msg += `ℹ️ تم تنبيهك سابقاً اليوم بالأصناف المنخفضة، ولا توجد أصناف جديدة انخفضت.\n`;
      } else {
        msg += `✅ مستويات المخزون ممتازة لجميع الأصناف، لا توجد نواقص تحت الحد الأدنى حالياً.\n`;
      }
    }

    msg += `\n⚡ تقرير تلقائي صادر عن مساعد المتابعة والأهداف — MaxPerformance`;
    return msg;
  }

  _formatTargetAlertMessage({ storeName, milestone, actualOrders, targetOrders, percentage }) {
    if (milestone === "100%") {
      return `مرحباً، متجر ${storeName}.\n\nتم تحقيق تارجت اليوم بنجاح بنسبة 100%!\n\n- إجمالي الأوردرات المحققة: ${actualOrders}\n- الهدف المستهدف: ${targetOrders}\n- نسبة الإنجاز: ${percentage}%\n\nاستمروا في التقدم لمضاعفة النتائج حتى نهاية اليوم.`;
    }
    return `مرحباً، متجر ${storeName}.\n\nتحديث أداء المبيعات: تم الوصول إلى ${milestone} من تارجت اليوم.\n\n- الأوردرات الحالية: ${actualOrders} من ${targetOrders}\n- نسبة الإنجاز: ${percentage}%\n- المتبقي لتحقيق الهدف: ${Math.max(0, targetOrders - actualOrders)} أوردر.`;
  }

  _formatWeeklyTargetAlertMessage({ storeName, milestone, actualOrders, targetOrders, percentage, remainingOrders }) {
    if (milestone === "100%") {
      return `مرحباً، متجر ${storeName}.\n\nتم تحقيق تارجت الأسبوع بنجاح بنسبة 100%!\n\n- إجمالي أوردرات الأسبوع المحققة: ${actualOrders}\n- الهدف الأسبوعي المستهدف: ${targetOrders}\n- نسبة الإنجاز: ${percentage}%\n\nاستمروا في التقدم لمضاعفة النتائج حتى نهاية الأسبوع.`;
    }
    return `مرحباً، متجر ${storeName}.\n\nتحديث أداء المبيعات الأسبوعي: تم الوصول إلى ${milestone} من تارجت الأسبوع.\n\n- الأوردرات المحققة هذا الأسبوع: ${actualOrders} من ${targetOrders}\n- نسبة الإنجاز الأسبوعي: ${percentage}%\n- المتبقي لتحقيق الهدف الأسبوعي: ${remainingOrders} أوردر.`;
  }

  _formatStockAlertMessage({ storeName, totalLowItems, items, threshold }) {
    const listLines = items
      .map((it) => `• ${it.name}: المتبقي ${it.stock} قطعة ${it.stock <= 0 ? "(نافد)" : ""}`)
      .join("\n");

    return `تنبيه رصيد المخزون — متجر ${storeName}\n\nيوجد ${totalLowItems} صنف قارب على النفاد أو نفد تماماً (الحد الأدنى: ${threshold} قطع):\n\n${listLines}\n\nيُرجى مراجعة المخزون وتجهيز أذون التوريد لتجنب توقف المبيعات.`;
  }

  async _sendWhatsApp(companyId, recipientPhone, message) {
    try {
      const res = await WhatsAppNotificationService.sendNotification({
        companyId,
        recipientPhone,
        recipientName: "مدير المتجر",
        recipientType: "ADMIN",
        category: "SYSTEM",
        eventType: "ANNOUNCEMENT",
        contentOverride: message,
        priority: 1,
      });
      return res && res.success !== false;
    } catch (e) {
      console.error(`⚠️ [StockAndTargetAlertService] WhatsApp send failed for company ${companyId}:`, e.message);
      return false;
    }
  }

  async _persistTargetMeta(companyId, metaUpdates) {
    try {
      const sql = `
        UPDATE companies
        SET settings = jsonb_set(
              COALESCE(NULLIF(settings,'')::jsonb, '{}'::jsonb),
              '{order_targets}',
              COALESCE(COALESCE(NULLIF(settings,'')::jsonb,'{}'::jsonb)->'order_targets', '{}'::jsonb) || $1::jsonb
            )::text,
            "updatedAt" = NOW()
        WHERE id = $2;
      `;
      await sharedDb.safeQuery((prisma) =>
        prisma.$executeRawUnsafe(sql, JSON.stringify(metaUpdates), companyId),
      );
    } catch (e) {
      console.error(`⚠️ [StockAndTargetAlertService] Failed to persist meta:`, e.message);
    }
  }

  _parseSettings(raw) {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

module.exports = new StockAndTargetAlertService();
