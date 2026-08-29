# PHASE 1 — SYSTEM ARCHITECTURE MAP (as-built, evidence-based)

Classification legend: every claim below is CONFIRMED unless marked HC (high confidence) / POSSIBLE.

## 1. Topology

```
Browser / Storefront visitors
        │
        ▼
Nginx ──► apps/frontend (React 18 + Vite SPA, static)
        │   - Admin app: App.tsx (7,516 lines, all routes inline)
        │   - Storefront: separate BrowserRouter in src/storefront/StorefrontBootstrap.tsx
        │
        ▼  /api/v1/*
apps/backend/server.js  (Express 4 monolith, port 3007, PM2: maxp-backend)
        │
        ├── globalSecurity middleware (auth + company isolation)      [CONFIRMED]
        ├── routes/ — 265 route files, ~267 app.use() mounts          [CONFIRMED]
        ├── controller/ → services/ (168 top files + 10 subdirs)
        │       │
        │       ├── Prisma (PostgreSQL, multi-schema, 60 schema files,
        │       │            517 models, generated to prisma/generated/postgresql_v2)
        │       │       pool: connection_limit=80, pool_timeout=30     [CONFIRMED]
        │       ├── BullMQ queues on Redis ('webhook-processing', 'image-generation')
        │       └── raw SQL: 93 $queryRaw/$executeRaw call sites      [CONFIRMED]
        │
        ├── PM2 #2: workers/webhookWorker.js (BullMQ consumer)
        ├── 19 node-cron jobs in cron/ + billingCronService + RAG scheduler
        ├── Socket.IO (Redis adapter)
        │
        ▼ HTTP service-token auth (AI_SERVICE_URL=http://localhost:8000)
apps/ai-service (FastAPI Python sidecar, port 8000, PM2 external)
        - HYBRID DB access: direct SQLAlchemy reads of the SAME Postgres `maxp` DB
          for AI/RAG tools; business writes via Node backend REST (/api/v1/ai-bridge)
                                                        [CONFIRMED]
External APIs:
- Facebook/Messenger webhook  → /api/v1/webhook(s) → BullMQ → webhookWorker
- WhatsApp Meta Cloud webhook → /api/v1/whatsapp-meta; Baileys sessions (WhatsAppManager.js, 242KB)
- Shipping: Turbo (/api/v1/turbo-webhook), Bosta (/api/v1/bosta-webhook), Easy Orders/Warehouse
- Payments: Kashier, COD deposits, generic paymentRoutes/walletPaymentRoutes (NO Stripe/Paymob/Fawry) [CONFIRMED]
- Storage: LOCAL DISK only (multer → uploads/products, uploads/conversations); no S3 [CONFIRMED]
- Telegram bot + userbot, TikTok webhooks, WooCommerce import
```

## 2. Component responsibilities

| Component | Responsibility |
|---|---|
| server.js (1,578 lines) | Entry point, mounts ALL routes, starts crons, inline worker (dev), sync poller (5s), Telegram, WhatsApp restore |
| middleware/globalSecurity.js | PUBLIC_ROUTES allowlist (~170 lines of prefixes), JWT verify (8h access / 7d refresh), service-token path, SUPER_ADMIN X-Company-Id override w/ audit, company isolation |
| services/sharedDatabase.js | Prisma singleton, retry/circuit-breaker, pool tuning |
| tenantContext.js | AsyncLocalStorage companyId propagation |
| routes/* + controller/* | HTTP surface; some controllers contain heavy logic |
| services/* | Business logic incl. very large god-files (WhatsAppManager 242KB, facebookAdsService 134KB, enhancedOrderService 101KB) |
| ai-service | Model generation, personas from agents/*/PERSONA.md, RAG (CorrectiveRAGEngine 44KB in backend), memory consolidation (dreamerWorker) |

## 3. Auth & permission flow (CONFIRMED)

1. `POST /api/v1/auth/login` (controller/authController.js:501) → bcrypt → JWT `{userId,email,role,companyId}` exp 8h; refresh JWT exp 7d (httpOnly cookie).
2. `globalAuthentication` (globalSecurity.js:763–949): allowlist bypass → service token → JWT. Base companyId ALWAYS from JWT; header override only SUPER_ADMIN.
3. `globalCompanyIsolation` (L954–1070): applies only to COMPANY_ISOLATED_ROUTES list (explicit list at L542–558) — NOT all routes.
4. Per-route second layer: utils/verifyToken.js authenticateToken used inside many routers (duplicate auth layer).
5. Roles: userCompany.roleRef.permissions loaded per request (verifyToken.js:12–140).

**Findings surfaced already (to be re-examined in Phase 4):**
- F1-A: `X-Company-Id` accepted as fallback in `globalCompanyIsolation` (globalSecurity.js:964, 991–997) despite JWT hardening comment — potential isolation gap for routes not in COMPANY_ISOLATED_ROUTES.
- F1-B: IP blocking middleware effectively disabled ("passes all requests without blocking", L274–296) — logging only.
- F1-C: Two parallel auth layers (globalSecurity + per-route verifyToken) = duplicated/conflicting logic.

## 4. Route mounting anomalies (CONFIRMED, ≥18 duplicate mount groups)

| Router | Prefixes | server.js lines |
|---|---|---|
| walletRoutes | `/api/v1/wallet` mounted TWICE | 959 AND 1025 |
| webhookRoutes | `/api/v1/webhook` + `/api/v1/webhooks` | 625–626 |
| orderRoutes2 | `/api/v1/orders-v2` + `/api/v1/orders-new` | 759–760 |
| companyDashboardRoutes | `/company-dashboard` + `/company` | 747–748 |
| orderWorkflowRoutes | `/order-workflow` + `/orders-workflow` | 763–764 |
| whatsappAutomationRoutes | `/whatsapp-automation` + `/whatsapp/automation` | 787–788 |
| broadcastRoutes | `/broadcast` + `/broadcasts` | 806–807 |
| facebookAdsRoutes / IntegrationRoutes / OAuthRoutes | multiple aliases each | 830–837 |
| proxyRoutes | 3 aliases | 841–842, 923 |
| paymentRoutes | `/payments` + `/admin/payments` | 827, 944 |
| systemManagementRoutes | `/admin` + `/system` | 951–952 |
| notificationRoutes vs notificationSettingsRoutes | BOTH on `/api/v1/notifications` | 966–967 |
| kashierRoutes + codDepositRoutes | both conditionally on `/payment` | 682, 685 |

## 5. Background work inventory

- PM2: `maxp-backend`, `maxp-webhook-worker`. Inline worker disabled in prod via START_INLINE_WEBHOOK_WORKER (server.js:1427–1430). Cron jobs run INSIDE maxp-backend process.
- Queues: 'webhook-processing' (attempts:5, exp backoff), 'image-generation'. Legacy `bull` still used by competitorMonitorWorker.js:1.
- syncQueueService polled every 5s from server process (setInterval polling, not queue-driven).
- 19 cron files + 2 service schedulers all run in the API process — CPU contention with request handling.

## 6. Database shape (details in Phase 2)

- PostgreSQL, 60 schema files, **517 models**, 179 enums (168 centralized), ~1,244 explicit @@index.
- Soft delete essentially ABSENT (only Product.deletedAt).
- prisma/migrations: 82 folders BUT package.json prestart runs `prisma db push --accept-data-loss` → migration drift likely. [HC]

## 7. Frontend architecture

- Entry main.tsx dual-bootstrap (storefront vs admin). Router = single 7,516-line App.tsx with hundreds of lazy imports.
- Single canonical axios client apiClient.ts (712 lines, timeout 30s, queued refresh, transient retries) + compat shim api.ts + apiService.ts.
- react-query defaults: retry 3 / staleTime 5min (config/queryClient.ts). DUPLICATE second QueryClient in utils/queryClient.ts with different defaults (dead/duplicate config) — verify usage in Phase 8.
- Auth: useAuthSimple.tsx (single hook, 780 lines). Access token sessionStorage; refresh httpOnly cookie.
- Zustand: storefront-only (cart/checkout/wishlist persisted).

## 8. shared/

One file only (storefrontThemeContract.json), imported by backend validation script; frontend has its own contract types → duplication risk noted for Phase 9.

## 9. Immediate red flags carried into later phases

| ID | Flag | Where |
|---|---|---|
| R1 | Dead require: services/aiAgent/modelManager does not exist | services/aiRuntimeService.js:11 |
| R2 | Stale hardcoded log path `e:/max_p_new/...` | globalSecurity.js:13 |
| R3 | walletRoutes double-mounted | server.js:959,1025 |
| R4 | db push --accept-data-loss in prestart (migration drift) | apps/backend/package.json |
| R5 | ai-service writes go through Node but READS the same DB directly → two ORMs, two sources of truth for constraints | apps/ai-service/src/db/session.py, src/tools/repositories/* |
| R6 | Empty schema file models.prisma (0 models) + legacy postgres.prisma with duplicate Product model | prisma/ |
