const axios = require("axios");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const { getMetaGraphApiVersion } = require("../config/metaApi");

const FACEBOOK_PAGE_TOKEN_FIELDS = "id,name,category";
const DEFAULT_PAGE_TIMEOUT_MS = 5000;
const DEFAULT_REFRESH_TIMEOUT_MS = 15000;

// Simple mutex to prevent concurrent token refresh for the same company+page
const refreshLocks = new Map();

function getFacebookGraphError(error) {
  const graphError =
    error?.response?.data?.error || error?.data?.error || error?.error || null;

  if (graphError) {
    return {
      code: graphError.code || null,
      subcode: graphError.error_subcode || null,
      type: graphError.type || null,
      message: graphError.message || "Facebook API error",
      fbtraceId: graphError.fbtrace_id || null,
    };
  }

  return {
    code: error?.code || null,
    subcode: null,
    type: null,
    message: error?.message || "Facebook API error",
    fbtraceId: null,
  };
}

async function fetchPageIdentityFromToken(pageAccessToken, timeoutMs = DEFAULT_PAGE_TIMEOUT_MS) {
  const response = await axios.get(`https://graph.facebook.com/${getMetaGraphApiVersion()}/me`, {
    params: {
      access_token: pageAccessToken,
      fields: FACEBOOK_PAGE_TOKEN_FIELDS,
    },
    timeout: timeoutMs,
  });

  return response.data;
}

async function validateFacebookPageAccessToken({
  pageId,
  pageAccessToken,
  timeoutMs = DEFAULT_PAGE_TIMEOUT_MS,
}) {
  if (!pageAccessToken) {
    return {
      isValid: false,
      reason: "MISSING_PAGE_ACCESS_TOKEN",
      error: {
        code: null,
        message: "Page access token is required",
      },
    };
  }

  try {
    const page = await fetchPageIdentityFromToken(pageAccessToken, timeoutMs);

    if (pageId && page?.id !== pageId) {
      return {
        isValid: false,
        reason: "PAGE_TOKEN_MISMATCH",
        page,
        error: {
          code: null,
          message: `Token belongs to page ${page?.id || "unknown"} instead of ${pageId}`,
        },
      };
    }

    return {
      isValid: true,
      page,
    };
  } catch (error) {
    const graphError = getFacebookGraphError(error);
    const message = graphError.message || "";
    const isPermissionOrTokenProblem =
      graphError.code === 190 ||
      /impersonating a user's page/i.test(message) ||
      /must be granted before impersonating/i.test(message);

    return {
      isValid: false,
      reason: isPermissionOrTokenProblem
        ? "INVALID_PAGE_ACCESS_TOKEN"
        : "FACEBOOK_API_ERROR",
      error: graphError,
    };
  }
}

async function listFacebookPagesForUser(
  userAccessToken,
  { timeoutMs = DEFAULT_REFRESH_TIMEOUT_MS, pageLimit = 100, maxPages = 200 } = {},
) {
  const collectedPages = [];
  let nextUrl =
    `https://graph.facebook.com/${getMetaGraphApiVersion()}/me/accounts` +
    `?access_token=${encodeURIComponent(userAccessToken)}` +
    `&fields=${encodeURIComponent("id,name,access_token")}` +
    `&limit=${Math.min(pageLimit, 100)}`;

  while (nextUrl && collectedPages.length < maxPages) {
    const response = await axios.get(nextUrl, { timeout: timeoutMs });
    const batch = Array.isArray(response.data?.data) ? response.data.data : [];

    collectedPages.push(...batch);
    nextUrl = response.data?.paging?.next || null;
  }

  return collectedPages;
}

async function refreshFacebookPageAccessToken({
  companyId,
  pageId,
  timeoutMs = DEFAULT_REFRESH_TIMEOUT_MS,
}) {
  if (!companyId || !pageId) {
    return {
      success: false,
      reason: "MISSING_REFRESH_CONTEXT",
      error: {
        code: null,
        message: "companyId and pageId are required to refresh the page token",
      },
    };
  }

  const prisma = getSharedPrismaClient();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { facebookUserAccessToken: true },
  });

  if (!company?.facebookUserAccessToken) {
    return {
      success: false,
      reason: "MISSING_COMPANY_USER_ACCESS_TOKEN",
      error: {
        code: null,
        message: "Company does not have a stored Facebook OAuth session",
      },
    };
  }

  let availablePages;
  try {
    availablePages = await listFacebookPagesForUser(company.facebookUserAccessToken, {
      timeoutMs,
    });
  } catch (error) {
    return {
      success: false,
      reason: "FAILED_TO_LOAD_USER_PAGES",
      error: getFacebookGraphError(error),
    };
  }

  const matchedPage = availablePages.find((page) => page?.id === pageId);

  if (!matchedPage?.access_token) {
    return {
      success: false,
      reason: "PAGE_NOT_FOUND_IN_COMPANY_OAUTH_SESSION",
      error: {
        code: null,
        message:
          "Stored Facebook OAuth session does not include the target page",
      },
    };
  }

  await prisma.facebookPage.update({
    where: { pageId },
    data: {
      pageAccessToken: matchedPage.access_token,
      pageName: matchedPage.name || undefined,
      status: "connected",
      disconnectedAt: null,
    },
  });

  return {
    success: true,
    pageId: matchedPage.id,
    pageName: matchedPage.name || null,
    pageAccessToken: matchedPage.access_token,
  };
}

async function ensureValidFacebookPageAccessToken({
  companyId,
  pageId,
  pageAccessToken,
  allowRefresh = true,
  timeoutMs = DEFAULT_PAGE_TIMEOUT_MS,
}) {
  const validation = await validateFacebookPageAccessToken({
    pageId,
    pageAccessToken,
    timeoutMs,
  });

  if (validation.isValid) {
    return {
      ok: true,
      source: "existing",
      validation,
      page: validation.page,
      pageAccessToken,
    };
  }

  if (!allowRefresh || !companyId || !pageId) {
    return {
      ok: false,
      validation,
      refreshAttempted: false,
    };
  }

  const lockKey = `${companyId}:${pageId}`;
  if (refreshLocks.has(lockKey)) {
    return refreshLocks.get(lockKey);
  }

  const refreshPromise = refreshFacebookPageAccessToken({ companyId, pageId }).finally(() => {
    refreshLocks.delete(lockKey);
  });
  refreshLocks.set(lockKey, refreshPromise);
  const refresh = await refreshPromise;

  if (!refresh.success) {
    return {
      ok: false,
      validation,
      refresh,
      refreshAttempted: true,
    };
  }

  const refreshedValidation = await validateFacebookPageAccessToken({
    pageId,
    pageAccessToken: refresh.pageAccessToken,
    timeoutMs,
  });

  if (refreshedValidation.isValid) {
    return {
      ok: true,
      source: "refreshed",
      validation: refreshedValidation,
      refresh,
      refreshAttempted: true,
      page: refreshedValidation.page,
      pageAccessToken: refresh.pageAccessToken,
    };
  }

  return {
    ok: false,
    validation: refreshedValidation,
    refresh,
    refreshAttempted: true,
  };
}

function buildFacebookPageTokenFailureMessage(validationOrResult, expectedPageId) {
  const validation = validationOrResult?.validation || validationOrResult;
  const refresh = validationOrResult?.refresh || null;
  const reason = validation?.reason;
  const graphMessage = validation?.error?.message || refresh?.error?.message || "";

  if (reason === "MISSING_PAGE_ACCESS_TOKEN") {
    return "Page Access Token is required";
  }

  if (reason === "PAGE_TOKEN_MISMATCH") {
    return `This token belongs to a different page${expectedPageId ? ` than ${expectedPageId}` : ""}`;
  }

  if (reason === "INVALID_PAGE_ACCESS_TOKEN") {
    return "The provided token is not a valid Facebook Page Access Token for Messenger operations";
  }

  if (refresh?.reason === "PAGE_NOT_FOUND_IN_COMPANY_OAUTH_SESSION") {
    return "The stored Facebook OAuth session does not include this page. Please reconnect the page using the correct Facebook account.";
  }

  if (refresh?.reason === "MISSING_COMPANY_USER_ACCESS_TOKEN") {
    return "No stored Facebook OAuth session is available to refresh this page. Please reconnect the page.";
  }

  if (graphMessage) {
    return graphMessage;
  }

  return "Facebook page token validation failed";
}

module.exports = {
  buildFacebookPageTokenFailureMessage,
  ensureValidFacebookPageAccessToken,
  getFacebookGraphError,
  refreshFacebookPageAccessToken,
  validateFacebookPageAccessToken,
};
