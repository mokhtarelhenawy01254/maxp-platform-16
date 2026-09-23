// Set timezone to Egypt/Cairo before anything else
process.env.TZ = "Africa/Cairo";

// Load environment variables
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const v8 = require("v8");
const helmet = require("helmet");
const { buildMemoryPressureSnapshot } = require("./services/memoryPressureMonitorService");

// Setup ffmpeg-static path before any WhatsApp or child process starts
try {
  const ffmpeg = require("ffmpeg-static");
  if (ffmpeg) {
    const ffmpegDir = path.dirname(ffmpeg);
    process.env.PATH = ffmpegDir + path.delimiter + process.env.PATH;
    console.log("✅ [FFMPEG] Statically linked ffmpeg added to PATH:", ffmpegDir);
  }
} catch (error) {
  console.error("⚠️ [FFMPEG] Failed to load ffmpeg-static:", error.message);
}

// 1. Load base .env (tracked file)
dotenv.config({ path: path.resolve(__dirname, ".env") });

// 2. Check for .env.local (Local overrides - untracked)
// This allows developers to override variables locally without changing .env
const localEnvPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(localEnvPath)) {
  console.log("📝 [SERVER] Loading .env.local overrides");
  dotenv.config({ path: localEnvPath, override: true });
}

const FRONTEND_DIST_CANDIDATES = [
  path.resolve(__dirname, "../frontend/dist"),
  "/var/www/frontend2/dist",
].filter((candidate, index, candidates) => {
  return candidates.indexOf(candidate) === index && fs.existsSync(candidate);
});

const FRONTEND_STATIC_PREFIXES = [
  "/assets/",
  "/icons/",
  "/brand/",
  "/downloads/",
  "/landing-pages/",
  "/placeholders/",
  "/previews/",
  "/sounds/",
];

const FRONTEND_STATIC_EXACT_PATHS = new Set([
  "/vite.svg",
  "/favicon.ico",
  "/meta.json",
  "/browserconfig.xml",
  "/notification.mp3",
  "/google4ca0156de75f91cd.html",
]);

const createFrontendStaticFallback = () => {
  const handlers = FRONTEND_DIST_CANDIDATES.map((directory) =>
    express.static(directory, {
      fallthrough: true,
      index: false,
      maxAge: "30d",
      immutable: false,
      // Service worker files must never be cached aggressively by the CDN/browser,
      // otherwise clients stay pinned to a stale build (old precache) for up to 30d.
      setHeaders: (res, filePath) => {
        if (/sw\.js$/.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  return (req, res, next) => {
    if (!["GET", "HEAD"].includes((req.method || "").toUpperCase())) {
      return next();
    }

    const assetPath = req.path || req.originalUrl?.split("?")[0] || "";
    const isStaticAssetRequest =
      FRONTEND_STATIC_EXACT_PATHS.has(assetPath) ||
      FRONTEND_STATIC_PREFIXES.some((prefix) => assetPath.startsWith(prefix));

    if (!isStaticAssetRequest || handlers.length === 0) {
      return next();
    }

    let handlerIndex = 0;
    const runNextHandler = (error) => {
      if (error) {
        return next(error);
      }

      const handler = handlers[handlerIndex++];
      if (!handler) {
        return next();
      }

      return handler(req, res, runNextHandler);
    };

    return runNextHandler();
  };
};

// ---------------------------------------------------------
// GLOBAL CRASH HANDLERS - LOAD EARLY!
// ---------------------------------------------------------
const telegramAlertService = require("./services/telegramAlertService");
const {
  getReasonMessage,
  isWhatsAppBaileysConnectionClosed,
  isGramJsResolveError,
  countSwallowedRejection,
} = require("./utils/recoverableUnhandledRejection");




process.on("uncaughtException", async (error) => {
  console.error("🔥 FATAL UNCAUGHT EXCEPTION:", error);
  try {
    await telegramAlertService.sendFatalError(
      "uncaughtException",
      error.message,
      error.stack,
    );
  } catch (e) {}
  // PM2 will restart the process, so exit
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  const msg = getReasonMessage(reason);
  if (isWhatsAppBaileysConnectionClosed(reason)) {
    const total = countSwallowedRejection();
    if (total) {
      console.warn(`⚠️ [SERVER] Swallowed ${total} WhatsApp socket rejections in the last minute (recoverable, but watch for a half-dead socket)`);
    }
    return;
  }
  if (isGramJsResolveError(reason)) {
    const total = countSwallowedRejection();
    if (total) {
      console.warn(`⚠️ [SERVER] Swallowed ${total} GramJS resolve rejections in the last minute`);
    }
    return;
  }

  console.error("🔥 UNHANDLED REJECTION (non-fatal):", reason);
  try {
    const stack = reason && reason.stack ? reason.stack : "";
    await telegramAlertService.sendFatalError("unhandledRejection", msg, stack);
  } catch (e) {}
});
// ---------------------------------------------------------

// 3. Check for specific environment files based on NODE_ENV (e.g. .env.production)
// Note: NODE_ENV might be set by .env or .env.local at this point
const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  const prodEnvPath = path.resolve(__dirname, ".env.production");
  if (fs.existsSync(prodEnvPath)) {
    console.log("📝 [SERVER] Loading .env.production overrides");
    dotenv.config({ path: prodEnvPath, override: true });
  }
}

if (nodeEnv === "production") {
  const {
    installProductionLogFilter,
  } = require("./utils/installProductionLogFilter");
  installProductionLogFilter();
}

// Server starting...
/**
 * Deployment Trigger: 2026-02-17 05:25
 */
const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");
const socketService = require("./services/socketService");
const { startWebhookWorker } = require("./workers/webhookWorker");
const {
  getProcessInstanceId,
  shouldOwnSingletonWork,
} = require("./utils/processOwnership");
const tenantContext = require("./services/tenantContext");

// Import all routes (alphabetic order for sanity)
// Routes Block 1
const activityLogRoutes = require("./routes/activityLogRoutes");

const analyticsRoutes = require("./routes/analyticsRoutes");
const adminCompanyRoutes = require("./routes/adminCompanyRoutes");
const adminWhatsAppRoutes = require("./routes/adminWhatsAppRoutes");
const affiliateRoutes = require("./routes/affiliateRoutes");
const affiliateSettingsRoutes = require("./routes/affiliateSettingsRoutes");
const platformRevenueRoutes = require("./routes/platformRevenueRoutes");
const appointmentsRoutes = require("./routes/appointmentsRoutes");
const bookingBranchesRoutes = require("./routes/bookingBranchesRoutes");
const bookingDoctorsRoutes = require("./routes/bookingDoctorsRoutes");
const bookingServicesRoutes = require("./routes/bookingServicesRoutes");
const bookingAppointmentsRoutes = require("./routes/bookingAppointmentsRoutes");
const bookingDraftRoutes = require("./routes/bookingDraftRoutes");
const bookingReportsRoutes = require("./routes/bookingReportsRoutes");
const bookingPatientsRoutes = require("./routes/bookingPatientsRoutes");
const bookingReferringPhysiciansRoutes = require("./routes/bookingReferringPhysiciansRoutes");
const bookingInvoicesRoutes = require("./routes/bookingInvoicesRoutes");
const bookingDoctorAvailabilityRoutes = require("./routes/bookingDoctorAvailabilityRoutes");
const bookingDoctorPortalRoutes = require("./routes/bookingDoctorPortalRoutes");
const bookingPatientPortalRoutes = require("./routes/bookingPatientPortalRoutes");
const bookingPriceListsRoutes = require("./routes/bookingPriceListsRoutes");
const bookingWorkflowRoutes = require("./routes/bookingWorkflowRoutes");
const bookingOperationsRoutes = require("./routes/bookingOperationsRoutes");
const bookingInsuranceCompaniesRoutes = require("./routes/bookingInsuranceCompaniesRoutes");
const bookingInsuranceMemberTypesRoutes = require("./routes/bookingInsuranceMemberTypesRoutes");
const bookingPatientDocumentsRoutes = require("./routes/bookingPatientDocumentsRoutes");
const labTestsRoutes = require("./routes/labTestsRoutes");
const dentalLabRoutes = require("./routes/dentalLabRoutes");
const dentalLabPortalRoutes = require("./routes/dentalLabPortalRoutes");
const academyRoutes = require("./routes/academyRoutes");
const labOrdersRoutes = require("./routes/labOrdersRoutes");
const labCulturesRoutes = require("./routes/labCulturesRoutes");
const labContractsRoutes = require("./routes/labContractsRoutes");
const labHomeVisitsRoutes = require("./routes/labHomeVisitsRoutes");
const labSampleTypesRoutes = require("./routes/labSampleTypesRoutes");
const radiologyRoutes = require("./routes/radiologyRoutes");
const radiologyInsuranceRoutes = require("./routes/radiologyInsuranceRoutes");
const radiologyQuoteRoutes = require("./routes/radiologyQuoteRoutes");
const radiologyRadiologistsRoutes = require("./routes/radiologyRadiologistsRoutes");
const radiologyReportRolesRoutes = require("./routes/radiologyReportRolesRoutes");
const radiologyTagsRoutes = require("./routes/radiologyTagsRoutes");
const radiologyLabelsRoutes = require("./routes/radiologyLabelsRoutes");
const radiologyAdminRoutes = require("./routes/radiologyAdminRoutes");
const radiologyAiReportRoutes = require("./routes/radiologyAiReportRoutes");
const radiologyCriticalFindingsRoutes = require("./routes/radiologyCriticalFindingsRoutes");
const radiologyBulkRoutes = require("./routes/radiologyBulkRoutes");
const radiologyQueueRoutes = require("./routes/radiologyQueueRoutes");
const radiologyIntelligenceRoutes = require("./routes/radiologyIntelligenceRoutes");
const radiologyReferralRoutes = require("./routes/radiologyReferralRoutes");
const educationSubjectsRoutes = require("./routes/educationSubjectsRoutes");
const educationPackagesRoutes = require("./routes/educationPackagesRoutes");
const educationStudentsRoutes = require("./routes/educationStudentsRoutes");
const educationTeachersRoutes = require("./routes/educationTeachersRoutes");
const educationEnrollmentsRoutes = require("./routes/educationEnrollmentsRoutes");
const educationSessionsRoutes = require("./routes/educationSessionsRoutes");
const educationNotificationRoutes = require("./routes/educationNotificationRoutes");
const educationTeacherAvailabilityRoutes = require("./routes/educationTeacherAvailabilityRoutes");
const educationTeacherPaymentsRoutes = require("./routes/educationTeacherPaymentsRoutes");
const educationTeacherPortalRoutes = require("./routes/educationTeacherPortalRoutes");
const educationParentPortalRoutes = require("./routes/educationParentPortalRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const servicesRoutes = require("./routes/servicesRoutes");
const serviceOrdersRoutes = require("./routes/serviceOrdersRoutes");
const formsRoutes = require("./routes/formsRoutes");
const publicFormsRoutes = require("./routes/publicFormsRoutes");

const agentInboxRoutes = require("./routes/agentInboxRoutes");
const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const broadcastRoutes = require("./routes/broadcastRoutes");
const checkoutFormSettingsRoutes = require("./routes/checkoutFormSettingsRoutes");
const postPurchaseOfferRoutes = require("./routes/postPurchaseOfferRoutes");
const commentRoutes = require("./routes/commentRoutes");
const companyDashboardRoutes = require("./routes/companyDashboardRoutes");
const companyRoutes = require("./routes/companyRoutes");
const storefrontSettingsRoutes = require("./routes/storefrontSettingsRoutes");
const storefrontThemeCatalogRoutes = require("./routes/storefrontThemeCatalogRoutes");
const companyConnectionRoutes = require("./routes/companyConnectionRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
console.log("✅ [DEBUG] Loaded conversationRoutes");
const campaignCalculatorRoutes = require("./routes/campaignCalculatorRoutes");
console.log("✅ [DEBUG] Loaded campaignCalculatorRoutes");
const commissionRoutes = require("./routes/commissionRoutes");
const couponsRoutes = require("./routes/couponsRoutes");
const publicCouponsRoutes = require("./routes/publicCouponsRoutes");
const publicAffiliateRoutes = require("./routes/publicAffiliateRoutes");
const publicMerchantRoutes = require("./routes/publicMerchantRoutes");
const customerBlocklistRoutes = require("./routes/customerBlocklistRoutes");
const customerRoutes = require("./routes/customerRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const deliveryOptionRoutes = require("./routes/deliveryOptionRoutes");
const demoRoutes = require("./routes/demoRoutes");
const devTaskRoutes = require("./routes/devTaskRoutes");
const agentApprovalRoutes = require("./routes/agentApprovalRoutes");
const knowledgeQuestionRoutes = require("./routes/knowledgeQuestionRoutes");
const agentControlRoutes = require("./routes/agentControlRoutes");
const agentManagerRoutes = require("./routes/agentManagerRoutes");
const aiAgentChatRoutes = require("./routes/aiAgentChatRoutes");
const aiSandboxRoutes = require("./routes/aiSandboxRoutes");
const agentConfigRoutes = require("./routes/agentConfigRoutes");
// const agentServiceBridgeRoutes = require("./routes/agentServiceBridgeRoutes");
const aiServiceAgentProxy = require("./routes/aiServiceAgentProxy");
const aiAdminProxyRoute = require("./routes/aiAdminProxyRoute");
const easyOrdersRoutes = require("./routes/easyOrdersRoutes");
const emailRoutes = require("./routes/emailRoutes");
const faqRoutes = require("./routes/faq");
const facebookAdsRoutes = require("./routes/facebookAdsRoutes");
const overlayCampaignRoutes = require("./routes/overlayCampaignRoutes");
const facebookIntegrationRoutes = require("./routes/facebookIntegrationRoutes");
const facebookPostRoutes = require("./routes/facebookPostRoutes");
const agencyRoutes = require("./routes/agencyRoutes");
const facebookOAuthRoutes = require("./routes/facebookOAuthRoutes");
const footerSettingsRoutes = require("./routes/footerSettingsRoutes");
const geolocationRoutes = require("./routes/geolocation");
const healthRoute = require("./routes/healthRoute");
const tenantSkillsRoutes = require("./routes/tenantSkillsRoutes");
console.log(
  "🚀 [SERVER-BOOT] Applying Latest CORS Headers v2 (with x-company-slug)",
);
const imageGalleryRoutes = require("./routes/imageGalleryRoutes");
const importJobRoutes = require("./routes/importJobRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const messageFixRoutes = require("./routes/messageFixRoutes");
const notificationRoutes = require("./routes/notifications-simple");
const notificationSettingsRoutes = require("./routes/notificationRoutes");
const opportunitiesRoutes = require("./routes/opportunitiesRoutes");
const orderRoutes = require("./routes/orderRoutes");
const agentWorkspaceRoutes = require("./routes/agentWorkspaceRoutes");
const procurementRoutes = require("./routes/procurementRoutes");
const cafeRestaurantRoutes = require("./routes/cafeRestaurantRoutes");
const orderRoutes2 = require("./routes/orders");
const enhancedOrdersRoutes = require("./routes/enhancedOrders");
const orderInvoiceRoutes = require("./routes/orderInvoiceRoutes");
const orderInvoiceSettingsRoutes = require("./routes/orderInvoiceSettingsRoutes");
const orderSettingsRoutes = require("./routes/orderSettings");
const orderWorkflowRoutes = require("./routes/orderWorkflowRoutes");
const scheduledOrderRoutes = require("./routes/scheduledOrderRoutes");
const orderConfirmationRoutes = require("./routes/orderConfirmationRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const orderStatusRoutes = require("./routes/orderStatusRoutes");
const orderStatusRuleRoutes = require("./routes/orderStatusRuleRoutes");
const bulkOrdersRoutes = require("./routes/bulkOrders");
const wholesaleRoutes = require("./routes/wholesaleRoutes");
const pageEngagementRoutes = require("./routes/pageEngagementRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const kashierRoutes = require("./routes/kashierRoutes");
const codDepositRoutes = require("./routes/codDepositRoutes");
const promotionSettingsRoutes = require("./routes/promotionSettingsRoutes");
const policyCrudRoutes = require("./routes/policy");
const productReviewRoutes = require("./routes/productReviewRoutes");
const publicProductReviewRoutes = require("./routes/publicProductReviewRoutes");
const productLandingPagesRoutes = require("./routes/productLandingPagesRoutes");
const funnelRoutes = require("./routes/funnelRoutes");
const productRoutes = require("./routes/productRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proxyRoutes = require("./routes/proxyRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const customerLoyaltyRoutes = require("./routes/customerLoyaltyRoutes");
const returnRoutes = require("./routes/returnRoutes");
const cancellationRoutes = require("./routes/cancellationRoutes");
const savedRepliesRoutes = require("./routes/savedRepliesRoutes");
const schedulerRoutes = require("./routes/schedulerRoutes");
const securityRoutes = require("./routes/securityRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const smartRepliesRoutes = require("./routes/smartRepliesRoutes");
const botAutomationRoutes = require("./routes/botAutomationRoutes");
const publicBotWidgetRoutes = require("./routes/publicBotWidgetRoutes");
const shippingZoneRoutes = require("./routes/shippingZoneRoutes");
const storePagesRoutes = require("./routes/storePagesRoutes");

const superAdminRoutes = require("./routes/superAdminRoutes");
const appExplanationsRoutes = require("./routes/appExplanationsRoutes");
const supportRoutes = require("./routes/supportRoutes");
const systemManagementRoutes = require("./routes/systemManagementRoutes");
const monitorRoutes = require("./routes/monitorRoutes");
const taskRoutes = require("./routes/taskRoutes");
const taskExternalRoutes = require("./routes/taskExternalRoutes");
const devTaskExternalRoutes = require("./routes/devTaskExternalRoutes");
const telegramRoutes = require("./routes/telegramRoutes");
const telegramAdvancedRoutes = require("./routes/telegramAdvancedRoutes");
const userbotRoutes = require("./routes/userbotRoutes");
const textGalleryRoutes = require("./routes/textGalleryRoutes");
const turboRoutes = require("./routes/turboRoutes");
const bostaRoutes = require("./routes/bostaRoutes");
const qpExpressRoutes = require("./routes/qpExpressRoutes");
const shippingCompaniesRoutes = require("./routes/shippingCompaniesRoutes");
const shipmentsRoutes = require("./routes/shipmentsRoutes");
const shippingSettlementRoutes = require("./routes/shippingSettlementRoutes");
const bulkStatusUpdateRoutes = require("./routes/bulkStatusUpdateRoutes");
const easyWarehouseRoutes = require("./routes/easyWarehouseRoutes");
const turboWebhookRoutes = require("./routes/turboWebhook");
const bostaWebhookRoutes = require("./routes/bostaWebhook");
const walletPaymentRoutes = require("./routes/walletPayment");
const warehouseRoutes = require("./routes/warehouseRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const whatsappMetaWebhookRoutes = require("./routes/whatsappMetaWebhookRoutes");
const whatsappAutomationRoutes = require("./routes/whatsappAutomationRoutes");
const unifiedInboxRoutes = require("./routes/unifiedInboxRoutes");
const whatsappInboxRoutes = require("./routes/whatsappInboxRoutes");
const moderatorDashboardRoutes = require("./routes/moderatorDashboardRoutes");
const internalNotesRoutes = require("./routes/internalNotesRoutes");
const whatsappNumberAssignmentRoutes = require("./routes/whatsappNumberAssignmentRoutes");
const moderatorNotificationRoutes = require("./routes/moderatorNotificationRoutes");
const rbacAdminRoutes = require("./routes/rbacAdminRoutes");
const inboxSettingsRoutes = require("./routes/inboxSettingsRoutes");
const googleSheetsRoutes = require("./routes/googleSheetsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const wooCommerceRoutes = require("./routes/wooCommerceRoutes");
const storePromotionRoutes = require("./routes/storePromotionRoutes");

// Marketplace System Routes
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const companyAppsRoutes = require("./routes/companyAppsRoutes");
const walletRoutes = require("./routes/walletRoutes");
const adminWalletRoutes = require("./routes/adminWalletRoutes");
const platformSubscriptionRoutes = require("./routes/platformSubscriptionRoutes");
const superAdminPlatformRoutes = require("./routes/superAdminPlatformRoutes");
const internalDeployRoutes = require("./routes/internalDeployRoutes");
const publicPlatformRoutes = require("./routes/publicPlatformRoutes");
const membershipRoutes = require("./routes/membershipRoutes");
// Marketplace Management Routes
const marketplaceManagementRoutes = require("./routes/marketplaceManagementRoutes");
const merchantRoutes = require("./routes/merchantRoutes");
const merchantPortalRoutes = require("./routes/merchantPortalRoutes");

// Partner Program Routes (Title-Based Multi-Level)
const platformPartnerRoutes = require("./routes/platformPartner.routes");
// Billing System Routes (V1.0)
const billingRoutes = require("./routes/billingRoutes");
const treasuryExpensesRoutes = require("./routes/treasuryExpensesRoutes");

// Billing Cron Service
const billingCronService = require("./services/billingCronService");
const whatsappNotificationRoutes = require("./routes/whatsappNotificationRoutes");
const whatsappMetaTemplateRoutes = require("./routes/whatsappMetaTemplateRoutes");
const leadFollowUpRoutes = require("./routes/leadFollowUpRoutes");
const leadCategoryRoutes = require("./routes/leadCategoryRoutes");
const WhatsAppNotificationService = require("./services/whatsapp/WhatsAppNotificationService");
const errorRoutes = require("./routes/errorRoutes");

// Services & Middleware
const telegramBotService = require("./services/TelegramBotService");
const WhatsAppManager = require("./services/whatsapp/WhatsAppManager");
const { initializeSharedDatabase } = require("./services/sharedDatabase");
const { initializePostgresDatabase } = require("./services/postgresDatabase");
const {
  globalSecurity,
  clearIPBlocks,
} = require("./middleware/globalSecurity");
const { addPublicCORS } = require("./middleware/companyMiddleware");
const {
  extractSubdomainMiddleware,
} = require("./middleware/subdomainMiddleware");
const storefrontHtmlController = require("./controller/storefrontHtmlController");
const storefrontSitemapController = require("./controller/storefrontSitemapController");
const storefrontRobotsController = require("./controller/storefrontRobotsController");
const { handlePlatformSeo } = require("./middleware/platformSeoMiddleware");
const {
  securityHeaders,
  sanitizeRequest,
  securityMonitoring,
  smartRateLimit,
  enhancedCORS,
} = require("./middleware/securityEnhancements");
const { sanitizeInput } = require("./middleware/inputValidation");
const {
  performanceMonitor,
  queryOptimizer,
} = require("./middleware/performanceOptimization");

// Initialize application
const app = express();
const server = http.createServer(app);
app.set("trust proxy", true);

// 🩹 Self-Healing Middleware for Malformed Concatenated URLs
// Catches accidental client-side origin/path concatenations like /https://domain.com/path or /http://domain.com
// and issues a permanent 301 redirect to the clean intended destination.
app.use((req, res, next) => {
  const rawUrl = req.originalUrl || req.url || req.path || "";
  let decodedUrl = rawUrl;
  try {
    decodedUrl = decodeURIComponent(rawUrl);
  } catch {}

  const malformedMatch = decodedUrl.match(/^\/+(https?):(?:\/+)?([^\/\?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
  if (malformedMatch) {
    const protocol = malformedMatch[1].toLowerCase();
    const targetHost = malformedMatch[2].toLowerCase();
    const targetPath = malformedMatch[3] || "/";
    const targetQuery = malformedMatch[4] || "";
    const targetHash = malformedMatch[5] || "";

    const currentHost = (req.get("host") || "").toLowerCase().split(":")[0];
    const isSameHost = targetHost === currentHost;

    let cleanDestination;
    if (isSameHost) {
      cleanDestination = `${targetPath}${targetQuery}${targetHash}`;
    } else {
      cleanDestination = `${protocol}://${targetHost}${targetPath}${targetQuery}${targetHash}`;
    }

    console.warn(
      `⚠️ [SELF-HEAL] Intercepted malformed URL: "${rawUrl}" -> redirecting 301 to: "${cleanDestination}"`
    );
    return res.redirect(301, cleanDestination);
  }
  next();
});

const uploadRoots = [
  path.resolve(__dirname, "uploads"),
  path.resolve(__dirname, "../uploads"),
].filter((root, index, roots) => roots.indexOf(root) === index);

function resolveUploadRequestFile(requestPath) {
  let normalizedRelativePath = "";

  try {
    normalizedRelativePath = decodeURIComponent(requestPath || "").replace(
      /^\/+/,
      "",
    );
  } catch {
    return null;
  }

  if (!normalizedRelativePath) {
    return null;
  }

  for (const root of uploadRoots) {
    const candidatePath = path.resolve(root, normalizedRelativePath);
    if (
      candidatePath !== root &&
      !candidatePath.startsWith(`${root}${path.sep}`)
    ) {
      continue;
    }

    try {
      const stats = fs.statSync(candidatePath);
      if (stats.isFile()) {
        return candidatePath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

// FAST STARTUP: Warm up socket service without blocking
try {
  socketService.initialize(server);
  if (typeof importJobRoutes.setSocketIO === "function") {
    importJobRoutes.setSocketIO(socketService.getIO());
  }
  console.log("✅ [SERVER] Socket service initialized");
} catch (error) {
  console.error(
    "❌ [SERVER] Socket service initialization failed:",
    error.message,
  );
}

// Global Middleware
app.use(securityHeaders);
app.use(performanceMonitor);
app.use(sanitizeRequest);
app.use(securityMonitoring);

const shouldCaptureRawJsonBody = (req) => {
  const requestPath = req.originalUrl?.split('?')[0] || req.path || '';
  return (
    requestPath.startsWith('/api/v1/webhook') ||
    requestPath.startsWith('/api/v1/webhooks') ||
    requestPath.startsWith('/api/v1/whatsapp-meta')
  );
};

const captureRawJsonBody = (req, res, buf, encoding) => {
  if (!shouldCaptureRawJsonBody(req) || !buf?.length) {
    return;
  }

  req.rawBody = buf.toString(encoding || 'utf8');
};

// Body Parsers & Security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(express.json({ limit: "15mb", verify: captureRawJsonBody }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// Static serving for uploads (task attachments, images, documents)
const uploadsStaticPath = path.resolve(__dirname, 'uploads');
if (fs.existsSync(uploadsStaticPath)) {
  app.use('/uploads', express.static(uploadsStaticPath, { maxAge: '7d', fallthrough: true }));
}

// ─────────────────────────────────────────────────────────────────────────
// Platform Partner Attribution Window
// Captures ?partner=CODE on ANY request (most importantly the register page
// visit) and persists it for 30 days via an httpOnly cookie, with a short-lived
// server-side session fallback. The code is later read on registration.
// ─────────────────────────────────────────────────────────────────────────
const PARTNER_ATTR_COOKIE = "pp_ref";
const PARTNER_ATTR_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

app.use((req, res, next) => {
  try {
    const code =
      req.query?.partner ||
      req.query?.partnerCode ||
      req.body?.partnerCode ||
      req.cookies?.[PARTNER_ATTR_COOKIE];

    if (code && typeof code === "string" && code.trim()) {
      const clean = code.trim().toUpperCase().slice(0, 32);
      // Only set if different / missing to avoid resetting the 30-day timer
      if (req.cookies?.[PARTNER_ATTR_COOKIE] !== clean) {
        res.cookie(PARTNER_ATTR_COOKIE, clean, {
          httpOnly: true,
          sameSite: "lax",
          maxAge: PARTNER_ATTR_MAX_AGE,
          path: "/",
        });
      }
      req.partnerCode = clean;
    } else if (req.cookies?.[PARTNER_ATTR_COOKIE]) {
      req.partnerCode = req.cookies[PARTNER_ATTR_COOKIE];
    }
  } catch (_) {
    /* never break registration because of attribution */
  }
  next();
});

app.use(sanitizeInput);

// Tenant Context Extraction
app.use(tenantContext.middleware());

// Dynamic CORS configuration (Allows only dashboard + approved storefront origins)
app.use(enhancedCORS);


// Performance Optimization: Cache Header Control
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("X-Response-Time-Optimization", "Active");
  }
  next();
});

// Logs for background task monitoring
app.use((req, res, next) => {
  if (req.headers["x-request-id"]) {
    req.id = req.headers["x-request-id"];
  }
  next();
});

// Frontend build assets must stay public even when wildcard storefront hosts
// proxy through the backend for HTML shell rendering.
app.use(createFrontendStaticFallback());

// ═══════════════════════════════════════════════════════════════════════════════
// 🌍 PUBLIC API SURFACES (Storefront, Analytics, CRM Webhooks)
// ═══════════════════════════════════════════════════════════════════════════════

// Public Webhook endpoints (CORS handled individually by providers)
// Keep both singular and plural aliases because external providers already hit
// `/api/v1/webhook` while newer internal code may use `/api/v1/webhooks`.
app.use("/api/v1/webhook", webhookRoutes);
app.use("/api/v1/webhooks", webhookRoutes);
app.use("/api/v1/whatsapp-meta", whatsappMetaWebhookRoutes);
app.use("/api/v1/turbo-webhook", turboWebhookRoutes);
app.use("/api/v1/bosta-webhook", bostaWebhookRoutes);
app.use("/api/v1/health", healthRoute);
app.use("/api/geolocation", geolocationRoutes);
app.use("/api/v1/geolocation", geolocationRoutes);

// Shared/Public API surfacing (Limited CORS)
app.use("/api/v1/public/analytics", require("./routes/publicAnalyticsRoutes"));
console.log("✅ [DEBUG] Public Analytics GET Routes Loaded");

// Public Marketplace Routes
app.use("/api/v1/marketplace", marketplaceRoutes);
app.use("/api/v1/public/marketplace", marketplaceRoutes);
console.log("✅ [DEBUG] Public Marketplace Routes Loaded");

// Public Product Surfaces
// Product reviews must mount BEFORE publicProductsRoutes — its catch-all
// /:id/:presentationSlug route otherwise swallows /products/:id/reviews and
// /products/:id/back-in-stock with a 404 ("العرض التقديمي غير موجود").
app.use("/api/v1/public", publicProductReviewRoutes);
app.use("/api/v1/public/products/feed", require("./routes/productFeedRoutes"));
app.use(
  "/api/v1/public/products",
  require("./routes/publicProductsSimpleRoutes"),
);
app.use(
  "/api/v1/public/customers",
  require("./routes/publicCustomerRoutes"),
);
app.use("/api/v1/public/orders", require("./routes/publicOrdersRoutes"));
app.use("/api/v1/public/loyalty", require("./routes/publicLoyaltyRoutes"));
app.use("/api/v1/loyalty", require("./routes/loyaltyRoutes"));
app.use("/api/v1/public/turbo/location", require("./routes/publicTurboLocationRoutes"));
app.use(
  "/api/v1/public/storefront",
  require("./routes/publicStorefrontRoutes"),
);
app.use("/api/v1/public/platform", publicPlatformRoutes);
app.use("/api/v1/public/affiliates", publicAffiliateRoutes);
app.use("/api/v1/public/merchants", publicMerchantRoutes);
app.use("/api/v1/public/booking", require("./routes/publicBookingRoutes"));
app.use("/api/v1/public/widget", require("./routes/publicWidgetChatRoutes"));
app.use("/api/v1/public/lp-pages", require("./routes/lpAdminRoutes").publicRouter);
app.use("/api/v1/public/support-settings", require("./routes/publicSupportSettings"));
app.use("/api/v1/public", publicCouponsRoutes);
app.use("/api/v1/public/checkout-form-settings", checkoutFormSettingsRoutes);
app.use("/api/v1/public/post-purchase-offer", postPurchaseOfferRoutes.publicRouter);
app.use("/api/v1/public/footer-settings", footerSettingsRoutes);
app.use("/api/v1/public/promotion-settings", promotionSettingsRoutes);
app.use("/api/v1/public/forms", publicFormsRoutes);
app.use("/api/v1/public/store-promotions", storePromotionRoutes);
app.use("/api/v1/product-landings", productLandingPagesRoutes);
app.use("/api/v1/funnels", funnelRoutes);
  console.log("✅ [DEBUG] Public Products, Orders & Storefront Routes Loaded");

  // Public Kashier payment & checkout routes (no dashboard auth required)
  app.use("/api/v1/payment", kashierRoutes);

  // COD Deposit routes (payment link generation, webhook, status)
  app.use("/api/v1/payment", codDepositRoutes);

  // Public webhook for platform subscription payments (Kashier → MaxP platform billing)
  const { handleWebhook: handlePlatformSubscriptionWebhook } = require("./controller/platformSubscriptionController");
  app.post("/api/v1/public/platform-subscription/webhook", handlePlatformSubscriptionWebhook);

  // Public integration surfaces secured by their own API keys/signatures
  app.use("/api/v1/external/tasks", taskExternalRoutes);
app.use("/api/v1/external/dev-tasks", devTaskExternalRoutes);

// Static User Content Surface
// 2026-08 security: sensitive upload folders (HR, payments, affiliate, dental-lab,
// tasks, support) are gated behind the logged-in refreshToken cookie and never
// cached. Public-but-shareable folders (conversations/whatsapp/companies) are
// served no-store so Cloudflare never retains a copy of possibly private media.
const PRIVATE_UPLOAD_PREFIXES = [
  '/hr/',
  '/payment-receipts/',
  '/affiliate-documents/',
  '/affiliate-payouts/',
  '/dental-lab/',
  '/support/',
];
const NO_CACHE_UPLOAD_PREFIXES = ['/conversations/', '/whatsapp/', '/companies/', '/tasks/', '/dev-tasks/'];

app.use("/uploads", async (req, res, next) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    const uploadPathname = req.path;
    const isPrivateUpload =
      PRIVATE_UPLOAD_PREFIXES.some((prefix) => uploadPathname.startsWith(prefix));
    const isNoCacheUpload =
      isPrivateUpload ||
      NO_CACHE_UPLOAD_PREFIXES.some((prefix) => uploadPathname.startsWith(prefix));

    const { resolveOptimizedUploadVariant } = require("./utils/uploadImageOptimizer");
    const resolvedUploadFile = resolveUploadRequestFile(req.path);

    if (!resolvedUploadFile) {
      return res.status(404).json({
        success: false,
        error: "Asset Not Found",
        message: "الملف المطلوب غير موجود",
        path: `/uploads${req.path}`,
      });
    }

    // Private folders: require a logged-in dashboard session (refreshToken cookie, Authorization header, or token query param).
    // 404 (not 403) to avoid revealing that the file exists.
    const hasAuth =
      Boolean(req.cookies?.refreshToken) ||
      Boolean(req.headers.authorization) ||
      Boolean(req.query?.token);

    if (isPrivateUpload && !hasAuth) {
      return res.status(404).json({
        success: false,
        error: "Asset Not Found",
        message: "الملف المطلوب غير موجود",
        path: `/uploads${req.path}`,
      });
    }

    // Private / shareable folders must never be cached by Cloudflare or the browser.
    if (isNoCacheUpload) {
      res.setHeader("Cache-Control", "private, no-store");
      return res.sendFile(resolvedUploadFile, (error) => {
        if (error) {
          next(error);
        }
      });
    }

    const optimizedVariant = await resolveOptimizedUploadVariant({
      sourceFilePath: resolvedUploadFile,
      query: req.query,
      acceptHeader: req.headers['accept'],
    });

    const fileToSend = optimizedVariant?.filePath || resolvedUploadFile;
    const cacheControl =
      optimizedVariant?.cacheControl || "public, max-age=2592000, immutable";

    // Only vary by Accept if the format wasn't explicitly requested in query params.
    // Unconditional "Vary: Accept" forces Cloudflare to treat images as DYNAMIC and bypass Edge Cache.
    if (!req.query.format && !req.query.fm) {
      res.setHeader("Vary", "Accept");
    }
    res.setHeader("Cache-Control", cacheControl);
    if (optimizedVariant?.contentType) {
      res.setHeader("Content-Type", optimizedVariant.contentType);
    }
    return res.sendFile(fileToSend, (error) => {
      if (error) {
        next(error);
      }
    });
  } catch (error) {
    return next(error);
  }
});

// 📖 App Explanations (public + admin routes — admin endpoints are protected by requireSuperAdmin inside the route file)
app.use("/api/v1/app-explanations", appExplanationsRoutes);

// 🚀 Apply Security for sensitive Admin/Company routes
app.use(globalSecurity);

// ═══════════════════════════════════════════════════════════════════════════════
// 💼 PROTECTED BUSINESS LOGIC (Admin Dashboard & Store Backend)
// ═══════════════════════════════════════════════════════════════════════════════

// Auth & Core System
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/platform", platformRevenueRoutes);
app.use("/api/v1/platform-partners", platformPartnerRoutes);

// Admin / Dashboard Features
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/company-dashboard", companyDashboardRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/analytics/order-movement", require("./routes/orderMovementRoutes"));
app.use("/api/v1/storefront-settings", storefrontSettingsRoutes);
app.use("/api/v1/storefront/settings", storefrontSettingsRoutes); // Convenient alias
app.use("/api/v1/checkout-form-settings", checkoutFormSettingsRoutes);
app.use("/api/v1/post-purchase-offer", postPurchaseOfferRoutes);
app.use("/api/v1/footer-settings", footerSettingsRoutes);

// Customer & Order Lifecycle
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/customer-blocklist", customerBlocklistRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/orders-v2", orderRoutes2);
app.use("/api/v1/orders-new", orderRoutes2);
app.use("/api/v1/orders-enhanced", enhancedOrdersRoutes);
app.use("/api/v1/agent-workspace", agentWorkspaceRoutes);
app.use("/api/v1/order-workflow", orderWorkflowRoutes);
app.use("/api/v1/orders-workflow", orderWorkflowRoutes);
app.use("/api/v1/order-confirmation", orderConfirmationRoutes);

app.use("/api/v1/order-status", orderStatusRoutes);
app.use("/api/v1/order-status-rules", orderStatusRuleRoutes);
app.use("/api/v1/order-invoices", orderInvoiceRoutes);
app.use("/api/v1/order-invoice-settings", orderInvoiceSettingsRoutes);
app.use("/api/v1/order-settings", orderSettingsRoutes);
app.use("/api/v1/scheduled-orders", scheduledOrderRoutes);
app.use("/api/v1/bulk-orders", bulkOrdersRoutes);
app.use("/api/v1/wholesale", wholesaleRoutes);
app.use("/api/v1/returns", returnRoutes);
app.use("/api/v1/cancellations", cancellationRoutes);
app.use("/api/v1/policies", policyCrudRoutes);
app.use("/api/v1/faqs", faqRoutes);

// CRM & Communication
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/agent-inbox", agentInboxRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/saved-replies", savedRepliesRoutes);
app.use("/api/v1/unified-inbox", unifiedInboxRoutes);
app.use("/api/v1/whatsapp", whatsappRoutes);
app.use("/api/v1/whatsapp-automation", whatsappAutomationRoutes);
app.use("/api/v1/whatsapp/automation", whatsappAutomationRoutes);
app.use("/api/v1/telegram", telegramRoutes);
app.use("/api/v1/telegram-advanced", telegramAdvancedRoutes);
app.use("/api/v1/userbot", userbotRoutes);
app.use("/api/v1/whatsapp-notifications", whatsappNotificationRoutes);
app.use("/api/v1/whatsapp-templates", whatsappMetaTemplateRoutes);
app.use("/api/v1/whatsapp/lead-followup", leadFollowUpRoutes);
app.use("/api/v1/whatsapp/lead-categories", leadCategoryRoutes);

// ─── WhatsApp Inbox CRM (Number-Based Permissions) ──────────────
app.use("/api/v1/whatsapp-inbox", whatsappInboxRoutes);
app.use("/api/v1/moderator-dashboard", moderatorDashboardRoutes);
app.use("/api/v1/internal-notes", internalNotesRoutes);
app.use("/api/v1/admin/whatsapp-numbers", whatsappNumberAssignmentRoutes);
app.use("/api/v1/notifications/inbox", moderatorNotificationRoutes);
app.use("/api/v1/admin/rbac", rbacAdminRoutes);
app.use("/api/v1/inbox-settings", inboxSettingsRoutes);

app.use("/api/v1/broadcast", broadcastRoutes);
app.use("/api/v1/broadcasts", broadcastRoutes);
app.use("/api/v1/membership", membershipRoutes);

// Store Management & Catalog
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/articles", require("./routes/articleRoutes"));
app.use("/api/v1/public/articles", require("./routes/publicArticleRoutes"));
app.use("/api/v1/categories", require("./routes/categoryRoutes"));
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.use("/api/v1/cafe", cafeRestaurantRoutes);
app.use("/api/v1/merchants", merchantRoutes);
app.use("/api/v1/merchant-portal", merchantPortalRoutes);
app.use("/api/v1/warehouses", warehouseRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/shipping-zones", shippingZoneRoutes);
app.use("/api/v1/store-settings", require("./routes/storeSettingsRoutes"));
app.use("/api/v1/store-pages", storePagesRoutes);
app.use("/api/v1/promotion-settings", promotionSettingsRoutes);
app.use("/api/v1/store-promotions", storePromotionRoutes);
app.use("/api/v1/delivery-options", deliveryOptionRoutes);
app.use("/api/v1/coupons", couponsRoutes);
app.use("/api/v1/reviews", productReviewRoutes);
app.use("/api/v1/payments", paymentRoutes);

// External Integrations
app.use("/api/v1/facebook/ads", facebookAdsRoutes);
app.use("/api/v1/facebook-ads", facebookAdsRoutes);
app.use("/api/v1/facebook/integration", facebookIntegrationRoutes);
app.use("/api/v1/integrations", facebookIntegrationRoutes);
app.use("/api/v1/facebook/posts", facebookPostRoutes);
app.use("/api/v1/agency", agencyRoutes);
app.use("/api/agency", agencyRoutes);
app.use("/api/v1/facebook/oauth", facebookOAuthRoutes);
app.use("/api/v1/facebook-oauth", facebookOAuthRoutes);
app.use("/api/v1/admin/facebook-oauth", facebookOAuthRoutes);
app.use("/api/v1/facebook-pixel", facebookOAuthRoutes);
app.use("/api/facebook-pixel", facebookOAuthRoutes);
app.use("/api/v1/overlay-campaigns", overlayCampaignRoutes);
app.use("/api/v1/google-sheets", googleSheetsRoutes);
app.use("/api/v1/easy-orders", easyOrdersRoutes);
app.use("/api/v1/tenant-skills", tenantSkillsRoutes);
app.use("/api/tenant-skills", tenantSkillsRoutes);
app.use("/api/v1/proxy-image", proxyRoutes);
app.use("/api/proxy-image", proxyRoutes);
app.use("/api/v1/import-jobs", importJobRoutes);
app.use("/api/v1/woocommerce", wooCommerceRoutes);
app.use("/api/v1/turbo", turboRoutes);
app.use("/api/v1/bosta", bostaRoutes);
app.use("/api/v1/qp-express", qpExpressRoutes);

// Professional Tools
app.use("/api/v1/appointments", appointmentsRoutes);
app.use("/api/v1/booking/branches", bookingBranchesRoutes);
app.use("/api/v1/booking/doctors/availability", bookingDoctorAvailabilityRoutes);
app.use("/api/v1/booking/doctors", bookingDoctorsRoutes);
app.use("/api/v1/booking/services", bookingServicesRoutes);
app.use("/api/v1/booking/appointments", bookingAppointmentsRoutes);
app.use("/api/v1/booking/drafts", bookingDraftRoutes);
app.use("/api/v1/booking/reports", bookingReportsRoutes);
app.use("/api/v1/booking/patients", bookingPatientsRoutes);
app.use("/api/v1/booking/referring-physicians", bookingReferringPhysiciansRoutes);
app.use("/api/v1/booking/invoices", bookingInvoicesRoutes);
app.use("/api/v1/booking/doctor-portal", bookingDoctorPortalRoutes);
app.use("/api/v1/booking/patient-portal", bookingPatientPortalRoutes);
app.use("/api/v1/booking/price-lists", bookingPriceListsRoutes);
app.use("/api/v1/booking/workflow", bookingWorkflowRoutes);
app.use("/api/v1/booking/operations", bookingOperationsRoutes);
app.use("/api/v1/booking/insurance-companies", bookingInsuranceCompaniesRoutes);
app.use("/api/v1/booking/insurance-member-types", bookingInsuranceMemberTypesRoutes);
app.use("/api/v1/booking/patient-documents", bookingPatientDocumentsRoutes);
app.use("/api/v1/lab/tests", labTestsRoutes);
app.use("/api/v1/dental-lab", dentalLabRoutes);
app.use("/api/v1/dental-lab/portal", dentalLabPortalRoutes);
app.use("/api/v1/lab/orders", labOrdersRoutes);
app.use("/api/v1/lab/cultures", labCulturesRoutes);
app.use("/api/v1/lab/contracts", labContractsRoutes);
app.use("/api/v1/lab/home-visits", labHomeVisitsRoutes);
app.use("/api/v1/lab/sample-types", labSampleTypesRoutes);
app.use("/api/v1/radiology", radiologyReportRolesRoutes);
app.use("/api/v1/radiology", radiologyCriticalFindingsRoutes);
app.use("/api/v1/radiology", radiologyAiReportRoutes);
app.use("/api/v1/radiology", radiologyRoutes);
app.use("/api/v1/radiology", radiologyInsuranceRoutes);
app.use("/api/v1/radiology", radiologyQuoteRoutes);
app.use("/api/v1/radiology", radiologyRadiologistsRoutes);
app.use("/api/v1/radiology", radiologyTagsRoutes);
app.use("/api/v1/radiology", radiologyLabelsRoutes);
app.use("/api/v1/radiology", radiologyAdminRoutes);
app.use("/api/v1/radiology/bulk", radiologyBulkRoutes);
app.use("/api/v1/radiology/queue", radiologyQueueRoutes);
app.use("/api/v1/radiology/intelligence", radiologyIntelligenceRoutes);
app.use("/api/v1/radiology", radiologyReferralRoutes);
app.use("/api/v1/education/subjects", educationSubjectsRoutes);
app.use("/api/v1/education/packages", educationPackagesRoutes);
app.use("/api/v1/education/students", educationStudentsRoutes);
app.use("/api/v1/education/teachers", educationTeachersRoutes);
app.use("/api/v1/education/enrollments", educationEnrollmentsRoutes);
app.use("/api/v1/education/sessions", educationSessionsRoutes);
app.use("/api/v1/education/notifications", educationNotificationRoutes);
app.use("/api/v1/education/availability", educationTeacherAvailabilityRoutes);
app.use("/api/v1/education/payments", educationTeacherPaymentsRoutes);
app.use("/api/v1/education/teacher-portal", educationTeacherPortalRoutes);
app.use("/api/v1/education/parent-portal", educationParentPortalRoutes);
app.use("/api/v1/academy", academyRoutes);
app.use("/api/v1/hotel", hotelRoutes);
app.use("/api/v1/services", servicesRoutes);
app.use("/api/v1/service-orders", serviceOrdersRoutes);
app.use("/api/v1/forms", formsRoutes);
app.use("/api/v1/affiliates", affiliateRoutes);
app.use("/api/v1/affiliate-settings", affiliateSettingsRoutes);
app.use("/api/v1/commissions", commissionRoutes);
app.use("/api/v1/campaign-calculator", campaignCalculatorRoutes);
app.use("/api/v1/monitor-admin", monitorRoutes);
app.use("/api/v1", pageEngagementRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/dev-tasks", devTaskRoutes);
app.use("/api/v1/agent", agentControlRoutes);
app.use("/api/v1/agent/approvals", agentApprovalRoutes);
app.use("/api/v1/agent-manager", agentManagerRoutes);
app.use("/api/v1/ai/chat", aiAgentChatRoutes);
app.use("/api/v1/ai/knowledge-questions", knowledgeQuestionRoutes);
app.use("/api/v1/ai-sandbox", aiSandboxRoutes);
app.use("/api/v1/ai/agent-config", agentConfigRoutes);
// app.use("/api/v1/ai-bridge", agentServiceBridgeRoutes); // REMOVED: catalog-mcp now calls Python directly
app.use("/api/v1/proxy/ai-service", aiServiceAgentProxy);
app.use("/api/v1/ai-admin", aiAdminProxyRoute);
app.use("/api/v1/admin/lp-pages", require("./routes/lpAdminRoutes").adminRouter);
app.use("/api/v1/proxy", proxyRoutes);


// Platform & Super-Admin
app.use("/api/v1/internal", internalDeployRoutes);
app.use("/api/v1/super-admin", superAdminRoutes);
app.use("/api/v1/super-admin/platform", superAdminPlatformRoutes);
app.use(
  "/api/v1/super-admin/storefront-theme-catalog",
  storefrontThemeCatalogRoutes,
);
app.use(
  "/api/v1/super-admin/marketplace-management",
  marketplaceManagementRoutes,
);
app.use("/api/v1/wallet-payment", walletPaymentRoutes);
app.use("/api/v1/admin/companies", adminCompanyRoutes);
app.use("/api/v1/admin/whatsapp", adminWhatsAppRoutes);
const adminWhatsAppInboxRoutes = require("./routes/adminWhatsAppInboxRoutes");
app.use("/api/v1/admin/whatsapp-inbox", adminWhatsAppInboxRoutes);
app.use("/api/v1/admin/wallet", adminWalletRoutes);
app.use("/api/v1/admin/payments", paymentRoutes);
app.use("/api/v1/admin/invoices", invoiceRoutes);
app.use("/api/v1/admin/order-invoices", require("./routes/adminOrderInvoiceRoutes"));
app.use("/api/v1/admin/schedulers", schedulerRoutes);
app.use("/api/v1/admin/self-review", require("./routes/adminSelfReviewRoutes"));
app.use("/api/v1/admin/whatsapp-ai-ignore-list", require("./routes/adminWhatsappAIgnoreListRoutes"));
// Backward-compatible alias for legacy admin tools that still call /api/v1/admin/*
app.use("/api/v1/admin", systemManagementRoutes);
app.use("/api/v1/system", systemManagementRoutes);

// HR & Operations
const hrRoutes = require("./routes/hrRoutes");
app.use("/api/v1/hr", hrRoutes);
const employeeMonitorRoutes = require("./routes/employeeMonitorRoutes");
app.use("/api/v1/employee-monitor", employeeMonitorRoutes);
app.use("/api/monitor", employeeMonitorRoutes);
app.use("/api/v1/hr/rewards", rewardRoutes);
app.use("/api/v1/hr/customer-loyalty", customerLoyaltyRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/treasury", treasuryExpensesRoutes);
app.use("/api/treasury", treasuryExpensesRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/owner", ownerRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/activity", activityLogRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/reminders", require("./routes/reminderRoutes"));
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/notifications", notificationSettingsRoutes);
app.use("/api/v1/shipping-companies", shippingCompaniesRoutes);
app.use("/api/v1/shipments", shipmentsRoutes);
app.use("/api/v1/shipping-settlement", shippingSettlementRoutes);
app.use("/api/v1/orders/bulk-status", bulkStatusUpdateRoutes);
app.use("/api/v1/easy-warehouse", easyWarehouseRoutes);

// Log all deduction requests
app.use("/api/v1/hr/deductions", (req, res, next) => {
  console.log(`🔍 [DEDUCTION-REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});
app.use("/api/v1/hr/deductions", require("./routes/deductionRoutes"));
app.use("/api/v1/employee", require("./routes/employeeDeductionRoutes"));
app.use("/api/v1/hr/lateness", require("./routes/latenessRoutes"));

// Platform Settings & Core
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/user/settings", require("./routes/userSettingsRoutes"));
app.use("/api/v1/smart-replies", smartRepliesRoutes);
app.use("/api/v1/bot-automation", botAutomationRoutes);
app.use("/api/v1/public/bot-widget", publicBotWidgetRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/permissions", require("./routes/permissionRoutes"));
app.use("/api/v1/company-connections", companyConnectionRoutes);
const competitorRoutes = require("./routes/competitorRoutes");
app.use("/api/v1/competitors", competitorRoutes);
const competitorSocialRoutes = require("./routes/competitorSocialRoutes");
app.use("/api/v1/competitors/social", competitorSocialRoutes);
const competitorPlatformRoutes = require("./routes/competitorPlatformRoutes");
app.use("/api/v1/competitors/platform", competitorPlatformRoutes);
const competitorAdRoutes = require("./routes/competitorAdRoutes");
app.use("/api/v1/competitors/ads", competitorAdRoutes);
app.use("/api/v1/user/image-gallery", imageGalleryRoutes);
app.use("/api/v1/user/text-gallery", textGalleryRoutes);

// Telegram Settings
const telegramSettingsRoutes = require("./routes/telegramSettingsRoutes");
app.use("/api/v1/telegram-settings", telegramSettingsRoutes);

// Facebook Status
const facebookStatusRoutes = require("./routes/facebookStatusRoutes");
app.use("/api/v1/facebook/status", facebookStatusRoutes);

// AI Image Generation
const aiImageRoutes = require("./routes/aiImageRoutes");
app.use("/api/v1/ai-image", aiImageRoutes);

// AI Video Generation (Google Veo / Automation Engine)
const videoGenerationRoutes = require("./routes/videoGenerationRoutes");
app.use("/api/v1/ai-video", videoGenerationRoutes);

// Frontend error tracking
app.use("/api/v1/errors", errorRoutes);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏪 MARKETPLACE PROTECTED ROUTES (Company Apps & Wallet)
// ═══════════════════════════════════════════════════════════════════════════════
console.log("🏪 [MARKETPLACE] Loading Protected Marketplace routes...");

// Protected Company Apps routes
app.use("/api/v1/my-apps", companyAppsRoutes);
// Protected Wallet & Billing routes
app.use("/api/v1/wallet", walletRoutes);
// Protected Platform Subscription routes
app.use("/api/v1/platform-subscription", platformSubscriptionRoutes);

// Start Background Schedulers & Crons (singleton owner only)
if (shouldOwnSingletonWork()) {
  // Start Billing Cron Service
  try {
    billingCronService.start();
    console.log("✅ [BILLING-CRON] Billing Cron Service started");
  } catch (error) {
  console.error(
    "❌ [BILLING-CRON] Failed to start Billing Cron Service:",
    error,
  );
}

// Start Amazon Affiliate auto-sync scheduler (price/stock sync for enabled companies)
try {
  const amazonAffiliateAutoSyncScheduler = require("./services/amazonAffiliateAutoSyncScheduler");
  amazonAffiliateAutoSyncScheduler.getAmazonAffiliateAutoSyncScheduler().start();
  console.log("✅ [AMAZON-AFFILIATE-SCHEDULER] Auto sync scheduler started");
} catch (error) {
  console.error(
    "❌ [AMAZON-AFFILIATE-SCHEDULER] Failed to start Auto sync scheduler:",
    error,
  );
}

// Start Dreamer Worker (background AI memory consolidation via Python)
(async () => {
  try {
    const DreamerWorker = require("./workers/dreamerWorker");
    const { getSharedPrismaClient } = require("./services/sharedDatabase");
    const dreamerWorker = new DreamerWorker();
    const prisma = getSharedPrismaClient();

    const companies = await prisma.company.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    const companyIds = companies.map((c) => c.id);

    dreamerWorker.start({ companyIds, runOnStart: true });
    console.log(
      `✅ [DREAMER] Memory consolidation scheduled for ${companyIds.length} companies (every 6h)`,
    );
  } catch (error) {
    console.error("❌ [DREAMER] Failed to start Dreamer Worker:", error.message);
  }
})();

// Start Agentic RAG Knowledge Evaluation Scheduler
try {
  const ragKnowledgeEvaluationSchedulerService = require("./services/rag/RagKnowledgeEvaluationSchedulerService");
  ragKnowledgeEvaluationSchedulerService.start();
  console.log("✅ [RAG-EVAL] Knowledge evaluation scheduler scheduled");
} catch (error) {
  console.error("❌ [RAG-EVAL] Failed to start Knowledge Evaluation Scheduler:", error.message);
}

// Start AI Cron Scheduler (Hermes Natural Language Cron Jobs)
(async () => {
  try {
    const aiCronSchedulerService = require("./services/aiCronSchedulerService");
    await aiCronSchedulerService.initialize();
    console.log("✅ [AI-CRON] Hermes Natural Language Cron Scheduler initialized");
  } catch (error) {
    console.error("❌ [AI-CRON] Failed to initialize AI Cron Scheduler:", error.message);
  }
})();

// Start Billing Notification Service (trial reminders, expiry checks)
try {
  const billingNotificationService = require("./services/billingNotificationService");
  billingNotificationService.start();
  console.log("✅ [BILLING-NOTIFICATION] Billing Notification Service started");
} catch (error) {
  console.error(
    "❌ [BILLING-NOTIFICATION] Failed to start Billing Notification Service:",
    error,
  );
}

// Start Attendance Auto Checkout Cron Service
try {
  const attendanceAutoCheckoutCron = require("./cron/attendanceAutoCheckoutCron");
  attendanceAutoCheckoutCron.start();
  console.log("✅ [ATTENDANCE-CRON] Attendance Auto Checkout Service started");
} catch (error) {
  console.error(
    "❌ [ATTENDANCE-CRON] Failed to start Attendance Auto Checkout Service:",
    error,
  );
}

// Start Booking Reminder Cron Service (WhatsApp appointment reminders)
try {
  const bookingReminderCron = require("./cron/bookingReminderCron");
  bookingReminderCron.startBookingReminderCron();
  console.log("✅ [BOOKING-REMINDER-CRON] Booking reminder service started");
} catch (error) {
  console.error(
    "❌ [BOOKING-REMINDER-CRON] Failed to start Booking reminder service:",
    error,
  );
}

try {
  const whatsappAssignmentEngineService = require("./services/whatsappAssignmentEngineService");
  whatsappAssignmentEngineService.startBackgroundMonitor();
  console.log("✅ [WHATSAPP-INBOX] Auto reassignment monitor started");
} catch (error) {
  console.error(
    "❌ [WHATSAPP-INBOX] Failed to start auto reassignment monitor:",
    error,
  );
}

// Start HR lifecycle notifications Cron Service
try {
  const hrLifecycleNotificationCron = require("./cron/hrLifecycleNotificationCron");
  hrLifecycleNotificationCron.start();
  console.log(
    "✅ [HR-LIFECYCLE-CRON] HR lifecycle notification service started",
  );
} catch (error) {
  console.error(
    "❌ [HR-LIFECYCLE-CRON] Failed to start HR lifecycle notification service:",
    error,
  );
}

// Start Facebook Ads budget alert Cron Service
try {
  const facebookAdsBudgetAlertCron = require("./cron/facebookAdsBudgetAlertCron");
  facebookAdsBudgetAlertCron.start();
  console.log("✅ [ADS-BUDGET-ALERT-CRON] Facebook Ads budget alert service started");
} catch (error) {
  console.error(
    "❌ [ADS-BUDGET-ALERT-CRON] Failed to start Facebook Ads budget alert service:",
    error,
  );
}

// Start Task deadline and execution follow-up Cron Service
try {
  const { startTaskDeadlineScheduler } = require("./cron/taskDeadlineCron");
  startTaskDeadlineScheduler();
  console.log("✅ [TASK-DEADLINE-CRON] Task deadline follow-up service started");
} catch (error) {
  console.error(
    "❌ [TASK-DEADLINE-CRON] Failed to start task deadline follow-up service:",
    error,
  );
}

// Start Recurring Tasks Cron Service
try {
  const { startRecurringTaskScheduler } = require("./cron/recurringTaskCron");
  startRecurringTaskScheduler();
  console.log("✅ [RECURRING-TASK-CRON] Recurring task scheduler service started");
} catch (error) {
  console.error(
    "❌ [RECURRING-TASK-CRON] Failed to start recurring task service:",
    error,
  );
}

// Start Dental Lab overdue cases scan Cron Service
try {
  const { startDentalLabOverdueScheduler } = require("./cron/dentalLabOverdueCron");
  startDentalLabOverdueScheduler();
  console.log("✅ [DENTAL-LAB-OVERDUE-CRON] Dental Lab overdue service started");
} catch (error) {
  console.error(
    "❌ [DENTAL-LAB-OVERDUE-CRON] Failed to start dental lab overdue service:",
    error,
  );
}

// Product Embedding Cron — daily backfill via Python ai-service
try {
  const productEmbeddingCron = require("./cron/productEmbeddingCron");
  productEmbeddingCron.start();
  console.log("✅ [EMBEDDING-CRON] Product embedding cron started");
} catch (error) {
  console.error("❌ [EMBEDDING-CRON] Failed to start product embedding cron:", error);
}

// Start Lead Follow-Up scheduler — every 15 minutes
try {
  const { startLeadFollowUpScheduler } = require("./cron/leadFollowUpCron");
  startLeadFollowUpScheduler();
  console.log("✅ [LEAD-FOLLOWUP-CRON] Lead follow-up scheduler started (runs every 15 min)");
} catch (error) {
  console.error("❌ [LEAD-FOLLOWUP-CRON] Failed to start lead follow-up scheduler:", error);
}

// Start QP Express automated background status sync cron — every 30 minutes
try {
  const { startQpExpressSyncCron } = require("./cron/qpExpressSyncCron");
  startQpExpressSyncCron();
  console.log("✅ [QP-EXPRESS-CRON] Automated status sync scheduler started (runs every 30 min)");
} catch (error) {
  console.error("❌ [QP-EXPRESS-CRON] Failed to start QP Express sync scheduler:", error);
}

// Start WhatsApp Journey scheduler — follow-up messages
try {
  const { startWhatsAppJourneyScheduler } = require("./cron/whatsappJourneyCron");
  startWhatsAppJourneyScheduler();
  console.log("✅ [JOURNEY-CRON] WhatsApp Journey scheduler started (runs every 30 min)");
} catch (error) {
  console.error("❌ [JOURNEY-CRON] Failed to start WhatsApp Journey scheduler:", error);
}
// Start Retention Cadence scheduler — الرسائل الدورية (منتج كل 10 أيام / رصيد كل 15 / إحالة كل 30 / مستوى كل 30)
try {
  const { startRetentionCadenceScheduler } = require("./cron/retentionCadenceCron");
  startRetentionCadenceScheduler();
  console.log("✅ [CADENCE-CRON] Retention cadence scheduler started (every 6 hours)");
} catch (error) {
  console.error("❌ [CADENCE-CRON] Failed to start retention cadence scheduler:", error);
}


// Start Birthday notifications scheduler
try {
  const { startBirthdayScheduler } = require("./cron/birthdayCron");
  startBirthdayScheduler();
  console.log("✅ [BIRTHDAY-CRON] Birthday scheduler started (runs daily at 10 AM)");
} catch (error) {
  console.error("❌ [BIRTHDAY-CRON] Failed to start birthday scheduler:", error);
}

// Start Stats aggregation scheduler — raw stats → daily summary
try {
  const { startStatsScheduler } = require("./cron/statsScheduler");
  startStatsScheduler();
  console.log("✅ [STATS-CRON] Statistics scheduler started (runs every 3 hours)");
} catch (error) {
  console.error("❌ [STATS-CRON] Failed to start statistics scheduler:", error);
}

// Start Loyalty points expiry scheduler
try {
  const { startLoyaltyExpiryScheduler } = require("./cron/loyaltyExpiryScheduler");
  startLoyaltyExpiryScheduler();
  console.log("✅ [LOYALTY-CRON] Loyalty expiry scheduler started (runs daily at 2 AM)");
} catch (error) {
  console.error("❌ [LOYALTY-CRON] Failed to start loyalty expiry scheduler:", error);
}

// Start Order confirmation scheduler
try {
  const { startOrderConfirmationScheduler } = require("./cron/orderConfirmationScheduler");
  startOrderConfirmationScheduler();
  console.log("✅ [ORDER-CONFIRMATION-CRON] Order confirmation scheduler started (runs every 5 min)");
} catch (error) {
  console.error("❌ [ORDER-CONFIRMATION-CRON] Failed to start order confirmation scheduler:", error);
}

// Start Overlay Campaign cron (expiry check)
try {
  const { start: startOverlayCron } = require("./cron/overlayCampaignCron");
  startOverlayCron();
} catch (error) {
  console.error("❌ [OVERLAY-CRON] Failed to start:", error);
}

// Start Scheduled order auto-transition cron
try {
  const { startScheduledOrderCron } = require("./cron/scheduledOrderCron");
  startScheduledOrderCron();
  console.log("✅ [SCHEDULED-ORDER-CRON] Scheduled order transition cron started (runs every 12 hours)");
} catch (error) {
  console.error("❌ [SCHEDULED-ORDER-CRON] Failed to start scheduled order cron:", error);
}

// Start Order Status Auto-Change cron (rule-based)
try {
  const { startOrderStatusAutoChangeCron } = require("./cron/orderStatusAutoChangeCron");
  startOrderStatusAutoChangeCron();
  console.log("✅ [ORDER-STATUS-AUTO-CHANGE-CRON] Order status auto-change cron started (runs every 1 min)");
} catch (error) {
  console.error("❌ [ORDER-STATUS-AUTO-CHANGE-CRON] Failed to start order status auto-change cron:", error);
}

// Start Trial expiry cron (company free-trial end)
try {
  const { startTrialExpiryCron } = require("./cron/trialExpiryCron");
  startTrialExpiryCron();
  console.log("✅ [TRIAL-EXPIRY-CRON] Trial expiry cron started (runs every 30 min)");
} catch (error) {
  console.error("❌ [TRIAL-EXPIRY-CRON] Failed to start trial expiry cron:", error);
}

// Start QP Express automated background status sync cron
try {
  const { startQpExpressSyncCron } = require("./cron/qpExpressSyncCron");
  startQpExpressSyncCron();
  console.log("✅ [QP-EXPRESS-CRON] QP Express background sync cron started (runs every 30 min)");
} catch (error) {
  console.error("❌ [QP-EXPRESS-CRON] Failed to start QP Express sync cron:", error);
}

// Start Auto-Discount voucher expiry conversion cron
try {
  const { startAutoDiscountVoucherCron } = require("./cron/autoDiscountVoucherCron");
  startAutoDiscountVoucherCron();
} catch (error) {
  console.error("❌ [AUTO-DISCOUNT-CRON] Failed to start voucher conversion cron:", error);
}

// Start customer birthday automation cron
try {
  const { startCustomerBirthdayScheduler } = require("./cron/customerBirthdayCron");
  startCustomerBirthdayScheduler();
} catch (error) {
  console.error("❌ [CUSTOMER-BIRTHDAY-CRON] Failed to start customer birthday cron:", error);
}

// Start scheduled occasion campaign cron
try {
  const { startOccasionCampaignScheduler } = require("./cron/occasionCampaignCron");
  startOccasionCampaignScheduler();
} catch (error) {
  console.error("❌ [OCCASION-CRON] Failed to start occasion campaign cron:", error);
}

// 🚨 PRODUCTION-FIX (notifications-fix-plan §1.1): فعّل طابور إشعارات واتساب
// (BullMQ إن توفر Redis، وإلا fallback polling كل 60 ثانية)
try {
  const { startNotificationQueueWorker } = require("./services/whatsapp/notificationQueueWorker");
  startNotificationQueueWorker();
  console.log("✅ [NOTIF-QUEUE] WhatsApp notification queue worker registered");
} catch (error) {
  console.error("❌ [NOTIF-QUEUE] Failed to start notification queue worker:", error);
}
} else {
  console.log(
    `ℹ️ [SERVER] Background cron schedulers skipped for worker instance ${getProcessInstanceId()} (dedicated to HTTP requests)`,
  );
}


// AI Provider Health Check — delegated to Python ai-service
try {
  const { healthCheck } = require("./services/aiSdkClient");
  healthCheck().then(
    (ok) => {
      if (ok) {
        console.log("✅ [PROVIDER-HEALTH] Python ai-service health check passed");
      } else {
        console.warn("⚠️ [PROVIDER-HEALTH] Python ai-service health check returned non-OK");
      }
    },
    (err) => console.error("❌ [PROVIDER-HEALTH] Python ai-service health check failed:", err?.message)
  );
} catch (error) {
  console.error(
    "❌ [PROVIDER-HEALTH] Failed to start provider health check:",
    error,
  );
}

app.get(
  "/sitemap.xml",
  extractSubdomainMiddleware,
  storefrontSitemapController.handleStorefrontSitemap,
);

app.get(
  "/robots.txt",
  extractSubdomainMiddleware,
  storefrontRobotsController.handleStorefrontRobots,
);

app.get(
  "*",
  extractSubdomainMiddleware,
  handlePlatformSeo,
  storefrontHtmlController.handleStorefrontShell,
);

// Homepage route
app.get("/", (req, res) => {
  res.json({
    message: "Chat Bot Backend API",
    version: "1.0.0",
    status: "running",
  });
});

// Roles & Permissions Listing
app.get("/api/v1/users/roles", (req, res) => {
  res.json({ success: true, message: "Roles fetched" });
});

app.get("/api/v1/permissions", (req, res) => {
  res.json({
    success: true,
    data: {
      "إدارة المستخدمين": {
        category: "المستخدمون",
        description: "إضافة وتعديل وحذف مستخدمي الشركة",
      },
      "إدارة الأدوار": {
        category: "المستخدمون",
        description: "إنشاء وتعديل الأدوار والصلاحيات",
      },
      "إدارة المنتجات": {
        category: "المنتجات",
        description: "إضافة وتعديل وحذف المنتجات",
      },
      "مشاهدة المنتجات": {
        category: "المنتجات",
        description: "عرض قائمة المنتجات وتفاصيلها",
      },
      "إدارة العملاء": {
        category: "العملاء",
        description: "إدارة بيانات العملاء وسجلاتهم",
      },
      "مشاهدة العملاء": {
        category: "العملاء",
        description: "عرض العملاء دون صلاحيات تعديل",
      },
      "إدارة الطلبات": {
        category: "الطلبات",
        description: "إدارة دورة حياة الطلبات بالكامل",
      },
      "مشاهدة الطلبات": {
        category: "الطلبات",
        description: "عرض الطلبات وحالتها",
      },
      "مشاهدة التقارير": {
        category: "التقارير",
        description: "الوصول إلى التقارير ولوحات المتابعة",
      },
      "إدارة التقارير": {
        category: "التقارير",
        description: "تخصيص التقارير وتصديرها",
      },
      "إدارة الإعدادات": {
        category: "الإعدادات",
        description: "تعديل إعدادات الشركة والمنصة",
      },
      "إدارة التكاملات": {
        category: "الإعدادات",
        description: "ربط وإدارة التكاملات الخارجية",
      },
      "إدارة المحادثات": {
        category: "المحادثات",
        description: "إدارة المحادثات والردود والتعيينات",
      },
      "مشاهدة المحادثات": {
        category: "المحادثات",
        description: "عرض المحادثات فقط",
      },
      "إدارة الخطة والاشتراك": {
        category: "الاشتراك",
        description: "إدارة الخطة والفوترة والاشتراك",
      },
    },
  });
});

// TikTok integrations (publish / shop / auth / display / events)
app.use("/api/v1/tiktok/publish", require("./routes/tiktokPublishRoutes"));
app.use("/api/v1/tiktok/shop", require("./routes/tiktokShopRoutes"));
app.use("/api/v1/tiktok/auth", require("./routes/tiktokAuthRoutes"));
app.use("/api/v1/tiktok/display", require("./routes/tiktokDisplayRoutes"));
app.use("/api/v1/tiktok/events", require("./routes/tiktokEventsRoutes"));
app.use("/api/v1/tiktok/messaging", require("./routes/tiktokMessagingRoutes"));

// Amazon Affiliate (Amazon Associates product import / buy-on-Amazon)
app.use("/api/v1/amazon-affiliate", require("./routes/amazonAffiliateRoutes"));

// 404 Handler - Must return JSON, not HTML
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `المسار ${req.path} غير موجود`,
    path: req.path,
  });
});

// Global Error Handler - Must return JSON, not HTML
app.use((err, req, res, next) => {
  console.error("❌ [ERROR]", err);
  try {
    telegramAlertService.sendApiError(req, err);
  } catch (e) {}

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
    message: "حدث خطأ في الخادم",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// startServer Implementation
async function startServer() {
  console.log("🚀 [SERVER] Initializing stable backend...");
  const PORT = process.env.PORT || 3007;
  const shouldStartInlineWebhookWorker =
    process.env.START_INLINE_WEBHOOK_WORKER === "true" ||
    (process.env.START_INLINE_WEBHOOK_WORKER !== "false" &&
      process.env.NODE_ENV !== "production");

  try {
    await initializeSharedDatabase();
    console.log("✅ [SERVER] Shared database connection established");

    try {
      if (shouldStartInlineWebhookWorker) {
        startWebhookWorker();
        console.log("✅ [SERVER] BullMQ Webhook Worker started");
      } else {
        console.log("Inline webhook worker disabled for this process.");
      }
    } catch (workerError) {
      console.error(
        "❌ [SERVER] Failed to start background workers:",
        workerError.message,
      );
    }

    if (shouldOwnSingletonWork()) {
      // 🚀 Start sync queue processor (polls every 5s)
      const syncQueueService = require('./services/syncQueueService');
      setInterval(() => syncQueueService.processBatch(5), 5000);
      console.log("✅ [SERVER] Sync queue processor started (5s interval)");

      await telegramBotService.initialize();
      console.log("✅ [SERVER] Telegram Bot initialized");

      await WhatsAppManager.restoreAllSessions();
      console.log("✅ [SERVER] WhatsApp Sessions Restored");

      const { startTelegramScheduler } = require("./cron/telegramScheduler");
      startTelegramScheduler();
    } else {
      console.log(
        `Singleton work (WhatsApp / Telegram / Sync Queue) skipped for process instance ${getProcessInstanceId()}`,
      );
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀🚀🚀 STABLE SERVER STARTED ON PORT ${PORT} 🚀🚀🚀`);
      if (typeof process.send === "function") {
        process.send("ready");
      }
    });
  } catch (error) {
    console.error("❌ [SERVER] FATAL STARTUP ERROR:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  if (isWhatsAppBaileysConnectionClosed(reason) || isGramJsResolveError(reason)) {
    return;
  }

  const reasonStr = getReasonMessage(reason);
  const mem = process.memoryUsage();
  console.error(
    "🔥 [FATAL] Unhandled Rejection at:",
    promise,
    "reason:",
    reasonStr,
    `Memory: RSS=${Math.round(mem.rss/1024/1024)}MB, Heap=${Math.round(mem.heapUsed/1024/1024)}/${Math.round(mem.heapTotal/1024/1024)}MB`,
  );
});

// Memory pressure monitor - warn when memory is critically low
function startMemoryMonitor() {
  const MEMORY_WARN_MB = 500;
  const MEMORY_CRITICAL_MB = 200;
  const CHECK_INTERVAL = 30000;

  setInterval(() => {
    const snapshot = buildMemoryPressureSnapshot(process.memoryUsage(), v8.getHeapStatistics(), {
      warnHeapRemainingMB: MEMORY_WARN_MB,
      criticalHeapRemainingMB: MEMORY_CRITICAL_MB,
    });

    if (snapshot.highUsage) {
      console.warn(
        `⚠️ [MEMORY] High memory usage - RSS: ${snapshot.rssMB}MB, Heap: ${snapshot.heapUsedMB}/${snapshot.heapLimitMB}MB limit`
      );
    }

    if (snapshot.lowHeap) {
      console.warn(
        `⚠️ [MEMORY] Low heap headroom: ${snapshot.heapRemainingMB}MB remaining (used ${snapshot.heapUsedMB}/${snapshot.heapLimitMB}MB, committed ${snapshot.heapTotalMB}MB)`
      );
      if (snapshot.criticalHeap) {
        console.error(`🚨 [MEMORY] CRITICAL: Only ${snapshot.heapRemainingMB}MB heap headroom remaining, forcing GC`);
        try { global.gc?.(); } catch {}
      }
    }
  }, CHECK_INTERVAL);
}

// Graceful shutdown — drain in-flight HTTP connections and clean up resources before exit
let isShuttingDown = false;
async function shutdownGracefully(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 [SERVER] Received ${signal}, starting graceful HTTP draining & shutdown...`);

  // Hard timeout safeguard (matches PM2 kill_timeout with margin)
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️ [SERVER] Forced shutdown: in-flight drain exceeded 18s timeout');
    process.exit(1);
  }, 18000);
  if (typeof forceExitTimeout.unref === 'function') {
    forceExitTimeout.unref();
  }

  // 1. Stop receiving new HTTP requests and wait for in-flight requests (e.g. AI turns) to drain
  const closeHttpServer = () => new Promise((resolve) => {
    if (server && typeof server.close === 'function') {
      server.close((err) => {
        if (err) {
          console.warn('⚠️ [SERVER] Error closing HTTP server:', err.message);
        } else {
          console.log('✅ [SERVER] HTTP server closed, all in-flight requests drained cleanly');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });

  try {
    await closeHttpServer();
  } catch (httpErr) {
    console.warn('⚠️ [SERVER] HTTP drain warning:', httpErr.message);
  }

  // 2. Disconnect WhatsApp sessions cleanly
  try {
    const WhatsAppManager = require("./services/whatsapp/WhatsAppManager");
    const sessionCount = WhatsAppManager.getAllSessions()?.length || 0;
    if (sessionCount > 0) {
      console.log(`📱 [SERVER] Disconnecting ${sessionCount} WhatsApp session(s)...`);
      if (typeof WhatsAppManager.flushAllAuthStates === 'function') {
        await WhatsAppManager.flushAllAuthStates();
      }
      await WhatsAppManager.disconnectAllSessions();
      console.log('✅ [SERVER] All WhatsApp sessions disconnected');
    }
  } catch (err) {
    console.error('⚠️ [SERVER] Error during WhatsApp shutdown:', err.message);
  }

  clearTimeout(forceExitTimeout);
  console.log('✅ [SERVER] Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

// 🚨 PRODUCTION-FIX (H2): flush auth state عند exit طبيعي (بدون SIGTERM) حتى
// لا نفقد آخر creds/pre-keys (كانت تسبب "Bad MAC" بعد إعادة التشغيل).
let authFlushOnExitDone = false;
process.on('beforeExit', async () => {
  if (authFlushOnExitDone) return;
  authFlushOnExitDone = true;
  try {
    if (typeof WhatsAppManager?.flushAllAuthStates === 'function') {
      await WhatsAppManager.flushAllAuthStates();
    }
  } catch (e) {
    console.error('⚠️ [SERVER] Error flushing auth states on beforeExit:', e.message);
  }
});

if (require.main === module) {
  startMemoryMonitor();
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
