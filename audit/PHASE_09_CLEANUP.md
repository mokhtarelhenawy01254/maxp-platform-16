# PHASE 9 — CODEBASE CLEANUP AUDIT (dead code, duplicates, legacy)

## 9.1 Dead route files (CONFIRMED zero refs)
databaseMonitorRoutes.js, growthMarketingRoutes.js (+orphaned controller), pos.js, publicCompanyLinksRoutes.js, socketTestRoutes.js, storeInfoRoutes.js, wishlistRoutes.js. HC: publicProductsRoutes.js (test-only; superseded by publicProductsSimpleRoutes).

## 9.2 Dead services (CONFIRMED zero refs, top-level services/)
wooCommerceImportServiceEnhanced.js (15.8KB), policyPdfService.js (12.6KB), toneAdaptationService.js, responseDiversityService.js, userAuditService.js, autoNameUpdateService.js, dynamicPromptBuilder.js, queueService.js, studioCloudStorageService.js, companyDashboardService.js + optimizedSharedDatabase.js (known) + stray check_replies.py/JSON in services/. Total ~11 dead services.

## 9.3 Unused Prisma models
Schema "UNUSED" comments are UNRELIABLE — stale tags on live models (BroadcastCampaign ×14 uses, FacebookAdAccount ×28, Warehouse ×24…). Truly zero-accessor CONFIRMED: InvoiceItem (legacy pair w/ Invoice), AssetAssignment/Category/Maintenance/CustodyHistory/Request/Audit/Attachment, StockAlert, PurchaseInvoice(+Item), PurchaseOrderItem, BroadcastSettings, SkippedFacebookPage, WalletNumber, EmployeeNotificationPreference, DevMemberBadge, PromptTemplate, FewShotExample/Settings, PromptLibrary, DevTaskAttachment, TaskChecklist, TaskDependency, TaskTemplate. HC: ConversationMemory (1 hit), PurchaseOrder, Supplier, Asset parent.

## 9.4 Duplicate implementations → canonical

| Functionality | Implementations | Canonical | Safe-deletion plan |
|---|---|---|---|
| DB client | sharedDatabase(1212 refs) / postgresDatabase(3) / optimizedSharedDatabase(0) | sharedDatabase | Remove eager postgresDatabase init at server.js:436 after migrating its 2 call sites; delete optimizedSharedDatabase |
| Order creation/listing | orderService(40)/enhancedOrderService(5)/simpleOrderService(2) | orderService | Retire `/orders-enhanced` + `/orders-v2/new` aliases; fold create-simple into orderService; delete file-write path |
| Dashboards | dashboardService/moderatorDashboardService/companyDashboardController(direct prisma) | keep per-route but extract shared aggregation SQL | Delete dead companyDashboardService |
| Tasks | Task* vs DevTask* stacks (schema-level, Phase 2) | product decision needed | NOT auto-deletable |
| Frontend socket hook | useSocket.tsx (dead) vs useSocket.ts | useSocket.ts | delete .tsx |
| Woo import hook | useWooCommerceImport vs Enhanced (dead) | first | delete Enhanced |
| api.ts shim (92 imports) | re-export of apiClient | apiClient | codemod imports then delete |

## 9.5 Debris / hygiene
- apps/backend/scripts: 787 files (2.5MB); scratch/: 50 files; repo scripts/: 161.
- Repo root: 213 loose files — 81 `.tmp-*` (~21MB), 36 `scratch_*.js`, screenshots/snapshots/network-response artifacts.
- routes/orders.js.main_backup inside deploy surface.
- pages/whatsapp/WhatsAppChat.tsx.bak.

## 9.6 Unused env vars (.env.example keys with zero process.env refs)
33 keys incl. STRIPE_* ×3, PAYPAL_* ×2, TWILIO_* ×3, SENTRY_DSN, SESSION_SECRET, META_WA_ACCESS_TOKEN/PHONE_NUMBER_ID/WABA_ID (Baileys used instead), GOOGLE_GEMINI_API_KEY, FACEBOOK_APP_ID, JWT_EXPIRES_IN×2, RATE_LIMIT_*, LOG_FILE. Also TELEGRAM_ALERT_* block duplicated twice in .env.example (:100-117).

## 9.7 Unused dependencies (zero imports CONFIRMED)
@huggingface/inference, @modelcontextprotocol/sdk, array-flatten, ffmpeg-static, html-pdf-node, luxon, mongoose, qrcode-terminal, web-push. HC runtime-dead: @google/generative-ai (scripts only), pino+winston (logger unused!), facebook-nodejs-business-sdk, moment-timezone, validator, express-validator/joi (1-file each).

## 9.8 Legacy code still referenced (do NOT delete blindly)
- legacy_mysql/ — fully isolated, no runtime imports (MySQL migration complete). Candidate for archival.
- verify_schema/*.prisma + generated/verify_client — verification tooling; inert.
- schema.prisma.legacy snapshot — inert (non-.prisma extension).
- models.prisma empty file; prisma/postgres/postgres.prisma duplicate Product model — footgun, remove or rename.
