# تقرير تنفيذ تيكت CI-ENTRY-1 — حل انسداد بوابة `Check Entry Chunk Purity`

**التاريخ:** 2026-11-03  
**الريبو:** `C:\maxp-platform-13`  
**الحالة النهائية:** تم بنجاح ✅ (تم فك الانسداد والنشر للإنتاج بنجاح)

---

## 1. إعادة إنتاج الخطأ محليًا (الخطأ الحرفي)

تم بناء الفرونت محليًا وتشغيل البوابة `node scripts/check-entry-chunks.cjs` من داخل `apps/frontend`:

```text
❌ Entry chunk check failed (dist/assets/index-wTQVyaWf.js):
  always-loaded chunk "App-DRj1WKW1.js" statically imports route chunk "route-marketplace-DPyqTeiM.js" — every page (public landings included) downloads it. Make the edge lazy or move the shared module into a neutral app-* chunk (see APP_SHARED_CORE patterns in vite.config.ts).
```

- **كود الخروج:** `1`
- **السبب الجذري:** كوميت `e514268f` أضاف استيرادًا استاتيكيًا في `App.tsx`:
  `import { supportsAppSettings, APP_SETTINGS_SLUGS } from "./pages/marketplace/appSettingsSupport";`
  ولأن الموديول كان داخل `src/pages/marketplace/`، قام Vite بتجميعه ضمن `route-marketplace`، مما جعل chunk الـ `App` دائم التحميل يستورد `route-marketplace` استاتيكيًا (مخالفة مباشرة للقاعدة 1b في فحص نقاء الـ Entry Chunk).

---

## 2. الإصلاح والتحقق المحلي

- **الإصلاح المطبق:**
  1. نقل `appSettingsSupport.ts` من مسار الصفحات إلى المسار المشترك المحايد: `src/config/appSettingsSupport.ts`.
  2. إضافة الموديول إلى `APP_SHARED_CORE_MODULE_PATTERN` في `apps/frontend/vite.config.ts` لضمان وجوده ضمن `app-shared-core` المحايد وليس أي `route-*`.
  3. تحديث مسارات الاستيراد في المكونات الخمسة والمواصفة `appSettingsSupport.test.tsx`.
  4. كوميت الإصلاح: `0e9052f90` (`fix(build): keep appSettingsSupport out of route-marketplace so the entry stays pure`).

- **التحقق من بوابة Entry Chunks:**
  - مخرج البوابة:
    ```text
    ✅ Entry chunk is clean (assets/index-Cck-4XX4.js, 12KB): no static route-chunk imports, within size budget.
    ```
  - كود الخروج: `0`
  - حجم ملف الـ Entry: **12,664 بايت** (12.37 KB) — ضمن الميزانية الصارمة `<= 150KB` (153,600 بايت).

- **التحقق من اختبارات الميزات (Vitest):**
  - تم التشغيل بالـ Node المناسب (`Node v22.23.4`):
    ```bash
    npx vitest run src/pages/marketplace/__tests__/appSettingsSupport.test.tsx
    ```
  - المخرج:
    ```text
    ✓ src/pages/marketplace/__tests__/appSettingsSupport.test.tsx (5 tests) 153ms
    Test Files  1 passed (1)
         Tests  5 passed (5)
    ```

---

## 3. التحقق من CI والنشر على الإنتاج

- **رقم تشغيل GitHub Actions (Run ID):** `41646762103`
- **الحالة:** `completed / success` (المدة: 9 دقائق و15 ثانية)
- **خطوات التحقق في الـ Run:**
  - `Build & Verify`: خطوة `Check Entry Chunk Purity` = **success (exit 0)**
    `✅ Entry chunk is clean (assets/index-3bArNM3Q.js, 12KB): no static route-chunk imports, within size budget.`
  - `Deploy to Server (never cancel)`: خطوة `Run Deployment Script on Server` = **success (exit 0)**
    ```text
    out: ℹ️ Admin entry expected: assets/index-3bArNM3Q.js | served(br): assets/index-3bArNM3Q.js | served(identity): assets/index-3bArNM3Q.js
    out: ✅ Admin app serves the deployed build (br: assets/index-3bArNM3Q.js, identity: assets/index-3bArNM3Q.js)
    out: ✅ Deployment completed successfully with zero-downtime integrity!
    ```

---

## 4. فحص بصمة الإنتاج

- الرابط المباشر: `https://maxp.online/`
- البصمة المنشورة الحالية: `assets/index-3bArNM3Q.js` (استجابة HTTP 200).
- تم بنجاح فك الحظر ونشر كافة الكوميتات المعلقة منذ الساعة `12:11Z` (بما فيها الشحن، وسجل تدقيق المنتجات، ولوحة السوبر أدمن، وإعدادات الماركت بليس).
