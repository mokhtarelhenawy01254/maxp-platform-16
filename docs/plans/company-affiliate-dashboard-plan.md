# Plan: Company Affiliate Dashboard Page

**Generated**: 2026-07-20
**Estimated Complexity**: Medium

## Overview

إنشاء صفحة داشبورد للشركات المرتبطة عبر الربط الداخلي (Company Connections) بحيث تشوف كل شركة علاقة الأفليت مع الشركات التانية. الصفحة هتكون تحت قسم "الافليت والدروب شيبنج" في القائمة الجانبية.

### الـ Data Model حالياً:
- `CompanyConnection` — provider ↔ consumer
- `Affiliate` — فردي (userId + companyId). `getOrCreateAffiliateForCompany` بيسجل OWNER المستهلك كـ affiliate عند المورّد
- `Order` — الطلبات المدفوعة عند المورّد ليها: `sourceType: 'internal_push'`, `orderSource: 'AFFILIATE_DIRECT'`, `affiliateId`
- `Commission` — العمولات المحسوبة على الطلبات دي (companyId = provider, affiliateId = صاحبها)

### المنطق:
- **Flora (Consumer)**: عايزة تشوف كل الـ Providers اللي مرتبطة بيهم + كم طلب اتدفع + كم عمولة
- **Swan (Provider)**: عايز يشوف كل الـ Consumers اللي عنده (كأفليت) + نشاطهم

---

## Decision: Data Source

**نقرا من shared database (Option A)** — نفس الـ `getSharedPrismaClient()` اللي company-connections controller بيستخدمه حالياً. مش هنضيف tracking fields جديدة.

## Sprint 1: Backend API Endpoint

**Goal**: API يجمع بيانات علاقة الأفليت بين الشركات من الـ CompanyConnection + Order + Commission
**Demo/Validation**: Test via curl/Postman to verify correct aggregation

### Task 1.1: Create endpoint `GET /api/v1/company-connections/affiliates`

- **Location**: `apps/backend/controller/companyConnectionController.js`
- **Description**: New endpoint returns all affiliate relationships for the current company. يعمل الآتي:
  - **لو المستخدم Consumer** (providerId !== myId):
    - يجيب كل CompanyConnection حيث `consumerId = myId` و `status = 'ACTIVE'`
    - لكل Provider، يحسب: عدد الطلبات المدفوعة ليه (orders عنده بـ `sourceType: 'internal_push'` و `affiliateId` تابع لأي user من شركتي)، مجموع العمولات، total sales
  - **لو المستخدم Provider** (consumerId !== myId):
    - يجيب كل CompanyConnection حيث `providerId = myId` و `status = 'ACTIVE'`
    - لكل Consumer، يحسب: عدد الطلبات المدفوعة منهم، مجموع العمولات المدفوعة لهم
- **Dependencies**: None
- **Acceptance Criteria**:
  - Returns array of `{ connectionId, partnerCompany (id/name/logo/email), role: 'consumer'|'provider', totalOrders, totalCommissions, totalEarnings, lastOrderAt }`
  - Returns 403 if not authenticated
- **Validation**: Unit test mocking Prisma

### Task 1.2: Add route for new endpoint

- **Location**: `apps/backend/routes/companyConnectionRoutes.js`
- **Description**: Add `router.get('/affiliates', companyConnectionController.getCompanyAffiliates);`
- **Dependencies**: Task 1.1

### Task 1.3: Register route in server.js (if needed)

- **Location**: `apps/backend/server.js`
- **Description**: Verify the route is already mounted (`app.use("/api/v1/company-connections", companyConnectionRoutes)`) — موجود بالفعل
- **Dependencies**: Task 1.2

---

## Sprint 2: Response Transformation & Order Distinction

**Goal**: تأكيد إن الطلبات متمايزة فعلاً ونقدر نجيب البيانات المطلوبة
**Demo/Validation**: Query موجودين في قاعدة البيانات ويشتغلوا صح

### Task 2.1: Create helper to find orders pushed between connected companies

- **Location**: `apps/backend/controller/companyConnectionController.js` or new util
- **Description**: Function `getAffiliateOrdersForPartner(companyId, partnerId, role)`:
  - لو role = 'consumer' (Flora): دور على affiliates تبع users من Flora عند Swan → اجيب orders عند Swan بـ `affiliateId` منهم و `sourceType: 'internal_push'`
  - لو role = 'provider' (Swan): دور على affiliates تبع users من Flora عند Swan → اجيب orders عند Swan بـ `affiliateId` منهم
- **Dependencies**: Task 1.1

### Task 2.2: Aggregate commission data

- **Location**: `apps/backend/controller/companyConnectionController.js`
- **Description**: Find Commission records حيث `companyId = providerId` و `affiliateId` تبع affiliate لـ consumer company. اجمع `amount` و `status`
- **Dependencies**: Task 2.1

---

## Sprint 3: Frontend Page Component

**Goal**: صفحة الداشبورد الجديدة تحت الافليت والدروب شيبنج
**Demo/Validation**: تظهر في القائمة الجانبية وتعرض بيانات حقيقية من الـ API

### Task 3.1: Create CompanyAffiliateDashboard page component

- **Location**: `apps/frontend/src/pages/affiliates/CompanyAffiliateDashboard.tsx`
- **Description**: صفحة تعرض جدول/بطاقات للشركات المرتبطة بالشكل ده:

  **لو أنت Consumer (Flora) — "الشركات المورّدة">:**
  ```
  | اسم المورّد | آخر طلب | عدد الطلبات | إجمالي العمولات | العمولات المستلمة | الحالة |
  |-------------|---------|-------------|-----------------|-------------------|--------|
  | Swan 🏪     | 2026-07-19 | 45 طلب | 12,500 ج.م | 8,200 ج.م | 🟢 نشط |
  ```
  كل بطاقة فيها زر "عرض التفاصيل" → يفتح تفاصيل أكتر

  **لو أنت Provider (Swan) — "المسوقون/الشركات">:**
  ```
  | اسم المسوق | عدد الطلبات | إجمالي العمولات | آخر نشاط |
  |------------|-------------|-----------------|----------|
  | Flora 🌸   | 45 طلب      | 12,500 ج.م      | 2026-07-19 |
  ```

  **بيانات كل بطاقة:**
  - اسم وشعار الشركة الشريك
  - إجمالي الطلبات المدفوعة (sourceType: 'internal_push')
  - إجمالي العمولات (مجموع من Commission)
  - العمولات المدفوعة/المستلمة
  - تاريخ آخر طلب
  - حالة الاتصال (ACTIVE)

- **Dependencies**: Sprint 1, Sprint 2
- **Acceptance Criteria**:
  - Shows correct data for both roles
  - Handles empty state (لا توجد شركات مرتبطة)
  - Responsive layout
  - RTL support
- **Validation**: Storybook or manual test

### Task 3.2: Add route and lazy import in App.tsx

- **Location**: `apps/frontend/src/App.tsx`
- **Description**: أضف:
  ```tsx
  const CompanyAffiliateDashboard = React.lazy(
    () => import("./pages/affiliates/CompanyAffiliateDashboard"),
  );
  ```
  والراوت:
  ```tsx
  <Route path="/company-affiliates" element={<Layout><CompanyAffiliateDashboard /></Layout>} />
  ```
- **Dependencies**: Task 3.1

### Task 3.3: Add sidebar entry

- **Location**: `apps/frontend/src/config/sidebar.ts` (lines 816-838)
- **Description**: أضف باب جديد تحت الافليت والدروب شيبنج:
  ```tsx
  { to: '/company-affiliates', icon: BuildingStorefrontIcon, label: 'الشركات المرتبطة' }
  ```
  يظهر لـ OWNER/COMPANY_ADMIN/SUPER_ADMIN بس
  إضافة `BuildingStorefrontIcon` لـ imports

- **Dependencies**: Task 3.2

### Task 3.4: Add localization entries

- **Location**: `apps/frontend/src/locales/ar/sections/sidebar.json` and `apps/frontend/src/locales/en/sections/sidebar.json`
- **Description**: أضف `"companyAffiliates": "الشركات المرتبطة"` / `"companyAffiliates": "Connected Companies"`
- **Dependencies**: Task 3.3

---

## Sprint 4: Polish & Edge Cases

**Goal**: تأمين الحالات الحدية
**Demo/Validation**: كل السيناريوهات تشتغل

### Task 4.1: Handle affiliate not created yet

- **Description**: لو الاتصال موجود بس مفيش orders اتدفعت — `getOrCreateAffiliateForCompany` لسه متعملتش. الـ API يرجع 0 orders/commissions من غير error
- **Location**: Backend controller
- **Dependencies**: Sprint 1

### Task 4.2: Handle company has multiple owners (edge case)

- **Description**: لو في أكتر من OWNER في الشركة المستهلكة، الـ `getOrCreateAffiliateForCompany` بياخد أول واحد. نأكد إن البيانات بتاعة الطلبات والعمولات تتجمع على كل الـ affiliates بتوع الشركة مش أول واحد بس
- **Location**: Backend controller
- **Dependencies**: Sprint 2

### Task 4.3: Loading & error states in frontend

- **Description**: Add loading skeleton, error toast, empty state in the dashboard page
- **Location**: `CompanyAffiliateDashboard.tsx`
- **Dependencies**: Task 3.1

---

## Testing Strategy

| Sprint | Test Type | What to Test |
|--------|-----------|-------------|
| Sprint 1 | Unit (Jest) | Controller logic: correct aggregation for consumer/provider roles |
| Sprint 1 | Integration | API endpoint returns correct HTTP codes and shape |
| Sprint 3 | Component (Vitest) | Page renders with mock data, handles empty/error states |
| Sprint 3 | Visual | RTL layout, dark mode, responsive grid |
| Sprint 4 | Edge cases | No orders yet, multiple owners, terminated connections |

## Potential Risks & Gotchas

1. **Affiliate record per-user, not per-company**: الـ affiliate مرتبط بـ user مش بـ company. هنحتاج نجمع كل affiliates بتوع users من الشركة المستهلكة عشان نجيب البيانات الكاملة
2. **الداتا موجودة في companies مختلفة**: الطلبات بتاعة Swan موجودة في tenant بتاع Swan. الـ API بتاع company connections شغال cross-tenant فعلاً (بـ `getSharedPrismaClient`)
3. **الـ Commission مسجلة في provider tenant**: `commission.companyId = providerId` — يبقى نقدر نجيبها بسهولة
4. **مفيش علاقة مباشرة بين CompanyConnection و Affiliate**: مفيش `connectionId` في Affiliate model. هنحتاج نعمل join عن طريق: connection.consumerId → users.companyId → affiliate.userId → affiliate.companyId = connection.providerId
5. **الطرفين يشوفوا نفس الصفحة**: محتاج نضيف toggle/tabs في frontend: "كمستهلك" / "كمورّد" (أو automatic حسب الـ data)

## Rollback Plan

- **Backend**: Remove the new route and controller function
- **Frontend**: Remove the route from App.tsx and sidebar entry
- **Data**: Nothing changes in DB — read-only endpoint
