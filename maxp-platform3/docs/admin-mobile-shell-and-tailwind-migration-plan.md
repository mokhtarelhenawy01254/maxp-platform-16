# Plan: Admin Mobile Shell and Tailwind Migration

**Generated**: 2026-04-17
**Estimated Complexity**: High

## Overview
لدينا مساران مرتبطان لكن ليسا متماثلين:

1. تحويل واجهات الإدارة على الموبايل من `responsive web` إلى تجربة أقرب لـ `mobile app shell`.
2. توحيد الواجهات الإدارية على `Tailwind + shadcn/Radix` بدل التشتت الحالي بين `MUI` و`Headless UI` و`legacy/custom`.

الخطة الأفضل ليست rewrite كامل دفعة واحدة، بل برنامج عمل على مراحل:
- أولًا: تثبيت الـ shell المشترك للموبايل لأن أثره يمتد على أغلب الصفحات الإدارية.
- ثانيًا: تثبيت design system موحد ومكتبة primitives مشتركة.
- ثالثًا: ترحيل الصفحات الأعلى قيمة واستخدامًا إلى `Tailwind + shadcn/Radix`.
- رابعًا: تنظيف الصفحات legacy تدريجيًا حسب الأولوية التجارية.

## Current Snapshot
- صفحات dashboard الداخلية للإدارة بعيدًا عن المتجر العام: `78` صفحة تقريبًا.
- التوزيع الحالي:
  - `14` صفحة `MUI`
  - `11` صفحة `Tailwind + shadcn/Radix`
  - `1` صفحة `Headless UI`
  - `52` صفحة `legacy/custom`
- النتيجة الحالية:
  - الشكل العام غير موحّد.
  - تجربة الموبايل الإدارية ليست app-like بشكل كافٍ.
  - كلفة الصيانة عالية لأن الـ UI stack غير موحّد.

## Architecture Decisions
- اعتماد `Tailwind + shadcn/Radix` كـ standard رسمي لأي UI إداري جديد.
- منع إدخال `MUI` جديد في صفحات الإدارة من تاريخ اعتماد الخطة.
- اعتبار `OrderInvoices` صفحة pilot reference للتحويل القادم.
- اعتبار `Layout.tsx` و`ThreeTierSidebar.tsx` و`SuperAdminLayout.tsx` طبقات حاكمة ذات أولوية أعلى من تحويل الصفحات الفردية.
- معالجة “تجربة الموبايل” و“ترحيل design system” كمسارين متوازيين مع checkpoints مشتركة.

## Non-Goals
- لا يوجد rewrite شامل لكل صفحات الإدارة في Sprint واحد.
- لا يوجد توحيد فوري لكل صفحة legacy قبل تثبيت الـ primitives والـ shell.
- لا يشمل هذا العمل storefront العام أو الـ public pages.

## Relevant Existing Files
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Layout.tsx`
- `frontend/src/components/layout/SuperAdminLayout.tsx`
- `frontend/src/components/layout/sidebar/ThreeTierSidebar.tsx`
- `frontend/src/components/layout/sidebar/SidebarLayoutFactory.tsx`
- `frontend/src/styles/index.css`
- `frontend/src/components/ui/**`
- `frontend/src/pages/admin/OrderInvoices.tsx`
- `frontend/src/pages/super-admin/**`

## Workstreams

### Workstream A: Mobile-App-Like Admin Experience
هدفه تحويل الإطار الإداري المشترك إلى تجربة موبايل أكثر إحكامًا: app bar مضغوط، drawer واضح، bottom sheets، sticky actions، وتقليل المسافات الفارغة والمحتوى غير الضروري.

### Workstream B: Tailwind + shadcn/Radix Migration
هدفه توحيد التصميم والمكوّنات وإزالة الاعتماد التدريجي على `MUI` و`Headless UI` في الصفحات الإدارية.

## Priority Rules
رتّب الصفحات وفقًا لهذه الأولوية:

1. الصفحات التي يستخدمها الفريق يوميًا أو تظهر لمعظم مستخدمي الإدارة.
2. الصفحات التي تشترك في مكوّنات أو layout موحّد يمكن reuse منه لاحقًا.
3. الصفحات التي تعتمد على `MUI` داخل shell أو toolbar أو tables بشكل يضاعف التشتت.
4. الصفحات التي لديها مشاكل mobile واضحة أو مساحة مهدرة.
5. الصفحات الأقل استخدامًا أو الثقيلة جدًا تُترك لمراحل لاحقة.

## Sprint 1: Shell Foundation for Mobile
**Goal**: جعل shell الإدارة نفسه أقرب لتطبيق موبايل، بحيث تستفيد منه أغلب الصفحات مباشرة.

**Demo/Validation**:
- الهيدر العلوي على الموبايل صف واحد مضغوط.
- السايدبار الموبايل يعمل كسلوك `accordion + drawer` واضح.
- الصفحات الإدارية الرئيسية لا تبدو “desktop crammed into mobile”.

### Task 1.1: تثبيت قواعد mobile shell المشتركة
- **Location**:
  - `frontend/src/components/layout/Layout.tsx`
  - `frontend/src/styles/index.css`
- **Description**: ضبط app bar الموبايل، تقليل الفراغات، إخفاء النصوص الثانوية غير الضرورية، وضبط profile/actions row.
- **Dependencies**: None
- **Acceptance Criteria**:
  - الهيدر الإداري على الموبايل لا يتجاوز صفًا واحدًا في الوضع الطبيعي.
  - الأيقونات والـ profile لا تزاحم المحتوى.
  - المساحة الرأسية المهدرة تقل بشكل واضح.
- **Validation**:
  - Manual QA على 3 صفحات إدارية مختلفة.

### Task 1.2: توحيد سلوك mobile drawer والـ nested navigation
- **Location**:
  - `frontend/src/components/layout/sidebar/ThreeTierSidebar.tsx`
  - `frontend/src/components/layout/sidebar/SidebarLayoutFactory.tsx`
  - `frontend/src/styles/index.css`
- **Description**: اعتماد drawer بسلوك واضح للقوائم الفرعية، مع فتح/غلق sections بشكل متوقع، وإغلاق القائمة بعد اختيار رابط.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - كل section يفتح روابطه بوضوح.
  - لا توجد taps “لا تفعل شيئًا”.
  - التنقل من القائمة يغلق drawer على الموبايل.
- **Validation**:
  - Manual QA على sections متعددة مثل orders/customers/settings.

### Task 1.3: تعريف mobile interaction patterns المشتركة
- **Location**:
  - `frontend/src/components/ui/**`
  - `frontend/src/styles/index.css`
- **Description**: تثبيت pattern واضح لـ bottom sheet, sticky action bars, compact filters, horizontal stat cards.
- **Dependencies**: Tasks 1.1-1.2
- **Acceptance Criteria**:
  - لدينا patterns reusable بدل حلول page-specific.
  - أي صفحة لاحقة يمكنها استخدام نفس mobile primitives.
- **Validation**:
  - Review داخلي على مثالين على الأقل.

### Checkpoint: After Sprint 1
- [ ] الـ shell الإداري على الموبايل يبدو intentional وليس مجرد responsive fallback.
- [ ] التنقل الجانبي لا يحتوي على blockers.
- [ ] يمكن بدء تحويل الصفحات على هذا الأساس بدون إعادة بناء shell من جديد.

## Sprint 2: Design System Hardening
**Goal**: تثبيت design system إداري موحد قبل نقل المزيد من الصفحات.

**Demo/Validation**:
- وجود tokens موحدة للألوان والمسافات والـ radius والـ typography.
- وجود library صغيرة لكن كافية من shared components الإدارية.
- منع إضافة `MUI` جديد في الشغل القادم.

### Task 2.1: توثيق قواعد الـ admin design system
- **Location**:
  - `docs/admin-mobile-shell-and-tailwind-migration-plan.md`
  - ملف design tokens أو notes داخل `frontend/src/styles` أو `frontend/src/components/ui`
- **Description**: تعريف قواعد اللون، spacing، cards، filters، headers، tables، badges، dialogs، sheets.
- **Dependencies**: Sprint 1
- **Acceptance Criteria**:
  - يوجد مرجع واضح لأي صفحة جديدة.
  - لا نكرر “قرار التصميم” في كل صفحة من الصفر.
- **Validation**:
  - Manual review مع مقارنة صفحتين مختلفتين.

### Task 2.2: بناء shared admin primitives فوق shadcn
- **Location**:
  - `frontend/src/components/ui/**`
  - `frontend/src/components/admin/**` إذا لزم
- **Description**: إنشاء wrappers ومكوّنات مشتركة مثل:
  - `AdminPageHeader`
  - `AdminStatsStrip`
  - `AdminFilterSheet`
  - `AdminDataCard`
  - `AdminSectionCard`
  - `AdminEmptyState`
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - 4-6 primitives على الأقل reusable فعليًا.
  - لا نعتمد على نسخ/لصق layout بين الصفحات.
- **Validation**:
  - تطبيقهم على صفحة pilot وصفحة ثانية.

### Task 2.3: وضع guardrails للهجرة
- **Location**:
  - lint/docs/contribution notes حسب ما يناسب المشروع
- **Description**: إضافة rule عمل واضحة:
  - `No new MUI in admin`
  - `Prefer shadcn/Radix primitives`
  - `Use mobile sheet pattern for filters on small screens`
- **Dependencies**: Tasks 2.1-2.2
- **Acceptance Criteria**:
  - أي مساهمة جديدة لا تعيد التشتت السابق.
- **Validation**:
  - Code review checklist.

### Checkpoint: After Sprint 2
- [ ] يوجد foundation موحد للتحويل.
- [ ] الصفحات الجديدة يمكن بناؤها بسرعة من نفس الـ kit.
- [ ] الشغل القادم لن يضيف debt جديد.

## Sprint 3: Phase 1 Page Migration
**Goal**: تحويل الصفحات الإدارية الأعلى أثرًا إلى `Tailwind + shadcn/Radix`.

**Demo/Validation**:
- 3-5 صفحات رئيسية migrated بالكامل.
- look & feel موحّد بينها.
- mobile behavior واضح ومتماسك.

### Task 3.1: اعتماد `OrderInvoices` كمرجع نهائي
- **Location**: `frontend/src/pages/admin/OrderInvoices.tsx`
- **Description**: إنهاء polish الصفحة الحالية واعتمادها template reference للهجرة.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - الصفحة صالحة كـ reference من حيث header/stats/filter/table/mobile cards.
  - لا توجد regressions معروفة مفتوحة داخلها قبل استخدامها كنموذج.
- **Validation**:
  - Browser QA
  - targeted lint/type checks

### Task 3.2: تحويل صفحات MUI الإدارية الأعلى قيمة
- **Suggested First Batch**:
  - `CompanyDashboard`
  - `CompanyLinks`
  - `UsersManagement`
  - `RolesManagement`
  - `WalletManagement`
- **Description**: اختيار batch صغير يجمع بين كثافة الاستخدام وإمكانية reuse.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - كل صفحة تتحول دون بقاء MUI visual islands داخلها.
  - تستخدم الـ primitives المشتركة بدل بناء UI جديد من الصفر.
- **Validation**:
  - Page-by-page QA
  - smoke navigation on mobile and desktop

### Task 3.3: إزالة `Headless UI` كمسار ثالث
- **Suggested First Target**:
  - `OrderDetails`
- **Description**: ضم الصفحة الوحيدة المعتمدة على `Headless UI` إلى stack الرسمي الجديد.
- **Dependencies**: Task 3.2
- **Acceptance Criteria**:
  - لا يبقى stack ثالث داخل الإدارة.
- **Validation**:
  - smoke QA على الصفحة

### Checkpoint: After Sprint 3
- [ ] تم إثبات أن الهجرة قابلة للتكرار.
- [ ] لدينا batch أول من الصفحات الموحدة.
- [ ] الـ UI debt بدأ ينخفض فعليًا بدل التنظير فقط.

## Sprint 4: Super Admin and Shared Admin Surfaces
**Goal**: معالجة الطبقات ذات التأثير الأفقي الكبير، خاصة ما يخص super admin.

**Demo/Validation**:
- `SuperAdminLayout` لم يعد مصدرًا رئيسيًا لـ MUI look-and-feel.
- صفحات super admin الأساسية متوافقة مع shell الإدارة الجديد.

### Task 4.1: تحويل `SuperAdminLayout`
- **Location**: `frontend/src/components/layout/SuperAdminLayout.tsx`
- **Description**: إزالة الاعتماد البصري الرئيسي على `MUI` من shell الـ super admin.
- **Dependencies**: Sprint 2
- **Acceptance Criteria**:
  - shell موحّد بصريًا مع بقية الإدارة.
  - mobile drawer/header متسقان مع layout الرئيسي.
- **Validation**:
  - browser QA على صفحات super admin

### Task 4.2: تحويل أهم صفحات super admin
- **Suggested Batch**:
  - `SuperAdminReports`
  - `SuperAdminAiLogs`
  - `UsersManagement`
  - `RolesManagement`
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - صفحات المتابعة والإدارة المركزية تصبح على stack موحّد.
- **Validation**:
  - smoke QA

### Checkpoint: After Sprint 4
- [ ] الـ admin shell والـ super admin shell أصبحا أقرب لنظام واحد.
- [ ] لم يعد MUI ظاهرًا في أكثر المناطق الإدارية حساسية.

## Sprint 5: Legacy Surface Reduction
**Goal**: تقليل الصفحات `legacy/custom` تدريجيًا دون تعطيل الشغل الجاري.

**Demo/Validation**:
- صفحات legacy الأكثر استخدامًا بدأت تدخل تحت نفس النظام.
- لم يعد لدينا “شكل مختلف تمامًا” بين المناطق الأساسية.

### Task 5.1: تصنيف الصفحات legacy حسب business value
- **Buckets**:
  - Daily-use
  - Weekly-use
  - Rare/admin-only
- **Description**: ترتيب backlog واضح للـ 52 صفحة legacy بدل المعالجة العشوائية.
- **Dependencies**: Sprint 3
- **Acceptance Criteria**:
  - كل صفحة legacy لها bucket وأولوية.
- **Validation**:
  - Review backlog

### Task 5.2: تحويل pages by feature clusters
- **Suggested Clusters**:
  - Orders cluster
  - Customers cluster
  - Settings cluster
  - HR cluster
  - Reports cluster
- **Description**: الترحيل يتم cluster-by-cluster لتقليل تكرار الشغل.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - كل cluster يستخدم نفس primitives ونفس mobile behavior.
- **Validation**:
  - feature smoke test per cluster

### Checkpoint: After Sprint 5
- [ ] الدين التصميمي أصبح تحت السيطرة.
- [ ] أغلب المناطق النشطة صارت موحّدة.

## Delivery Sequence Recommendation
أفضل ترتيب عملي للتنفيذ:

1. Sprint 1 بالكامل
2. Sprint 2 بالكامل
3. Sprint 3 على batch صغير جدًا
4. Sprint 4 إن كان super admin أولوية تشغيلية
5. Sprint 5 كبرنامج مستمر

## Suggested First 30-Day Scope
- الأسبوع 1:
  - تثبيت mobile shell
  - إنهاء sidebar/app bar patterns
- الأسبوع 2:
  - تثبيت shared primitives
  - توثيق الـ design rules
- الأسبوع 3:
  - إنهاء `OrderInvoices`
  - بدء أول صفحتين MUI
- الأسبوع 4:
  - إكمال أول batch
  - قرار: نبدأ super admin أم cluster تاني من admin

## Risks and Mitigations
- **Risk**: تحويل صفحات كثيرة قبل تثبيت primitives
  - **Impact**: High
  - **Mitigation**: ممنوع بدء batch كبير قبل نهاية Sprint 2
- **Risk**: التركيز على الشكل دون سلوك الموبايل
  - **Impact**: High
  - **Mitigation**: كل صفحة migrated لازم تمرّ browser QA على mobile emulation
- **Risk**: بقاء MUI في shells المشتركة
  - **Impact**: High
  - **Mitigation**: رفع أولوية `Layout` و`SuperAdminLayout`
- **Risk**: تحويل صفحات قليلة لكن بشكل غير reusable
  - **Impact**: Medium
  - **Mitigation**: أي page migration يجب أن تستخرج primitives مشتركة إن تكرر pattern

## Validation Strategy
- لكل Sprint:
  - `eslint` محلي على الملفات المتأثرة
  - targeted `tsc` حيث أمكن
  - browser QA على desktop + mobile emulation
- لكل صفحة migrated:
  - navigation works
  - filters/search/actions work
  - no obvious visual overflow on mobile
  - loading/empty/error states موجودة

## Rollback Plan
- الترحيل يتم صفحة بصفحة أو cluster بcluster.
- إذا ظهرت regressions:
  - نوقف batch الحالي
  - نثبت primitives أولًا
  - نعيد جدولة الصفحة المتعثرة بدل تعطيل البرنامج بالكامل

## Recommended First Execution Pack
إذا أردنا البدء فورًا بدون نقاش إضافي، فهذا أفضل pack أول:

1. إنهاء Sprint 1 بالكامل
2. تثبيت 4-6 admin primitives مشتركة
3. اعتماد `OrderInvoices` كمرجع نهائي
4. تحويل:
   - `CompanyDashboard`
   - `CompanyLinks`
   - `UsersManagement`
5. بعدها نقرر:
   - إما `SuperAdminLayout`
   - أو Orders/Customers cluster التالي

## Assumptions
- المستخدم يريد توحيد كل صفحات الإدارة فقط، وليس storefront.
- الأولوية للجودة وقابلية التكرار، وليس لأسرع rewrite شامل.
- يمكننا اعتماد `Tailwind + shadcn/Radix` كاتجاه رسمي من الآن.
