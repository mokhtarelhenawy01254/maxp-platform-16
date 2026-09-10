/**
 * Token Resolution & Validation Helpers
 */
const { getSharedPrismaClient, validateFacebookPageAccessToken } = require("./dependencies");

async function getCompanyAdsAccessToken(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    // أولوية لـ Ads Access Token، ثم User Access Token
    const companyToken =
      company?.facebookAdsAccessToken ||
      company?.facebookUserAccessToken ||
      null;

    if (companyToken) return companyToken;

    // Fallback: قراءة من ConnectionSource إذا لم يوجد token في Company
    const source = await getSharedPrismaClient().facebookAdsConnectionSource.findFirst({
      where: { companyId, status: "connected" },
      select: { accessToken: true },
      orderBy: { updatedAt: "desc" },
    });
    return source?.accessToken || null;
  } catch (error) {
    console.error("❌ Error getting company access token:", error);
    return null;
  }
}

async function getCompanyFacebookTokens(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: {
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true,
      },
    });

    return {
      adsAccessToken: company?.facebookAdsAccessToken || null,
      userAccessToken: company?.facebookUserAccessToken || null,
    };
  } catch (error) {
    console.error("❌ Error getting company Facebook tokens:", error);
    return {
      adsAccessToken: null,
      userAccessToken: null,
    };
  }
}

async function getCompanyPageAccessToken(companyId) {
  const tokens = await getCompanyFacebookTokens(companyId);
  return tokens.userAccessToken || tokens.adsAccessToken || null;
}

module.exports = {
  getCompanyAdsAccessToken,
  getCompanyFacebookTokens,
  getCompanyPageAccessToken,
};
