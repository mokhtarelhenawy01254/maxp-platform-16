# PHASE 4 — SECURITY / AUTHORIZATION AUDIT

No Postgres RLS for the app; isolation = Express middleware (globalSecurity) + per-controller companyId filters. Audited both layers plus webhooks/uploads/secrets.

## 4.1 CRITICAL

| # | Class | Evidence | Finding |
|---|---|---|---|
| S1 | CONFIRMED | server.js:689 mount; controller/platformSubscriptionController.js:723-770 | **Platform subscription webhook fully unauthenticated** — no HMAC/token; forged `{"merchantOrderId":"platform-sub-<id>","status":"CAPTURED"}` activates paid subscriptions free |
| S2 | CONFIRMED | routes/kashierRoutes.js:173-261 (mount server.js:682, pre-globalSecurity) | **Kashier webhook no signature/auth** → mark any order CAPTURED; `wallet:<companyId>:<amount>` reference credits any company's wallet |
| S3 | CONFIRMED | controller/whatsappMetaWebhookController.js:361-382; routes/whatsappMetaWebhookRoutes.js:16 | Unauth debug-log endpoint: committed key (`dc05…`), path traversal via `?file=` → arbitrary file read, output reflected in HTML |
| S4 | CONFIRMED | globalSecurity.js:472 + serviceOrdersController.js:38 | `POST /api/v1/service-orders` public AND trusts `req.body.companyId` → anonymous cross-tenant order creation |
| S5 | CONFIRMED | docs/DATABASE_INFO.md:64,167; ~15 scripts (bulk_sync_processing.js:12, reset-pass.js:12…) git-tracked | **Production DB credentials committed to git** (remote MySQL 92.113.22.70 + local superuser passwords) |

## 4.2 HIGH

| # | Class | Evidence | Finding |
|---|---|---|---|
| S6 | CONFIRMED | routes/turboWebhook.js:28-53; routes/bostaWebhook.js:15-24,39-44 | Shipping webhooks: token OPTIONAL; null companyId falls through to GLOBAL order search → forged status events for any company |
| S7 | CONFIRMED | utils/webhookSignature.js:59-75; whatsappMetaWebhookController.js:211-224 | WhatsApp Meta signature enforcement default-OFF (`META_WA_WEBHOOK_STRICT` opt-in) → forged message injection via phone_number_id lookup (:268-282) |
| S8 | CONFIRMED | controller/proxyImageController.js:154-168, 295-301 (mounted publicly ×3, server.js:841-842/923) | Full-read SSRF: extension/WP-content fallback defeats allowlist, follows redirects, returns body (cloud metadata reachable with `?x=.jpg`) |
| S9 | CONFIRMED | kashierRoutes.js:79-81,143-154 | Checkout trusts client `subtotal/total` and decrements stock cross-company without price validation vs DB |
| S10 | CONFIRMED | walletController.js:616-640,684-703; walletRoutes.js:22 | Customer-wallet IDOR: staff of company A reads any customer wallet of ANY company via `?customerId=` (no companyId filter) |
| S11 | HC | globalSecurity.js:964,990-997,1012 | X-Company-Id fallback: JWT lacking companyId + attacker header ⇒ impersonation on isolated routes; header bypasses the violation detector too |
| S12 | CONFIRMED | uploadRoutes.js:79-84 (taskUpload no fileFilter), :45 SVG passes `image/*`; served same-origin unauth (server.js:696-728) | Stored XSS / arbitrary-file hosting (SVG/HTML); delete endpoint IDOR (uploadRoutes.js:185-210) |
| S13 | CONFIRMED | utils/verifyToken.js:159-182 (plain `===`); scripts/seed-new-medical-agents.js:6 (64-hex prod-shaped token COMMITTED); .env files in tree | Service token = full cross-company access w/ attacker-chosen companyId; non-timing-safe compare in verifyToken |
| S14 | CONFIRMED | routes/publicAnalyticsRoutes.js:11-16; middleware/subdomainMiddleware.js:104,149-174 | Public storefront analytics tenant resolved from spoofable `X-Subdomain`/`?companyId` → any tenant's business metrics |

## 4.3 MEDIUM

| # | Evidence | Finding |
|---|---|---|
| S15 | securityEnhancements.js:261 (`smartRateLimit` = pass-through); authRoutes.js:14 no limiter; rateLimits.auth preset DEAD CODE | No login/register/forgot-password rate limiting → brute force/credential stuffing |
| S16 | jwtSecret.js:17-21; authController.js:1203-1253 | Refresh secret silently falls back to access secret; stateless rotation w/o reuse detection or blacklist; logout invalidates nothing (access 8h / refresh 7d window) |
| S17 | globalSecurity.js:897,904-908 | SUPER_ADMIN override role from JWT claim only, isActive never re-checked on this path (stale powers ≤8h); audit = console.log only |
| S18 | globalSecurity.js:407,419-434 | Stale PUBLIC_ROUTES entries (notifications CRUD, opportunities, POST /uploads/*) currently inert by controller luck — regression ⇒ anonymous cross-tenant CRUD |
| S19 | aiServiceAgentProxy.js:12,56-95 | seed-template proxy: any authenticated user overwrites global agent templates (no role gate, unlike sibling sandbox routes) |
| S20 | webhookController.js:106 | Facebook verify-token hardcoded fallback `'simp…'` if env unset |
| S21 | scripts/reset_prod_admin_password.js:4; swan-full-import.js:11 (WC secret `cs_81…`) | Prod admin password + WooCommerce consumer secret committed |
| S22 | .env.example:9 + ~10 scripts use well-known fallback JWT `'your-super-secret…'`; scripts are ready-made token minters | Runtime code safe (jwtSecret throws), but forging tooling ships in repo [POSSIBLE exploit precondition] |

## 4.4 LOW / latent
- internalDeployRoutes.js:6,10 — fallback deploy secret 'maxp-deploy-internal-2024', plain `!==`.
- IP blocking middleware disabled entirely (globalSecurity.js:273-296).
- CORS safe today (origin allowlist config/environment.js:224-241) but credentials:true sent unconditionally (securityEnhancements.js:529) — latent.
- Helmet CSP disabled (server.js:546); hand-rolled CSP broad (`img-src https:`, `connect-src https: ws:` securityEnhancements.js:336-337); HSTS lost.
- Sanitizer is a regex blocklist w/ documented bypass classes (requestSanitizer.js:1-14) and corrupts benign input.

## 4.5 SQL injection review
NO exploitable interpolation found (CONFIRMED): analyticsController LIMIT/OFFSET parseInt-clamped (:4520-4522,4669-4670), taskController column whitelist (:160-169), lpAdmin fixed-field SET clauses, orderMovementSql tagged templates, proxyImage identifiers whitelisted.

## 4.6 What is done RIGHT (do not break)
- Facebook webhook signature verification solid & mandatory in production (webhookSignature.js:28-57,79-103).
- JWT base companyId always from token since L883-909 fix; customer portal tokens DB-backed and pinned (verifyToken.js:200-253).
- Upload filename UUID + traversal containment correct (server.js:470-506).
- No hardcoded JWT default at runtime.
