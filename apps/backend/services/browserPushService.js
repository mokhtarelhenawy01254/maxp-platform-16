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
  if (!getOptionalVapidConfiguration()) {
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
    new Set(subscriptions.map((subscription) => subscription.userId)),
  );
  const preferenceRecords = await prisma.notificationPreference.findMany({
    where: {
      companyId: String(companyId),
      userId: { in: userIds },
    },
  });

  const preferencesByUserId = new Map(
    preferenceRecords.map((record) => [record.userId, record.settings || {}]),
  );

  let attempted = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!subscription.user) {
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

    if (
      !isAmeerelle &&
      (!shouldDeliverBrowserNotificationForType(settings, typeId) ||
        isQuietHoursActive(settings))
    ) {
      skipped += 1;
      continue;
    }

    attempted += 1;

    const delivered = await sendNotificationToSubscription(subscription, {
      title,
      body:
        settings.channels.browser.showPreview === false && compactBody
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
            : settings.channels.browser.requireInteraction === true,
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
  if (!getOptionalVapidConfiguration()) {
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

  if (
    !isAmeerelle &&
    (!shouldDeliverBrowserNotificationForType(settings, typeId) ||
      isQuietHoursActive(settings))
  ) {
    return {
      attempted: 0,
      sent: 0,
      skipped: subscriptions.length,
      failed: 0,
    };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const delivered = await sendNotificationToSubscription(subscription, {
      title,
      body:
        settings.channels.browser.showPreview === false && compactBody
          ? compactBody
          : body,
      icon,
      badge,
      tag: tag || `${typeId}-${subscription.userId}`,
      requireInteraction:
        typeof requireInteraction === "boolean"
          ? requireInteraction
          : settings.channels.browser.requireInteraction === true,
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

module.exports = {
  deactivateBrowserPushSubscription,
  getBrowserPushPublicKey,
  sendBrowserPushToCompany,
  sendBrowserPushToUser,
  upsertBrowserPushSubscription,
};
