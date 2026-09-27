# Marketplace Hybrid Catalog & Single Source of Truth Governance

This document defines the architectural governance, synchronization protocols, and anti-drift rules for the MaxP Marketplace Hybrid Catalog.

---

## 1. Single Source of Truth Architecture (معمارية مصدر الحقيقة الموحد)

To eliminate price divergence, unmonitored drift, and tenant provisioning inconsistencies across environments, the platform defines a strict separation of concerns:

| Layer | Component | Authority / Responsibility |
| :--- | :--- | :--- |
| **Specification Source of Truth**<br>*(مصدر المواصفات والتسعير القياسي)* | **Catalog Files**<br>`apps/backend/catalog/marketplace/apps.json`<br>`apps/backend/catalog/marketplace/bundles.json`<br>`apps/backend/catalog/marketplace/categories.json` | **Definitive Single Source of Truth** for:<br>• App metadata (id, slug, name, nameEn, description, category)<br>• Baseline pricing (`monthlyPrice`, `yearlyPrice`, `unitPrice`, `unitName`, `pricingModel`)<br>• Free trial periods (`trialDays`)<br>• Feature hierarchies and positioning (`positioning`, `features`)<br>• Required dependencies (`requiredApps`)<br><br>*All new environments, tenants, and hybrid/file modes derive baseline pricing and app definitions strictly from here.* |
| **Operational Runtime State**<br>*(حالة التشغيل الحية)* | **Database**<br>`prisma.marketplaceApp`<br>`prisma.appBundle`<br>`prisma.companyApp` | **Operational Runtime State** for:<br>• Active installations (`installCount`, `company_apps`)<br>• Tenant-specific overrides and active pricing models<br>• Telemetry, reviews, and ratings (`rating`, `reviewCount`)<br>• Financial transactions, subscriptions, and wallet charges |

---

## 2. The Zero-Drift Invariant (قاعدة منع الانجراف الصارم)

> ⚠️ **STRICT INVARIANT: ممنوع تعديل سعر أو مواصفة تطبيق من غير ما يتكتب في الاثنين**
> 
> A price, trial period, or core specification change MUST NEVER exist in the database without being written to `apps.json` (and vice-versa). Divergence between the file catalog and runtime database is treated as a fatal deployment flaw.

### Risks Prevented:
1. **Tenant Provisioning Drift:** Any new tenant or environment provisioned with `CATALOG_SOURCE=file` or running `catalog:sync-target` receives the catalog price. If `apps.json` has `store` at 249 instead of 699, newly provisioned environments bill 249 while production charges 699.
2. **Accidental Database Overwrite:** Running `npm run catalog:sync-target` without `--only-missing` triggers an `updateMany` that could overwrite approved live prices with stale file values.
3. **Silent Accumulation:** Updates made via Super Admin directly in PostgreSQL accumulate without version control or Git visibility.

---

## 3. Tooling & Synchronization Pipeline

### A. Automatic Synchronization in `updateApp` (Controller Level)
When a Super Admin updates an app via `PUT /api/v1/super-admin/marketplace-management/apps/:id`:
- `marketplaceManagementController.updateApp` updates the database record.
- It immediately calls `marketplaceCatalogService.updateAppFile(slug, updateData)` to write the updated pricing/metadata back to `apps.json` on disk.
- Clears the catalog hash and in-memory cache (`marketplaceCatalogService.clearCache()`).
- If the filesystem write fails (e.g. read-only container), a prominent warning is returned in the API response instructing the admin to run `npm run catalog:export-db`.

### B. Command: `npm run catalog:export-db`
- Script: `apps/backend/scripts/catalog/export_db_to_marketplace_catalog.js`
- Connects to the database and syncs live DB pricing and metadata into `apps/backend/catalog/marketplace/apps.json`.
- Flags:
  - `--dry-run`: Previews updates without modifying files.
  - `--slug=<slug>`: Syncs a single specific app.
  - `--all`: Exports descriptions and categories in addition to pricing fields.

### C. Command: `npm run catalog:diff`
- Compares `apps.json` / `bundles.json` against the database snapshot.
- Flags:
  - `--json`: Machine-readable output.
  - `--fail-on-diff`: Exits with code 1 if any differences exist.
  - `--fail-on-changed`: Exits with code 1 if `apps.changed > 0` or `bundles.changed > 0` or missing entries exist.
- Normalization:
  - `ppuBillingMethod` is compared only for Pay-Per-Use apps (`pricingModel === 'PAY_PER_USE'`). For non-PPU apps, PostgreSQL schema defaults (`DEFAULT 'PER_ORDER'`) are ignored to eliminate false positives.

### D. Safe Target Sync: `npm run catalog:sync-target`
- **MANDATORY FLAG:** Always use `--only-missing`.
  ```bash
  npm run catalog:sync-target -- --only-missing --fail-on-missing
  ```
- **PROHIBITION:** NEVER execute `npm run catalog:sync-target` without `--only-missing` in production environments.

---

## 4. Hardened CI/CD Deployment Gate

During automated deployments (`.github/workflows/deploy.yml` and `scripts/deploy-remote.sh`):
1. **Sync Missing:** Runs `npm run catalog:sync-target -- --only-missing --fail-on-missing`.
2. **Strict Drift Verification:** Runs `npm run catalog:diff -- --fail-on-changed`.
3. **Failure Condition:** If `apps.changed > 0` or `apps.missingInDb > 0`, the deployment pipeline fails immediately prior to PM2 restart, preventing deployment of unaligned pricing.
4. **Post-Boot Full Catalog Verification:** Verifies `GET /api/v1/marketplace/apps?page=1&limit=200` returns the complete catalog without pagination truncation.

---

## 5. Standard Approved Pricing (Baseline Reference)

| App Slug | Name (Ar) | Pricing Model | Monthly Price | Yearly Price | Trial Days |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `store` | المتجر | PAY_PER_USE (1 ر.س/طلب) | 699 ر.س | 7,689 ر.س | 0 |
| `whatsapp-business` | WhatsApp Business API | SUBSCRIPTION | 350 ر.س | 3,500 ر.س | 0 |
| `hr-payroll` | مسير الرواتب والمستحقات | SUBSCRIPTION | 15 ر.س | 150 ر.س | 14 |
| `hr-recruitment` | نظام التوظيف واستبيانات العمل | SUBSCRIPTION | 149 ر.س | 1,490 ر.س | 14 |

*Note: Duplicate app `store-pro` has been deprecated and permanently deleted. All store features are unified within `store`.*
