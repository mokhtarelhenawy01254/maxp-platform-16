const fs = require("fs");
const path = require("path");
const { getSharedPrismaClient } = require("./sharedDatabase");

let admin = null;
let firebaseInitialized = false;

/**
 * تهيئة Firebase Admin SDK
 */
function initFirebase() {
  if (firebaseInitialized) return admin;

  try {
    admin = require("firebase-admin");
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("⚠️ [FCM] firebase-admin package is not installed or available.");
    }
    return null;
  }

  try {
    let serviceAccount = null;

    // 1. من متغير البيئة مباشرة كـ JSON String
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (e) {
        console.error("❌ [FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", e.message);
      }
    }

    // 2. من مسار ملف محدد
    if (!serviceAccount) {
      const candidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.resolve(__dirname, "../config/firebase-service-account.json"),
        path.resolve(__dirname, "../../config/firebase-service-account.json"),
        "/var/www/shared/firebase-service-account.json",
        "/var/www/backend2/config/firebase-service-account.json",
      ].filter(Boolean);

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            const raw = fs.readFileSync(candidate, "utf8");
            serviceAccount = JSON.parse(raw.replace(/^\uFEFF/, "").trim());
            console.log("✅ [FCM] Loaded Firebase Service Account from:", candidate);
            break;
          } catch (e) {
            console.error("❌ [FCM] Failed to read service account file:", candidate, e.message);
          }
        }
      }
    }

    if (serviceAccount && serviceAccount.project_id) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      firebaseInitialized = true;
      console.log("🔥 [FCM] Firebase Admin SDK initialized successfully for project:", serviceAccount.project_id);
    } else {
      console.log("ℹ️ [FCM] Firebase Service Account not configured yet. Token registration is active; push dispatch will activate once service account key is placed.");
    }
  } catch (error) {
    console.error("❌ [FCM] Error initializing Firebase:", error.message);
  }

  return admin;
}

// محاولة التهيئة عند التحميل
initFirebase();

/**
 * حفظ أو تحديث توكن جهاز الموبايل في قاعدة البيانات
 */
async function upsertDeviceToken({ companyId, userId, token, platform = "android", userAgent = null }) {
  if (!userId || !token) {
    throw new Error("userId and token are required");
  }

  const endpoint = `fcm:${token.trim()}`;
  const prisma = getSharedPrismaClient();

  const subscriptionPayload = {
    provider: "fcm",
    token: token.trim(),
    platform: String(platform || "android").toLowerCase(),
  };

  const record = await prisma.browserPushSubscription.upsert({
    where: {
      endpoint,
    },
    update: {
      companyId: String(companyId || ""),
      userId: String(userId),
      subscription: subscriptionPayload,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    },
    create: {
      companyId: String(companyId || ""),
      userId: String(userId),
      endpoint,
      subscription: subscriptionPayload,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });

  console.log(`📱 [FCM] Device token registered for user ${userId} (${platform})`);
  return record;
}

/**
 * إلغاء تفعيل توكن جهاز
 */
async function removeDeviceToken({ userId, token }) {
  if (!token) return;
  const endpoint = `fcm:${token.trim()}`;
  const prisma = getSharedPrismaClient();

  return prisma.browserPushSubscription.updateMany({
    where: {
      endpoint,
      ...(userId ? { userId: String(userId) } : {}),
    },
    data: {
      isActive: false,
      lastErrorMessage: "Unregistered by client",
    },
  });
}

/**
 * إرسال إشعار لمجموعة من أجهزة FCM
 */
async function sendToFcmTokens({ tokens, title, body, data = {}, imageUrl = null }) {
  if (!tokens || !tokens.length) return { successCount: 0, failureCount: 0 };

  const fbAdmin = initFirebase();
  if (!fbAdmin || !firebaseInitialized) {
    console.warn("⚠️ [FCM] Cannot send push notification: Firebase Admin is not initialized.");
    return { successCount: 0, failureCount: tokens.length, notConfigured: true };
  }

  const stringData = {};
  for (const [key, val] of Object.entries(data)) {
    stringData[key] = typeof val === "string" ? val : JSON.stringify(val);
  }

  const hasValidImageUrl =
    typeof imageUrl === "string" &&
    (imageUrl.startsWith("https://") || imageUrl.startsWith("http://"));

  const typeId = String(data.typeId || "");
  const source = String(data.source || "");
  const resolvedChannelId =
    data.channelId ||
    (typeId === "customer_message" || source === "whatsapp_message"
      ? "maxp_messages_channel"
      : typeId === "order_created" || typeId === "order_status_changed"
        ? "maxp_orders_channel"
        : typeId.startsWith("task_")
          ? "maxp_tasks_channel"
          : "maxp_default_channel");

  const message = {
    tokens,
    notification: {
      title,
      body,
      ...(hasValidImageUrl ? { imageUrl } : {}),
    },
    data: stringData,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: resolvedChannelId,
        defaultVibrateTimings: true,
        defaultSound: true,
        priority: "max",
      },
    },
  };

  try {
    const response = await fbAdmin.messaging().sendEachForMulticast(message);
    console.log(`🚀 [FCM] Notification sent. Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // تنظيف التوكنات المنتهية تلقائياً
    if (response.failureCount > 0) {
      const tokensToDeactivate = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            tokensToDeactivate.push(tokens[idx]);
          }
        }
      });

      if (tokensToDeactivate.length > 0) {
        const prisma = getSharedPrismaClient();
        const endpoints = tokensToDeactivate.map((t) => `fcm:${t}`);
        await prisma.browserPushSubscription.updateMany({
          where: { endpoint: { in: endpoints } },
          data: { isActive: false, lastErrorMessage: "Token expired or unregistered" },
        });
      }
    }

    return response;
  } catch (error) {
    console.error("❌ [FCM] Multicast send error:", error.message);
    return { successCount: 0, failureCount: tokens.length, error: error.message };
  }
}

/**
 * إرسال إشعار لمستخدم معين (على جميع أجهزته النشطة)
 */
async function sendPushToUser({ companyId, userId, title, body, data = {}, url = null, imageUrl = null }) {
  if (!userId) return null;

  try {
    const prisma = getSharedPrismaClient();
    const activeSubscriptions = await prisma.browserPushSubscription.findMany({
      where: {
        userId: String(userId),
        isActive: true,
        ...(companyId ? { companyId: String(companyId) } : {}),
      },
    });

    if (!activeSubscriptions.length) {
      return { sent: false, reason: "no_active_devices" };
    }

    const fcmTokens = [];
    activeSubscriptions.forEach((sub) => {
      const parsed = typeof sub.subscription === "object" ? sub.subscription : {};
      if (parsed.provider === "fcm" && parsed.token) {
        fcmTokens.push(parsed.token);
      } else if (sub.endpoint.startsWith("fcm:")) {
        fcmTokens.push(sub.endpoint.replace("fcm:", ""));
      }
    });

    const payloadData = {
      ...data,
      ...(url ? { url } : {}),
    };

    let fcmResult = null;
    if (fcmTokens.length > 0) {
      fcmResult = await sendToFcmTokens({
        tokens: [...new Set(fcmTokens)],
        title,
        body,
        data: payloadData,
        imageUrl,
      });
    }

    return {
      sent: true,
      fcmResult,
      deviceCount: activeSubscriptions.length,
    };
  } catch (error) {
    console.error("❌ [FCM] Error in sendPushToUser:", error.message);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  initFirebase,
  isFirebaseInitialized: () => firebaseInitialized,
  upsertDeviceToken,
  removeDeviceToken,
  sendToFcmTokens,
  sendPushToUser,
};
