const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  DEFAULT_NOTIFICATION_TYPES,
  getNotificationSettingsForUser,
  saveNotificationSettingsForUser,
} = require("../services/notificationPreferencesService");
const {
  deactivateBrowserPushSubscription,
  getBrowserPushPublicKey,
  sendBrowserPushToUser,
  upsertBrowserPushSubscription,
} = require("../services/browserPushService");

const getRequestUserContext = (req) => ({
  userId: String(req.user?.id || req.params.userId || ""),
  companyId: String(req.user?.companyId || req.user?.company?.id || ""),
  email: req.user?.email || "",
  timezone: req.user?.timezone || req.user?.company?.timezone || "Africa/Cairo",
});

const notificationController = {
  getSettings: async (req, res) => {
    try {
      const context = getRequestUserContext(req);
      const settings = await getNotificationSettingsForUser(context);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Error getting notification settings:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب إعدادات الإشعارات",
      });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const context = getRequestUserContext(req);
      const settings = await saveNotificationSettingsForUser({
        ...context,
        incomingSettings: req.body,
      });

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء تحديث إعدادات الإشعارات",
      });
    }
  },

  getTypes: async (_req, res) => {
    try {
      res.json({
        success: true,
        data: DEFAULT_NOTIFICATION_TYPES,
      });
    } catch (error) {
      console.error("Error getting notification types:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب أنواع الإشعارات",
      });
    }
  },

  getStats: async (_req, res) => {
    try {
      res.json({
        success: true,
        data: {
          delivered: {
            total: 0,
            byChannel: {
              push: 0,
              email: 0,
              sms: 0,
              inApp: 0,
              browser: 0,
            },
          },
          engagement: {
            openRate: 0,
            clickRate: 0,
            responseTime: 0,
          },
          preferences: {
            mostUsedChannel: "browser",
            quietHoursActive: false,
          },
          trends: [],
        },
      });
    } catch (error) {
      console.error("Error getting notification stats:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء جلب إحصائيات الإشعارات",
      });
    }
  },

  getBrowserPushPublicKey: async (_req, res) => {
    try {
      res.json({
        success: true,
        data: {
          publicKey: getBrowserPushPublicKey(),
        },
      });
    } catch (error) {
      console.error("Error getting browser push public key:", error);
      res.status(500).json({
        success: false,
        error: "تعذر تجهيز Web Push الآن",
      });
    }
  },

  subscribeBrowserPush: async (req, res) => {
    try {
      const { userId, companyId } = getRequestUserContext(req);
      const { subscription, userAgent } = req.body || {};

      if (!subscription?.endpoint) {
        return res.status(400).json({
          success: false,
          error: "بيانات اشتراك المتصفح غير مكتملة",
        });
      }

      const record = await upsertBrowserPushSubscription({
        companyId,
        userId,
        subscription,
        userAgent,
      });

      res.json({
        success: true,
        data: {
          id: record.id,
          endpoint: record.endpoint,
          isActive: record.isActive,
        },
      });
    } catch (error) {
      console.error("Error subscribing browser push:", error);
      res.status(500).json({
        success: false,
        error: "تعذر تفعيل إشعارات المتصفح الخلفية",
      });
    }
  },

  unsubscribeBrowserPush: async (req, res) => {
    try {
      const { userId, companyId } = getRequestUserContext(req);
      const { endpoint } = req.body || {};
      const result = await deactivateBrowserPushSubscription({
        companyId,
        userId,
        endpoint,
      });

      res.json({
        success: true,
        data: {
          updated: result.count,
        },
      });
    } catch (error) {
      console.error("Error unsubscribing browser push:", error);
      res.status(500).json({
        success: false,
        error: "تعذر إيقاف إشعارات المتصفح الخلفية",
      });
    }
  },

  testNotification: async (req, res) => {
    try {
      const { userId, companyId } = getRequestUserContext(req);
      const { testConfig } = req.body || {};
      const typeId = testConfig?.type || "order_created";
      const channel = testConfig?.channel || "browser";
      const forceVisibleNotification =
        testConfig?.forceVisibleNotification === true;
      const requireInteraction =
        testConfig?.requireInteraction === true ? true : undefined;
      const explicitTag =
        typeof testConfig?.tag === "string" && testConfig.tag.trim().length > 0
          ? testConfig.tag.trim()
          : undefined;

      if (channel === "browser") {
        const result = await sendBrowserPushToUser({
          companyId,
          userId,
          typeId,
          title: testConfig?.title || "تجربة إشعار المتصفح",
          body: testConfig?.message || "تم إرسال إشعار اختباري بنجاح",
          compactBody: "تم إرسال إشعار اختباري",
          tag: explicitTag,
          requireInteraction,
          forceVisibleNotification,
          url: "/notification-settings",
          data: {
            source: "notification_test",
            forceVisibleNotification,
          },
        });

        if (!result.sent) {
          return res.status(400).json({
            success: false,
            error:
              "تم حفظ الإعدادات لكن لا يوجد اشتراك Push نشط لهذا المستخدم بعد.",
          });
        }
      }

      res.json({
        success: true,
        message: "تم إرسال الإشعار التجريبي بنجاح",
      });
    } catch (error) {
      console.error("Error testing notification:", error);
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء إرسال الإشعار التجريبي",
      });
    }
  },
};

router.get("/types", requireAuth, notificationController.getTypes);
router.get("/push/public-key", requireAuth, notificationController.getBrowserPushPublicKey);
router.post("/push/subscriptions", requireAuth, notificationController.subscribeBrowserPush);
router.delete("/push/subscriptions", requireAuth, notificationController.unsubscribeBrowserPush);
router.get("/settings/:userId", requireAuth, notificationController.getSettings);
router.put("/settings/:userId", requireAuth, notificationController.updateSettings);
router.get("/stats/:userId", requireAuth, notificationController.getStats);
router.post("/test", requireAuth, notificationController.testNotification);

module.exports = router;
