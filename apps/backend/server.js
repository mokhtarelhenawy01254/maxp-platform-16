// Set timezone to Egypt/Cairo before anything else
process.env.TZ = "Africa/Cairo";

// Global error handlers — log but do NOT crash on transient rejections
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.message, err.stack);
  setTimeout(() => process.exit(1), 3000);
});

// Load environment variables
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const v8 = require("v8");
const helmet = require("helmet");
const { buildMemoryPressureSnapshot } = require("./services/memoryPressureMonitorService");

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
  "/landing-pages/",
  "/placeholders/",
  "/previews/",
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
    console.warn("⚠️ [SERVER] Recoverable WhatsApp socket rejection ignored:", msg);
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
const tenantContext = require("./services/tenantContext");

// Import all routes (alphabetic order for sanity)
// Routes Block 1
const activityLogRoutes = require("./routes/activityLogRoutes");
const adminAnalyticsRoutes = require("./routes/adminAnalyticsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const adminCompanyRoutes = require("./routes/adminCompanyRoutes");
const adminWhatsAppRoutes = require("./routes/adminWhatsAppRoutes");
const affiliateRoutes = require("./routes/affiliateRoutes");
const affiliateSettingsRoutes = require("./routes/affiliateSettingsRoutes");
const platformRevenueRoutes = require("./routes/platformRevenueRoutes");
const appointmentsRoutes = require("./routes/appointmentsRoutes");

const agentInboxRoutes = require("./routes/agentInboxRoutes");
const authRoutes = require("./routes/authRoutes");
const branchRoutes = require("./routes/branchRoutes");
const broadcastRoutes = require("./routes/broadcastRoutes");
const checkoutFormSettingsRoutes = require("./routes/checkoutFormSettingsRoutes");
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
const easyOrdersRoutes = require("./routes/easyOrdersRoutes");
const emailRoutes = require("./routes/emailRoutes");
const faqRoutes = require("./routes/faq");
const facebookAdsRoutes = require("./routes/facebookAdsRoutes");
const facebookIntegrationRoutes = require("./routes/facebookIntegrationRoutes");
const facebookOAuthRoutes = require("./routes/facebookOAuthRoutes");
const footerSettingsRoutes = require("./routes/footerSettingsRoutes");
const geolocationRoutes = require("./routes/geolocation");
const healthRoute = require("./routes/healthRoute");
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
const bulkOrdersRoutes = require("./routes/bulkOrders");
const pageEngagementRoutes = require("./routes/pageEngagementRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const kashierRoutes = require("./routes/kashierRoutes");
const promotionSettingsRoutes = require("./routes/promotionSettingsRoutes");
const policyCrudRoutes = require("./routes/policy");
const policyRoutes = require("./routes/policyRoutes");
const productReviewRoutes = require("./routes/productReviewRoutes");
const publicProductReviewRoutes = require("./routes/publicProductReviewRoutes");
const productLandingPagesRoutes = require("./routes/productLandingPagesRoutes");
const productRoutes = require("./routes/productRoutes");
const projectRoutes = require("./routes/projectRoutes");
const proxyRoutes = require("./routes/proxyRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const customerLoyaltyRoutes = require("./routes/customerLoyaltyRoutes");
const returnRoutes = require("./routes/returnRoutes");
const savedRepliesRoutes = require("./routes/savedRepliesRoutes");
const schedulerRoutes = require("./routes/schedulerRoutes");
const securityRoutes = require("./routes/securityRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const smartRepliesRoutes = require("./routes/smartRepliesRoutes");
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
const shippingCompaniesRoutes = require("./routes/shippingCompaniesRoutes");
const turboWebhookRoutes = require("./routes/turboWebhook");
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

// Marketplace System Routes
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const companyAppsRoutes = require("./routes/companyAppsRoutes");
const walletRoutes = require("./routes/walletRoutes");
const adminWalletRoutes = require("./routes/adminWalletRoutes");
const platformSubscriptionRoutes = require("./routes/platformSubscriptionRoutes");
const superAdminPlatformRoutes = require("./routes/superAdminPlatformRoutes");
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

// Billing Cron Service
const billingCronService = require("./services/billingCronService");
const whatsappNotificationRoutes = require("./routes/whatsappNotificationRoutes");
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
const {
  securityHeaders,
  sanitizeRequest,
  securityMonitoring,
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
app.use(helmet());
app.use(express.json({ limit: "15mb", verify: captureRawJsonBody }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());
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
app.use(
  "/api/v1/public/products",
  require("./routes/publicProductsSimpleRoutes"),
);
app.use(
  "/api/v1/public/customers",
  require("./routes/publicCustomerRoutes"),
);
app.use("/api/v1/public/orders", require("./routes/publicOrdersRoutes"));
app.use(
  "/api/v1/public/storefront",
  require("./routes/publicStorefrontRoutes"),
);
app.use("/api/v1/public/platform", publicPlatformRoutes);
app.use("/api/v1/public/affiliates", publicAffiliateRoutes);
app.use("/api/v1/public/merchants", publicMerchantRoutes);
app.use("/api/v1/public/lp-pages", require("./routes/lpAdminRoutes").publicRouter);
app.use("/api/v1/public", publicCouponsRoutes);
app.use("/api/v1/public", publicProductReviewRoutes);
app.use("/api/v1/public/checkout-form-settings", checkoutFormSettingsRoutes);
app.use("/api/v1/public/footer-settings", footerSettingsRoutes);
app.use("/api/v1/public/promotion-settings", promotionSettingsRoutes);
app.use("/api/v1/product-landings", productLandingPagesRoutes);
  console.log("✅ [DEBUG] Public Products, Orders & Storefront Routes Loaded");

  // Public Kashier payment & checkout routes (no dashboard auth required)
  app.use("/api/v1/payment", kashierRoutes);

  // Public webhook for platform subscription payments (Kashier → MaxP platform billing)
  const { handleWebhook: handlePlatformSubscriptionWebhook } = require("./controller/platformSubscriptionController");
  app.post("/api/v1/public/platform-subscription/webhook", handlePlatformSubscriptionWebhook);

  // Public integration surfaces secured by their own API keys/signatures
  app.use("/api/v1/external/tasks", taskExternalRoutes);
app.use("/api/v1/external/dev-tasks", devTaskExternalRoutes);

// Static User Content Surface
app.use("/uploads", async (req, res, next) => {
  try {
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

    const optimizedVariant = await resolveOptimizedUploadVariant({
      sourceFilePath: resolvedUploadFile,
      query: req.query,
    });

    const fileToSend = optimizedVariant?.filePath || resolvedUploadFile;
    const cacheControl =
      optimizedVariant?.cacheControl || "public, max-age=2592000, immutable";

    res.setHeader("Cache-Control", cacheControl);
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
app.use("/api/v1/company", companyDashboardRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/admin/analytics", adminAnalyticsRoutes);
app.use("/api/v1/storefront-settings", storefrontSettingsRoutes);
app.use("/api/v1/checkout-form-settings", checkoutFormSettingsRoutes);
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
app.use("/api/v1/order-invoices", orderInvoiceRoutes);
app.use("/api/v1/order-invoice-settings", orderInvoiceSettingsRoutes);
app.use("/api/v1/order-settings", orderSettingsRoutes);
app.use("/api/v1/scheduled-orders", scheduledOrderRoutes);
app.use("/api/v1/bulk-orders", bulkOrdersRoutes);
app.use("/api/v1/returns", returnRoutes);
app.use("/api/v1/policy", policyRoutes);
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
app.use("/api/v1/categories", require("./routes/categoryRoutes"));
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/procurement", procurementRoutes);
app.use("/api/v1/merchants", merchantRoutes);
app.use("/api/v1/merchant-portal", merchantPortalRoutes);
app.use("/api/v1/warehouses", warehouseRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/shipping-zones", shippingZoneRoutes);
app.use("/api/v1/store-settings", require("./routes/storeSettingsRoutes"));
app.use("/api/v1/store-pages", storePagesRoutes);
app.use("/api/v1/promotion-settings", promotionSettingsRoutes);
app.use("/api/v1/delivery-options", deliveryOptionRoutes);
app.use("/api/v1/coupons", couponsRoutes);
app.use("/api/v1/reviews", productReviewRoutes);
app.use("/api/v1/payments", paymentRoutes);

// External Integrations
app.use("/api/v1/facebook/ads", facebookAdsRoutes);
app.use("/api/v1/facebook-ads", facebookAdsRoutes);
app.use("/api/v1/facebook/integration", facebookIntegrationRoutes);
app.use("/api/v1/integrations", facebookIntegrationRoutes);
app.use("/api/v1/facebook/oauth", facebookOAuthRoutes);
app.use("/api/v1/facebook-oauth", facebookOAuthRoutes);
app.use("/api/v1/admin/facebook-oauth", facebookOAuthRoutes);
app.use("/api/v1/google-sheets", googleSheetsRoutes);
app.use("/api/v1/easy-orders", easyOrdersRoutes);
app.use("/api/v1/proxy-image", proxyRoutes);
app.use("/api/proxy-image", proxyRoutes);
app.use("/api/v1/import-jobs", importJobRoutes);
app.use("/api/v1/woocommerce", wooCommerceRoutes);
app.use("/api/v1/turbo", turboRoutes);

// Professional Tools
app.use("/api/v1/appointments", appointmentsRoutes);
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
app.use("/api/v1/admin/lp-pages", require("./routes/lpAdminRoutes").adminRouter);
app.use("/api/v1/proxy", proxyRoutes);

// Platform & Super-Admin
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
// ponytail: legacy plan routes removed — app/bundle pricing replaces them
app.use("/api/v1/admin/schedulers", schedulerRoutes);
// Backward-compatible alias for legacy admin tools that still call /api/v1/admin/*
app.use("/api/v1/admin", systemManagementRoutes);
app.use("/api/v1/system", systemManagementRoutes);

// HR & Operations
const hrRoutes = require("./routes/hrRoutes");
app.use("/api/v1/hr", hrRoutes);
app.use("/api/v1/hr/rewards", rewardRoutes);
app.use("/api/v1/hr/customer-loyalty", customerLoyaltyRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/owner", ownerRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/activity", activityLogRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/reminders", require("./routes/reminderRoutes"));
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/notifications", notificationSettingsRoutes);
app.use("/api/v1/shipping-companies", shippingCompaniesRoutes);

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
app.use("/api/v1/smart-replies", smartRepliesRoutes);
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

// Product Embedding Cron — daily backfill via Python ai-service
try {
  const productEmbeddingCron = require("./cron/productEmbeddingCron");
  productEmbeddingCron.start();
  console.log("✅ [EMBEDDING-CRON] Product embedding cron started");
} catch (error) {
  console.error("❌ [EMBEDDING-CRON] Failed to start product embedding cron:", error);
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
  "*",
  extractSubdomainMiddleware,
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

    await telegramBotService.initialize();
    console.log("✅ [SERVER] Telegram Bot initialized");

    await WhatsAppManager.restoreAllSessions();
    console.log("✅ [SERVER] WhatsApp Sessions Restored");

    const { startTelegramScheduler } = require("./cron/telegramScheduler");
    startTelegramScheduler();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀🚀🚀 STABLE SERVER STARTED ON PORT ${PORT} 🚀🚀🚀`);
    });
  } catch (error) {
    console.error("❌ [SERVER] FATAL STARTUP ERROR:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  if (isWhatsAppBaileysConnectionClosed(reason)) {
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

if (require.main === module) {
  startMemoryMonitor();
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
