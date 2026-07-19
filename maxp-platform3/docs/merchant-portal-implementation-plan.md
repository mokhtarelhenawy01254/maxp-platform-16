# Plan: Merchant Portal

**Generated**: 2026-05-02
**Estimated Complexity**: High

## Overview

سنحول التاجر من كيان تديره الشركة فقط إلى مستخدم يستطيع تسجيل الدخول وتشغيل نطاقه بنفسه، مع الحفاظ على لوحة الشركة الحالية كما هي. البداية ستكون بدون migration: نستخدم `User.role = MERCHANT` ونربط المستخدم بالتاجر عن طريق نفس البريد داخل نفس الشركة. إذا احتجنا لاحقًا علاقة صريحة `merchant.userId` نضيفها في Sprint لاحق غير مدمر.

## Execution Status

- Sprint 1 backend foundation: completed locally.
- Initial merchant portal UI: completed locally as a focused dashboard at `/merchant-portal`.
- Latest UAT: `36/36 PASS` in `backend/tmp/codex-affiliate-full-uat-20260501220618.json`.
- Detailed report: `docs/merchant-portal-uat-2026-05-02.md`.

## Prerequisites

- عدم حذف أي بيانات حالية.
- عدم كسر مسارات إدارة الشركة الحالية للتجار.
- استخدام صلاحيات عزل صارمة: التاجر يرى تاجرًا واحدًا فقط داخل شركته.
- توثيق كل Sprint وتشغيل UAT بعد كل خطوة.

## Sprint 1: Backend Portal Foundation

**Goal**: تاجر يستطيع تسجيل الدخول واستخدام API خاصة به فقط.

**Demo/Validation**:
- إنشاء شركة UAT وتاجر بكلمة مرور.
- تسجيل دخول التاجر.
- التاجر يرى ملفه، منتجاته، طلباته فقط.
- التاجر يحدّث المخزون/السعر لمنتجه فقط.
- التاجر يحدّث حالة طلبه أو يضيف رقم تتبع.
- مسوق أو شركة ثانية لا تستطيع استخدام APIs التاجر.

### Task 1.1: Create Merchant Portal User

- **Location**: `backend/services/merchantService.js`, `backend/routes/publicMerchantRoutes.js`
- **Description**: عند تسجيل تاجر بكلمة مرور، يتم إنشاء `User` بدور `MERCHANT` مربوط بنفس `companyId`.
- **Dependencies**: none
- **Acceptance Criteria**:
  - لا يتم إنشاء مستخدم بدون `password`.
  - لا يتم إنشاء مستخدم إذا البريد مستخدم بالفعل.
  - تسجيل الدخول يرجع `role=MERCHANT`.
- **Validation**: UAT script creates merchant user and logs in.

### Task 1.2: Add Merchant Portal API

- **Location**: `backend/routes/merchantPortalRoutes.js`, `backend/server.js`
- **Description**: إضافة APIs تحت `/api/v1/merchant-portal`.
- **Acceptance Criteria**:
  - `GET /me` يعرض بيانات التاجر الحالي.
  - `GET /products` يعرض منتجات التاجر فقط.
  - `PATCH /products/:merchantProductId` يحدّث SKU/price/stock/syncEnabled فقط لهذا التاجر.
  - `GET /orders` يعرض طلبات التاجر فقط.
  - `PATCH /orders/:merchantOrderId/status` يحدّث حالة طلب التاجر أو رقم التتبع.
- **Validation**: UAT role and isolation checks.

### Task 1.3: Permission Hardening

- **Location**: `backend/routes/merchantPortalRoutes.js`
- **Description**: منع غير التاجر من استخدام البورتال، ومنع التاجر من الوصول لتاجر آخر.
- **Acceptance Criteria**:
  - `AFFILIATE` يحصل على `403`.
  - تاجر شركة أخرى يحصل على `404/403`.
  - `OWNER` لا يستخدم portal APIs بالخطأ؛ يستخدم مسارات الإدارة الحالية.
- **Validation**: UAT security scenarios.

## Sprint 2: Merchant Portal UI

**Goal**: واجهة أولية للتاجر داخل التطبيق.

**Demo/Validation**:
- دخول التاجر من `/auth/login`.
- التحويل إلى `/merchant-portal`.
- شاشة تعرض: الطلبات، المنتجات، الإحصائيات المختصرة.

### Task 2.1: Add Merchant Routes

- **Location**: `frontend/src/App.tsx`
- **Description**: إضافة routes مثل `/merchant-portal`, `/merchant-portal/orders`, `/merchant-portal/products`.
- **Acceptance Criteria**:
  - التاجر لا يرى لوحة الشركة العامة.
  - صفحات البورتال تعمل مع token التاجر.
- **Validation**: browser smoke.

### Task 2.2: Build Portal Pages

- **Location**: `frontend/src/pages/merchant-portal/*`
- **Description**: صفحات Dashboard, Orders, Products.
- **Acceptance Criteria**:
  - عرض الطلبات وتحديث التتبع.
  - عرض المنتجات وتحديث المخزون والسعر.
  - رسائل خطأ واضحة للصلاحيات.
- **Validation**: focused frontend tests + browser.

## Sprint 3: Production Hardening

**Goal**: تجهيز البورتال للاستخدام العام.

**Demo/Validation**:
- rate limiting لتسجيل التاجر.
- سياسة قبول/رفض التاجر.
- توثيق التشغيل.

### Task 3.1: Signup Protection

- **Location**: public merchant routes / middleware
- **Description**: rate limit/captcha/email verification حسب المتاح.
- **Acceptance Criteria**:
  - تقليل spam public signup.
- **Validation**: API negative tests.

### Task 3.2: Merchant Approval Workflow

- **Location**: merchant admin + portal APIs
- **Description**: التاجر لا يعمل إذا `isActive=false`.
- **Acceptance Criteria**:
  - التاجر غير المفعل لا يرى/يعدل الطلبات.
- **Validation**: UAT inactive merchant scenario.

## Testing Strategy

- Backend syntax checks for changed files.
- UAT script extension for merchant login and portal APIs.
- Frontend focused tests after Sprint 2.
- Browser verification after UI implementation.

## Potential Risks & Gotchas

- `UserCompany.role` لا يحتوي `MERCHANT` حاليًا؛ لذلك Sprint 1 يتجنب `UserCompany` للتاجر ويعتمد على `User.role` و`companyId`.
- الربط عبر البريد `merchant.email = user.email` كافٍ للبداية لكنه ليس أفضل long-term. العلاقة الصريحة `merchant.userId` أفضل لاحقًا.
- تحديث سعر المورد قد يؤثر على سعر المنتج العام؛ يجب تشغيل UAT الدروب شيبنج بعد أي تعديل على أسعار `MerchantProduct`.
- لا يجب السماح للتاجر برؤية بيانات المسوقين أو عمولات المنصة أو تجار آخرين.

## Rollback Plan

- إزالة mount `/api/v1/merchant-portal`.
- تعطيل إنشاء `User.role=MERCHANT` من تسجيل التاجر.
- ترك جداول `Merchant` و`MerchantProduct` كما هي بدون حذف بيانات.
