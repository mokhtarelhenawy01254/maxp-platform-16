# HR Applications Marketplace Overhaul (2026-09-04)

## Overview
Comprehensive review, restructuring, and cleanup of the Human Resources (HR) application suite in the MaxP Marketplace, along with UI gating for Employee Self-Service ("حسابي" / `my-account`).

## 1. Official HR Applications Architecture
The marketplace catalog now clearly defines 5 distinct, well-positioned HR apps:

| Slug | Arabic Name | Pricing Model | Monthly Price | Category | Key Scope |
|------|-------------|---------------|---------------|----------|-----------|
| `hr-core` | نظام HR الأساسي | FREE | 0 EGP | HR | Employee directory, departments, org chart, policies, audit logs, reports hub |
| `hr-attendance-pro` | الحضور والانصراف والورديات | SUBSCRIPTION | 79 EGP | HR | GPS geofencing check-in, QR codes, shift scheduling, leaves, permissions |
| `hr-payroll` | مسير الرواتب والمستحقات | SUBSCRIPTION | 99 EGP | HR | Automated payroll calculations, advances, deductions, bonuses, payslips |
| `hr-recruitment` | نظام التوظيف واستبيانات العمل | SUBSCRIPTION | 129 EGP | HR | Job vacancies, candidate ATS pipeline, dynamic application forms & work reporting forms |
| `hr-assets` | إدارة العهد والأصول وتقييم الأداء | SUBSCRIPTION | 99 EGP | HR | Custody/asset handover & clearance, periodic performance reviews, rewards & kudos |

### Complete HR Bundle
- **Slug**: `hr-complete-bundle`
- **Name**: باقة الموارد البشرية المتكاملة
- **Price**: 299 EGP/month (2,990 EGP/year)
- **Discount**: 26% savings compared to purchasing all 4 paid apps individually (406 EGP).

## 2. Legacy App Soft-Deprecation
- `hr-basic` and `hr-attendance` had duplicate functionality.
- To prevent breaking active customer accounts, existing records were NOT deleted.
- Set `isPublic: false` in database and catalog: existing 89 company installations continue working uninterrupted via fallback routing, but new customers only see the clean 5 official apps in the Marketplace.

## 3. Sidebar & Feature Map Gating
- **Requirement**: "قسم حسابي لا يظهر إلا لو نظام الاتش ار متفعل لأنه جزء منه مش مستقل".
- **Implementation**:
  - `apps/frontend/src/config/sidebar.ts`:
    - Section 6 (`my-account`): Gated via `hidden: !isAnyAppActive(['hr-basic', 'hr-core', 'hr-attendance-pro', 'hr-payroll', 'hr-assets', 'hr-recruitment'])`.
    - Section 7 (`hr` management): Similarly gated with the same array.
  - `apps/frontend/src/config/marketplaceFeatureMap.ts`:
    - Cleaned up all HR entries, added missing routes (`/hr/online`, `/hr/reports-hub`, `/hr/audit-logs`, `/hr/reporting/forms`, etc.).
    - Resolved duplicate `facebook-post` key.
  - Automated tests:
    - `apps/frontend/src/config/__tests__/sidebar.hrMyAccountGating.test.ts` (2 tests passing).
    - `apps/frontend/src/config/__tests__/marketplaceFeatureMap.test.ts` (5 tests passing).

## 4. Production Database Sync
- Executed migration script `apps/backend/scripts/sync_hr_marketplace_catalog.js` directly on production database (`srv974554.hstgr.cloud`).
- Fixed pricing and descriptions across DB tables `apps` and `app_bundles`.
