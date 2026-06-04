const ONBOARDING_VERSION = 1;
const ONBOARDING_STEP_IDS = [
  "welcome",
  "operations",
  "identity",
  "integrations",
];
const FINAL_ONBOARDING_STEP = ONBOARDING_STEP_IDS.length;
const DEFAULT_CURRENCY = "EGP";
const DEFAULT_TONE = "executive";

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const clampStep = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.min(
    FINAL_ONBOARDING_STEP,
    Math.max(1, Math.round(numericValue)),
  );
};

const uniqueStepIds = (stepIds) => {
  const seen = new Set();
  const ordered = [];

  for (const stepId of Array.isArray(stepIds) ? stepIds : []) {
    if (!ONBOARDING_STEP_IDS.includes(stepId) || seen.has(stepId)) {
      continue;
    }

    seen.add(stepId);
    ordered.push(stepId);
  }

  return ordered;
};

const parseCompanySettings = (rawSettings) => {
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

const serializeCompanySettings = (settings) => JSON.stringify(settings || {});

const buildProfileSeed = ({ company = {}, user = {} } = {}) => ({
  workspaceName: cleanString(company.name),
  industry: "",
  currency: cleanString(company.currency) || DEFAULT_CURRENCY,
  tone: DEFAULT_TONE,
  whatsappNumber: "",
  phone: cleanString(user.phone) || cleanString(company.phone),
});

const normalizeOnboardingState = (inputState, context = {}) => {
  const nowIso = new Date().toISOString();
  const profileSeed = buildProfileSeed(context);
  const source =
    inputState && typeof inputState === "object" ? inputState : {};
  const sourceProfile =
    source.profile && typeof source.profile === "object" ? source.profile : {};

  const profile = {
    workspaceName:
      cleanString(sourceProfile.workspaceName) || profileSeed.workspaceName,
    industry: cleanString(sourceProfile.industry),
    currency: cleanString(sourceProfile.currency) || profileSeed.currency,
    tone: cleanString(sourceProfile.tone) || profileSeed.tone,
    whatsappNumber:
      cleanString(sourceProfile.whatsappNumber) || profileSeed.whatsappNumber,
    phone: cleanString(sourceProfile.phone) || profileSeed.phone,
  };

  const completedSteps = uniqueStepIds(source.completedSteps);
  if (!completedSteps.includes("welcome")) {
    completedSteps.unshift("welcome");
  }

  const hasOperationsData = Boolean(
    cleanString(sourceProfile.workspaceName) &&
      cleanString(sourceProfile.industry) &&
      cleanString(sourceProfile.currency),
  );
  const channelsDeferred = Boolean(source.channelsDeferred);
  const hasChannelChoice = Boolean(
    channelsDeferred ||
      cleanString(sourceProfile.whatsappNumber) ||
      completedSteps.includes("integrations") ||
      source.status === "completed",
  );

  if (hasOperationsData && !completedSteps.includes("operations")) {
    completedSteps.push("operations");
  }

  if (hasChannelChoice && !completedSteps.includes("integrations")) {
    completedSteps.push("integrations");
  }

  const status = source.status === "completed" ? "completed" : "in_progress";
  const orderedCompletedSteps = uniqueStepIds(completedSteps);
  const nextStepId =
    status === "completed"
      ? null
      : ONBOARDING_STEP_IDS.find(
          (stepId) => !orderedCompletedSteps.includes(stepId),
        ) || "integrations";
  const nextStepNumber = nextStepId
    ? ONBOARDING_STEP_IDS.indexOf(nextStepId) + 1
    : FINAL_ONBOARDING_STEP;
  const completedCount =
    status === "completed"
      ? FINAL_ONBOARDING_STEP
      : orderedCompletedSteps.length;
  const currentStep =
    status === "completed"
      ? FINAL_ONBOARDING_STEP
      : clampStep(source.currentStep || nextStepNumber);
  const completionPct = Math.round(
    (completedCount / FINAL_ONBOARDING_STEP) * 100,
  );

  return {
    version: ONBOARDING_VERSION,
    status,
    currentStep,
    nextStepId,
    nextStepNumber,
    totalSteps: FINAL_ONBOARDING_STEP,
    completedCount,
    completionPct,
    needsAttention: status !== "completed",
    startedAt: source.startedAt || nowIso,
    updatedAt: source.updatedAt || nowIso,
    completedAt: status === "completed" ? source.completedAt || nowIso : null,
    completedSteps: orderedCompletedSteps,
    channelsDeferred,
    profile,
  };
};

const getCompanyOnboardingState = (company = {}, user = {}) => {
  const settings = parseCompanySettings(company.settings);
  return normalizeOnboardingState(settings.onboarding, { company, user });
};

const buildCompanyResponseWithOnboarding = (company, user = {}) => {
  if (!company || typeof company !== "object") {
    return company;
  }

  const onboarding = getCompanyOnboardingState(company, user);
  const nextCompany = { ...company, onboarding };
  delete nextCompany.settings;
  return nextCompany;
};

const mergeCompanyOnboardingSettings = (
  rawSettings,
  context = {},
  patch = {},
) => {
  const settings = parseCompanySettings(rawSettings);
  const current = normalizeOnboardingState(settings.onboarding, context);
  const nextProfilePatch =
    patch.profile && typeof patch.profile === "object" ? patch.profile : {};
  const mergedProfile = {
    ...current.profile,
    ...nextProfilePatch,
  };
  const mergedCompletedSteps = uniqueStepIds([
    ...current.completedSteps,
    ...(Array.isArray(patch.completedSteps) ? patch.completedSteps : []),
    ...(patch.markStepCompleted ? [patch.markStepCompleted] : []),
  ]);

  const nextInput = {
    ...current,
    ...patch,
    profile: mergedProfile,
    completedSteps: mergedCompletedSteps,
    updatedAt: new Date().toISOString(),
  };

  delete nextInput.summary;

  const onboarding = normalizeOnboardingState(nextInput, context);
  settings.onboarding = onboarding;

  return {
    settings,
    onboarding,
  };
};

const completeCompanyOnboardingSettings = (
  rawSettings,
  context = {},
  patch = {},
) => {
  const merged = mergeCompanyOnboardingSettings(rawSettings, context, patch);
  const nowIso = new Date().toISOString();
  const channelsDeferred =
    patch.channelsDeferred !== undefined
      ? Boolean(patch.channelsDeferred)
      : !cleanString(merged.onboarding.profile.whatsappNumber);

  const onboarding = normalizeOnboardingState(
    {
      ...merged.onboarding,
      status: "completed",
      currentStep: FINAL_ONBOARDING_STEP,
      completedSteps: ONBOARDING_STEP_IDS,
      channelsDeferred,
      updatedAt: nowIso,
      completedAt: nowIso,
    },
    context,
  );

  merged.settings.onboarding = onboarding;

  return {
    settings: merged.settings,
    onboarding,
  };
};

module.exports = {
  ONBOARDING_STEP_IDS,
  FINAL_ONBOARDING_STEP,
  parseCompanySettings,
  serializeCompanySettings,
  getCompanyOnboardingState,
  buildCompanyResponseWithOnboarding,
  mergeCompanyOnboardingSettings,
  completeCompanyOnboardingSettings,
};
