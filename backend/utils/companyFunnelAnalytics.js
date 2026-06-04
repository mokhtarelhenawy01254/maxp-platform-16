const { parseCompanySettings } = require("./companyOnboarding");

const FUNNEL_ANALYTICS_VERSION = 1;
const MAX_RECENT_EVENTS = 60;
const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_ARRAY_ITEMS = 20;

const ONBOARDING_STEP_IDS = [
  "welcome",
  "operations",
  "identity",
  "integrations",
];

const ACTIVATION_STEP_IDS = [
  "catalog",
  "storefront",
  "channel",
  "orders",
];

const FUNNEL_EVENT_TYPES = [
  "register_completed",
  "onboarding_started",
  "onboarding_step_viewed",
  "onboarding_step_saved",
  "onboarding_step_completed",
  "onboarding_skipped",
  "onboarding_completed",
  "activation_viewed",
  "activation_step_completed",
  "activation_completed",
];

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
};

const normalizeIsoString = (value) => {
  const isoValue = cleanString(value);
  return isoValue || null;
};

const sanitizeMetadata = (value, depth = 0) => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (depth >= MAX_METADATA_DEPTH) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((item) => sanitizeMetadata(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entries = Object.entries(value).slice(0, MAX_METADATA_KEYS);
  const sanitizedEntries = entries.reduce((accumulator, [key, entryValue]) => {
    const sanitizedValue = sanitizeMetadata(entryValue, depth + 1);
    if (sanitizedValue !== undefined) {
      accumulator[key] = sanitizedValue;
    }
    return accumulator;
  }, {});

  return sanitizedEntries;
};

const isAllowedStepId = (stepIds, value) => {
  const normalizedValue = cleanString(value);
  return stepIds.includes(normalizedValue) ? normalizedValue : null;
};

const buildOnboardingStepAnalytics = (source = {}) => ({
  viewCount: normalizeCount(source.viewCount),
  saveCount: normalizeCount(source.saveCount),
  skipCount: normalizeCount(source.skipCount),
  firstViewedAt: normalizeIsoString(source.firstViewedAt),
  lastViewedAt: normalizeIsoString(source.lastViewedAt),
  lastSavedAt: normalizeIsoString(source.lastSavedAt),
  completedAt: normalizeIsoString(source.completedAt),
});

const buildActivationStepAnalytics = (source = {}) => ({
  viewCount: normalizeCount(source.viewCount),
  firstViewedAt: normalizeIsoString(source.firstViewedAt),
  lastViewedAt: normalizeIsoString(source.lastViewedAt),
  completedAt: normalizeIsoString(source.completedAt),
});

const buildStepAnalyticsMap = (stepIds, source = {}, builder) =>
  stepIds.reduce((accumulator, stepId) => {
    const existingStep =
      source && typeof source[stepId] === "object" ? source[stepId] : {};
    accumulator[stepId] = builder(existingStep);
    return accumulator;
  }, {});

const getCompletionPct = (completedCount, totalSteps) =>
  totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

const normalizeRecentEvent = (event) => {
  if (!event || typeof event !== "object") {
    return null;
  }

  const type = cleanString(event.type);
  if (!FUNNEL_EVENT_TYPES.includes(type)) {
    return null;
  }

  const stepId = cleanString(event.stepId) || null;
  const occurredAt = normalizeIsoString(event.occurredAt) || new Date().toISOString();
  const source = cleanString(event.source);
  const metadata = sanitizeMetadata(event.metadata);

  return {
    type,
    stepId,
    occurredAt,
    source,
    ...(metadata !== undefined ? { metadata } : {}),
  };
};

const normalizeFunnelAnalytics = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const onboardingSource =
    source.onboarding && typeof source.onboarding === "object"
      ? source.onboarding
      : {};
  const activationSource =
    source.activation && typeof source.activation === "object"
      ? source.activation
      : {};

  const onboardingSteps = buildStepAnalyticsMap(
    ONBOARDING_STEP_IDS,
    onboardingSource.steps,
    buildOnboardingStepAnalytics,
  );
  const activationSteps = buildStepAnalyticsMap(
    ACTIVATION_STEP_IDS,
    activationSource.steps,
    buildActivationStepAnalytics,
  );

  const onboardingCompletedStepIds = ONBOARDING_STEP_IDS.filter(
    (stepId) => onboardingSteps[stepId].completedAt,
  );
  const activationCompletedStepIds = ACTIVATION_STEP_IDS.filter(
    (stepId) => activationSteps[stepId].completedAt,
  );

  const onboardingStartedAt =
    normalizeIsoString(onboardingSource.startedAt) ||
    normalizeIsoString(onboardingSource.lastEventAt);
  const activationStartedAt =
    normalizeIsoString(activationSource.startedAt) ||
    normalizeIsoString(activationSource.lastEventAt);
  const onboardingCompletedAt =
    normalizeIsoString(onboardingSource.completedAt) ||
    (onboardingCompletedStepIds.length === ONBOARDING_STEP_IDS.length
      ? onboardingSteps.integrations.completedAt ||
        onboardingSteps.identity.completedAt ||
        onboardingSteps.operations.completedAt ||
        onboardingSteps.welcome.completedAt
      : null);
  const activationCompletedAt =
    normalizeIsoString(activationSource.completedAt) ||
    (activationCompletedStepIds.length === ACTIVATION_STEP_IDS.length
      ? activationSteps.orders.completedAt ||
        activationSteps.channel.completedAt ||
        activationSteps.storefront.completedAt ||
        activationSteps.catalog.completedAt
      : null);

  const recentEvents = Array.isArray(source.recentEvents)
    ? source.recentEvents
        .map(normalizeRecentEvent)
        .filter(Boolean)
        .slice(-MAX_RECENT_EVENTS)
    : [];

  return {
    version: FUNNEL_ANALYTICS_VERSION,
    register: {
      firstCompletedAt: normalizeIsoString(source.register?.firstCompletedAt),
      lastCompletedAt: normalizeIsoString(source.register?.lastCompletedAt),
      source: cleanString(source.register?.source),
      partnerCode: cleanString(source.register?.partnerCode),
      promoCode: cleanString(source.register?.promoCode),
      userId: cleanString(source.register?.userId),
    },
    onboarding: {
      status: onboardingCompletedAt
        ? "completed"
        : onboardingStartedAt
          ? "in_progress"
          : "not_started",
      startedAt: onboardingStartedAt,
      completedAt: onboardingCompletedAt,
      lastEventAt: normalizeIsoString(onboardingSource.lastEventAt),
      lastViewedStepId: isAllowedStepId(
        ONBOARDING_STEP_IDS,
        onboardingSource.lastViewedStepId,
      ),
      lastSavedStepId: isAllowedStepId(
        ONBOARDING_STEP_IDS,
        onboardingSource.lastSavedStepId,
      ),
      lastSkippedStepId: isAllowedStepId(
        ONBOARDING_STEP_IDS,
        onboardingSource.lastSkippedStepId,
      ),
      completedStepIds: onboardingCompletedStepIds,
      completedCount: onboardingCompletedStepIds.length,
      totalSteps: ONBOARDING_STEP_IDS.length,
      completionPct: getCompletionPct(
        onboardingCompletedStepIds.length,
        ONBOARDING_STEP_IDS.length,
      ),
      steps: onboardingSteps,
    },
    activation: {
      status: activationCompletedAt
        ? "completed"
        : activationStartedAt
          ? "in_progress"
          : "not_started",
      startedAt: activationStartedAt,
      completedAt: activationCompletedAt,
      lastEventAt: normalizeIsoString(activationSource.lastEventAt),
      lastViewedStepId: isAllowedStepId(
        ACTIVATION_STEP_IDS,
        activationSource.lastViewedStepId,
      ),
      completedStepIds: activationCompletedStepIds,
      completedCount: activationCompletedStepIds.length,
      totalSteps: ACTIVATION_STEP_IDS.length,
      completionPct: getCompletionPct(
        activationCompletedStepIds.length,
        ACTIVATION_STEP_IDS.length,
      ),
      steps: activationSteps,
    },
    recentEvents,
  };
};

const setOnboardingStartedAt = (analytics, occurredAt) => {
  if (!analytics.onboarding.startedAt) {
    analytics.onboarding.startedAt = occurredAt;
  }
};

const setActivationStartedAt = (analytics, occurredAt) => {
  if (!analytics.activation.startedAt) {
    analytics.activation.startedAt = occurredAt;
  }
};

const markOnboardingStepCompleted = (analytics, stepId, occurredAt) => {
  if (!stepId || !analytics.onboarding.steps[stepId]) {
    return;
  }

  if (!analytics.onboarding.steps[stepId].completedAt) {
    analytics.onboarding.steps[stepId].completedAt = occurredAt;
  }
};

const markActivationStepCompleted = (analytics, stepId, occurredAt) => {
  if (!stepId || !analytics.activation.steps[stepId]) {
    return;
  }

  if (!analytics.activation.steps[stepId].completedAt) {
    analytics.activation.steps[stepId].completedAt = occurredAt;
  }
};

const appendRecentEvent = (analytics, event) => {
  const normalizedEvent = normalizeRecentEvent(event);
  if (!normalizedEvent) {
    return;
  }

  analytics.recentEvents = [...analytics.recentEvents, normalizedEvent].slice(
    -MAX_RECENT_EVENTS,
  );
};

const getCompanyFunnelAnalytics = (company = {}) => {
  const settings = parseCompanySettings(company.settings);
  return normalizeFunnelAnalytics(settings.funnelAnalytics);
};

const recordCompanyFunnelEvent = (rawSettings, eventInput = {}) => {
  const settings = parseCompanySettings(rawSettings);
  const analytics = normalizeFunnelAnalytics(settings.funnelAnalytics);
  const type = cleanString(eventInput.type);

  if (!FUNNEL_EVENT_TYPES.includes(type)) {
    return {
      settings,
      analytics,
    };
  }

  const occurredAt = new Date().toISOString();
  const onboardingStepId = isAllowedStepId(
    ONBOARDING_STEP_IDS,
    eventInput.stepId,
  );
  const activationStepId = isAllowedStepId(
    ACTIVATION_STEP_IDS,
    eventInput.stepId,
  );
  const source = cleanString(eventInput.source);
  const metadata =
    sanitizeMetadata(eventInput.metadata) && typeof sanitizeMetadata(eventInput.metadata) === "object"
      ? sanitizeMetadata(eventInput.metadata)
      : sanitizeMetadata(eventInput.metadata);

  switch (type) {
    case "register_completed":
      if (!analytics.register.firstCompletedAt) {
        analytics.register.firstCompletedAt = occurredAt;
      }
      analytics.register.lastCompletedAt = occurredAt;
      analytics.register.source =
        cleanString(metadata?.eventSource) ||
        cleanString(metadata?.source) ||
        source ||
        analytics.register.source;
      analytics.register.partnerCode =
        cleanString(metadata?.partnerCode) || analytics.register.partnerCode;
      analytics.register.promoCode =
        cleanString(metadata?.promoCode) || analytics.register.promoCode;
      analytics.register.userId =
        cleanString(metadata?.userId) || analytics.register.userId;
      break;
    case "onboarding_started":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      if (onboardingStepId) {
        analytics.onboarding.lastViewedStepId = onboardingStepId;
      }
      break;
    case "onboarding_step_viewed":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      if (onboardingStepId) {
        const step = analytics.onboarding.steps[onboardingStepId];
        step.viewCount += 1;
        if (!step.firstViewedAt) {
          step.firstViewedAt = occurredAt;
        }
        step.lastViewedAt = occurredAt;
        analytics.onboarding.lastViewedStepId = onboardingStepId;
      }
      break;
    case "onboarding_step_saved":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      if (onboardingStepId) {
        const step = analytics.onboarding.steps[onboardingStepId];
        step.saveCount += 1;
        step.lastSavedAt = occurredAt;
        analytics.onboarding.lastSavedStepId = onboardingStepId;
      }
      break;
    case "onboarding_step_completed":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      markOnboardingStepCompleted(analytics, onboardingStepId, occurredAt);
      break;
    case "onboarding_skipped":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      if (onboardingStepId) {
        analytics.onboarding.steps[onboardingStepId].skipCount += 1;
        analytics.onboarding.lastSkippedStepId = onboardingStepId;
      }
      break;
    case "onboarding_completed":
      setOnboardingStartedAt(analytics, occurredAt);
      analytics.onboarding.lastEventAt = occurredAt;
      ONBOARDING_STEP_IDS.forEach((stepId) =>
        markOnboardingStepCompleted(analytics, stepId, occurredAt),
      );
      analytics.onboarding.completedAt =
        analytics.onboarding.completedAt || occurredAt;
      break;
    case "activation_viewed":
      setActivationStartedAt(analytics, occurredAt);
      analytics.activation.lastEventAt = occurredAt;
      if (activationStepId) {
        const step = analytics.activation.steps[activationStepId];
        step.viewCount += 1;
        if (!step.firstViewedAt) {
          step.firstViewedAt = occurredAt;
        }
        step.lastViewedAt = occurredAt;
        analytics.activation.lastViewedStepId = activationStepId;
      }
      if (Array.isArray(metadata?.completedStepIds)) {
        metadata.completedStepIds.forEach((stepId) =>
          markActivationStepCompleted(analytics, stepId, occurredAt),
        );
      }
      break;
    case "activation_step_completed":
      setActivationStartedAt(analytics, occurredAt);
      analytics.activation.lastEventAt = occurredAt;
      markActivationStepCompleted(analytics, activationStepId, occurredAt);
      break;
    case "activation_completed":
      setActivationStartedAt(analytics, occurredAt);
      analytics.activation.lastEventAt = occurredAt;
      if (Array.isArray(metadata?.completedStepIds) && metadata.completedStepIds.length > 0) {
        metadata.completedStepIds.forEach((stepId) =>
          markActivationStepCompleted(analytics, stepId, occurredAt),
        );
      } else {
        ACTIVATION_STEP_IDS.forEach((stepId) =>
          markActivationStepCompleted(analytics, stepId, occurredAt),
        );
      }
      analytics.activation.completedAt =
        analytics.activation.completedAt || occurredAt;
      break;
    default:
      break;
  }

  appendRecentEvent(analytics, {
    type,
    stepId: onboardingStepId || activationStepId,
    occurredAt,
    source,
    metadata,
  });

  settings.funnelAnalytics = normalizeFunnelAnalytics(analytics);

  return {
    settings,
    analytics: settings.funnelAnalytics,
  };
};

const getOnboardingStepIdByNumber = (stepNumber) => {
  const numericStep = Number(stepNumber);
  if (!Number.isFinite(numericStep)) {
    return null;
  }

  return ONBOARDING_STEP_IDS[Math.round(numericStep) - 1] || null;
};

module.exports = {
  FUNNEL_EVENT_TYPES,
  ONBOARDING_STEP_IDS,
  ACTIVATION_STEP_IDS,
  getCompanyFunnelAnalytics,
  getOnboardingStepIdByNumber,
  recordCompanyFunnelEvent,
};
