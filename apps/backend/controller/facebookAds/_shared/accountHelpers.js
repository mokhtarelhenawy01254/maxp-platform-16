/**
 * Ad Account Resolution, Normalization and Billing Health
 */
const { getSharedPrismaClient, FacebookAdsService } = require("./dependencies");
const { toNullableNumber, toMajorCurrencyUnit } = require("./utils");

function sanitizeFacebookAdAccountForClient(adAccount) {
  if (!adAccount || typeof adAccount !== "object") {
    return adAccount;
  }

  const safeAdAccount = { ...adAccount };
  delete safeAdAccount.accessToken;
  delete safeAdAccount.access_token;

  return safeAdAccount;
}

function getFacebookAdAccountStatusLabel(statusCode) {
  const normalizedStatus = String(statusCode || "").trim();
  const statusLabels = {
    "1": "نشط",
    "2": "معطل",
    "3": "غير مستقر",
    "7": "في انتظار المراجعة",
    "8": "في انتظار التسوية",
    "9": "في فترة سماح",
    "100": "مغلق",
    "101": "معلق",
    "201": "أي تسوية مطلوبة",
  };

  return statusLabels[normalizedStatus] || normalizedStatus || "غير معروف";
}

function normalizeFacebookBusiness(business) {
  if (!business || typeof business !== "object") {
    return null;
  }

  return {
    id: business.id || null,
    name: business.name || null,
  };
}

function getSafeFundingSourceSummary(accountData) {
  const details =
    accountData?.funding_source_details &&
    typeof accountData.funding_source_details === "object"
      ? accountData.funding_source_details
      : {};

  return {
    hasFundingSource: Boolean(
      accountData?.funding_source ||
        details.id ||
        details.type ||
        details.display_string ||
        details.displayString,
    ),
    type: details.type || null,
    display:
      details.display_string ||
      details.displayString ||
      (details.type ? String(details.type) : null),
  };
}

function buildAdAccountBillingHealth(accountData) {
  const fundingSource = getSafeFundingSourceSummary(accountData);
  const statusCode = String(accountData?.account_status || "").trim() || null;
  const disableReason = accountData?.disable_reason || null;
  const balanceRaw = toNullableNumber(accountData?.balance);
  const spendCapRaw = toNullableNumber(accountData?.spend_cap);
  const amountSpentRaw = toNullableNumber(accountData?.amount_spent);
  const adTrustDslRaw = toNullableNumber(accountData?.adtrust_dsl);
  const warnings = [];

  if (!fundingSource.hasFundingSource) {
    warnings.push({
      code: "MISSING_FUNDING_SOURCE",
      message:
        "لا توجد وسيلة دفع ظاهرة من Meta لهذا الحساب. قد لا يستطيع نشر إعلانات نشطة.",
    });
  }

  if (statusCode && statusCode !== "1") {
    warnings.push({
      code: "ACCOUNT_STATUS_ATTENTION",
      message: `حالة الحساب تحتاج مراجعة: ${getFacebookAdAccountStatusLabel(statusCode)}.`,
    });
  }

  if (disableReason) {
    warnings.push({
      code: "DISABLE_REASON",
      message: `Meta أرجعت سبب تعطيل/تقييد: ${disableReason}.`,
    });
  }

  return {
    currency: accountData?.currency || null,
    business: normalizeFacebookBusiness(accountData?.business),
    accountStatusCode: statusCode,
    accountStatusLabel: getFacebookAdAccountStatusLabel(statusCode),
    isAccountUsable: !statusCode || statusCode === "1",
    disableReason,
    hasFundingSource: fundingSource.hasFundingSource,
    fundingSourceType: fundingSource.type,
    fundingSourceDisplay: fundingSource.display,
    amountSpent: toMajorCurrencyUnit(amountSpentRaw),
    amountSpentRaw,
    balance: toMajorCurrencyUnit(balanceRaw),
    balanceRaw,
    spendCap: toMajorCurrencyUnit(spendCapRaw),
    spendCapRaw,
    adTrustDsl: toMajorCurrencyUnit(adTrustDslRaw),
    adTrustDslRaw,
    warnings,
  };
}

function sanitizeRemoteFacebookAdAccountForClient(accountData) {
  const safeAccount = sanitizeFacebookAdAccountForClient(accountData) || {};

  delete safeAccount.funding_source;
  delete safeAccount.funding_source_details;

  safeAccount.business = normalizeFacebookBusiness(accountData?.business);
  safeAccount.billingHealth = buildAdAccountBillingHealth(accountData);

  return safeAccount;
}

function sanitizeSavedFacebookAdAccountForClient(savedAccount, warningReason) {
  const normalizedAccountId = normalizeAdAccountId(savedAccount?.accountId);
  const accountData = {
    id: normalizedAccountId ? `act_${normalizedAccountId}` : savedAccount?.id,
    account_id: normalizedAccountId,
    name: savedAccount?.name || normalizedAccountId || "Saved Ad Account",
    currency: savedAccount?.currency || "EGP",
    timezone_name: savedAccount?.timezone || null,
  };
  const billingHealth = buildAdAccountBillingHealth(accountData);

  billingHealth.warnings.push({
    code: warningReason || "REMOTE_ACCOUNT_NOT_RETURNED",
    message:
      "هذا الحساب محفوظ محلياً، لكن Meta لم ترجعه في قائمة الحسابات الحالية. يمكن استخدامه لتصفية البيانات المحلية، وقد تحتاج لإعادة ربط صلاحيات ads_read/ads_management قبل المزامنة أو إنشاء إعلان.",
  });

  return {
    ...accountData,
    business: null,
    billingHealth,
    isSaved: true,
    isActive: Boolean(savedAccount?.isActive),
    source: "local",
  };
}

function buildSavedAdAccountFallbacks(
  savedAdAccounts,
  remoteAccountIds = new Set(),
  warningReason,
) {
  return savedAdAccounts
    .filter((account) => {
      const normalizedAccountId = normalizeAdAccountId(account.accountId);
      return normalizedAccountId && !remoteAccountIds.has(normalizedAccountId);
    })
    .map((account) =>
      sanitizeSavedFacebookAdAccountForClient(account, warningReason),
    );
}

function normalizeAdAccountId(adAccountId) {
  if (adAccountId === undefined || adAccountId === null) {
    return null;
  }

  const trimmedAccountId = String(adAccountId).trim();
  if (!trimmedAccountId) {
    return null;
  }

  return trimmedAccountId.startsWith("act_")
    ? trimmedAccountId.slice(4)
    : trimmedAccountId;
}

function getAdAccountLookupVariants(adAccountId) {
  const rawAccountId =
    adAccountId === undefined || adAccountId === null
      ? null
      : String(adAccountId).trim();
  const normalizedAccountId = normalizeAdAccountId(adAccountId);

  return Array.from(
    new Set(
      [
        rawAccountId,
        normalizedAccountId,
        normalizedAccountId ? `act_${normalizedAccountId}` : null,
      ].filter(Boolean),
    ),
  );
}

function doesAdAccountMatch(account, requestedAccountId) {
  const accountVariants = getAdAccountLookupVariants(
    account?.account_id || account?.accountId || account?.id,
  );
  const requestedVariants = getAdAccountLookupVariants(requestedAccountId);

  return requestedVariants.some((variant) => accountVariants.includes(variant));
}

async function setActiveAdAccount(companyId, facebookAdAccountRecordId) {
  const prisma = getSharedPrismaClient();

  await prisma.facebookAdAccount.updateMany({
    where: {
      companyId,
      id: { not: facebookAdAccountRecordId },
    },
    data: {
      isActive: false,
    },
  });

  return prisma.facebookAdAccount.update({
    where: { id: facebookAdAccountRecordId },
    data: {
      isActive: true,
      updatedAt: new Date(),
    },
  });
}

async function upsertAdAccount(companyId, accessToken, accountData) {
  const normalizedAccountId = normalizeAdAccountId(
    accountData?.account_id || accountData?.accountId || accountData?.id,
  );

  if (!normalizedAccountId) {
    return null;
  }

  const prisma = getSharedPrismaClient();
  const name = accountData?.name || `Facebook Ad Account ${normalizedAccountId}`;
  const currency = accountData?.currency || "USD";
  const timezone = accountData?.timezone_name || accountData?.timezone || null;

  const adAccount = await prisma.$transaction(async (tx) => {
    await tx.facebookAdAccount.updateMany({
      where: {
        companyId,
        accountId: { not: normalizedAccountId },
      },
      data: {
        isActive: false,
      },
    });

    return tx.facebookAdAccount.upsert({
      where: {
        companyId_accountId: {
          companyId,
          accountId: normalizedAccountId,
        },
      },
      update: {
        name,
        currency,
        timezone,
        accessToken,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        companyId,
        accountId: normalizedAccountId,
        name,
        currency,
        timezone,
        accessToken,
        isActive: true,
      },
    });
  });

  return adAccount;
}

async function hydrateRemoteAdAccount(companyId, accessToken, adAccountId = null) {
  if (!accessToken) {
    return null;
  }

  try {
    const adsService = new FacebookAdsService(accessToken);
    const remoteAccountsResult = await adsService.getAdAccounts();

    if (
      !remoteAccountsResult.success ||
      !Array.isArray(remoteAccountsResult.data) ||
      remoteAccountsResult.data.length === 0
    ) {
      return null;
    }

    const remoteAccount = adAccountId
      ? remoteAccountsResult.data.find((account) =>
          doesAdAccountMatch(account, adAccountId),
        )
      : remoteAccountsResult.data.length === 1
        ? remoteAccountsResult.data[0]
        : null;

    if (!remoteAccount) {
      return null;
    }

    return upsertAdAccount(companyId, accessToken, remoteAccount);
  } catch (error) {
    console.error("❌ Error hydrating remote Ad Account:", error);
    return null;
  }
}

/**
 * جلب أو إنشاء Ad Account للشركة
 */
async function getOrCreateAdAccount(
  companyId,
  accessToken,
  adAccountId = null,
) {
  try {
    const prisma = getSharedPrismaClient();
    const lookupVariants = getAdAccountLookupVariants(adAccountId);

    // إذا كان هناك adAccountId، احصل عليه
    if (lookupVariants.length > 0) {
      const account = await prisma.facebookAdAccount.findFirst({
        where: {
          companyId,
          OR: lookupVariants.map((variant) => ({ accountId: variant })),
        },
      });

      if (account) {
        return account.isActive
          ? account
          : setActiveAdAccount(companyId, account.id);
      }

      const hydratedAccount = await hydrateRemoteAdAccount(
        companyId,
        accessToken,
        adAccountId,
      );
      if (hydratedAccount) {
        return hydratedAccount;
      }
    }

    // جلب Ad Account الافتراضي للشركة
    const defaultAccount = await prisma.facebookAdAccount.findFirst({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (defaultAccount) {
      return defaultAccount;
    }

    return hydrateRemoteAdAccount(companyId, accessToken);
  } catch (error) {
    console.error("❌ Error getting Ad Account:", error);
    return null;
  }
}

async function getAdAccountReadScope(companyId, requestedAdAccountId = null) {
  const prisma = getSharedPrismaClient();
  const normalizedRequestedId =
    requestedAdAccountId === undefined || requestedAdAccountId === null
      ? null
      : String(requestedAdAccountId).trim();
  const lookupVariants = getAdAccountLookupVariants(requestedAdAccountId);

  if (normalizedRequestedId || lookupVariants.length > 0) {
    return prisma.facebookAdAccount.findFirst({
      where: {
        companyId,
        OR: [
          normalizedRequestedId ? { id: normalizedRequestedId } : null,
          ...lookupVariants.map((variant) => ({ accountId: variant })),
        ].filter(Boolean),
      },
    });
  }

  const activeAccount = await prisma.facebookAdAccount.findFirst({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (activeAccount) {
    return activeAccount;
  }

  return prisma.facebookAdAccount.findFirst({
    where: { companyId },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

module.exports = {
  sanitizeFacebookAdAccountForClient,
  getFacebookAdAccountStatusLabel,
  normalizeFacebookBusiness,
  getSafeFundingSourceSummary,
  buildAdAccountBillingHealth,
  sanitizeRemoteFacebookAdAccountForClient,
  sanitizeSavedFacebookAdAccountForClient,
  buildSavedAdAccountFallbacks,
  normalizeAdAccountId,
  getAdAccountLookupVariants,
  doesAdAccountMatch,
  setActiveAdAccount,
  upsertAdAccount,
  hydrateRemoteAdAccount,
  getOrCreateAdAccount,
  getAdAccountReadScope,
};
