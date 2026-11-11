const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const webPush = require("web-push");
const { getSharedPrismaClient } = require("./sharedDatabase");
const {
  buildDefaultSettings,
  isQuietHoursActive,
  mergeSettingsWithDefaults,
  shouldDeliverBrowserNotificationForType,
} = require("./notificationPreferencesService");

const DEFAULT_ICON = "/favicon.ico";
const DEFAULT_BADGE = "/favicon.ico";
const DEFAULT_SUBJECT = "mailto:support@maxp.online";

let vapidConfigured = false;
let webPushEnvLoaded = false;
let missingVapidWarningLogged = false;

const loadWebPushEnvironment = () => {
  if (
    webPushEnvLoaded ||
    (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY)
  ) {
    webPushEnvLoaded = true;
    return;
  }

  const baseEnvPath = path.resolve(__dirname, "../.env");
  const localEnvPath = path.resolve(__dirname, "../.env.local");

  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({
      path: baseEnvPath,
      override: false,
    });
  }

  if (fs.existsSync(localEnvPath)) {
    dotenv.config({
      path: localEnvPath,
      override: true,
    });
  }

  webPushEnvLoaded = true;
};

const ensureVapidConfiguration = () => {
  loadWebPushEnvironment();

  if (vapidConfigured) {
    return {
      publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
      subject: process.env.WEB_PUSH_SUBJECT || DEFAULT_SUBJECT,
    };
  }

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || DEFAULT_SUBJECT;

  if (!publicKey || !privateKey) {
    throw new Error("WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY are not set");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;

  return { publicKey, subject };
};

const getOptionalVapidConfiguration = () => {
  loadWebPushEnvironment();

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    if (!missingVapidWarningLogged) {
      console.warn(
        "⚠️ [WEB-PUSH] VAPID keys are not configured. Browser push delivery will stay disabled.",
      );
      missingVapidWarningLogged = true;
    }

    return null;
  }

  return ensureVapidConfiguration();
};

const normalizeSubscription = (input) => {
  const subscription = input?.subscription || input;
  if (!subscription?.endpoint) {
    throw new Error("Invalid push subscription: endpoint is required");
  }

  const keys = subscription.keys || {};
  if (!keys.p256dh || !keys.auth) {
    throw new Error("Invalid push subscription: keys are required");
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };
};

const upsertBrowserPushSubscription = async ({
  companyId,
  userId,
  subscription,
  userAgent,
}) => {
  ensureVapidConfiguration();

  const normalizedSubscription = normalizeSubscription(subscription);
  const prisma = getSharedPrismaClient();

  return prisma.browserPushSubscription.upsert({
    where: {
      endpoint: normalizedSubscription.endpoint,
    },
    update: {
      companyId: String(companyId),
      userId: String(userId),
      actorType: "USER",
      actorId: String(userId),
      platform: "WEB_PUSH",
      subscription: normalizedSubscription,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    },
    create: {
      companyId: String(companyId),
      userId: String(userId),
      actorType: "USER",
      actorId: String(userId),
      platform: "WEB_PUSH",
      endpoint: normalizedSubscription.endpoint,
      subscription: normalizedSubscription,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
};

const deactivateBrowserPushSubscription = async ({
  companyId,
  userId,
  endpoint,
}) => {
  const prisma = getSharedPrismaClient();
  const where = {
    companyId: String(companyId),
    userId: String(userId),
    isActive: true,
  };

  if (endpoint) {
    where.endpoint = endpoint;
  }

  return prisma.browserPushSubscription.updateMany({
    where,
    data: {
      isActive: false,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });
};

const getBrowserPushPublicKey = () => ensureVapidConfiguration().publicKey;

const getPortalPushPublicKey = () => {
  loadWebPushEnvironment();
  const publicKey = String(process.env.WEB_PUSH_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.WEB_PUSH_PRIVATE_KEY || "").trim();
  if (!publicKey || !privateKey) {
    return null;
  }
  return ensureVapidConfiguration().publicKey;
};

const VALID_PORTAL_PLATFORMS = new Set(["WEB_PUSH", "FCM_ANDROID", "FCM_IOS"]);

const normalizePortalPlatform = (platform = "WEB_PUSH") => {
  const normalized = String(platform || "WEB_PUSH").trim().toUpperCase();
  if (normalized === "WEB" || normalized === "WEB_PUSH") return "WEB_PUSH";
  if (normalized === "ANDROID" || normalized === "FCM_ANDROID") return "FCM_ANDROID";
  if (normalized === "IOS" || normalized === "FCM_IOS") return "FCM_IOS";
  if (VALID_PORTAL_PLATFORMS.has(normalized)) return normalized;

  const error = new Error(`Invalid push platform: ${platform}`);
  error.statusCode = 400;
  throw error;
};

const upsertPortalPushSubscription = async ({
  companyId,
  actorType = "USER",
  actorId,
  platform = "WEB_PUSH",
  subscription,
  fcmToken,
  userAgent = null,
}) => {
  const cleanCompanyId = String(companyId || "").trim();
  const normalizedActorType = String(actorType || "USER").trim().toUpperCase();
  const cleanActorId = String(actorId || "").trim();

  if (!cleanCompanyId || !normalizedActorType || !cleanActorId) {
    const error = new Error("companyId, actorType, and actorId are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedPlatform = normalizePortalPlatform(platform);
  let endpoint;
  let subscriptionPayload;

  if (normalizedPlatform === "WEB_PUSH") {
    try {
      subscriptionPayload = normalizeSubscription(subscription);
      endpoint = subscriptionPayload.endpoint;
    } catch (validationError) {
      validationError.statusCode = 400;
      throw validationError;
    }
  } else {
    const cleanToken = String(fcmToken || "").trim();
    if (!cleanToken) {
      const error = new Error("fcmToken is required for FCM push platforms");
      error.statusCode = 400;
      throw error;
    }
    endpoint = `fcm:${cleanToken}`;
    subscriptionPayload = {
      provider: "fcm",
      token: cleanToken,
      platform: normalizedPlatform,
    };
  }

  const prisma = getSharedPrismaClient();
  const resolvedUserId = normalizedActorType === "USER" ? cleanActorId : null;
  const now = new Date();

  return prisma.browserPushSubscription.upsert({
    where: { endpoint },
    update: {
      companyId: cleanCompanyId,
      userId: resolvedUserId,
      actorType: normalizedActorType,
      actorId: cleanActorId,
      platform: normalizedPlatform,
      subscription: subscriptionPayload,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: now,
      lastErrorAt: null,
      lastErrorMessage: null,
    },
    create: {
      companyId: cleanCompanyId,
      userId: resolvedUserId,
      actorType: normalizedActorType,
      actorId: cleanActorId,
      platform: normalizedPlatform,
      endpoint,
      subscription: subscriptionPayload,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: now,
    },
  });
};

const deactivatePortalPushSubscription = async ({
  companyId,
  actorType,
  actorId,
  endpoint,
  fcmToken,
}) => {
  const cleanCompanyId = String(companyId || "").trim();
  const normalizedActorType = String(actorType || "").trim().toUpperCase();
  const cleanActorId = String(actorId || "").trim();

  if (!cleanCompanyId || !normalizedActorType || !cleanActorId) {
    const error = new Error("companyId, actorType, and actorId are required");
    error.statusCode = 400;
    throw error;
  }

  const cleanToken = fcmToken ? String(fcmToken).trim() : "";
  const resolvedEndpoint = endpoint
    ? String(endpoint).trim()
    : cleanToken
      ? `fcm:${cleanToken}`
      : null;

  const prisma = getSharedPrismaClient();
  return prisma.browserPushSubscription.updateMany({
    where: {
      companyId: cleanCompanyId,
      actorType: normalizedActorType,
      ...(cleanActorId ? { actorId: cleanActorId } : {}),
      ...(resolvedEndpoint ? { endpoint: resolvedEndpoint } : {}),
    },
    data: {
      isActive: false,
      lastErrorMessage: "Unsubscribed by portal actor",
    },
  });
};

const isFcmSubscription = (subscription) => {
  return Boolean(
    subscription?.endpoint?.startsWith("fcm:") ||
    subscription?.subscription?.provider === "fcm"
  );
};

const shouldDeliverSubscriptionNotification = ({
  subscription,
  settings,
  typeId,
}) => {
  if (!settings?.globalEnabled) {
    return false;
  }

  // 📱 Mobile native push via FCM
  if (isFcmSubscription(subscription)) {
    if (settings?.channels?.push && settings.channels.push.enabled === false) {
      return false;
    }
    const typeSettings = settings.typeSettings?.[typeId];
    if (typeSettings && typeSettings.enabled === false) {
      return false;
    }
    if (Array.isArray(typeSettings?.channels) && !typeSettings.channels.includes("push")) {
      return false;
    }
    return true;
  }

  // 🌐 Desktop / web browser push
  return shouldDeliverBrowserNotificationForType(settings, typeId);
};

const buildSettingsForUser = ({ companyId, user, storedSettings }) => {
  const defaults = buildDefaultSettings({
    userId: user.id,
    companyId,
    email: user.email || "",
    timezone: user.timezone || "Africa/Cairo",
  });

  return mergeSettingsWithDefaults(storedSettings || {}, defaults);
};

const markSubscriptionFailure = async (subscriptionId, error) => {
  const prisma = getSharedPrismaClient();
  const statusCode = error?.statusCode;
  const shouldDeactivate = statusCode === 404 || statusCode === 410;
  const rawMessage =
    error?.body ||
    error?.message ||
    "Unknown web-push delivery error";

  await prisma.browserPushSubscription.update({
    where: { id: subscriptionId },
    data: {
      isActive: shouldDeactivate ? false : true,
      lastErrorAt: new Date(),
      lastErrorMessage: String(rawMessage).slice(0, 500),
    },
  });
};

const markSubscriptionSuccess = async (subscriptionId) => {
  const prisma = getSharedPrismaClient();
  await prisma.browserPushSubscription.update({
    where: { id: subscriptionId },
    data: {
      isActive: true,
      lastUsedAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });
};

const sendNotificationToSubscription = async (record, payload) => {
  // 📱 Check if this is an FCM mobile push subscription
  const isFcm =
    record.endpoint?.startsWith("fcm:") ||
    record.subscription?.provider === "fcm";

  if (isFcm) {
    try {
      const { sendToFcmTokens } = require("./firebaseMessagingService");
      const token =
        record.subscription?.token || record.endpoint.replace("fcm:", "");

      const validImageUrl =
        typeof payload.icon === "string" &&
        (payload.icon.startsWith("https://") || payload.icon.startsWith("http://"))
          ? payload.icon
          : null;

      const fcmResult = await sendToFcmTokens({
        tokens: [token],
        title: payload.title,
        body: payload.body,
        data: {
          ...(payload.data || {}),
          tag: payload.tag
        },
        imageUrl: validImageUrl,
        tag: payload.tag
      });

      if (fcmResult.successCount > 0) {
        await markSubscriptionSuccess(record.id);
        return true;
      } else {
        await markSubscriptionFailure(
          record.id,
          new Error(fcmResult.error || "FCM delivery failed")
        );
        return false;
      }
    } catch (fcmError) {
      console.error(`[FCM-PUSH] Failed for ${record.endpoint}:`, fcmError.message);
      await markSubscriptionFailure(record.id, fcmError);
      return false;
    }
  }

  // 🌐 Standard browser Web Push (requires VAPID keys)
  if (!getOptionalVapidConfiguration()) {
    return false;
  }

  ensureVapidConfiguration();

  try {
    await webPush.sendNotification(
      record.subscription,
      JSON.stringify(payload),
      {
        TTL: 60,
        urgency: "high",
      },
    );

    await markSubscriptionSuccess(record.id);
    return true;
  } catch (error) {
    console.error(
      `[WEB-PUSH] Failed for ${record.endpoint}:`,
      error?.statusCode || error?.message || error,
    );
    await markSubscriptionFailure(record.id, error);
    return false;
  }
};

const isPushDeliveryAvailable = () => {
  const hasVapid = Boolean(getOptionalVapidConfiguration());
  if (hasVapid) return true;

  try {
    const { isFirebaseInitialized } = require("./firebaseMessagingService");
    return Boolean(isFirebaseInitialized());
  } catch (_) {
    return false;
  }
};

const sendBrowserPushToCompany = async ({
  companyId,
  typeId,
  title,
  body,
  compactBody,
  icon = DEFAULT_ICON,
  badge = DEFAULT_BADGE,
  tag,
  requireInteraction,
  url,
  data = {},
  forceVisibleNotification = false,
}) => {
  if (!isPushDeliveryAvailable()) {
    return {
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      disabled: true,
      reason: "missing_vapid_keys",
    };
  }

  const prisma = getSharedPrismaClient();
  const subscriptions = await prisma.browserPushSubscription.findMany({
    where: {
      companyId: String(companyId),
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          timezone: true,
        },
      },
    },
  });

  if (!subscriptions.length) {
    return {
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const userIds = Array.from(
    new Set(subscriptions.map((subscription) => subscription.userId).filter(Boolean)),
  );
  const preferenceRecords =
    userIds.length > 0
      ? await prisma.notificationPreference.findMany({
          where: {
            companyId: String(companyId),
            userId: { in: userIds },
          },
        })
      : [];

  const preferencesByUserId = new Map(
    preferenceRecords.map((record) => [record.userId, record.settings || {}]),
  );

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!subscription.userId || !subscription.user) {
      skipped += 1;
      continue;
    }

    const settings = buildSettingsForUser({
      companyId,
      user: subscription.user,
      storedSettings: preferencesByUserId.get(subscription.userId),
    });

    const isAmeerelle =
      String(companyId) === "cmteva12p00lrjuwxpufr4k8w" ||
      subscription.user?.email === "ahmedfares61994@gmail.com";

    const shouldDeliver =
      isAmeerelle ||
      shouldDeliverSubscriptionNotification({
        subscription,
        settings,
        typeId,
      });

    if (!shouldDeliver || isQuietHoursActive(settings)) {
      skipped += 1;
      continue;
    }

    attempted += 1;

    const delivered = await sendNotificationToSubscription(subscription, {
      title,
      body:
        settings?.channels?.browser?.showPreview === false && compactBody
          ? compactBody
          : body,
      icon,
      badge,
      tag: tag || `${typeId}-${subscription.userId}`,
      requireInteraction:
        typeof requireInteraction === "boolean"
          ? requireInteraction
          : String(companyId) === "cmteva12p00lrjuwxpufr4k8w"
            ? true
            : settings?.channels?.browser?.requireInteraction === true,
      forceVisibleNotification,
      data: {
        ...data,
        typeId,
        companyId: String(companyId),
        url: url || "/",
      },
      url: url || "/",
    });

    if (delivered) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    attempted,
    sent,
    skipped,
    failed,
  };
};

const sendBrowserPushToUser = async ({
  companyId,
  userId,
  typeId,
  title,
  body,
  compactBody,
  icon = DEFAULT_ICON,
  badge = DEFAULT_BADGE,
  tag,
  requireInteraction,
  url,
  data = {},
  forceVisibleNotification = false,
}) => {
  if (!isPushDeliveryAvailable()) {
    return {
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      disabled: true,
      reason: "missing_vapid_keys",
    };
  }

  const prisma = getSharedPrismaClient();
  const [user, preferenceRecord, subscriptions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        email: true,
        timezone: true,
      },
    }),
    prisma.notificationPreference.findUnique({
      where: {
        companyId_userId: {
          companyId: String(companyId),
          userId: String(userId),
        },
      },
    }),
    prisma.browserPushSubscription.findMany({
      where: {
        companyId: String(companyId),
        userId: String(userId),
        isActive: true,
      },
    }),
  ]);

  if (!user || !subscriptions.length) {
    return {
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const settings = buildSettingsForUser({
    companyId,
    user,
    storedSettings: preferenceRecord?.settings,
  });

  const isAmeerelle =
    String(companyId) === "cmteva12p00lrjuwxpufr4k8w" ||
    user?.email === "ahmedfares61994@gmail.com";

  if (!isAmeerelle && isQuietHoursActive(settings)) {
    return {
      attempted: 0,
      sent: 0,
      skipped: subscriptions.length,
      failed: 0,
    };
  }

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const shouldDeliver =
      isAmeerelle ||
      shouldDeliverSubscriptionNotification({
        subscription,
        settings,
        typeId,
      });

    if (!shouldDeliver) {
      skipped += 1;
      continue;
    }

    attempted += 1;
    const delivered = await sendNotificationToSubscription(subscription, {
      title,
      body:
        settings?.channels?.browser?.showPreview === false && compactBody
          ? compactBody
          : body,
      icon,
      badge,
      tag: tag || `${typeId}-${subscription.userId}`,
      requireInteraction:
        typeof requireInteraction === "boolean"
          ? requireInteraction
          : settings?.channels?.browser?.requireInteraction === true,
      forceVisibleNotification,
      data: {
        ...data,
        typeId,
        companyId: String(companyId),
        url: url || "/",
      },
      url: url || "/",
    });

    if (delivered) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return {
    attempted: subscriptions.length,
    sent,
    skipped: 0,
    failed,
  };
};

const sendToPortalActor = async ({
  companyId,
  actorType,
  actorId,
  typeId = "portal_notification",
  title,
  body,
  icon = DEFAULT_ICON,
  badge = DEFAULT_BADGE,
  url = "/",
  data = {},
  tag,
}) => {
  const cleanCompanyId = String(companyId || "").trim();
  const normalizedActorType = String(actorType || "").trim().toUpperCase();
  const cleanActorId = String(actorId || "").trim();

  if (!cleanCompanyId || !normalizedActorType || !cleanActorId) {
    return {
      attempted: 0,
      sent: 0,
      deliveredCount: 0,
      failed: 0,
      webSent: 0,
      fcmSent: 0,
    };
  }

  const prisma = getSharedPrismaClient();
  const subscriptions = await prisma.browserPushSubscription.findMany({
    where: {
      companyId: cleanCompanyId,
      actorType: normalizedActorType,
      actorId: cleanActorId,
      isActive: true,
    },
  });

  if (!subscriptions || !subscriptions.length) {
    return {
      attempted: 0,
      sent: 0,
      deliveredCount: 0,
      failed: 0,
      webSent: 0,
      fcmSent: 0,
    };
  }

  const webPushRows = [];
  const fcmRows = [];

  for (const sub of subscriptions) {
    const subPlatform = String(sub?.platform || "").trim().toUpperCase();
    const isFcm = subPlatform.startsWith("FCM") || isFcmSubscription(sub);
    if (isFcm) {
      fcmRows.push(sub);
    } else if (
      (!subPlatform || subPlatform === "WEB_PUSH") &&
      !String(sub?.endpoint || "").startsWith("fcm:")
    ) {
      webPushRows.push(sub);
    }
  }

  const resolvedUrl = url || "/";
  const resolvedTag =
    tag || `${typeId}-${normalizedActorType.toLowerCase()}-${cleanActorId}`;
  const payload = {
    title,
    body,
    icon,
    badge,
    tag: resolvedTag,
    url: resolvedUrl,
    data: {
      ...data,
      typeId,
      actorType: normalizedActorType,
      actorId: cleanActorId,
      companyId: cleanCompanyId,
      url: resolvedUrl,
    },
  };

  let attempted = 0;
  let webSent = 0;
  let fcmSent = 0;
  let failed = 0;

  if (
    webPushRows.length > 0 &&
    isPushDeliveryAvailable() &&
    getOptionalVapidConfiguration()
  ) {
    for (const sub of webPushRows) {
      attempted += 1;
      const delivered = await sendNotificationToSubscription(sub, payload);
      if (delivered) {
        webSent += 1;
      } else {
        failed += 1;
      }
    }
  }

  const fcmTokens = Array.from(
    new Set(
      fcmRows
        .map((sub) => {
          if (
            sub?.subscription &&
            typeof sub.subscription === "object" &&
            sub.subscription.token
          ) {
            return String(sub.subscription.token).trim();
          }
          if (
            typeof sub?.endpoint === "string" &&
            sub.endpoint.startsWith("fcm:")
          ) {
            return sub.endpoint.slice(4).trim();
          }
          return "";
        })
        .filter(Boolean),
    ),
  );

  if (fcmTokens.length > 0) {
    attempted += fcmTokens.length;
    try {
      const { sendToFcmTokens } = require("./firebaseMessagingService");
      const validImageUrl =
        typeof icon === "string" &&
        (icon.startsWith("https://") || icon.startsWith("http://"))
          ? icon
          : null;
      const fcmResult = await sendToFcmTokens({
        tokens: fcmTokens,
        title,
        body,
        data: payload.data,
        imageUrl: validImageUrl,
        tag: resolvedTag,
      });

      const successCount = Number(fcmResult?.successCount || 0);
      const failureCount = Number(
        fcmResult?.failureCount ?? Math.max(0, fcmTokens.length - successCount),
      );
      fcmSent += successCount;
      failed += Math.max(0, failureCount);
    } catch (fcmError) {
      console.error("[PORTAL-PUSH] FCM delivery failed:", fcmError.message);
      failed += fcmTokens.length;
    }
  }

  const sent = webSent + fcmSent;
  return {
    attempted,
    sent,
    deliveredCount: sent,
    failed,
    webSent,
    fcmSent,
  };
};

module.exports = {
  deactivateBrowserPushSubscription,
  deactivatePortalPushSubscription,
  getBrowserPushPublicKey,
  getPortalPushPublicKey,
  normalizePortalPlatform,
  sendBrowserPushToCompany,
  sendBrowserPushToUser,
  sendToPortalActor,
  upsertBrowserPushSubscription,
  upsertPortalPushSubscription,
};
