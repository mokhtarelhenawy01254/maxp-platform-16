# خطة إصلاح صفحة إدارة الفروع (Booking Branches)

**تاريخ الإنشاء**: 2026-07-10
**التعقيد**: High
**الملف المستهدف**: `apps/frontend/src/pages/admin/BookingManagementPage.tsx` (1407 سطر)

---

## الأهداف الإستراتيجية

| الهدف | الوصف |
|-------|-------|
| **H1** — Modularity | تفكيك الملف الضخم إلى components مستقلة في ملفات منفصلة |
| **H2** — Type Safety | تصحيح TypeScript types لتطابق الواقع (لا types كاذبة) |
| **H3** — Input Validation | منع البيانات الفاسدة قبل وصولها لـ API |
| **H4** — Image Handling | استبدال base64 برفع صور تقليدي مع compress |
| **H5** — Error UX | استبدال alert/confirm بمكونات toast و modal مخصصة |
| **H6** — Performance | Normalize البيانات عند الاستلام، إضافة pagination/search |
| **H7** — Test Coverage | تغطية لا تقل عن 70% للـ branches tab |

---

## معايير النجاح

- كل component في ملف منفصل — **0 components inline داخل BookingManagementPage**
- `genderDays` و `workingDays` معرفين types حقيقية — **zero `as string` كذب**
- الـ form بيرفض اسم فاضي، رقم تلفون غير صالح، بداية > نهاية
- رفع الصور يتم كـ `multipart/form-data` وليس base64
- `alert()` و `confirm()` مستبدلين بـ toast/modal components
- الفروع فيها search و pagination (client-side للـ <50, server-side بعدها)
- Jest tests للمكونات الجديدة — minimum 70% line coverage
- الـ 1407 سطر يقلوا لـ <200 سطر في الملف الرئيسي (الباقي import)

---

## Sprint 1: تفكيك الملف العملاق (Modularization)

**الهدف**: تقطيع BookingManagementPage.tsx إلى ملفات منفصلة — كل component في مكانه.

**المدة المقدرة**: 3-4 أيام
**Demo**: الصفحة شغالة تمامًا زي قبل — لا تغيير في السلوك، فقط إعادة توزيع.

### Task 1.1 — إنشاء مجلد booking/ وملفات components
- **الموقع**: `apps/frontend/src/pages/admin/booking/`
- **الوصف**: إنشاء المجلد ونقل كل component لملفه:
  - `BranchModal.tsx` (أسطر 112-248)
  - `DoctorModal.tsx` (أسطر 250-285)
  - `ServiceModal.tsx` (أسطر 289-390)
  - `AppointmentModal.tsx` (أسطر 399-540)
  - `ServiceDetailModal.tsx` (لو موجود)
- **المخرجات**: 5 ملفات مودال، كلها تستورد `MODAL_CONTENT_CLS`, `MODAL_INPUT_CLS`, `fetchJson` من ملف shared
- **Validation**: `npm test` — كل imports سليمة، الصفحة تفتح بدون errors

### Task 1.2 — إنشاء shared utils/helpers
- **الموقع**: `apps/frontend/src/pages/admin/booking/shared.ts`
- **الوصف**: نقل `MODAL_CONTENT_CLS`, `MODAL_INPUT_CLS`, `api()`, `getAuthHeaders()`, `getCompanyId()`, `fetchJson()`, `STATUS_MAP`, `BookingBranc` وغيرها من interfaces
- **المخرجات**: ملف واحد مركز للـ shared code

### Task 1.3 — نقل render functions لـ tab components
- **الموقع**:
  - `apps/frontend/src/pages/admin/booking/BranchesTab.tsx`
  - `apps/frontend/src/pages/admin/booking/DashboardTab.tsx`
  - `apps/frontend/src/pages/admin/booking/DoctorsTab.tsx`
  - `apps/frontend/src/pages/admin/booking/ServicesTab.tsx`
  - `apps/frontend/src/pages/admin/booking/AppointmentsTab.tsx`
  - `apps/frontend/src/pages/admin/booking/CalendarTab.tsx`
- **الوصف**: `renderBranches()` → `BranchesTab` component، وهكذا لكل tab. كل tab يستقبل props (branches, doctors, services, appointments, callbacks)
- **التحقق**: `git diff --stat` يظهر إضافة 6-8 ملفات، والملف الأصلي ناقص 1000+ سطر

### Task 1.4 — تبسيط BookingManagementPage.tsx
- **الوصف**: الملف الرئيسي يبقى مجرد orchestrator — يستورد tabs، يمرر props، يدير الـ routing
- **المخرجات**: `BookingManagementPage.tsx` < 200 سطر
- **التحقق**: `wc -l BookingManagementPage.tsx` < 200

---

## Sprint 2: تصحيح الأنواع (Type Safety)

**الهدف**: إزالة types الكاذبة وفرض types حقيقية.

**المدة**: 1-2 يوم

### Task 2.1 — تعريف types حقيقية لـ workingDays و genderDays
- **الوصف**: استبدال `workingDays: string` في `BookingBranch` بـ `workingDays: Record<string, string> | string` (مع union للحالة القديمة)، أو normalize فور الاستلام
  ```ts
  type WorkingDaysMap = Record<string, string>; // { "sat": "09:00-22:00" }
  type GenderDaysMap = { male: string[]; female: string[] };
  ```
- **الموقع**: `shared.ts`
- **التحقق**: TypeScript compiler يعمل بدون `any` أو `as` في كل الملفات الجديدة

### Task 2.2 — إزالة `any` من saveService و saveAppointment
- **الوصف**: `onSave: (d: any) => Promise<void>` → types محددة لكل save function
- **الموقع**: كل save functions في الملفات الجديدة
- **التحقق**: `npx tsc --noEmit` بيمر من غير errors

### Task 2.3 — Normalize البيانات عند fetch
- **الوصف**: في `fetchBranches()`، تحويل `workingDays` من string لـ object مرة واحدة بدل ما يتكرر الـ JSON.parse في كل render
  ```ts
  const normalizeBranch = (b: RawBranch): Branch => ({
    ...b,
    workingDays: typeof b.workingDays === 'string' ? JSON.parse(b.workingDays) : b.workingDays,
    genderDays: typeof b.genderDays === 'string' ? JSON.parse(b.genderDays) : b.genderDays,
  });
  ```
- **الموقع**: `shared.ts` أو `useBranches.ts` hook
- **التحقق**: الـ render functions بتستخدم `b.workingDays` مباشرة object بدون parse — أقل كود في كل tab

---

## Sprint 3: Validation & Error Handling

**الهدف**: منع البيانات الفاسدة وتجربة مستخدم أفضل للأخطاء.

**المدة**: 2-3 أيام

### Task 3.1 — إضافة form validation لـ BranchModal
- **الوصف**: Validation قبل الـ save:
  - الاسم: required، ≥ 2 حروف
  - الهاتف: رقم صحيح بـ pattern (01xxxxxxxxx) — optional validation لكل رقم في الـ array
  - `workStart` < `workEnd`
  - `maxBookingsPerSlot` ≥ 1
  - landmarkImage: max size (2MB)
- **الموقع**: `BranchModal.tsx`
- **الآلية**: state errors `Record<string, string>` — تظهر رسائل حمراء تحت الـ inputs
- **التحقق**: محاولة حفظ فراغ — تظهر رسائل خطأ، لا API call

### Task 3.2 — استبدال `alert()` بـ Toast component
- **الوصف**: إنشاء `ToastContext` أو استخدام مكتبة موجودة (تحقق لو في react-hot-toast أو sonner)
- **الموقع**: `components/ui/Toast.tsx`
- **الاستبدال**: كل `alert(data.error || "...")` → `toast.error(data.error)`
- **التحقق**: الـ app ما تستخدمش `alert()` في الـ booking modules

### Task 3.3 — استبدال `confirm()` بـ ConfirmModal
- **الوصف**: `ConfirmModal` component (title, message, confirm/cancel buttons, مودال)
- **الموقع**: `components/ui/ConfirmModal.tsx`
- **التحقق**: حذف فرع — يظهر مودال جميل بدل browser confirm

### Task 3.4 — إضافة Error Boundaries
- **الوصف**: ErrorBoundary لكل tab branch بحيث لو tab وقع، ما يأثرش على باقي التبس
- **الموقع**: `components/ErrorBoundary.tsx`
- **التحقق**: إدخال force error في branches tab — باقي التبس شغالة

---

## Sprint 4: Image Upload Overhaul

**الهدف**: استبدال base64 بـ upload تقليدي مع compress.

**المدة**: 1-2 يوم

### Task 4.1 — تغيير landmarkImage لـ multipart upload
- **الوصف**: بدل تحويل الصورة لـ base64 وإرسالها في JSON body، نستخدم `multipart/form-data` مع `FormData`
  - إضافة `<input type="file">` بدون FileReader
  - عند save، إنشاء FormData وإضافة الحقول النصية + الـ file
- **الموقع**: `BranchModal.tsx`, `saveBranch()`
- **ملاحظة**: التعديل يتطلب تغيير في الـ backend routes كمان لقبول `multipart/form-data`
- **التحقق**: رفع صورة 10MB — الـ API يستقبلها كـ file مش string

### Task 4.2 — إضافة client-side image compression
- **الوصف**: قبل الرفع، compress الصورة لـ max 1200px و JPEG quality 0.8 باستخدام Canvas API
- **الموقع**: `utils/imageCompress.ts`
- **التحقق**: صورة 5MB تتحول لـ <500KB

### Task 4.3 — إضافة progress indicator للرفع
- **الوصف**: `XMLHttpRequest.upload.onprogress` أو `fetch` مع tracking
- **الموقع**: `BranchModal.tsx`
- **التحقق**: المستخدم يشوف progress bar أثناء رفع الصورة

---

## Sprint 5: UX & Performance

**الهدف**: تحسين تجربة المستخدم — search, pagination, loading states.

**المدة**: 2-3 أيام

### Task 5.1 — إضافة search للفروع
- **الوصف**: search input فوق table/cards يفلتر branches حسب الاسم أو العنوان
- **الموقع**: `BranchesTab.tsx`
- **التحقق**: كتابة "عيادة" — تظهر الفروع اللي فيها "عيادة" فقط

### Task 5.2 — إضافة client-side pagination
- **الوصف**: Table و Cards بحد أقصى 10 فروع في الصفحة، مع pagination controls
- **الموقع**: `BranchesTab.tsx`
- **التحقق**: لو 15 فرع — الصفحة 1: 10 فروع، الصفحة 2: 5 فروع

### Task 5.3 — إضافة loading skeletons
- **الوصف**: Skeleton components (شكل table/cards وهمي) تظهر وقت تحميل البيانات
- **الموقع**: `components/ui/Skeleton.tsx`, `BranchesTab.tsx`
- **التحقق**: الـ loading state يظهر skeleton مش "جاري التحميل..."

### Task 5.4 — إزالة الإيراد الوهمي من الـ dashboard
- **الوصف**: `revenue: branchAppointments.reduce(...) * 100` — إما نستخدم إيراد حقيقي أو نحذف الـ card
- **الموقع**: `DashboardTab.tsx`
- **التحقق**: Dashboard ما يظهرش "200" كإيراد وهمي

### Task 5.5 — Filter per tab logic
- **الوصف**: الـ `selectedBranchId` filter يفلتر branches tab نفسه (يظهر الفرع المختار فقط)
- **الموقع**: `BranchesTab.tsx`, `BookingManagementPage.tsx`
- **التحقق**: اختيار فرع في الـ dropdown — الـ branches tab يظهر فرع واحد بس

---

## Sprint 6: API Layer & Backend Alignment

**الهدف**: تجهيز الـ backend للتغييرات الجديدة (multipart, validation).

**المدة**: 1-2 يوم

### Task 6.1 — تحديث route لقبول multipart/form-data
- **الوصف**: استبدال `express.json()` في الـ booking routes بـ `multer` middleware للـ image upload
- **الموقع**: `apps/backend/routes/bookingBranchesRoutes.js`, `apps/backend/controller/bookingBranchesController.js`
- **التحقق**: `curl -F "image=@photo.jpg" -F "name=test" POST /api/v1/booking/branches` ينجح

### Task 6.2 — إضافة backend validation
- **الوصف**: تحقق من صحة البيانات في الـ controller قبل prisma — name required, phone format, time logic
- **الموقع**: `bookingBranchesController.js`
- **التحقق**: إرسال بيانات فاسدة — يرد 400 validation error مش 500

### Task 6.3 — إضافة sanitization للـ workingDays/ genderDays
- **الوصف**: التأكد إن keys صالحة (sat-sun), values format صحيح (HH:mm-HH:mm), maxBookingsPerSlot ≥ 1
- **الموقع**: `bookingBranchesController.js`
- **التحقق**: إرسال `{ workingDays: { "invalid": "x" } }` → 400

---

## Sprint 7: Testing

**الهدف**: achieving >70% coverage للـ branches components.

**المدة**: 2-3 أيام

### Task 7.1 — Unit tests لـ BranchModal
- **الموقع**: `apps/frontend/src/pages/admin/booking/__tests__/BranchModal.test.tsx`
- **الوصف**: Jest + Testing Library tests:
  - Rendering with empty branch → shows "إضافة فرع"
  - Rendering with existing branch → shows "تعديل فرع"
  - Form fields update on user input
  - Validation errors appear on empty submit
  - Validation passes with valid data
  - Phone add/remove works
  - Working day toggle works
  - Gender day toggle works
  - Image upload shows preview
- **Validation**: `npx jest --testPathPattern=BranchModal --coverage` ≥ 70%

### Task 7.2 — Unit tests لـ BranchesTab
- **الموقع**: `apps/frontend/src/pages/admin/booking/__tests__/BranchesTab.test.tsx`
- **الوصف**:
  - Renders branch list (desktop table & mobile cards)
  - Empty state shows "لا توجد فروع"
  - Search filters branches by name
  - Pagination works with 15 branches
  - Edit button opens modal
  - Delete button shows confirm modal
  - Toggle active works
- **Validation**: `npx jest --testPathPattern=BranchesTab --coverage` ≥ 70%

### Task 7.3 — Integration tests لـ shared.ts
- **الموقع**: `apps/frontend/src/pages/admin/booking/__tests__/shared.test.ts`
- **الوصف**:
  - `fetchJson` retries on 502/503
  - `api()` builds correct URL with companyId
  - `normalizeBranch()` handles string/object workingDays
- **Validation**: `npx jest --testPathPattern=shared --coverage` ≥ 80%

### Task 7.4 — Backend route tests
- **الموقع**: `apps/backend/tests/routes/bookingBranches.test.js`
- **الوصف**: Supertest tests:
  - GET returns branches list
  - POST with valid data creates branch
  - POST with missing name returns 400
  - PUT /:id updates branch
  - DELETE /:id removes branch
  - Image upload via multipart works
- **Validation**: `npx jest tests/routes/bookingBranches.test.js` passes

### Task 7.5 — E2E smoke test (Playwright)
- **الموقع**: مستقبلي — `tests/e2e/booking-branches.spec.ts` (اختياري، Sprint 7 لو فيه وقت)
- **الوصف**: Playwright test بيفتح الصفحة، يضيف فرع، يعدله، يحذفه
- **Validation**: `npx playwright test booking-branches.spec.ts` passes

---

## اختبارات عامة بعد كل Sprint

| Sprint | اختبار |
|--------|--------|
| Sprint 1 | `npm run lint` + `npx tsc --noEmit` — no errors |
| Sprint 2 | `npx tsc --noEmit` — zero type errors |
| Sprint 3 | محاولة إدخال بيانات فاسدة — validation errors، لا alert |
| Sprint 4 | رفع صورة 8MB — الصورة بتتنزل كـ file وبتظهر صح |
| Sprint 5 | تصفح 30 فرع مع search — تجربة سلسة بدون lag |
| Sprint 6 | `curl` tests للـ API الجديد |
| Sprint 7 | `npx jest --coverage` — ≥ 70% overall |

---

## الـ Gotchas والمخاطر

1. **Sprint 1 خطر كبير** — تفكيك 1400 سطر دفعة واحدة ممكن يكسر حاجات تانية. **الحل**: كل task بـ PR منفصل، اختبار يدوي + `tcs --noEmit` قبل كل merge.
2. **multipart/form-data في Sprint 4** — الـ backend حالياً بيستخدم `express.json()`. Multer بيضيف middleware جديد. لازم نتأكد إن الـ routes التانية مش بتتأثر.
3. **التعريب** — كل الـ UI بالعربي. التأكد إن components الجديدة بتستخدم نفس نظام الترجمة (أو hardcoded Arabic consistent مع الموجود).
4. **الـ mobile cards** — Sprint 5 pagination ممكن يبوظ layout الكاردات في الموبايل. **الحل**: تصميم pagination أفقي (Load More) في الموبايل مش أرقام صفحات.
5. **الـ types union** (`string | object`) في Sprint 2 — الـ codebase فيها بيانات قديمة workingDays كـ string. لازم normalize عند fetch، مش إجبار الجميع يتحديث مرة واحدة.

---

## Rollback Plan

- **قبل كل Sprint**: `git tag booking-branches-before-<sprint-N>` + commit
- **لو sprint فشل**: `git revert` للـ commits أو `git reset --hard` للـ tag + `git push --force-with-lease`
- **لو Sprint 1 فشل بسبب تعقيد الـ refactoring**: نرجع ونبدأ بـ extract components تدريجي (BranchModal أولاً، ثم tab واحد، إلخ) بدل الكل مرة واحدة
