const FacebookAdsService = require("./facebookAdsService");
const WhatsAppNotificationService = require("./whatsapp/WhatsAppNotificationService");
const { getSharedPrismaClient, safeQuery } = require("./sharedDatabase");

const ALERT_SCOPES = {
  AD_ACCOUNT: "AD_ACCOUNT",
  CAMPAIGN: "CAMPAIGN",
};

const ALERT_METRICS = {
  ACCOUNT_BALANCE: "ACCOUNT_BALANCE",
  SPEND_CAP_REMAINING: "SPEND_CAP_REMAINING",
  CAMPAIGN_BUDGET_REMAINING: "CAMPAIGN_BUDGET_REMAINING",
  CAMPAIGN_FINISHED: "CAMPAIGN_FINISHED",
};

const ALERT_STATES = {
  OK: "OK",
  TRIGGERED: "TRIGGERED",
};

const TERMINAL_CAMPAIGN_STATUSES = new Set([
  "ARCHIVED",
  "DELETED",
  "DISAPPROVED",
  "WITH_ISSUES",
]);

const METRIC_LABELS = {
  [ALERT_METRICS.ACCOUNT_BALANCE]: "رصيد الحساب الإعلاني",
  [ALERT_METRICS.SPEND_CAP_REMAINING]: "المتبقي من حد إنفاق الحساب",
  [ALERT_METRICS.CAMPAIGN_BUDGET_REMAINING]: "المتبقي من ميزانية الحملة",
  [ALERT_METRICS.CAMPAIGN_FINISHED]: "انتهاء الحملة أو نفاد الميزانية",
};

function normalizeAdAccountId(adAccountId) {
  return String(adAccountId || "")
    .replace(/^act_/i, "")
    .trim();
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toMajorCurrencyUnit(value) {
  const numericValue = toNullableNumber(value);
  return numericValue === null ? null : numericValue / 100;
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function parseRecipientPhones(value) {
  if (!value) return [];

  let rawItems = [];
  if (Array.isArray(value)) {
    rawItems = value;
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      rawItems = Array.isArray(parsed) ? parsed : value.split(/[\n,;،؛]+/);
    } catch {
      rawItems = value.split(/[\n,;،؛]+/);
    }
  }

  const seen = new Set();
  return rawItems
    .map((item) =>
      typeof item === "object" && item !== null ? item.phone : String(item || ""),
    )
    .map((phone) => phone.trim())
    .filter((phone) => {
      if (!phone || seen.has(phone)) return false;
      seen.add(phone);
      return true;
    });
}

function stringifyRecipientPhones(value) {
  const phones = parseRecipientPhones(value);
  return JSON.stringify(phones);
}

function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value, currency = "EGP") {
  const numericValue = toNullableNumber(value);
  if (numericValue === null) return `غير متاح ${currency}`;

  return `${numericValue.toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function getTodayDateRange() {
  const now = new Date();
  return {
    since: now.toISOString().slice(0, 10),
    until: now.toISOString().slice(0, 10),
    rangeStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    rangeEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

function getCampaignDateRange(campaign) {
  if (campaign?.budgetType === "DAILY") {
    return getTodayDateRange();
  }

  const now = new Date();
  const fallbackStart = new Date(now);
  fallbackStart.setDate(fallbackStart.getDate() - 365);
  const rangeStart = campaign?.startDate
    ? new Date(campaign.startDate)
    : campaign?.createdAt
      ? new Date(campaign.createdAt)
      : fallbackStart;

  return {
    since: rangeStart.toISOString().slice(0, 10),
    until: now.toISOString().slice(0, 10),
    rangeStart,
    rangeEnd: now,
  };
}

function getCampaignStatus(campaign) {
  const settings = parseJsonObject(campaign?.settings);
  const meta = settings.meta || {};

  return String(
    meta.effectiveStatus ||
      meta.configuredStatus ||
      campaign?.status ||
      "",
  ).toUpperCase();
}

function buildRuleWhere(companyId, extra = {}) {
  return {
    companyId,
    ...extra,
  };
}

function serializeAdAccount(adAccount) {
  if (!adAccount) return adAccount;
  return {
    id: adAccount.id,
    accountId: adAccount.accountId,
    name: adAccount.name,
    currency: adAccount.currency,
    timezone: adAccount.timezone,
    isActive: adAccount.isActive,
  };
}

function serializeCampaign(campaign) {
  if (!campaign) return campaign;
  return {
    id: campaign.id,
    facebookCampaignId: campaign.facebookCampaignId,
    name: campaign.name,
    status: campaign.status,
    budgetType: campaign.budgetType,
    budgetAmount: campaign.budgetAmount,
  };
}

function serializeRule(rule) {
  if (!rule) return null;

  return {
    ...rule,
    adAccount: serializeAdAccount(rule.adAccount),
    campaign: serializeCampaign(rule.campaign),
    recipientPhones: parseRecipientPhones(rule.recipientPhones),
    settings: parseJsonObject(rule.settings),
  };
}

function serializeLog(log) {
  if (!log) return null;
  return {
    ...log,
    metadata: parseJsonObject(log.metadata),
  };
}

async function getCompanyAdsAccessToken(companyId) {
  const company = await safeQuery(() =>
    getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    }),
  );

  return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
}

async function getRemoteAdAccounts(companyId, context) {
  const cacheKey = `accounts:${companyId}`;
  if (context.accountCache.has(cacheKey)) {
    return context.accountCache.get(cacheKey);
  }

  const accessToken = await getCompanyAdsAccessToken(companyId);
  if (!accessToken) {
    const emptyResult = { success: false, reason: "NO_ACCESS_TOKEN", data: [] };
    context.accountCache.set(cacheKey, emptyResult);
    return emptyResult;
  }

  const adsService = new FacebookAdsService(accessToken);
  const result = await adsService.getAdAccounts();
  const normalizedResult = result.success
    ? { success: true, data: result.data || [] }
    : { success: false, reason: "FACEBOOK_API_ERROR", error: result.error, data: [] };

  context.accountCache.set(cacheKey, normalizedResult);
  return normalizedResult;
}

async function getRemoteAdAccount(rule, context) {
  const adAccount = rule.adAccount || (rule.adAccountId
    ? await getSharedPrismaClient().facebookAdAccount.findFirst({
        where: { id: rule.adAccountId, companyId: rule.companyId },
      })
    : null);

  if (!adAccount) {
    return { success: false, reason: "AD_ACCOUNT_NOT_FOUND" };
  }

  const remoteAccounts = await getRemoteAdAccounts(rule.companyId, context);
  if (!remoteAccounts.success) {
    return {
      success: false,
      reason: remoteAccounts.reason,
      error: remoteAccounts.error,
      adAccount,
    };
  }

  const targetAccountId = normalizeAdAccountId(adAccount.accountId);
  const remoteAccount = (remoteAccounts.data || []).find(
    (account) =>
      normalizeAdAccountId(account.account_id || account.id) === targetAccountId,
  );

  if (!remoteAccount) {
    return { success: false, reason: "REMOTE_AD_ACCOUNT_NOT_FOUND", adAccount };
  }

  return { success: true, adAccount, remoteAccount };
}

function buildAccountObservation(rule, remoteAccountResult) {
  const { adAccount, remoteAccount } = remoteAccountResult;
  const currency = remoteAccount.currency || adAccount.currency || rule.currency || "EGP";
  const balance = toMajorCurrencyUnit(remoteAccount.balance);
  const spendCap = toMajorCurrencyUnit(remoteAccount.spend_cap);
  const amountSpent = toMajorCurrencyUnit(remoteAccount.amount_spent) || 0;
  const targetName = remoteAccount.name || adAccount.name || "حساب إعلاني";

  if (rule.metric === ALERT_METRICS.ACCOUNT_BALANCE) {
    return {
      available: balance !== null,
      observedValue: balance,
      currency,
      targetName,
      targetKind: "الحساب الإعلاني",
      metricLabel: METRIC_LABELS[rule.metric],
      metadata: { balance, spendCap, amountSpent },
    };
  }

  const remainingSpendCap = spendCap === null ? null : spendCap - amountSpent;
  return {
    available: remainingSpendCap !== null,
    observedValue: remainingSpendCap,
    currency,
    targetName,
    targetKind: "الحساب الإعلاني",
    metricLabel: METRIC_LABELS[rule.metric],
    metadata: { balance, spendCap, amountSpent, remainingSpendCap },
  };
}

async function getCampaignSpend(campaign, context) {
  const dateRange = getCampaignDateRange(campaign);
  const cacheKey = `campaignSpend:${campaign.id}:${dateRange.since}:${dateRange.until}`;
  if (context.campaignSpendCache.has(cacheKey)) {
    return context.campaignSpendCache.get(cacheKey);
  }

  const prisma = getSharedPrismaClient();
  let spend = null;
  let source = "LOCAL";

  const accessToken = await getCompanyAdsAccessToken(campaign.companyId);
  if (accessToken && campaign.facebookCampaignId) {
    const accountId = campaign.facebookAdAccount?.accountId || context.defaultAdAccountId;
    const adsService = new FacebookAdsService(accessToken, accountId);
    const result = await adsService.getCampaignInsights(campaign.facebookCampaignId, {
      since: dateRange.since,
      until: dateRange.until,
    });

    if (result.success) {
      spend = (result.data || []).reduce(
        (sum, row) => sum + (toNullableNumber(row.spend) || 0),
        0,
      );
      source = "META";
    }
  }

  if (spend === null) {
    const localRows = await safeQuery(() =>
      prisma.facebookAdInsight.findMany({
        where: {
          facebookAd: {
            facebookAdset: {
              campaignId: campaign.id,
            },
          },
          date: {
            gte: dateRange.rangeStart,
            lte: dateRange.rangeEnd,
          },
        },
        select: { spend: true },
      }),
    );

    spend = (localRows || []).reduce(
      (sum, row) => sum + (toNullableNumber(row.spend) || 0),
      0,
    );
  }

  const result = { spend, source, dateRange };
  context.campaignSpendCache.set(cacheKey, result);
  return result;
}

async function getCampaign(rule) {
  const campaign = rule.campaign || (rule.campaignId
    ? await getSharedPrismaClient().facebookCampaign.findFirst({
        where: { id: rule.campaignId, companyId: rule.companyId },
        include: { facebookAdAccount: true },
      })
    : null);

  if (!campaign) return null;
  if (campaign.facebookAdAccount) return campaign;

  return getSharedPrismaClient().facebookCampaign.findFirst({
    where: { id: campaign.id, companyId: rule.companyId },
    include: { facebookAdAccount: true },
  });
}

async function buildCampaignObservation(rule, context) {
  const campaign = await getCampaign(rule);
  if (!campaign) {
    return {
      available: false,
      reason: "CAMPAIGN_NOT_FOUND",
      metricLabel: METRIC_LABELS[rule.metric],
      targetName: "حملة غير موجودة",
      targetKind: "الحملة",
    };
  }

  const currency =
    campaign.facebookAdAccount?.currency || rule.currency || "EGP";
  const budgetAmount = toNullableNumber(campaign.budgetAmount) || 0;
  const { spend, source, dateRange } = await getCampaignSpend(campaign, {
    ...context,
    defaultAdAccountId: campaign.facebookAdAccount?.accountId,
  });
  const remainingBudget = budgetAmount - spend;
  const status = getCampaignStatus(campaign);
  const hasEndedByDate =
    campaign.endDate && new Date(campaign.endDate).getTime() <= Date.now();
  const isFinished =
    hasEndedByDate ||
    remainingBudget <= 0 ||
    TERMINAL_CAMPAIGN_STATUSES.has(status);

  return {
    available: true,
    observedValue: remainingBudget,
    currency,
    targetName: campaign.name,
    targetKind: "الحملة",
    metricLabel: METRIC_LABELS[rule.metric],
    isFinished,
    metadata: {
      budgetAmount,
      spend,
      remainingBudget,
      budgetType: campaign.budgetType,
      status,
      hasEndedByDate: Boolean(hasEndedByDate),
      source,
      dateRange: {
        since: dateRange.since,
        until: dateRange.until,
      },
    },
  };
}

async function buildObservation(rule, context = createEvaluationContext()) {
  if (
    rule.scope === ALERT_SCOPES.AD_ACCOUNT ||
    rule.metric === ALERT_METRICS.ACCOUNT_BALANCE ||
    rule.metric === ALERT_METRICS.SPEND_CAP_REMAINING
  ) {
    const remoteAccountResult = await getRemoteAdAccount(rule, context);
    if (!remoteAccountResult.success) {
      return {
        available: false,
        reason: remoteAccountResult.reason,
        error: remoteAccountResult.error,
        currency: rule.currency || remoteAccountResult.adAccount?.currency || "EGP",
        targetName: remoteAccountResult.adAccount?.name || "حساب إعلاني",
        targetKind: "الحساب الإعلاني",
        metricLabel: METRIC_LABELS[rule.metric],
      };
    }

    return buildAccountObservation(rule, remoteAccountResult);
  }

  return buildCampaignObservation(rule, context);
}

function createEvaluationContext() {
  return {
    accountCache: new Map(),
    campaignSpendCache: new Map(),
  };
}

function isObservationTriggered(rule, observation) {
  if (!observation.available) return false;
  if (rule.metric === ALERT_METRICS.CAMPAIGN_FINISHED) {
    return Boolean(observation.isFinished);
  }

  const observedValue = toNullableNumber(observation.observedValue);
  const threshold = toNullableNumber(rule.thresholdAmount);
  return observedValue !== null && threshold !== null && observedValue <= threshold;
}

function isWithinCooldown(rule) {
  if (!rule.lastTriggeredAt || !rule.cooldownMinutes) return false;
  const lastTriggeredAt = new Date(rule.lastTriggeredAt).getTime();
  if (Number.isNaN(lastTriggeredAt)) return false;

  return Date.now() - lastTriggeredAt < rule.cooldownMinutes * 60 * 1000;
}

function buildAlertMessage(rule, observation, checkedAt = new Date()) {
  const thresholdLine =
    rule.metric === ALERT_METRICS.CAMPAIGN_FINISHED
      ? "نوع التنبيه: انتهاء أو نفاد ميزانية"
      : `حد التنبيه: ${formatMoney(rule.thresholdAmount, observation.currency)}`;

  return [
    "⚠️ تنبيه رصيد الإعلانات",
    "",
    `${observation.targetKind}: ${observation.targetName}`,
    `${observation.metricLabel}: ${formatMoney(observation.observedValue, observation.currency)}`,
    thresholdLine,
    `آخر تحديث: ${formatDateTime(checkedAt)}`,
    "",
    "يفضل مراجعة Meta Ads Manager أو شحن الرصيد/تعديل الميزانية.",
  ].join("\n");
}

async function updateRuleCheckState(rule, observation, triggered, force = false) {
  if (force) return;

  await safeQuery(() =>
    getSharedPrismaClient().facebookAdsBudgetAlertRule.update({
      where: { id: rule.id },
      data: {
        lastCheckedAt: new Date(),
        lastObservedValue: toNullableNumber(observation.observedValue),
        lastObservedLabel: observation.available
          ? formatMoney(observation.observedValue, observation.currency)
          : observation.reason || "غير متاح",
        lastState: triggered ? rule.lastState : ALERT_STATES.OK,
      },
    }),
  );
}

async function markRuleTriggered(rule, observation, force = false) {
  if (force) return;

  await safeQuery(() =>
    getSharedPrismaClient().facebookAdsBudgetAlertRule.update({
      where: { id: rule.id },
      data: {
        lastCheckedAt: new Date(),
        lastTriggeredAt: new Date(),
        lastObservedValue: toNullableNumber(observation.observedValue),
        lastObservedLabel: observation.available
          ? formatMoney(observation.observedValue, observation.currency)
          : observation.reason || "غير متاح",
        lastState: ALERT_STATES.TRIGGERED,
      },
    }),
  );
}

async function recordAlertLog({ rule, observation, recipientPhone, status, message, result }) {
  return safeQuery(() =>
    getSharedPrismaClient().facebookAdsBudgetAlertLog.create({
      data: {
        ruleId: rule.id,
        companyId: rule.companyId,
        adAccountId: rule.adAccountId || null,
        campaignId: rule.campaignId || null,
        metric: rule.metric,
        thresholdAmount: rule.thresholdAmount,
        observedValue: toNullableNumber(observation.observedValue),
        currency: observation.currency || rule.currency || "EGP",
        recipientPhone,
        whatsappNotificationLogId: result?.notificationId || null,
        status,
        message,
        failureReason: result?.reason || result?.error || null,
        metadata: JSON.stringify({
          targetName: observation.targetName,
          targetKind: observation.targetKind,
          metricLabel: observation.metricLabel,
          observation: observation.metadata || {},
        }),
      },
    }),
  );
}

async function deliverAlert(rule, observation, { force = false } = {}) {
  const recipientPhones = parseRecipientPhones(rule.recipientPhones);
  const message = buildAlertMessage(rule, observation);

  // 🚨 بث إشعار فوري عبر محرك حوادث السيستم (Socket + InApp + Web Push + Telegram)
  try {
    const systemIncidentAlertService = require("./systemIncidentAlertService");
    const isCampaignFinished = rule.metric === ALERT_METRICS.CAMPAIGN_FINISHED;
    await systemIncidentAlertService.dispatchIncident({
      companyId: rule.companyId,
      incidentType: isCampaignFinished
        ? systemIncidentAlertService.INCIDENT_TYPES.AD_CAMPAIGN_STOPPED
        : systemIncidentAlertService.INCIDENT_TYPES.AD_ACCOUNT_ISSUE,
      title: isCampaignFinished
        ? `⚠️ توقف الحملة الإعلانية (${observation.targetName})`
        : `⚠️ تنبيه رصيد/ميزانية الإعلانات (${observation.targetName})`,
      message,
      severity: isCampaignFinished
        ? systemIncidentAlertService.SEVERITIES.CRITICAL
        : systemIncidentAlertService.SEVERITIES.WARNING,
      entityId: rule.campaignId || rule.adAccountId || rule.id,
      url: "/facebook-ads",
      metadata: {
        metric: rule.metric,
        observedValue: observation.observedValue,
        currency: observation.currency,
      },
    });
  } catch (incErr) {
    console.warn("⚠️ [ADS-BUDGET-ALERT] Failed to dispatch incident:", incErr.message);
  }

  if (recipientPhones.length === 0) {
    const failedResult = { success: false, reason: "no_recipients" };
    await recordAlertLog({
      rule,
      observation,
      recipientPhone: "",
      status: "FAILED",
      message,
      result: failedResult,
    });
    return {
      success: false,
      reason: "no_recipients",
      results: [failedResult],
    };
  }

  const results = [];
  for (const recipientPhone of recipientPhones) {
    const result = await WhatsAppNotificationService.sendNotification({
      companyId: rule.companyId,
      recipientPhone,
      recipientName: "مسؤول الإعلانات",
      recipientType: "ADMIN",
      category: "SYSTEM",
      eventType: "ANNOUNCEMENT",
      contentOverride: message,
      variables: {
        targetName: observation.targetName,
        remainingAmount: formatMoney(observation.observedValue, observation.currency),
        thresholdAmount: formatMoney(rule.thresholdAmount, observation.currency),
        currency: observation.currency,
      },
      priority: 1,
    });

    await recordAlertLog({
      rule,
      observation,
      recipientPhone,
      status: result.success ? "SENT" : "FAILED",
      message,
      result,
    });

    results.push({ recipientPhone, ...result });
  }

  if (!force) {
    await markRuleTriggered(rule, observation, force);
  }

  return {
    success: results.some((result) => result.success),
    message,
    results,
  };
}

async function evaluateRule(rule, options = {}) {
  const context = options.context || createEvaluationContext();
  const force = Boolean(options.force);
  const observation = await buildObservation(rule, context);
  const triggered = force || isObservationTriggered(rule, observation);

  if (!triggered) {
    await updateRuleCheckState(rule, observation, false, force);
    return {
      ruleId: rule.id,
      triggered: false,
      delivered: false,
      reason: observation.available ? "not_triggered" : observation.reason,
      observation,
    };
  }

  if (!force && rule.lastState === ALERT_STATES.TRIGGERED) {
    await updateRuleCheckState(rule, observation, true, force);
    return {
      ruleId: rule.id,
      triggered: true,
      delivered: false,
      reason: "already_triggered",
      observation,
    };
  }

  if (!force && isWithinCooldown(rule)) {
    await updateRuleCheckState(rule, observation, true, force);
    return {
      ruleId: rule.id,
      triggered: true,
      delivered: false,
      reason: "cooldown",
      observation,
    };
  }

  const delivery = await deliverAlert(rule, observation, { force });
  if (!delivery.success && !force) {
    await safeQuery(() =>
      getSharedPrismaClient().facebookAdsBudgetAlertRule.update({
        where: { id: rule.id },
        data: {
          lastCheckedAt: new Date(),
          lastTriggeredAt: new Date(),
          lastObservedValue: toNullableNumber(observation.observedValue),
          lastObservedLabel: observation.available
            ? formatMoney(observation.observedValue, observation.currency)
            : observation.reason || "غير متاح",
        },
      }),
    );
  }

  return {
    ruleId: rule.id,
    triggered: true,
    delivered: delivery.success,
    observation,
    delivery,
  };
}

async function listRules(companyId) {
  const rules = await getSharedPrismaClient().facebookAdsBudgetAlertRule.findMany({
    where: buildRuleWhere(companyId),
    include: {
      adAccount: {
        select: { id: true, accountId: true, name: true, currency: true },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          budgetType: true,
          budgetAmount: true,
          status: true,
          facebookCampaignId: true,
        },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: [{ isEnabled: "desc" }, { updatedAt: "desc" }],
  });

  return rules.map((rule) => ({
    ...serializeRule(rule),
    logs: (rule.logs || []).map(serializeLog),
  }));
}

async function listLogs(companyId, limit = 50) {
  const logs = await getSharedPrismaClient().facebookAdsBudgetAlertLog.findMany({
    where: { companyId },
    include: {
      rule: {
        select: { id: true, scope: true, metric: true, thresholdAmount: true },
      },
      adAccount: {
        select: { id: true, accountId: true, name: true, currency: true },
      },
      campaign: {
        select: { id: true, name: true, budgetType: true, budgetAmount: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(limit) || 50, 1), 100),
  });

  return logs.map(serializeLog);
}

function normalizeRulePayload(payload = {}) {
  const metric = String(payload.metric || ALERT_METRICS.ACCOUNT_BALANCE).toUpperCase();
  const scope = String(
    payload.scope ||
      (metric.startsWith("CAMPAIGN") ? ALERT_SCOPES.CAMPAIGN : ALERT_SCOPES.AD_ACCOUNT),
  ).toUpperCase();
  const thresholdAmount =
    metric === ALERT_METRICS.CAMPAIGN_FINISHED
      ? 0
      : toNullableNumber(payload.thresholdAmount);
  const recipientPhones = parseRecipientPhones(payload.recipientPhones);

  if (!Object.values(ALERT_SCOPES).includes(scope)) {
    throw new Error("نوع التنبيه غير صحيح");
  }

  if (!Object.values(ALERT_METRICS).includes(metric)) {
    throw new Error("مقياس التنبيه غير صحيح");
  }

  if (thresholdAmount === null) {
    throw new Error("قيمة حد التنبيه مطلوبة");
  }

  if (recipientPhones.length === 0) {
    throw new Error("أضف رقم WhatsApp واحد على الأقل");
  }

  return {
    adAccountId: payload.adAccountId || null,
    campaignId: payload.campaignId || null,
    scope,
    metric,
    thresholdAmount,
    currency: payload.currency || "EGP",
    recipientPhones: JSON.stringify(recipientPhones),
    isEnabled: payload.isEnabled !== false,
    cooldownMinutes: Math.max(Number(payload.cooldownMinutes) || 720, 15),
    settings: payload.settings ? JSON.stringify(payload.settings) : null,
  };
}

async function assertRuleReferences(companyId, data) {
  if (data.adAccountId) {
    const normalizedAccountId = normalizeAdAccountId(data.adAccountId);
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: {
        companyId,
        OR: [
          { id: data.adAccountId },
          { accountId: normalizedAccountId },
          { accountId: `act_${normalizedAccountId}` },
        ],
      },
      select: { id: true },
    });
    if (!adAccount) throw new Error("الحساب الإعلاني غير موجود");
    data.adAccountId = adAccount.id;
  }

  if (data.campaignId) {
    const campaign = await getSharedPrismaClient().facebookCampaign.findFirst({
      where: { id: data.campaignId, companyId },
      select: { id: true, adAccountId: true },
    });
    if (!campaign) throw new Error("الحملة غير موجودة");
    if (!data.adAccountId && campaign.adAccountId) {
      data.adAccountId = campaign.adAccountId;
    }
  }

  if (data.scope === ALERT_SCOPES.CAMPAIGN && !data.campaignId) {
    throw new Error("اختار حملة للتنبيه");
  }

  if (data.scope === ALERT_SCOPES.AD_ACCOUNT && !data.adAccountId) {
    throw new Error("اختار حساب إعلاني للتنبيه");
  }
}

async function createRule(companyId, payload) {
  const data = normalizeRulePayload(payload);
  await assertRuleReferences(companyId, data);

  const rule = await getSharedPrismaClient().facebookAdsBudgetAlertRule.create({
    data: {
      companyId,
      ...data,
    },
    include: {
      adAccount: {
        select: { id: true, accountId: true, name: true, currency: true, timezone: true, isActive: true },
      },
      campaign: {
        select: {
          id: true,
          facebookCampaignId: true,
          name: true,
          status: true,
          budgetType: true,
          budgetAmount: true,
        },
      },
    },
  });

  return serializeRule(rule);
}

async function updateRule(companyId, ruleId, payload) {
  const existing = await getSharedPrismaClient().facebookAdsBudgetAlertRule.findFirst({
    where: { id: ruleId, companyId },
  });
  if (!existing) throw new Error("قاعدة التنبيه غير موجودة");

  const normalized = normalizeRulePayload({
    ...existing,
    ...payload,
    recipientPhones:
      payload.recipientPhones !== undefined
        ? payload.recipientPhones
        : existing.recipientPhones,
  });
  await assertRuleReferences(companyId, normalized);

  const shouldResetState =
    normalized.thresholdAmount !== existing.thresholdAmount ||
    normalized.metric !== existing.metric ||
    normalized.campaignId !== existing.campaignId ||
    normalized.adAccountId !== existing.adAccountId;

  const rule = await getSharedPrismaClient().facebookAdsBudgetAlertRule.update({
    where: { id: ruleId },
    data: {
      ...normalized,
      ...(shouldResetState
        ? {
            lastState: ALERT_STATES.OK,
            lastTriggeredAt: null,
          }
        : {}),
    },
    include: {
      adAccount: {
        select: { id: true, accountId: true, name: true, currency: true, timezone: true, isActive: true },
      },
      campaign: {
        select: {
          id: true,
          facebookCampaignId: true,
          name: true,
          status: true,
          budgetType: true,
          budgetAmount: true,
        },
      },
    },
  });

  return serializeRule(rule);
}

async function deleteRule(companyId, ruleId) {
  const rule = await getSharedPrismaClient().facebookAdsBudgetAlertRule.findFirst({
    where: { id: ruleId, companyId },
  });
  if (!rule) throw new Error("قاعدة التنبيه غير موجودة");

  await getSharedPrismaClient().facebookAdsBudgetAlertRule.delete({
    where: { id: ruleId },
  });

  return { success: true };
}

async function runRuleById(companyId, ruleId, options = {}) {
  const rule = await getSharedPrismaClient().facebookAdsBudgetAlertRule.findFirst({
    where: { id: ruleId, companyId },
    include: { adAccount: true, campaign: { include: { facebookAdAccount: true } } },
  });
  if (!rule) throw new Error("قاعدة التنبيه غير موجودة");

  return evaluateRule(rule, options);
}

async function runDueRules(options = {}) {
  const context = createEvaluationContext();
  const where = {
    isEnabled: true,
    ...(options.companyId ? { companyId: options.companyId } : {}),
  };

  const rules = await getSharedPrismaClient().facebookAdsBudgetAlertRule.findMany({
    where,
    include: { adAccount: true, campaign: { include: { facebookAdAccount: true } } },
    orderBy: { updatedAt: "asc" },
    take: Math.min(Math.max(Number(options.limit) || 100, 1), 250),
  });

  const results = [];
  for (const rule of rules) {
    try {
      results.push(await evaluateRule(rule, { context }));
    } catch (error) {
      console.error(
        `❌ [ADS-BUDGET-ALERT] Rule ${rule.id} evaluation failed:`,
        error,
      );
      results.push({
        ruleId: rule.id,
        triggered: false,
        delivered: false,
        reason: "error",
        error: error.message,
      });
    }
  }

  return {
    checked: rules.length,
    delivered: results.filter((result) => result.delivered).length,
    triggered: results.filter((result) => result.triggered).length,
    results,
  };
}

async function previewRule(companyId, payload) {
  const data = normalizeRulePayload(payload);
  await assertRuleReferences(companyId, data);
  const rule = {
    id: "preview",
    companyId,
    lastState: ALERT_STATES.OK,
    lastTriggeredAt: null,
    ...data,
    adAccount: data.adAccountId
      ? await getSharedPrismaClient().facebookAdAccount.findFirst({
          where: { id: data.adAccountId, companyId },
        })
      : null,
    campaign: data.campaignId
      ? await getSharedPrismaClient().facebookCampaign.findFirst({
          where: { id: data.campaignId, companyId },
          include: { facebookAdAccount: true },
        })
      : null,
  };

  const observation = await buildObservation(rule, createEvaluationContext());
  return {
    observation,
    wouldTrigger: isObservationTriggered(rule, observation),
    message: observation.available ? buildAlertMessage(rule, observation) : null,
  };
}

module.exports = {
  ALERT_SCOPES,
  ALERT_METRICS,
  METRIC_LABELS,
  parseRecipientPhones,
  stringifyRecipientPhones,
  serializeRule,
  serializeLog,
  listRules,
  listLogs,
  createRule,
  updateRule,
  deleteRule,
  runRuleById,
  runDueRules,
  previewRule,
  evaluateRule,
  isObservationTriggered,
  buildAlertMessage,
  createEvaluationContext,
};
