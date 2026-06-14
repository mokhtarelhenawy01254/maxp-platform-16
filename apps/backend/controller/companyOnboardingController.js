const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { getCompanyOnboardingState, mergeCompanyOnboardingSettings, completeCompanyOnboardingSettings, parseCompanySettings, serializeCompanySettings } = require("../utils/companyOnboarding");
const { getCompanyFunnelAnalytics, recordCompanyFunnelEvent } = require("../utils/companyFunnelAnalytics");

const loadCompany = async (companyId) => {
  const company = await getSharedPrismaClient().company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, slug: true, phone: true, currency: true, settings: true }
  });
  if (!company) return null;
  return { ...company, settings: parseCompanySettings(company.settings) };
};

const saveCompanySettings = async (companyId, settings) => {
  return getSharedPrismaClient().company.update({
    where: { id: companyId },
    data: { settings: serializeCompanySettings(settings) },
    select: { id: true, name: true, slug: true, phone: true, currency: true, settings: true }
  });
};

const getOnboarding = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const company = await loadCompany(companyId);
    if (!company) return res.status(404).json({ success: false, message: "الشركة غير موجودة" });

    const onboarding = getCompanyOnboardingState(company, req.user);
    res.json({ success: true, data: { onboarding, company: { id: company.id, name: company.name, slug: company.slug, phone: company.phone, currency: company.currency } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveOnboardingProgress = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const company = await loadCompany(companyId);
    if (!company) return res.status(404).json({ success: false, message: "الشركة غير موجودة" });

    const { settings, onboarding } = mergeCompanyOnboardingSettings(company.settings, { company, user: req.user }, req.body);
    await saveCompanySettings(companyId, settings);

    res.json({ success: true, data: { onboarding, company: { id: company.id, name: company.name, slug: company.slug, phone: company.phone, currency: company.currency } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const completeOnboarding = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const company = await loadCompany(companyId);
    if (!company) return res.status(404).json({ success: false, message: "الشركة غير موجودة" });

    const { settings, onboarding } = completeCompanyOnboardingSettings(company.settings, { company, user: req.user }, req.body);
    await saveCompanySettings(companyId, settings);

    res.json({ success: true, data: { onboarding, company: { id: company.id, name: company.name, slug: company.slug, phone: company.phone, currency: company.currency } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const trackFunnelEvent = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const company = await loadCompany(companyId);
    if (!company) return res.status(404).json({ success: false, message: "الشركة غير موجودة" });

    const { settings } = recordCompanyFunnelEvent(company.settings, req.body);
    await saveCompanySettings(companyId, settings);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getOnboarding, saveOnboardingProgress, completeOnboarding, trackFunnelEvent };