# Facebook Inbox Message Actions Click Menu

## Summary

تم تعديل أزرار إجراءات رسائل `/facebook-inbox` حتى لا تظهر تلقائيا عند المرور بالماوس فوق نص الرسالة. بدلا من ذلك تظهر نقطة/زر ثلاث نقاط صغير بجانب فقاعة الرسالة، وعند الضغط عليه تظهر إجراءات الرسالة مثل الرد، التحويل، التمييز، التفاعل، والحذف.

تم أيضا ضغط لوحة بيانات العميل الجانبية في نفس الصفحة لتقليل الارتفاع والمساحات الفارغة، بحيث تظهر هوية العميل والإحصائيات والتحكم الأساسي في مساحة أصغر وأكثر تركيزا.

## Files Changed

- `frontend/src/components/facebook-inbox/MessageBubble/MessageBubble.tsx`
- `frontend/src/components/facebook-inbox/CustomerProfile/CustomerProfile.tsx`

## Behavior

- إزالة فتح شريط الإجراءات من `onMouseEnter` و `onMouseLeave`.
- إضافة زر `MoreHorizontal` صغير بجانب كل رسالة.
- فتح قائمة الإجراءات عند الضغط على الزر فقط.
- إغلاق القائمة عند الضغط خارجها.
- إغلاق منتقي التفاعل تلقائيا عند إغلاق قائمة الإجراءات.
- تصغير زر الثلاث نقاط وأزرار الإجراءات، وتثبيت القائمة للداخل من حافة الرسالة حتى لا يتم قصها عند طرف الشات.
- تثبيت أبعاد الأزرار وإضافة ألوان واضحة لأيقونات التفاعل والرد والتمييز والتحويل والحذف.
- استبدال أنواع `any` القديمة في بيانات `metadata` و `attachments` بأنواع محددة حتى ينجح فحص ESLint المركز للملف.
- تصغير صورة العميل من 80px إلى 48px وتحويل الهيدر من تخطيط عمودي إلى صف مضغوط.
- دمج اسم العميل، سنة العميل، واسم صفحة فيسبوك في نفس كتلة الهوية.
- تحويل الطلبات والقيمة إلى مؤشر صغير بدلا من مساحة منفصلة كبيرة.
- ضغط قوائم الحالة والتعيين داخل شبكة تحكم قصيرة.
- دمج أزرار الصوت، الإشعارات، إنشاء الطلب، والحظر في شريط واحد بارتفاع 32px.
- تقليل هوامش التابات ومساحة المحتوى الداخلي للوحة.

## Verification

- `frontend: npx eslint src/components/facebook-inbox/MessageBubble/MessageBubble.tsx --max-warnings=0`
- `frontend: npx eslint src/components/facebook-inbox/MessageBubble/MessageBubble.tsx src/components/facebook-inbox/CustomerProfile/CustomerProfile.tsx --max-warnings=0`
