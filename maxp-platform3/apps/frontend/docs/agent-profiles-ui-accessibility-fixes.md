# تحسينات UI/UX لصفحة Agent Profiles

## التاريخ
2026-06-19

## المشكلة
كانت صفحة `/admin/agent-profiles` تحتوي على:
- 33 مفتاح ترجمة مفقود يظهر للمستخدم كـ `agentProfiles.settings.*` بدل النصوص العربية/الإنجليزية.
- أزرار أيقونات بدون `aria-label` ولا `focus-visible`.
- بطاقات الأدوات والمهارات تستخدم `<div role="button">` بدل `<button>`.
- قائمة select native للـ autonomy موجودة داخل كارت قابل للضغط، مما يسبب تعارض clicks.
- الـ Header مزدحم جداً بمعلومات وإجراءات معاً.
- `transition-all` مستخدم في أماكن كثيرة.

## الحل
1. إضافة الـ 33 مفتاح ترجمة مفقود في `src/locales/{ar,en}/sections/agentProfiles.json` وتشغيل `i18n:merge`.
2. إضافة `aria-label` و `aria-hidden` للأيقونات الزخرفية.
3. تحويل بطاقات الأدوات/المهارات لـ `<button>` حقيقي مع `focus-visible:ring`.
4. إعادة هيكلة صف الأدوات: الـ select أصبح خارج الـ button في حاوية منفصلة.
5. تقسيم الـ Header إلى صف هوية + صف toolbar (موديل + أزرار المحادثة/التحديث/الحفظ).
6. استبدال `transition-all` بـ `transition-colors` أينما أمكن.
7. إضافة `document.title` ديناميكي حسب اسم الوكيل المختار.

## الملفات المعدلة
- `src/pages/admin/agent-profiles/AgentProfilesPage.tsx`
- `src/locales/ar/sections/agentProfiles.json`
- `src/locales/en/sections/agentProfiles.json`
- `src/locales/ar/translation.json`
- `src/locales/en/translation.json`

## التحقق
- `npx eslint src/pages/admin/agent-profiles/AgentProfilesPage.tsx` — لا أخطاء (تحذيران pre-existing لـ react-hooks/exhaustive-deps).
- `npm run build` — نجح.
- تم اختبار الصفحة على `localhost:3001` ببيانات وهمية.
