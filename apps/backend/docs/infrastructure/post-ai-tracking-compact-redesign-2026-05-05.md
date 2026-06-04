# تحسين صفحة تتبع منتجات بوستات فيسبوك - 2026-05-05

## الهدف

تحويل `/posts/ai-tracking` من صفحة كروت كبيرة وممتدة إلى سطح تشغيل مضغوط يساعد فريق التشغيل على معرفة البوستات التي تحتاج ربط منتج، فلترتها، وتحديثها بسرعة.

## ما تغير

- أضيفت فلاتر server-side إلى `GET /api/v1/conversations/posts/ai-identification`:
  - البحث بالـ Post ID.
  - فلترة Page ID.
  - فلترة اسم صفحة فيسبوك من الصفحات المتصلة.
  - فلترة المنتج المرتبط.
  - حالة الربط: كل البوستات / بدون منتج / مرتبطة.
  - ترتيب حسب آخر زيارة، أول زيارة، أو عدد الزيارات.
- صار الـ API يرجع `summary` عامة على الشركة: إجمالي البوستات، المرتبطة بمنتج، بدون منتج، إجمالي ومتوسط الزيارات، والنشطة آخر 24 ساعة.
- صار الـ API يرجع أسماء صفحات فيسبوك المتصلة مع عدد البوستات المتتبعة لكل صفحة، وتظهر أسماء الصفحات مباشرة في الصفوف بدون انتظار جلب تفاصيل فيسبوك.
- تم تشديد صلاحية endpoints الخاصة بالصفحة لتقتصر على `SUPER_ADMIN` و`OWNER` و`COMPANY_ADMIN` و`MANAGER`، حتى لا يعتمد المنع على redirect الواجهة فقط.
- أعيد تصميم الواجهة:
  - Header ذكي ومضغوط.
  - Metrics صغيرة بدل البلوكات الكبيرة.
  - فلاتر قصيرة وواضحة.
  - صفوف compact تعرض المهم فقط: الحالة، Post ID، الصفحة، الزيارات، التواريخ، والمنتج.
  - تفاصيل فيسبوك أصبحت accordion صغير عند الحاجة.
  - تحديث جماعي لربط البوستات المحددة بمنتج واحد.

## الملفات

- `backend/controller/conversation/postDetailsController.js`
- `backend/tests/postAITrackingController.test.js`
- `frontend/src/services/postAITrackingService.ts`
- `frontend/src/pages/posts/PostAITracking.tsx`

## التحقق

- `backend: node --check controller/conversation/postDetailsController.js`
- `backend: npm test -- --runTestsByPath tests/postAITrackingController.test.js --runInBand`
- `frontend: npx eslint src/pages/posts/PostAITracking.tsx --max-warnings=0`
- `frontend: VITE_DISABLE_COMPRESSION=true npm run build`

## ملاحظات

- الجلسة الحالية في المتصفح الداخلي كانت بحساب تاجر، لذلك `/posts/ai-tracking` يتحول تلقائيا إلى `/merchant-portal` بسبب قواعد صلاحيات merchant. التحقق البصري الكامل يحتاج جلسة Owner/Company Admin أو Super Admin.
