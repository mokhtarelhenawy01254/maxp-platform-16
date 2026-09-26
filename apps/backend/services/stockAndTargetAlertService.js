const { getSharedPrismaClient, safeQuery } = require("./sharedDatabase");
const WhatsAppNotificationService = require("./whatsapp/WhatsAppNotificationService");

/**
 * Service for automated monitoring of stock levels and order target alerts.
 */
class StockAndTargetAlertService {
  /**
   * Main check routine triggered by the cron scheduler.
   */
  async runDueChecks() {
    let checkedCompanies = 0;
    let targetAlertsSent = 0;
    let stockAlertsSent = 0;

    try {
      const companies = await safeQuery((prisma) =>
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

      if (!Array.isArray(companies)) {
        return { checkedCompanies: 0, targetAlertsSent: 0, stockAlertsSent: 0 };
      }

      for (const company of companies) {
        checkedCompanies++;
        const settings = this._parseSettings(company.settings);
        const targetConfig = settings.order_targets || {};

        if (!targetConfig.notify_whatsapp && targetConfig.notify_whatsapp !== undefined) {
          continue;
        }

        const recipientPhone = targetConfig.alert_phone || company.phone;
        if (!recipientPhone) {
          continue;
        }

        // 1. Check daily order target milestone
        const dailyTargetAlert = await this._evaluateDailyOrderTargets(company, targetConfig, recipientPhone);
        if (dailyTargetAlert) targetAlertsSent++;

        // 2. Check weekly order target milestone
        const weeklyTargetAlert = await this._evaluateWeeklyOrderTargets(company, targetConfig, recipientPhone);
        if (weeklyTargetAlert) targetAlertsSent++;

        // 3. Check low stock items
        const stockAlert = await this._evaluateStockLevels(company, targetConfig, recipientPhone);
        if (stockAlert) stockAlertsSent++;
      }
    } catch (err) {
      console.error("❌ [StockAndTargetAlertService] Execution error:", err);
    }

    return { checkedCompanies, targetAlertsSent, stockAlertsSent };
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
  async _evaluateOrderTargets(company, targetConfig, recipientPhone) {
    return this._evaluateDailyOrderTargets(company, targetConfig, recipientPhone);
  }

  async _evaluateDailyOrderTargets(company, targetConfig, recipientPhone) {
    const dailyTarget = Number(targetConfig.daily_orders) || 0;
    if (dailyTarget <= 0) return false;

    const now = new Date();
    const todayDateKey = now.toISOString().slice(0, 10);
    const lastNotifiedKey = targetConfig.last_notified_target_date;
    let notifiedMilestones = targetConfig.notified_milestones || [];

    // Reset milestones if new day
    if (lastNotifiedKey !== todayDateKey) {
      notifiedMilestones = [];
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const todayOrdersCount = await safeQuery((prisma) =>
      prisma.order.count({
        where: {
          companyId: company.id,
          createdAt: { gte: todayStart },
          status: { not: "CANCELLED" },
        },
      }),
    );

    const pct = Math.round((todayOrdersCount / dailyTarget) * 100);
    let milestoneToTrigger = null;

    if (todayOrdersCount >= dailyTarget && !notifiedMilestones.includes("100%")) {
      milestoneToTrigger = "100%";
    } else if (todayOrdersCount >= Math.floor(dailyTarget * 0.8) && !notifiedMilestones.includes("80%")) {
      milestoneToTrigger = "80%";
    } else if (todayOrdersCount >= Math.floor(dailyTarget * 0.5) && !notifiedMilestones.includes("50%")) {
      milestoneToTrigger = "50%";
    }

    if (!milestoneToTrigger) return false;

    // Compose alert message
    const message = this._formatTargetAlertMessage({
      storeName: company.name,
      milestone: milestoneToTrigger,
      actualOrders: todayOrdersCount,
      targetOrders: dailyTarget,
      percentage: pct,
    });

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      notifiedMilestones.push(milestoneToTrigger);
      await this._persistTargetMeta(company.id, {
        last_notified_target_date: todayDateKey,
        notified_milestones: notifiedMilestones,
      });
      return true;
    }
    return false;
  }

  async _evaluateWeeklyOrderTargets(company, targetConfig, recipientPhone) {
    const weeklyTarget = Number(targetConfig.weekly_orders) || 0;
    if (weeklyTarget <= 0) return false;

    const now = new Date();
    const weekStartDate = this.getWeekStartDate(now);
    const weekDateKey = weekStartDate.toISOString().slice(0, 10);
    const lastNotifiedWeekKey = targetConfig.last_notified_weekly_target_date;
    let notifiedWeeklyMilestones = targetConfig.notified_weekly_milestones || [];

    // Reset milestones if new week
    if (lastNotifiedWeekKey !== weekDateKey) {
      notifiedWeeklyMilestones = [];
    }

    const weekOrdersCount = await safeQuery((prisma) =>
      prisma.order.count({
        where: {
          companyId: company.id,
          createdAt: { gte: weekStartDate },
          status: { not: "CANCELLED" },
        },
      }),
    );

    const pct = Math.round((weekOrdersCount / weeklyTarget) * 100);
    let milestoneToTrigger = null;

    if (weekOrdersCount >= weeklyTarget && !notifiedWeeklyMilestones.includes("100%")) {
      milestoneToTrigger = "100%";
    } else if (weekOrdersCount >= Math.floor(weeklyTarget * 0.8) && !notifiedWeeklyMilestones.includes("80%")) {
      milestoneToTrigger = "80%";
    } else if (weekOrdersCount >= Math.floor(weeklyTarget * 0.5) && !notifiedWeeklyMilestones.includes("50%")) {
      milestoneToTrigger = "50%";
    }

    if (!milestoneToTrigger) return false;

    const remainingOrders = Math.max(0, weeklyTarget - weekOrdersCount);

    // Compose alert message
    const message = this._formatWeeklyTargetAlertMessage({
      storeName: company.name,
      milestone: milestoneToTrigger,
      actualOrders: weekOrdersCount,
      targetOrders: weeklyTarget,
      percentage: pct,
      remainingOrders,
    });

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      notifiedWeeklyMilestones.push(milestoneToTrigger);
      await this._persistTargetMeta(company.id, {
        last_notified_weekly_target_date: weekDateKey,
        notified_weekly_milestones: notifiedWeeklyMilestones,
      });
      return true;
    }
    return false;
  }

  async _evaluateStockLevels(company, targetConfig, recipientPhone) {
    const threshold = Number(targetConfig.min_stock_threshold) || 5;
    const now = new Date();
    const todayDateKey = now.toISOString().slice(0, 10);

    // Only alert for stock once every 24 hours unless critical change
    if (targetConfig.last_stock_alert_date === todayDateKey) {
      return false;
    }

    // Scan products
    const lowStockProducts = await safeQuery((prisma) =>
      prisma.product.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          isActive: true,
          trackInventory: true,
          stock: { lte: threshold },
        },
        select: {
          name: true,
          sku: true,
          stock: true,
        },
        orderBy: { stock: "asc" },
        take: 8,
      }),
    );

    // Scan variants
    const lowStockVariants = await safeQuery((prisma) =>
      prisma.productVariant.findMany({
        where: {
          product: { companyId: company.id, deletedAt: null, isActive: true },
          isActive: true,
          trackInventory: true,
          stock: { lte: threshold },
        },
        select: {
          name: true,
          sku: true,
          stock: true,
          product: { select: { name: true } },
        },
        orderBy: { stock: "asc" },
        take: 8,
      }),
    );

    const items = [];
    if (Array.isArray(lowStockProducts)) {
      for (const p of lowStockProducts) {
        items.push({
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

    // Sort by stock ascending
    items.sort((a, b) => a.stock - b.stock);
    const topItems = items.slice(0, 6);

    const message = this._formatStockAlertMessage({
      storeName: company.name,
      totalLowItems: items.length,
      items: topItems,
      threshold,
    });

    const sent = await this._sendWhatsApp(company.id, recipientPhone, message);
    if (sent) {
      await this._persistTargetMeta(company.id, {
        last_stock_alert_date: todayDateKey,
      });
      return true;
    }
    return false;
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
      const comp = await safeQuery((prisma) =>
        prisma.company.findUnique({
          where: { id: companyId },
          select: { settings: true },
        }),
      );
      const settings = this._parseSettings(comp?.settings);
      settings.order_targets = {
        ...(settings.order_targets || {}),
        ...metaUpdates,
      };

      await safeQuery((prisma) =>
        prisma.company.update({
          where: { id: companyId },
          data: { settings: JSON.stringify(settings) },
        }),
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
