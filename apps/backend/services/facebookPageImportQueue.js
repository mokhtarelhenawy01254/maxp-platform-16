"use strict";

/**
 * Facebook Page import queue (background job).
 *
 * WHY THIS EXISTS
 * ---------------
 * The OAuth `/callback` handler used to fetch `/me/accounts` (paged) and then
 * upsert + subscribe every Page inline. For accounts that administer ~190
 * Pages that took 130-190s, which blows past Cloudflare's ~100s edge timeout
 * (524) even though the import completed server-side.
 *
 * The handler now only exchanges the code, saves the user token + account
 * connection, then hands the Page import to this module. The job runs after
 * the HTTP response with a small bounded concurrency (rate-limit friendly)
 * and reports best-effort progress through an in-memory Map (the database
 * stays the source of truth).
 *
 * Behaviour preserved from the old inline path:
 *  - same Prisma writes (facebookPage upsert/update, skippedFacebookPage)
 *  - same `facebookAppKey` / `fbAppKey` stamping
 *  - same cross-company ownership rules (dead old token => auto transfer)
 *  - same webhook subscription fields (full list, core-messaging fallback)
 *  - same Instagram Business Account linking
 *  - same log prefixes
 */

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { getSharedPrismaClient } = require("./sharedDatabase");
const pageTokenCache = require("../utils/pageTokenCache");
const { invalidateFacebookPageCache } = require("../controller/webhookController");
const { validateFacebookPageAccessToken } = require("../utils/facebookPageTokenUtils");
const { getMetaGraphApiBaseUrl } = require("../config/metaApi");

const FACEBOOK_GRAPH_API_BASE_URL = getMetaGraphApiBaseUrl();

const PAGE_WEBHOOK_FIELDS =
  "messages,messaging_postbacks,messaging_optins,messaging_referrals,message_deliveries,message_reads,message_echoes,feed";
const CORE_PAGE_WEBHOOK_FIELDS =
  "messages,messaging_postbacks,messaging_optins,messaging_referrals,message_deliveries,message_reads,message_echoes";

// ---- Tunables -----------------------------------------------------------

/** In-flight per-page Graph/Prisma operations. Kept in the 5-8 band. */
const PAGE_IMPORT_CONCURRENCY = 6;
/** `/me/accounts` paging size (Graph max). */
const ACCOUNT_PAGE_SIZE = 100;
/** Same paging fallback budget as the old inline loop. */
const MAX_ACCOUNT_PAGING_RETRIES = 2;
/** Retries for rate-limited Graph calls (codes 4 / 17 / 32 / 613). */
const MAX_GRAPH_ATTEMPTS = 3;
const GRAPH_RETRY_BASE_DELAY_MS = 800;
const RETRYABLE_GRAPH_ERROR_CODES = new Set([4, 17, 32, 613]);
/** Drop finished progress entries after 30 minutes. */
const PROGRESS_RETENTION_MS = 30 * 60 * 1000;

const PROGRESS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
});

// ---- Progress state (best-effort UI hint only) ---------------------------

/** jobKey => progress snapshot */
const progressStore = new Map();
/** jobKey => true while a job is queued/running/posting */
const activeJobs = new Map();

const getJobKey = (companyId, appKey) =>
  `${String(companyId || "")}::${String(appKey || "primary").trim().toLowerCase()}`;

const createEmptyProgress = () => ({
  status: PROGRESS.QUEUED,
  total: 0,
  processed: 0,
  done: 0,
  failed: 0,
  skipped: 0,
  queuedAt: null,
  startedAt: null,
  finishedAt: null,
  lastError: null,
});

const updateProgress = (jobKey, patch) => {
  const current = progressStore.get(jobKey) || createEmptyProgress();
  const next = { ...current, ...patch };
  progressStore.set(jobKey, next);
  return next;
};

const pruneProgress = () => {
  const now = Date.now();
  for (const [jobKey, progress] of progressStore.entries()) {
    if (activeJobs.has(jobKey)) continue;
    const finishedAt = progress.finishedAt ? new Date(progress.finishedAt).getTime() : 0;
    if (finishedAt && now - finishedAt > PROGRESS_RETENTION_MS) {
      progressStore.delete(jobKey);
    }
  }
};

/**
 * Returns a plain copy (never the internal object) or null when no job has
 * ever run for this company + app key inside this process.
 */
const getFacebookPageImportProgress = (companyId, appKey) => {
  if (!companyId) return null;
  const progress = progressStore.get(getJobKey(companyId, appKey));
  return progress ? { ...progress } : null;
};

const isFacebookPageImportActive = (companyId, appKey) =>
  activeJobs.has(getJobKey(companyId, appKey));

// ---- Small async helpers ------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getGraphErrorCode = (error) => {
  const code = error?.response?.data?.error?.code;
  const parsed = Number(code);
  return Number.isFinite(parsed) ? parsed : null;
};

const isRetryableGraphError = (error) => {
  const code = getGraphErrorCode(error);
  if (code !== null && RETRYABLE_GRAPH_ERROR_CODES.has(code)) return true;
  if (error?.response?.status === 429) return true;
  const networkCodes = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN", "ENOTFOUND"]);
  return Boolean(error?.code && networkCodes.has(error.code));
};

/**
 * Runs a Graph call and retries ONLY rate-limit-ish failures with exponential
 * backoff (800ms, 1600ms). Auth errors (190) are surfaced immediately.
 */
const withGraphRetry = async (label, run, { maxAttempts = MAX_GRAPH_ATTEMPTS } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await run(attempt);
    } catch (error) {
      lastError = error;
      const retryable = isRetryableGraphError(error);
      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }
      const delay = GRAPH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ [PAGE-IMPORT] ${label} hit Graph rate limit (code ${getGraphErrorCode(error) ?? "n/a"}) — retry ${attempt}/${maxAttempts - 1} in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
};

const runWithConcurrency = async (items, limit, worker) => {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
};

// ---- Webhook subscription (mirror of the route helper) ------------------

const subscribePageToApp = async (pageId, pageAccessToken) => {
  try {
    console.log(`🔔 Subscribing page ${pageId} to app webhooks (all fields)...`);
    const response = await withGraphRetry(`subscribe page ${pageId}`, () =>
      axios.post(
        `${FACEBOOK_GRAPH_API_BASE_URL}/${pageId}/subscribed_apps`,
        {},
        {
          params: {
            access_token: pageAccessToken,
            subscribed_fields: PAGE_WEBHOOK_FIELDS,
          },
          timeout: 10000,
        },
      ),
    );
    console.log(`✅ Successfully subscribed page ${pageId} to webhooks:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.warn(
      `⚠️ Full webhook subscription failed for page ${pageId}, retrying with core messaging fields:`,
      error.response?.data?.error?.message || error.message,
    );
    try {
      const fallbackResponse = await withGraphRetry(`subscribe page ${pageId} (core fields)`, () =>
        axios.post(
          `${FACEBOOK_GRAPH_API_BASE_URL}/${pageId}/subscribed_apps`,
          {},
          {
            params: {
              access_token: pageAccessToken,
              subscribed_fields: CORE_PAGE_WEBHOOK_FIELDS,
            },
            timeout: 10000,
          },
        ),
      );
      console.log(`✅ Subscribed page ${pageId} to core webhooks successfully`);
      return { success: true, data: fallbackResponse.data, isCoreFallback: true };
    } catch (coreError) {
      console.error(
        `❌ Failed core webhook subscription for page ${pageId}:`,
        coreError.response?.data?.error?.message || coreError.message,
      );
      return { success: false, error: coreError.response?.data || coreError.message };
    }
  }
};

// ---- Job stages ---------------------------------------------------------

const resolveImportContext = async ({
  companyId,
  appKey,
  userAccessToken,
  facebookUserId,
  facebookUserName,
  facebookUserEmail,
  connectedByUserId,
  accountConnectionId,
}) => {
  const connectionAppKey = String(appKey || "primary").trim().toLowerCase();
  const prisma = getSharedPrismaClient();
  let accessToken = userAccessToken || null;

  if (!accessToken) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { facebookUserAccessToken: true },
    });
    accessToken = company?.facebookUserAccessToken || null;
  }

  if (!accessToken) {
    throw new Error("missing_user_token");
  }

  let identity = {
    id: facebookUserId || null,
    name: facebookUserName || null,
    email: facebookUserEmail || null,
  };
  let identityError = null;

  if (!identity.id) {
    try {
      const meResponse = await withGraphRetry("resolve OAuth account identity", () =>
        axios.get(`${FACEBOOK_GRAPH_API_BASE_URL}/me`, {
          params: { access_token: accessToken, fields: "id,name,email" },
          timeout: 10000,
        }),
      );
      identity = {
        id: meResponse.data?.id || null,
        name: meResponse.data?.name || null,
        email: meResponse.data?.email || null,
      };
    } catch (meError) {
      identityError = meError;
      console.warn(
        "⚠️ [PAGE-IMPORT] Could not resolve Facebook identity for retry, falling back to stored connection:",
        meError.response?.data || meError.message,
      );
    }
  }

  if (!identity.id) {
    // Keep attribution correct: reuse the most recent stored connection so a
    // retry never re-links Pages to a different (or no) account.
    const fallbackConnection = await prisma.facebookAccountConnection.findFirst({
      where: { companyId, status: "connected" },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true, facebookUserId: true, facebookUserName: true, facebookUserEmail: true },
    });
    if (fallbackConnection?.facebookUserId) {
      identity = {
        id: fallbackConnection.facebookUserId,
        name: fallbackConnection.facebookUserName || null,
        email: fallbackConnection.facebookUserEmail || null,
      };
    }
  }

  if (!identity.id) {
    // Surface the real Graph error (e.g. expired token, code 190) instead of a
    // generic failure so the UI retry banner explains what happened.
    const graphMessage = identityError?.response?.data?.error?.message;
    throw new Error(graphMessage || "account_identity_failed");
  }

  if (accountConnectionId) {
    return { accessToken, identity, accountConnectionId };
  }

  // 🔗 Same upsert semantics as the OAuth handler: every Page imported below is
  // attributable to THIS account connection.
  const accountConnection = await prisma.facebookAccountConnection.upsert({
    where: {
      companyId_facebookUserId: { companyId, facebookUserId: identity.id },
    },
    update: {
      accessToken,
      facebookUserName: identity.name || undefined,
      facebookUserEmail: identity.email || undefined,
      status: "connected",
      facebookAppKey: connectionAppKey,
      fbAppKey: connectionAppKey,
      lastSyncedAt: new Date(),
      connectedByUserId: connectedByUserId || undefined,
      updatedAt: new Date(),
    },
    create: {
      companyId,
      facebookUserId: identity.id,
      facebookUserName: identity.name,
      facebookUserEmail: identity.email,
      accessToken,
      status: "connected",
      facebookAppKey: connectionAppKey,
      fbAppKey: connectionAppKey,
      connectedByUserId: connectedByUserId || null,
      connectedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(
    `✅ [OAUTH] Account connection ready for ${identity.name} (${identity.id}): ${accountConnection.id}`,
  );

  return { accessToken, identity, accountConnectionId: accountConnection.id };
};

const fetchAllAccountPages = async (userAccessToken) => {
  let allPages = [];
  let currentLimit = ACCOUNT_PAGE_SIZE;
  let nextUrl = `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
  let pageCount = 0;
  let retryCount = 0;

  while (nextUrl && retryCount <= MAX_ACCOUNT_PAGING_RETRIES) {
    try {
      const pagesResponse = await withGraphRetry("fetch /me/accounts", () =>
        axios.get(nextUrl, {
          timeout: 30000,
          headers: { Accept: "application/json" },
        }),
      );

      if (pagesResponse.data && Array.isArray(pagesResponse.data.data)) {
        allPages = allPages.concat(pagesResponse.data.data);
        pageCount += pagesResponse.data.data.length;
        console.log(`📄 Fetched ${pageCount} pages so far...`);
        retryCount = 0;
      }

      nextUrl =
        pagesResponse.data?.paging && pagesResponse.data.paging.next
          ? pagesResponse.data.paging.next
          : null;
    } catch (pagingError) {
      console.error(
        "❌ Error fetching pages batch:",
        pagingError.response?.data || pagingError.message,
      );

      // Facebook asked us to reduce the page size (code 1).
      if (pagingError.response?.data?.error?.code === 1 && currentLimit > 10) {
        currentLimit = Math.max(10, Math.floor(currentLimit / 2));
        console.log(`⚠️ Reducing limit to ${currentLimit} and retrying...`);
        nextUrl = `${FACEBOOK_GRAPH_API_BASE_URL}/me/accounts?access_token=${userAccessToken}&fields=id,name,access_token&limit=${currentLimit}`;
        retryCount++;
        await sleep(1000);
        continue;
      }

      if (allPages.length > 0) {
        console.log(`⚠️ Using ${allPages.length} pages fetched before error`);
        break;
      }

      throw pagingError;
    }
  }

  console.log(`✅ Found ${allPages.length} pages (with paging)`);
  return allPages;
};

// ---- Job execution ------------------------------------------------------

const processSinglePage = async ({ page, existingPageInDB, companyId, appKey, accountConnectionId }) => {
  // 🚫 Only block when the Page is actually `connected` inside another company.
  const isConnectedToAnotherCompany = Boolean(
    existingPageInDB &&
      existingPageInDB.companyId &&
      existingPageInDB.companyId !== companyId &&
      existingPageInDB.status === "connected",
  );

  if (isConnectedToAnotherCompany) {
    let oldTokenStillValid = false;
    try {
      const oldTokenCheck = await validateFacebookPageAccessToken({
        pageId: page.id,
        pageAccessToken: existingPageInDB.pageAccessToken,
        timeoutMs: 3500,
      });
      oldTokenStillValid = oldTokenCheck.isValid;
    } catch (_) {
      oldTokenStillValid = false;
    }

    if (oldTokenStillValid) {
      return {
        outcome: "skipped",
        skipped: {
          pageId: page.id,
          pageName: page.name,
          reason: "already_connected_to_another_company",
          connectedCompanyId: existingPageInDB.companyId,
        },
      };
    }

    console.log(
      `🔄 [OAUTH] Page ${page.name} had dead token in previous company (${existingPageInDB.companyId}). Auto-transferring to current company ${companyId}...`,
    );
    try {
      await axios.delete(`${FACEBOOK_GRAPH_API_BASE_URL}/${page.id}/subscribed_apps`, {
        params: { access_token: existingPageInDB.pageAccessToken },
        timeout: 5000,
      });
    } catch (_) {}
    invalidateFacebookPageCache(page.id);
    pageTokenCache.delete(page.id);
  }

  const pageDataToUpdate = {
    pageAccessToken: page.access_token,
    pageName: page.name,
    status: "connected",
    facebookAppKey: appKey,
    fbAppKey: appKey,
    connectedAt: new Date(),
    disconnectedAt: null,
    companyId,
    ...(accountConnectionId ? { facebookAccountId: accountConnectionId } : {}),
  };

  const pageDataToCreate = {
    id: uuidv4(),
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    status: "connected",
    facebookAppKey: appKey,
    fbAppKey: appKey,
    connectedAt: new Date(),
    updatedAt: new Date(),
    companyId,
    ...(accountConnectionId ? { facebookAccountId: accountConnectionId } : {}),
  };

  const prisma = getSharedPrismaClient();
  if (existingPageInDB && existingPageInDB.companyId === companyId) {
    await prisma.facebookPage.update({
      where: { pageId: page.id },
      data: pageDataToUpdate,
    });
  } else {
    await prisma.facebookPage.upsert({
      where: { pageId: page.id },
      update: pageDataToUpdate,
      create: pageDataToCreate,
    });
  }

  invalidateFacebookPageCache(page.id);
  pageTokenCache.delete(page.id);

  return {
    outcome: "saved",
    saved: { pageId: page.id, pageAccessToken: page.access_token },
  };
};

const runPostImportTasks = async (savedPages) => {
  if (savedPages.length === 0) return;
  const prisma = getSharedPrismaClient();

  await runWithConcurrency(savedPages, PAGE_IMPORT_CONCURRENCY, async (page) => {
    // Subscribe to webhooks (Facebook Messenger) — awaited so the in-flight
    // Graph calls stay inside the bounded worker pool; never fatal.
    try {
      await subscribePageToApp(page.pageId, page.pageAccessToken);
    } catch (_) {
      /* best effort */
    }

    // 🆕 Fetch and store linked Instagram Business Account
    try {
      const igResponse = await withGraphRetry(`fetch Instagram account for page ${page.pageId}`, () =>
        axios.get(`${FACEBOOK_GRAPH_API_BASE_URL}/${page.pageId}`, {
          params: {
            fields: "instagram_business_account",
            access_token: page.pageAccessToken,
          },
          timeout: 10000,
        }),
      );
      const igAccountId = igResponse.data?.instagram_business_account?.id;
      if (!igAccountId) return;

      let igAccountName = null;
      try {
        const igNameResponse = await axios.get(`${FACEBOOK_GRAPH_API_BASE_URL}/${igAccountId}`, {
          params: {
            fields: "name,username",
            access_token: page.pageAccessToken,
          },
          timeout: 10000,
        });
        igAccountName = igNameResponse.data?.name || igNameResponse.data?.username || null;
      } catch (_) {
        /* ignore */
      }

      await prisma.facebookPage.update({
        where: { pageId: page.pageId },
        data: {
          instagramAccountId: igAccountId,
          instagramAccountName: igAccountName,
        },
      });
      console.log(
        `📸 [BG-OAuth] Linked Instagram account ${igAccountId} (${igAccountName}) to page ${page.pageId}`,
      );

      // Subscribe Instagram account to webhooks for DM delivery
      try {
        await withGraphRetry(`subscribe Instagram account ${igAccountId}`, () =>
          axios.post(
            `${FACEBOOK_GRAPH_API_BASE_URL}/${igAccountId}/subscribed_apps`,
            {},
            {
              params: {
                subscribed_fields: "messages,messaging_seen",
                access_token: page.pageAccessToken,
              },
              timeout: 10000,
            },
          ),
        );
        console.log(`✅ [BG-OAuth] Subscribed Instagram account ${igAccountId} to webhooks`);
      } catch (igSubError) {
        console.warn(
          `⚠️ [BG-OAuth] Could not subscribe Instagram account ${igAccountId} to webhooks:`,
          igSubError.response?.data?.error?.message || igSubError.message,
        );
      }
    } catch (igError) {
      console.warn(
        `⚠️ [BG-OAuth] Could not fetch Instagram account for page ${page.pageId}:`,
        igError.message,
      );
    }
  });

  console.log(`✅ [BG-OAuth] Finished background processing for ${savedPages.length} pages.`);
};

const executePageImportJob = async (job) => {
  const { companyId, appKey, jobKey, source } = job;

  updateProgress(jobKey, {
    status: PROGRESS.RUNNING,
    companyId,
    appKey,
    source: source || "oauth_callback",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastError: null,
    total: 0,
    processed: 0,
    done: 0,
    failed: 0,
    skipped: 0,
  });

  let savedPages = [];

  try {
    const { accessToken, identity, accountConnectionId } = await resolveImportContext(job);
    console.log(
      `🚀 [PAGE-IMPORT] Starting Page import for company ${companyId} (app=${appKey}, concurrency=${PAGE_IMPORT_CONCURRENCY})`,
    );

    const allPages = await fetchAllAccountPages(accessToken);

    if (allPages.length === 0) {
      updateProgress(jobKey, {
        status: PROGRESS.COMPLETED,
        total: 0,
        processed: 0,
        done: 0,
        failed: 0,
        skipped: 0,
        finishedAt: new Date().toISOString(),
      });
      console.log(`ℹ️ [PAGE-IMPORT] No Pages granted for company ${companyId}`);
      return;
    }

    updateProgress(jobKey, { total: allPages.length, processed: 0, done: 0, failed: 0, skipped: 0 });

    const prisma = getSharedPrismaClient();
    // 🔍 Fetch existing pages once to keep the ownership check cheap.
    const existingPages = await prisma.facebookPage.findMany({
      where: { pageId: { in: allPages.map((p) => p.id) } },
    });
    const existingPagesMap = new Map(existingPages.map((p) => [p.pageId, p]));

    const skippedPages = [];
    const failedPages = [];

    await runWithConcurrency(allPages, PAGE_IMPORT_CONCURRENCY, async (page) => {
      try {
        const result = await processSinglePage({
          page,
          existingPageInDB: existingPagesMap.get(page.id),
          companyId,
          appKey,
          accountConnectionId,
        });

        if (result.outcome === "skipped") {
          skippedPages.push({
            ...result.skipped,
            attemptedCompanyId: companyId,
          });
        } else if (result.outcome === "saved") {
          savedPages.push(result.saved);
        }
      } catch (pageError) {
        console.error(`❌ [OAUTH] Error processing page ${page.name}:`, pageError.message);
        failedPages.push({
          pageId: page.id,
          pageName: page.name,
          reason: pageError.message,
        });
      }

      // Derive counters from the accumulated arrays: single-threaded JS makes
      // this race-free even with the bounded worker pool.
      const current = progressStore.get(jobKey) || createEmptyProgress();
      updateProgress(jobKey, {
        processed: (current.processed || 0) + 1,
        done: savedPages.length,
        failed: failedPages.length,
        skipped: skippedPages.length,
      });
    });

    // Save skipped pages record (same shape as the inline flow)
    if (skippedPages.length > 0) {
      try {
        await prisma.skippedFacebookPage.createMany({
          data: skippedPages.map((sp) => ({
            pageId: sp.pageId,
            pageName: sp.pageName,
            reason: sp.reason,
            attemptedCompanyId: sp.attemptedCompanyId,
            connectedToCompanyId: sp.connectedCompanyId,
            isResolved: false,
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      } catch (skipError) {
        console.error(`❌ [OAUTH] Error saving skipped pages:`, skipError.message);
      }
    }

    updateProgress(jobKey, {
      status: PROGRESS.COMPLETED,
      total: allPages.length,
      processed: savedPages.length + skippedPages.length + failedPages.length,
      done: savedPages.length,
      failed: failedPages.length,
      skipped: skippedPages.length,
      finishedAt: new Date().toISOString(),
      lastError: null,
    });

    console.log(
      `✅ [PAGE-IMPORT] Import finished for company ${companyId} (app=${appKey}): ${savedPages.length} saved, ${skippedPages.length} skipped, ${failedPages.length} failed`,
    );
    if (identity?.name) {
      console.log(`👤 [PAGE-IMPORT] Imported Pages for ${identity.name} (${identity.id})`);
    }
  } catch (error) {
    const detail =
      error?.response?.data?.error?.message ||
      error?.message ||
      "page_import_failed";
    console.error(`❌ [PAGE-IMPORT] Job failed for company ${companyId} (app=${appKey}):`, detail);
    updateProgress(jobKey, {
      status: PROGRESS.FAILED,
      finishedAt: new Date().toISOString(),
      lastError: String(detail),
    });
  } finally {
    // Post-import tasks (webhook subscriptions + Instagram linking) run after
    // the progress is finalised so the UI can move on immediately.
    try {
      await runPostImportTasks(savedPages);
    } catch (fatalBgError) {
      console.error("❌ [BG-OAuth] Fatal error in background processing:", fatalBgError.message);
    }
    activeJobs.delete(jobKey);
  }
};

/**
 * Queue a Page import for a company + Meta app key.
 *
 * @param {{ companyId: string, appKey?: string, source?: string,
 *           userAccessToken?: string, facebookUserId?: string|null,
 *           facebookUserName?: string|null, facebookUserEmail?: string|null,
 *           connectedByUserId?: string|null, accountConnectionId?: string|null }} params
 * @returns {{ queued: boolean, alreadyRunning: boolean, progress: object|null }}
 */
const queueFacebookPageImport = (params = {}) => {
  const { companyId } = params;
  const appKey = String(params.appKey || "primary").trim().toLowerCase();

  if (!companyId) {
    throw new Error("companyId is required to queue a Page import");
  }

  pruneProgress();

  const jobKey = getJobKey(companyId, appKey);

  if (activeJobs.has(jobKey)) {
    console.log(`⏳ [PAGE-IMPORT] Import already in flight for ${companyId} (app=${appKey}) — reusing it`);
    return {
      queued: false,
      alreadyRunning: true,
      progress: getFacebookPageImportProgress(companyId, appKey),
    };
  }

  const job = {
    companyId,
    appKey,
    jobKey,
    source: params.source || "oauth_callback",
    userAccessToken: params.userAccessToken || null,
    facebookUserId: params.facebookUserId || null,
    facebookUserName: params.facebookUserName || null,
    facebookUserEmail: params.facebookUserEmail || null,
    connectedByUserId: params.connectedByUserId || null,
    accountConnectionId: params.accountConnectionId || null,
  };

  activeJobs.set(jobKey, true);
  updateProgress(jobKey, {
    ...createEmptyProgress(),
    status: PROGRESS.QUEUED,
    companyId,
    appKey,
    source: job.source,
    queuedAt: new Date().toISOString(),
  });

  // setImmediate: let the HTTP response / redirect flush first.
  setImmediate(() => {
    executePageImportJob(job).catch((error) => {
      console.error("❌ [PAGE-IMPORT] Unhandled job error:", error.message);
      updateProgress(jobKey, {
        status: PROGRESS.FAILED,
        finishedAt: new Date().toISOString(),
        lastError: error.message,
      });
      activeJobs.delete(jobKey);
    });
  });

  return {
    queued: true,
    alreadyRunning: false,
    progress: getFacebookPageImportProgress(companyId, appKey),
  };
};

module.exports = {
  queueFacebookPageImport,
  getFacebookPageImportProgress,
  isFacebookPageImportActive,
  PAGE_IMPORT_CONCURRENCY,
  RETRYABLE_GRAPH_ERROR_CODES,
  MAX_GRAPH_ATTEMPTS,
};
