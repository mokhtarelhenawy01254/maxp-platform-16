const ONBOARDING_STEP_IDS = ["welcome", "operations", "identity", "integrations"];
const ACTIVATION_STEP_IDS = ["catalog", "storefront", "channel", "orders"];

export const ONBOARDING_STEP_LABELS = {
  welcome: "البداية",
  operations: "التشغيل",
  identity: "الهوية",
  integrations: "القنوات",
};

export const ACTIVATION_STEP_LABELS = {
  catalog: "المنتجات",
  storefront: "واجهة المتجر",
  channel: "قناة التواصل",
  orders: "أول طلب",
};

const EVENT_LABELS = {
  register_completed: "أكمل التسجيل",
  onboarding_started: "بدأ الـ onboarding",
  onboarding_completed: "أنهى الـ onboarding",
  activation_completed: "أكمل الإطلاق الأول",
};

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeCount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? Math.round(numericValue)
    : 0;
};

const normalizeIsoString = (value) => {
  const normalizedValue = cleanString(value);
  return normalizedValue || null;
};

const normalizeStepIdArray = (value, allowedStepIds) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueStepIds = new Set();

  return value
    .map((stepId) => cleanString(stepId))
    .filter((stepId) => allowedStepIds.includes(stepId))
    .filter((stepId) => {
      if (uniqueStepIds.has(stepId)) {
        return false;
      }

      uniqueStepIds.add(stepId);
      return true;
    });
};

const buildOnboardingStepMap = (source = {}) =>
  ONBOARDING_STEP_IDS.reduce((accumulator, stepId) => {
    const stepSource =
      source && typeof source[stepId] === "object" ? source[stepId] : {};

    accumulator[stepId] = {
      viewCount: normalizeCount(stepSource.viewCount),
      saveCount: normalizeCount(stepSource.saveCount),
      skipCount: normalizeCount(stepSource.skipCount),
      firstViewedAt: normalizeIsoString(stepSource.firstViewedAt),
      lastViewedAt: normalizeIsoString(stepSource.lastViewedAt),
      lastSavedAt: normalizeIsoString(stepSource.lastSavedAt),
      completedAt: normalizeIsoString(stepSource.completedAt),
    };

    return accumulator;
  }, {});

const buildActivationStepMap = (source = {}) =>
  ACTIVATION_STEP_IDS.reduce((accumulator, stepId) => {
    const stepSource =
      source && typeof source[stepId] === "object" ? source[stepId] : {};

    accumulator[stepId] = {
      viewCount: normalizeCount(stepSource.viewCount),
      firstViewedAt: normalizeIsoString(stepSource.firstViewedAt),
      lastViewedAt: normalizeIsoString(stepSource.lastViewedAt),
      completedAt: normalizeIsoString(stepSource.completedAt),
    };

    return accumulator;
  }, {});

const getCompletionPct = (completedCount, totalSteps) =>
  totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

const parseSettings = (rawSettings) => {
  if (!rawSettings) {
    return {};
  }

  if (typeof rawSettings === "object") {
    return rawSettings;
  }

  try {
    const parsed = JSON.parse(rawSettings);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};

const getProvidedSummary = (input = {}) => {
  if (input?.analytics && input?.stageKey) {
    return input;
  }

  if (input?.funnelSummary?.analytics && input?.funnelSummary?.stageKey) {
    return input.funnelSummary;
  }

  return getCompanyFunnelSummary(input);
};

const getLatestIsoValue = (values = []) => {
  let latestIsoValue = null;
  let latestTimestamp = 0;

  values.forEach((value) => {
    const isoValue = normalizeIsoString(value);
    if (!isoValue) {
      return;
    }

    const timestamp = new Date(isoValue).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= latestTimestamp) {
      return;
    }

    latestTimestamp = timestamp;
    latestIsoValue = isoValue;
  });

  return latestIsoValue;
};

const formatRelativeTimeLabel = (dateValue) => {
  const isoValue = normalizeIsoString(dateValue);
  if (!isoValue) {
    return "بدون نشاط";
  }

  const timestamp = new Date(isoValue).getTime();
  if (!Number.isFinite(timestamp)) {
    return "بدون نشاط";
  }

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absoluteMinutes = Math.abs(diffMinutes);

  let value = diffMinutes;
  let unit = "minute";

  if (absoluteMinutes >= 60 * 24 * 30) {
    value = Math.round(diffMinutes / (60 * 24 * 30));
    unit = "month";
  } else if (absoluteMinutes >= 60 * 24 * 7) {
    value = Math.round(diffMinutes / (60 * 24 * 7));
    unit = "week";
  } else if (absoluteMinutes >= 60 * 24) {
    value = Math.round(diffMinutes / (60 * 24));
    unit = "day";
  } else if (absoluteMinutes >= 60) {
    value = Math.round(diffMinutes / 60);
    unit = "hour";
  }

  try {
    return new Intl.RelativeTimeFormat("ar", { numeric: "auto" }).format(
      value,
      unit,
    );
  } catch (_) {
    return "منذ فترة قصيرة";
  }
};

const getNextActivationStepId = (analytics) => {
  const completedStepIds = new Set(analytics.activation.completedStepIds);

  return (
    ACTIVATION_STEP_IDS.find((stepId) => !completedStepIds.has(stepId)) ||
    analytics.activation.lastViewedStepId ||
    null
  );
};

const PENDING_STAGE_KEYS = new Set([
  "registered_no_start",
  "onboarding_in_progress",
  "activation_in_progress",
]);

export const normalizeFunnelAnalytics = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const onboardingSource =
    source.onboarding && typeof source.onboarding === "object"
      ? source.onboarding
      : {};
  const activationSource =
    source.activation && typeof source.activation === "object"
      ? source.activation
      : {};

  const onboardingSteps = buildOnboardingStepMap(onboardingSource.steps);
  const activationSteps = buildActivationStepMap(activationSource.steps);

  const onboardingCompletedStepIds = normalizeStepIdArray(
    onboardingSource.completedStepIds,
    ONBOARDING_STEP_IDS,
  );
  const activationCompletedStepIds = normalizeStepIdArray(
    activationSource.completedStepIds,
    ACTIVATION_STEP_IDS,
  );

  const onboardingCompletedCount =
    onboardingCompletedStepIds.length ||
    ONBOARDING_STEP_IDS.filter((stepId) => onboardingSteps[stepId].completedAt).length;
  const activationCompletedCount =
    activationCompletedStepIds.length ||
    ACTIVATION_STEP_IDS.filter((stepId) => activationSteps[stepId].completedAt).length;

  const onboardingStatus =
    onboardingCompletedCount >= ONBOARDING_STEP_IDS.length
      ? "completed"
      : onboardingSource.status === "in_progress"
        ? "in_progress"
        : onboardingSource.status === "completed"
          ? "completed"
          : "not_started";
  const activationStatus =
    activationCompletedCount >= ACTIVATION_STEP_IDS.length
      ? "completed"
      : activationSource.status === "in_progress"
        ? "in_progress"
        : activationSource.status === "completed"
          ? "completed"
          : "not_started";

  return {
    register: {
      firstCompletedAt: normalizeIsoString(source.register?.firstCompletedAt),
      lastCompletedAt: normalizeIsoString(source.register?.lastCompletedAt),
      source: cleanString(source.register?.source),
      partnerCode: cleanString(source.register?.partnerCode),
      promoCode: cleanString(source.register?.promoCode),
      userId: cleanString(source.register?.userId),
    },
    onboarding: {
      status: onboardingStatus,
      startedAt: normalizeIsoString(onboardingSource.startedAt),
      completedAt: normalizeIsoString(onboardingSource.completedAt),
      lastEventAt: normalizeIsoString(onboardingSource.lastEventAt),
      lastViewedStepId: cleanString(onboardingSource.lastViewedStepId) || null,
      lastSavedStepId: cleanString(onboardingSource.lastSavedStepId) || null,
      lastSkippedStepId: cleanString(onboardingSource.lastSkippedStepId) || null,
      completedStepIds: normalizeStepIdArray(
        onboardingCompletedStepIds.length
          ? onboardingCompletedStepIds
          : ONBOARDING_STEP_IDS.filter((stepId) => onboardingSteps[stepId].completedAt),
        ONBOARDING_STEP_IDS,
      ),
      completedCount: onboardingCompletedCount,
      totalSteps: ONBOARDING_STEP_IDS.length,
      completionPct: getCompletionPct(
        onboardingCompletedCount,
        ONBOARDING_STEP_IDS.length,
      ),
      steps: onboardingSteps,
    },
    activation: {
      status: activationStatus,
      startedAt: normalizeIsoString(activationSource.startedAt),
      completedAt: normalizeIsoString(activationSource.completedAt),
      lastEventAt: normalizeIsoString(activationSource.lastEventAt),
      lastViewedStepId: cleanString(activationSource.lastViewedStepId) || null,
      completedStepIds: normalizeStepIdArray(
        activationCompletedStepIds.length
          ? activationCompletedStepIds
          : ACTIVATION_STEP_IDS.filter((stepId) => activationSteps[stepId].completedAt),
        ACTIVATION_STEP_IDS,
      ),
      completedCount: activationCompletedCount,
      totalSteps: ACTIVATION_STEP_IDS.length,
      completionPct: getCompletionPct(
        activationCompletedCount,
        ACTIVATION_STEP_IDS.length,
      ),
      steps: activationSteps,
    },
    recentEvents: Array.isArray(source.recentEvents)
      ? source.recentEvents
          .filter((event) => event && typeof event === "object")
          .map((event) => ({
            type: cleanString(event.type),
            stepId: cleanString(event.stepId) || null,
            occurredAt: normalizeIsoString(event.occurredAt),
            source: cleanString(event.source),
            metadata:
              event.metadata && typeof event.metadata === "object"
                ? event.metadata
                : null,
          }))
      : [],
  };
};

export const getCompanyFunnelAnalytics = (company = {}) => {
  if (company?.funnelAnalytics && typeof company.funnelAnalytics === "object") {
    return normalizeFunnelAnalytics(company.funnelAnalytics);
  }

  const settings = parseSettings(company?.settings);
  return normalizeFunnelAnalytics(settings.funnelAnalytics);
};

const getLastKnownStepLabel = (analytics) => {
  if (analytics.activation.lastViewedStepId) {
    return ACTIVATION_STEP_LABELS[analytics.activation.lastViewedStepId] || null;
  }

  const lastCompletedActivationStepId =
    analytics.activation.completedStepIds[analytics.activation.completedStepIds.length - 1];
  if (lastCompletedActivationStepId) {
    return ACTIVATION_STEP_LABELS[lastCompletedActivationStepId] || null;
  }

  if (analytics.onboarding.lastSavedStepId) {
    return ONBOARDING_STEP_LABELS[analytics.onboarding.lastSavedStepId] || null;
  }

  if (analytics.onboarding.lastViewedStepId) {
    return ONBOARDING_STEP_LABELS[analytics.onboarding.lastViewedStepId] || null;
  }

  return null;
};

export const getCompanyFunnelSummary = (company = {}) => {
  const analytics = getCompanyFunnelAnalytics(company);
  const registerTracked = Boolean(
    analytics.register.firstCompletedAt || analytics.register.lastCompletedAt,
  );
  const lastKnownStepLabel = getLastKnownStepLabel(analytics);

  if (analytics.activation.status === "completed") {
    return {
      analytics,
      stageKey: "activated",
      label: "مفعلة بالكامل",
      shortLabel: "مفعلة",
      progressLabel: `${analytics.activation.completedCount}/${analytics.activation.totalSteps}`,
      hint: analytics.activation.completedAt
        ? `اكتمل الإطلاق الأول`
        : "أكملت الرحلة بالكامل",
      badgeClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }

  if (analytics.onboarding.status === "completed") {
    return {
      analytics,
      stageKey: "activation_in_progress",
      label: "التفعيل جارٍ",
      shortLabel: "تفعيل",
      progressLabel: `${analytics.activation.completedCount}/${analytics.activation.totalSteps}`,
      hint: lastKnownStepLabel
        ? `آخر تفاعل: ${lastKnownStepLabel}`
        : "أنهت الـ onboarding وتحتاج أول قيمة فعلية",
      badgeClassName:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  if (analytics.onboarding.status === "in_progress") {
    return {
      analytics,
      stageKey: "onboarding_in_progress",
      label: "Onboarding جارٍ",
      shortLabel: "Onboarding",
      progressLabel: `${analytics.onboarding.completedCount}/${analytics.onboarding.totalSteps}`,
      hint: lastKnownStepLabel
        ? `آخر خطوة: ${lastKnownStepLabel}`
        : "ما زالت في بداية الإعداد",
      badgeClassName:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300",
    };
  }

  if (registerTracked) {
    return {
      analytics,
      stageKey: "registered_no_start",
      label: "سجلت ولم تبدأ",
      shortLabel: "مسجلة",
      progressLabel: `0/${analytics.onboarding.totalSteps}`,
      hint: "أكملت التسجيل ولم تدخل الـ onboarding بعد",
      badgeClassName:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
    };
  }

  return {
    analytics,
    stageKey: "untracked",
    label: "بدون Funnel",
    shortLabel: "غير متتبعة",
    progressLabel: "-",
    hint: "غالبًا شركة قديمة أو لم تمر بالمسار الجديد",
    badgeClassName:
      "border-border/70 bg-background text-muted-foreground dark:border-white/10 dark:bg-slate-950/50",
  };
};

export const getCompaniesFunnelStats = (companies = []) => {
  return companies.reduce(
    (accumulator, company) => {
      const summary = getCompanyFunnelSummary(company);

      accumulator.trackedCompanies += summary.stageKey === "untracked" ? 0 : 1;
      accumulator.untrackedCompanies += summary.stageKey === "untracked" ? 1 : 0;
      accumulator.registeredNoStart +=
        summary.stageKey === "registered_no_start" ? 1 : 0;
      accumulator.onboardingInProgress +=
        summary.stageKey === "onboarding_in_progress" ? 1 : 0;
      accumulator.activationInProgress +=
        summary.stageKey === "activation_in_progress" ? 1 : 0;
      accumulator.activated += summary.stageKey === "activated" ? 1 : 0;

      return accumulator;
    },
    {
      trackedCompanies: 0,
      untrackedCompanies: 0,
      registeredNoStart: 0,
      onboardingInProgress: 0,
      activationInProgress: 0,
      activated: 0,
    },
  );
};

export const getCompanyFunnelLastActivity = (input = {}) => {
  const summary = getProvidedSummary(input);
  const analytics = summary.analytics;
  const mostRecentEvent = [...analytics.recentEvents]
    .filter((event) => normalizeIsoString(event?.occurredAt))
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )[0];

  const occurredAt =
    mostRecentEvent?.occurredAt ||
    getLatestIsoValue([
      analytics.activation.lastEventAt,
      analytics.onboarding.lastEventAt,
      analytics.register.lastCompletedAt,
    ]);

  let label = "بدون نشاط";

  if (mostRecentEvent) {
    label = getFunnelEventLabel(mostRecentEvent);
  } else if (analytics.activation.lastEventAt) {
    label = "آخر تفاعل في التفعيل";
  } else if (analytics.onboarding.lastEventAt) {
    label = "آخر تفاعل في الـ onboarding";
  } else if (analytics.register.lastCompletedAt) {
    label = "أكمل التسجيل";
  }

  return {
    occurredAt,
    label,
    relativeLabel: formatRelativeTimeLabel(occurredAt),
    sortValue: occurredAt ? new Date(occurredAt).getTime() : 0,
  };
};

export const getCompanyFunnelStaleStatus = (input = {}) => {
  const summary = getProvidedSummary(input);
  const lastActivity = getCompanyFunnelLastActivity(summary);
  const isPending = PENDING_STAGE_KEYS.has(summary.stageKey);
  const ageMs =
    lastActivity.sortValue > 0 ? Math.max(Date.now() - lastActivity.sortValue, 0) : null;
  const ageHours = ageMs === null ? null : Math.floor(ageMs / (1000 * 60 * 60));
  const isStale24h = Boolean(isPending && ageHours !== null && ageHours >= 24);
  const isStale72h = Boolean(isPending && ageHours !== null && ageHours >= 72);
  const needsFollowUpNow = Boolean(isPending && isStale24h);

  if (!isPending) {
    return {
      isPending,
      ageHours,
      isStale24h: false,
      isStale72h: false,
      needsFollowUpNow: false,
      severity: "none",
      label: "لا يحتاج متابعة",
      hint: "المسار مكتمل أو غير خاضع لمتابعة الـ funnel الآن.",
      badgeClassName:
        "border-border/70 bg-background text-muted-foreground dark:border-white/10 dark:bg-slate-950/50",
    };
  }

  if (isStale72h) {
    return {
      isPending,
      ageHours,
      isStale24h,
      isStale72h,
      needsFollowUpNow,
      severity: "critical",
      label: "متوقف 72 ساعة+",
      hint: "الحساب متعطل منذ أكثر من 72 ساعة ويحتاج تدخلًا سريعًا.",
      badgeClassName:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }

  if (isStale24h) {
    return {
      isPending,
      ageHours,
      isStale24h,
      isStale72h,
      needsFollowUpNow,
      severity: "warning",
      label: "متوقف 24 ساعة+",
      hint: "مرّ أكثر من 24 ساعة بدون تقدم جديد في الرحلة.",
      badgeClassName:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }

  return {
    isPending,
    ageHours,
    isStale24h,
    isStale72h,
    needsFollowUpNow,
    severity: "fresh",
    label: "نشط مؤخرًا",
    hint: "ما زال الحساب يتحرك داخل الرحلة خلال آخر 24 ساعة.",
    badgeClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  };
};

export const getCompanyFunnelAttentionScore = (input = {}) => {
  const summary = getProvidedSummary(input);
  const lastActivity = getCompanyFunnelLastActivity(summary);
  const now = Date.now();
  const lastActivityAgeMs =
    lastActivity.sortValue > 0 ? Math.max(now - lastActivity.sortValue, 0) : 0;
  const lastActivityAgeDays = Math.floor(lastActivityAgeMs / (1000 * 60 * 60 * 24));

  let baseScore = 20;

  switch (summary.stageKey) {
    case "activation_in_progress":
      baseScore = 520;
      break;
    case "onboarding_in_progress":
      baseScore = 430;
      break;
    case "registered_no_start":
      baseScore = 340;
      break;
    case "untracked":
      baseScore = 140;
      break;
    case "activated":
    default:
      baseScore = 20;
      break;
  }

  const remainingSteps =
    summary.stageKey === "activation_in_progress"
      ? summary.analytics.activation.totalSteps -
        summary.analytics.activation.completedCount
      : summary.stageKey === "onboarding_in_progress"
        ? summary.analytics.onboarding.totalSteps -
          summary.analytics.onboarding.completedCount
        : summary.stageKey === "registered_no_start"
          ? summary.analytics.onboarding.totalSteps
          : 0;

  const staleBonus = lastActivity.sortValue
    ? Math.min(180, lastActivityAgeDays * 12)
    : summary.stageKey === "activated"
      ? 0
      : 140;

  return baseScore + remainingSteps * 14 + staleBonus;
};

export const getCompaniesFunnelFollowUpStats = (companies = []) => {
  return companies.reduce(
    (accumulator, company) => {
      const staleStatus = getCompanyFunnelStaleStatus(company);

      accumulator.pendingCompanies += staleStatus.isPending ? 1 : 0;
      accumulator.followUpNow += staleStatus.needsFollowUpNow ? 1 : 0;
      accumulator.stale24h += staleStatus.isStale24h ? 1 : 0;
      accumulator.stale72h += staleStatus.isStale72h ? 1 : 0;
      accumulator.activeRecently +=
        staleStatus.isPending && staleStatus.severity === "fresh" ? 1 : 0;

      return accumulator;
    },
    {
      pendingCompanies: 0,
      followUpNow: 0,
      stale24h: 0,
      stale72h: 0,
      activeRecently: 0,
    },
  );
};

export const getCompanyInterventionAction = (input = {}) => {
  const summary = getProvidedSummary(input);
  const analytics = summary.analytics;

  switch (summary.stageKey) {
    case "registered_no_start":
      return {
        mode: "impersonate",
        path: "/onboarding",
        label: "ابدأ الـ onboarding",
        hint: "ادخل كمدير الشركة وابدأ الرحلة من أول خطوة.",
      };
    case "onboarding_in_progress":
      return {
        mode: "impersonate",
        path: "/onboarding",
        label: "استكمال الـ onboarding",
        hint: analytics.onboarding.lastViewedStepId
          ? `آخر خطوة كانت ${
              ONBOARDING_STEP_LABELS[analytics.onboarding.lastViewedStepId] ||
              "الإعداد"
            }.`
          : "ارجع لرحلة الإعداد وأكمل الخطوات الناقصة.",
      };
    case "activation_in_progress": {
      const nextStepId = getNextActivationStepId(analytics);

      switch (nextStepId) {
        case "storefront":
          return {
            mode: "impersonate",
            path: "/settings/store",
            label: "تجهيز رابط المتجر",
            hint: "راجع رابط المتجر وصفحة العرض قبل أول تشغيل فعلي.",
          };
        case "channel":
          return {
            mode: "impersonate",
            path: "/whatsapp",
            label: "تفعيل قناة التواصل",
            hint: "ثبّت واتساب أو سجّل قرار القناة الأساسية.",
          };
        case "orders":
          return {
            mode: "impersonate",
            path: "/orders/manual",
            label: "إنشاء طلب تجريبي",
            hint: "اختبر أول طلب من داخل الحساب للتأكد من جاهزية التشغيل.",
          };
        case "catalog":
        default:
          return {
            mode: "impersonate",
            path: "/products/new",
            label: "إضافة أول منتج",
            hint: "ابدأ بأقرب خطوة تحقق أول قيمة فعلية للعميل.",
          };
      }
    }
    case "activated":
      return {
        mode: "impersonate",
        path: "/orders",
        label: "عرض الطلبات",
        hint: "الشركة مفعلة بالفعل؛ افتح الطلبات مباشرة للمراجعة السريعة.",
      };
    case "untracked":
    default:
      return {
        mode: "details",
        path: null,
        label: "مراجعة التفاصيل",
        hint: "افتح تفاصيل الشركة لتقييم حالتها الحالية يدويًا.",
      };
  }
};

export const getFunnelEventLabel = (event) => {
  if (!event?.type) {
    return "حدث Funnel";
  }

  if (EVENT_LABELS[event.type]) {
    return EVENT_LABELS[event.type];
  }

  if (event.type.startsWith("onboarding_")) {
    const stepLabel = event.stepId ? ONBOARDING_STEP_LABELS[event.stepId] : null;

    if (event.type === "onboarding_step_viewed" && stepLabel) {
      return `فتح خطوة ${stepLabel}`;
    }

    if (event.type === "onboarding_step_saved" && stepLabel) {
      return `حفظ خطوة ${stepLabel}`;
    }

    if (event.type === "onboarding_step_completed" && stepLabel) {
      return `أكمل خطوة ${stepLabel}`;
    }

    if (event.type === "onboarding_skipped" && stepLabel) {
      return `أجّل خطوة ${stepLabel}`;
    }
  }

  if (event.type.startsWith("activation_")) {
    const stepLabel = event.stepId ? ACTIVATION_STEP_LABELS[event.stepId] : null;

    if (event.type === "activation_viewed" && stepLabel) {
      return `راجع ${stepLabel}`;
    }

    if (event.type === "activation_step_completed" && stepLabel) {
      return `أكمل ${stepLabel}`;
    }
  }

  return event.type;
};
