const parseCompanySettings = (rawSettings) => {
  if (!rawSettings) return {};
  if (typeof rawSettings === "object") return rawSettings;
  try {
    const parsed = JSON.parse(rawSettings);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
};

const serializeCompanySettings = (settings) => JSON.stringify(settings || {});

const buildCompanyResponseWithOnboarding = (company) => {
  if (!company || typeof company !== "object") return company;
  const nextCompany = { ...company };
  const settings = parseCompanySettings(company.settings);
  nextCompany.aiToolsEnabled = settings.aiToolsEnabled === true;
  delete nextCompany.settings;
  return nextCompany;
};

module.exports = {
  parseCompanySettings,
  serializeCompanySettings,
  buildCompanyResponseWithOnboarding,
};
