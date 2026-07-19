# Marketplace Feature Audit

## Purpose

The admin UI now includes a Marketplace feature audit at `/marketplace/feature-audit`.
The sidebar link and page body are limited to `SUPER_ADMIN`, `COMPANY_ADMIN`, and
`OWNER` users because the page exposes internal packaging and pricing decisions.
It helps the team distinguish between:

- Core platform surfaces that should stay always available.
- Surfaces already covered by a marketplace app.
- Surfaces that have been moved to a granular app gate with a temporary legacy fallback.
- Surfaces that are good marketplace candidates but do not yet have an app slug.

## Source Of Truth

The frontend map lives in:

```text
frontend/src/config/marketplaceFeatureMap.ts
```

Each entry documents:

- The feature area and user-facing label.
- Related routes.
- Suggested marketplace `appSlug`.
- Current granular gate and any temporary `legacyGate` fallback.
- The recommended migration action.

The audit page fetches `/marketplace/apps?page=1&limit=200` and compares the map
against the live catalog slugs, so missing app candidates show up immediately.

## Super Admin Coverage Center

Super Admins can now review company-level rollout from:

```text
/super-admin/marketplace-coverage
```

The page reads:

- `GET /api/v1/super-admin/marketplace-management/coverage`
- `POST /api/v1/super-admin/marketplace-management/coverage/companies/:companyId/apps/:slug/install`

It combines company installations from `company_apps` with the frontend
`marketplaceFeatureMap.ts` to show:

- Companies with exact app coverage.
- Companies still relying on a `legacyGate` fallback.
- Companies missing an exact app installation.
- Feature entries whose app slug is absent from the live DB catalog.

The install action is intentionally Super Admin-only and installs the selected
app for one company at a time. Required marketplace apps are auto-installed in
the same transaction before the requested app is activated.

## Current Gate Rollout

The production-safe rule is:

- Prefer the exact marketplace app slug for new access checks.
- Keep a `legacyGate` only where an old broad app was already granting access.
- Let the audit mark any covered entry as `missing-app` if its `appSlug` is not in
  the live marketplace catalog.

The first granular rollout covers the previously loose areas for orders, shipping,
invoicing, storefront conversion, inventory, CRM/loyalty, ads, broadcast, HR
modules, AI/RAG, tasks, integrations, wallet, procurement, affiliate, and
notification automation.

The file catalog now includes these app slugs so production DB sync can create
them when they are absent:

- `procurement-pro`
- `affiliate-pro`
- `notification-automation`

## Team Workflow

When a teammate adds a route or a large feature:

1. Decide whether it is Core or should be controlled by a marketplace app.
2. Add or update an entry in `marketplaceFeatureMap.ts`.
3. If the app slug does not exist yet, add it to `backend/catalog/marketplace/apps.json`.
4. Add a temporary `legacyGate` only when production customers already rely on an
   older broad app for the same surface.
5. Run the focused map test:

```powershell
cd frontend
npx jest --config jest.config.cjs src/config/__tests__/marketplaceFeatureMap.test.ts --runInBand
```

This keeps local-only feature work from silently shipping without a Marketplace
catalog decision.
